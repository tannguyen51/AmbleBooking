const Booking = require("../models/booking");
const Table = require("../models/table");
const Restaurant = require("../models/restaurant");

const VALID_TABLE_TYPES = ["vip", "view", "regular", "standard"];
const VALID_OPEN_DAYS = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"];

const normalizeImageList = (images) => {
  if (!Array.isArray(images)) return [];
  return images
    .map((url) => String(url || "").trim())
    .filter((url) => url.length > 0);
};

// GET /api/partner/dashboard/overview
exports.getOverview = async (req, res) => {
  try {
    const restaurantId = req.partner.restaurantId;

    if (!restaurantId) {
      return res.status(400).json({
        success: false,
        message: "Partner chưa liên kết với nhà hàng.",
      });
    }

    const today = new Date().toISOString().slice(0, 10);

    const [
      totalTables,
      availableTables,
      reservedTables,
      occupiedTables,
      cleaningTables,
      pendingOrders,
      todayBookings,
      pendingBookings,
      upcomingBookings,
      allTables,
    ] = await Promise.all([
      Table.countDocuments({ restaurantId, isActive: true }),
      Table.countDocuments({ restaurantId, isActive: true, status: 'available' }),
      Table.countDocuments({ restaurantId, isActive: true, status: 'reserved' }),
      Table.countDocuments({ restaurantId, isActive: true, status: 'occupied' }),
      Table.countDocuments({ restaurantId, isActive: true, status: 'cleaning' }),
      Booking.countDocuments({ restaurantId, status: "pending" }),
      Booking.countDocuments({
        restaurantId,
        "bookingDetails.date": today,
        status: { $in: ["pending", "confirmed", "occupied", "completed"] },
      }),
      Booking.find({ restaurantId, status: "pending" })
        .populate("userId", "fullName phone")
        .populate("tableId", "name")
        .sort({ createdAt: -1 })
        .limit(5)
        .lean(),
      Booking.find({
        restaurantId,
        "bookingDetails.date": today,
        status: { $in: ["confirmed"] },
      })
        .populate("userId", "fullName phone")
        .populate("tableId", "name type")
        .sort({ "bookingDetails.time": 1 })
        .limit(20)
        .lean(),
      Table.find({ restaurantId, isActive: true })
        .populate({
          path: "currentBookingId",
          populate: { path: "userId", select: "fullName phone" },
        })
        .sort({ name: 1 })
        .lean(),
    ]);

    const pendingBookingItems = pendingBookings.map((booking) => ({
      id: booking._id,
      userName: booking.userId?.fullName || "Khách hàng",
      userPhone: booking.userId?.phone || "",
      tableNumber: booking.tableId?.name || "Bàn",
      date: booking.bookingDetails?.date || "",
      time: booking.bookingDetails?.time || "",
      guests: booking.bookingDetails?.partySize || 0,
      depositAmount: booking.pricing?.depositAmount || 0,
      status: booking.status,
    }));

    const upcomingBookingItems = upcomingBookings.map((booking) => ({
      id: booking._id,
      bookingNumber: booking.bookingNumber,
      userName: booking.userId?.fullName || "Khách hàng",
      userPhone: booking.userId?.phone || "",
      tableId: booking.tableId?._id,
      tableNumber: booking.tableId?.name || "Bàn",
      tableType: booking.tableId?.type || "regular",
      date: booking.bookingDetails?.date || "",
      time: booking.bookingDetails?.time || "",
      guests: booking.bookingDetails?.partySize || 0,
      depositAmount: booking.pricing?.depositAmount || 0,
      status: booking.status,
    }));

    const tableFloorItems = allTables.map((table) => {
      const currentBooking = table.currentBookingId;
      return {
        id: table._id,
        name: table.name,
        type: table.type,
        capacity: table.capacity,
        status: table.status,
        features: table.features || [],
        currentBooking: currentBooking
          ? {
              id: currentBooking._id,
              status: currentBooking.status,
              date: currentBooking.bookingDetails?.date || "",
              time: currentBooking.bookingDetails?.time || "",
              expectedEndTime: currentBooking.bookingDetails?.expectedEndTime || "",
              guests: currentBooking.bookingDetails?.partySize || 0,
              customerName: currentBooking.userId?.fullName || "",
            }
          : null,
      };
    });

    return res.json({
      success: true,
      overview: {
        totalTables,
        availableTables,
        reservedTables,
        occupiedTables,
        cleaningTables,
        bookedTables: reservedTables + occupiedTables,
        pendingOrders,
        todayBookings,
      },
      pendingBookings: pendingBookingItems,
      upcomingBookings: upcomingBookingItems,
      floorTables: tableFloorItems,
    });
  } catch (err) {
    console.error("[getOverview]", err);
    return res.status(500).json({ success: false, message: "Lỗi server" });
  }
};

