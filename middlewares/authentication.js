import tokenStore from '../utils/tokenStore';
// import { UsercontrollerApiFp } from '../api/passportApi';
import { initUserSession } from '../lib/user.js';
import {serverLogger} from '../lib/log';

module.exports = function ensureLogin (req, res, next) {
    if (process.env.NODE_ENV === 'development'||process.env.NODE_ENV === 'test') { //Skip check login 
        //req.user = {userId: 'a9c01ef4a422492e26c1b0612d3367510'};
    }
    // Already login
    if (req.user) {
        serverLogger.info('current user is '+req.user.userId);
        return next();
    }

	// Or Auth by token in cookie
    const token = req.cookies['ua_session_token'] || req.headers.token;

    if (!token) {
        return res.status(401).json({ message: 'Not Authorized' });
    }

    serverLogger.info('verify by token', token);

    const isLogin = tokenStore.verifyToken(token);
    if (!isLogin) {
        serverLogger.info('toke '+ token+' is expired ');
        return res.status(401).json({ message: 'Not Authorized' });
    }

	//auto login
    tokenStore.getUserIdByToken(token)
		.then((uid) => {

    if (!uid) {
        serverLogger.info('invalid token ' + token);
        return Promise.reject('invalid token ');
    }

    serverLogger.info('already login, uid', uid);
    return initUserSession(uid, req.session);

}).then(() => {
    return next();
}).catch(function (err) {
    serverLogger.info('get user id by token ====>');
    serverLogger.info(err);
    res.clearCookie('ua_session_token');
    return res.status(403).json({ message: 'token过期' });
});
};