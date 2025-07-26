const mongoose = require('mongoose');
const { Schema } = mongoose;

const blogSchema = new Schema({
  title: {
    type: String,
    required: true,
    trim: true,
    minlength: 5,
    maxlength: 200
  },
  content: {
    type: String,
    required: true,
    minlength: 10
  },
  author: {
    type: Schema.Types.ObjectId,
    ref: 'user',
    required: true
  },
  likes: [{
    type: Schema.Types.ObjectId,
    ref: 'user'
  }],
  comments: [{
    user: {
      type: Schema.Types.ObjectId,
      ref: 'user'
    },
    text: {
      type: String,
      required: true
    },
    createdAt: {
      type: Date,
      default: Date.now
    }
  }],
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Update the updatedAt field on save
blogSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

const Blog = mongoose.model('blog', blogSchema);

module.exports = Blog;