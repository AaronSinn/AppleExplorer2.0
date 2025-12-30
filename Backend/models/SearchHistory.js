const mongoose = require('mongoose');

const searchHistorySchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  userName: {
    type: String,
    required: true
  },
  searchQuery: {
    type: String,
    required: true
  },
  filters: {
    species: String,
    cultivar: String,
    country: String,
    state: String,
    city: String,
    skinColor: String,
    fleshColor: String,
    use: String
  },
  resultsCount: {
    type: Number,
    required: true
  },
  searchDate: {
    type: Date,
    default: Date.now
  },
  ipAddress: String,
  userAgent: String
});

// Index for better query performance
searchHistorySchema.index({ userId: 1, searchDate: -1 });
searchHistorySchema.index({ searchDate: -1 });

module.exports = mongoose.model('SearchHistory', searchHistorySchema);
