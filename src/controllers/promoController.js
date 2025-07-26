const CoursePromo = require('../models/coursePromo');
const Razorpay = require('razorpay');
const crypto = require('crypto');
const cloudinary = require('cloudinary').v2;
const stream = require('stream');


// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

// Configure Razorpay
const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET
});



// Helper to upload image to Cloudinary (supports buffer or URL)
const uploadToCloudinary = async (source) => {
  try {
    if (source.buffer) {
      return new Promise((resolve, reject) => {
        const uploadStream = cloudinary.uploader.upload_stream(
          { folder: 'promotions' },
          (error, result) => {
            if (error) {
              console.error('Cloudinary upload error:', error);
              reject(new Error(`Cloudinary upload failed: ${error.message}`));
            } else {
              resolve(result);
            }
          }
        );

        const bufferStream = new stream.PassThrough();
        bufferStream.end(source.buffer);
        bufferStream.pipe(uploadStream);
      });
    }
  } catch (error) {
    console.error('Cloudinary upload error:', error);
    throw new Error('Failed to upload image to Cloudinary');
  }
};

// Validate and create promo
const createPromo = async (req, res) => {
  try {
    const { title, description, targetUrl, promoDuration } = req.body;
    const userId = req.result._id;
    const imageFile = req.file;
    const imageUrl = req.body.imageUrl;

    // Validate inputs
    if (!title || !description || !targetUrl || !promoDuration) {
      return res.status(400).json({ error: 'All fields are required' });
    }

    // Validate target URL
    if (!targetUrl.startsWith('https://')) {
      return res.status(400).json({ error: 'Target URL must be HTTPS' });
    }

    // Check for image source
    if (!imageFile && !imageUrl) {
      return res.status(400).json({ error: 'Image file or URL is required' });
    }

    // Handle image source
    let cloudinaryResult;
    try {
      if (imageFile) {
        // Upload file from buffer
        cloudinaryResult = await uploadToCloudinary({
          buffer: imageFile.buffer,
          originalname: imageFile.originalname
        });
      } else if (imageUrl) {
        // Validate image URL format
        const validExtensions = ['.jpg', '.jpeg', '.png', '.webp', '.gif'];
        const hasValidExtension = validExtensions.some(ext =>
          imageUrl.toLowerCase().endsWith(ext)
        );

        if (!hasValidExtension) {
          return res.status(400).json({
            error: 'Invalid image format. Supported: JPG, PNG, WEBP, GIF'
          });
        }

        // Upload from URL
        cloudinaryResult = await uploadToCloudinary({ url: imageUrl });
      }
    } catch (uploadErr) {
      console.error('Image upload error:', uploadErr);
      return res.status(500).json({
        error: 'Failed to process image',
        details: uploadErr.message
      });
    }

    // Pricing based on duration
    const pricing = {
      '1day': 2,
      '1week': 4,
      '1month': 5
    };

    // Create promo record
    const promo = new CoursePromo({
      userId,
      title,
      description,
      imagePublicId: cloudinaryResult.public_id,
      imageUrl: cloudinaryResult.secure_url,
      targetUrl,
      promoDuration,
      price: pricing[promoDuration],
      expiresAt: new Date(Date.now() + {
        '1day': 24 * 60 * 60 * 1000,
        '1week': 7 * 24 * 60 * 60 * 1000,
        '1month': 30 * 24 * 60 * 60 * 1000
      }[promoDuration])
    });

    await promo.save();

    // Create Razorpay order
    const order = await razorpay.orders.create({
      amount: promo.price * 100,
      currency: 'INR',
      receipt: `promo_${promo._id}`,
      notes: {
        promoId: promo._id.toString(),
        userId: userId.toString()
      }
    });

    res.json({
      success: true,
      promo,
      order
    });
  } catch (err) {
    console.error('Promo creation error:', err);
    res.status(500).json({
      error: 'Failed to create promotion',
      details: err.message
    });
  }
};


// Verify payment and activate promo
const verifyPayment = async (req, res) => {
  try {
    const { order_id, payment_id, signature } = req.body;
    const promoId = req.params.id;

    // Verify signature
    const generatedSignature = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
      .update(`${order_id}|${payment_id}`)
      .digest('hex');

    if (generatedSignature !== signature) {
      return res.status(400).json({ error: 'Invalid payment signature' });
    }

    // Update promo status
    const promo = await CoursePromo.findByIdAndUpdate(
      promoId,
      {
        isApproved: true,
        paymentId: payment_id,
        moderationStatus: 'approved'
      },
      { new: true }
    );

    if (!promo) {
      return res.status(404).json({ error: 'Promotion not found' });
    }

    res.json({
      success: true,
      promo
    });
  } catch (err) {
    console.error('Payment verification error:', err);
    res.status(500).json({
      error: 'Payment verification failed',
      details: err.message
    });
  }
};

// Record click and redirect
const recordClick = async (req, res) => {
  try {
    // First get the promo without updating
    const promo = await CoursePromo.findById(req.params.id);
    
    if (!promo || !promo.isApproved || !promo.isActive) {
      return res.status(404).json({ error: 'Promotion not available' });
    }

    // Update the click count
    await CoursePromo.findByIdAndUpdate(
      req.params.id,
      { $inc: { clicks: 1 } }
    );

    // Return the target URL to the frontend
    res.status(200).json({ targetUrl: promo.targetUrl });
  } catch (err) {
    console.error('Click recording error:', err);
    res.status(500).json({
      error: 'Failed to record click',
      details: err.message
    });
  }
};
// Get active promos
const getActivePromos = async (req, res) => {
  try {
    const promos = await CoursePromo.find({
      isApproved: true,
      isActive: true,
      expiresAt: { $gt: new Date() }
    })
    .sort('-createdAt')
    .populate('userId', 'firstName lastName');

    res.json(promos);
  } catch (err) {
    console.error('Get promos error:', err);
    res.status(500).json({ 
      error: 'Failed to get promotions',
      details: err.message 
    });
  }
};

// Admin endpoint to moderate promos
const moderatePromo = async (req, res) => {
  try {
    const { status, reason } = req.body;
    const promo = await CoursePromo.findByIdAndUpdate(
      req.params.id,
      { 
        moderationStatus: status,
        moderationReason: reason,
        isActive: status === 'approved'
      },
      { new: true }
    );

    if (!promo) {
      return res.status(404).json({ error: 'Promotion not found' });
    }

    res.json(promo);
  } catch (err) {
    console.error('Moderation error:', err);
    res.status(500).json({ 
      error: 'Failed to moderate promotion',
      details: err.message 
    });
  }
};

module.exports = {
  uploadToCloudinary,
  createPromo,
  verifyPayment,
  recordClick,
  getActivePromos,   // Add this
  moderatePromo      // Add this
};
