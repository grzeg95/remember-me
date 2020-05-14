const admin = require("firebase-admin");
const bodyParser = require('body-parser');

admin.initializeApp({
  credential: admin.credential.cert(require('./remember-me-3-firebase-adminsdk-dz5m4-315ff0d147.json')),
  databaseURL: "https://remember-me-3.firebaseio.com"
});

const port = 1337;
const app = require('express')();

app.use(require('cors')());
app.use(bodyParser.json()); // for parsing application/json
app.use(bodyParser.urlencoded({ extended: true })); // for parsing application/x-www-form-urlencoded

app.listen(port, () => {
  console.log(`Server Running on port: ${port}`);
});

// Auth0 authentication middleware
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
  // Create UID from authenticated Auth0 user
  const uid = req.user.sub;
  // Mint token using Firebase Admin SDK
  admin.auth().createCustomToken(uid)
    .then(customToken =>
      // Response must be an object or Firebase errors
      res.json({firebaseToken: customToken})
    )
    .catch(err =>
      res.status(500).send({
        message: 'Something went wrong acquiring a Firebase token.',
        error: err
      })
    );
});