// GET /api/partner/orders
exports.getOrders = async (req, res) => {
  try {
    const restaurantId = req.partner.restaurantId;
    const { status } = req.query;

    if (!restaurantId) {
      return res.status(400).json({
        success: false,
        message: "Partner chưa liên kết với nhà hàng.",
      });
    }

    const filter = { restaurantId };
    if (status && status !== "all") {
      filter.status = status;
    }

    const bookings = await Booking.find(filter)
      .populate("userId", "fullName phone")
      .populate("tableId", "name type")
      .sort({ createdAt: -1 })
      .lean();

    const allBookings = await Booking.find({ restaurantId })
      .select("status")
      .lean();

    const orders = bookings.map((booking) => ({
      id: booking._id,
      bookingNumber: booking.bookingNumber,
      status: booking.status,
      userName: booking.userId?.fullName || "Khách hàng",
      userPhone: booking.userId?.phone || "",
      tableNumber: booking.tableId?.name || "Bàn",
      tableType: booking.tableId?.type || "regular",
      date: booking.bookingDetails?.date || "",
      time: booking.bookingDetails?.time || "",
      guests: booking.bookingDetails?.partySize || 0,
      depositAmount: booking.pricing?.depositAmount || 0,
      totalAmount: booking.pricing?.totalAmount || 0,
      bookedAt: booking.createdAt,
    }));

        const counts = {
      all: allBookings.length,
      pending: allBookings.filter((b) => b.status === "pending").length,
      confirmed: allBookings.filter((b) => b.status === "confirmed").length,
      occupied: allBookings.filter((b) => b.status === "occupied").length,
      completed: allBookings.filter((b) => b.status === "completed").length,
      cancelled: allBookings.filter((b) => b.status === "cancelled").length,
      no_show: allBookings.filter((b) => b.status === "no_show").length,
    };

    return res.json({ success: true, orders, counts });
  } catch (err) {
    console.error("[getOrders]", err);
    return res.status(500).json({ success: false, message: "Lỗi server" });
  }
};

// GET /api/partner/tables
exports.getTables = async (req, res) => {
  try {
    const restaurantId = req.partner.restaurantId;

    if (!restaurantId) {
      return res.status(400).json({
        success: false,
        message: "Partner chưa liên kết với nhà hàng.",
      });
    }

    const tables = await Table.find({ restaurantId, isActive: true })
      .populate({
        path: "currentBookingId",
        populate: {
          path: "userId",
          select: "fullName phone",
        },
      })
      .sort({ name: 1 })
      .lean();

    const tableItems = tables.map((table) => {
      const currentBooking = table.currentBookingId;
      return {
        id: table._id,
        name: table.name,
        type: table.type,
        capacity: table.capacity,
        pricing: table.pricing,
        images: table.images || [],
        features: table.features || [],
        description: table.description || "",
        status: table.status || "available",
        isAvailable: table.isAvailable,
        currentBooking: currentBooking
          ? {
              id: currentBooking._id,
              status: currentBooking.status,
              date: currentBooking.bookingDetails?.date || "",
              time: currentBooking.bookingDetails?.time || "",
              guests: currentBooking.bookingDetails?.partySize || 0,
              customerName: currentBooking.userId?.fullName || "Khách hàng",
              customerPhone: currentBooking.userId?.phone || "",
            }
          : null,
      };
    });

    return res.json({ success: true, tables: tableItems });
  } catch (err) {
    console.error("[getTables]", err);
    return res.status(500).json({ success: false, message: "Lỗi server" });
  }
};

