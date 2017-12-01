require('../../../utils/arrayExt.js');
var url = require('url');
import path from 'path';
import bluebird from 'bluebird';

import {
  userIdInQueryString as autoSetUserIdInQ,
  userIdInJsonBody as autoSetUserIdInReqBody,
  userIdInRespBody as parseUserIdInResp,
  userIdsInRespBody as parseUserIdsInResp,
  changePathNameDecorator,
} from './common-decorator';
import bodyParser from 'body-parser';

import {
  authCanceler as rejectIfNotHave,
  folderAuthCanceler as rejectIfFolderNotHave,
  rejectIfOnlyHave,
  folderPermissionsMid,
} from './api-auth';
import { PERMISSIONS, FOLDER_PERMISSIONS } from '../../../config/permissions';
import { serverLogger } from '../../../lib/log';
import * as resource from './resourceLib';
import customIdMid  from '../../../middlewares/customMid';

// let empty = (body) => { return body; /*DO nothing*/ };

import redisClient from '../../../utils/redisClient';
import { redis, client } from '../../../config';

let noNeedLogin = [

];

let noNeedProxy = [
    'GET:/folders/isBatchExist',
    'GET:/folders/isExist',

    'POST:/images',
    'POST:/assets/download',
    'GET:/images/{id}/folders',
    'POST:/images/batchdownloadurl',

  // resAudioUpload is not implement
    'POST:/resAudioUpload/create',
    'POST:/resAudioUpload/delete',
    'GET:/resAudioUpload/list',
    'POST:/resAudioUpload/list',
    'GET:/resAudioUpload/pageList',
    'POST:/resAudioUpload/pageList',
    'POST:/resAudioUpload/update',
    'GET:/resAudioUpload/view',

  //res-image-upload-batch is not implement
    'POST:/resImageUploadBatch/create',
    'POST:/resImageUploadBatch/delete',
    'GET:/resImageUploadBatch/list',
    'POST:/resImageUploadBatch/list',
    'GET:/resImageUploadBatch/pageList',
    'POST:/resImageUploadBatch/pageList',
    'POST:/resImageUploadBatch/update',
    'GET:/resImageUploadBatch/view',

  //
    'POST:/resImageUpload/create',

    'GET:/resImageUpload/testResize/{id}',

  //res-image-upload-meta
    'POST:/resImageUploadMeta/create',
    'POST:/resImageUploadMeta/delete',
    'GET:/resImageUploadMeta/list',
    'POST:/resImageUploadMeta/list',
    'GET:/resImageUploadMeta/pageList',
    'POST:/resImageUploadMeta/pageList',
    'POST:/resImageUploadMeta/update',
    'GET:/resImageUploadMeta/view',

  //res-image-upload-release
    'POST:/resImageUploadRelease/create',
    'POST:/resImageUploadRelease/delete',
    'GET:/resImageUploadRelease/list',
    'POST:/resImageUploadRelease/list',
    'GET:/resImageUploadRelease/pageList',
    'POST:/resImageUploadRelease/pageList',
    'POST:/resImageUploadRelease/update',
    'GET:/resImageUploadRelease/view',

  //res-root-folders
    'POST:/resRootFolders/create',
    'POST:/resRootFolders/delete',
    'GET:/resRootFolders/list',
    'POST:/resRootFolders/list',
    'GET:/resRootFolders/pageList',
    'POST:/resRootFolders/pageList',
    'POST:/resRootFolders/update',
    'GET:/resRootFolders/view',

  /////res-videos
    'POST:/videos/',
    'POST:/videos/pageList',

  //res-video-upload
    'POST:/resVideoUpload/create',

  //sensitive-word
    'POST:/sensitiveWord/create',
    'POST:/sensitiveWord/delete',
    'GET:/sensitiveWord/list',
    'POST:/sensitiveWord/list',
    'GET:/sensitiveWord/pageList',
    'POST:/sensitiveWord/pageList',
    'POST:/sensitiveWord/update',
    'GET:/sensitiveWord/view',

  //
    'POST:/uploadHandler/upload',

  //waterRule
    'POST:/waterRule/create',
    'POST:/waterRule/delete',
    'GET:/waterRule/list',
    'POST:/waterRule/list',
    'GET:/waterRule/pageList',
    'POST:/waterRule/pageList',
    'POST:/waterRule/update',
    'GET:/waterRule/view',
];

