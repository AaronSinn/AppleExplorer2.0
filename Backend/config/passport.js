// config/passport.js
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const users = require('../models/User');

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
          existingUser = await users.findOne({ googleId: profile.id });
        } catch (err) {
          return done(err, null);
        }
        
        try{
          if (existingUser) return done(null, existingUser);
          const uuid = crypto.randomUUID();
          const newUser = new users({
            googleId: profile.id,
            displayName: profile.displayName,
            email: profile.emails[0].value,
            fullName: profile.displayName,
            firstName: profile.name.givenName,
            lastName: profile.name.familyName,
            password: uuid
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
  passport.deserializeUser((id, done) => users.findById(id).then(user => done(null, user)));
};