// GET /api/partner/notifications
exports.getNotifications = async (req, res) => {
  try {
    const restaurantId = req.partner.restaurantId;

    if (!restaurantId) {
      return res.status(400).json({
        success: false,
        message: "Partner chưa liên kết với nhà hàng.",
      });
    }

    const [pendingCount, recentBookings] = await Promise.all([
      Booking.countDocuments({ restaurantId, status: "pending" }),
      Booking.find({ restaurantId })
        .populate("userId", "fullName phone")
        .populate("tableId", "name")
        .sort({ updatedAt: -1 })
        .limit(15)
        .lean(),
    ]);

    const notifications = recentBookings.map((booking) => {
      const customerName = booking.userId?.fullName || "Khách hàng";
      const tableName = booking.tableId?.name || "Bàn";
      const date = booking.bookingDetails?.date || "";
      const time = booking.bookingDetails?.time || "";

      if (booking.status === "pending") {
        return {
          id: booking._id,
          icon: "notifications-outline",
          title: "Có đơn đặt bàn mới",
          subtitle: `${customerName} vừa đặt ${tableName} (${date} ${time}).`,
          createdAt: booking.updatedAt,
          status: booking.status,
        };
      }

      if (booking.status === "confirmed") {
        return {
          id: booking._id,
          icon: "checkmark-circle-outline",
          title: "Đơn đã được xác nhận",
          subtitle: `Booking của ${customerName} tại ${tableName} đã được xác nhận.`,
          createdAt: booking.updatedAt,
          status: booking.status,
        };
      }

      if (booking.status === "cancelled") {
        return {
          id: booking._id,
          icon: "close-circle-outline",
          title: "Booking đã bị hủy",
          subtitle: `${customerName} đã hủy booking tại ${tableName}.`,
          createdAt: booking.updatedAt,
          status: booking.status,
        };
      }

      return {
        id: booking._id,
        icon: "information-circle-outline",
        title: "Booking cập nhật trạng thái",
        subtitle: `${customerName} • ${tableName} • ${booking.status}`,
        createdAt: booking.updatedAt,
        status: booking.status,
      };
    });

    return res.json({ success: true, pendingCount, notifications });
  } catch (err) {
    console.error("[getNotifications]", err);
    return res.status(500).json({ success: false, message: "Lỗi server" });
  }
};

// POST /api/partner/tables
exports.createTable = async (req, res) => {
  try {
    const restaurantId = req.partner.restaurantId;
    if (!restaurantId) {
      return res.status(400).json({
        success: false,
        message: "Partner chưa liên kết với nhà hàng.",
      });
    }

    const {
      name,
      type = "regular",
      capacity,
      pricing,
      description = "",
      features = [],
      images = [],
      isAvailable,
    } = req.body;

    const minCap = Number(capacity?.min);
    const maxCap = Number(capacity?.max);
    const baseDeposit = Number(pricing?.baseDeposit);

    if (!name || !String(name).trim()) {
      return res
        .status(400)
        .json({ success: false, message: "Tên bàn là bắt buộc." });
    }

    if (!VALID_TABLE_TYPES.includes(type)) {
      return res
        .status(400)
        .json({ success: false, message: "Loại bàn không hợp lệ." });
    }

    if (!Number.isFinite(minCap) || !Number.isFinite(maxCap) || minCap < 1) {
      return res
        .status(400)
        .json({ success: false, message: "Sức chứa không hợp lệ." });
    }

    if (maxCap < minCap) {
      return res.status(400).json({
        success: false,
        message: "Sức chứa tối đa phải lớn hơn hoặc bằng tối thiểu.",
      });
    }

    if (!Number.isFinite(baseDeposit) || baseDeposit < 0) {
      return res.status(400).json({
        success: false,
        message: "Tiền cọc không hợp lệ.",
      });
    }

    const newTable = await Table.create({
      restaurantId,
      name: String(name).trim(),
      type,
      capacity: { min: minCap, max: maxCap },
      pricing: { baseDeposit },
      description: String(description || "").trim(),
      features: Array.isArray(features)
        ? features.map((f) => String(f).trim()).filter(Boolean)
        : [],
      images: normalizeImageList(images),
      isActive: true,
      isAvailable: isAvailable !== undefined ? !!isAvailable : true,
    });

    return res.status(201).json({ success: true, table: newTable });
  } catch (err) {
    console.error("[createTable]", err);
    return res.status(500).json({ success: false, message: "Lỗi server" });
  }
};

