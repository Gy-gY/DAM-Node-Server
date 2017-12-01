var url = require('url');
var querystring = require('querystring');
var assert = require('assert');
var passportApi = require('../../../api/passportApi.js');
import { services } from '../../../config/micro-services';
import {serverLogger} from '../../../lib/log';

//proxyReqPathResolver
function userIdInQueryString(field) {
    if (!field) {
        field = 'userId';
    }

    let decorator = function (req) {
        const user = req.user || req.session.user;
        assert.ok(user.userId, 'req.user.userId should be ok');
        var urlObj = url.parse(req.url, true);
        urlObj.query[field] = user.userId;
        // serverLogger.info('req body ' + JSON.stringify(req.body));
        var newPath = urlObj.pathname + '?' + querystring.stringify(urlObj.query);
        serverLogger.info('proxy request path ' + req.url + ' -> ' + newPath);
        return newPath;
    };
    decorator.pos = 'path';

    return decorator;
}

/**
 * 根据userIdSetter 自动为 在 request body 中的 userId 字段赋值
 * @param {*} userIdSetter  1> 空 则默认为userId，2> 字符串例如providerId, 3> 提供一个function(body,userId)来设置userId,返回body
 */
function userIdInJsonBody(userIdSetter) {
    if (!userIdSetter) {
        userIdSetter = defaultUserIdSetter;
    }

    if (typeof (userIdSetter) === 'string') {
        var path = userIdSetter;
        userIdSetter = function (body, userId) {
            body[path] = userId;
            return body;
        };
    }

    let decorator = function (body, req) {
        assert.ok(req.user.userId, 'req.user.userId should be ok');
        let bodyStr = body + ''; // default: it will be utf-8
        let bodyJson={};
        try{
            bodyJson = JSON.parse(bodyStr);
        }catch(error){
            serverLogger.error('error to parse data to json'+error+' , request body data is '+bodyStr);
            return bodyStr;
        }

        if (userIdSetter) {
            bodyJson = userIdSetter(bodyJson, req.user.userId);
        }
        let newBody = JSON.stringify(bodyJson);
        return newBody;
    };

    decorator.pos = 'body';

    return decorator;
}

let defaultUserIdSetter = (body, userId) => {
    body.userId = userId;
    return body;
};

///// response decorator

/**
 * 
 * @param {*} userIdsGetter  从返回数据中获取 userId的 func :   (body)=>body.userId
 * 						若为字符串，则自动从数据中解析
 * @param {*} userNameSetter 根据用户名称的设置返回结果的 func , (body,userName)=>{body.userName=userName;return body;}
 * 						若为字符串，则自动从数据中解析修改
 */
let userIdInRespBody = function (userIdGetter, userNameSetter) {

    if (!userIdGetter) {
        userIdGetter = (body) => body.userId;
    }

    if (typeof (userIdGetter) === 'string') {
        let path = userIdGetter;

        userIdGetter = (body) => dynamicGet(body,path);
    }

    if (!userNameSetter) {
        userNameSetter = (body, user) => {
            body.userName = user.displayName;
            return body;
        };
    }

    if (typeof (userNameSetter) === 'string') {
        let path = userNameSetter;
        if(path.indexOf('.')>=0){
            throw new Error('Not support . in path  now'+path);
        }
        userNameSetter = (body, user) => {
            body[path] = user.displayName;
            return body;
        };
    }

    let respDecorator = (proxyRes, proxyResData) => {
        let data = JSON.parse(proxyResData.toString('utf8'));
        let userId = userIdGetter(data);

        return getUserInfo(userId).then(function (userInfo) {
            let newData = userNameSetter(data, userInfo);
            return JSON.stringify(newData);
        });
    };

    return respDecorator;
};

let getUserInfo = (userId) => {
    if (!userId) {
        return Promise.resolve('');
    }

    return passportApi.UsercontrollerApiFp.userIdGet({ id: userId })(undefined, services.passport)
		.then((userInfo) => {
    return userInfo;
}, (err) => {
    serverLogger.info('get user ', userId, ' info error : ' + err);
    return { displayName: userId }; // 查不到用户，直接返回用户id
});
};

function dynamicGet(data, path) {
    var arr = path.split('.');
    let res = data;
    for (let seg of arr) {
        if (!res) continue;
        res = res[seg];
    }
    return res;
}

