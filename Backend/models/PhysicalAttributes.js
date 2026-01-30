const mongoose = require("mongoose");

const physicalAttributesSchema = new mongoose.Schema(
  {
    color: {
      type: String,
      trim: true
    },

    weight: {
      type: Number
    },

    density: {
      type: Number
    },

    // ---- Fruit measurements ----
    FRUITSHAPE: {
      type: Number
    },
    FRUITLGTH: {
      type: Number
    },
    FRUITWIDTH: {
      type: Number
    },
    FRTWEIGHT: {
      type: Number
    },
    FRTSTEMTHK: {
      type: Number
    },
    FRTTEXTURE: {
      type: Number
    },
    FRTSTMLGTH: {
      type: String, // range like "0-28"
      trim: true
    },
    FRTFLSHOXI: {
      type: Number
    },

    // ---- Seed attributes ----
    SEEDCOLOR: {
      type: Number
    },
    SSIZE: {
      type: Number
    },
    SEEDLENGTH: {
      type: Number
    },
    SEEDWIDTH: {
      type: Number
    },
    SEEDNUMBER: {
      type: Number
    },
    SEEDSHAPE: {
      type: String,
      trim: true
    }
  },
  {
    timestamps: true,
    collection: "PhysicalAttributes"
  }
);

module.exports = mongoose.model(
  "PhysicalAttributes",
  physicalAttributesSchema
);
