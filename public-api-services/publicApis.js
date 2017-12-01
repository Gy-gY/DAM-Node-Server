import express from 'express';
// import passport from 'passport';
import oauth2auth from '../middlewares/oauth2authentication';
import httpProxy from 'express-http-proxy';
import fetch from 'isomorphic-fetch';
import url from 'url';
import {apiLogger} from '../lib/log';
import proxyHandler from '../routes/micro-services-proxy';
import {
    canDownloadAssets,
    checkPermissionOfBatchAssets
} from '../routes/services-proxy-decorator/decorators-stack/resourceLib';

import { FOLDER_PERMISSIONS } from '../config/permissions';
import redisClient from '../utils/redisClient';
import { redis } from '../config';
import http from 'http';
import {
    folderPermissionsMid,
} from '../routes/services-proxy-decorator/decorators-stack/api-auth';
import {
    FoldersApiFp,
    FolderItemsApiFp,
    FavoritecontrollerApiFp,
    DownloadcontrollerApiFp,
    ImagesApiFp,
    AssestApiFp,
} from '../api/resourceApi';

import {
    UsercontrollerApiFp,
    WorkgroupcontrollerApiFp,
} from '../api/passportApi';

import { services, searchDam } from '../config/micro-services';


import { noNeedProxy, publicAPIConfig } from '../routes/services-proxy-decorator';

let router = express.Router();


// apiLogger.debug('public API config After Format', publicAPIConfig);

const apiList = Object.keys(publicAPIConfig);
setTimeout(function() {
    for (let key in apiList) {
        const api = apiList[key];
        const apiConfig = publicAPIConfig[api];
        if (api.split) {
            let [method, path] = api.split(':');
            if (apiConfig.rename)
                path = apiConfig.rename;
            path = path.replace(/{(\w+)}/, ':$1');
            if (apiConfig.auth === 'oauth2')
                router[method.toLowerCase()](path, oauth2auth, proxyHandler);
            else
            router[method.toLowerCase()](path,proxyHandler);
            apiLogger.debug(' Router',method.toLowerCase(), path);
        }
    }
}, 3000);

const handleErrorResponse = (res, err, status=400) => {
    if (err.status) { //Response Object
        return err.json().then((json) => {
            apiLogger.error('PUBLIC API', json);
            res.status(json.status).json(json).end();
        });
    } else {
        apiLogger.error('PUBLIC API', err);
        return res.status(status).json({error_description: err.message}).end();
    }
};

router.post('/users', oauth2auth, (req, res) => {
    let userParams = req.body;
    const userId = req.userId;
    const invitationCode = userParams.invitationCode;
    let findGroupId = () => {
        return UsercontrollerApiFp.userIdGet({id: userId})(undefined, services.passport)
        .then(user1 => user1.workgroupId);
    };
    if (invitationCode)
        findGroupId = () => {
            return WorkgroupcontrollerApiFp.workgroupsGet({})(undefined, services.passport)
            .then(groups => {
                const g = groups.find(group => group.invitationCode === invitationCode);
                return g.id;
            });
        };
    findGroupId()
    .then(gid => {
        if (!gid) throw new Error('Group not found');
        userParams.workgroupId = gid;
        apiLogger.debug('Create User, Params', userParams );
        return UsercontrollerApiFp.userCreatePost({user: userParams})(undefined, services.passport);
    }).then(user => {
        apiLogger.debug('Create User, Return', user);
        if (user.status == false && user.message)
            return res.status(400).json({error_description: user.message, error: '创建用户失败'}).end();
        const fields = ['userName', 'mobile', 'realName', 'isWorkgroupAdmin', 'description', 'userId'];
        let newUser = {};
        fields.map(field => {
            if (user.user[field]) newUser[field] = user.user[field];
        });
        res.json(newUser).end();
    }).catch(err => {
        handleErrorResponse(res, err);
    });
});

router.post('/download/verify', oauth2auth, (req, res) => {
    if (!req.body) return res.status(400).json({error_description: '', error: '参数缺失'}).end();

    let folderPermissionCode = FOLDER_PERMISSIONS.DOWNLOAD_ASSETS;

    //查看用户是否有ASSETS_AUDIT_PAGE，如果由，则任何数据可查看
    apiLogger.verbose('authing user ' + req.user.userId + ' does have ' + folderPermissionCode);
    return folderPermissionsMid(req, res).then(()=> {
        return checkPermissionOfBatchAssets(req.user, folderPermissionCode, req.body);
    }).then(ok => {
        if (ok) {
            apiLogger.verbose('authed user ' + req.user.userId + ' does have ' + folderPermissionCode + ' return true');
            return res.json({allow: true}).end();
        }
        return res.json({allow: false}).end();
    }).catch(err => {
        handleErrorResponse(res, err);
    });
});