// PUT /api/partner/tables/:tableId
exports.updateTable = async (req, res) => {
  try {
    const restaurantId = req.partner.restaurantId;
    const { tableId } = req.params;

    const table = await Table.findOne({
      _id: tableId,
      restaurantId,
      isActive: true,
    });

    if (!table) {
      return res
        .status(404)
        .json({ success: false, message: "Không tìm thấy bàn." });
    }

    const {
      name,
      type,
      capacity,
      pricing,
      description,
      features,
      images,
      isAvailable,
    } = req.body;

    if (name !== undefined) {
      if (!String(name).trim()) {
        return res
          .status(400)
          .json({ success: false, message: "Tên bàn là bắt buộc." });
      }
      table.name = String(name).trim();
    }

    if (type !== undefined) {
      if (!VALID_TABLE_TYPES.includes(type)) {
        return res
          .status(400)
          .json({ success: false, message: "Loại bàn không hợp lệ." });
      }
      table.type = type;
    }

    if (capacity !== undefined) {
      const minCap = Number(capacity?.min);
      const maxCap = Number(capacity?.max);
      if (!Number.isFinite(minCap) || !Number.isFinite(maxCap) || minCap < 1) {
        return res
          .status(400)
          .json({ success: false, message: "Sức chứa không hợp lệ." });
      }
      if (maxCap < minCap) {
        return res.status(400).json({
          success: false,
          message: "Sức chứa tối đa phải lớn hơn hoặc bằng tối thiểu.",
        });
      }
      table.capacity = { min: minCap, max: maxCap };
    }

    if (pricing !== undefined) {
      const baseDeposit = Number(pricing?.baseDeposit);
      if (!Number.isFinite(baseDeposit) || baseDeposit < 0) {
        return res
          .status(400)
          .json({ success: false, message: "Tiền cọc không hợp lệ." });
      }
      table.pricing = { baseDeposit };
    }

    if (description !== undefined) {
      table.description = String(description || "").trim();
    }

    if (features !== undefined) {
      table.features = Array.isArray(features)
        ? features.map((f) => String(f).trim()).filter(Boolean)
        : [];
    }

    if (images !== undefined) {
      table.images = normalizeImageList(images);
    }

    // Không cho phép update isAvailable từ form — pre-save hook tự đồng bộ từ status.
    // Việc thay đổi trạng thái phải qua các route chuyên biệt (check-in, complete, cleaning-done, release).

    await table.save();
    return res.json({ success: true, table });
  } catch (err) {
    console.error("[updateTable]", err);
    return res.status(500).json({ success: false, message: "Loi server" });
  }
};

// DELETE /api/partner/tables/:tableId
exports.deleteTable = async (req, res) => {
  try {
    const restaurantId = req.partner.restaurantId;
    const { tableId } = req.params;

    const table = await Table.findOne({
      _id: tableId,
      restaurantId,
      isActive: true,
    });

    if (!table) {
      return res
        .status(404)
        .json({ success: false, message: "Không tìm thấy bàn." });
    }

    if (table.currentBookingId) {
      const booking = await Booking.findById(table.currentBookingId)
        .select("status")
        .lean();
      if (
        booking &&
        ["pending", "confirmed", "occupied"].includes(booking.status)
      ) {
        return res.status(400).json({
          success: false,
          message: "Không thể xóa bàn đang có booking hoạt động.",
        });
      }
    }

    table.isActive = false;
    table.isAvailable = false;
    table.currentBookingId = null;
    await table.save();

    return res.json({ success: true, message: "Đã xóa bàn." });
  } catch (err) {
    console.error("[deleteTable]", err);
    return res.status(500).json({ success: false, message: "Loi server" });
  }
};

