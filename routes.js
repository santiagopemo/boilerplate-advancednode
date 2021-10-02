const passport = require('passport');
const bcrypt = require('bcrypt');

module.exports = function (app, myDataBase) {

  // app.use((req, res, next) => {
  //   console.log(req.session);
  //   console.log(req.user);
  //   next();
  // });
  
  app.route('/').get((req, res) => {
    res.render('pug', {
      title: 'Connected to Database',
      message: 'Please login',
      showLogin: true,
      showRegistration: true,
      showSocialAuth: true
    });
  });

  app.route('/login').post(passport.authenticate('local', { failureRedirect: '/' }), (req, res) => {
    // console.log({user: req.user});
    // console.log({params: req.params})
    // console.log({body: req.body})
    res.redirect('/profile');
  });

  app.route('/profile').get(ensureAuthenticated, (req, res) => {
    res.render(process.cwd() + '/views/pug/profile', {username: req.user.username});
  });

  app.route('/chat').get(ensureAuthenticated, (req, res) =>{
    res.render(__dirname + '/views/pug/chat', {user: req.user});
  });

  app.route('/logout').get((req, res) => {
    req.logout();
    res.redirect('/');
  });

  app.route('/register')
  .post((req, res, next) => {
    // const hash = bcrypt.hashSync(req.body.password, 12);
    myDataBase.findOne({ username: req.body.username }, function(err, user) {
      if (err) {
        next(err);
      } else if (user) {
        res.redirect('/');
      } else {
        const hash = bcrypt.hashSync(req.body.password, 12);
        myDataBase.insertOne({
          username: req.body.username,
          password: hash
        },
          (err, doc) => {
            if (err) {
              res.redirect('/');
            } else {
              // The inserted document is held within
              // the ops property of the doc
              next(null, doc.ops[0]);
            }
          }
        )
      }
    })
  },
    passport.authenticate('local', { failureRedirect: '/' }),
    (req, res, next) => {
      res.redirect('/profile');
    }
  );

  app.route('/auth/github').get(passport.authenticate('github'));
  app.route('/auth/github/callback').get(passport.authenticate('github', { failureRedirect: '/' }), (req, res) => {
    req.session.user_id = req.user.id
    res.redirect('/profile');
  });

  app.use((req, res, next) => {
    // console.log(req.user)
    res.status(404).type('text').send('Not Found');
  });
}

// midelware that checks wheter the user is authenticated
const ensureAuthenticated = (req, res, next) => {
    if (req.isAuthenticated()) {
      return next();
    }
    res.redirect('/');
};
