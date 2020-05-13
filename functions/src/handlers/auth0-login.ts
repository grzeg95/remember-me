const admin = require('firebase-admin');
const bodyParser = require('body-parser');
export const handler = require('express')();

// Automatically allow cross-origin requests
handler.use(require('cors')({ origin: true }));

handler.use(bodyParser.json());
handler.use(bodyParser.urlencoded({ extended: false }));

// Auth0 authentication middleware
const jwtCheck = require('express-jwt')({
  secret: require('jwks-rsa').expressJwtSecret({
    cache: true,
    rateLimit: true,
    jwksRequestsPerMinute: 5,
    jwksUri: `https://grzeg.eu.auth0.com/.well-known/jwks.json`
  }),
  audience: 'https://europe-west2-remember-me-3.cloudfunctions.net/auth0Login',
  issuer: `https://grzeg.eu.auth0.com/`,
  algorithms: ['RS256']
});

// GET object containing Firebase custom token
handler.get('/auth', jwtCheck, (req: any, res: any) => {
  // Create UID from authenticated Auth0 user
  const uid = req.user.sub;
  // Mint token using Firebase Admin SDK
  admin.auth().createCustomToken(uid)
    .then((customToken: string) =>
      // Response must be an object or Firebase errors
      res.json({firebaseToken: customToken})
    )
    .catch((err: any) =>
      res.status(500).send({
        message: 'Something went wrong acquiring a Firebase token.',
        error: err
      })
    );
});
