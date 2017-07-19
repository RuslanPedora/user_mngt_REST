'use strict'
const mysql = require( 'mysql' );
const dbConnetionData = {
        host     : 'localhost',
        database : 'user_mngt_db',
        user     : 'root',
        multipleStatements: true
      };      
//--------------------------------------------------------------------------------
module.exports = {
    dbRequest,
    structDBListToUserGroup,
}
//--------------------------------------------------------------------------------
function dbRequest( querySQL ) {
    return new Promise( ( resolve, reject ) => {
        let connection = mysql.createConnection( dbConnetionData );
        
        connection.connect();
        connection.query( querySQL, ( error, results, fields ) => {

            connection.destroy();

            if ( error ) { 
                reject( error );
            }
            resolve( results );            
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
