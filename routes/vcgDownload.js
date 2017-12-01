let express = require('express');
let router = express.Router();
import { services } from '../config/micro-services';
import fetch from 'isomorphic-fetch';
import {getVcgAccess} from '../lib/getVcgAccess';
import ensureLogin from '../middlewares/authentication';



router.get('/downloadVCG', ensureLogin, (req, res) => {
    let {vcgids, rfVcgids, damIds}= req.query;
    let userId = req.user.userId;
    let imgLen = vcgids.split(',').length;
    if(userId) {
        fetch(`${services.passport}/user/surplusDownCount?userId=${userId}`, {
            credentials: 'include',
            method: 'GET',
            headers: {
                'Content-Type': 'application/json'},
        })
        .then(response=>{
            response.json()
        .then(data=>{
            if(data.code==200&&(data.data.surplusDownCount>=imgLen||data.data.surplusDownCount<0)) {
                getVcgAccess(userId).then(vcgToken=>{
                    fetch(`${services.resource}/assets/vcgDownload?vcgids=${vcgids}&userId=${userId}&vcgToken=${vcgToken.apiToken}&apiKey=${vcgToken.damApiAcount.clientId}&rfVcgids=${rfVcgids}`, {
                        credentials: 'include',
                        method: 'GET',
                        headers: {
                            'Content-Type': 'application/json'},
                    })
                    .then(response=>{
                        response.json()
                    .then(data=>{
                        res.json(data).end();
                        if(damIds&&damIds.length>0){
                            let vcdidarr = vcgids.split(',');
                            let damIdsarr = damIds.split(',');
                            let filtered = vcdidarr.filter(x=>!damIdsarr.includes(x));
                            if(filtered.length>0) {
                                updateUserDown(userId, filtered.length);
                            }
                        }else {
                            updateUserDown(userId, imgLen);
                        }
                    });
                    }).catch(err=>{
                        console.log(err);
                    });
                }).catch((err)=>{
                    if(err.code==401) {
                        res.status(401).end();
                    }else {
                        res.status(500).send(err).end();
                    }  
                });
            } else{
                res.status(500).send({message: '您的下载次数已超限额，请联系系统管理员！'}).end();
            }
            //res.json(data).end();
        });
        });
    }else {
        res.status(401).end();
    }
});
function updateUserDown(userId, imgLen){
    fetch(`${services.passport}/user/updateDownCount?userId=${userId}&&count=${imgLen}`, {
        credentials: 'include',
        method: 'GET',
        headers: {
            'Content-Type': 'application/json'},
    });
}
router.post('/assets/download', ensureLogin, (req, res) => {
    let {isCheck} = req.query;
    let {userId, customerId} = req.user;
    if(userId){
        if(isCheck) {
            fetch(`${services.resource}/download/checkDownPermission?userId=${userId}`, {
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
                console.log('资产ID下载校验结果：');
                console.log(data);
                if(data.result) {
                    getDownLoadDam(req, res, userId, customerId);
                }else {
                    res.status(403).end();
                }
            });
            });
        }else {
            getDownLoadDam(req, res, userId, customerId);
        }
    }else {
        res.status(401).end();
    }
});
function getDownLoadDam(req, res, userId, customerId){
    getVcgAccess(userId).then(vcgToken=>{
        let url = `${services.resource}/assets/download?userId=${userId}&vcgToken=${vcgToken.apiToken}&cid=${customerId}`;
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
    }).catch((err)=>{
        if(err.code==401) {
            res.status(401).end();
        }else {
            res.status(500).send(err).end();
        }  
    }); 
}
module.exports = router;
