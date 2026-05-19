const paymentConfig = {
  bankCode: process.env.VIETQR_BANK_CODE || "TCB",
  accountNumber: process.env.VIETQR_ACCOUNT_NUMBER || "",
  accountName: process.env.VIETQR_ACCOUNT_NAME || "",
  template: process.env.VIETQR_TEMPLATE || "compact2",
  imageBase: process.env.VIETQR_IMAGE_BASE || "https://img.vietqr.io/image",
  contentPrefix: process.env.PAYMENT_CONTENT_PREFIX || "AMBLE",
};

module.exports = paymentConfig;
