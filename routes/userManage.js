let express = require('express');
let router = express.Router();
import {services} from '../config';
import fetch from 'isomorphic-fetch';
import ensureLogin from '../middlewares/authentication';
import { PERMISSIONS } from '../config/permissions';
import {
    authCanceler as rejectIfNotHave,
    folderAuthCanceler as rejectIfFolderNotHave,
    rejectIfOnlyHave,
    passIfHaveAnyOneIn,
    folderPermissionsMid,
  } from './services-proxy-decorator/decorators-stack/api-auth';

router.put('/assets/review', ensureLogin, rejectIfNotHave(PERMISSIONS.ASSETS_AUDIT_PAGE), (req, res) => {
    let p = req.body;
   
    let idsStr = p.ids.join(',');
    //let pp = `{"ids": [${idsStr}],"rejectReason": "${p.rejectReason?p.rejectReason:''}","reviewerId": "${p.reviewerId?p.reviewerId:''}","state":"${p.state}"}`;
    //console.log(pp);
    let url = `${services.resource}/assets/review`;
    fetch(url, {
        credentials: 'include',
        method: 'PUT',
        body:JSON.stringify(req.body),
        headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json',  
        },
    }).then(response=>{
        res.send(response).end();
    }).catch(err=>{
        console.log(err);
        res.send(err).end();
    });
});

router.get('/permission/list', ensureLogin, passIfHaveAnyOneIn(PERMISSIONS.auth_view), (req, res) => {
    let uid = req.user.userId;
    let cid = req.user.customerId;
    let url = `${services.passport}/permission/list?uid=${uid}&cid=${cid}`;
    fetch(url, {
        credentials: 'include',
        method: 'GET',
        headers: {
            'Accept': 'application/json',
        },
    })
    .then(response=>{
        //console.log(response);
        response.json()
      .then(data=>{
          res.send(data).end();
      }).catch(err=>{
          console.log(err);
          res.send(err).end();
      });
    });
});

router.get('/permission/rolePermission', ensureLogin, rejectIfNotHave(PERMISSIONS.auth_view), (req, res) => {
    let {roleIds} = req.query;
    let uid = req.user.userId;
    let cid = req.user.customerId;
    let url = `${services.passport}/permission/rolePermission?roleIds=${roleIds}&uid=${uid}&cid=${cid}`;
    fetch(url, {
        credentials: 'include',
        method: 'GET',
        headers: {
            'Accept': 'application/json',
        },
    })
    .then(response=>{
        //console.log(response);
        response.json()
      .then(data=>{
          res.send(data).end();
      }).catch(err=>{
          console.log(err);
          res.send(err).end();
      });
    });
});

router.get('/user/pageList', ensureLogin, passIfHaveAnyOneIn([PERMISSIONS.user_add, PERMISSIONS.user_edit, PERMISSIONS.user_view]), (req, res) => {
    let {realName, orderby, pageNum, pageSize} = req.query;
    let pageQuery = '';
    let reN = '';
    let order = orderby?`&orderby=${orderby}`:'';
    if(pageNum&&pageSize) {
        pageQuery = `&pageNum=${pageNum}&pageSize=${pageSize}`;
    }
    if(realName) {
        reN = `&realName=${realName}`;
    }
    let uid = req.user.userId;
    let cid = req.user.customerId;
    let url = `${services.passport}/user/pageList?uid=${uid}&cid=${cid}${order}${pageQuery}${reN}`;

    fetch(url, {
        credentials: 'include',
        method: 'GET',
        headers: {
            'Accept': 'application/json',
        },
    })
    .then(response=>{
        //console.log(response);
        response.json()
      .then(data=>{
          res.send(data).end();
      }).catch(err=>{
          console.log(err);
          res.send(err).end();
      });
    });
});
router.get('/role/list', ensureLogin, passIfHaveAnyOneIn([PERMISSIONS.role_add,PERMISSIONS.role_view,PERMISSIONS.role_edit]), (req, res) => {
    let {orderby} = req.query;
    let uid = req.user.userId;
    let cid = req.user.customerId;
    let order = orderby?`&orderby=${orderby}`:'';
    
    let url = `${services.passport}/role/list?uid=${uid}&cid=${cid}${order}`;
    fetch(url, {
        credentials: 'include',
        method: 'GET',
        headers: {
            'Accept': 'application/json',
        },
    })
    .then(response=>{
        //console.log(response);
        response.json()
      .then(data=>{
          res.send(data).end();
      }).catch(err=>{
          console.log(err);
          res.send(err).end();
      });
    });
});
router.get('/permission/userPermission', ensureLogin, rejectIfNotHave(PERMISSIONS.auth_view), (req, res) => {
    let {userId} = req.query;
    let uid = req.user.userId;
    let cid = req.user.customerId;
    let url = `${services.passport}/permission/userPermission?userId=${userId}&uid=${uid}&cid=${cid}`;
    fetch(url, {
        credentials: 'include',
        method: 'GET',
        headers: {
            'Accept': 'application/json',
        },
    })
    .then(response=>{
        //console.log(response);
        response.json()
      .then(data=>{
          res.send(data).end();
      }).catch(err=>{
          console.log(err);
          res.send(err).end();
      });
    });
});

router.post('/user/update1', ensureLogin, rejectIfNotHave(PERMISSIONS.user_edit), (req, res) => {
    let {userId} = req.query;
    let uid = req.user.userId;
    let cid = req.user.customerId;
    let url = `${services.passport}/user/update?userId=${userId}&uid=${uid}&cid=${cid}`;
    fetch(url, {
        credentials: 'include',
        method: 'POST',
        body:JSON.stringify(req.body),
        headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json',
        },
    })
    .then(response=>{
        //console.log(response);
        response.json()
      .then(data=>{
          res.send(data).end();
      }).catch(err=>{
          console.log(err);
          res.send(err).end();
      });
    });
});



module.exports = router;
