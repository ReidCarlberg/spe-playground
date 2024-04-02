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

// Home route
router.get('/', (req, res) => {
  if (req.session.isAuthenticated) {
    res.redirect('/containers/');
  } else {
    res.render('index', { title: 'SPE Playground' } );
  }
});

// Route to start the auth flow
router.get('/signin', (req, res) => {
  const authCodeUrlParameters = {
    scopes: ["user.read", "user.read.all", "Files.ReadWrite.All", "Sites.Read.All", "FileStorageContainer.Selected"],
    redirectUri: process.env.REDIRECT_URI,
    //prompt: "consent"
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
    scopes: ["user.read", "user.read.all", "Files.ReadWrite.All", "Sites.Read.All", "FileStorageContainer.Selected"],
    redirectUri: process.env.REDIRECT_URI,
    //prompt: "consent"
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

// Route to handle signout
router.get('/signout', async (req, res) => {
  try {
    // Clear the token cache to sign the user out
    req.session.accessToken=null;
    req.session.isAuthenticated=null;
    req.session.username=null;
    res.redirect('/'); // Redirect to home page or sign-in page
  } catch (error) {
    console.error('Error signing out:', error);
    res.status(500).send('Error signing out');
  }
});

module.exports = router;
