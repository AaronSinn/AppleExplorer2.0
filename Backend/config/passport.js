// config/passport.js
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const { ReadOnlyUser } = require('../models/User');

module.exports = function (passport) {
  passport.use(
    new GoogleStrategy(
      {
        clientID: process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        callbackURL: process.env.GOOGLE_CALLBACK_URL,
      },
      async (accessToken, refreshToken, profile, done) => {
        const existingUser = await ReadOnlyUser.findOne({ googleId: profile.id });
        if (existingUser) return done(null, existingUser);

        const newUser = await ReadOnlyUser.create({
          googleId: profile.id,
          displayName: profile.displayName,
          email: profile.emails[0].value,
        });

        done(null, newUser);
      }
    )
  );

  passport.serializeUser((user, done) => done(null, user.id));
  passport.deserializeUser((id, done) => ReadOnlyUser.findById(id).then(user => done(null, user)));
};