router.get('/profile', oauth2auth, (req, res) => {
    const userId = req.user.userId;
    UsercontrollerApiFp.userIdGet({id: userId})(undefined, services.passport)
    .then(user => {
        if (user) return res.json(user).end();
        return res.status(404).end();
    }).catch(err => {
        handleErrorResponse(res, err);
    });
});

//通过dam做代理转发的方式请求阿里云地址(由于陈鹏的前端下载方案不能在query中传递参数，只能在body中传递)
router.get('/download/proxy/:file', (req, res) => {
    const { file } = req.params;
    apiLogger.info('proxy download', file);
    if (!file) return res.status(400).json(
            {error_description: 'missing parameter file'}
        ).end();

    redisClient.get(redis.DOWNLOAD_PREFIX + file, (err, url) => {
        if (err) {
            apiLogger.error(err);
            res.status(500).end();
        }
        apiLogger.info('proxy download', req.path, '==>', url);
        if (url) {
            return http.get(url, (_res =>_res.pipe(res)));
        } else {
            return res.status(403).end();
        }
    });
});
const ipList = ['127.0.0.1', '172.18.36.2', '106.120.217.164', '192.168.2.68', '59.110.168.105', '59.110.171.3', '60.205.186.42',
    '60.205.211.83', '218.94.189.82', '101.200.155.22', '123.57.58.250',
    '123.56.15.6', '123.56.23.142'];
router.get('/damSearcher/searchDam', (req, res) => {
    //console.log('$#%#$#%$#$$#$%#$%$#%$$#%$#');
    //let ip = req.ip.replace('::ffff:');
    console.log(req.ip);
    
    //if(ipList.includes(req.ip)) {
    let {userid, keywords, pageNum, pageSize} = req.query;
    let pageParam = '';
    if(pageNum&&pageSize) {
        pageParam = `&pageNum=${pageNum}&pageSize=${pageSize}`;
    }
    let url = `${searchDam}/damSearcher/searchDam?keywords=${keywords}&userid=${userid}${pageParam}`;
    let serchUrl = encodeURI(url);
    fetch(serchUrl, {
        credentials: 'include',
        method: 'GET',
        headers: {
            'Accept': 'application/json',
        },
    })
        .then(response=>{
            //console.log(response);
            response.json()
            .then(data=>{
                res.send(data).end();
            }).catch(err=>{
                console.log(err);
                res.send(err).end();
            });
        });
    //}else {
    //    res.send({msg:'呵呵，您的IP地址被禁用'}).end();
    //}
});

router.get('/favorite/pageList', (req, res) => {
    //console.log('$#%#$#%$#$$#$%#$%$#%$$#%$#');
    //let ip = req.ip.replace('::ffff:');
    console.log(req.ip);
    //if(ipList.includes(req.ip)) {
    let {user_id, asset_type, source, pageNum, pageSize} = req.query;
    asset_type = asset_type?asset_type:'';
    source = source?source:'';
    let pageParam = '';
    if(pageNum&&pageSize) {
        pageParam = `&pageNum=${pageNum}&pageSize=${pageSize}`;
    }
    fetch(`${services.resource}/favorite/pageList?user_id=${user_id}&asset_type=${asset_type}&source=${source}${pageParam}`, {
        credentials: 'include',
        method: 'GET',
        headers: {
            'Accept': 'application/json',
        },
    })
        .then(response=>{
                //console.log(response);
            response.json()
            .then(data=>{
                res.send(data).end();
            }).catch(err=>{
                console.log(err);
                res.send(err).end();
            });
        });
    //}else {
    //    res.send({msg:'呵呵，您的IP地址被禁用'}).end();
    //}
});

router.get('/user/customerUserList', (req, res) => {
    //console.log('$#%#$#%$#$$#$%#$%$#%$$#%$#');
    //let ip = req.ip.replace('::ffff:');
    console.log(req.ip);
    //if(ipList.includes(req.ip)) {
    let {customerId, userType} = req.query;
    fetch(`${services.passport}/user/customerUserList?customerId=${customerId}&userType=${userType}`, {
        credentials: 'include',
        method: 'GET',
        headers: {
            'Accept': 'application/json',
        },
    })
        .then(response=>{
                //console.log(response);
            response.json()
            .then(data=>{
                res.send(data).end();
            }).catch(err=>{
                console.log(err);
                res.send(err).end();
            });
        });
    //}else {
    //    res.send({msg:'呵呵，您的IP地址被禁用'}).end();
    //}
});
export default router;
