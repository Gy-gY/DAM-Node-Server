var express = require('express');
var router = express.Router();
import uuid from 'uuid';
import { serverLogger } from '../lib/log';
import ensureLogin from '../middlewares/authentication';
import bodyParser from 'body-parser';
import bluebird from 'bluebird';

let base = [
    bodyParser.json(),
    bodyParser.urlencoded({ extended: false }),
    ensureLogin
];

//ensure login
router.post('/oauthclients', base, (req, res) => {
  const {username, description } = req.body;
  if (!username) return res.status(403).json({ message: 'missing parameter username' }).end();
  console.log(req.body);
  req.models.OAuthUser.create({username, description}, (err, newUser) => {
        if (err) return handle500(res, err);
        const params = { clientId: uuid.v4(), clientSecret: uuid.v4(), oauthUserId: newUser.id };
        req.models.OAuthClient.create(params, (err, newClient) => {
          if (err) return handle500(res, err);
            const r = Object.assign(newClient, newUser);
            return res.status(200).json(r).end();
          });
      });
 
});

router.get('/oauthclients', base, (req, res) => {
  const qUserGet = bluebird.promisify(req.models.OAuthUser.get);

  req.models.OAuthClient.find({}, (err, clients) => {
    if (err) return handle500(res, err);
    bluebird.mapSeries(clients, (client, index) => {
      console.log(client);
      return qUserGet(client.oauthUserId).then(user => {
        client = Object.assign(client, user);
        return client;
      });
    }).then(clients => res.json(clients).end())
    .catch(err => res.status(500).json({error_description: err.toString()}).end());
  });
});

// router.put('/oauthclients/:id', (req, res) => {
//   const { id } = req.body;
//   req.models.OAuthClient.find({ id }, (err, clients) => {
//     res.end(clients);
//   });
// });

router.delete('/oauthclients/:id', base, (req, res) => {
  const { id } = req.params;
  if (!id) return res.status(403).json({ message: 'missing parameter id' }).end();
  req.models.OAuthClient.get(id , (err, client) => {
    if (err) return handle500(res, err);
    client.remove();
    req.models.OAuthUser.get(client.oauthUserId, (err, user) =>{
      if (err) return handle500(res, err);
      user.remove();
    });
    return res.status(200).end();
  });
});

const handle500 = (res, err) => {
  serverLogger.error(err);
  return res.status(500).end();
};

module.exports = router;