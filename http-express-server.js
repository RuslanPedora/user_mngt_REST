const PORT = 8080;
const MAX_GROUP_NUMBER = 1000;
const MIN_USERNAME_LENGTH = 4;
const MIN_PASSWORD_LENGTH = 4;
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
let baseAllGourpSQLQuery;
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
        SELECT \'user email not unique\'\
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
                res.status( 200 ).json( data );
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
                    res.status( 200 ).json( { status: 'user id: ' + userId + ' has been created' } );
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
    res.status( 200 ).json( { test: 'patch user' } );
}
//--------------------------------------------------------------------------------
function deleteUser( req, res, next ) {
    res.status( 200 ).json( { test: 'delete user' } );
}
//--------------------------------------------------------------------------------
function getAllUserGroups( req, res, next ) {
    let sqlQuery = baseAllGourpSQLQuery;

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
    let sqlQuery = baseAllGourpSQLQuery;
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
    res.status( 200 ).json( { test: 'add userGroup' } );
}
//--------------------------------------------------------------------------------
function patchUserGroup( req, res, next ) {
    res.status( 200 ).json( { test: 'patch userGroup' } );
}
//--------------------------------------------------------------------------------
function deleteUserGroup( req, res, next ) {
    res.status( 200 ).json( { test: 'delete userGroup' } );
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

    array.forEach( ( elem, index, arr ) => {
        if ( index === 0 || arr[ index ].groupId !== arr[ index - 1 ].groupId ) {
            res.push( {
                groupId: elem.groupId,
                groupName: elem.groupName,
                users: arr.filter( elem => elem.groupId === arr[ index ].groupId )
                          .map( elem =>  { 
                              return Object.assign( new User(), elem );
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
baseAllGourpSQLQuery = '\
    SELECT user_groups.id AS groupId, user_groups.name AS groupName,\
        users.id,  users.name, users.password, users.email, users.role\
    FROM user_groups\
    LEFT JOIN group_users\
    ON user_groups.id = group_users.groupId\
    LEFT JOIN users\
    ON group_users.userId = users.id';

baseAllUserSQLQuery = 'SELECT id, name, password, email, role FROM users';

userIdSchema = Joi.object().keys({
        userId: Joi.number().integer().min( 0 ).max( MAX_GROUP_NUMBER )
});
groupIdSchema = Joi.object().keys({
        groupId: Joi.number().integer().min( 0 ).max( MAX_GROUP_NUMBER )
});