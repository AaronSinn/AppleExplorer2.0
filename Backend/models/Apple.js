const mongoose = require("mongoose");

const appleSchema = new mongoose.Schema({
  accession: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  cultivarName: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  harvestDate: {
    type: String,
    trim: true
  },
  tasteNotes: {
    type: String,
    trim: true
  },
  notes: {
    type: String,
    trim: true
  },
  appleProfileId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "AppleProfile"
  },
  physicalAttributesId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "PhysicalAttributes"
  },
  originId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Origin",
    required: true
  },
  imageId: {
    type: mongoose.Schema.Types.ObjectId,
    default: null
  },
  ePedigree: {
    type: String,
    trim: true,
  },
  genus: {
    type: String,
    trim: true,
    match: /^[A-Z][a-z]+$/, // optional: enforce capitalized genus like "Malus"
  },
  species: {
    type: String,
    trim: true,
    match: /^[a-z]+$/, // optional: enforce lowercase species like "domestica"
  },
  narrative: {
    type: String,
    trim: true
  }

}, { timestamps: true, collection: "Apples" });

module.exports = mongoose.model("Apple", appleSchema);
