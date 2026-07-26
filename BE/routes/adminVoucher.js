const express = require("express");
const router = express.Router();
const { protectAdmin } = require("../middleware/adminAuth");
const voucherController = require("../controllers/adminVoucherController");

router.get("/", protectAdmin, voucherController.getVouchers);
router.post("/", protectAdmin, voucherController.createVoucher);
router.put("/:id", protectAdmin, voucherController.updateVoucher);
router.delete("/:id", protectAdmin, voucherController.deleteVoucher);

module.exports = router;
