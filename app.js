// 22

require('dotenv').config();

var express = require('express');
const session = require('express-session');
const msal = require('@azure/msal-node');

var path = require('path');
var cookieParser = require('cookie-parser');
var logger = require('morgan');

var indexRouter = require('./routes/index');
var usersRouter = require('./routes/users');

var app = express();

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

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'jade');

app.use(logger('dev'));

app.use(express.json());
app.use(express.urlencoded({ extended: false }));

app.use(session({
  secret: process.env.SESSION_SECRET, //
  resave: false,
  saveUninitialized: true,
  cookie: { secure: false }
}));

app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

//app.use('/', indexRouter);
//app.use('/users', usersRouter);

// Route to start the auth flow
app.get('/signin', (req, res) => {
  const authCodeUrlParameters = {
    scopes: ["user.read"],
    redirectUri: process.env.REDIRECT_URI,
  };

  cca.getAuthCodeUrl(authCodeUrlParameters).then((response) => {
    res.redirect(response);
  }).catch((error) => console.log(JSON.stringify(error)));
});

// Route to receive the token
app.get('/redirect', (req, res) => {
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
    res.redirect('/');
  }).catch((error) => {
    console.log(error);
    res.status(500).send(error);
  });

});

// Home route
app.get('/', (req, res) => {
  console.log("hello 3");
  console.log(req.session);
  if (req.session.isAuthenticated) {
    res.send(`Welcome ${req.session.user}!</br><a href="/containers">Containers</a>`);
  } else {
    res.send('Please <a href="/signin">sign in</a>');
  }
});

// Containers
app.get('/containers', async (req, res) => {
  try {
    const graphResponse = await fetch('https://graph.microsoft.com/beta/storage/fileStorage/containers?$filter=containerTypeId eq ' + process.env.CONTAINER_TYPE_ID, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${req.session.accessToken}`,
        'Content-Type': 'application/json'
      }
    });

    if (!graphResponse.ok) {
      throw new Error('Failed to fetch user profile from Microsoft Graph');
    }

    const userData = await graphResponse.json();
    res.json(userData);
    console.log(userData);
  } catch (error) {
    console.error('Error fetching user profile:', error);
    res.status(500).send('Internal Server Error');
  }
});

//app.listen(process.env.PORT, () => console.log(`Server running on port ${process.env.PORT}`));
app.listen(3000);

module.exports = app;
