const https = require("https");

const EXPO_PUSH_URL = "https://exp.host/--/api/v2/push/send";

/**
 * Gửi push notification qua Expo Push API
 * @param {string} expoPushToken - Expo push token của người nhận
 * @param {string} title - Tiêu đề thông báo
 * @param {string} body - Nội dung thông báo
 * @param {object} data - Dữ liệu đính kèm (type, bookingId, ...)
 * @returns {Promise<object>}
 */
function sendPushNotification(expoPushToken, title, body, data = {}) {
  if (!expoPushToken || !expoPushToken.startsWith("ExponentPushToken")) {
    console.warn("[push] invalid token:", expoPushToken?.slice(0, 20));
    return Promise.resolve(null);
  }

  const message = {
    to: expoPushToken,
    sound: "notification.wav",
    title,
    body,
    data: { type: "new_booking", ...data },
    priority: "high",
    channelId: "default",
    _displayInForeground: true,
  };

  return new Promise((resolve, reject) => {
    const req = https.request(
      EXPO_PUSH_URL,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
      },
      (res) => {
        let body = "";
        res.on("data", (chunk) => (body += chunk));
        res.on("end", () => {
          try {
            const result = JSON.parse(body);
            // Check if token is invalid
            if (result.data?.status === "error") {
              console.warn("[push] send error:", result.data.message);
            }
            resolve(result);
          } catch {
            resolve(null);
          }
        });
      },
    );

    req.on("error", (err) => {
      console.warn("[push] request error:", err.message);
      reject(err);
    });

    req.write(JSON.stringify(message));
    req.end();
  });
}

module.exports = { sendPushNotification };
