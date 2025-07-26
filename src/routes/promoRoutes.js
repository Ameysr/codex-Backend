const express = require('express');
const promoRouter = express.Router();
const { getActivePromos,recordClick,verifyPayment,createPromo,moderatePromo } = require('../controllers/promoController');
const userMiddleware = require('../middleware/userMiddleware');
const adminMiddleware = require('../middleware/adminMiddleware');
const upload = require('../middleware/uploadMiddleware');  // Fixed import

// User routes - with image upload handling
promoRouter.post('/promo', userMiddleware, upload.single('imageFile'),createPromo);

promoRouter.post('/:id/verify', userMiddleware, verifyPayment);

// Public routes
promoRouter.get('/click/:id', recordClick);
promoRouter.get('/active', getActivePromos);

// Admin routes
promoRouter.patch('/:id/moderate', adminMiddleware, moderatePromo);



module.exports = promoRouter;