let express = require('express');
let router = express.Router();
import {services} from '../config';
import fetch from 'isomorphic-fetch';
import {getVcgAccess} from '../lib/getVcgAccess';
import ensureLogin from '../middlewares/authentication';


let purposeMedia = {
    100001:'报纸-内页、整版、跨页',
    100002:'杂志（含周刊）-内页',
    100003:'杂志（含周刊）-整版、跨页',
    100004:'杂志（含周刊）-封面',
    100005:'广播电视-电视媒体使用',
    100006:'图书出版-内文、电子书',
    100007:'图书出版-封面',
    100008:'网站新媒体-网站端',
    100009:'网站新媒体-移动端；H5',
    100010:'社交媒体-微博、微信',
};
let purposeCommer = {
    12000:'平面、户外及网络广告全用途',
    12014:'广告全用途',
    13024:'内部使用全用途',
    13035:'产品全用途',
    13010:'线下全用途',
    12012:'宣传品全用途（平面和网络）',
    13019:'数字媒体全用途（网络/手机/互动媒体）',
    13034:'展示全用途（室内/店内/现场/包装）',
    13025:'电视 / 广播 / 电影广告全用途',
    13036:'软文广告',
    12002:'展示用途 -- 广告牌',
    12022:'展示用途 -- 户外和流动广告',
    12032:'展示用途 -- 室内,POP 和展会',
    12045:'平面广告用途 -- 目录',
    12046:'平面广告用途 -- 活动节目单',
    12047:'平面广告用途 -- 插页',
    12048:'平面广告用途 -- 报纸和杂志',
    12065:'电视 -- 商业广告',
    12066:'电视 -- 商业信息广告',
    12008:'手册和直邮',
    13007:'促销用的日历和贺卡',
    13043:'公司报告',
    13044:'外部演示或报告',
    12027:'( 定期出版的 ) 时事通讯，新闻稿件和活动节目单',
    14060:'新闻稿件',
    12057:'促销 CD，DVD 和视频',
    12058:'促销赠品',
    12059:'单页和明信片',
    12064:'旅游手册 -- 封面',
    13029:'旅游手册 -- 内页',
    14017:'App',
    14050:'商业博客',
    12069:'网络用途 -- 企业网站或宣传网站（非广告）',
    13017:'网络用途 -- 广告',
    12070:'网络用途 -- 电子手册、电邮',
    13015:'便携式设备',
    13041:'网络-社会化媒体（新媒体）',
    12067:'内部用途 -- 墙面装饰和展示',
    12035:'内部数字用途 -- 局域网，电邮，视频和演示文档',
    12034:'内部平面用途 -- 手册，通讯和宣传品',
    13011:'非营利机构和博物馆 -- 展示用途',
    13012:'非营利机构和博物馆 -- 电子版展示',
    13028:'剧场演出 -- 现场表演',
    12010:'支票/信用卡/自动取款卡',
    12026:'活动门票',
    12031:'『贺卡』',
    12043:'电话卡，购物卡和交通卡',
    12030:'产品设计用途 -- 游戏，玩具和其他',
    12016:'产品设计 -- 软件和视频游戏',
    12009:'产品包装，封面和标签',
    12054:'零售 -- 日历封面',
    13031:'零售 -- 日历内页',
    12041:'零售 -- 杂项和小物品',
    12056:'零售 -- 海报',
    12060:'零售 -- 信纸和明信片',
    12063:'交易卡-- 排他性使用',
    13003:'交易卡-非排他性使用',
    12003:'电子版图书（不包括封面）',
    13004:'定制或订约出版物 -- 封面',
    13030:'定制或订约出版物 -- 内页',
    12021:'编辑用途 -- 网络和 app',
    12018:'编辑用途 -- 杂志封面',
    12019:'编辑用途 -- 杂志内页',
    12020:'编辑用途 -- 报纸',
    12004:'零售图书封面 -- 印刷版和电子版',
    12006:'零售图书内页 -- 印刷版和电子版',
    12005:'教科书封面 -- 印刷版和电子版',
    12007:'教科书内页 -- 印刷版和电子版',
    14012:'电视节目 -教育片、记录片、信息类节目',
    14010:'电影片段-纪录片',
    14008:'电影片段-非记录片，动画或图文',
    14009:'电影片段-非记录片场景装饰和布置',
    14013:'电影片段-片头',
    13020:'电影预告片',
    12039:'音乐视频',
    14011:'电视节目 - 新闻编辑类节目',
    14001:'非编辑类节目 - 道具和节目现场布置',
    14018:'非编辑类节目 - 脱口秀、真人秀等',
    14007:'促销广告 -- 各类型媒体宣传',
    14006:'促销广告 -- 网络宣传',
    14005:'促销广告 -- 电视宣传',
    14002:'非编辑类节目 - 系列剧、情景剧等',
    14003:'有线电视节目的片头（尾）部分',
};
function fetchContractDetail(customerId) {
    return new Promise((resolve,reject)=>{
        fetch(`${services.passport}/vcgMediaPurpose/finListBycusid?customer_id=${customerId}`, {
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
router.get('/contract', ensureLogin, (req, res) => {
    let {customerId} = req.query;
    let userId = req.user.userId;
    if(userId){
        getVcgAccess(userId).then(obj=>{
            fetch(`${obj.damApiAcount.aipUrl}/api/contract`, {
                credentials: 'include',
                method: 'GET',
                headers: {
                    'Accept': 'application/json',
                    'api-key': obj.damApiAcount.clientId,
                    'authorization': obj.apiToken, },
            })
            .then(response=>{
                //console.log('vcg返回合同信息：response = ', response);
                response.json()
            .then(data=>{
                //console.log('vcg返回合同信息：data = ', data);
                fetchContractDetail(customerId).then(data2=>{
                    data.data.media_use_price = data.data.media_use_price.map(x=>{
                        let find = data2.find(y=>y.code == x.useCategoryId);
                        if(find) {
                            x.purposeName = purposeMedia[x.useCategoryId];
                            x.description = find.description;
                        }
                        return x;
                    });
                    data.data.business_use_price = data.data.business_use_price.map(x=>{
                        let find = data2.find(y=>y.code == x.useId);
                        if(find) {
                            x.purposeName = purposeCommer[x.useId];
                            x.description = find.description;
                        }
                        return x;
                    });
                    data.data['business_size _price'] = data.data['business_size _price'].map(x=>{
                        return x;
                    });
                    res.send(data);
                }); 
            });
            }).catch(err=>{
                console.log(err);
                res.send(err);
            });
        }).catch((err)=>{
            if(err.code==401) {
                res.status(401).end();
            }else {
                res.status(500).send(err).end();
            }  
        });
    }else {
        res.status(401).end();
    }
});
module.exports = router;
