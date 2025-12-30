// app.js
const express = require('express');
const mongoose = require('mongoose');
const session = require('express-session');
const passport = require('passport');
const dotenv = require('dotenv');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const User = require('./models/User');

dotenv.config();
require('./config/passport')(passport);

const app = express();
app.use(express.static('public'));

mongoose.connect(process.env.MONGO_URI);

app.use(session({
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
}));

app.use(passport.initialize());
app.use(passport.session());

// Auth routes
app.get('/auth/google',
  passport.authenticate('google', { scope: ['profile', 'email'] })
);

app.get('/auth/google/callback',
  passport.authenticate('google', { failureRedirect: '/' }),
  (req, res) => {
    res.redirect('/dashboard');
  }
);

// Protected route with read-only check
app.get('/dashboard', ensureAuth, ensureReadOnly, (req, res) => {
  res.send(`<h1>Welcome, ${req.user.displayName}</h1><p>You have read-only access.</p>`);
});

// Middleware
function ensureAuth(req, res, next) {
  if (req.isAuthenticated()) return next();
  res.redirect('/LoginPage.html');
}

function ensureReadOnly(req, res, next) {
  if (req.user.role === 'read-only') return next();
  res.status(403).send('Access denied');
}

// Home route
app.get('/', (req, res) => {
  res.send('<a href="/auth/google">Login with Google</a>');
});

app.listen(3000, () => console.log('Server running on http://localhost:3000'));