// PUT /api/partner/tables/:tableId/cleaning-done
exports.setCleaningDone = async (req, res) => {
  try {
    const restaurantId = req.partner.restaurantId;
    const { tableId } = req.params;

    const table = await Table.findOne({ _id: tableId, restaurantId, isActive: true });
    if (!table) {
      return res.status(404).json({ success: false, message: "Không tìm thấy bàn." });
    }
    if (table.status !== 'cleaning') {
      return res.status(400).json({ success: false, message: "Bàn không ở trạng thái dọn dẹp." });
    }

    table.status = 'available';
    table.currentBookingId = null;
    await table.save();

    return res.json({ success: true, message: "Bàn đã sẵn sàng.", table });
  } catch (err) {
    console.error("[setCleaningDone]", err);
    return res.status(500).json({ success: false, message: "Loi server" });
  }
};

// GET /api/partner/restaurant-profile
exports.getRestaurantProfile = async (req, res) => {
  try {
    const restaurantId = req.partner.restaurantId;
    if (!restaurantId) {
      return res.status(400).json({
        success: false,
        message: "Partner chưa liên kết với nhà hàng.",
      });
    }

    const restaurant = await Restaurant.findById(restaurantId).lean();

    if (!restaurant) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy hồ sơ nhà hàng.",
      });
    }

    return res.json({
      success: true,
      restaurant: {
        _id: restaurant._id,
        name: restaurant.name,
        coverImage: restaurant.images?.[0] || "",
        address: restaurant.address || "",
        city: restaurant.city || "",
        phone: restaurant.phone || "",
        description: restaurant.description || "",
        introduction: restaurant.introduction || "",
        cuisine: restaurant.cuisine || "",
        hasParking: !!restaurant.hasParking,
        priceMin: Number(restaurant.priceMin || 0),
        priceMax: Number(restaurant.priceMax || 0),
        openTime: restaurant.openTime || "08:00",
        closeTime: restaurant.closeTime || "22:00",
        openDays: Array.isArray(restaurant.openDays) ? restaurant.openDays : [],
        facebook: restaurant.facebook || "",
        instagram: restaurant.instagram || "",
        tiktok: restaurant.tiktok || "",
        website: restaurant.website || "",
      },
    });
  } catch (err) {
    console.error("[getRestaurantProfile]", err);
    return res.status(500).json({ success: false, message: "Loi server" });
  }
};