let decorators = {
  ////////////////////////////////////////////////////////////////////////resource

  ///////////////////////////// assest
    'POST:/assets': {
        before: [rejectIfNotHave(PERMISSIONS.ASSETS_UPLOAD_PAGE)],
        reqDecorator: autoSetUserIdInReqBody((body, userId) => {
            ['imgUploads', 'audioUpload', 'videoUpload'].forEach(i => {
                if (body[i]) {
                    serverLogger.verbose('auto parse current userId to ' + i + '.providerId');
                    body[i].providerId = userId;
                }
            });
            return body;
        })
    },
    'GET:/assets/batch': {
        before: [resource.canViewAssets((req) => {
            return url.parse(req.url, true).query['ids'];
        })]
    },
    'DELETE:/assets/batchDel/{folderId}': {
        before: [resource.canManageAssets(req => {
            return url.parse(req.url, true).query['ids'];
        })],
    },
    'POST:/assets/batchUpdate': {
        before: [resource.canManageAssets(req => {
            console.log(req.body);
            return url.parse(req.url, true).query['ids'];
        })],
    },

    'POST:/assets/download': {
        before: [bodyParser.json(),resource.canDownloadAssets(req => {
            return req.body;//TODO 并没有考虑 同一个资产 在多个目录权限不同的情况
        })],
        reqDecorator: autoSetUserIdInQ('userId'),
    },

    'POST:/assets/downloadurl': {
        respDecorator: (proxyRes, proxyResData) => {
            let data = JSON.parse(proxyResData.toString('utf8'));
            const _url = url.parse(data.url);
            const fileName = path.basename(_url.pathname);

            return new Promise((resolve, reject) => {
                console.log(redis.DOWNLOAD_PREFIX + fileName,
                redis.DOWNLOAD_EXPIRE, data.url
                );
                redisClient.setex(
                    redis.DOWNLOAD_PREFIX + fileName,
                    redis.DOWNLOAD_EXPIRE, data.url,
                    (err, r) => {
                        if (err) {
                            console.log('save data to redis error');
                            return reject(err);
                        }
                        data.proxy = `/v1/download/proxy/${fileName}`;
                        return resolve(data);
                    }
                );
            });
        },
    },
    'GET:/assets/loadAssets/{folderId}': {
        before: [rejectIfFolderNotHave(req => {
            var segs = url.parse(req.url, false).pathname.split('/');
            var id = segs[segs.length - 1];
            return id;
        }, FOLDER_PERMISSIONS.VIEW_ASSETS)],
        reqDecorator: autoSetUserIdInQ()
    },
    'GET:/assets/downloadCheck': {
        before: [customIdMid]
    },
    'PUT:/assets/review': {
        before:[bodyParser.json(),rejectIfNotHave(PERMISSIONS.ASSETS_AUDIT_PAGE), (req, resp, next)=>{
            req.body = req.body;
            console.log(req.body);
            next();
        }],
        //reqDecorator: autoSetUserIdInReqBody('reviewerId')
    },
    'POST:/assets/update/{id}': {
        before: [resource.canManageAssets(req => {
            console.log(req.body);
            var segs = url.parse(req.url, false).pathname.split('/');
            var id = segs[segs.length - 1];
            return [id];
        })]
    },
    'DELETE:/assets/{id}': {
        before: [resource.canManageAssets(req => {
            var segs = url.parse(req.url, false).pathname.split('/');
            var id = segs[segs.length - 1];
            return [id];
        })],
    },
    'GET:/assets/{id}': {
        before: [resource.canViewAssets((req) => {
            var segs = url.parse(req.url, false).pathname.split('/');
            var id = segs[segs.length - 1];
            return [id];
        })],
        respDecorator: parseUserIdInResp('providerId', 'providerName')  // add providerName by providerId
    },
    'GET:/assets/{id}/keywords': {
        before: [resource.canViewAssets((req) => {
            var segs = url.parse(req.url, false).pathname.split('/');
            var id = segs[segs.length - 2];
            return [id];
        })],
    },
    'PUT:/assets/{id}/keywords': {
        before: [resource.canManageAssets((req) => {
            var segs = url.parse(req.url, false).pathname.split('/');
            var id = segs[segs.length - 2];
            return [id];
        })],
    },
    'PUT:/assets/{id}/online': {
        before: [rejectIfNotHave(PERMISSIONS.ASSETS_AUDIT_PAGE)]
    },

  //// DOWNLOAD
    'GET:/download/pageList': {
        reqDecorator: autoSetUserIdInQ()
    },

    'POST:/download/batch': {
        reqDecorator: autoSetUserIdInQ()
    },

    'DELETE:/download/batch': {
        reqDecorator: autoSetUserIdInQ()
    },

  //// favorite
    'POST:/favorite/create': {
        reqDecorator: autoSetUserIdInQ('user_id')
    },

    'DELETE:/favorite/delete': {
        reqDecorator: autoSetUserIdInQ('user_id')
    },
    'GET:/favorite/pageList': {
        reqDecorator: autoSetUserIdInQ('user_id'),
        respDecorator: parseUserIdsInResp((body) => {
            body.list.map(i => i.basic.providerId);
        }, (body, userNames) => {

            if (body.list) {
                body.list.forEach(i => {
                    i.basic.providerName = userNames[i.basic.providerId] || i.basic.providerId;
                });
            }

            return body;
        })
    },

  /////////folder items
    'GET:/folderitems/v2/{folderId}': {
        //before: [rejectIfFolderNotHave(req => {
        //    var segs = url.parse(req.url, false).pathname.split('/');
        //    var id = segs[segs.length - 1];
        //    return id;
        //}, FOLDER_PERMISSIONS.VIEW_ASSETS)],
        respDecorator: parseUserIdsInResp(
      (body) => {
          // return [...body.list.map(i => i.basic.providerId), ...body.list.map(i => i.basic.editorUserId)];
          let arr = [];
          if(body.list) {
            return [...body.list.map(i => i.basic.providerId), ...body.list.map(i => i.basic.editorUserId)];
          } else {
              return arr;
          }
      },
      (body, userNames) => {

          if (body.list) {
              body.list.forEach(i => {
                  i.basic.editorUserName = userNames[i.basic.editorUserId] || i.basic.editorUserId;
                  //i.basic.providerName = userNames[i.basic.providerId] || i.basic.providerId;
              });
          }
          return body;
      }
    )
    },
    'DELETE:/folderitems/{folderId}': {
        before: [bodyParser.json(), resource.canManageAssets(req => {
            return req.body;//TODO 并没有考虑 同一个资产 在多个目录权限不同的情况
        })]
    },
    'GET:/folderitems/{folderId}': {
        before: [rejectIfFolderNotHave(req => {
            var segs = url.parse(req.url, false).pathname.split('/');
            var id = segs[segs.length - 1];
            return id;
        }, FOLDER_PERMISSIONS.VIEW_ASSETS)]
    },
    'POST:/folderitems/{folderId}': {
        before: [rejectIfFolderNotHave(req => {
            var segs = url.parse(req.url, false).pathname.split('/');
            return segs[segs.length - 1];
        }, FOLDER_PERMISSIONS.UPLOAD_ASSETS)]
    },
    'GET:/folderitems/count':{
        before:[rejectIfNotHave(PERMISSIONS.ASSETS_AUDIT_PAGE)]
    },
    'GET:/folderitems/unInstockAssetsCount':{
        reqDecorator:autoSetUserIdInQ()//获取当前用户的未入库的资产个数
    },

  ////////////folders
    'GET:/folders': {
        before: [folderPermissionsMid, customIdMid],
        respDecorator: (proxyRes, proxyResData, req) => {
            let folders = JSON.parse(proxyResData.toString('utf8'));
            return resource.setFolderPermission(folders, req, true);
        },
    },
    'POST:/folders/{id}/sub_folders': {
        before: [folderPermissionsMid, customIdMid],
        respDecorator: (proxyRes, proxyResData, req) => {
            let folders = JSON.parse(proxyResData.toString('utf8'));
            return resource.setFolderPermission(folders, req, false);
        },
    },
    'POST:/folders/copy': {
        before: [rejectIfNotHave(PERMISSIONS.FOLDER_MANAGEMENT_PAGE), customIdMid]
    },
    'GET:/folders/viewVcgFolder': {
        before: [customIdMid]
    },
    'POST:/folders/merge': {
        before: [customIdMid]
    }, 
    'POST:/folders/move': {
        before: [rejectIfNotHave(PERMISSIONS.FOLDER_MANAGEMENT_PAGE), customIdMid]
    },
    'DELETE:/folders/{id}': {
        before: [rejectIfNotHave(PERMISSIONS.FOLDER_MANAGEMENT_PAGE), customIdMid]
    },
    'POST:/folders/{id}': {
        before: [rejectIfNotHave(PERMISSIONS.FOLDER_MANAGEMENT_PAGE), customIdMid]
    },
    'PUT:/folders/{id}': {
        before: [rejectIfNotHave(PERMISSIONS.FOLDER_MANAGEMENT_PAGE), customIdMid]
    },

  ///////image extention
    'DELETE:/image/{id}/extension/': {
        before: [resource.canManageAssets(req => {
            var segs = url.parse(req.url, false).pathname.split('/');
            return segs[segs.length - 2];
        })]
    },
    'GET:/image/{id}/extension/': {
        before: [resource.canViewAssets(req => {
            var segs = url.parse(req.url, false).pathname.split('/');
            return segs[segs.length - 2];
        })]
    },
    'POST:/image/{id}/extension/': {
        before: [resource.canManageAssets(req => {
            var segs = url.parse(req.url, false).pathname.split('/');
            return segs[segs.length - 2];
        })]
    },
    'PUT:/image/{id}/extension/': {
        before: [resource.canManageAssets(req => {
            var segs = url.parse(req.url, false).pathname.split('/');
            return segs[segs.length - 2];
        })]
    },

  ////////////image

    'DELETE:/images/': {
        before: [bodyParser.json(),resource.canManageAssets(req => {
            return req.body;//TODO 并没有考虑 同一个资产 在多个目录权限不同的情况
        })]
    },
    'POST:/images/batch': {//批量获取
        before: [bodyParser.json(),resource.canViewAssets(req => {
            return req.body;//TODO 并没有考虑 同一个资产 在多个目录权限不同的情况
        })]
    },
    'GET:/images/page': {//获取所有分页信息,如果具有编审权限，则开放
        before: [rejectIfNotHave(PERMISSIONS.ASSETS_AUDIT_PAGE)]
    },
    'DELETE:/images/{id}': {
        before: [resource.canManageAssets(req => {
            var segs = url.parse(req.url, false).pathname.split('/');
            return segs[segs.length - 1];
        })]
    },
    'GET:/images/{id}': {
        before: [folderPermissionsMid, resource.canViewAssets(req => {
            var segs = url.parse(req.url, false).pathname.split('/');
            return segs[segs.length - 1];
        })]
    },
    'PUT:/images/{id}': {
        before: [resource.canManageAssets(req => {
            var segs = url.parse(req.url, false).pathname.split('/');
            return segs[segs.length - 1];
        })]
    },
    'GET:/images/{id}/downloadurl': {
        before: [folderPermissionsMid, resource.canDownloadAssets(req => {
            var segs = url.parse(req.url, false).pathname.split('/');
            return segs[segs.length - 2];
        })]
    },
    'GET:/images/{id}/exif': {
        before: [resource.canViewAssets(req => {
            var segs = url.parse(req.url, false).pathname.split('/');
            return segs[segs.length - 2];
        })]
    },
    'PUT:/images/{id}/rotation': {
        before: [resource.canManageAssets(req => {
            var segs = url.parse(req.url, false).pathname.split('/');
            return segs[segs.length - 2];
        })]
    },

  /////////////////// in
    'POST:/instocks/': { //这个接口时 上传之后的提交并不是编审之后的入库！！！！
        before: [bodyParser.json(), resource.canSubmitUploadedAssets(req=>req.body)],
        reqDecorator: resource.setAutoPassIfHaveNo_audit,
    },

  /////////////////// res-image-upload-controller
    'GET:/resImageUpload/batchDelByIds/{folderId}': {
        before: [resource.canManageAssets(req => {
            return url.parse(req.url, true).query['ids'];
        })]
    },
    'POST:/resImageUpload/batchUpdate': {
        before: [resource.canManageAssets(req => {
            return url.parse(req.url, true).query['assetsId'];
        })],
        reqDecorator: autoSetUserIdInQ()
    },
    'GET:/resImageUpload/delById/{folderId}': {
        before: [resource.canManageAssets(req => {
            return url.parse(req.url, true).query['id'];
        })]
    },
    'GET:/resImageUpload/folderUploads/{id}': { //获得指定目录的所有上传文件,所有人
        before: [rejectIfNotHave(PERMISSIONS.ASSETS_AUDIT_PAGE)]
    },
    'GET:/resImageUpload/list': {
        before: [rejectIfNotHave(PERMISSIONS.ASSETS_AUDIT_PAGE)]
    },
    'POST:/resImageUpload/list': {
        before: [rejectIfNotHave(PERMISSIONS.ASSETS_AUDIT_PAGE)]
    },
    'GET:/resImageUpload/myFolderUpload': {
        before: [rejectIfFolderNotHave(req=>{
            return url.parse(req.url, true).query['folderId'];
        },FOLDER_PERMISSIONS.VIEW_ASSETS)],
        reqDecorator: autoSetUserIdInQ(),
    },
    'GET:/resImageUpload/myUpload': {
        reqDecorator: autoSetUserIdInQ(),
    },
    'POST:/resImageUpload/myUpload': {
        reqDecorator: autoSetUserIdInQ(),
    },
    'GET:/resImageUpload/rotate/{id}': {
        before: [resource.canManageAssets(req => {
            var segs = url.parse(req.url, false).pathname.split('/');
            return segs[segs.length - 1];
        })]
    },
    'POST:/resImageUpload/update/{id}': {
        before: [resource.canManageAssets(req => {
            var segs = url.parse(req.url, false).pathname.split('/');
            return segs[segs.length - 1];
        })]
    },
    'GET:/resImageUpload/view/{id}': {
        before: [resource.canViewAssets(req => {
            var segs = url.parse(req.url, false).pathname.split('/');
            return segs[segs.length - 2];
        })]
    },
    'GET:/resImageUpload/{id}/exif': {
        before: [resource.canViewAssets(req => {
            var segs = url.parse(req.url, false).pathname.split('/');
            return segs[segs.length - 2];
        })]
    },

  ////////res-video
    'DELETE:/videos/': {
        before: [bodyParser.json(), resource.canManageAssets(req => {
            return req.body;//TODO 并没有考虑 同一个资产 在多个目录权限不同的情况
        })]
    },
    'GET:/videos/{id}': {
        before: [resource.canViewAssets(req => {
            var segs = url.parse(req.url, false).pathname.split('/');
            return segs[segs.length - 1];
        })]
    },
    'PUT:/videos/{id}':{
        before: [resource.canManageAssets(req => {
            var segs = url.parse(req.url, false).pathname.split('/');
            return segs[segs.length - 1];
        })]
    },
    'GET:/videos/{id}/downloadurl':{
        before:[resource.canDownloadAssets(req=>{
            var segs = url.parse(req.url, false).pathname.split('/');
            return segs[segs.length - 2];
        })]
    },

  ////////res-video-upload
    'GET:/resVideoUpload/batchDelByIds/{folderId}':{
        before: [resource.canManageAssets(req => {
            return url.parse(req.url, true).query['ids'];
        })]
    },
    'GET:/resVideoUpload/delById/{folderId}':{
        before: [resource.canManageAssets(req => {
            return url.parse(req.url, true).query['id'];
        })]
    },
    'GET:/resVideoUpload/getOrigURL/{id}':{
        before:[resource.canDownloadAssets(req=>{
            var segs = url.parse(req.url, false).pathname.split('/');
            return segs[segs.length - 1];
        })]
    },
    'POST:/resVideoUpload/getOrigURL/{id}':{
        before:[resource.canDownloadAssets(req=>{
            var segs = url.parse(req.url, false).pathname.split('/');
            return segs[segs.length - 1];
        })]
    },
    'GET:/resVideoUpload/myFolderUpload':{
        before: [rejectIfFolderNotHave(req=>{
            return url.parse(req.url, true).query['folderId'];
        },FOLDER_PERMISSIONS.VIEW_ASSETS)],
        reqDecorator: autoSetUserIdInQ(),
    },
    'GET:/resVideoUpload/unFolders':{
        reqDecorator: autoSetUserIdInQ(),
    },
    'POST:/resVideoUpload/update/{id}':{
        before: [resource.canManageAssets(req => {
            var segs = url.parse(req.url, false).pathname.split('/');
            return segs[segs.length - 1];
        })],
        reqDecorator:autoSetUserIdInQ(),
    },
    'GET:/resVideoUpload/view/{id}':{
        before: [resource.canViewAssets(req => {
            var segs = url.parse(req.url, false).pathname.split('/');
            return segs[segs.length - 1];
        })]
    },

  //// upload-handler
    'POST:/uploadHandler/batchUpload': {
        parseReqBody:false,
        before:[rejectIfFolderNotHave(req=>{
            return url.parse(req.url, true).query['folderId'];
        },FOLDER_PERMISSIONS.UPLOAD_ASSETS)],
        reqDecorator: autoSetUserIdInQ()
    },


  //// images
    'PUT:/images/review': {
        reqDecorator: autoSetUserIdInReqBody('reviewerId')
    },

    /// statistic
    'GET:/statistics/countAssetsByFilter':{
        before:[ rejectIfOnlyHave([PERMISSIONS.USER_ASSETS_PAGE]) ], //如果只有用户用图权限，则拒绝
        reqDecorator: resource.autoSetUserIdByCurrentUserRole('providerId')
    }
};

export default decorators;
export {
  noNeedLogin,
  noNeedProxy
};
