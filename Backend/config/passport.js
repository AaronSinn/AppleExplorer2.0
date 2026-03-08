// config/passport.js
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const googleUser = require('../models/GoogleUser');

module.exports = function (passport) {
  passport.use(
    new GoogleStrategy(
      {
        clientID: process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        callbackURL: process.env.GOOGLE_CALLBACK_URL,
      },
      async (accessToken, refreshToken, profile, done) => {
        let existingUser;
        try{
          existingUser = await googleUser.findOne({ googleId: profile.id });
        } catch (err) {
          return done(err, null);
        }
        
        try{
          if (existingUser) return done(null, existingUser);
          // console.log('profile:', profile);
          const newUser = new googleUser({
            googleId: profile.id,
            displayName: profile.displayName,
            email: profile.emails[0].value,
            fullName: profile.displayName,
            firstName: profile.name.givenName,
            lastName: profile.name.familyName
          });
          // console.log('New Google User:', newUser);
          const newSavedUser = await newUser.save();
          done(null, newSavedUser);
        }catch (err) {
          console.log(err);
          return done(err, null);
        }

      }
    )
  );

  passport.serializeUser((user, done) => done(null, user.id));
  passport.deserializeUser((id, done) => googleUser.findById(id).then(user => done(null, user)));
};
