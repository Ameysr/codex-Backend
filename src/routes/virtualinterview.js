const express = require('express');
const interviewRouter = express.Router();
const userMiddleware = require("../middleware/userMiddleware");
const virtualinterview = require("../controllers/interview")


interviewRouter.post("/virtual", userMiddleware, virtualinterview);


module.exports = interviewRouter;
