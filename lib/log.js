import winston from 'winston';
import path from 'path';
import os from 'os';
import config from '../config';
import sprintf from 'sprintf';

const logDir = path.join(__dirname, '../logs');

function getTimestamp() {
    var d = new Date();
  // var timeStr = "%Y-%m-%d %H:%M:%S.%I";
    var timeStr = sprintf.sprintf('%s-%02d-%02d %02d:%02d:%02d.%03d', d.getFullYear(), d.getMonth() + 1, d.getDate(), d.getHours(), d.getMinutes(), d.getSeconds(), d.getMilliseconds());
    return timeStr;
}

const apiLogger = new (winston.Logger)({
    level: 'debug',
    transports: [
        new (winston.transports.Console)({timestamp: getTimestamp }),
        new (require('winston-daily-rotate-file'))({ dirname: logDir, json: false, timestamp: getTimestamp }),
    ]
});
apiLogger.scope = 'API';

const serverLogger = new (winston.Logger)({
    level: 'verbose',
    transports: [
        new (winston.transports.Console)(),
        new (require('winston-daily-rotate-file'))({ dirname: logDir, json: false, timestamp: getTimestamp }),
    ]
});
serverLogger.scope = 'SERVER';


[apiLogger, serverLogger].forEach(logger => {

    logger.rewriters.push(function (level, msg, meta) {

        if (!config.meta) {
            return meta;
        }

        let defaultMeta = {};

        var data = {
            app: 'DAM-SERVER',
            scope: logger.scope,
            host: os.hostname(),
            version: '1.0.0',
            pid: process.pid,
            timestamp: new Date()
        };

        return Object.assign({}, meta, data, defaultMeta);
    });

});

//new context logger
//如果一个参数, string 认为是 prefix, object 认为是 metaData
//两个参数, 第一个是 prefix, 第二个是 metaData
[apiLogger, serverLogger].forEach(logger => {

    logger.new = function (arg1, arg2) {

        var prefix = '[ ' + logger.scope + ' ] ';
        var data = {};

        if (arguments.length == 0) {
      //do nothing
        }
    //只有一个参数时, 如果是object,认为是metaData,如果是string 认为是 prefix
        if (arguments.length == 1) {
            if (typeof (arg1) === 'object') {
                data = arg1;
            }
            if (typeof (arg1) === 'string') {
                prefix += arg1;
            }
        }
        if (arguments.length == 2) {
            prefix += arg1 + '';
            data = arg2;
        }

        var proxy = {};

        for (var key in logger.levels) {
            proxy[key] = (function (l) {
                return function (msg, meta) {
                    msg = prefix + msg;
                    let newMeta = Object.assign({}, meta, data);
                    if (!newMeta)
                        newMeta = {};
                    logger[l](msg, newMeta);
                };
            })(key);//oh, hate, oh love..
        }

        proxy.log = function (level, msg, meta) {
            if (arguments.length == 1) {
                msg = level;//
                level = 'info';
            }

            proxy[level](msg, meta);
        };

        return proxy;
    };

});

export {
  apiLogger, serverLogger
};