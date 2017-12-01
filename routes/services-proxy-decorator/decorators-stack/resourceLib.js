var assert = require('assert');
// var passportApi = require('../../../api/passportApi.js');
// var resourceApi = require('../../../api/resourceApi.js');
import { resourceApi, passportApi } from '../../../api/api';
var querystring = require('querystring');
import { services } from '../../../config/micro-services';
import { serverLogger, apiLogger } from '../../../lib/log';
import { PERMISSIONS, FOLDER_PERMISSIONS } from '../../../config/permissions';
var util = require('util');
var url = require('url');

const FORBIDDEN = 403;

import {
    folderPermissionsMid,
} from './api-auth';

/**
 * 1. 当前用户是编审，ok
 * 2, 当前资产 处于上传状态，且是当前用户上传的，ok
 * @param {*} assetsIdsGetter
 */
export function canManageAssets(assetsIdsGetter) {

    return function canManageAssets$(req, res, next) {
        let assetsIds = assetsIdsGetter(req);
        console.log('--11----------------assetsIds=====>1030====== ', assetsIds);
        if (!assetsIds || assetsIds.length <= 0) {
            console.log('---22---------------assetsIds=====>1030====== ', assetsIds);
            next();
            return;//do nothing just proxy. will not do any parameter valid
        }

        var logger = serverLogger.new(' canManageAssets: ', { userId: req.user.userId });
        let permissionCode = PERMISSIONS.ASSETS_AUDIT_PAGE;

        assert.ok(req.user.userId, 'req.user.userId should be ok');
        //查看用户是否有ASSETS_AUDIT_PAGE，如果由，则任何数据可查看
        logger.verbose('authing user ' + req.user.userId + ' does have ' + permissionCode);
        return passportApi.UsercontrollerApiFp.userAuthGet({ code: permissionCode, userId: req.user.userId })(undefined, services.passport)
            .then((ok) => {
                logger.info('auth user ' + req.user.userId + ' does have ' + permissionCode + ' return ' + ok);
                return ok;
            })
            .then((ok) => {
                if (ok) {
                    return ok;
                }

                return checkIfOwnAssetAndUnsubmit(req.user, assetsIds);
            }).then((ok) => {

                if (ok) {
                    next();
                    return;
                }

                res.status(FORBIDDEN).json({ message: '数据无权限操作' });
                logger.info('资产 ' + assetsIds + ' 当前用户无权限操作. ');
                return;
            }).catch(err => {
                logger.info(' auth user' + req.user.userId + ' does canManageAssets got error : ' + util.inspect(err));
                res.status(500).json({ message: '服务端调用错误' });
            });
    };
}

/**
 * 1. 当前用户是编审，ok
 * 2. 当前用户对此资产所在目录 有查看权限，ok
 * 3, 当前资产 处于上传状态，且是当前用户上传的，ok
 * @param {*} assetsIdsGetter
 */
export function canViewAssets(assetsIdsGetter) {

    return function canViewAssets$(req, res, next) {
        let assetsIds = assetsIdsGetter(req);
        var logger = serverLogger.new(' canViewAssets: ', { userId: req.user.userId, assetsIds: assetsIds });

        if (assetsIds.length <= 0) {
            logger.info('assetsIds is empty ,just proxy');
            next();
            return;//do nothing just proxy. will not do any parameter valid
        }

        let permissionCode = PERMISSIONS.ASSETS_AUDIT_PAGE;

        assert.ok(req.user.userId, 'req.user.userId should be ok');
        //查看用户是否有ASSETS_AUDIT_PAGE，如果由，则任何数据可查看
        logger.verbose('authing user ' + req.user.userId + ' does have ' + permissionCode);
        return passportApi.UsercontrollerApiFp.userAuthGet({ code: permissionCode, userId: req.user.userId })(undefined, services.passport)
            .then((ok) => {
                logger.info('authed user ' + req.user.userId + ' does have ' + permissionCode + ' return ' + ok);
                return ok;
            })
            .then((ok) => {
                if (ok) {
                    return ok;
                }

                logger.verbose('check folder permission for thease assets');
                let folderPermissionCode = FOLDER_PERMISSIONS.VIEW_ASSETS;
                return folderPermissionsMid(req, res).then(()=> {
                    return checkPermissionOfBatchAssets(req.user, folderPermissionCode, assetsIds);
                });
            })
            .then((ok) => {
                if (ok) {
                    return ok;
                }

                //获取图片信息查看图片的状态和上传人
                //const unsubmit = 1;//资产上传状态 1未提交 2入库中 3已入库 4入库失败
                logger.verbose('getting assets info ', { ids: assetsIds });
                return checkIfOwnAssetAndUnsubmit(req.user, assetsIds);
            }).then((ok) => {

                if (ok) {
                    next();
                    return;
                }

                res.status(FORBIDDEN).json({ message: '数据无权限查看' });
                logger.info('资产 ' + assetsIds + ' 当前用户无权限查看. ');
                return;
            }).catch(err => {
                logger.info(' authed user' + req.user.userId + ' got error : ' + util.inspect(err));
                res.status(500).json({ message: '服务端调用错误' });
            });
    };
}

