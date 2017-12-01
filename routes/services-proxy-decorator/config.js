import passportDecorators,{noNeedLogin as passportNoNeedLogin,noNeedProxy as passportNoNeedProxy} from './decorators-stack/passport';
import resourceDecorators,{noNeedLogin as resourceNoNeedLogin ,noNeedProxy as resourceNoNeedProxy} from './decorators-stack/resource';
import {apiLogger} from '../../lib/log';

let allNoNeedLogin = [ ...passportNoNeedLogin,...resourceNoNeedLogin ].concat([
	'POST:/oauth2/access_token',
	'POST:/oauth2/refresh_token',
]);
let allNoNeedProxy = [ ...passportNoNeedProxy,...resourceNoNeedProxy ];

let proxyDecoratorStack = Object.assign({},passportDecorators,resourceDecorators);
import {changePathNameDecorator} from './decorators-stack/common-decorator';

const fields = ['assetId', 'assetType', 'title', 'picWidth', 'creditLine',
					'description', 'coverageOssid', 'ossId',
					'picHeight', 'picSize', 'oss800', 'oss400', 'keywords', 'location'];
const filterAsset = (rawAsset) => {
    let formatAsset = Object.assign(rawAsset.detail, rawAsset.basic);
    let filter = {};
    for (let key in formatAsset) { //foreach asset object
        if (fields.includes(key)) filter[key] = formatAsset[key];
    }
    if (Object.keys(filter).length > 0) return filter;
    return null;
}

//开放给第三方的用户的接口列表
//这些默认接口接受oauth2　认证保护

// auth　接口的认证方式
// rename 重命名接口
// fields 只返回给客户端fields中指定返回的字段
// hiddenParameters 对于客户端隐藏的参数
let publicAPICfg = {
		'GET:/message/sendsms':{
			auth: 'oauth2',
		},
		'GET:/message/check':{
			auth: 'oauth2',
		},
		'GET:/damSearcher/searchDam':{
			auth: 'oauth2',
		},
		'GET:/damSearcher/searchDamFolder':{
			auth: 'oauth2',
		},
		'GET:/folders':{
			auth: 'oauth2',
		},
		'POST:/folders/{id}/sub_folders': {
			auth: 'oauth2',
		},
		'GET:/folderitems/v2/{folderId}':{
			auth: 'oauth2',
			// rename: '/folderitems/{folderId}',
			hiddenParameters: ['folderId2', 'provider'],
				fields: (q) => {
					return q.then( data => {
						data = JSON.parse(data.toString('utf8'));
						const filter = data.list.map(asset => filterAsset(asset));
						data.list = filter;
						return data;
					});
				}
		},
		'POST:/favorite/create':{
			auth: 'oauth2',
			hiddenParameters: ['user_id'],
			rename: '/favorites',
		},
		'GET:/favorite/pageList':{
			auth: 'oauth2',
			rename: '/favorites',
			hiddenParameters: ['user_id'],
			fields: (data) => {
				const filter = data.list.map(asset => filterAsset(asset));
				data.list = filter;
				return data;
			}
		},
		'DELETE:/favorite/delete':{
			hiddenParameters: ['user_id'],
			auth: 'oauth2',
			rename: '/favorites',
		},
		'POST:/images/batchdownloadurl':{
			auth: 'oauth2',
			rename: '/assets/downloadurl'
		},
		'POST:/oauth2/access_token':{
			auth: null,
		},
		'POST:/oauth2/refresh_token':{
			auth: null,
		},
		'POST:/user':{
			auth: 'oauth2',
		},
		'POST:/uploadHandler/batchUpload':{
			auth: 'oauth2',
			rename: '/assets/upload',
			hiddenParameters: ['userId'],
		},
		'GET:/workgorups': {
			auth: 'oauth2',
		},
		'POST:/users':{
			auth: 'oauth2',
		},
		'POST:/userFolderPermissionList': {
			auth: 'oauth2',
		},
		'POST:/assets/download': {
			rename: '/assets/downloadurl',
			auth: 'oauth2',
			hiddenParameters: ['userId'],
		},
		'POST:/download/verify': {
			auth: 'oauth2',
		},
		'GET:/workgroups': {
			auth: 'oauth2',
			fields: (groups) => {
				const fields = ['id', 'name', 'invitationCode', 'remark', 'tags'];
				return groups.map(group => {
					let filter = {};
					for (let key of fields) { //foreach asset object
						if (group[key]) filter[key] = group[key];
					}
					return filter;
				});
			}
		},
		'GET:/assets/{id}': {
				auth: 'oauth2',
		},
		'GET:/assets/batch': {
				auth: 'oauth2',
		},
		'GET:/search': {
				auth: 'oauth2',
		},
		// 'GET:/user/{id}': {
		// 		auth: 'oauth2',
		// 		fields: (user) => {
		// 			return user;
		// 		}
		// },
		'GET:/profile': {
				auth: 'oauth2',
		},

		'GET:/download/proxy/{file}':{
		}
};

