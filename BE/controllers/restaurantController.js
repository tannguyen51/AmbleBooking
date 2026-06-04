const Restaurant = require('../models/restaurant');
const Review = require('../models/review');
const Booking = require('../models/booking');
const User = require('../models/user');
const AnalyticsEvent = require('../models/analyticsEvent');

// Tạo regex không phân biệt có dấu / không dấu
function fuzzyRegex(str) {
  const accentMap = {
    a: '[aàáảãạâầấẩẫậăằắẳẵặ]',
    A: '[AÀÁẢÃẠÂẦẤẨẪẬĂẰẮẲẴẶ]',
    e: '[eèéẻẽẹêềếểễệ]',
    E: '[EÈÉẺẼẸÊỀẾỂỄỆ]',
    i: '[iìíỉĩị]',
    I: '[IÌÍỈĨỊ]',
    o: '[oòóỏõọôồốổỗộơờớởỡợ]',
    O: '[OÒÓỎÕỌÔỒỐỔỖỘƠỜỚỞỠỢ]',
    u: '[uùúủũụưừứửữự]',
    U: '[UÙÚỦŨỤƯỪỨỬỮỰ]',
    y: '[yỳýỷỹỵ]',
    Y: '[YỲÝỶỸỴ]',
    d: '[dđ]',
    D: '[DĐ]',
  };
  let pattern = '';
  for (const ch of str) {
    pattern += accentMap[ch] || ch.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }
  return new RegExp(pattern, 'i');
}

// GET /api/restaurants/featured
exports.getFeatured = async (req, res) => {
  try {
    const restaurants = await Restaurant.find({ isActive: true, isFeatured: true })
      .sort({ rating: -1 })
      .lean();
    return res.json({ success: true, restaurants });
  } catch (err) {
    console.error('[getFeatured]', err);
    return res.status(500).json({ success: false, message: 'Lỗi server' });
  }
};

// GET /api/restaurants?city=&cuisine=&category=&search=&priceRange=
exports.getAll = async (req, res) => {
  try {
    const { city, cuisine, category, search, priceRange } = req.query;
    const filter = { isActive: true };

    if (city) {
      // Normalize city aliases: Ho Chi Minh / HCM / Sai Gon / TP.HCM → match any
      const hcmAliases = ['ho chi minh', 'hcm', 'sai gon', 'saigon', 'tp.hcm', 'tphcm', 'hồ chí minh'];
      const isHCM = hcmAliases.some(a => city.toLowerCase().includes(a));
      if (isHCM) {
        filter.$or = [
          { city: new RegExp('ho chi minh', 'i') },
          { city: new RegExp('hcm', 'i') },
          { city: new RegExp('sai gon', 'i') },
          { city: new RegExp('saigon', 'i') },
          { city: new RegExp('tp.hcm', 'i') },
          { city: new RegExp('hồ chí minh', 'i') },
          { city: new RegExp('tp hcm', 'i') },
        ];
      } else {
        filter.city = new RegExp(city, 'i');
      }
    }
    if (cuisine)    filter.cuisine    = new RegExp(cuisine, 'i');
    if (category)   filter.categories = category;
    if (priceRange) filter.priceRange = priceRange;

    if (search) {
      const ns = fuzzyRegex(search);
      filter.$or = [
        { name:        new RegExp(ns, 'i') },
        { cuisine:     new RegExp(ns, 'i') },
        { description: new RegExp(ns, 'i') },
        { city:        new RegExp(ns, 'i') },
        { address:     new RegExp(ns, 'i') },
        { tags:        new RegExp(ns, 'i') },
      ];
    }

    const restaurants = await Restaurant.find(filter)
      .sort({ isFeatured: -1, rating: -1 })
      .lean();

    return res.json({ success: true, restaurants });
  } catch (err) {
    console.error('[getAll]', err);
    return res.status(500).json({ success: false, message: 'Lỗi server' });
  }
};

