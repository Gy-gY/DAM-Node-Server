/**
 * auth api to invoke
 */
var assert = require('assert');
//var passportApi = require('../../../api/passportApi.js');
import { passportApi } from '../../../api/api';
import { services } from '../../../config/micro-services';
import { serverLogger } from '../../../lib/log';
import { PERMISSIONS } from '../../../config/permissions';


function authCanceler(permissionCode) {

    // return function (req, res, next) {
    //   return new Promise(function () {
    //     serverLogger.info("======================just debug all api auth ok!!!!!!!!!!!!!!!!!")
    //     next();
    //   });
    // };

    let apiAuth = (req, res, next) => {
        let logger = serverLogger.new('[ API-AUTH ] ', { url: req.url });

        assert.ok(req.user.userId, 'req.user.userId should be ok');
        logger.info('authing user ' + req.user.userId + ' does have ' + permissionCode);

        return passportApi.UsercontrollerApiFp.userAuthGet({ code: permissionCode, userId: req.user.userId })(undefined, services.passport)
            .then((ok) => {
                logger.info('authed user ' + req.user.userId + ' does have ' + permissionCode + ' return ' + ok);
                console.log('@!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!111');
                console.log(ok);
                if (!ok) {
                    res.status(403).json({ message: '没有此权限' });
                    return;
                }

                next();
            }, (err) => {
                logger.info('authed user' + req.user.userId + ' does have ' + permissionCode + ' return error : ' + err);
                res.status(500).json({ message: '服务端调用错误' });
            });
    };

    return apiAuth;
}

/**
 * 如果用户用户拥有  permissionCodes  的权限 中的任何一个，则允许，否则拒绝
 */
function passIfHaveAnyOneIn(permissionCodes) {

    let apiAuth = (req, res, next) => {
        let logger = serverLogger.new('[ passIfHaveAnyOneIn ] ', { url: req.url, permissionCodes: permissionCodes });

        assert.ok(req.user.userId, 'req.user.userId should be ok');
        logger.info('getting user permission list  ');

        return passportApi.UsercontrollerApiFp.userUserPermissionListGet({ userId: req.user.userId })(undefined, services.passport)
            .then((list) => {
                logger.info('got user  permission List : ' + list);

                let count1 = list.filter(i => permissionCodes.indexOf(i) >= 0).length;

                if (count1 >= 1) {
                    logger.info('passed ,go next ');
                    next();
                    return;
                } else {
                    logger.info('rejected , return 403 ');
                    res.status(403).json({ message: '没有此权限' });
                    return;
                }

            }, (err) => {
                logger.error('getting user permission list return error : ' + err);
                res.status(500).json({ message: '服务端调用错误' });
            });
    };

    return apiAuth;
}

/**
 * 如果用户用户只拥有  permissionCodes 的权限，则拒绝
 */
function rejectIfOnlyHave(permissionCodes) {


    let apiAuth = (req, res, next) => {
        let logger = serverLogger.new('[ rejectIfOnlyHave ] ', { url: req.url });

        assert.ok(req.user.userId, 'req.user.userId should be ok');
        logger.info('getting user ' + req.user.userId + ' if only have ' + permissionCodes);

        return passportApi.UsercontrollerApiFp.userUserPermissionListGet({ userId: req.user.userId })(undefined, services.passport)
            .then((list) => {
                logger.info('getting user ' + req.user.userId + ' if only have ' + permissionCodes + ' return ' + list);
                list = list.filter(i => i != PERMISSIONS.ADMIN_LOGIN);//目前每个用户都一个admin_login的权限
                if (list.length != permissionCodes.length) {
                    next();
                    return;
                }

                let count1 = list.filter(i => permissionCodes.indexOf(i) < 0).length;
                let count2 = permissionCodes.filter(i => list.indexOf(i) < 0).length;
                if (count1 == 0 && count2 == 0) {
                    res.status(403).json({ message: '没有此权限' });
                    return;
                }

                next();
            }, (err) => {
                logger.info('authed user' + req.user.userId + ' does have ' + permissionCode + ' return error : ' + err);
                res.status(500).json({ message: '服务端调用错误' });
            });
    };

    return apiAuth;
}

/*
 * 
 * @param {*} folderIdGetter 
 * func(req) folderId 
 * @param {*} permissionCode 
 */
function folderAuthCanceler(folderIdGetter, permissionCode) {

    if (!folderIdGetter || typeof (folderIdGetter) !== 'function') {
        throw new Error('folderIdGetter should be a function');
    }

    // return function (req,res,next) {
    //   return new Promise(function () {
    //     serverLogger.info("======================just debug all api auth ok!!!!!!!!!!!!!!!!!")
    //     next();
    //   });
    // };

    let folderAuth = (req, res, next) => {
        let logger = serverLogger.new('[ FOLDER-API-AUTH ] ', { url: req.url });
        assert.ok(req.user.userId, 'req.user.userId should be ok');
        var folderId = folderIdGetter(req);
        logger.info('authing user ' + req.user.userId + ' does have ' + permissionCode + 'for folder ' + folderId);
        return passportApi.UsercontrollerApiFp.userFolderauthGet({ folderId: folderId, code: permissionCode, userId: req.user.userId })(undefined, services.passport)
            .then((ok) => {
                logger.info('authed user ' + req.user.userId + ' does have ' + permissionCode + ' for folder ' + folderId + ' return ' + ok);
                if (!ok) {
                    res.status(403).json({ message: '没有此权限' });
                    return;
                }
                next();

            }, (err) => {
                logger.info('authed user' + req.user.userId + ' does have ' + permissionCode + 'for folder ' + folderId + ' return error : ' + JSON.stringify(err));
                res.status(500).json({ message: '服务端调用错误' });
            });
    };

    return folderAuth;
}

//middleware: set folderPermissions to req.user, req.session.user;
const folderPermissionsMid = (req, res, next) => {
    const { user } = req;
    return passportApi.UsercontrollerApiFp.userUserFolderPermissionListGet({ userId: user.userId })(undefined, services.passport)
        .then(permissions => {
            // apiLogger.debug('Get Folder Permissions for user', userId, permissions);
            user.folderPermissions = permissions;
            if (req.session) req.session.user = user; //Update session user.
            if (next) next();
            return;
        }).catch(err => {
            apiLogger.error('Get Folder Permissions Error for user', userId, err);
            if (next) next(new Error('Get User Folder Permissions Error'));
            throw new Error('Get User Folder Permissions Error');
        });
};

export {
    authCanceler,
    folderAuthCanceler,
    rejectIfOnlyHave,
    folderPermissionsMid,
    /**
     * dfasd
     */
    passIfHaveAnyOneIn
};

