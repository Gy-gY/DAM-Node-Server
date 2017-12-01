// access_token and client_id should be in header or body
import oauthStore from '../utils/oauthStore';
import { serverLogger, apiLogger } from '../lib/log';
import { services } from '../config/micro-services';
import { FoldersApiFp } from '../api/passportApi';
import { initUser } from '../lib/user';

export default (req, res, next) => {
    if (process.env.NODE_ENV === 'development'||process.env.NODE_ENV === 'test') { //Skip check login 
        //req.user = {userId: 'a9c01ef4a422492e26c1b0612d3367510'};
        //return next();
    }
    const authorization = req.headers.authorization;
    const clientId = req.headers['client-id'];
    apiLogger.debug('Oauth2 ticket:', req.headers);
    if (!authorization || !clientId) return res.status(403).json({ error: 'missing authorization or client ID in header' });
    const accessToken = authorization.split(' ')[1];
    if (!accessToken) return res.status(403).json({ error: 'missing access Token' });
    // serverLogger.verbose('OAUTH AUTH==>', 'accessToken:', accessToken, 'clientId', clientId);
    oauthStore.getUserIdByToken(accessToken, clientId, 'access_token')
        .then((uid) => {
            // serverLogger.verbose('find User', 'uid:');
            if (uid)
                return initUser(uid);
            else   
                return res.status(401).json();
        }).then(user => {
            req.userId = user.userId;
            req.user = user;
            next();
        }).catch((err) => {
            serverLogger.error(err);
            return res.status(500).json();
        });
};
