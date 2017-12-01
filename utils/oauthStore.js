import redisClient from './redisClient';
import bluebird from 'bluebird';
import {serverLogger} from '../lib/log';

export const ACCESS_TOKEN_EXPIRE_TIME = 10000 * 60 * 60; //1 hour
export const REFRESH_TOKEN_EXPIRE_TIME = 10000 * 60 * 60 * 24 * 7; // 7 days

let oauthStore = {
    REFRESH_TOKEN_EXPIRE_TIME: REFRESH_TOKEN_EXPIRE_TIME,
    ACCESS_TOKEN_EXPIRE_TIME: ACCESS_TOKEN_EXPIRE_TIME,

    saveAccessToken(uid, accesstoken, clientId) {
        const key1 = `OAUTH_ACCESS_TOKEN:${accesstoken}_${clientId}`; //access token
        const key2 = `OAUTH_ACCESS_TOKEN:${uid}_${clientId}`;
    // before we create a new access key, we first clear the old access key for user, client
        oauthStore.getValue(key2).then((oldAccessKey)=>{
            if (oldAccessKey) return oauthStore.delKey(oldAccessKey);
            return true;
        }).then((v) => {
      // save new accessToken 
            redisClient.setex(key1, ACCESS_TOKEN_EXPIRE_TIME, uid);
      // update new Index
            return redisClient.setex(key2, ACCESS_TOKEN_EXPIRE_TIME, key1);
        });
    },

    saveRefreshToken(uid, refreshToken, clientId) {
        const key1 = `OAUTH_REFRESH_TOKEN:${refreshToken}_${clientId}`; //access token
        const key2 = `OAUTH_REFRESH_TOKEN:${uid}_${clientId}`;
    // before we create a new access key, we first clear the old access key for user, client
        oauthStore.getValue(key2).then((oldRefreshKey)=>{
            if (oldRefreshKey) return oauthStore.delKey(oldRefreshKey);
            return true;
        }).then((v) => {
      // save new refreshToken 
            redisClient.setex(key1, REFRESH_TOKEN_EXPIRE_TIME, uid);
      // update new Index
            return redisClient.setex(key2, REFRESH_TOKEN_EXPIRE_TIME, key1);
        });
    },

    getUserIdByToken(token, clientId, type) {
        const key = `${token}_${clientId}`;
        serverLogger.info('OAUTH_ACCESS_TOKEN:' + key);
        if (type == 'access_token')
            return bluebird.promisify(redisClient.get,{context: redisClient})('OAUTH_ACCESS_TOKEN:' + key);
        if (type == 'refresh_token')
            return bluebird.promisify(redisClient.get,{context: redisClient})('OAUTH_REFRESH_TOKEN:' + key);
        return null;
    },

    delKey(key) {
        return bluebird.promisify(redisClient.del,{context: redisClient})(key);
    },

    getValue(key) {
        return bluebird.promisify(redisClient.get,{context: redisClient})(key);
    }
};

export default oauthStore;