// GET /api/restaurants/:id
exports.getById = async (req, res) => {
  try {
    const restaurant = await Restaurant.findOne({ _id: req.params.id, isActive: true }).lean();
    if (!restaurant) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy nhà hàng' });
    }

      try {
        await AnalyticsEvent.create({
          restaurantId: req.params.id,
          event: 'restaurant_view',
          userId: req.user?._id,
          metadata: {},
        });
      } catch (_) {}

    return res.json({ success: true, restaurant });
  } catch (err) {
    if (err.name === 'CastError') {
      return res.status(400).json({ success: false, message: 'ID không hợp lệ' });
    }
    console.error('[getById]', err);
    return res.status(500).json({ success: false, message: 'Lỗi server' });
  }
};

// GET /api/restaurants/:id/reviews
exports.getReviews = async (req, res) => {
  try {
    const reviews = await Review.find({ restaurantId: req.params.id })
      .sort({ createdAt: -1 })
      .populate('userId', 'fullName avatar')
      .lean();

    return res.json({ success: true, reviews });
  } catch (err) {
    console.error('[getReviews]', err);
    return res.status(500).json({ success: false, message: 'Lỗi server' });
  }
};

// POST /api/restaurants/:id/reviews
exports.createReview = async (req, res) => {
  try {
    const { rating, comment, images, bookingId } = req.body;
    const numericRating = Number(rating);

    if (!bookingId) {
      return res
        .status(400)
        .json({ success: false, message: 'bookingId là bắt buộc.' });
    }

    if (!Number.isFinite(numericRating) || numericRating < 1 || numericRating > 5) {
      return res
        .status(400)
        .json({ success: false, message: 'rating phải từ 1 đến 5.' });
    }

    const booking = await Booking.findOne({
      _id: bookingId,
      userId: req.user._id,
      restaurantId: req.params.id,
      status: { $in: ['confirmed', 'occupied', 'completed'] },
    }).lean();

    if (!booking) {
      return res.status(403).json({
        success: false,
        message: 'Bạn chỉ có thể đánh giá sau khi đặt bàn thành công.',
      });
    }

    const existed = await Review.findOne({ bookingId }).lean();
    if (existed) {
      return res.status(400).json({
        success: false,
        message: 'Booking này đã được đánh giá.',
      });
    }

    const normalizedImages = Array.isArray(images)
      ? images.filter((img) => typeof img === 'string' && img.trim()).slice(0, 6)
      : [];

    const review = await Review.create({
      restaurantId: req.params.id,
      userId: req.user._id,
      bookingId,
      rating: numericRating,
      comment: String(comment || '').trim(),
      images: normalizedImages,
    });

    const restaurant = await Restaurant.findById(req.params.id);
    if (restaurant) {
      const nextCount = Number(restaurant.reviewCount || 0) + 1;
      const currentRating = Number(restaurant.rating || 0);
      restaurant.reviewCount = nextCount;
      restaurant.rating =
        (currentRating * (nextCount - 1) + numericRating) / nextCount;
      await restaurant.save();
    }

    // Thưởng điểm: ngẫu nhiên 50-100 điểm cho đánh giá
    const rewardPoints = Math.floor(Math.random() * 51) + 50; // 50-100
    const user = await User.findById(req.user._id);
    if (user) {
      user.rewardPoints = Math.max(0, (user.rewardPoints || 0) + rewardPoints);
      user.rewardHistory.push({
        title: 'Đánh giá nhà hàng',
        points: rewardPoints,
        type: 'earn',
        createdAt: new Date(),
      });
      await user.save();
    }

    const populated = await Review.findById(review._id)
      .populate('userId', 'fullName avatar')
      .lean();

    return res.json({ success: true, review: populated, rewardPoints });
  } catch (err) {
    console.error('[createReview]', err);
    return res.status(500).json({ success: false, message: 'Lỗi server' });
  }
};