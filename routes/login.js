var express = require('express');
var crypto = require('crypto');
var router = express.Router();
import fetch from 'isomorphic-fetch';
import redisClient from '../utils/redisClient';

import { generateCaptcha } from '../middlewares/maliciousDetection';
import { initUser,  initUserSession} from '../lib/user.js';
import tokenStore from '../utils/tokenStore';
import { UsercontrollerApiFp } from '../api/passportApi';
import { services } from '../config/micro-services';

import bodyParser from 'body-parser';
import { serverLogger } from '../lib/log';
import util from 'util';

let base = [
    bodyParser.json(),
    bodyParser.urlencoded({ extended: false })
];

router.get('/captcha', base, generateCaptcha);

function setAPIAccount(userId) {
    return new Promise(resolve => {
        fetch(`${services.passport}/vcg/vcgOAuth2Info?uid=${userId}`, {
            credentials: 'include',
            method: 'GET',
            headers: {
                'Accept': 'application/json',
            },
        }).then(response => {
            response.json()
    .then(data => {
        console.log('envType:');
        console.log(data.data);
        console.log(data.data.envType);
        
        let aipUrl = data.data.envType == 1 ? 'http://api-v1.vcg.com' : 'http://api.demo.vcg.com';
        let obj = {
            clientId: data.data.clientId,
            clientSecret: data.data.clientSecret,
            user: data.data.username,
            password: data.data.password,
            grantType: data.data.grantType,
            aipUrl,
        };
        redisClient.set(`damApiAcount${userId}`,JSON.stringify(obj));   
        resolve(true);
    });
        });
    });
}
router.post('/login', base, (req, res) => {
    //We auth User by different ways;
    const {username, password} = req.body;
    if (!username || !password)
        return res.status(400).json({ message: 'parameters missing' });
    serverLogger.info('user ' + req.body.username + ' posting to login to backend');

    const authType = 'session'; //Token
    const params = req.body;
    UsercontrollerApiFp.userLoginPost({ user: { userName: username, password: password } })(undefined, services.passport)
    .then((loginInfo) => {
        serverLogger.info('user ' + loginInfo.userId + ' login success..');
        getLoginInfo(req, res, authType, loginInfo ,params);
    }).catch((err) => {
        err.json().then((data) => {
            serverLogger.info('api error' + util.inspect(data));
            res.status(data.status).json(data).end();
        });
    });
  
});
const getLoginInfo = (req, res, authType, loginInfo ,params) => {
    if (authType == 'session') {
        const remember_me = params.remember;
        initUserSession(loginInfo.userId, req.session)
        .then(() => {
            if (remember_me) {
                setRememberToken(req, res);
            } else {
                clearRememberToken(req, res);
            }
            serverLogger.info(req.session.user);
            setAPIAccount(loginInfo.userId)
            .then(ok=>{
                res.json(req.session.user).end();
            });
        });
    } else if (authType == 'token') {
        const token = setToken(req, res, loginInfo.userId);
        initUser(loginInfo.userId)
        .then(user => {
            user.token = token;
            res.json(user).end();
        });
    }
};
const setToken = (req, res, userId) => {
    let key = req.sessionID + '-DAMServer-' + Date.now();
    let md5 = crypto.createHash('md5');
    md5.update(key);
    let token = md5.digest('hex').toString();
    serverLogger.info('generate access token ' + token);
    tokenStore.saveToken(userId, token);
    return token;
};


const setRememberToken = (req, res) => {
    let key = req.sessionID + '-DAMServer-' + Date.now();
    let md5 = crypto.createHash('md5');
    md5.update(key);
    let rember_token = md5.digest('hex').toString();
    serverLogger.info('generate remember token is ' + rember_token);
    tokenStore.saveToken(req.session.user.userId, rember_token);
    req.session.remember_token = rember_token;
    res.cookie('ua_session_token', req.session.remember_token,
        { httpOnly: true, domain: 'dam.vcg.com',
            expires: new Date(Date.now() + tokenStore.TOKEN_EXPIRE_TIME) });
};

const clearRememberToken = (req, res) => {
    tokenStore.clearToken(req.cookies['ua_session_token']);
    res.clearCookie('ua_session_token', { domain: 'dam.vcg.com' });
};

router.post('/logout', base, (req, res) => {
    tokenStore.clearToken(req.cookies['ua_session_token']);
    delete req.session.user;
    res.clearCookie('ua_session_token', { domain: 'dam.vcg.com' });
    return res.end();
});

module.exports = router;
