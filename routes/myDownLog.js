let express = require('express');
let router = express.Router();
import redisClient from '../utils/redisClient';
import {services} from '../config';
import fetch from 'isomorphic-fetch';
import {getVcgAccess} from '../lib/getVcgAccess';
import ensureLogin from '../middlewares/authentication';

function fetchPurchaseLog(aipUrl, clientId, apiToken, page, nums, user_id, start_date, end_date, downloadIds) {
    //console.log('...........fetchPurchaseLog........................downloadIds == ', downloadIds);
    return new Promise((resolve, reject)=>{
        let querys = `?start_date=${start_date}&end_date=${end_date}&down_id=${downloadIds}`;
        fetch(`${aipUrl}/api/purchase/log${querys}`, {
            credentials: 'include',
            method: 'GET',
            headers: {
                'Accept': 'application/json',
                'api-key': clientId,
                'authorization': apiToken,
            },
        })
        .then(response => {  
            response.json().then(data => {
                resolve(data.data);
            });
        }).catch(err=>{
            console.log(err);
            reject(err);
        });
    });
}

function fetchAllUser(cid) {
    return new Promise((resolve,reject)=>{
        fetch(`${services.passport}/user/allUserList?cid=${cid}`, {
            credentials: 'include',
            method: 'GET',
            headers: {
                'Accept': 'application/json',
            },
        })
        .then(response=>{
            response.json()
          .then(data=>{
              resolve(data);
          });
        }).catch(err=>{
            console.log(err);
            reject(err);
        });
    });
}

//这里要补加一些参数，比如licenseType
function fetchDownlog(aipUrl, apiToken, clientId, user_id, pageNum, pageSize, start_date, end_date, person, cid, confirmStatus, licenseType, contract) {  
    let querys = `?startDate=${start_date}&endDate=${end_date}&cid=${cid}&pageNum=${pageNum}&pageSize=${pageSize}`;
    if(user_id == 'all' && confirmStatus == 0 && licenseType == 0) {
        querys = `?startDate=${start_date}&endDate=${end_date}&cid=${cid}&pageNum=${pageNum}&pageSize=${pageSize}`;
    } else if (user_id != 'all' && confirmStatus == 0 && licenseType == 0) {
        querys = `?startDate=${start_date}&endDate=${end_date}&uid=${user_id}&cid=${cid}&pageNum=${pageNum}&pageSize=${pageSize}`;
    } else if(user_id == 'all' && confirmStatus != 0 && licenseType == 0) {
        querys = `?startDate=${start_date}&endDate=${end_date}&cid=${cid}&confirmStatus=${confirmStatus}&pageNum=${pageNum}&pageSize=${pageSize}`;
    } else if (user_id == 'all' && confirmStatus == 0 && licenseType != 0) {
        querys = `?startDate=${start_date}&endDate=${end_date}&cid=${cid}&licenseType=${licenseType}&pageNum=${pageNum}&pageSize=${pageSize}`;
    } else if (user_id != 'all' && confirmStatus != 0 && licenseType == 0) {
        querys = `?startDate=${start_date}&endDate=${end_date}&uid=${user_id}&cid=${cid}&confirmStatus=${confirmStatus}&pageNum=${pageNum}&pageSize=${pageSize}`; 
    } else if(user_id != 'all' && confirmStatus == 0 && licenseType != 0) {
        querys = `?startDate=${start_date}&endDate=${end_date}&uid=${user_id}&cid=${cid}&licenseType=${licenseType}&pageNum=${pageNum}&pageSize=${pageSize}`;
    } else if(user_id == 'all' && confirmStatus != 0 && licenseType != 0) {
        querys = `?startDate=${start_date}&endDate=${end_date}&cid=${cid}&confirmStatus=${confirmStatus}&licenseType=${licenseType}&pageNum=${pageNum}&pageSize=${pageSize}`;
    } else if(user_id != 'all' && confirmStatus != 0 && licenseType != 0) {
        querys = `?startDate=${start_date}&endDate=${end_date}&uid=${user_id}&cid=${cid}&confirmStatus=${confirmStatus}&licenseType=${licenseType}&pageNum=${pageNum}&pageSize=${pageSize}`;
    }
    let msData = null;
    console.log('--------fetchDownLog-------querys======= ', querys);
    return new Promise((resolve, reject) => {
        fetch(`${services.resource}/vcgDownload/pageList${querys}`, {
            credentials: 'include',
            method: 'GET',
            headers: {
                'Accept': 'application/json',
            },
        }).then(response => {
            response.json().then(data => {
                msData = data;
                console.log('................微服务....1026...............');
                let logCounts = data.total;
                console.log('logCounts ======= ', logCounts);
                let downIds = data.list && data.list.map(item => {
                    return item.downId;
                });
                let strIds = downIds.join(',');
                console.log('===========downIds======downIds======', downIds);
                //如果downid为空，也就是没有一个符合筛选条件的，vcg接口会返回全部用户的图片
                if(strIds == '') {
                    strIds = null;
                }
                // if(user_id == 'all' && contract == 1) {
                //     strIds == '';
                // }
                let params = `?down_id=${strIds}&start_date=${start_date}&end_date=${end_date}`;
                console.log('===========params====== ', params);
                console.log('-----完整连接======= ', `${aipUrl}/api/auth_download_log${params}`);
                fetch(`${aipUrl}/api/auth_download_log${params}`, {
                    credentials: 'include',
                    method: 'GET',
                    headers: {
                        'Accept': 'application/json',
                        'api-key': clientId,
                        'authorization': apiToken,
                    },
                }).then(response => {
                    response.json().then(data => {
                        if(data.status_code==1) {
                            console.log('===========data======从VCG请求过来的数据====== ', data);
                            let listVcg = data.data.list;
                            //console.log('-------msData--微服务----->>>>>>>>>>>>> ', msData);
                            listVcg && listVcg.map(vcg => {
                                let find = msData.list && msData.list.find(ms => {
                                    return ms.downId == vcg.down_id;
                                });
                                if(find) {
                                    vcg.id = find.id;
                                    vcg.license_type = find.licenseType;
                                    vcg.realName = find.userName;
                                    switch(vcg.license_type) {
                                    case 1:
                                        vcg.license_type = 'rm';
                                        break;
                                    case 2:
                                        vcg.license_type = 'rf';
                                        break;
                                    case 3:
                                        vcg.license_type = 'rr';
                                        break;
                                    case 4:
                                        vcg.license_type = 'edit';
                                        break;
                                    }
                                }
                            });
                        //console.log('VCG整合微服务后的数据：=======> ', listVcg);
                            data.data.total_count = listVcg ? logCounts : 0;
                            fetchPurchaseLog(aipUrl, clientId, apiToken, pageSize, pageNum, user_id, start_date, end_date, strIds).then(purchaselog => {
                            //console.log('****1026********购买记录：', purchaselog);
                                data.data.list = data.data.list && data.data.list.map((x, i) => {
                                    let find = purchaselog.list && purchaselog.list.find(y => y.down_id == x.down_id);
                                    if(find) {
                                        x.purchaseTime = find.downloadTime;
                                        delete find.downloadTime;
                                        x.purchased = true;
                                        return Object.assign(x,find);
                                    } else {
                                        return x;
                                    }
                                });
                            //console.log('即将send给前端的组装好的数据：data=====> ', data);
                            //console.log('即将send给前端的组装好的数据：data.data.list::::: ', data.data.list);
                                resolve(data);
                            });
                        } else {
                            resolve(data);
                            redisClient.del('vcgApiToken');
                        }
                    });
                }).catch(err => {
                    console.log(err);
                    reject(err);
                });
            });
        });
    });
}


