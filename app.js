import express from 'express';
// import favicon from 'serve-favicon';
import logger from 'morgan';
import cookieParser from 'cookie-parser';
import expressSession from 'express-session';
import compression from 'compression';
import connectRedis from 'connect-redis';
import config from './config';
import proxyRoute from './routes/micro-services-proxy';
import swaggerUI from './routes/swaggerUI';
import login from './routes/login';
import user from './routes/user';
import oauthClient from './routes/oauthClient';
import searchRouter from './routes/search';
import vcgSearch from './routes/vcgSearch';
import userManage from './routes/userManage';
import vcgDownload from './routes/vcgDownload';
import myDownLog from './routes/myDownLog';
import vcgContract from './routes/vcgContract';
import customer from './routes/customer';
import path from 'path';
import oauth2router from './routes/oauth2';
import bodyParserJudger from './middlewares/body-parser-judger';
// import bodyParser from 'body-parser';
import {serverLogger} from './lib/log';

const app = express();
const redisStore = connectRedis(expressSession);

const REACT_APP_PATH = process.env.APP_PATH || path.join(__dirname, 'node_modules', 'dam-web-client');

serverLogger.info('LOADING WEB APP FROM', REACT_APP_PATH);
// view engine setup
// app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

// uncomment after placing your favicon in /public
// app.use(favicon(path.join(__dirname, 'public', 'favicon.ico')));
app.use(logger('dev'));
//compress reponse with gzip
//app.use(compression());

// use redis to store session
app.use(expressSession({
    secret: 'ij324k&^*pi',
    resave: true,
    saveUninitialized: true,
    cookie: {
        maxAge: 1000*60*60*8,
        //domain: config.client.allowDomain,
        secure: false
    }
		,
    store: new redisStore(config.sessionStore)
}));

app.use(express.static('./public'));

////////////////////////////////////////////////////////////////////////////////////
/// PUBLIC API AND AUTH BY OAUTH2
app.use('/v1', bodyParserJudger, function (req, res, next) {
	// Allow Ajax Cross Domain
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'PUT,POST,GET,DELETE,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Content-Length, Authorization, Accept,X-Requested-With, Client-Id');
    if (req.method === 'OPTIONS') return res.end(); //DONOT PROXY OPTION
    req.from='PUBLIC_API';
    next();
}, oauth2router);
////////////////////////////////////////////////////////////////////////////////////


////////////////////////////////////////////////////////////////////////////////////
app.use(function (req, res, next) {
	// Allow Ajax Cross Domain
    res.setHeader('Access-Control-Allow-Credentials', 'true'); //允许跨域设置cookie
    res.setHeader('Access-Control-Allow-Origin', config.client.origin);
    res.setHeader('Access-Control-Allow-Methods', 'PUT,POST,GET,DELETE,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Content-Length, Authorization, Accept,X-Requested-With');

    serverLogger.info('SessionID', req.sessionID, '   ' + req.session.id);
    if (req.method === 'OPTIONS') return res.end(); //DONOT PROXY OPTION
    next();
});
////////////////////////////////////////////////////////////////////////////////////

////////////////////////////////////////////////////////////////////////////////////
app.use(swaggerUI);
/////////////////////////////////////////////////////////

app.use(cookieParser());

//Set session user to req
app.use((req, res, next) => {
    //bind user to req.user
    if (req.session.user) req.user = req.session.user;
    next();
});

/////////////////////////////////////////////////////////
// Internal API. Not exporsed to Public.
// should be with out bodyParse in order to proxyRoute works well
app.use('/api', bodyParserJudger,[
    login,
    oauthClient,
    user,
    myDownLog,
    vcgContract,
    searchRouter,
    vcgSearch,
    customer,
    userManage,
    vcgDownload,
    proxyRoute, // should be with out bodyParser
]);

//handle api 404
app.use('/api',function(req,res){
    res.status(404).json({message:'API NOT FOUND'});
});
/////////////////////////////////////////////////////////


/////////////////////////////////////////////////////////
app.use([
    express.static(REACT_APP_PATH),
    express.static(REACT_APP_PATH + '/dist')
]);

// catch 404 and forward to error handler
app.use(function (req, res) {
    res.status(404);
    res.sendFile(REACT_APP_PATH + '/dist/index.html');
	// const err = new Error('Not Found');
	// err.status = 404;
	// next(err);
});



// error handler
app.use(function (err, req, res) {
	// set locals, only providing error in development
    res.locals.message = err.message;
    res.locals.error = req.app.get('env') === 'development' ? err : {};

	// render the error page
    res.status(err.status || 500);
    res.render('error');
});

module.exports = app;
