const Contest = require('../models/contestModule')
const mongoose = require('mongoose');
const Submission = require("../models/submission");
const Problem = require("../models/problem")
const {getLanguageById,submitBatch,submitToken} = require("../utils/problemUtility");

const contestpost = async (req, res) => {
  try {
    const { title, description, startDate, endDate, problems} = req.body;

    const createdBy =  req.result._id

    if (!title || !startDate || !endDate || !problems || !createdBy) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const contest = new Contest({
      title,
      description,
      startDate,
      endDate,
      problems,
      createdBy
    });

    await contest.save();

    return res.status(201).json({ message: 'Contest created', contest });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
};

const contestGetall = async (req,res)=>{
     try {
    // Find all contests
    const contests = await Contest.find({}, 'title startDate endDate problems').populate('problems', '_id title');

    // This only returns the selected fields
    res.status(200).json({
      success: true,
      contests
    });
  } catch (err) {
    console.error('Error fetching contests:', err);
    res.status(500).json({ error: 'Server error' });
  }

}

const contestGetbyId = async(req,res)=>{
  try {
    const { id } = req.params;
    const userId = req.result._id;

    if (!id) {
      return res.status(400).json({ success: false, error: 'Contest ID is required' });
    }

    // Fetch contest with populated participants
    const contest = await Contest.findById(id)
      .populate('problems', '_id title')
      .populate('participants.user', 'firstName lastName'); // Add this population

    if (!contest) {
      return res.status(404).json({ success: false, error: 'Contest not found' });
    }

    // Find participant for current user
    const participant = contest.participants.find(p => 
      p.user && p.user._id.toString() === userId.toString()
    );
    
    res.status(200).json({
      success: true,
      contest,
      participantData: participant || null
    });

  } catch (err) {
    console.error('Error fetching contest by ID:', err);
    res.status(500).json({ success: false, error: 'Server error' });
  }
}

const submissionContest = async (req, res) => {
  try {
    const userId = req.result._id;
    const problemId = req.params.id;
    const { code, contestId } = req.body;
    let { language } = req.body;

    if (!userId || !code || !problemId || !language) {
      return res.status(400).send("Some fields are missing");
    }

    if (language === 'cpp') language = 'c++';

    const problem = await Problem.findById(problemId);
    if (!problem) {
      return res.status(404).send("Problem not found");
    }

    let contest = null;
    if (contestId) {
      contest = await Contest.findById(contestId);
      if (!contest) {
        return res.status(404).send("Contest not found");
      }

      const now = new Date();
      if (now < contest.startDate) {
        return res.status(400).send("Contest has not started yet");
      }
      if (now > contest.endDate) {
        return res.status(400).send("Contest has ended");
      }
    }

    const submittedResult = await Submission.create({
      userId,
      problemId,
      code,
      language,
      status: 'pending',
      testCasesTotal: problem.hiddenTestCases.length
    });

    const languageId = getLanguageById(language);
    const submissions = problem.hiddenTestCases.map((testcase) => ({
      source_code: code,
      language_id: languageId,
      stdin: testcase.input,
      expected_output: testcase.output
    }));

    const submitResult = await submitBatch(submissions);
    const resultToken = submitResult.map((value) => value.token);

    // Extra validation for submitToken response
    let testResult;
    try {
      testResult = await submitToken(resultToken);
    } catch (err) {
      console.error("submitToken error:", err);
      throw new Error("Judge system unavailable");
    }

    if (!Array.isArray(testResult)) {
      throw new Error("Invalid response from judge system");
    }

    let testCasesPassed = 0;
    let runtime = 0;
    let memory = 0;
    let status = 'accepted';
    let errorMessage = null;

    for (const test of testResult) {
      if (test.status_id === 3) {
        testCasesPassed++;
        runtime += parseFloat(test.time);
        memory = Math.max(memory, test.memory);
      } else {
        if (test.status_id === 4) {
          status = 'error';
          errorMessage = test.stderr;
        } else {
          status = 'wrong';
          errorMessage = test.stderr;
        }
      }
    }

    submittedResult.status = status;
    submittedResult.testCasesPassed = testCasesPassed;
    submittedResult.errorMessage = errorMessage;
    submittedResult.runtime = runtime;
    submittedResult.memory = memory;
    await submittedResult.save();

    if (!req.result.problemSolved.includes(problemId)) {
      req.result.problemSolved.push(problemId);
      await req.result.save();
    }

    if (contestId && contest) {
      let participant = contest.participants.find(
        p => p.user.toString() === userId.toString()
      );

      if (!participant) {
        participant = {
          user: userId,
          attemptedProblems: []
        };
        contest.participants.push(participant);
      }

      let attempt = participant.attemptedProblems.find(
        ap => ap.problem.toString() === problemId.toString()
      );

      if (!attempt) {
        attempt = {
          problem: problemId,
          submission: submittedResult._id
        };
        participant.attemptedProblems.push(attempt);
      } else {
        attempt.submission = submittedResult._id;
      }

      await contest.save();
    }

    const accepted = (status === 'accepted');
    const response = {
      accepted,
      totalTestCases: submittedResult.testCasesTotal,
      passedTestCases: testCasesPassed,
      runtime,
      memory,
      submissionId: submittedResult._id
    };

    res.status(201).json(response);
  } catch (err) {
    console.error("Submission error:", err);
    res.status(500).send("Internal Server Error: " + err.message);
  }
};


// NEW ENDPOINT FOR RECORDING CONTEST TIMING
// POST /contest/:id/start
const startContest = async (req, res) => {
  const { id: contestId } = req.params;
  const userId = req.result._id;

  const contest = await Contest.findById(contestId);
  if (!contest) return res.status(404).send("Contest not found");

  const index = contest.participants.findIndex(p => p.user.toString() === userId.toString());
  if (index === -1) {
    contest.participants.push({ user: userId, startTime: new Date() });
  } else if (!contest.participants[index].startTime) {
    contest.participants[index].startTime = new Date();
  }

  await contest.save();
  return res.status(200).json({ success: true });
};

// POST /contest/:id/end
// contestController.js

const endContest = async (req, res) => {
  try {
    const contestId = req.params.id;

    // ✅ Matches your middleware: user is on `req.result`
    const userId = req.result._id;

    const contest = await Contest.findById(contestId);
    if (!contest) {
      return res.status(404).json({ message: "Contest not found" });
    }

    // Find participant entry for this user
    const participant = contest.participants.find(
      (p) => p.user.toString() === userId.toString()
    );

    if (!participant) {
      return res.status(404).json({ message: "You are not a participant in this contest" });
    }

    if (!participant.endTime) {
      participant.endTime = new Date();
      participant.timeTaken = Math.floor((participant.endTime - participant.startTime) / 1000);
      await contest.save();
      return res.json({ showResults: true });
    } else {
      return res.json({ showResults: false });
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};




const getContestResults = async (req, res) => {
  try {
    const contestId = req.params.id;
    const contest = await Contest.findById(contestId)
      .populate({
        path: 'participants.user',
        select: 'firstName lastName'
      })
      .populate({
        path: 'participants.attemptedProblems.submission',
        select: 'status'
      })
      .populate({
        path: 'participants.attemptedProblems.problem',
        select: 'title difficulty'
      });

    if (!contest) {
      return res.status(404).json({ success: false, error: 'Contest not found' });
    }

    // Process results
    const processedResults = contest.participants
      .filter(participant => participant.endTime) // Only include participants who finished
      .map(participant => {
        const solvedProblems = participant.attemptedProblems.filter(
          ap => ap.submission?.status === 'accepted'
        );
        
        const totalScore = solvedProblems.reduce(
          (sum, ap) => sum + (
            ap.problem?.difficulty === 'hard' ? 3 : 
            ap.problem?.difficulty === 'medium' ? 2 : 1
          ), 0
        );

        return {
          user: {
            _id: participant.user._id,
            firstName: participant.user.firstName,
            lastName: participant.user.lastName
          },
          solved: solvedProblems.length,
          totalScore,
          totalTime: participant.timeTaken || 0,
          attempts: participant.attemptedProblems.length
        };
      });

    // Sort by score (descending), then by time (ascending)
    processedResults.sort((a, b) => {
      if (b.totalScore !== a.totalScore) return b.totalScore - a.totalScore;
      return a.totalTime - b.totalTime;
    });

    // Add ranks
    const rankedResults = processedResults.map((result, index) => ({
      ...result,
      rank: index + 1
    }));

    res.status(200).json({
      contest: {
        title: contest.title,
        startDate: contest.startDate,
        endDate: contest.endDate
      },
      results: rankedResults
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
};

module.exports = {contestpost,contestGetall,contestGetbyId,submissionContest,getContestResults,startContest,endContest};