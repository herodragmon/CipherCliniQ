const mongoose = require('mongoose');

const PatientSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  medicalHistory: {
    type: Object,
    default: {}
  },
  conditions: {
    type: [String],
    default: []
  },
  medications: {
    type: [String],
    default: []
  },
  testResults: {
    type: Object,
    default: {}
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('Patient', PatientSchema);