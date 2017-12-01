import {serverLogger} from '../lib/log';
const PROXY_REJECT=404;
export default  function proxyReject(req,res){
    var logger = serverLogger.new('[ proxyReject ] ',{url:req.url});
    logger.info(' proxy reject intentionally ');
    res.status(PROXY_REJECT).json({message:'proxy reject intentionally'});
}