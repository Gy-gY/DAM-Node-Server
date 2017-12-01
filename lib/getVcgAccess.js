import redisClient from '../utils/redisClient';
import {services} from '../config';
import fetch from 'isomorphic-fetch';

const getApiAccount = (userId) => {
    return new Promise((resolve, reject) => {
        console.log('getApiAccount  ===damApiAcount${userId}==== ', `damApiAcount${userId}`);
        redisClient.get(`damApiAcount${userId}`, (err1, reply1)=>{
            if(!err1) {
                let obj = JSON.parse(reply1);
                console.log('getApiAccount  ===obj===111= ', obj);
                resolve(obj);
            }else {
                console.log('----------getApiAccount---------Redis get damApiAcount ERROR!------------------------');
                reject({msg:'Redis get damApiAcount ERROR!'});
            }
        });
    });
};

const getVcgAccess = function(userId) {  
    return new Promise((resolve,reject)=>{
        if(userId){
            getApiAccount(userId).then(damApiAcount=>{
                console.log('getVcgAccess ======= damApiAcount ==222= ', damApiAcount);
                redisClient.get('vcgApiToken', (err, reply)=>{
                    if(!err&&reply) {
                        console.log('----- if -------->>>> reply = ', reply);
                        resolve({apiToken:`Bearer ${reply}`, damApiAcount});     
                    }else {
                        console.log('---------- else ------------>>>>');
                        redisClient.get(`damApiAcount${userId}`, function(error, resr) {
                            if(!error){
                                let obj = JSON.parse(resr);
                                console.log(`damApiAcount${userId}:`);
                                console.log(resr);
                                let reqdata = `client_id=${obj.clientId}&client_secret=${obj.clientSecret}&username=${obj.user}&password=${obj.password}&grant_type=${obj.grantType}`;
                                console.log('开始请求VCGtoken：');
                                console.log(`${obj.aipUrl}/api/oauth2/access_token`);
                                console.log('reqdata ==== ', reqdata);
                                fetch(`${obj.aipUrl}/api/oauth2/access_token`, {
                                    credentials: 'include',
                                    body:reqdata,
                                    method: 'POST',
                                    headers: {'Content-Type': 'application/x-www-form-urlencoded'},
                                }).then(response=>{
                                    response.json()
                                    .then(data=>{
                                        if(data.access_token){
                                            redisClient.setex('vcgApiToken', 600, data.access_token);
                                            resolve({apiToken:`Bearer ${data.access_token}`, damApiAcount}); 
                                        }else {
                                            console.log('获取vcgToken失败！%%%%%%% else %%%%%%%%%%%');
                                            console.log(data);
                                            reject({code:401,msg:'获取vcgToken失败！'});
                                        }
                                    });
                                }).catch(err=>{
                                    console.log('获取vcgToken失败！%%%%%%% catch %%%%%%%');
                                    console.log(err);
                                    reject({code:401,msg:'获取vcgToken失败！'});
                                });
                            }else{
                                reject('Redis Error!');
                            }  
                        });    
                    }
                });
            });
        }else {
            reject({code:401});
        }
    });
};
export {getVcgAccess};