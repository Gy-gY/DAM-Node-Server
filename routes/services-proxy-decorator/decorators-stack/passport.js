require('../../../utils/arrayExt.js');
import {
  userIdInQueryString as parsedUserIdInQ,
  userIdInJsonBody as parseUserIdInReqBody
} from './common-decorator';
import customIdMid  from '../../../middlewares/customMid';
import {
  authCanceler as rejectIfNotHave,
  passIfHaveAnyOneIn
} from './api-auth';
import { PERMISSIONS } from '../../../config/permissions';
// import { serverLogger, apiLogger } from '../../../lib/log';

// let empty = (body) => { return body; /*DO nothing*/ };

//不需要验证登录的api
let noNeedLogin = [

    'POST:/user/findPwd',
    'POST:/user/register',

    'GET:/message/sendsms',
    'GET:/message/sendsmsForExistMobile',
    'GET:/message/check',

];

//不需要proxy,返回404
let noNeedProxy = [
    'GET:/health',
    'POST:/user/login',
    'GET:/user/logout',
    'GET:/user/ungroupedUsersPageList',
    'GET:/role/list',
	///////////////////// resevt
    'POST:/resevt/folderadd',
    'POST:/resevt/folderdelete',
    'GET:/user/pageList',
	///////////////////// message
    'GET:/message/sendMail',
    'POST:/message/sendNoticeMail',
    'POST:/message/sendNoticeSms', //
    'GET:/user/pageList',
    'POST:/user/resetPwd',
    'POST:/user/search',
    'GET:/user/simpleInfoPageList',
    'POST:/user/join_workgroup',
    'POST:/user/update',
    /////////groups
    'GET:/workgroups',
    'POST:/workgroups/create',
   
];

let decorators = {
  /////////////////////////////////// user
    'GET:/user/auth': {
        reqDecorator: parsedUserIdInQ()
    },
    'POST:/user/create': {
        before: [rejectIfNotHave(PERMISSIONS.user_add)]
    },
    'GET:/user/folderauth': {
        reqDecorator: parsedUserIdInQ()
    },
    'GET:/user/getUserManageFolders': {
        reqDecorator: parsedUserIdInQ()
    },
    'GET:/user/allUserList': {
        before: [customIdMid]
    },
    //'POST:/user/join_workgroup': {
    //    before: [rejectIfNotHave(PERMISSIONS.USER_MANAGEMENT_PAGE)]
    //},
    //'GET:/user/pageList': {
        //before: [rejectIfNotHave([PERMISSIONS.USER_MANAGEMENT_PAGE])]
    //},
    //'POST:/user/resetPwd': {
        //reqDecorator: parseUserIdInReqBody()
    //},
    //'POST:/user/search': {
        //before: [rejectIfNotHave([PERMISSIONS.USER_MANAGEMENT_PAGE])]
    //},
    //'GET:/user/simpleInfoPageList': {
    //    before: [rejectIfNotHave([PERMISSIONS.USER_MANAGEMENT_PAGE])]
    //},
    //'POST:/user/update': {
        //before: [rejectIfNotHave(PERMISSIONS.user_edit)]
    //},
    'GET:/user/userFolderPermissionList': {
        reqDecorator: parsedUserIdInQ()
    },
    'GET:/user/userPermissionList': {
        reqDecorator: parsedUserIdInQ()
    },
    //'DELETE:/user/{id}': {
    //    before: [rejectIfNotHave(PERMISSIONS.USER_MANAGEMENT_PAGE)]
    //},
    'GET:/user/{id}': {
        before: [rejectIfNotHave(PERMISSIONS.user_view)]
    },

  ///////////////////////////////workgroup
    'GET:/workgroups': {
        before: [passIfHaveAnyOneIn([PERMISSIONS.USER_MANAGEMENT_PAGE,PERMISSIONS.FOLDER_MANAGEMENT_PAGE])]
    },
    'POST:/workgroups/create': {
        before: [rejectIfNotHave(PERMISSIONS.USER_MANAGEMENT_PAGE)]
    },
    'DELETE:/workgroups/{id}': {
        before: [rejectIfNotHave(PERMISSIONS.USER_MANAGEMENT_PAGE)]
    },
    'GET:/workgroups/{id}': {
        before: [passIfHaveAnyOneIn([PERMISSIONS.USER_MANAGEMENT_PAGE,PERMISSIONS.FOLDER_MANAGEMENT_PAGE])]
    },
    'PUT:/workgroups/{id}': {
        before: [rejectIfNotHave(PERMISSIONS.USER_MANAGEMENT_PAGE)]
    },

  ////////////////////////// permission
    'GET:/permission/list': {//nodeed
        before: [passIfHaveAnyOneIn([PERMISSIONS.auth_view])]
    },
    'GET:/permission/pageList': {
        before: [passIfHaveAnyOneIn([PERMISSIONS.auth_view])]
    },

  /////////////////////////// role
    //'GET:/role/list': {//nodeed
    //    before: [passIfHaveAnyOneIn([PERMISSIONS.PERMISSION_MANAGEMENT_PAGE,PERMISSIONS.role_view])]
    //},
    'GET:/role/pageList': {
        before: [passIfHaveAnyOneIn([PERMISSIONS.role_view,PERMISSIONS.role_add,PERMISSIONS.role_edit])]
    },

  ////////////////////////// role-permission
    'GET:/rolePermission/list': {
        before: [rejectIfNotHave(PERMISSIONS.auth_view)]
    },
    'GET:/rolePermission/pageList': {
        before: [rejectIfNotHave(PERMISSIONS.auth_view)]
    },
};

export default decorators;
export {
  noNeedLogin,
  noNeedProxy
};