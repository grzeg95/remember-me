const admin = require("firebase-admin");
const bodyParser = require('body-parser');
const https = require('https');

admin.initializeApp({
  credential: admin.credential.cert(require('./remember-me-3-firebase-adminsdk.json')),
  databaseURL: "https://remember-me-3.firebaseio.com"
});

const port = 1337;
const app = require('express')();

app.use(require('cors')());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

app.listen(port, _ => {});

const jwtCheck = require('express-jwt')({
  secret: require('jwks-rsa').expressJwtSecret({
    cache: true,
    rateLimit: true,
    jwksRequestsPerMinute: 5,
    jwksUri: `https://grzeg.eu.auth0.com/.well-known/jwks.json`
  }),
  audience: 'http://localhost:4200/',
  issuer: `https://grzeg.eu.auth0.com/`,
  algorithm: 'RS256'
});

// GET object containing Firebase custom token
app.get('/', jwtCheck, (req, res) => {

  https.get('https://grzeg.eu.auth0.com/userinfo', {
    headers: {
      'Authorization': req.get('Authorization')
    }
  }, (userInfoIncomingMessage) => {
    let userJSON = '';

    userInfoIncomingMessage.on('data', chunk => userJSON += chunk);
    userInfoIncomingMessage.on('end', _ => {

      const user = JSON.parse(userJSON);
      const uid = req.user.sub;

      // Mint token using Firebase Admin SDK
      admin.auth().createCustomToken(uid)
        .then(customToken => {
          admin.auth().updateUser(uid, {
            email: user.email,
            emailVerified: user.email_verified,
            displayName: user.nickname,
            photoURL: user.picture,
          }).then(() => {
            res.json({firebaseToken: customToken});
          });
        })
        .catch(err =>
          res.status(500).send({
            message: 'Something went wrong acquiring a Firebase token.',
            error: err
          })
        );

    });

  });

});


exports.auth0 = app;