/**
 * 是否能够下载某目录的资产
 * 1. 当前用户对 该目录是否具有下载权限
 * @param {*} assetsIdsGetter
 */
export function canDownloadAssets(assetsIdsGetter) {

    return function canDownloadAssets$(req, res, next) {
        let assetsIds = assetsIdsGetter(req);
        var logger = serverLogger.new(' canDownloadAssets: ', { userId: req.user.userId, assetsIds: assetsIds });

        if (assetsIds.length <= 0) {
            logger.info('assetsIds is empty ,just proxy');
            next();
            return;//do nothing just proxy. will not do any parameter valid
        }

        let folderPermissionCode = FOLDER_PERMISSIONS.DOWNLOAD_ASSETS;

        assert.ok(req.user.userId, 'req.user.userId should be ok');
        //查看用户是否有ASSETS_AUDIT_PAGE，如果由，则任何数据可查看
        logger.verbose('authing user ' + req.user.userId + ' does have ' + folderPermissionCode);
        return folderPermissionsMid(req, res).then(()=> {
            return checkPermissionOfBatchAssets(req.user, folderPermissionCode, assetsIds);
        })
            .then(ok => {
                if (ok) {
                    logger.verbose('authed user ' + req.user.userId + ' does have ' + folderPermissionCode + ' return true');
                    next();
                    return;
                }

                res.status(403).json({ message: '数据无权限下载' });
                logger.info('资产 ' + assetsIds + ' 当前用户无权限下载. ');
                return;
            }).catch(err => {
                logger.info(' auth user' + req.user.userId + ' got error : ' + util.inspect(err));
                res.status(500).json({ message: '服务端调用错误' });
            });
    };
}

/**
 * 是否能够提交上传的资产
 * 1. 当前图片拥有者是当前用户
 * 2. 当前图片状态是未提交
 * @param {*} assetsIdsGetter
 */
export function canSubmitUploadedAssets(assetsIdsGetter) {

    return function canSubmitUploadedAssets$(req, res, next) {
        let assetsIds = assetsIdsGetter(req);
        var logger = serverLogger.new(' canSubmitUploadedAssets: ', { userId: req.user.userId, assetsIds: assetsIds });

        if (assetsIds.length <= 0) {
            logger.info('assetsIds is empty ,just proxy');
            next();
            return;//do nothing just proxy. will not do any parameter valid
        }

        assert.ok(req.user.userId, 'req.user.userId should be ok');
        //查看是否是当前用户上传的，并且是未提交状态
        logger.verbose('authing user ' + req.user.userId + ' own assets and assets state is unsubmit');
        return checkIfOwnAssetAndUnsubmit(req.user, assetsIds)
            .then(ok => {
                if (ok) {
                    logger.verbose('authed user ' + req.user.userId + ' own assets and assets state is unsubmit return ok');
                    next();
                    return;
                }

                res.status(FORBIDDEN).json({ message: '数据无权限提交' });
                logger.info('资产 ' + assetsIds + ' 当前用户无权限提交');
                return;
            }).catch(err => {
                logger.info(' auth user' + req.user.userId + ' got error : ' + util.inspect(err));
                res.status(500).json({ message: '服务端调用错误' });
            });
    };
}

export function checkPermissionOfBatchAssets(currentUser, permissionCode, assetsIds) {
    var logger = serverLogger.new('checkPermissionOfBatchAssets', { permissionCode: permissionCode, assetsIds: assetsIds });
    return resourceApi.AssestApiFp.assetsGetFoldersGet({ ids: assetsIds })(undefined, services.resource)
        .then(data => {
            logger.verbose('get assets info success ', { ids: assetsIds });
            //遍历各个资产，查看其所在目录是否 具有 相应权限
            Object.keys(data).forEach((assetId) => {
                if (data[assetId].can) {
                    return;
                }
                data[assetId].forEach(folderId => {
                    let folderPermissions = currentUser.folderPermissions[folderId] || [];
                    if (folderPermissions.indexOf(permissionCode) >= 0) {
                        logger.verbose(assetId + 'is in folder ' + folderId + ', can ' + permissionCode);
                        data[assetId].can = true;
                    }
                });
            });

            //判断是否含有  不具有 相应权限的资产
            var noCanAssetIds = Object.keys(data).filter(assetId => !(data[assetId].can));
            noCanAssetIds.forEach(assetId => logger.verbose(assetId + 'is in folder ' + data[assetId] + ' , can not ' + permissionCode));
            let res = noCanAssetIds.length == 0;
            logger.info(' user ' + currentUser.userId + ' does have ' + permissionCode + ' result is ' + res);
            return res;

        }, (err) => {
            logger.error(' get assets info error: ');
            return Promise.reject(' get assets info error : ' + util.inspect(err));
        });
}

