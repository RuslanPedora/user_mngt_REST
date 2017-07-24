'use strict'
const PORT = 8080;
const MAX_GROUP_NUMBER = 1000;
const MIN_USERNAME_LENGTH = 4;
const MIN_PASSWORD_LENGTH = 4;
const MIN_GROUPNAME_LENGTH = 4;
const MAX_LENGTH = 20;
//--------------------------------------------------------------------------------
const express = require( 'express' );
const bodyParser = require( 'body-parser' );
const Joi = require( 'joi' );
const passport = require('passport');
const BasicStrategy = require('passport-http').BasicStrategy;
const dataOperations = require( './data-operations' );

const expressApp = express();
//--------------------------------------------------------------------------------
let userIdSchema, groupIdSchema, bothIdSchema;
//--------------------------------------------------------------------------------
try {
    expressApp.listen( PORT, () => {
        console.log( "Server has started on port: " + PORT );
    });
}
catch ( err ) {
    console.log( err.message );
    console.log( 'Unable to start server on port: ' + PORT );
    process.exit( 0 )
}

passport.use( new BasicStrategy( dataOperations.login ) );

expressApp.use( bodyParser.json() );
expressApp.use( ( req, res, next ) => {
    console.log( '' + new Date().toDateString() + ' ' + req.originalUrl );
    next();
} );
expressApp.use( passport.authenticate( 'basic', { session: false } ) );

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

expressApp.route( '/user-groups/:groupId/users/:userId' )
    .post( addUserToGroup )
    .delete( deleteUserToGroup );

