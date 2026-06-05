# Restaurant Booking App Analytics Metrics

## 1. USER ACTIVITY METRICS

| Metric          | Đo cái gì?                                | Vì sao quan trọng?                          |
| --------------- | ----------------------------------------- | ------------------------------------------- |
| Total Users     | Tổng số user đã đăng ký                   | Biết app có bao nhiêu người dùng            |
| Active Users    | Số user có dùng app trong ngày/tuần/tháng | Biết app có giữ được người dùng không       |
| New Users       | Số user mới đăng ký                       | Đo mức tăng trưởng                          |
| Returning Users | User quay lại dùng app                    | Biết app có đủ hữu ích để họ quay lại không |

---

## 2. SEARCH & DISCOVERY METRICS

| Metric                  | Đo cái gì?                   | Vì sao quan trọng?                                       |
| ----------------------- | ---------------------------- | -------------------------------------------------------- |
| Total Searches          | Tổng số lượt search          | Biết user có nhu cầu tìm nhà hàng không                  |
| Popular Keywords        | Từ khóa user tìm nhiều nhất  | Hiểu user thích gì: rooftop, Đà Lạt view, Korean BBQ,... |
| Filter Usage            | User dùng filter nào nhiều   | Biết filter nào có giá trị nhất                          |
| Restaurant Detail Views | Số lượt bấm vào xem nhà hàng | Đo mức độ quan tâm sau khi search                        |

---

## 3. BOOKING FUNNEL METRICS

| Step   | Metric            | Ý nghĩa                   |
| ------ | ----------------- | ------------------------- |
| Step 1 | Search Started    | User bắt đầu tìm nhà hàng |
| Step 2 | Restaurant Viewed | User bấm vào xem chi tiết |
| Step 3 | Table Selected    | User chọn bàn             |
| Step 4 | Booking Submitted | User gửi yêu cầu đặt bàn  |
| Step 5 | Booking Confirmed | Đặt bàn thành công        |

### Booking Funnel Conversion

| Metric                               | Công thức                             |
| ------------------------------------ | ------------------------------------- |
| Search → View Conversion             | Restaurant Viewed / Search Started    |
| View → Table Selection Conversion    | Table Selected / Restaurant Viewed    |
| Table Selection → Booking Conversion | Booking Submitted / Table Selected    |
| Booking Success Rate                 | Booking Confirmed / Booking Submitted |

---

## 4. TABLE SELECTION METRICS

| Metric                   | Đo cái gì?                    | Vì sao quan trọng?                           |
| ------------------------ | ----------------------------- | -------------------------------------------- |
| Most Selected Table Type | Loại bàn được chọn nhiều nhất | Biết user thích VIP, view đẹp hay standard   |
| Table View Clicks        | Số lượt xem hình bàn          | Chứng minh visual table selection có giá trị |
| VIP Table Bookings       | Số lượt đặt bàn VIP           | Đo tiềm năng doanh thu từ bàn premium        |
| Standard Table Bookings  | Số lượt đặt bàn thường        | So sánh nhu cầu giữa các loại bàn            |

---

## 5. CANCELLATION & NO-SHOW METRICS

| Metric                      | Đo cái gì?                         | Vì sao quan trọng?                             |
| --------------------------- | ---------------------------------- | ---------------------------------------------- |
| Cancellation Rate           | Tỷ lệ booking bị hủy               | Biết có vấn đề trong trải nghiệm đặt bàn không |
| Cancellation Reasons        | Lý do hủy                          | Dùng để cải thiện app                          |
| No-show Rate                | User đặt nhưng không đến           | Quan trọng với restaurant partner              |
| Deposit Lost Warning Clicks | User có đọc cảnh báo mất cọc không | Đo hiệu quả thông báo trước khi hủy            |

---

## 6. AI ASSISTANT METRICS

| Metric                   | Đo cái gì?                      | Vì sao quan trọng?                                           |
| ------------------------ | ------------------------------- | ------------------------------------------------------------ |
| AI Chat Started          | Số lần user mở AI assistant     | Biết user có dùng AI không                                   |
| AI Recommendation Clicks | User bấm vào nhà hàng AI gợi ý  | Đo chất lượng gợi ý                                          |
| AI to Booking Conversion | Từ AI chat chuyển thành booking | Chứng minh AI giúp tăng booking                              |
| Common User Requests     | User thường hỏi gì              | Hiểu nhu cầu: date night, birthday, cheap food, view đẹp,... |

---

## 7. ENGAGEMENT METRICS

