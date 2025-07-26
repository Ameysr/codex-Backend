const mongoose = require('mongoose');

const coursePromoSchema = new mongoose.Schema({
  userId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'user',  // Changed from 'User' to 'user'
    required: true 
  },
  title: { 
    type: String, 
    required: true,
    trim: true,
    maxlength: 100
  },
  description: { 
    type: String, 
    required: true,
    trim: true,
    maxlength: 500
  },
  imagePublicId: {  // Cloudinary public ID
    type: String,
    required: true
  },
  imageUrl: { 
    type: String, 
    required: true
  },
  targetUrl: { 
    type: String, 
    required: true,
    validate: {
      validator: v => /^https:\/\/[^\s$.?#].[^\s]*$/i.test(v),
      message: props => `${props.value} must be a valid HTTPS URL!`
    }
  },
  promoDuration: { 
    type: String, 
    enum: ['1day', '1week', '1month'],
    default: '1week'
  },
  price: { 
    type: Number, 
    required: true,
    min: 0
  },
  isApproved: { 
    type: Boolean, 
    default: false 
  },
  isActive: { 
    type: Boolean, 
    default: true 
  },
  createdAt: { 
    type: Date, 
    default: Date.now 
  },
  expiresAt: Date,
  paymentId: String,
  clicks: { 
    type: Number, 
    default: 0 
  },
  moderationStatus: {
    type: String,
    enum: ['pending', 'approved', 'rejected'],
    default: 'pending'
  },
  moderationReason: String,
  safeSearchResult: {  // Store Google Vision results
    adult: String,
    spoof: String,
    medical: String,
    violence: String,
    racy: String
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('CoursePromo', coursePromoSchema);