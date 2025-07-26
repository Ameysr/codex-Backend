const mongoose = require('mongoose');
const { Schema } = mongoose;

const contestSchema = new Schema({
  title: {
    type: String,
    required: true,
  },

  description: {
    type: String,
  },

  startDate: {
    type: Date,
    required: true,
  },

  endDate: {
    type: Date,
    required: true,
  },

  createdBy: {
    type: Schema.Types.ObjectId,
    ref: 'Admin', // Admin who created the contest
  },

  problems: [{
    type: Schema.Types.ObjectId,
    ref: 'problem',
    required: true,
  }],

   participants: [{
    user: {
      type: Schema.Types.ObjectId,
      ref: 'user',
    },
    startTime: Date, // When user started the contest
    endTime: Date,   // When user ended the contest
    timeTaken: Number, // Total time in seconds
    attemptedProblems: [{
      problem: {
        type: Schema.Types.ObjectId,
        ref: 'problem',
      },
      submission: {
        type: Schema.Types.ObjectId,
        ref: 'submission',
      }
    }]
  }],

}, {
  timestamps: true
});

const Contest = mongoose.model('Contest', contestSchema);

module.exports = Contest;
