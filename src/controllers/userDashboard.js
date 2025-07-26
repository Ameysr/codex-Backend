const User = require('../models/user');
const Submission = require('../models/submission');
const Contest = require('../models/contestModule');
const Problem = require('../models/problem');
const mongoose = require('mongoose');

const getDashboardData = async (req, res) => {
  try {
    const userId = req.result._id;

    // Get user data
    const user = await User.findById(userId).select('firstName lastName email problemSolved createdAt role');

    // Total problems solved
    const totalSolved = user.problemSolved.length || 0;

    // Get distinct active days (UTC dates)
    const distinctDaysResult = await Submission.aggregate([
      { $match: { userId: new mongoose.Types.ObjectId(userId) } },
      {
        $group: {
          _id: {
            $dateToString: { format: "%Y-%m-%d", date: "$createdAt", timezone: "UTC" }
          }
        }
      },
      { $sort: { _id: 1 } },
      { $project: { _id: 0, day: "$_id" } }
    ]);

    const distinctDays = distinctDaysResult.map(d => d.day);
    const totalActiveDays = distinctDays.length;

    // Total contests given
    const totalContests = await Contest.countDocuments({
      "participants.user": userId,
      "participants.startTime": { $exists: true }
    });

    // Solved by difficulty
    const solvedProblems = await Problem.find({
      _id: { $in: user.problemSolved }
    }).select('difficulty');

    const solvedByDifficulty = {
      easy: solvedProblems.filter(p => p.difficulty === 'easy').length,
      medium: solvedProblems.filter(p => p.difficulty === 'medium').length,
      hard: solvedProblems.filter(p => p.difficulty === 'hard').length
    };

    // Recent submissions (last 5)
    const recentSubmissions = await Submission.find({ userId })
      .sort({ createdAt: -1 })
      .limit(5)
      .populate({
        path: 'problemId',
        select: 'title difficulty'
      });

    // Format recent submissions
    const formattedSubmissions = recentSubmissions.map(sub => ({
      _id: sub._id,
      problem: {
        title: sub.problemId.title,
        difficulty: sub.problemId.difficulty
      },
      status: sub.status,
      createdAt: sub.createdAt
    }));

    // Calculate streak - accurate algorithm
    let currentStreak = 0;
    let longestStreak = 0;
    let lastActive = null;

    if (distinctDays.length > 0) {
      // Convert to Date objects for easier calculations
      const activeDates = distinctDays.map(day => new Date(day + 'T00:00:00Z'));
      
      // Sort chronologically
      activeDates.sort((a, b) => a - b);
      
      // Set last active date
      lastActive = activeDates[activeDates.length - 1];
      
      // Calculate current streak
      let streakCount = 1;
      let currentDate = new Date(activeDates[activeDates.length - 1]);
      
      // Go backwards from last active date
      for (let i = activeDates.length - 2; i >= 0; i--) {
        const prevDate = new Date(activeDates[i]);
        const diffDays = Math.floor((currentDate - prevDate) / (1000 * 60 * 60 * 24));
        
        if (diffDays === 1) {
          streakCount++;
          currentDate = prevDate;
        } else if (diffDays > 1) {
          break; // Streak broken
        }
      }
      currentStreak = streakCount;
      
      // Calculate longest streak
      let maxStreak = 1;
      let currentStreakLength = 1;
      
      for (let i = 1; i < activeDates.length; i++) {
        const prevDate = new Date(activeDates[i - 1]);
        const currDate = new Date(activeDates[i]);
        const diffDays = Math.floor((currDate - prevDate) / (1000 * 60 * 60 * 24));
        
        if (diffDays === 1) {
          currentStreakLength++;
        } else {
          if (currentStreakLength > maxStreak) {
            maxStreak = currentStreakLength;
          }
          currentStreakLength = 1;
        }
      }
      
      // Check final streak
      if (currentStreakLength > maxStreak) {
        maxStreak = currentStreakLength;
      }
      longestStreak = maxStreak;
    }

    // Send single response
    res.json({
      user: {
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        createdAt: user.createdAt,
        role: user.role
      },
      totalSolved,
      totalActiveDays,
      totalContests,
      solvedByDifficulty,
      recentSubmissions: formattedSubmissions,
      streak: {
        current: currentStreak,
        longest: longestStreak,
        lastActive
      }
    });

  } catch (error) {
    console.error('Dashboard error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};


module.exports = { getDashboardData};