import bodyParser from 'body-parser';
import {apiLogger} from '../lib/log';

export default (req, res, next) => {
    const skipParseBody = ['/assets/upload'];
    if (skipParseBody.includes(req.path)) {
        apiLogger.debug(req.path, 'skip parse Body');
        return next();
    }
    return bodyParser({extended: false})(req, res, next);
};

