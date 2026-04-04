const mongoose = require('mongoose');

const designSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Title is required'],
    trim: true,
    maxlength: 100,
    default: 'Untitled Design'
  },
  owner: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  canvasData: {
    type: String,  
    default: '{}'
  },
  thumbnail: {
    type: String,  
    default: ''
  },
  width: {
    type: Number,
    default: 1280
  },
  height: {
    type: Number,
    default: 720
  },
  isPublic: {
    type: Boolean,
    default: false
  },
  tags: [{
    type: String,
    trim: true
  }]
}, {
  timestamps: true
});

module.exports = mongoose.model('Design', designSchema);