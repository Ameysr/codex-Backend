const express = require('express');
const aiAnalysis =  express.Router();
const userMiddleware = require("../middleware/userMiddleware");
const analyzeComplexity = require('../controllers/problemAnalyzer');

aiAnalysis.post('/ai', userMiddleware, analyzeComplexity);

module.exports = aiAnalysis;