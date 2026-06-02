const { PayOS } = require("@payos/node");

const payos = new PayOS({
  clientId: process.env.PAYMENT_PAYOS_CLIENT_ID,
  apiKey: process.env.PAYMENT_PAYOS_API_KEY,
  checksumKey: process.env.PAYMENT_PAYOS_CHECKSUM_KEY,
});

module.exports = payos;
