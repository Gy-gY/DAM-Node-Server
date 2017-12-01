import { UsercontrollerApiFp } from '../api/passportApi';
import { services } from '../config/micro-services';
import { serverLogger, apiLogger } from './log';
import fetch from 'isomorphic-fetch';

let initUser = function (userId) {
    return new Promise(function (resolve, reject) {
        serverLogger.info('begin init user');
        let user = {};
        
        Promise.all([
            UsercontrollerApiFp.userIdGet({ id: userId })(undefined, services.passport), //获取用户详情信息
            UsercontrollerApiFp.userUserPermissionListGet({ userId })(undefined, services.passport), //获取用户的权限列表
            getUploadType(),
        ]).then(([userInfo, permissionlist,uploadtype]) => {
            ['userId', 'userName', 'displayName', 'email', 'permissions', 'customerId', 'userType' ].forEach((key) => {　//过滤掉一些用户信息
                user[key] = userInfo[key];
            });
            if(permissionlist.includes('user_add')||permissionlist.includes('user_edit')||
                permissionlist.includes('user_view')||permissionlist.includes('role_add')||
                permissionlist.includes('role_view')||permissionlist.includes('role_edit')||
                permissionlist.includes('auth_view')) {
                permissionlist.push('user_management');
            }
            if(permissionlist.includes('contract_manager')||permissionlist.includes('used_assets_manager')) {
                permissionlist.push('system_manager');
            }
             
            if(process.env.NODE_ENV === 'development') {
                permissionlist.push('newResource');
            } 
            user.isUploadAliYun = uploadtype==1?true:false;
            user.maxDownCount = userInfo.userExtend.maxDownCount;
            user.downCount = userInfo.userExtend.downCount;
            user.maxDownAmount = userInfo.userExtend.maxDownAmount;
            user.downAmount = userInfo.userExtend.downAmount;
            
            user.permissions = permissionlist;
            serverLogger.info('init user  success');
            resolve(user);
        }).catch(err => {
            serverLogger.info('init user  error : ');
            console.log(err);
            reject(err);
        });
    });
};
const getUploadType =() => {
    return new Promise((resolve,reject)=>{
        fetch(`${services.resource}/uploadHandler/fileUploadType`, {
            credentials: 'include',
            method: 'GET',
            headers: {
                'Accept': 'application/json',
            },
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
};
const initUserSession = (userId, session) => {
    return initUser(userId)
        .then(user => {
            session.user = user;
        });
};

export {
    initUser,
    initUserSession,
};
