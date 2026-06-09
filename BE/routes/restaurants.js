const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const {
  getAll,
  getFeatured,
  getNearby,
  getById,
  getReviews,
  createReview,
} = require('../controllers/restaurantController');

// QUAN TRỌNG: /featured, /nearby phải đặt TRƯỚC /:id

// GET /api/restaurants/featured
router.get('/featured', getFeatured);

// GET /api/restaurants/nearby?lat=&lng=&maxDistance=
router.get('/nearby', getNearby);

// GET /api/restaurants?city=&cuisine=&category=&search=
router.get('/', getAll);

// GET /api/restaurants/:id/reviews
router.get('/:id/reviews', getReviews);

// POST /api/restaurants/:id/reviews
router.post('/:id/reviews', protect, createReview);

// GET /api/restaurants/:id
router.get('/:id', getById);

module.exports = router;