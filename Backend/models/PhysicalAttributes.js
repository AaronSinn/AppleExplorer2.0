const mongoose = require("mongoose");

const physicalAttributesSchema = new mongoose.Schema({
  fruitSize: {
    type: String,
    trim: true
  },
  fruitColor: {
    type: String,
    trim: true
  },
  fruitWeight: {
    type: String,
    trim: true
  },
  fruitTexture: {
    type: String,
    trim: true
  },
  fruitLength: {
    type: Number
  },
  fruitWidth: {
    type: Number
  }
}, { timestamps: true, collection: "PhysicalAttributes" });

module.exports = mongoose.model("PhysicalAttributes", physicalAttributesSchema);
