// 22

require('dotenv').config();

var express = require('express');
const session = require('express-session');


var path = require('path');
var cookieParser = require('cookie-parser');
var logger = require('morgan');

var indexRouter = require('./routes/index');
var containerRouter = require('./routes/containers');
var filesRouter = require('./routes/files');
var searchRouter = require('./routes/search');



var app = express();



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

app.use('/', indexRouter);
app.use('/containers', containerRouter);
app.use('/files', filesRouter);
app.use('/search', searchRouter);

app.listen(3000);

module.exports = app;
