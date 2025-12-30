const mongoose = require("mongoose");

const originSchema = new mongoose.Schema({
  country: {
    type: String,
    trim: true
  },
  province: {
    type: String,
    trim: true
  },
  city: {
    type: String,
    trim: true
  }
}, { timestamps: true, collection: "Origin" });

module.exports = mongoose.model("Origin", originSchema);
