const mongoose = require("mongoose");

const narrativeSchema = new mongoose.Schema(
  {
    LocalNarrativeID: {
      type: Number,
      required: true,
      index: true
    },

    accession: {
      type: String,
      required: true,
      trim: true,
      index: true
    },

    narrative: {
      type: String,
      required: true,
      trim: true
    }
  },
  {
    timestamps: true,
    collection: "Narratives"
  }
);

module.exports = mongoose.model("Narrative", narrativeSchema);
