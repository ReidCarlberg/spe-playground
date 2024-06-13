var express = require('express');
var router = express.Router();

const msal = require('@azure/msal-node');

const apiFetch = require('./common');

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
  //console.log("app hello 2" );
  //console.log(req.session);

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
    req.session.username = response.account.username;
    req.session.accessToken = response.accessToken;
    res.redirect('/containers/');
  }).catch((error) => {
    console.log(error);
    res.status(500).send(error);
  });

});

// App-Only
router.get('/app-only', (req, res) => {
  const authCodeUrlParameters = {
    scopes: ["https://graph.microsoft.com/.default"],
    //prompt: "consent"
  };

  cca.acquireTokenByClientCredential(authCodeUrlParameters).then((response) => {
    console.log("Token acquired: ", response.accessToken);
    console.log(response);
    req.session.accessToken=response.accessToken;
    req.session.isAuthenticated=true;
    req.session.username="App Only";
    //this is to a particular drive that should be accessible
    res.redirect("/apponly/");
  }).catch((error) => console.log(JSON.stringify(error)));
});

// App-Only
router.get('/sharepoint-only', (req, res) => {
  const authCodeUrlParameters = {
    scopes: ["https://zdmv6.sharepoint.com/.default"],
    //prompt: "consent"
  };

  cca.acquireTokenByClientCredential(authCodeUrlParameters).then((response) => {
    console.log("Token acquired: ", response.accessToken);
    console.log(response);
    req.session.accessToken=response.accessToken;
    req.session.isAuthenticated=true;
    req.session.username="App Only";
    //this is to a particular drive that should be accessible
    res.redirect("/apponly/");
  }).catch((error) => console.log(JSON.stringify(error)));
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

router.get('/test-sample', (req, res) => {
  res.render('test-sample', { username: req.session.username });
});





router.post('/test-sample', async (req, res) => {
  const { searchQuery } = req.body; 

  try {
      const data = await apiFetch(req, searchQuery, 'GET');
      res.send(data);
  } catch (error) {
    console.log("ERROR: ", error);
      res.status(500).send('Failed to retrieve preview URL');
  }
});

module.exports = router;
