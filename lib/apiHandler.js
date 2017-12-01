import { apiLogger } from '../lib/log';

export const handleErrorResponse = (res, err, status=400) => {
    if (err.status) { //Response Object
        return err.json().then((json) => {
            apiLogger.error(json);
            res.status(json.status).json(json).end();
        });
    } else {
        apiLogger.error(err);
        return res.status(status).json({error_description: err.message}).end();
    }
}
