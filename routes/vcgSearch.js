let express = require('express');
let router = express.Router();
import redisClient from '../utils/redisClient';
import {services} from '../config';
import fetch from 'isomorphic-fetch';
import {getVcgAccess} from '../lib/getVcgAccess';
import ensureLogin from '../middlewares/authentication';

function fetchFavorite(ids,uid) {  
    return new Promise((resolve,reject)=>{
        fetch(`${services.resource}/favorite/vcgFavorites?vcg_ids=${ids}&user_id=${uid}`, {
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
function fetchImgDetail(aipUrl,ids,clientId,apiToken) {  
    return new Promise((resolve,reject)=>{
        fetch(`${aipUrl}/api/detail?ids=${ids}`, {
            credentials: 'include',
            method: 'GET',
            headers: {
                'Accept': 'application/json',
                'api-key': clientId,
                'authorization': apiToken, },
        })
        .then(response=>{
            response.json()
          .then(data=>{
              resolve(data.data);
          });
        }).catch(err=>{
            console.log(err);
            reject(err);
        });
    });
} 

function searchCreative(aipUrl,apiToken,clientId,page=1,keyword='',nums=50,type='Creative',license_type='',sort='time',orientation='',graphical_style='',sort_by='desc',uid) {
    let creativUrl = `${aipUrl}/api/search/creative`;
    let editUrl = `${aipUrl}/api/search/editorial`;
    let idRex = /^(vcg)/i;
    let keyOrid = idRex.test(keyword)?`id=${keyword}`:`keyword=${keyword}`;
    let quarys = `?${keyOrid}&sort=${sort}&sort_by=${sort_by}&page=${page}&nums=${nums}&license_type=${license_type}&orientation=${orientation}&graphical_style=${graphical_style}`;

    let url = type=='Creative'?creativUrl:editUrl;
    let serchVcgUrl = encodeURI(`${url}${quarys}`);
    return new Promise((resolve,reject)=>{
        fetch(serchVcgUrl, {
            credentials: 'include',
            method: 'GET',
            headers: {
                'Accept': 'application/json',
                'api-key': clientId,
                'authorization': apiToken, },
        })
        .then(response=>{
            response.json()
          .then(data=>{
              if(data.status_code==1) {
                  let ids = data.data.list&&data.data.list.map(x=>x.id).join(',');
                  if(type=='Creative') {
                      Promise.all([fetchFavorite(ids,uid),fetchImgDetail(aipUrl,ids,clientId,apiToken)])   
                  .then(datas=>{
                      let favoraites = datas[0];
                      let details = datas[1];
                      data.data.list.map((x,i)=>{
                          x.middle_url = details[i].images_data.middle_url;
                          x.origen_pic_type = details[i].images_data.origen_pic_type;
                          x.keywords = details[i].images_data.keywords;
                          x.copyright = details[i].images_data.copyright;
                          x.asset_family = details[i].images_data.asset_family;
                          if(favoraites.includes(x.id)) {
                              x.isfavorite = true;
                          }else {
                              x.isfavorite = false;
                          }
                      });
                      resolve(data.data);
                  });  
                  }else {
                      fetchFavorite(ids,uid).then(favoraites=>{
                        data.data.list&&data.data.list.map((x,i)=>{
                              x.middle_url = '';
                              x.origen_pic_type = '';
                              x.keywords = '';
                              x.copyright = '';
                              x.asset_family = '';
                            //if(details[i].group_data&&details[i].group_data.length>0){
                            //    x.groupTitle = details[i].group_data[0].groupTitle;
                            //    x.groupExplain = details[i].group_data[0].groupExplain;
                            //}else{
                            //    x.groupTitle = '';
                            //    x.groupExplain = '';
                            //}
                              x.groupTitle = '';
                              x.groupExplain = '';  
                              if(favoraites.includes(x.id)) {
                                  x.isfavorite = true;
                              }else {
                                  x.isfavorite = false;
                              }
                          });
                          resolve(data.data);
                      }); 
                  }
              }else {
                  resolve(data);
                  redisClient.del('vcgApiToken');
                  //searchCreative(apiToken,clientId,page,keyword,nums,type,license_type,sort,orientation,graphical_style,sort_by);
              }
          });
        }).catch(err=>{
            console.log(err);
            reject(err);
        });
    });
}
router.get('/getEditDetails', ensureLogin, (req, res) => {
    let {ids} = req.query;
    let userId = req.user.userId;
    if(userId){
        getVcgAccess(userId).then(obj=>{
            fetchImgDetail(obj.damApiAcount.aipUrl,ids,obj.damApiAcount.clientId,obj.apiToken).then(data=>{
                res.send(data);
            });
        }).catch(err=>{
            res.send(err).end();
        });
    }else {
        res.status(401).end();
    }  
});

router.get('/vcgSearch', ensureLogin, (req, res) => {
    let {keyword,page,nums,type,license_type,sort,orientation,graphical_style,uid} = req.query;
    let apiToken = '';
    let userId = req.user.userId;
    if(userId){
        getVcgAccess(userId).then(obj=>{
            searchCreative(obj.damApiAcount.aipUrl,obj.apiToken,obj.damApiAcount.clientId,page,keyword,nums,type,license_type,sort,orientation,graphical_style,'desc',uid)
            .then(data=>{
                res.send(data);
            });
        }).catch(err=>{
            res.send(err).end();
        });
    }else {
        res.status(401).end();
    }
});

function fetchSearchByIdLike(aipUrl,likeId, license_type, orientation, graphical_style, page, nums, clientId, apiToken) {
    return new Promise((resolve,reject)=>{
        let querys = `?photo_id=${likeId}&license_type=${license_type}&orientation=${orientation}&asset_format=jpg&graphical_style=${graphical_style}&page=${page}&nums=${nums}`;
        fetch(`${aipUrl}/api/search/creative/more_like${querys}`, {
            credentials: 'include',
            method: 'GET',
            headers: {
                'Accept': 'application/json',
                'api-key': clientId,
                'authorization': apiToken, },
        })
        .then(response=>{
            response.json()
          .then(data=>{
              resolve(data.data);
          });
        }).catch(err=>{
            console.log(err);
            reject(err);
        });
    });
}




router.get('/vcgSearchByImg', ensureLogin, (req, res) => {
    let {keyword,page,nums,type,license_type,sort,orientation,graphical_style,uid,imgUrl,likeId} = req.query;
    let apiToken = '';
    let userId = req.user.userId;
    if(userId){
        getVcgAccess(userId).then(obj=>{
            if(likeId) {
                fetchSearchByIdLike(obj.damApiAcount.aipUrl,likeId, license_type, orientation, graphical_style, page, nums, obj.damApiAcount.clientId, obj.apiToken)
                .then(data=>{
                    
                    if(data.list&&data.list.length>0) {
                        let ids =  data.list.map(x=>x.res_id).join(',');
                        Promise.all([fetchFavorite(ids,userId),fetchImgDetail(obj.damApiAcount.aipUrl,ids,obj.damApiAcount.clientId,obj.apiToken)])   
                        .then(datas=>{
                            let favoraites = datas[0];
                            let details = datas[1];
                            data.list.map((x,i)=>{
                                x.id = x.res_id;
                                x.middle_url = details[i].images_data.middle_url;
                                x.origen_pic_type = details[i].images_data.origen_pic_type;
                                x.keywords = details[i].images_data.keywords;
                                x.copyright = details[i].images_data.copyright;
                                x.asset_family = details[i].images_data.asset_family;
                                if(favoraites.includes(x.id)) {
                                    x.isfavorite = true;
                                }else {
                                    x.isfavorite = false;
                                }
                            });
                            res.send(data).end();
                        }); 
                    }else {
                        data.list = [];
                        res.send(data).end();
                    }        
                });
            }else {
                res.send({}).end();
            }
        }).catch(err=>{
            res.send(err).end();
        });
    }else {
        res.status(401).end();
    }
});
module.exports = router;
