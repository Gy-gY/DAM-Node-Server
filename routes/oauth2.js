import express from 'express';
import oauth2orize from 'oauth2orize';
import passport from 'passport';
import { Strategy as ClientPasswordStrategy } from 'passport-oauth2-client-password';
import { BasicStrategy } from 'passport-http';
import uuid from 'uuid';
import { UsercontrollerApiFp } from '../api/passportApi';
import { services } from '../config/micro-services';
import oauthStore from '../utils/oauthStore';
import publicApis from '../public-api-services/publicApis';
import { serverLogger } from '../lib/log';
import search from './search';

let router = express.Router();
const server = oauth2orize.createServer();

passport.use(new BasicStrategy({ passReqToCallback: true },
    (req, clientId, clientSecret, done) => {
        // We use authentication header to carry client_id, client_sercret.
        // Auth client
        serverLogger.info('Basic AUTH Params', clientId, clientSecret);
        req.models.OAuthClient.find({ clientId: clientId }, (err, clients) => {
            if (err) return done(oauth2orize.OAuth2Error());
            if (clients.length == 0 || clients[0].clientSecret != clientSecret)
                return done(oauth2orize.TokenError('invalid_client'), null);
            return done(null, clients[0]);
        });
    }));

passport.use(new ClientPasswordStrategy({ passReqToCallback: true },
    function (req, clientId, clientSecret, done) {
        // serverLogger.info(req, clientId, clientSecret, '======================');
        // return done(null, {clientId: 1, clientSecret: 1});
        // req.models.OAuthClient.findOne({ clientId: clientId }, function (err, client) {
        //   if (err) { return done(err); }
        //   if (!client) { return done(null, false); }
        //   if (client.clientSecret != clientSecret) { return done(null, false); }
        //   return done(null, client);
        // });
    }
));

server.exchange(oauth2orize.exchange.refreshToken((client, refreshToken, done) => {
    serverLogger.info('refresh token', client, refreshToken);
    oauthStore.getUserIdByToken(refreshToken, client.clientId, 'refresh_token')
        .then((uid) => {
            serverLogger.info(uid);
            if (!uid) return done(oauth2orize.TokenError('unauthorized_client'));
            const accessToken = uuid.v4();
            oauthStore.saveAccessToken(uid, accessToken, client.clientId);
            done(null, accessToken, refreshToken, { expires_in: oauthStore.ACCESS_TOKEN_EXPIRE_TIME });
        });
}));

// Not very safe. Should not pass refreshToken to client.
server.exchange(oauth2orize.exchange.password((client, username, password, scope, done) => {
    // serverLogger.info('passport oauth ', client, username, password, scope);
    UsercontrollerApiFp.userLoginPost({ user: { userName: username, password: password } })(undefined, services.passport)
        .then((loginInfo) => {
            const accessToken = uuid.v4();
            const refreshToken = uuid.v4();
            oauthStore.saveAccessToken(loginInfo.userId, accessToken, client.clientId);
            oauthStore.saveRefreshToken(loginInfo.userId, refreshToken, client.clientId);
            done(null, accessToken, refreshToken,
                {
                    expires_in: oauthStore.ACCESS_TOKEN_EXPIRE_TIME,
                    refresh_token_expire_in: oauthStore.REFRESH_TOKEN_EXPIRE_TIME
                });
        }).catch((err) => {
            serverLogger.error('user login error', err);
            done(oauth2orize.AuthorizationError('unauthorized_client'), null);
        });
}));

// access token
// We need username. password, client_id, client_secret to get access token.
router.post('/oauth2/access_token', 
    passport.authenticate(['basic', 'oauth2-client-password'], { session: false }),
    (req, res, next) => {
        // serverLogger.info('access_token ..................', req.body);
        res.setHeader('Cache-control', 'no-cache'); //Do Not Allow broswer to catche basic AUTH info
        res.setHeader('Pragma', 'Pragma');
        next();
    },
    server.token(),
    server.errorHandler()
);

router.post('/oauth2/refresh_token', 
    passport.authenticate(['basic', 'oauth2-client-password'], { session: false }),
    (req, res, next) => {
        res.setHeader('Cache-control', 'no-cache'); //Do Not Allow broswer to catche basic AUTH info
        res.setHeader('Pragma', 'Pragma');
        next();
    },
    server.token(),
    server.errorHandler()
);
router.use(publicApis);
router.use(search);
export default router;