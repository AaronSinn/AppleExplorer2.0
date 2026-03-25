const mongoose = require("mongoose");

/**
 * Sub-schema for locationSelection
 */
const locationSelectionSchema = new mongoose.Schema(
  {
    loc1: { type: String, trim: true },
    loc2: { type: String, trim: true },
    loc3: { type: Number },
    loc4: { type: Number }
  },
  { _id: false }
);

const appleSchema = new mongoose.Schema(
  {
    accession: {
      type: String,
      required: true,
      unique: true,
      trim: true
    },
    acno: {
      type: Number,
      unique: true
    },
    cultivarName: {
      type: String,
      required: true,
      unique: true,
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
    siteId: {
      type: String,
      trim: true
    },
    prefix: {
      type: String,
      trim: true
    },
    family: {
      type: String,
      trim: true
    },
    habitat: {
      type: String,
      trim: true
    },
    inventoryType: {
      type: String,
      trim: true
    },
    inventoryMaintenancePolicy: {
      type: String,
      trim: true
    },
    maintenancePolicy: {
      type: String,
      trim: true
    },
    plantType: {
      type: String,
      trim: true
    },
    isDistributable: {
      type: String, // could be Boolean if normalized later
      trim: true
    },
    firstBloomDate: {
      type: Number
    },
    fullBloomDate: {
      type: Number
    },
    fireblightRating: {
      type: String,
      trim: true
    },
    taxon: {
      type: String,
      trim: true
    },
    narrativeKeyword: {
      type: String,
      trim: true
    },
    narrative: {
      type: String,
      trim: true
    },
    fullNarrative: {
      type: String,
      trim: true
    },
    pedigreeDescription: {
      type: String,
      trim: true
    },
    availabilityStatus: {
      type: String,
      trim: true
    },
    locationSelection: locationSelectionSchema,
    cooperator: {
      type: String,
      trim: true
    },
    cooperatorNew: {
      type: String,
      trim: true
    },
    IPR: {
      type: String,
      trim: true
    },
    labelName: {
      type: String,
      trim: true
    },
    levelOfImprovement: {
      type: String,
      trim: true
    },
    releasedDate: {
      type: Number
    },
    releasedDateFormat: {
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
    }
  },
  {
    timestamps: true,
    collection: "Apples"
  }
);

module.exports = mongoose.model("Apple", appleSchema);