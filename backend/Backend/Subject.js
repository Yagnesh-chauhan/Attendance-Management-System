const mongoose = require('mongoose');

const subjectSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Please add a subject name'],
    trim: true
  },
  code: {
    type: String,
    required: [true, 'Please add a subject code'],
    unique: true,
    uppercase: true,
    trim: true
  },
  description: {
    type: String,
    trim: true
  },
  department: {
    type: String,
    required: [true, 'Please add a department'],
    trim: true
  },
  semester: {
    type: Number,
    required: [true, 'Please add semester'],
    min: 1,
    max: 8
  },
  credits: {
    type: Number,
    required: [true, 'Please add credits'],
    min: 1
  },
  faculty: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  academicYear: {
    type: String,
    required: true
  },
  isActive: {
    type: Boolean,
    default: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('Subject', subjectSchema);
