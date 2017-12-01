import express from 'express';
import { microServices, nodeServices, services } from '../config/micro-services';
import httpProxy from 'express-http-proxy';
import fetch from 'isomorphic-fetch';
import fs from 'fs';
import YAML from 'yamljs';
import { noNeedProxy, publicAPIConfig } from './services-proxy-decorator';

import { apiLogger } from '../lib/log';

const publicList = Object.keys(publicAPIConfig);

let router = express.Router();

//过滤掉黑名单API后的API,Publish 给我们自己的系统
const whiteAPI = (APIBlackList, APIDocs) => {

    //过滤不需要发布的API
    const apis = APIDocs.paths;
    let filterApis = {};

    Object.keys(apis).map((url) => {
        let methods = Object.keys(apis[url]);
        methods.forEach((method) => {
            const blackKey = method.toUpperCase() + ':' + url;
            // console.log('Black Key', blackKey);
            if (!APIBlackList.includes(blackKey)) {
                filterApis[url] = filterApis[url] || {};
                filterApis[url][method] = apis[url][method];
            }
        });
    });
    APIDocs.paths = filterApis
    return APIDocs; //paths
}

const publicAPI = (publicAPIConfig, APIDocs) => {
    const apis = APIDocs.paths;
    let filterApis = {};
    const oauthHeader = [{
        name: 'Client-Id',
        in: 'header',
        description: '用户鉴权client id',
        required: true,
        type: 'string',
    }, {
        name: 'Authorization',
        in: 'header',
        description: 'Bearer+空格+access token值',
        required: true,
        type: 'string',
    }];

    Object.keys(apis).map((url) => {
        let methods = Object.keys(apis[url]);
        methods.forEach((method) => {
            const publicKey = method.toUpperCase() + ':' + url;
            if (publicList.includes(publicKey)) {
                apiLogger.debug('Find Public API', publicKey);
                filterApis[url] = filterApis[url] || {};
                filterApis[url][method] = apis[url][method];
                // apiLogger.debug('AAAAAAAAAAAAAAAAAAAAA', publicAPIConfig);
                if (publicAPIConfig[publicKey].auth === 'oauth2') //Set Oauth header.
                    filterApis[url][method].parameters = filterApis[url][method].parameters ? 
                        filterApis[url][method].parameters.concat(oauthHeader): oauthHeader;
            }
        });
    });
    APIDocs.paths = filterApis;
    return APIDocs; //paths
}

const renameAPI = (APIDocs, publicAPIConfig) => {
    for (let key in publicList) {
        const api = publicList[key];
        let apiConfig = publicAPIConfig[api];
        // apiLogger.debug('Each API config', apiConfig);
        
        if (apiConfig && apiConfig.rename && APIDocs.paths[apiConfig.path] 
            && APIDocs.paths[apiConfig.path][apiConfig.method.toLowerCase()]) {
            const method = apiConfig.method.toLowerCase();
            APIDocs.paths[apiConfig.rename] = APIDocs.paths[apiConfig.rename] || {};
            // apiLogger.debug('Before Rename', APIDocs.paths[apiConfig.path][method]);
            APIDocs.paths[apiConfig.rename][method] = APIDocs.paths[apiConfig.path][method];
            delete APIDocs.paths[apiConfig.path][method];
            // apiLogger.debug('After Rename', APIDocs.paths[apiConfig.rename][method]);
        }
    }
    return APIDocs;
}

const hiddenParametersAPI = (APIDocs, publicAPIConfig) => {
    for (let key in publicAPIConfig) {
        const apiConfig = publicAPIConfig[key];
        if (apiConfig.hiddenParameters && APIDocs.paths[apiConfig.path]) {
            let apiDocs = APIDocs.paths[apiConfig.path][apiConfig.method.toLowerCase()];
            // apiLogger.debug('Find Hidden Param API ====================', apiDocs.parameters, apiConfig.path, apiConfig.method);
            let newParams = [];
            apiDocs.parameters.map(param => {
                if (!apiConfig.hiddenParameters.includes(param.name))
                    // apiLogger.debug('each Param aaaaaaaaaaaaaaaaaaaaaaaaaaaaa', param.name)
                    newParams.push(param);
            });
            apiDocs.parameters = newParams;
            // apiLogger.debug('each Param aaaaaaaaaaaaaaaaaaaaaaaaaaaaa', apiDocs)
        }
    }
    return APIDocs;
}

// TODO 1 把所有的API整理到一个swaggerJson 对象中
// 整理的逻辑是： 同名API node-docs 覆盖　micro-services
Object.keys(services).forEach(service => {
    router.get('/' + service + '-docs', (req, res) => {
        fetch(services[service] + '/v2/api-docs')
            .then(body => body.json())
            .then(json => {
                console.log(json.paths);
                res.json(json).end();
            })
    });
});

//从不同的文档收集API对象，并按照一定规则合并
const collectAPI = () => {
    //从 config/damAPI中收集，这个API是我们对后端微服务接口的再封装转换
    const str = fs.readFileSync(__dirname + '/../config/damApi.yaml', 'utf-8');
    let nodeAPIjson = YAML.parse(str);
    
    // 从各个微服务收集最新的接口
    const promises = Object.keys(services).map(service => {
        return fetch(services[service] + '/v2/api-docs')
            .then(body => body.json());
    });

    return Promise.all(promises)
        .then(jsons => {
            jsons.map(json => {
                // console.log(json.definitions, nodeAPIjson.definitions);
                nodeAPIjson.tags = nodeAPIjson.tags.concat(json.tags);
                nodeAPIjson.paths = Object.assign(json.paths, nodeAPIjson.paths);
                nodeAPIjson.definitions = Object.assign(json.definitions, nodeAPIjson.definitions);
            });
            return nodeAPIjson;
        });
}


router.get('/node-docs', (req, res) => {
    collectAPI()
        .then(nodeAPIjson => {
            res.json(whiteAPI(noNeedProxy, nodeAPIjson)).end();
        }).catch(err => {
            console.error(err);
            res.status(500).end();
        });
});

router.get('/public-docs', (req, res) =>{
    collectAPI()
        .then(nodeAPIjson => {
            const white = whiteAPI(noNeedProxy, nodeAPIjson);
            let APIDocs = publicAPI(publicAPIConfig, white);
            APIDocs = hiddenParametersAPI(APIDocs, publicAPIConfig);
            APIDocs = renameAPI(APIDocs, publicAPIConfig);
            APIDocs.basePath = '/v1';
            res.json(APIDocs).end();
        }).catch(err => {
            console.error(err);
            res.status(500).end();
        });
});
module.exports = router;