const passport = require('passport');
const bcrypt = require('bcrypt');
const session = require('express-session');
module.exports = function (app, myDataBase) {
   const ensureAuthenticated = (req, res, next) => {
      if (req.isAuthenticated()) {
         return next();
      }
      res.redirect('/');
   };
   app.route('/').get(
      (req, res) => {
      res.render('index', {
         title: 'Connected to Database',
         message: 'Please login',
         showLogin: true,
         showRegistration: true,
         showSocialAuth: true
      });
   });

   app.route('/login')
      .post(passport.authenticate('local', { failureRedirect: '/' }), (req, res) => {
         res.redirect('/profile');
      });

   app.route('/register')
      .post((req, res, next) => {
         myDataBase.findOne({ name: req.body.username }, function (err, user) {
            if (err) return next(err);
            if (user) return res.redirect('/');
            const hash = bcrypt.hashSync(req.body.password, 12);
            myDataBase.insertOne({
               name: req.body.username,
               password: hash
            },
               (err, doc) => {
                  if (err) {
                     console.log(err);
                     return res.redirect('/')
                  }

                  next(null, doc.ops[0]);
               }
            )
         });
      }, passport.authenticate('local', { failureRedirect: '/' }), (req, res, next) => {
         res.redirect('/profile');
      });


 
   app.route('/profile')
      .get(ensureAuthenticated, (req, res) => {
         res.render('profile', { username: req.user.name });
      })
   app.route('/logout')
      .get((req, res) => {
         req.logout(function(err) {
            if (err) { return next(err); }
            res.redirect('/');
         });
      });
   app.route('/auth/github')
      .get(passport.authenticate('github'));
   app.route('/auth/github/callback')
      .get(passport.authenticate('github', { failureRedirect: '/' }), (req, res) => {
         req.session.user_id = req.user.id;
         res.redirect('/chat');
      });
   app.route('/chat')
      .get(ensureAuthenticated, (req, res) => {
         res.render('chat', { user: req.user });
      });
   app.use((req, res, next) => {
      res.status(404)
         .type('text')
         .send('Not Found');
   });
}