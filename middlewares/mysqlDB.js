import orm from 'orm';
import {mysql} from '../config';
import {serverLogger} from '../lib/log';
const mysqlURL = `mysql://${mysql.username}:${mysql.password}@${mysql.host}:${mysql.port}/${mysql.database}`;
serverLogger.info('=========', mysqlURL);
// orm.addAdapter('mysql', {});
export default orm.express(mysqlURL, {
    define: (db, models, next) => {
        models.OAuthClient = db.define('oauthClients', {  
            clientId: { type: 'text', unique: true, required: true }, //授权ID
            clientSecret: { type: 'text', unique: true, required: true }, //授权密码
            oauthUserId: {type: 'number', required: true }, //授权用户ID（OAuthUser数据库主键）
            redirectUri: String 
        }); 

        models.OAuthUser = db.define('oauthUsers', {
            username: {type: 'text', unique: true, required: true}, //授权用户名称
            description: {type: 'text'}, //授权用户描述
        });

    db.sync(function(err) {
      if (err) {
          serverLogger.error(err);
          throw err;
      }
    });
        next();
    } 
});
