import redisClient from './redisClient';
import bluebird from 'bluebird';
//对于页面上的记住我功能,需要长时间存储token
const TOKEN_EXPIRE_TIME = 10000 * 60 * 60 * 24 * 7;
const token_prefix = 'remember-token:';
let tokenStore = {
    TOKEN_EXPIRE_TIME: TOKEN_EXPIRE_TIME,

    saveToken(uid, token) {
        return redisClient.setex(token_prefix + token, TOKEN_EXPIRE_TIME, uid);
    },

    clearToken(token) {
        return redisClient.del(token_prefix + token);
    },

    verifyToken(token) {
        return redisClient.exists(token_prefix + token);
    },

    getUserIdByToken(token) {
        return bluebird.promisify(redisClient.get,{context: redisClient})(token_prefix + token);
    }
};

export default tokenStore;