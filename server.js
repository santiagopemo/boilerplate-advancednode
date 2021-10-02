'use strict';
require('dotenv').config();
const express = require('express');
const myDB = require('./connection');
const fccTesting = require('./freeCodeCamp/fcctesting.js');
const session = require('express-session');
const passport = require('passport');
// const ObjectID = require('mongodb').ObjectID;
const routes = require('./routes.js');
const auth = require('./auth.js');

const app = express();

const http = require('http').createServer(app);
const io = require('socket.io')(http);

const passportSocketIo = require('passport.socketio');
const cookieParser = require('cookie-parser');
const MongoStore = require('connect-mongo')(session);
const URI = process.env.MONGO_URI;
const store = new MongoStore({ url: URI });

app.set('view engine', 'pug');

fccTesting(app); //For FCC testing purposes
app.use('/public', express.static(process.cwd() + '/public'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const simpleLogger = (req, res, next) => {
    console.log(`${req.method} ${req.path} - ${req.ip}`);
    next();
}
app.use(simpleLogger);

// Set up session with a single package accesing cookies
// app.use(session({
//   secret: process.env.SESSION_SECRET,
//   resave: true,
//   saveUninitialized: true,
//   cookie: { secure: false }
// }));

// Set up session with multiples packages package accesing cookies
app.use(session({
  secret: process.env.SESSION_SECRET,
  resave: true,
  saveUninitialized: true,
  cookie: { secure: false },
  key: 'express.sid',
  store: store
}));

app.use(passport.initialize());
app.use(passport.session());

io.use(
  passportSocketIo.authorize({
    cookieParser: cookieParser,
    key: 'express.sid',
    secret: process.env.SESSION_SECRET,
    store: store,
    success: onAuthorizeSuccess,
    fail: onAuthorizeFail
  })
);

// app.route('/').get((req, res) => {
//   res.render(__dirname + '/views/pug/index', {title: 'Hello', message: 'Please login'});
// });

// // Converts its user's contents into a small key
// passport.serializeUser((user, done) => {
//   done(null, user._id);
// });

// // Converts a key into its original user
// passport.deserializeUser((id, done) => {
//   // myDataBase.findOne({_id: new ObjectID(id)}, (err, doc) => {
//     done(null, null);
//   // });
// });

myDB(async (client) => {
  // Uncomment the line below for testing the rendering of index without connection to the database
  // throw "Test exception for rendering index";
  const myDataBase = await client.db('database').collection('users');
  routes(app, myDataBase);
  auth(app, myDataBase);

  let currentUsers = 0;

  io.on('connection', socket => {
    ++currentUsers;
    io.emit('user', {
      name: socket.request.user.username,
      currentUsers,
      connected: true
    });
    socket.on('chat message', (message) => {
      io.emit('chat message', { name: socket.request.user.username, message });
    });
    // io.emit('user count', currentUsers);
    // console.log('A user has connected');
    console.log('user ' + socket.request.user.username + ' connected');

    socket.on('disconnect', () => {
      /*anything you want to do on disconnect*/
      // console.log('A user has disconnected');
      console.log('user ' + socket.request.user.username + ' disconnected');
      --currentUsers;
      // io.emit('user count', currentUsers);
      io.emit('user', {
        name: socket.request.user.username,
        currentUsers,
        connected: false
      });
    });
  });

}).catch(e => {
  app.route('/').get((req, res) => {
    res.render('pug', {
      title: e,
      message: 'Unable to login'
    });
  });
});

function onAuthorizeSuccess(data, accept) {
  console.log('successful connection to socket.io');

  accept(null, true);
}

function onAuthorizeFail(data, message, error, accept) {
  if (error) throw new Error(message);
  console.log('failed connection to socket.io:', message);
  accept(null, false);
}

const PORT = process.env.PORT || 3000;
// app.listen(PORT, () => {
//   console.log('Listening on port ' + PORT);
// });
http.listen(PORT, () => {
  console.log('Listening on port ' + PORT);
});

// ----------------- NOTES !!!!!! ------------------------//

// io() works only when connecting to a socket hosted on the same url/server. For connecting to an external socket hosted elsewhere, you would use io.connect('URL');.

// Previously, when we configured the session middleware, we didn't explicitly set the cookie name for session (key). This is because the session package was using the default value. Now that we've added another package which needs access to the same value from the cookies, we need to explicitly set the key value in both configuration objects.
