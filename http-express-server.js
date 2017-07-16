const PORT = 8080;
const MAX_GROUP_NUMBER = 1000;
const MIN_USERNAME_LENGTH = 4;
const MIN_PASSWORD_LENGTH = 4;
const MIN_GROUPNAME_LENGTH = 4;
const MAX_LENGTH = 20;
const VALID_ROLES = [ 'superadmin', 'admin', 'user' ];
const SUPER_ADMIN_ROLE = 'superadmin';
const dbConnetionData = {
        host     : 'localhost',
        database : 'user_mngt_db',
        user     : 'root',
        multipleStatements: true
      };      
//--------------------------------------------------------------------------------
const express = require( 'express' );
const bodyParser = require( 'body-parser' );
const Joi = require( 'joi' );
const mysql = require( 'mysql' );

const expressApp = express();
//--------------------------------------------------------------------------------
let userIdSchema, groupIdSchema;
let baseAllGroupSQLQuery;
let baseAllUserSQLQuery;
//--------------------------------------------------------------------------------
const httpServer = expressApp.listen( PORT, () => {
    console.log( "Server has started on port: " + PORT );
});

expressApp.use( bodyParser.json() );
expressApp.use( ( req, res, next ) => {
    console.log( '' + new Date().toDateString() + ' ' + req.originalUrl );
    next();
} );

expressApp.get( '/users', getAllUsers );
expressApp.route( '/users/:userId' )
    .get( getUser )
    .post( addUser )
    .patch( patchUser )
    .delete( deleteUser );

expressApp.get( '/user-groups', getAllUserGroups );
expressApp.route( '/user-groups/:groupId' )
    .get( getUserGroup )
    .post( addUserGroup )
    .patch( patchUserGroup )
    .delete( deleteUserGroup );

