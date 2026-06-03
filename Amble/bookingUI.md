✅ TỔNG HỢP HOÀN CHỈNH QUY TRÌNH & UI/UX ĐẶT BÀN NHÀ HÀNG


1. Tổng quan Quy trình Đặt Bàn
Mục tiêu: Kết hợp giữa thời lượng mặc định + linh hoạt + quyền kiểm soát của nhà hàng, giúp tối ưu tỷ lệ lấp đầy bàn và giảm no-show.
2. Khung giờ hoạt động

Buổi Trưa (Lunch): 11:00 – 15:00
Buổi Tối (Dinner): 17:00 – 23:00

Slot thời gian gợi ý:

Trưa: 11:00, 11:30, 12:00, 12:30, 13:00, 13:30
Tối: 17:00, 17:30, 18:00, 18:30, 19:00, 19:30, 20:00, 20:30

Markdown### 3. Thời lượng mặc định (Default Duration)

| Buổi ăn     | Số lượng khách | Thời lượng mặc định | Buffer Time (dọn bàn) | Tổng chiếm bàn |
|-------------|----------------|---------------------|-----------------------|----------------|
| Lunch       | 2-4 người      | **90 phút**        | 15 phút              | 105 phút      |
| Lunch       | 5-8 người      | **120 phút**       | 20 phút              | 140 phút      |
| Dinner      | 2-4 người      | **120 phút**       | 20 phút              | 140 phút      |
| Dinner      | 5-8 người      | **150 phút**       | 25 phút              | 175 phút      |
| Nhóm lớn    | 9+ người       | **180 phút**       | 30 phút              | 210 phút      |

**Grace Period (Ân hạn):** **20 phút** sau giờ đặt bàn.


4. Quy trình Đặt bàn cho Khách

Khách chọn nhà hàng → Chọn ngày → Chọn ca (Trưa/Tối).
Chọn slot giờ + số lượng khách.
Hệ thống tự động áp dụng thời lượng mặc định và hiển thị rõ:
"Thời gian dự kiến: 18:00 – 20:00 (120 phút)"
Khách có thể chỉnh: Ăn nhanh (-30 phút) hoặc Ăn lâu hơn (+30 phút).
Xác nhận → Hệ thống Soft Hold bàn.
Gửi xác nhận kèm thông báo grace period 20 phút.


5. UI/UX cho Role Nhà hàng (Restaurant Staff & Manager)
Thiết kế chung

Phong cách: Clean, Modern, dễ nhìn.
Màu trạng thái bàn:
Xanh lá: Available (Trống)
Vàng: Reserved (Đã đặt)
Đỏ cam: Occupied (Đang dùng)
Xám: Cleaning (Đang dọn)
Cam sáng: Late (Quá grace period)
Tím: VIP


Màn hình chính - Dashboard

Header: Tên nhà hàng + Ca hiện tại + Ngày
4 Cards thống kê: Bàn đang dùng, Booking hôm nay, Khách dự kiến, Tỷ lệ lấp đầy
Sơ đồ bàn mini
Danh sách booking sắp tới

Sơ đồ bàn (Floor Plan)

Hiển thị theo khu vực (tab: Tầng 1, Ngoài trời, VIP…)
Mỗi bàn hiển thị: Số bàn, Số khách, Thời gian đã ngồi, Dự kiến rời đi
Nhấn bàn → Bottom Sheet hiện chi tiết + các nút hành động lớn (Check-in, Checkout, Release bàn…)

Màn hình Bookings

Filter: Hôm nay, Ca trưa, Ca tối, Late, No-show
Danh sách card: Giờ đặt, Tên khách, Số khách, Trạng thái
Hỗ trợ Swipe nhanh: Check-in / Release


6. Luồng Release Bàn (Chỉ Owner & Manager)
Quyền: Chỉ Chủ nhà hàng (Owner) và Quản lý (Manager) mới có quyền Release bàn thủ công. Nhân viên thường không được phép.
Các trường hợp Release

Khách không đến (No-show)
Khách đến muộn quá 20 phút
Khách hủy
Release thủ công (bàn hỏng, dọn khẩn…)

Luồng thực hiện

Vào Tab Đặt bàn → Tìm booking.
Nhấn vào booking cần release.
Nhấn nút “Release bàn” (nút đỏ).
Hệ thống hiện Popup xác nhận:Popup Release Bàn
Tiêu đề: Giải phóng bàn (màu đỏ)
Thông tin: Số bàn, Tên khách, Giờ đặt, Thời gian hiện tại (đã muộn bao nhiêu phút)
Chọn lý do (bắt buộc):
Khách không đến (No-show)
Khách đến muộn
Khách yêu cầu hủy
Bàn cần dọn khẩn cấp
Khác

Ô ghi chú (tùy chọn)
Nút Xác nhận Release (đỏ lớn)

Sau khi xác nhận:
Bàn chuyển ngay sang Available (hoặc Cleaning)
Booking chuyển trạng thái Released / No-show
Ghi log lịch sử đầy đủ
(Tùy chọn) Gửi thông báo cho khách


Auto Release

Hệ thống có thể tự động release sau 20 phút grace period (Owner/Manager bật/tắt được trong Cài đặt).


7. Trạng thái Bàn

Available → Trống
Reserved → Đã đặt
Occupied → Đang có khách (sau Check-in)
Cleaning → Đang dọn (buffer time)
Released → Đã giải phón