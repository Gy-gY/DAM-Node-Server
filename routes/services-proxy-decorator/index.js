import proxyDecoratorStack, { noNeedLogin, noNeedProxy } from './config';
import httpProxy from 'express-http-proxy';
import ensureLogin from '../../middlewares/authentication';
import proxyReject  from '../../middlewares/proxyReject';
import { apiLogger } from '../../lib/log';
export * from './config';

// var filters = function (method) {
//     return function (req, res) {
//         return req.method == method;
//     };
// };


function proxyDecorator(apiUri, method, host) {

    var opt = {
        limit: '512mb',
        reqBodyEncoding: null,
        //parseReqBody: true // default value is true already
		// filter:filters[method]
    };

    let before = [];

    let path = method.toUpperCase() + ':' + apiUri;
    if(noNeedProxy.indexOf(path)>=0){
        before.push(proxyReject);
    }
    if (noNeedLogin.indexOf(path) <= -1) {
        before.push(ensureLogin);
    }

	//没有任何 decorator, 直接附加 ensureLogin 和proxy 逻辑
    if (!proxyDecoratorStack[path]) {
        let arr0 = [...before, httpProxy(host, opt)].filter(i => i != null);
        arr0.forEach(i => apiLogger.verbose(i.name));
        return arr0;
    }

    let decorators = proxyDecoratorStack[path];
    decorators.before = decorators.before || [];
    decorators.before = [...before, ...(decorators.before)];

    if(decorators.parseReqBody===false){
        opt.parseReqBody=false;
    }

	// req decorators
    if (decorators.reqDecorator) {
        if (decorators.reqDecorator['pos'] == 'body') {
            opt.proxyReqBodyDecorator = decorators.reqDecorator;
        }

        if (decorators.reqDecorator['pos'] == 'path') {
            opt.proxyReqPathResolver = decorators.reqDecorator;
        }
    }

	//resp decorators
    if (decorators.respDecorator) {
        opt.userResDecorator = decorators.respDecorator;
    }

    let proxy = httpProxy(host, opt);

    let arr = [...(decorators.before), proxy].filter(i => i != null);
    arr.forEach(i => apiLogger.verbose(i.name));
    return arr;
}


export { proxyDecorator };