expressApp.use( onReqError );
//--------------------------------------------------------------------------------
function getAllUsers( req, res, next ) {
    let userSortingSchema = Joi.object().keys( {
        sort: Joi.string().valid( ...dataOperations.VALID_USER_SORTING ),
        desc: Joi.boolean()
    }).with( 'desc', 'sort' ); 
    let isValidSorting = Joi.validate( req.query, userSortingSchema );

    if ( isValidSorting.error ) {
        res.status( 400 );
        next( isValidSorting.error );
        return;
    }
    dataOperations.getAllUsers( res, next, req.query );
}
//--------------------------------------------------------------------------------
function getUser( req, res, next ) {
    let isVaildId = Joi.validate( req.params, userIdSchema );

    if (  isVaildId.error  ) {
        res.status( 400 );
        next( isVaildId.error );
        return;
    }
    dataOperations.getUser( res, next, req.params.userId );
}
//--------------------------------------------------------------------------------
function addUser( req, res, next ) {
    let isVaildId = Joi.validate( req.params, userIdSchema );    
    let userDataSchema = Joi.object().keys( {
        name: Joi.string().regex( /[\w]+/ ).min( MIN_USERNAME_LENGTH ).max( MAX_LENGTH ).required(),
        password: Joi.string().alphanum().min( MIN_PASSWORD_LENGTH ).max( MAX_LENGTH ).required(),
        email: Joi.string().email().required(),
        role: Joi.string().valid( ...dataOperations.VALID_ROLES ).required(),    
    });
    let isVaildUserData = Joi.validate( req.body, userDataSchema );

    if ( isVaildId.error || isVaildUserData.error ) {
        res.status( 400 );
        next( isVaildId.error || isVaildUserData.error );
        return;
    }
    dataOperations.addUser( req, res, next, req.params.userId, req.body );
}
//--------------------------------------------------------------------------------
function patchUser( req, res, next ) {
    let isVaildId = Joi.validate( req.params, userIdSchema );    
    let userDataSchema = Joi.object().keys( {
        name: Joi.string().regex( /[\w]+/ ).min( MIN_USERNAME_LENGTH ).max( MAX_LENGTH ),
        password: Joi.string().alphanum().min( MIN_PASSWORD_LENGTH ).max( MAX_LENGTH ),
        email: Joi.string().email(),
        role: Joi.string().valid( ...dataOperations.VALID_ROLES ),
    }).min( 1 );
    let isVaildUserData = Joi.validate( req.body, userDataSchema );

    if ( isVaildId.error || isVaildUserData.error ) {
        res.status( 400 );
        next( isVaildId.error || isVaildUserData.error );
        return;
    }
    dataOperations.patchUser( req, res, next, req.params.userId, req.body );
}
//--------------------------------------------------------------------------------
function deleteUser( req, res, next ) {
    let isVaildId = Joi.validate( req.params, userIdSchema );    

    if ( isVaildId.error ) {
        res.status( 400 );
        next( isVaildId.error );
        return;
    }
    dataOperations.deleteUser( req, res, next, req.params.userId );
}
//--------------------------------------------------------------------------------
function getAllUserGroups( req, res, next ) {
    let userSortingSchema = Joi.object().keys( {
        sort: Joi.string().valid( ...dataOperations.VALID_GROUP_SORTING ),
        desc: Joi.boolean()
    }).with( 'desc', 'sort' ); 
    let isValidSorting = Joi.validate( req.query, userSortingSchema );

    if ( isValidSorting.error ) {
        res.status( 400 );
        next( isValidSorting.error );
        return;
    }
    dataOperations.getAllUserGroups( res, next, req.query );
}
//--------------------------------------------------------------------------------
function getUserGroup( req, res, next ) {
    let isVaildId = Joi.validate( req.params, groupIdSchema );

    if (  isVaildId.error  ) {
        res.status( 400 );
        next( isVaildId.error );
        return;
    }
    dataOperations.getUserGroup( res, next, req.params.groupId );
}
//--------------------------------------------------------------------------------
function addUserGroup( req, res, next ) {
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
        res.status( 400 );
        next( isVaildId.error || idValidData.error );
        return;
    }
    dataOperations.addUserGroup( res, next, req.params.groupId, req.body );
}
//--------------------------------------------------------------------------------
function patchUserGroup( req, res, next ) {
    let isVaildId = Joi.validate( req.params, groupIdSchema );    
    let groupSchema = Joi.object().keys({
        name: Joi.string().min( MIN_GROUPNAME_LENGTH ).max( MAX_LENGTH ),
        userIds: Joi.array()
                    .items( Joi.number().integer().min( 0 ) )
                    .min( 1 )
                    .unique( ( a, b ) => a === b )
    }).min( 1 );
    let idValidData = Joi.validate( req.body, groupSchema );

    if ( isVaildId.error || idValidData.error  ) {
        res.status( 400 );
        next( isVaildId.error || idValidData.error );
        return;
    }
    dataOperations.patchUserGroup( res, next, req.params.groupId, req.body );
}
//--------------------------------------------------------------------------------
function deleteUserGroup( req, res, next ) {
    let isVaildId = Joi.validate( req.params, groupIdSchema );    

    if ( isVaildId.error ) {
        res.status( 400 );
        next( isVaildId.error );
        return;
    }
    dataOperations.deleteUserGroup( res, next, req.params.groupId );
}
//--------------------------------------------------------------------------------
function addUserToGroup( req, res, next ) {
    let isVaildIds = Joi.validate( req.params, bothIdSchema );    

    if ( isVaildIds.error ) {
        res.status( 400 );
        next( isVaildIds.error );
        return;
    }
    dataOperations.addUserToGroup( res, next, req.params.groupId, req.params.userId );
}    
//--------------------------------------------------------------------------------
function deleteUserToGroup( req, res, next ) {
    let isVaildIds = Joi.validate( req.params, bothIdSchema );    

    if ( isVaildIds.error ) {
        res.status( 400 );
        next( isVaildIds.error );
        return;
    }
    dataOperations.deleteUserToGroup( res, next, req.params.groupId, req.params.userId );
}
//--------------------------------------------------------------------------------
function onReqError( err, req, res, next ) {    

    if ( res.statusCode === 401 ) {
        return;
    }
    res.status( res.statusCode === 200 ? 500 : res.statusCode || 500 ).json( {
        errorMessage: err.message,
        stack: err.stack
    } );
}
//--------------------------------------------------------------------------------
userIdSchema = Joi.object().keys({
        userId: Joi.number().integer().min( 0 )
});
groupIdSchema = Joi.object().keys({
        groupId: Joi.number().integer().min( 0 ).max( MAX_GROUP_NUMBER )
});
bothIdSchema = Joi.object().keys({
    groupId: Joi.number().integer().min( 0 ).max( MAX_GROUP_NUMBER ),
    userId: Joi.number().integer().min( 0 )
});