require('dotenv').config();

var express = require('express');
const session = require('express-session');
var path = require('path');
var cookieParser = require('cookie-parser');
var logger = require('morgan');

var authRouter = require('./routes/auth');
var sharepointRouter = require('./routes/sharepoint');
var containerRouter = require('./routes/containers');
var filesRouter = require('./routes/files');
var searchRouter = require('./routes/search');
var metadataRouter = require('./routes/metadata');
var agentRouter = require('./routes/agent');

var app = express();

// View engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'jade');

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(session({
  secret: process.env.SESSION_SECRET, // Ensure your session secret is set in your environment variables
  resave: false,
  saveUninitialized: true,
  cookie: { secure: false } // Set secure: true if you are using HTTPS
}));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));


// Authentication Middleware
function authenticate(req, res, next) {
  if (req.session.isAuthenticated) {
    res.locals.username = req.session.username;
    next();
  } else {
    res.status(403).send('Access denied');
  }
}

// Routes
app.use('/', authRouter);
app.use('/sharepoint', sharepointRouter);
app.use('/containers', authenticate, containerRouter);
app.use('/files', authenticate, filesRouter);
app.use('/search', authenticate, searchRouter);
app.use('/metadata', authenticate, metadataRouter);
app.use('/agent', authenticate, agentRouter);

//app.listen(3000);

module.exports = app;