// PUT /api/partner/restaurant-profile
exports.updateRestaurantProfile = async (req, res) => {
  try {
    const restaurantId = req.partner.restaurantId;
    if (!restaurantId) {
      return res.status(400).json({
        success: false,
        message: "Partner chưa liên kết với nhà hàng.",
      });
    }

    const {
      coverImage,
      name,
      address,
      city,
      phone,
      description,
      introduction,
      cuisine,
      hasParking,
      priceMin,
      priceMax,
      openTime,
      closeTime,
      openDays,
      facebook,
      instagram,
      tiktok,
      website,
    } = req.body;

    if (openDays !== undefined) {
      if (!Array.isArray(openDays)) {
        return res.status(400).json({
          success: false,
          message: "openDays phải là một mảng.",
        });
      }

      const invalid = openDays.find((d) => !VALID_OPEN_DAYS.includes(d));
      if (invalid) {
        return res.status(400).json({
          success: false,
          message: `Ngày mở cửa không hợp lệ: ${invalid}`,
        });
      }
    }

    if (hasParking !== undefined && typeof hasParking !== "boolean") {
      return res.status(400).json({
        success: false,
        message: "hasParking phải là kiểu boolean.",
      });
    }

    const normalizedPriceMin =
      priceMin !== undefined ? Number(priceMin) : undefined;
    const normalizedPriceMax =
      priceMax !== undefined ? Number(priceMax) : undefined;

    if (
      normalizedPriceMin !== undefined &&
      !Number.isFinite(normalizedPriceMin)
    ) {
      return res.status(400).json({
        success: false,
        message: "priceMin phải là số.",
      });
    }

    if (
      normalizedPriceMax !== undefined &&
      !Number.isFinite(normalizedPriceMax)
    ) {
      return res.status(400).json({
        success: false,
        message: "priceMax phải là số.",
      });
    }

    if (
      normalizedPriceMin !== undefined &&
      normalizedPriceMax !== undefined &&
      normalizedPriceMin > normalizedPriceMax
    ) {
      return res.status(400).json({
        success: false,
        message: "priceMin phải nhỏ hơn hoặc bằng priceMax.",
      });
    }

    const currentRestaurant = await Restaurant.findById(restaurantId).lean();

    if (!currentRestaurant) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy hồ sơ nhà hàng.",
      });
    }

    let nextImages = currentRestaurant.images || [];
    if (coverImage !== undefined) {
      const normalizedCover = String(coverImage || "").trim();
      if (!normalizedCover) {
        nextImages = [];
      } else {
        const rest = (currentRestaurant.images || []).filter(
          (img) => img !== normalizedCover,
        );
        nextImages = [normalizedCover, ...rest];
      }
    }

    const updateData = {
      ...(name !== undefined ? { name: String(name || "").trim() } : {}),
      ...(address !== undefined
        ? {
            address: String(address || "").trim(),
            location: String(address || "").trim(),
          }
        : {}),
      ...(city !== undefined ? { city: String(city || "").trim() } : {}),
      ...(phone !== undefined ? { phone: String(phone || "").trim() } : {}),
      ...(description !== undefined
        ? { description: String(description || "").trim() }
        : {}),
      ...(introduction !== undefined
        ? { introduction: String(introduction || "").trim() }
        : {}),
      ...(cuisine !== undefined
        ? { cuisine: String(cuisine || "").trim() }
        : {}),
      ...(hasParking !== undefined ? { hasParking } : {}),
      ...(normalizedPriceMin !== undefined
        ? { priceMin: normalizedPriceMin }
        : {}),
      ...(normalizedPriceMax !== undefined
        ? { priceMax: normalizedPriceMax }
        : {}),
      ...(openTime !== undefined
        ? { openTime: String(openTime || "").trim() }
        : {}),
      ...(closeTime !== undefined
        ? { closeTime: String(closeTime || "").trim() }
        : {}),
      ...(openDays !== undefined ? { openDays } : {}),
      ...(coverImage !== undefined ? { images: nextImages } : {}),
      ...(facebook !== undefined
        ? { facebook: String(facebook || "").trim() }
        : {}),
      ...(instagram !== undefined
        ? { instagram: String(instagram || "").trim() }
        : {}),
      ...(tiktok !== undefined ? { tiktok: String(tiktok || "").trim() } : {}),
      ...(website !== undefined
        ? { website: String(website || "").trim() }
        : {}),
    };

    const restaurant = await Restaurant.findOneAndUpdate(
      { _id: restaurantId },
      { $set: updateData },
      { new: true },
    ).lean();

    return res.json({
      success: true,
      message: "Cập nhật hồ sơ nhà hàng thành công.",
      restaurant: {
        _id: restaurant._id,
        name: restaurant.name,
        coverImage: restaurant.images?.[0] || "",
        address: restaurant.address || "",
        city: restaurant.city || "",
        phone: restaurant.phone || "",
        description: restaurant.description || "",
        introduction: restaurant.introduction || "",
        cuisine: restaurant.cuisine || "",
        hasParking: !!restaurant.hasParking,
        priceMin: Number(restaurant.priceMin || 0),
        priceMax: Number(restaurant.priceMax || 0),
        openTime: restaurant.openTime || "08:00",
        closeTime: restaurant.closeTime || "22:00",
        openDays: Array.isArray(restaurant.openDays) ? restaurant.openDays : [],
        facebook: restaurant.facebook || "",
        instagram: restaurant.instagram || "",
        tiktok: restaurant.tiktok || "",
        website: restaurant.website || "",
      },
    });
  } catch (err) {
    console.error("[updateRestaurantProfile]", err);
    return res.status(500).json({ success: false, message: "Loi server" });
  }
};

