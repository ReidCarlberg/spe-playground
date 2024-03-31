var express = require('express');
var router = express.Router();

const msal = require('@azure/msal-node');

// MSAL config
const msalConfig = {
  auth: {
    clientId: process.env.CLIENT_ID,
    authority: `https://login.microsoftonline.com/${process.env.TENANT_ID}`,
    clientSecret: process.env.CLIENT_SECRET,
    redirectUri: process.env.REDIRECT_URI,
  },
  system: {
    loggerOptions: {
      loggerCallback(loglevel, message, containsPii) {
        console.log(message);
      },
      piiLoggingEnabled: false,
      logLevel: msal.LogLevel.Verbose,
    }
  }
};

const cca = new msal.ConfidentialClientApplication(msalConfig);

/* GET home page. */
/*
router.get('/', function(req, res, next) {
  res.render('index', { title: 'Express' });
});
*/

// Home route
router.get('/', (req, res) => {
  console.log("hello 3");
  console.log(req.session);
  if (req.session.isAuthenticated) {
    res.send(`Welcome ${req.session.user}!</br><a href="/containers">Containers</a>`);
  } else {
    res.render('index', { title: 'SPE Playground' } );
    //res.send('Please <a href="/signin">sign in</a>');
  }
});

// Route to start the auth flow
router.get('/signin', (req, res) => {
  const authCodeUrlParameters = {
    scopes: ["user.read"],
    redirectUri: process.env.REDIRECT_URI,
  };

  cca.getAuthCodeUrl(authCodeUrlParameters).then((response) => {
    res.redirect(response);
  }).catch((error) => console.log(JSON.stringify(error)));
});

// Route to receive the token
router.get('/redirect', (req, res) => {
  console.log("app hello 2" );
  console.log(req.session);

  const tokenRequest = {
    code: req.query.code,
    scopes: ["user.read"],
    redirectUri: process.env.REDIRECT_URI,
  };

  cca.acquireTokenByCode(tokenRequest).then((response) => {
    console.log("\nResponse: \n:", response);
    //console.log("\nReq: \n:", req);
    req.session.isAuthenticated = true;
    req.session.user = response.account.username;
    req.session.accessToken = response.accessToken;
    res.redirect('/containers/');
  }).catch((error) => {
    console.log(error);
    res.status(500).send(error);
  });

});

module.exports = router;