expressApp.use( onReqError );
//--------------------------------------------------------------------------------
function getAllUsers( req, res, next ) {

    dbRequest( baseAllUserSQLQuery )
        .then( data => {
            res.status( 200 );
            res.end( JSON.stringify( data, null, '  ' ) );
        })
        .catch( err => {
            next( err );
        });
}
//--------------------------------------------------------------------------------
function getUser( req, res, next ) {
    let sqlQuery = baseAllUserSQLQuery;
    let isVaildId = Joi.validate( req.params, userIdSchema );

    if (  isVaildId.error  ) {
        next( isVaildId.error );
        return;
    }

    sqlQuery += ' WHERE id = ' + req.params.userId;
    dbRequest( sqlQuery )
        .then( data => {
            if(  data.length ) {
                res.status( 200 ).json( data[ 0 ] );
            } else {
                res.status( 200 ).json( { status: 'User not found' } );
            }
        })
        .catch( err => {
            next( err );
        });
}
//--------------------------------------------------------------------------------
function addUser( req, res, next ) {
    let sqlQuery, userId;
    let isVaildId = Joi.validate( req.params, userIdSchema );    
    let userDataSchema = Joi.object().keys( {
        name: Joi.string().regex( /[\w]+/ ).min( MIN_USERNAME_LENGTH ).max( MAX_LENGTH ).required(),
        password: Joi.string().alphanum().min( MIN_PASSWORD_LENGTH ).max( MAX_LENGTH ).required(),
        email: Joi.string().email().required(),
        role: Joi.string().valid( ...VALID_ROLES ).required(),    
    });
    let isVaildUserData = Joi.validate( req.body, userDataSchema );

    if ( isVaildId.error || isVaildUserData.error ) {
        next( isVaildId.error || isVaildUserData.error );
        return;
    }

    userId = req.params.userId;

    sqlQuery = '\
        SELECT \'user id ' + userId + ' not unique\' AS errorMessage\
        FROM users\
        WHERE id = ' + userId + '\
        UNION\
        SELECT \'user name ' + req.body.name + ' not unique\'\
        FROM users\
        WHERE id <> ' + userId + ' AND users.name = \'' + req.body.name + '\'\
        UNION\
        SELECT \'user email ' + req.body.email + ' not unique\'\
        FROM users\
        WHERE id <> ' + userId + ' AND users.email = \'' + req.body.email + '\'';
    if ( req.body.role === SUPER_ADMIN_ROLE ) {
        sqlQuery += '\
            UNION\
            SELECT \'no more then 2 superadmin is possible\'\
            FROM users\
            WHERE role = \'' + SUPER_ADMIN_ROLE + '\'\
            HAVING COUNT( id ) = 2';
    }

    dbRequest( sqlQuery )
        .then( data => {

            if(  data.length ) {
                res.status( 400 ).json( data );
                return;
            }
            sqlQuery = 'INSERT INTO USERS (id,name,password,email,role)\
                                    VALUES( ' + userId + ',\
                                            \'' + req.body.name + '\',\
                                            \'' + req.body.password + '\',\
                                            \'' + req.body.email + '\',\
                                            \'' + req.body.role + '\' )';
            dbRequest( sqlQuery )
                .then( data => {
                    res.status( 201 ).json( { status: 'user id: ' + userId + ' has been created' } );
                })
                .catch( err => {
                    next( err );
                });
        })
        .catch( err => {
            next( err );
        });
}
//--------------------------------------------------------------------------------
function patchUser( req, res, next ) {
    let sqlQuery, userId;
    let isVaildId = Joi.validate( req.params, userIdSchema );    
    let userDataSchema = Joi.object().keys( {
        name: Joi.string().regex( /[\w]+/ ).min( MIN_USERNAME_LENGTH ).max( MAX_LENGTH ),
        password: Joi.string().alphanum().min( MIN_PASSWORD_LENGTH ).max( MAX_LENGTH ),
        email: Joi.string().email(),
        role: Joi.string().valid( ...VALID_ROLES ),
    }).min( 1 );
    let isVaildUserData = Joi.validate( req.body, userDataSchema );

    if ( isVaildId.error || isVaildUserData.error ) {
        next( isVaildId.error || isVaildUserData.error );
        return;
    }

    userId = req.params.userId;

    sqlQuery = '\
        SELECT \'user id ' + userId + ' not found\' AS errorMessage\
        FROM users\
        HAVING MAX( CASE WHEN id = ' + userId + ' THEN 1 ELSE 0 END ) = 0 ';

    if ( req.body.hasOwnProperty( 'name' ) ) {
        sqlQuery += '\
            UNION\
            SELECT \'user name ' + req.body.name + ' not unique\'\
            FROM users\
            WHERE id <> ' + userId + ' AND users.name = \'' + req.body.name + '\' ';
    }    
    if ( req.body.hasOwnProperty( 'email' ) ) {
        sqlQuery +=  '\
            UNION\
            SELECT \'user email ' + req.body.email + ' not unique\'\
            FROM users\
            WHERE id <> ' + userId + ' AND users.email = \'' + req.body.email + '\' ';
    }    
    if ( req.body.hasOwnProperty( 'role' ) ) {
        sqlQuery +=  '\
            UNION\
            SELECT\
            CASE WHEN IFNULL( saCount, 0 ) = 2 AND ' + ( req.body.role === SUPER_ADMIN_ROLE ) + '\
                 THEN \'no more then 2 superadmin is possible\'\
                 WHEN IFNULL( saCount, 0 ) = 0 AND ' + ( req.body.role !== SUPER_ADMIN_ROLE ) + '\
                 THEN \'at least 1 superadmin is required\'  END\
            FROM users\
            LEFT JOIN\
                ( SELECT COUNT( id ) AS saCount\
                FROM users\
                WHERE id <> ' + userId + ' AND role = \'' + SUPER_ADMIN_ROLE + '\' ) superAdmins\
            ON true\
            WHERE id = ' + userId + ' AND\
            (\
              IFNULL( saCount, 0 ) = 2 AND ' + ( req.body.role === SUPER_ADMIN_ROLE ) + ' OR\
              IFNULL( saCount, 0 ) = 0 AND ' + ( req.body.role !== SUPER_ADMIN_ROLE ) + '\
            )';
    }

    dbRequest( sqlQuery )
        .then( data => {
            let setStr = '';

            if(  data.length ) {
                res.status( 400 ).json( data );
                return;
            }
            sqlQuery = 'UPDATE users SET ';
            for ( let prop in req.body ) {
                setStr += ( setStr === '' ? ' ' : ', ' ) + prop + ' = \'' + req.body[ prop ] + '\'';
            }
            sqlQuery += setStr;
            sqlQuery += ' WHERE id = ' + userId;                                
            dbRequest( sqlQuery )
                .then( data => {
                    res.status( 201 ).json( { status: 'user id: ' + userId + ' has been patched' } );
                })
                .catch( err => {
                    next( err );
                });
        })
        .catch( err => {
            next( err );
        });
}
//--------------------------------------------------------------------------------
function deleteUser( req, res, next ) {
    let sqlQuery, userId;
    let isVaildId = Joi.validate( req.params, userIdSchema );    

    if ( isVaildId.error ) {
        next( isVaildId.error );
        return;
    }
    userId = req.params.userId;

    sqlQuery = '\
        SELECT \'user id ' + userId + ' not found\' AS errorMessage\
        FROM users\
        HAVING MAX( CASE WHEN id = ' + userId + ' THEN 1 ELSE 0 END ) = 0\
        \
        UNION\
        \
        SELECT \'at least 1 superadmin is required\'\
        FROM users\
        LEFT JOIN\
            ( SELECT COUNT( id ) AS saCount\
            FROM users\
            WHERE id <> ' + userId + ' AND role = \'' + SUPER_ADMIN_ROLE + '\' ) superAdmins\
        ON true\
        WHERE id = ' + userId + ' AND IFNULL( saCount, 0 ) = 0\
        \
        UNION\
        \
        SELECT CONCAT( name, \' group will be empty after user id: ' + userId + ' deleion\' )\
        FROM user_groups\
        LEFT JOIN group_users\
        ON user_groups.id = group_users.groupId AND group_users.userId <> ' + userId + '\
        WHERE id IN ( SELECT groupId FROM group_users WHERE userId = ' + userId + ' )\
        AND group_users.userId IS NULL';

    dbRequest( sqlQuery )
        .then( data => {

            if(  data.length ) {
                res.status( 400 ).json( data );
                return;
            }
            sqlQuery = 'DELETE FROM users WHERE id = ' + userId;
            dbRequest( sqlQuery )
                .then( data => {
                    res.status( 201 ).json( { status: 'user id: ' + userId + ' has been deleted' } );
                })
                .catch( err => {
                    next( err );
                });
        })
        .catch( err => {
            next( err );
        });   
}
//--------------------------------------------------------------------------------
function getAllUserGroups( req, res, next ) {
    let sqlQuery = baseAllGroupSQLQuery;

    dbRequest( sqlQuery )
        .then( data => {
            res.status( 200 );
            res.end( JSON.stringify( structDBListToUserGroup( data ), null, '  ' ) );
        })
        .catch( err => {
            next( err );
        });
}
//--------------------------------------------------------------------------------
function getUserGroup( req, res, next ) {
    let sqlQuery = baseAllGroupSQLQuery;
    let isVaildId = Joi.validate( req.params, groupIdSchema );

    if (  isVaildId.error  ) {
        next( isVaildId.error );
        return;
    }

    sqlQuery += ' WHERE user_groups.id = ' + req.params.groupId;
    dbRequest( sqlQuery )
        .then( data => {            
            data = structDBListToUserGroup( data );
            if(  data.length ) {
                res.status( 200 ).json( data[ 0 ] );
            } else {
                res.status( 200 ).json( { status: 'Group not found' } );
            }            
        })
        .catch( err => {
            next( err );
        });
}
//--------------------------------------------------------------------------------
function addUserGroup( req, res, next ) {
    let sqlQuery, groupId, condition;
    let isVaildId = Joi.validate( req.params, groupIdSchema );    
    let groupSchema = Joi.object().keys({
        name: Joi.string().min( MIN_GROUPNAME_LENGTH ).max( MAX_LENGTH ).required(),
        userIds: Joi.array()
                    .items( Joi.number().integer().min( 0 ) )
                    .min( 1 )
                    .unique( ( a, b ) => a === b )
                    .required()
    });
    let idValidData = Joi.validate( req.body, groupSchema );

    if ( isVaildId.error || idValidData.error  ) {
        next( isVaildId.error || idValidData.error );
        return;
    }
    groupId = req.params.groupId;

    sqlQuery = 'SELECT \'group id ' + groupId + ' already exist\' AS errorMessage\
                FROM user_groups\
                WHERE id = ' + groupId;

    condition = '';
    for ( let userId of req.body.userIds ) {
        condition += ( condition === '' ? ' ' : ' OR ' ) + ' id = ' + userId;
    }
    sqlQuery += '\
        UNION\
        SELECT \'please pass an array with existed id\'s\'\
        FROM users\
        WHERE ' + condition + '\
        HAVING COUNT(id) <> ' + req.body.userIds.length;

    dbRequest( sqlQuery )
        .then( data => {

            if(  data.length ) {
                res.status( 400 ).json( data );
                return;
            }
            sqlQuery = 'START TRANSACTION;';
            sqlQuery += 'INSERT INTO user_groups (id,name) values(' + groupId + ',\'' + req.body.name + '\');';
            for ( let userId of req.body.userIds ) {
                sqlQuery += 'INSERT INTO group_users (groupId,userId) values(' + groupId + ',' + userId + ');';
            }
            sqlQuery += 'COMMIT;';
            dbRequest( sqlQuery )
                .then( data => {
                    res.status( 201 ).json( { status: 'group id: ' + groupId + ' has been created' } );
                })
                .catch( err => {
                    next( err );
                });
        })
        .catch( err => {
            next( err );
        });   
    
}
//--------------------------------------------------------------------------------
function patchUserGroup( req, res, next ) {
    
}
//--------------------------------------------------------------------------------
function deleteUserGroup( req, res, next ) {
    let sqlQuery, groupId;
    let isVaildId = Joi.validate( req.params, groupIdSchema );    

    if ( isVaildId.error ) {
        next( isVaildId.error );
        return;
    }
    groupId = req.params.groupId;

    sqlQuery = '\
        SELECT \'group id ' + groupId + ' not found\' AS errorMessage\
        FROM user_groups\
        HAVING MAX( CASE WHEN id = ' + groupId + ' THEN 1 ELSE 0 END ) = 0';

    dbRequest( sqlQuery )
        .then( data => {

            if(  data.length ) {
                res.status( 400 ).json( data );
                return;
            }
            sqlQuery = 'DELETE FROM user_groups WHERE id = ' + groupId;
            dbRequest( sqlQuery )
                .then( data => {
                    res.status( 201 ).json( { status: 'group id: ' + groupId + ' has been deleted' } );
                })
                .catch( err => {
                    next( err );
                });
        })
        .catch( err => {
            next( err );
        });   
}
//--------------------------------------------------------------------------------
function onReqError( err, req, res, next ) {
    res.status( 400 ).json( {
        errorMessage: err.message,
        stack: err.stack
    } );
}
//--------------------------------------------------------------------------------
function dbRequest( querySQL ) {
    return new Promise( ( resolve, reject ) => {
        connection = mysql.createConnection( dbConnetionData );
        connection.connect();
        connection.query( querySQL, ( error, results, fields ) => {
            if ( error ) { 
                reject( error );
            }
            resolve( results );

            connection.end( err => {
                console.log( 'DB connection ended with error: ' + err );
            });        
            
        });
    });
}
//--------------------------------------------------------------------------------
function structDBListToUserGroup( array ) {
    let res = [];
    let newUser;

    array.forEach( ( elem, index, arr ) => {
        if ( index === 0 || arr[ index ].groupId !== arr[ index - 1 ].groupId ) {
            res.push( {
                groupId: elem.groupId,
                groupName: elem.groupName,
                users: arr.filter( elem => elem.groupId === arr[ index ].groupId )
                          .map( elem =>  { 
                              newUser = new User();
                              Object.assign( newUser, elem );
                              delete newUser.groupId;
                              delete newUser.groupName;
                              return newUser;
                          } )
            });
        }
    });

    return res;    
}
//--------------------------------------------------------------------------------
class User {
    constructor( id = 0, name = '', password = '', email = '', role = '' ) {
        this.id = id;
        this.name = name;
        this.password = password;
        this.email = email;
        this.role = role;
    }
}
//--------------------------------------------------------------------------------
baseAllGroupSQLQuery = '\
    SELECT user_groups.id AS groupId, user_groups.name AS groupName,\
        users.id,  users.name, users.password, users.email, users.role\
    FROM user_groups\
    LEFT JOIN group_users\
    ON user_groups.id = group_users.groupId\
    LEFT JOIN users\
    ON group_users.userId = users.id';

baseAllUserSQLQuery = 'SELECT id, name, password, email, role FROM users';

userIdSchema = Joi.object().keys({
        userId: Joi.number().integer().min( 0 )
});
groupIdSchema = Joi.object().keys({
        groupId: Joi.number().integer().min( 0 ).max( MAX_GROUP_NUMBER )
});