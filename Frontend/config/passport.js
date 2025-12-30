// config/passport.js
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const User = require('../models/User');
 
module.exports = function (passport) {
  passport.use(
    new GoogleStrategy(
      {
        clientID: process.env.GOOGLE_CLIENT_ID.trim(),
        clientSecret: process.env.GOOGLE_CLIENT_SECRET.trim(),
        callbackURL: process.env.GOOGLE_CALLBACK_URL.trim(),
      },
      async (accessToken, refreshToken, profile, done) => {
        try {
          let user = await User.findOne({ googleId: profile.id });
 
          if (!user) {
            user = await User.create({
              googleId: profile.id,
              fullName: profile.displayName,
              email: profile.emails[0].value,
              role: 'read-only',
              isVerified: true
            });
          }
 
          return done(null, user);
        } catch (err) {
          return done(err, null);
        }
      }
    )
  );
 
    passport.serializeUser((user, done) => done(null, user.id));
    passport.deserializeUser((id, done) => {
      User.findById(id)
        .then(user => done(null, user))
        .catch(err => done(err));
    });
  };