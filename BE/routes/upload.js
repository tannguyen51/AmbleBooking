const express = require("express");
const router = express.Router();
const cloudinary = require("cloudinary").v2;

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// POST /api/upload/image — upload base64 lên Cloudinary
router.post("/image", async (req, res) => {
  try {
    const { image, folder } = req.body;
    if (!image) {
      return res.status(400).json({ success: false, message: "Thiếu ảnh" });
    }

    // Validate định dạng
    const matches = image.match(/^data:image\/([a-zA-Z]+);base64,(.+)$/);
    if (!matches) {
      return res.status(400).json({ success: false, message: "Ảnh không đúng định dạng base64" });
    }
    const allowedTypes = ["jpeg", "jpg", "png", "webp", "gif"];
    if (!allowedTypes.includes(matches[1].toLowerCase())) {
      return res.status(400).json({ success: false, message: "Định dạng không hỗ trợ. Chấp nhận: JPEG, PNG, WEBP, GIF" });
    }

    // Giới hạn file 10MB
    const base64Data = matches[2];
    const buffer = Buffer.from(base64Data, "base64");
    if (buffer.length > 10 * 1024 * 1024) {
      return res.status(400).json({ success: false, message: "Ảnh quá lớn. Tối đa 10MB." });
    }

    // Upload lên Cloudinary
    const uploadResult = await cloudinary.uploader.upload(image, {
      folder: folder ? `munchmap/${folder}` : "munchmap",
      resource_type: "image",
      transformation: [
        { quality: "auto", fetch_format: "auto" },
      ],
    });

    return res.json({
      success: true,
      url: uploadResult.secure_url,
      publicId: uploadResult.public_id,
    });
  } catch (e) {
    console.error("[upload/image]", e.message);
    return res.status(500).json({ success: false, message: "Lỗi upload: " + e.message });
  }
});

module.exports = router;