router.get('/purChase', ensureLogin, (req, res) => {
    let userId = req.user.userId;
    let cid = req.user.customerId;
    let {type,photo_id,sale_mode,product_size,license_type,purpose_code,price,down_id,id} = req.query;
    let query = '';
    let ltype=4;
    if(license_type=='rf') {
        ltype=2;
    }else if(license_type=='rm') {
        ltype=1;
    }
    console.log('req.query =====purChase=========1026================= ', req.query);
    //----------------------这里要加一个参数 down_id 
    if(type==3) {
        query = `?photo_id=${photo_id}&sale_mode=${sale_mode}&license_type=${ltype}&product_size=${product_size}&purpose_code=0&down_id=${down_id}`;
    }else if(type==2){
        query = `?photo_id=${photo_id}&sale_mode=${sale_mode}&license_type=${ltype}&purpose_code=${purpose_code}&product_size=${product_size}&down_id=${down_id}`;
    }else {
        query = `?photo_id=${photo_id}&sale_mode=${sale_mode}&license_type=${ltype}&purpose_code=${purpose_code}&product_size=${product_size}&down_id=${down_id}`;        
    }
    console.log('query -----------购买：---------->', query);
    getVcgAccess(userId).then(obj=>{
        fetch(`${obj.damApiAcount.aipUrl}/api/purchase${query}`, {
            credentials: 'include',
            method: 'GET',
            headers: {
                'Accept': 'application/json',
                'api-key': obj.damApiAcount.clientId,
                'authorization': obj.apiToken,
            },
        }) 
        .then(response=>{
            response.json()
        .then(data=>{
            console.log('-----购买确认成功之后VCG返回该张图片的信息data：=== ', data);

            //这里要fetch一下，也就是购买完成以后告诉后端已经购买确认成功，后台记录一下状态
            if(data.status_code == 1) {
                fetch(`${services.resource}/vcgDownload/update-confirm-status?uid=${userId}&cid=${cid}&id=${id}&price=${data.data.price}&confirmStatus=2`, {
                    credentials: 'include',
                    method: 'GET',
                    headers: {
                        'Accept': 'application/json',
                    },
                }).then(response => {
                    console.log('response ===购买成功一张向微服务确认===\\\\\\\\\///////////====== ', response);
                });
            }
            
            //这里还要fetch一下，购买完vcg的资产之后，要保存到dam系统，也就是前端目录中“已从视觉中国购买”
            if(data.data && data.data.url) {
                console.log('------------------------------------1030-------------->>>>>>>>>>>>>>');
                fetch(`${services.resource}/assets/save-vcg-assets?vcgId=${photo_id}&cid=${cid}&uid=${userId}&vcgToken=${obj.apiToken}&apiKey=${obj.damApiAcount.clientId}`, {
                    credentials: 'include',
                    method: 'GET',
                    headers: {
                        'Accept': 'application/json',
                        'Content-Type': 'application/json',
                    },
                }).then(response=>{
                    //console.log(response);
                    response.json()
                .then(data=>{
                    console.log('/assets/save-vcg-assets返回的数据');
                    console.log(data);
                });
                });
            }
           // console.log('-------------------购买之后 data：；；；-------------------::::');
           // console.log(data);
            res.send(data);
        });
        });
    }).catch(err=>{
        res.send(err).end();
    });
});