function checkIfOwnAssetAndUnsubmit(currentUser, assetsIds) {
    var logger = serverLogger.new('checkIfOwnAssetAndUnsubmit : ', { assetsIds: assetsIds });
    const unsubmit = 1;//资产上传状态 1未提交 2入库中 3已入库 4入库失败
    logger.verbose('getting batch assets info ', { ids: assetsIds });
    return resourceApi.AssestApiFp.assetsBatchGet({ ids: assetsIds })(undefined, services.resource)
        .then(data => {
            logger.verbose('got batch assets info success ', { ids: assetsIds });

            //查看是否有不符合条件的数据
            let remain = data.filter(i => i.providerId != currentUser.userId || !(i.uploadState == unsubmit));
            if (remain.length > 0) {
                logger.info('for currentUser, assets ' + remain.map(i => i.id).toString() + ' is not provider or assets state is not unsubmit ');
                return false;
            }

            logger.info('currentUser is  provider and state is unsubmit');
            return true;
        }, (err) => {
            logger.error(' get batch assets info error : ', util.inspect(err));
            return Promise.reject(' get batch assets info error : ' + util.inspect(err));
        });
}

export function setAutoPassIfHaveNo_audit(req) {
    assert.ok(req.user.userId, 'req.user.userId should be ok');
    let logger = serverLogger.new('[ setAutoPassIfHaveNo_audit ] ', { userId: req.user.userId });
    var urlObj = url.parse(req.url, true);
    logger.verbose('authing user is NO_AUDIT');
    return passportApi.UsercontrollerApiFp.userAuthGet({ userId: req.user.userId, code: PERMISSIONS.NO_AUDIT })(undefined, services.passport)
        .then(ok => {
            logger.verbose('authed user  NO_AUDIT  return ' + ok);
            if (ok) {//当前用户免审
                urlObj.query['autoPass'] = 1;
                let newPath = urlObj.pathname + '?' + querystring.stringify(urlObj.query);
                logger.verbose('proxy ' + req.url + ' --> ' + newPath);
                return newPath;
            } else {
                // we should set to 0 if need audit
                urlObj.query['autoPass'] = 0;
                let newPath = urlObj.pathname + '?' + querystring.stringify(urlObj.query);
                logger.verbose('proxy ' + req.url + ' --> ' + newPath);
                return newPath;
            }
        });
}
setAutoPassIfHaveNo_audit.pos = 'path';


export function autoSetUserIdByCurrentUserRole(field) {
    if (!field) {
        field = 'userId';
    }

    let decorator = function (req) {
        let logger = serverLogger.new('[ autoSetUserIdByCurrentUserRole ] ', { userId: req.user.userId });
        assert.ok(req.user.userId, 'req.user.userId should be ok');
        logger.verbose('getting user permission list');
        return passportApi.UsercontrollerApiFp.userUserPermissionListGet({ userId: req.user.userId })(undefined, services.passport)
            .then(function (list) {
                logger.verbose('got user permission list');
                var urlObj = url.parse(req.url, true);
                if (
                    //如果当前用户仅有供稿权限
                    (list.length == 1 && list[0] == PERMISSIONS.ASSETS_UPLOAD_PAGE) ||
                    //或当前用户仅有供稿和用图权限
                    (list.length == 2 && list.indexOf(PERMISSIONS.ASSETS_UPLOAD_PAGE) >= 0 && list.indexOf(PERMISSIONS.USER_ASSETS_PAGE) >= 0)
                ) {
                    logger.verbose('user  only have ASSETS_UPLOAD_PAGE or (ASSETS_UPLOAD_PAGE and USER_ASSETS_PAGE ), so auto set current userId');
                    urlObj.query[field] = req.user.userId;
                } else {
                    urlObj.query[field] = ''; // force to clean
                }

                var newPath = urlObj.pathname + '?' + querystring.stringify(urlObj.query);
                serverLogger.info('proxy request path ' + req.url + ' -> ' + newPath);
                return newPath;
            });
    };
    decorator.pos = 'path';

    return decorator;
}

//给Folder对象赋予　permissions属性, 同事过滤掉用户跟用户无关的目录
//数据量较大时，性能比较慢。。
export function setFolderPermission(folders, req, relative) {
    let user = req.user;
    return setFoldersPermissions(user.folderPermissions, folders, relative);
}

const setFoldersPermissions = (permissions, folders, relative) => {
    if (!folders) {
        return [];
    }
    const startTime = Date.now();
    let filterFolders = [];
    let relativeIds = {};

    const setFolderPermission = (folder, permissions) => {
        if (permissions[folder.id.toString()] && permissions[folder.id.toString()].length > 0) {
            folder.permissions = permissions[folder.id.toString()]; //与用户有关的目录，此时为了方便客户端渲染树结构，也返回该目录的父目录信息
            if (relative) {
                relativeIds[folder.id.toString()] = true;
                const sp = folder.seq ? folder.seq.split(','): [];
                sp.map(rid => {
                    relativeIds[rid] = true;
                });
            }
        }
        else
            folder.permissions = [];

        if (folder.children)
            folder.children.map(child => {
                setFolderPermission(child, permissions);
            });
        return folder;
    };

    folders.map(folder => {
        setFolderPermission(folder, permissions);
    });
    apiLogger.debug('find relative folders', Date.now() - startTime);
    if (relative) {
        return folders.filter(folder => {
            return relativeIds[folder.id.toString()];
        });
    }

    return folders;
};
