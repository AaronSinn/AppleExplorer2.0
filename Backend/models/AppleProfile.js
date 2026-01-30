const mongoose = require("mongoose");

const appleProfileSchema = new mongoose.Schema({
  genus: {
    type: String,
    required: true,
    trim: true
  },
  species: {
    type: String,
    required: true,
    trim: true
  },
  pedigree: {
    type: String,
    trim: true
  }
}, { timestamps: true, collection: "AppleProfile" });

module.exports = mongoose.model("AppleProfile", appleProfileSchema);
