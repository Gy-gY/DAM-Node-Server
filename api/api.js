/**
 * 修改自动生成的 api 暴漏的 fp 方法，当服务端调用异常时，输出日志
 * 
 */

import { apiLogger } from '../lib/log'
var oriResourceApi = require('./resourceApi.js');
var oriPassportApi = require('./passportApi.js');
import { services } from '../config/micro-services';
var util = require('util');


// 对某个 fp 进行 包装
function APIWrapper(fp) {
  let proxyFp={};

  for (let fName of Object.keys(fp)) {
    let logger = apiLogger.new("[ " + fName + " ] ");
    

    //修改fp 中的某个方法
    proxyFp[fName] = function (params) {

      return function (fetch, service) {

        //对原有的方法附加日志输出
        return fp[fName](params)(undefined, service).catch(err => {
          //按照原有方法的返回，返回promise对象
          return err.json().then(msg => {
            logger.error(" invoking " + service + " api error :" + util.inspect(msg));
            return Promise.reject(msg);
          });

        });

      }
    };
  };
  return proxyFp;
}

let newResourceApiFp={};

for(let fpKey of Object.keys(oriResourceApi).filter(i=>i.endsWith('Fp'))){
  newResourceApiFp[fpKey]=APIWrapper(oriResourceApi[fpKey]);
}

let newPassportApiFp={};

for(let fpKey of Object.keys(oriPassportApi).filter(i=>i.endsWith('Fp'))){
  newPassportApiFp[fpKey]=APIWrapper(oriPassportApi[fpKey]);
}

export {
  newResourceApiFp as resourceApi,
  newPassportApiFp as passportApi
}