router.get('/downloadLog', ensureLogin, (req, res) => {
    let { user_id, pageNum, pageSize, start_date, end_date, person, confirmStatus, licenseType, contract } = req.query;
    //console.log('===downloadLog======1026=======req.query=====视觉中国资源库下载记录=================== ', req.query);
    let UID = user_id;
    if(user_id == 'all') {
        UID = req.user.userId;
    }
    console.log('=====UID ====== ', UID);
    getVcgAccess(UID).then(obj => {
       // console.log('==myDownLog.js============obj ====== ', obj);
        let cid = req.user.customerId;
        fetchDownlog(obj.damApiAcount.aipUrl, obj.apiToken, obj.damApiAcount.clientId, user_id, pageNum, pageSize, start_date, end_date, person, cid, confirmStatus, licenseType, contract)
        .then(data=>{
            res.send(data);
        });
    }).catch(err=>{
        res.send(err).end();
    });
});
 
router.get('/download/pageList', ensureLogin, (req, res) => {
    let {userId,pageSize,pageNum} = req.query;
    console.log('===download/pageList======1026=======req.query====企业资源库下载记录================ ', req.query);
    let quarys = `?userId=${userId}&pageSize=${pageSize}&pageNum=${pageNum}&orderBy=Download_TIME_DESC`;
    fetch(`${services.resource}/download/pageList${quarys}`, {
        credentials: 'include',
        method: 'GET',
        headers: {
            'Accept': 'application/json',
        },
    })
    .then(response=>{
        response.json()
      .then(data=>{
          //console.log('企业资源库微服务返回data(1)：', data);
          data.list = data.list && data.list.map((x, index) => {
              let obj = {};
              obj.id = x.basic.id;
              obj.asset_type = x.basic.assetType;
              obj.updatedTime = x.basic.updatedTime;
              if ((x.detail.oss176&&x.detail.oss176.startsWith('https:')) || (x.detail.oss176&&x.detail.oss176.startsWith('http:'))) {
                  obj.small_url =  x.detail.oss176;
              }else {
                  obj.small_url =  '//' + x.detail.oss176;
              }
              obj.license_type = x.detail.licenseType;
              return obj;
          });
          //console.log('企业资源库微服务返回data：(2)', data);
          res.send(data);
      });
    });
});

router.get('/vcgDownload/down-count', ensureLogin, (req, res) => {
    console.log('#############下载数量：############req.query == ', req.query);
    let {uid, cid} = req.query;
    let query = `/vcgDownload/down-count?uid=${uid}&cid=${cid}`;
    fetch(`${services.resource}${query}`, {
        credentials: 'include',
        method: 'GET',
        headers: {'Accept': 'application/json'},
    }).then(response => {
        if(response.status == 200) {
            response.json().then(data => {
                console.log('-----------data-----------count---------');
                console.log(data);
                res.send(data);
            });
        }
    }).catch(err => {
        console.log(err);
    });
});

module.exports = router;
