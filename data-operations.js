'use strict'
const VALID_ROLES = [ 'superadmin', 'admin', 'user' ];
const SUPER_ADMIN_ROLE = 'superadmin';
const VALID_USER_SORTING = [ 'id', 'name', 'email', 'role' ];
const VALID_GROUP_SORTING = [ 'id', 'name' ];
//--------------------------------------------------------------------------------
let baseAllGroupSQLQuery;
//--------------------------------------------------------------------------------
const dbAgent = require( './db-agent' );
const passwordHash = require('password-hash');
//--------------------------------------------------------------------------------
module.exports = {
    VALID_ROLES,
    SUPER_ADMIN_ROLE,
    VALID_USER_SORTING,
    VALID_GROUP_SORTING,
    login,
    getAllUsers,
    getUser,
    addUser,
    patchUser,
    deleteUser,
    getAllUserGroups,
    getUserGroup,
    addUserGroup,
    patchUserGroup,
    deleteUserGroup,
    addUserToGroup,
    deleteUserToGroup
}
//--------------------------------------------------------------------------------
function login( userName, password, done ) {
    let query = `SELECT * FROM users WHERE name = \'${userName}\'`;
    console.log( passwordHash.generate( password ) );
    dbAgent.dbRequest( query )
        .then( data => {            
            if ( data.length && passwordHash.verify( password, data[ 0 ].password ) ) {                
                return done( null, { 'userName': data[ 0 ].name,
                                     'role': data[ 0 ].role } );
            }
            return done( null, false );
        })
        .catch( err => {
            return done( err );
        });   
}
//--------------------------------------------------------------------------------
function getAllUsers( res, next, queryStr ) {
    let querySQL = 'SELECT id, name, password, email, role FROM users';

    if ( queryStr ) {
        querySQL += ' ORDER BY ' + queryStr.sort + parseDesc( queryStr.desc );
    }

    dbAgent.dbRequest( querySQL )
        .then( data => {            
            res.status( 200 ).json( data );
        })
        .catch( err => {
            next( err );
        });
}
//--------------------------------------------------------------------------------
function getUser( res, next, userId ) {
    let querySQL = `SELECT id, name, password, email, role FROM users WHERE id = ${userId}`;

    dbAgent.dbRequest( querySQL )
        .then( data => {
            if(  data.length ) {
                res.status( 200 ).json( data[ 0 ] );
            } else {
                res.status( 206 ).json( { status: 'User not found' } );
            }
        })
        .catch( err => {
            next( err );
        });
}
//--------------------------------------------------------------------------------
function addUser( req, res, next, userId, body ) {
    let querySQL;

    querySQL = `SELECT \'User id ${userId} not unique\' AS errorMessage FROM users WHERE id = ${userId}\
                UNION ${getUserNameCheckQuery( userId, body.name )}\
                UNION ${getUserEmailCheckQuery( userId ,body.email )}`;
    if ( body.role === SUPER_ADMIN_ROLE ) {
        if ( req.user && body.role === SUPER_ADMIN_ROLE && req.user.role !== body.role ) {
            next( new Error( 'You need superadmin role to create another superadmin' ) );
            return;
        }
        querySQL += `UNION\
            SELECT \'No more then 2 superadmin is possible\' FROM users WHERE role = \'${SUPER_ADMIN_ROLE}\'\
            HAVING COUNT( id ) = 2`;
    }

    dbAgent.dbRequest( querySQL )
        .then( data => {
            if(  data.length ) {
                res.status( 400 );
                return Promise.resolve( data );
            }
            body.password = passwordHash.generate( body.password );
            querySQL = `INSERT INTO USERS (id,name,password,email,role)\
                                    VALUES(${userId},\'${body.name}\',\'${body.password}\',\'${body.email}\',\'${body.role}\')`;
            return dbAgent.dbRequest( querySQL );
        })
        .then( data => {
            if ( res.statusCode === 400 ) {
                res.json( data )
            } else {
                res.status( 201 ).json( { status: 'User id: ' + userId + ' has been created' } );
            }    
        })
        .catch( err => {            
            next( err );
        });
}
//--------------------------------------------------------------------------------
function patchUser( req, res, next, userId, body ) {
    let querySQL = getUserExistQuery( userId );

    if ( body.hasOwnProperty( 'name' ) ) {
        querySQL += ' UNION ' + getUserNameCheckQuery( userId, body.name );
    }    
    if ( body.hasOwnProperty( 'email' ) ) {
        querySQL +=  ' UNION ' + getUserEmailCheckQuery( userId, body.email );
    }    
    if ( body.hasOwnProperty( 'role' ) ) {
        querySQL +=  `UNION\
            SELECT  CASE WHEN IFNULL( saCount, 0 ) = 2 AND ${(body.role === SUPER_ADMIN_ROLE)}\
                    THEN \'No more then 2 superadmin is possible\'\
                    WHEN IFNULL( saCount, 0 ) = 0 AND ${(body.role !== SUPER_ADMIN_ROLE)}\
                    THEN \'At least 1 superadmin is required\'  END\
            FROM users\
            LEFT JOIN ( SELECT COUNT( id ) AS saCount FROM users\
                        WHERE id <> ${userId} AND role = \'${SUPER_ADMIN_ROLE}\' ) superAdmins ON true\
            WHERE id = ${userId} AND\
            ( IFNULL( saCount, 0 ) = 2 AND ${(body.role === SUPER_ADMIN_ROLE)} OR\
              IFNULL( saCount, 0 ) = 0 AND ${(body.role !== SUPER_ADMIN_ROLE)})`;
    }
    if ( req.user.role !== SUPER_ADMIN_ROLE ) {
        querySQL +=  ` UNION SELECT \'You need superadmin role to patch another superadmin\' FROM users WHERE id=${userId} AND role=\'${SUPER_ADMIN_ROLE}\'`;
    }

    dbAgent.dbRequest( querySQL )
        .then( data => {
            let setStr = '';

            if(  data.length ) {
                res.status( 400 );
                return Promise.resolve( data );
            }
            body.password = body.hasOwnProperty( 'password' ) ? passwordHash.generate( body.password ) : undefined;
            for ( let prop in body ) {
                setStr += ( setStr === '' ? ' ' : ', ' ) + prop + ' = \'' + body[ prop ] + '\'';
            }            
            querySQL = `UPDATE users SET ${setStr} WHERE id = ${userId}`;

            return dbAgent.dbRequest( querySQL );
        })
        .then( data => {
            if( res.statusCode === 400 ) {
                res.json( data );
            } else {
                res.status( 202 ).json( { status: 'User id: ' + userId + ' has been patched' } );
            }            
        })
        .catch( err => {
            next( err );
        });
}
//--------------------------------------------------------------------------------
function deleteUser( req, res, next, userId ) {
    let querySQL = `${getUserExistQuery( userId )}\
        UNION\
        SELECT \'At least 1 superadmin is required\'\
        FROM users\
        LEFT JOIN ( SELECT COUNT( id ) AS saCount\
                    FROM users\
                    WHERE id <> ${userId} AND role = \'${SUPER_ADMIN_ROLE}\' ) superAdmins ON true\
        WHERE id = ${userId} AND IFNULL( saCount, 0 ) = 0\
        UNION\
        SELECT CONCAT( name, \' group will be empty after user id: ${userId} deleion\' )\
        FROM user_groups\
        LEFT JOIN group_users\
        ON user_groups.id = group_users.groupId AND group_users.userId <> ${userId}\
        WHERE id IN ( SELECT groupId FROM group_users WHERE userId = ${userId} )\
        AND group_users.userId IS NULL`;
    
    if ( req.user.role !== SUPER_ADMIN_ROLE ) {
        querySQL +=  ` UNION SELECT \'You need superadmin role to delete another superadmin\' FROM users WHERE id=${userId} AND role=\'${SUPER_ADMIN_ROLE}\'`;
    }
    dbAgent.dbRequest( querySQL )
        .then( data => {
            if(  data.length ) {
                res.status( 400 );
                return Promise.resolve( data );
            }
            querySQL = `DELETE FROM users WHERE id = ${userId}`;
            return dbAgent.dbRequest( querySQL );
        })
        .then( data => {
            if ( res.statusCode === 400 ) {
                res.json( data );
            } else {
                res.status( 202 ).json( { status: 'User id: ' + userId + ' has been deleted' } );
            }            
        })
        .catch( err => {
            next( err );
        });   
}
//--------------------------------------------------------------------------------
function getAllUserGroups( res, next, query ) {
    let querySQL = baseAllGroupSQLQuery;

    if ( query.sort ) {
        querySQL += ` ORDER BY user_groups.${query.sort} ${parseDesc(query.desc)},\
                               users.${query.sort} ${parseDesc(query.desc)}`;
    }
    dbAgent.dbRequest( querySQL )
        .then( data => {
            res.status( 200 ).json( dbAgent.structDBListToUserGroup( data ) );
        })
        .catch( err => {
            next( err );
        });    
}    
//--------------------------------------------------------------------------------
function getUserGroup( res, next, groupId ) {
    let querySQL = `${baseAllGroupSQLQuery} WHERE user_groups.id = ${groupId}`;
    
    dbAgent.dbRequest( querySQL )
        .then( data => {            
            data = dbAgent.structDBListToUserGroup( data );
            if(  data.length ) {
                res.status( 200 ).json( data[ 0 ] );
            } else {
                res.status( 206 ).json( { status: 'Group not found' } );
            }            
        })
        .catch( err => {
            next( err );
        });
}        
//--------------------------------------------------------------------------------
function addUserGroup( res, next, groupId, body ) {
    let querySQL = `SELECT \'Group id ${groupId} already exist\' AS errorMessage\
                    FROM user_groups WHERE id = ${groupId}\
                    UNION ${getUserListExistQuery( body.userIds )}`;

    dbAgent.dbRequest( querySQL )
        .then( data => {
            if(  data.length ) {
                res.status( 400 );
                return Promise.resolve( data );
            }
            querySQL = 'START TRANSACTION;';
            querySQL += `INSERT INTO user_groups (id,name) values(${groupId},\'${body.name}\');`;
            for ( let userId of body.userIds ) {
                querySQL += `INSERT INTO group_users (groupId,userId) values(${groupId},${userId});`;
            }
            querySQL += 'COMMIT;';
            return dbAgent.dbRequest( querySQL );
        })
        .then( data => {
            if( res.statusCode === 400 ) {
                res.json( data );
            } else {
                res.status( 201 ).json( { status: '\Group id: ' + groupId + ' has been created' } );
            }            
        })
        .catch( err => {
            next( err );
        });       
}
//--------------------------------------------------------------------------------
function patchUserGroup( res, next, groupId, body ) {
    let querySQL = getGroupExistQuery( groupId );
    if ( body.hasOwnProperty( 'userIds' ) ) {
        querySQL += ` UNION ${getUserListExistQuery( body.userIds )}`;
    }

    dbAgent.dbRequest( querySQL )
        .then( data => {
            if(  data.length ) {
                res.status( 400 );
                return Promise.resolve( data );
            }
            querySQL = 'START TRANSACTION;';
            if ( body.hasOwnProperty( 'name' ) ) {
                querySQL += `UPDATE user_groups SET name = \'${body.name}\' WHERE id = ${groupId};`;
            }    
            if ( body.hasOwnProperty( 'userIds' ) ) {
                querySQL += `DELETE FROM group_users WHERE groupId = ${groupId};` ;
                for ( let userId of body.userIds ) {
                    querySQL += `INSERT INTO group_users (groupId,userId) values(${groupId},${userId});`;
                }
            }    
            querySQL += 'COMMIT;';
            return dbAgent.dbRequest( querySQL );
        })
        .then( data => {
            if ( res.statusCode === 400 ) {
                res.json( data );
            } else {
                res.status( 202 ).json( { status: '\Group id: ' + groupId + ' has been updated' } );                
            }
        })
        .catch( err => {
            next( err );
        });
}
//--------------------------------------------------------------------------------
function deleteUserGroup( res, next, groupId ) {
    let querySQL = getGroupExistQuery( groupId );

    dbAgent.dbRequest( querySQL )
        .then( data => {
            if(  data.length ) {
                res.status( 400 );
                return Promise.resolve( data );
            }
            querySQL = `DELETE FROM user_groups WHERE id = ${groupId}`;
            return dbAgent.dbRequest( querySQL );
        })
        .then( data => {
            if ( res.statusCode === 400 ) {
                res.json( data );
            } else {
                res.status( 202 ).json( { status: 'Group id: ' + groupId + ' has been deleted' } );
            }            
        })
        .catch( err => {
            next( err );
        });   
}
//--------------------------------------------------------------------------------
function addUserToGroup( res, next, groupId, userId ) {
    let querySQL = `${getUserExistQuery( userId )}\
        UNION ${getGroupExistQuery( groupId )}\
        UNION\
        SELECT \'User id ${userId} already is in group id ${groupId}'\
        FROM group_users WHERE groupId = ${groupId} AND userId = ${userId}`;

    dbAgent.dbRequest( querySQL )
        .then( data => {

            if(  data.length ) {
                res.status( 400 );
                return Promise.resolve( data );
            }
            querySQL = `INSERT INTO group_users (groupId,userId) values (${groupId},${userId})`;
            return dbAgent.dbRequest( querySQL );
        })
        .then( data => {
            if ( res.statusCode === 400 ) {
                res.json( data );
            } else {
                res.status( 201 ).json( { status: 'User id: ' + userId + ' has been added to group id ' + groupId } );
            }            
        })
        .catch( err => {
            next( err );
        });   
}
//--------------------------------------------------------------------------------
function deleteUserToGroup( res, next, groupId, userId ) {
    let querySQL = `${getUserExistQuery( userId )}\
        UNION ${getGroupExistQuery( groupId )}\
        UNION\
        SELECT \'User id ${userId} not found in groupId ${groupId}\' AS errorMessage\
        FROM group_users\
        HAVING MAX( CASE WHEN groupId = ${groupId} AND userId = ${userId} THEN 1 ELSE 0 END ) = 0\
        UNION\
        SELECT \'Group id ${groupId} will be empty after deletion userId ${userId}'\
        FROM group_users WHERE groupId = ${groupId}\
        HAVING count(userId) = 1`;

    dbAgent.dbRequest( querySQL )
        .then( data => {
            if(  data.length ) {
                res.status( 400 );
                return Promise.resolve( data );
            }
            querySQL = `DELETE FROM group_users WHERE groupId = ${groupId} AND userId = ${userId}`;
            return dbAgent.dbRequest( querySQL );
        })
        .then( data => {
            if ( res.statusCode === 400 ) { 
                res.json( data );
            } else { 
                res.status( 202 ).json( { status: 'User id: ' + userId + ' has been deleted from group id ' + groupId } );
            }            
        })
        .catch( err => {
            next( err );
        });   
}
//--------------------------------------------------------------------------------
function parseDesc( desc ) {
    return desc && JSON.parse( desc ) ? ' DESC ' : '' ;
} 
//--------------------------------------------------------------------------------
function getUserExistQuery( userId ) {
    return `SELECT \'User id ${userId} not found\' AS errorMessage FROM users\
            HAVING MAX( CASE WHEN id = ${userId} THEN 1 ELSE 0 END ) = 0`;
}
//--------------------------------------------------------------------------------
function getGroupExistQuery( groupId ) {
    return `SELECT \'Group id ${groupId} not found\' AS errorMessage FROM user_groups\
            HAVING MAX( CASE WHEN id = ${groupId} THEN 1 ELSE 0 END ) = 0`;
}
//--------------------------------------------------------------------------------
function getUserNameCheckQuery( userId, userName ) {
    return `SELECT \'User name ${userName} not unique\' FROM users\
            WHERE id <> ${userId} AND users.name = \'${userName}\'`;
}
//--------------------------------------------------------------------------------
function getUserEmailCheckQuery( userId, userEmail ) {
    return `SELECT \'User email ${userEmail} not unique\' FROM users\
            WHERE id <> ${userId} AND users.email = \'${userEmail}\'`;
}
//--------------------------------------------------------------------------------
function getUserListExistQuery( userIds ) {
    let condition = '';

    for ( let userId of userIds ) {
        condition += ( condition === '' ? ' ' : ' OR ' ) + ' id = ' + userId;
    }
    return `SELECT \'Please pass an array with existed ids\'\ FROM users WHERE ${condition}
            HAVING COUNT(id) <> ${userIds.length}`;
}
//--------------------------------------------------------------------------------
baseAllGroupSQLQuery = '\
    SELECT user_groups.id AS groupId, user_groups.name AS groupName,\
        users.id,  users.name, users.password, users.email, users.role\
    FROM user_groups\
    JOIN group_users ON user_groups.id = group_users.groupId\
    JOIN users ON group_users.userId = users.id';