| Metric             | Đo cái gì?                     | Vì sao quan trọng?          |
| ------------------ | ------------------------------ | --------------------------- |
| Favorites Added    | Số nhà hàng được lưu yêu thích | Biết restaurant nào hấp dẫn |
| Reviews Submitted  | Số review user viết            | Tạo social proof cho app    |
| Photo Reviews      | Review có hình ảnh             | Giúp app đáng tin hơn       |
| Reward Points Used | User có dùng điểm thưởng không | Đo hiệu quả loyalty system  |

---

## 8. PEAK HOURS & BOOKING DEMAND METRICS

### Mục tiêu

Theo dõi thời điểm khách hàng đặt bàn nhiều nhất theo ngày và theo khung giờ để nhà hàng tối ưu nhân sự, bàn trống và chiến dịch marketing.

### Metrics

| Metric                      | Đo cái gì?                          | Vì sao quan trọng?              |
| --------------------------- | ----------------------------------- | ------------------------------- |
| Total Bookings per Day      | Tổng số booking theo từng ngày      | Xác định ngày đông khách nhất   |
| Total Bookings per Hour     | Tổng số booking theo từng giờ       | Xác định giờ cao điểm           |
| Peak Booking Day            | Ngày có lượng booking cao nhất      | Lập kế hoạch vận hành           |
| Peak Booking Hour           | Khung giờ có lượng booking cao nhất | Điều phối nhân viên hiệu quả    |
| Weekend vs Weekday Bookings | So sánh cuối tuần và ngày thường    | Hiểu hành vi khách hàng         |
| Lunch Bookings              | Booking trong giờ ăn trưa           | Đo nhu cầu bữa trưa             |
| Dinner Bookings             | Booking trong giờ ăn tối            | Đo nhu cầu bữa tối              |
| Booking Lead Time           | Thời gian đặt trước trung bình      | Hiểu hành vi đặt bàn            |
| Fully Occupied Time Slots   | Khung giờ hết bàn                   | Đánh giá nhu cầu vượt công suất |

### Booking Distribution By Day

| Day       | Booking Count |
| --------- | ------------- |
| Monday    |               |
| Tuesday   |               |
| Wednesday |               |
| Thursday  |               |
| Friday    |               |
| Saturday  |               |
| Sunday    |               |

### Booking Distribution By Hour

| Time Slot     | Booking Count |
| ------------- | ------------- |
| 08:00 - 09:00 |               |
| 09:00 - 10:00 |               |
| 10:00 - 11:00 |               |
| 11:00 - 12:00 |               |
| 12:00 - 13:00 |               |
| 13:00 - 14:00 |               |
| 14:00 - 15:00 |               |
| 15:00 - 16:00 |               |
| 16:00 - 17:00 |               |
| 17:00 - 18:00 |               |
| 18:00 - 19:00 |               |
| 19:00 - 20:00 |               |
| 20:00 - 21:00 |               |
| 21:00 - 22:00 |               |

### Peak Demand Summary

| Metric                 | Value |
| ---------------------- | ----- |
| Peak Booking Day       |       |
| Peak Booking Hour      |       |
| Average Daily Bookings |       |
| Weekend Booking Ratio  |       |
| Lunch Peak Time        |       |
| Dinner Peak Time       |       |

---

## 9. RESTAURANT BUSINESS METRICS (Recommended)

| Metric                  | Đo cái gì?                             | Vì sao quan trọng?                   |
| ----------------------- | -------------------------------------- | ------------------------------------ |
| Seat Occupancy Rate     | % số ghế được sử dụng                  | Đánh giá hiệu quả khai thác bàn      |
| Table Turnover Rate     | Số lần một bàn được sử dụng trong ngày | Tăng hiệu quả vận hành               |
| Revenue per Time Slot   | Doanh thu theo từng khung giờ          | Xác định giờ vàng                    |
| Booking Rejection Rate  | Tỷ lệ từ chối booking do hết bàn       | Đánh giá nhu cầu vượt công suất      |
| Average Party Size      | Số khách trung bình mỗi booking        | Hỗ trợ sắp xếp bàn                   |
| Average Booking Value   | Giá trị trung bình mỗi booking         | Theo dõi doanh thu                   |
| Deposit Conversion Rate | Tỷ lệ khách thanh toán cọc             | Đánh giá hiệu quả chính sách đặt bàn |
| Repeat Booking Rate     | Tỷ lệ khách đặt lại                    | Đo mức độ trung thành                |
|                         |                                        |                                      |