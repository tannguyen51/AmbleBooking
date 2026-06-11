const express = require("express");
const router = express.Router();
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const UPLOADS_DIR = path.join(__dirname, "..", "uploads");
if (!fs.existsSync(UPLOADS_DIR)) fs.mkdirSync(UPLOADS_DIR, { recursive: true });

// POST /api/upload/image — nhận base64, lưu file, trả URL
router.post("/image", async (req, res) => {
  try {
    const { image, folder } = req.body; // image: base64 string, folder: "restaurants" | "tables"
    if (!image) {
      return res.status(400).json({ success: false, message: "Thiếu ảnh" });
    }

    // Tách base64 header (data:image/jpeg;base64,...)
    const matches = image.match(/^data:image\/([a-zA-Z]+);base64,(.+)$/);
    let ext = "jpg";
    let base64Data = image;
    if (matches) {
      ext = matches[1] === "png" ? "png" : "jpg";
      base64Data = matches[2];
    }

    const buffer = Buffer.from(base64Data, "base64");
    const filename = `${Date.now()}-${crypto.randomBytes(4).toString("hex")}.${ext}`;
    const subDir = folder ? path.join(UPLOADS_DIR, folder) : UPLOADS_DIR;
    if (!fs.existsSync(subDir)) fs.mkdirSync(subDir, { recursive: true });

    const filePath = path.join(subDir, filename);
    fs.writeFileSync(filePath, buffer);

    const url = `/uploads/${folder ? folder + "/" : ""}${filename}`;
    return res.json({ success: true, url });
  } catch (e) {
    console.error("[upload/image]", e.message);
    return res.status(500).json({ success: false, message: "Lỗi upload" });
  }
});

module.exports = router;
