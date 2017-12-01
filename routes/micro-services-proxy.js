import fetch from 'isomorphic-fetch';
import express from 'express';
let router = express.Router();
import {
    services
} from '../config/micro-services';
import {
    proxyDecorator,
    publicAPIConfig,
} from './services-proxy-decorator';
import {
    apiLogger
} from '../lib/log';
import httpProxy from 'express-http-proxy';

// 对后端微服务的动态代理
// 解析微服务的接口文档，生成动态路由
let logger = apiLogger.new();

//判断是否需要为一些接口的rename扩展路由
const renamePath = (method, api) => {
    const key = method.toUpperCase() + ':' + api;
    if(publicAPIConfig[key] && publicAPIConfig[key].rename){
        apiLogger.debug('find path to rename', publicAPIConfig[key].rename);
        return publicAPIConfig[key].rename;
    }

    return null;
};

logger.log('info', '==============Start Setting Up Proxy For Micro Services================');
Object.keys(services).map((service) => {
    let apiDocUrl = services[service] + '/v2/api-docs';
    fetch(apiDocUrl).then((res) => {
        if (res.status == 200) {
            return res.json();
        }
    }).then((apiJson) => {
        let apis = Object.keys(apiJson.paths);
        apis.map((_api) => {
            let api = _api.replace(/{(\w+)}/, ':$1'); //Jave API /folders/{id} but nodejs /folders/:id
            let methods = Object.keys(apiJson.paths[_api]);
            methods.forEach((method) => {
                router[method](api, proxyDecorator(_api, method, apiJson.host));
                const rename = renamePath(method, api);
                if (rename) {
                    router[method](rename, proxyDecorator(rename.replace(/{(\w+)}/, ':$1'), method, apiJson.host));
                    apiLogger.log('info', 'Proxy Rename API %s To %s', method.toUpperCase() + ':' + rename, apiJson.host);
                }
                apiLogger.log('info', 'Proxy %s To %s', method.toUpperCase() + ':' + api, apiJson.host);
            });
        });
    }).catch((err) => {
        apiLogger.log('error', 'Loading Remote api %s error. Try it later', service);
        apiLogger.log('error', err);
        //process.exit(1);
    });
});
export default router;
