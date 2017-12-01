import {services, searchDam} from './micro-services';
let configStore= {
    host: '192.168.0.204',
    port: '6379',
    db: 1,
    //password: 'vcgjava',
    logErrors: true
};
let Config = {
    sessionStore: configStore,
    tokenStore: configStore, //Now the same
    services : {
        passport: services.passport,
        resource: services.resource,
        searchDam: searchDam,
        //VCGpassport: 'dev.passportservice.vcg.com',//192.168.0.203绑定host
    },
    // 搜索服务地址
    search : 'http://192.168.2.80:9200',
    mysql: {
        host: '192.168.0.160',
        port: '3306',
        database: 'dam_api',
        username: 'javaapp',
        password: 'javaapp@123',
    },
    log:{
        meta:false
    },
    client: {
        allowDomain: '.dam.vcg.com', //允许设置cookie的域
        origin: 'http://dam.vcg.com:8088', //为了实现客户端跨域访问， 配置客户端的完整Origin
    },

    redis: { //跟redis有关的配置
        DOWNLOAD_PREFIX: 'downloadurl:', //下载链接前缀
        DOWNLOAD_EXPIRE: 10 * 60, //下载链接过期时间(秒)
    },
};

let ConfigTest = {
    sessionStore: configStore,
    tokenStore: configStore, //Now the same
    services : {
        passport: services.passport,
        resource: services.resource,
        searchDam: searchDam,
        //VCGpassport: 'dev.passportservice.vcg.com',//192.168.0.203绑定host
    },
    // 搜索服务地址
    search : 'http://192.168.2.80:9200',
    mysql: {
        host: '192.168.0.160',
        port: '3306',
        database: 'dam_api',
        username: 'javaapp',
        password: 'javaapp@123',
    },
    log:{
        meta:false
    },

    client: {
        allowDomain: '.dam.vcg.com', //允许设置cookie的域
        origin: 'http://dam.vcg.com:8088', //为了实现客户端跨域访问， 配置客户端的完整Origin
    },

    redis: { //跟redis有关的配置
        DOWNLOAD_PREFIX: 'downloadurl:', //下载链接前缀
        DOWNLOAD_EXPIRE: 10 * 60, //下载链接过期时间(秒)
    },
};
const sessionPro = {
    host: 'r-2zed616d434c2bd4.redis.rds.aliyuncs.com',
    port: '6379',
    db: 1,
    password: 'Photo123456',
    logErrors: true
};

let ConfigPro = {
    sessionStore: sessionPro,
    tokenStore: sessionPro, //Now the same
    services : {
        passport: services.passport,
        resource: services.resource,
        searchDam: searchDam,
        //VCGpassport: 'dev.passportservice.vcg.com',//192.168.0.203绑定host
    },
    // 搜索服务地址
    search : 'http://192.168.2.80:9200',
    mysql: {
        host: 'rm-2zern29k51653xjef.mysql.rds.aliyuncs.com',
        port: '3306',
        database: 'dam_api2',
        username: 'dam_product',
        password: '0A7TJbGwR0v',
    },
    log:{
        meta:false
    },

    client: {
        allowDomain: '.dam.vcg.com', //允许设置cookie的域
        origin: 'http://dam.vcg.com:8088', //为了实现客户端跨域访问， 配置客户端的完整Origin
    },

    redis: { //跟redis有关的配置
        DOWNLOAD_PREFIX: 'downloadurl:', //下载链接前缀
        DOWNLOAD_EXPIRE: 10 * 60, //下载链接过期时间(秒)
    },
};
if(process.env.NODE_ENV === 'test') {
    module.exports = ConfigTest;
}else if(process.env.NODE_ENV === 'development') {
    module.exports = Config;
}else {
    module.exports = ConfigPro;
}

