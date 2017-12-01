let express = require('express');
let router = express.Router();
import {services} from '../config';
import fetch from 'isomorphic-fetch';
import ensureLogin from '../middlewares/authentication';

router.get('/customer/view', ensureLogin, (req, res) => {
    let customerId = req.user.customerId;
  
    if(customerId){
        fetch(`${services.passport}/customer/view?id=${customerId}`, {
            credentials: 'include',
            method: 'GET',
            headers: {
                'Accept': 'application/json',
            },
        })
            .then(response=>{
                response.json()
            .then(data=>{
                res.send(data).end();
            });
            }).catch(err=>{
                console.log(err);
                res.send(err);
            });
    }else {
        res.status(401).end();
    }
});
module.exports = router;