const parseConfig = () =>{
	apiLogger.debug('Format Public API Config');
	Object.keys(publicAPICfg).map( publicAPI => {
		// apiLogger.debug('Each API Config', publicAPI);
    const [method, path] = publicAPI.split(":");
    let item = {
        method,
        path,
    };
		let configItem = publicAPICfg[publicAPI];
		if (configItem.rename)
			parseRenameField(method, configItem.rename, path);
		if (configItem.fields)
			parseFieldsField(method, configItem.rename, path, configItem.fields);
    publicAPICfg[publicAPI] = Object.assign(item, configItem);
	});
	// apiLogger.debug('After Format Public API Config', publicAPICfg);
	return publicAPICfg;
}

const parseRenameField = (method, renamePath, rawPath) => {
	const path = renamePath || rawPath;
	const API = method.toUpperCase() + ':' + path;
	const rawAPI = method.toUpperCase() + ':' + rawPath;
	proxyDecoratorStack[API] = proxyDecoratorStack[API] || {};
	let decorator = (req) => {
		let path = rawPath;
		if (proxyDecoratorStack[rawAPI]) {
			const rawReqDecorator = proxyDecoratorStack[rawAPI].reqDecorator;
			const rawRespDecorator = proxyDecoratorStack[rawAPI].rawRespDecorator;
			if (rawReqDecorator && rawReqDecorator.pos === 'path') {
					const path1 = proxyDecoratorStack[rawAPI].reqDecorator(req);
					path = path1.replace(renamePath, rawPath);
			}
			if (rawRespDecorator)
				proxyDecoratorStack[API].respDecorator = rawRespDecorator;
		}
		return path;
	}
	decorator.pos = 'path';
	proxyDecoratorStack[API].reqDecorator = decorator;
}

const parseFieldsField = (method, renamePath, rawPath, fields) => {
	const path = renamePath || rawPath;
	const API = method.toUpperCase() + ':' + path;
	apiLogger.debug('parseField', API);

	proxyDecoratorStack[API] = proxyDecoratorStack[API] || {};
	const rawRespDecorator = proxyDecoratorStack[API].respDecorator;
	proxyDecoratorStack[API].respDecorator = (proxyRes, proxyResData, req) => {
		// apiLogger.debug('rawData', proxyRes);
		let data = rawRespDecorator? rawRespDecorator(proxyRes, proxyResData, req):
		JSON.parse(proxyResData.toString('utf8'));
		if (req.from === 'PUBLIC_API' && fields) {
			if (typeof fields === 'function') return fields(data); //Data or Promise Object.
		}
		return data;
	};
}

const publicAPIConfig = parseConfig();

export default proxyDecoratorStack;
export {
	allNoNeedLogin as noNeedLogin,
	allNoNeedProxy as noNeedProxy,
	publicAPIConfig,
};
