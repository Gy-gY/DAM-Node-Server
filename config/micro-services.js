// 对后端微服务接口的代理配置
 const services = {
     passport:  'http://192.168.0.203:8081',
     resource:  'http://192.168.0.203:8082',
     VCGpassport: 'http://dev.passportservice.vcg.com',
 };
// 搜索服务地址
 const search = 'http://192.168.2.80:9200';
 const searchDam = 'http://192.168.0.203:8082';
// 后端微服务swagger-ui代理
 const microServices = {
     passportService:  services.passport + '/swagger-ui.html',
     resourceService:  services.resource + '/swagger-ui.html',
 };


 const services_test = {
     passport:  'http://192.168.0.204:8083',
     resource:  'http://192.168.0.204:8084',
     VCGpassport: 'http://192.168.0.203:6009',
 };
// 搜索服务地址
 const search_test = 'http://192.168.2.80:9200';
 const searchDam_test = 'http://192.168.0.204:8084';
// 后端微服务swagger-ui代理
 const microServices_test = {
     passportService:  services_test.passport + '/swagger-ui.html',
     resourceService:  services_test.resource + '/swagger-ui.html',
 };

 const services_pro = {
     passport:  'http://dam-passport.vcg.com',
     resource:  'http://dam-resource.vcg.com',
 };
// 搜索服务地址
 const search_pro = 'http://192.168.2.80:9200';
 const searchDam_pro = 'http://dam-resource.vcg.com';
// 后端微服务swagger-ui代理
 const microServices_pro = {
     passportService:  services_pro.passport + '/swagger-ui.html',
     resourceService:  services_pro.resource + '/swagger-ui.html',
 };
 if(process.env.NODE_ENV === 'test') {
     module.exports = {services:services_test, search:search_test, microServices:microServices_test, searchDam:searchDam_test};
 } else if(process.env.NODE_ENV === 'development'){
     module.exports = {services, search, microServices, searchDam};
 } else {
     module.exports = {services:services_pro, search:search_pro, microServices:microServices_pro, searchDam:searchDam_pro}; 
 }
