var express = require('express');
var router = express.Router();
import ensureLogin from '../middlewares/authentication';
import { initUserSession } from '../lib/user.js';
import { serverLogger } from '../lib/log';

//ensure login
router.get('/me', ensureLogin, (req, res) => {
    //该接口会刷新当前用户缓存信息，减少因为缓存信息不一致造成的问题。
    // may be ,we need a new api named `refresh` and do the same thing
    initUserSession(req.session.user.userId, req.session).then(function () {
        res.json(req.session.user);
        res.end();
    }).catch(function(err){
        serverLogger.error('initUserSession error '+JSON.stringify(err));
        res.status(500);
        res.end({message:'refresh user info error'});
    });
});

module.exports = router;
