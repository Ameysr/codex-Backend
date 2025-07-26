const express = require('express');
const dashboardRouter = express.Router();
const userMiddleware = require('../middleware/userMiddleware');
const { getDashboardData} = require('../controllers/userDashboard');

dashboardRouter.get('/info', userMiddleware, getDashboardData);

module.exports = dashboardRouter;