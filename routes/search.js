var express = require('express');
var router = express.Router();
import { serverLogger, apiLogger } from '../lib/log';
import { services } from '../config/micro-services';
import { AssestApiFp } from '../api/resourceApi';
import { searchQ } from '../api/searchApi';
import { handleErrorResponse } from '../lib/apiHandler';
// const FROMS = ['DAM','VCG'];

const fields = ['assetId', 'assetType', 'title', 'picWidth', 'creditLine',
					'description', 'coverageOssid', 'ossId',
					'picHeight', 'picSize', 'oss800', 'oss400', 'keywords', 'location'];

const filterAsset = (rawAsset) => {
    // apiLogger.debug('format Asset', rawAsset);
    let formatAsset = Object.assign(rawAsset.detail, rawAsset.basic);
    let filter = {};
    for (let key in formatAsset) { //foreach asset object
        if (fields.includes(key)) filter[key] = formatAsset[key];
    }
    if (Object.keys(filter).length > 0) return filter;
    return null;
}


router.get('/search', (req, res) => {
  const { q, from, esq, user } = req.query;

  apiLogger.debug('Search Asset Params: ', req.query);
  if (q)
    searchQ(q.toString('utf8'))
    .then(rst => {
      apiLogger.debug('Search Raw Return ======>', rst);
      const { hits } = rst.hits;
      if (!hits.length) return [];
      const ids = hits.map(hit => hit._id);
      apiLogger.debug('Search hits ======>', ids);
      return AssestApiFp.assetsBatchGet({ids: ids})(undefined, services.resource);
    }).then(assets => {
      // apiLogger.debug('Find assets ======>', assets);
      return res.json(assets.map(asset => filterAsset(asset))).end();
    }).catch(err=>{
       handleErrorResponse(res, err);
    });
  else
    return res.json({error_description: 'nothing to search'}).end();
});

export default router;
