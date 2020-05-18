const admin = require('firebase-admin');
const bodyParser = require('body-parser');
const https = require('https');
const cors = require('cors');
const expressJwt = require('express-jwt');
const express = require('express');
const jwksRsa = require('jwks-rsa');

admin.initializeApp({
  credential: admin.credential.cert(require('./remember-me-3-firebase-adminsdk.json')),
  databaseURL: "https://remember-me-3.firebaseio.com"
});

const app = express();
const auth = admin.auth();

app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

const jwtCheck = expressJwt({
  secret: jwksRsa.expressJwtSecret({
    cache: true,
    rateLimit: true,
    jwksRequestsPerMinute: 5,
    jwksUri: 'https://grzeg.eu.auth0.com/.well-known/jwks.json'
  }),
  audience: 'http://localhost:4200/',
  issuer: 'https://grzeg.eu.auth0.com/',
  algorithm: 'RS256'
});

app.get('/', jwtCheck, (req, res) => {

  https.get('https://grzeg.eu.auth0.com/userinfo',
    {
      headers: {
        'Authorization': req.get('Authorization')
      }
    },(userInfoIncomingMessage) => {

    let auth0UserJSON = '';
    userInfoIncomingMessage.on('data', chunk => auth0UserJSON += chunk);
    userInfoIncomingMessage.on('end', () => {

      const auth0User = JSON.parse(auth0UserJSON);
      const user = {
        email: auth0User.email,
        emailVerified: auth0User.email_verified,
        displayName: auth0User.nickname,
        photoURL: auth0User.picture
      };
      const uid = req.user.sub;

      auth.createCustomToken(uid).then(firebaseToken => {
        auth.updateUser(uid, user).then(() => {
          res.json({firebaseToken});
        }).catch(() =>
          auth.createUser({...user, uid}).then(() => {
            res.json({firebaseToken});
          }).catch(err =>
            res.status(500).send({
              message: 'Something went wrong creating a Firebase account.',
              error: err
            })
          )
        ).catch(err => {
          res.status(500).send({
            message: 'Something went wrong acquiring a Firebase token.',
            error: err
          })
        })
      });
    });
  });
});

app.listen(1337, _ => {});
