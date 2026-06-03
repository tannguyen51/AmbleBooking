/**
 * Booking Duration Utility
 *
 * Xác định thời lượng mặc định dựa trên:
 * - Buổi ăn (Lunch/Dinner)
 * - Số lượng khách
 *
 * Bảng thời lượng (theo bookingUI.md):
 * | Buổi ăn  | Số khách | Thời lượng | Buffer | Tổng    |
 * |----------|----------|-----------|--------|---------|
 * | Lunch    | 2-4      | 90 phút   | 15 ph  | 105 ph  |
 * | Lunch    | 5-8      | 120 phút  | 20 ph  | 140 ph  |
 * | Dinner   | 2-4      | 120 phút  | 20 ph  | 140 ph  |
 * | Dinner   | 5-8      | 150 phút  | 25 ph  | 175 ph  |
 * | 9+       | 9+       | 180 phút  | 30 ph  | 210 ph  |
 *
 * Grace Period: 20 phút sau giờ đặt bàn (ân hạn)
 */

const GRACE_PERIOD_MIN = 20;

const DURATION_RULES = [
  // mealTime, minGuests, maxGuests, durationMin, bufferMin
  { mealTime: 'lunch', minGuests: 1,  maxGuests: 4,  duration: 90,  buffer: 15 },
  { mealTime: 'lunch', minGuests: 5,  maxGuests: 8,  duration: 120, buffer: 20 },
  { mealTime: 'dinner',minGuests: 1,  maxGuests: 4,  duration: 120, buffer: 20 },
  { mealTime: 'dinner',minGuests: 5,  maxGuests: 8,  duration: 150, buffer: 25 },
  // 9+ áp dụng cho cả hai buổi
  { mealTime: null,    minGuests: 9,  maxGuests: 999,duration: 180, buffer: 30 },
];

/**
 * Xác định buổi ăn dựa vào giờ
 * @param {string} time - HH:mm
 * @returns {'lunch'|'dinner'}
 */
function detectMealTime(time) {
  if (!time) return 'dinner';
  const hour = parseInt(time.split(':')[0], 10);
  if (hour >= 11 && hour < 15) return 'lunch';
  return 'dinner'; // 17:00 - 23:00
}

/**
 * Lấy thời lượng mặc định và buffer time
 * @param {string} mealTime - 'lunch' | 'dinner'
 * @param {number} partySize
 * @returns {{ duration: number, buffer: number }}
 */
function getDefaultDuration(mealTime, partySize) {
  // Ưu tiên rule 9+ trước
  if (partySize >= 9) {
    const rule = DURATION_RULES.find(r => r.minGuests === 9);
    return { duration: rule.duration, buffer: rule.buffer };
  }

  const rule = DURATION_RULES.find(
    r => r.mealTime === mealTime && partySize >= r.minGuests && partySize <= r.maxGuests
  );

  if (rule) return { duration: rule.duration, buffer: rule.buffer };

  // Fallback: dinner 2-4
  return { duration: 120, buffer: 20 };
}

/**
 * Tính expectedEndTime từ startTime + duration
 * @param {string} startTime - HH:mm
 * @param {number} durationMin - phút
 * @returns {string} HH:mm
 */
function calculateEndTime(startTime, durationMin) {
  const [h, m] = startTime.split(':').map(Number);
  const totalMinutes = h * 60 + m + durationMin;
  const endH = Math.floor(totalMinutes / 60) % 24;
  const endM = totalMinutes % 60;
  return `${String(endH).padStart(2, '0')}:${String(endM).padStart(2, '0')}`;
}

/**
 * Tính grace period end time
 * @param {string} startTime - HH:mm
 * @returns {string} HH:mm
 */
function calculateGracePeriodEnd(startTime) {
  return calculateEndTime(startTime, GRACE_PERIOD_MIN);
}

/**
 * Tính toán tất cả thông tin thời lượng cho một booking
 * @param {string} time - HH:mm
 * @param {number} partySize
 * @param {number} [adjustment] - ±30 phút (tùy chọn)
 * @returns {{
 *   mealTime: string,
 *   duration: number,
 *   buffer: number,
 *   expectedEndTime: string,
 *   gracePeriodEndTime: string,
 *   durationAdjustment: number
 * }}
 */
function computeBookingDuration(time, partySize, adjustment = 0) {
  const mealTime = detectMealTime(time);
  const { duration: baseDuration, buffer } = getDefaultDuration(mealTime, partySize);

  // Giới hạn adjustment trong ±30
  const clampedAdjustment = Math.max(-30, Math.min(30, adjustment || 0));
  const finalDuration = Math.max(60, baseDuration + clampedAdjustment);

  return {
    mealTime,
    duration: finalDuration,
    buffer,
    expectedEndTime: calculateEndTime(time, finalDuration),
    gracePeriodEndTime: calculateGracePeriodEnd(time),
    durationAdjustment: clampedAdjustment,
  };
}

/**
 * Lấy danh sách slot thời gian theo buổi ăn
 * @param {'lunch'|'dinner'} mealTime
 * @returns {string[]}
 */
function getTimeSlots(mealTime) {
  if (mealTime === 'lunch') {
    return ['11:00', '11:30', '12:00', '12:30', '13:00', '13:30'];
  }
  return ['17:00', '17:30', '18:00', '18:30', '19:00', '19:30', '20:00', '20:30'];
}

module.exports = {
  GRACE_PERIOD_MIN,
  computeBookingDuration,
  detectMealTime,
  getDefaultDuration,
  calculateEndTime,
  calculateGracePeriodEnd,
  getTimeSlots,
};