// function dynamicSet(data, path,value) {
//     var arr = path.split('.');
//     let res = data;
//     var index =-1;
//     for (let seg of arr) {
//         index++;
//         if (!res) continue;

//         if(index==arr.length-1){//the last should set
//             res[seg] =value;
//         }else{
//             res = res[seg];
//         }
//     }
	
//     return res;
// }

function dynamicGetInArray(dataArray, path) {
    var segments = path.split('.');
    var val = dataArray;
    var arrayIndex = -1;

    for (var index = 0; index < segments.length; index++) {
        var seg = segments[index];

        if (seg.endsWith('[]')) {

            if(!val){
                return [];
            }

            val = val[seg.substr(0, seg.length - 2)];//trim []
            arrayIndex = index;
            break;
        }

        if(val){
            val = val[seg];
        }

    }

    if (arrayIndex == -1) {
        throw new Error('error in path ' + path, 'should have [] when you invoke dynamicGetInArray');
    }

    let notArrayPath = segments.filter((seg, index) => index > arrayIndex).join('.');
    return val.map(item => dynamicGet(item, notArrayPath));
}

// function dynamicSetInArray(dataArray, path,value) {
//     var segments = path.split('.');
//     var val = dataArray;
//     var arrayIndex = -1;

//     for (var index = 0; index < segments.length; index++) {
//         var seg = segments[index];

//         if (seg.endsWith('[]')) {

//             if(!val){
//                 return [];
//             }

//             val = val[seg.substr(0, seg.length - 2)];//trim []
//             arrayIndex = index;
//             break;
//         }

//         if(val){
//             val = val[seg];
//         }

//     }

//     if (arrayIndex == -1) {
//         throw new Error('error in path ' + path, 'should have [] when you invoke dynamicGetInArray');
//     }

//     let notArrayPath = segments.filter((seg, index) => index > arrayIndex).join('.');
//     return val.map(item => dynamicSet(item, notArrayPath,value));
// }


/**
 * 
 * @param {*} 从返回数据中获取 userIds集合的 func : userIdsGetter  (body)=>body.list.map(i=>i.userId)
 * 						
 * @param {*} 根据用户id和用户名称设置返回结果中的用户名称的 func ,func 返回设置后的结果 : userNamesSetter 
 */
let userIdsInRespBody = function (userIdsGetter, userNamesSetter) {

    if (typeof (userIdsGetter) === 'string') {
        var path = userIdsGetter;
        userIdsGetter = (body) => {
            return dynamicGetInArray(body,path);
        };
    }

    if(typeof(userNamesSetter) === 'string' ){
        throw new Error('not support string for userNamesSetter now!');
    }

    let respDecorator = (proxyRes, proxyResData) => {
        let data ={};
        try {
            data = JSON.parse(proxyResData.toString('utf8'));    
        } catch (error) {
            serverLogger.error('error to parse data to json'+error+' , response data is '+proxyResData);
        }
        
        let userIds = userIdsGetter(data);

        return getUserInfoes(userIds).then(function (userNames) {
            let newData = userNamesSetter(data, userNames);
            return JSON.stringify(newData);
        });
    };

    return respDecorator;

};

let getUserInfoes = (userIds) => {

    return passportApi.UsercontrollerApiFp.userSimpleInfoPageListGet({ userIds: userIds })(undefined, services.passport)
		.then((userInfoes) => {
    if (!userInfoes || !userInfoes.list) {
        serverLogger.info('get user ', userIds, ' info error : get empty data');
        return {};
    }

    var obj = {};
    for (let user of userInfoes.list) {
        obj[user.userId] = user.displayName;
    }
    return obj;

}, (err) => {
    serverLogger.info('get user ', userIds, ' info error : ' + err);
    return {};
});
};

//该装饰器提供如下功能：
//一个原始的request的path 如：oldPath: renameFolders 通过代理时转发给
//后端的　newPath: folders接口，则执行　changePathNameDecorator(oldPath, newPath)
const changePathNameDecorator = (newPath) => {
    let decorator = function (req) {
        return newPath;
    };
    decorator.pos = 'path';

    return decorator;
}

export {
	//req
	userIdInQueryString,
	userIdInJsonBody,
    changePathNameDecorator,

	//resp
	userIdInRespBody,
	userIdsInRespBody,
};