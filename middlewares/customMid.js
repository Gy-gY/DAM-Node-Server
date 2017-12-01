module.exports = function customIdMid (req, res, next) {
    if(req.user) {
        let uid = req.user.userId;
        let cid = req.user.customerId;
        let query = `?uid=${uid}&cid=${cid}`;
        if(req.url.indexOf('?')>0) {
            query = `&uid=${uid}&cid=${cid}`;
        }
        req.query.cid=cid;
        req.query.uid=uid;
        req.url = `${req.url}${query}`;
        next();
    }else {
        res.status(401).send({msg:'请登录'}).end();
    }  
};