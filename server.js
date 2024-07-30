'use strict';
require('dotenv').config();
const express = require('express');
const myDB = require('./connection');
const fccTesting = require('./freeCodeCamp/fcctesting.js');
const app = express();
const http = require('http').createServer(app);
const io = require('socket.io')(http);
const session = require('express-session');
const MongoStore = require('connect-mongo')(session);
const passportSocketIo = require('passport.socketio');
const cookieParser = require('cookie-parser');
const URI = process.env.MONGO_URI;
const store = new MongoStore({ url: URI });
const passport = require('passport');
const routes = require('./routes.js');
const auth = require('./auth.js');
fccTesting(app); //For FCC testing purposes

app.use('/public', express.static(process.cwd() + '/public'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
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

app.set('view engine', 'pug');
app.set('views', './views/pug');

const onAuthorizeSuccess = (data, accept) => {
  console.log('successful connection to socket.io');
  accept(null, true);
};
const onAuthorizeFail = (data, message, error, accept) => {
  if (error) throw new Error(message);
  console.log('failed connection to socket.io:', message);
  accept(null, false);
};
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

myDB(async client => {
 
  const myDataBase = await client.db('test').collection('people');
  const connectedSockets = new Map(); // Keep track of connected sockets

  routes(app, myDataBase);
  auth(app, myDataBase);
  io.on('connection', socket => {
    // Check if the socket is already connected for the user
    if(!connectedSockets.has(socket.request.user.name)){
      connectedSockets.set(socket.request.user.name, 1);
      io.emit('user', {
        username: socket.request.user.name,
        connectedUsers : connectedSockets.size,
        connected: true
      });
    }else {
      
      connectedSockets.set(socket.request.user.name, connectedSockets.get(socket.request.user.name) + 1);
    }    
    io.emit('user count',connectedSockets.size);

    socket.on('disconnect', () => {
      console.log('A user has disconnected');

      if(connectedSockets.get(socket.request.user.name) === 1){
        connectedSockets.delete(socket.request.user.name);

        io.emit('user', {
          username: socket.request.user.name,
          connectedUsers:connectedSockets.size,
          connected: false
        });
      }else {
        connectedSockets.set(socket.request.user.name, connectedSockets.get(socket.request.user.name) - 1);
      }
      io.emit('user count', connectedSockets.size);
      
    });

    socket.on('chat message', message => {
      io.emit('chat message', { username: socket.request.user.name, message });
    });
  });
}).catch(e => {
  app.route('/').get((req, res) => {
    res.render('index', { title: e, message: 'Unable to connect to database' });
  });
});



const PORT = process.env.PORT || 3000;
http.listen(PORT, () => {
  console.log('Listening on port ' + PORT);
});
