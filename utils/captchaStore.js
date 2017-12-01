import redisClient from './redisClient';
import {serverLogger} from '../lib/log';
//对于页面上的记住我功能,需要长时间存储token
const TOKEN_EXPIRE_TIME = 60;
const token_prefix = 'captcha:';
let captchaStore = {
    TOKEN_EXPIRE_TIME: TOKEN_EXPIRE_TIME,
    saveToken(sessionId, captchaText) {
        serverLogger.info('set', sessionId);
        this.clearToken(sessionId); //Clear first 
        return redisClient.setex(token_prefix + sessionId, TOKEN_EXPIRE_TIME, captchaText);
    },

    clearToken(sessionId) {
        serverLogger.info('del', sessionId);
        return redisClient.del(token_prefix + sessionId);
    },

    verifyToken(sessionId, captchaText, callback) {
        redisClient.get(token_prefix + sessionId, (err, text) =>{
            serverLogger.info(err, text, captchaText);
            if (!text || text !== captchaText) return callback(err, false);
            return callback(err, true);
        }); 
    },
};

export default captchaStore;