const GoogleStrategy = require('passport-google-oauth20').Strategy;
const User = require('../models/User');

module.exports = function(passport) {
  passport.use(
    new GoogleStrategy(
      {
        clientID: process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        callbackURL: process.env.GOOGLE_CALLBACK_URL,
      },
      async (accessToken, refreshToken, profile, done) => {
        try {
          const existingUser = await User.findOne({ googleId: profile.id });
          if (existingUser) return done(null, existingUser);

          // If no existing user, create new
          const newUser = await User.create({
            googleId: profile.id,
            fullName: profile.displayName,
            email: profile.emails[0].value,
            // Optional: can also populate firstName / lastName
            firstName: profile.name?.givenName || '',
            lastName: profile.name?.familyName || '',
            password: null // no password for Google users
          });

          done(null, newUser);
        } catch (err) {
          console.error('Google OAuth error:', err);
          done(err, null);
        }
      }
    )
  );

  passport.serializeUser((user, done) => done(null, user.id));
  passport.deserializeUser((id, done) =>
    User.findById(id).then(user => done(null, user)).catch(err => done(err, null))
  );
};
