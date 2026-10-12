# Palm River Admin

Ứng dụng Admin là frontend riêng, đăng nhập bằng Google qua Supabase Auth. Tài
liệu này mô tả kiến trúc mục tiêu đã thống nhất và phân biệt rõ với những phần
còn phải triển khai trước khi đưa Admin vào sử dụng.

## Cấu trúc project

Đây là ứng dụng JavaScript/JSX dùng Vite. Entrypoint duy nhất là
`index.html → src/main.jsx → src/App.jsx`; `vite.config.js` là cấu hình Vite
duy nhất. Các file TSX/Tailwind cũ đã được loại bỏ để không còn hai phiên bản
app và hai bộ cấu hình song song.

- `src/auth.jsx`, `src/supabase.js`: Supabase Auth và session Google OAuth.
- `src/api.js`: client gọi API Worker với access token.
- `src/pages/`: các màn hình Overview, Leads, ZNS, Realtime, Team và Login.
- `src/ui.jsx`, `src/styles.css`: component tiện ích và stylesheet dùng chung.
- `public/assets/`: logo/icon và ảnh được frontend sử dụng.
- `ADMIN-API-CONTRACT.md`: hợp đồng API mục tiêu giữa frontend và Worker.
- `DEPLOYMENT.md`: hướng dẫn build/deploy frontend.

Lệnh `npm run build` chạy Vite để tạo static assets trong `dist/`. Không có
TypeScript compiler, Tailwind hay PostCSS trong build hiện tại.

## Kiến trúc mục tiêu

```text
Admin frontend
  ├─ Đăng nhập Google qua Supabase Auth
  ├─ Gửi Supabase access token đến Cloudflare Worker
  └─ Hiển thị dữ liệu theo role; lead chỉ xem và xuất CSV
       │
       ▼
Cloudflare Worker — API riêng cho Admin
  ├─ Xác minh access token với Supabase
  ├─ Đọc danh sách admin/role từ Supabase và phân quyền ở server
  ├─ Đọc/ghi dữ liệu quản trị (ví dụ danh sách admin) trong Supabase
  └─ Chuyển tiếp yêu cầu đọc lead đến Apps Script API riêng
       │
       ├──────────────────────► Supabase
       │                         Danh sách admin, role và dữ liệu quản trị
       ▼
Apps Script API chỉ đọc
  ├─ Xác thực request nội bộ do Worker gửi
  └─ Chỉ đọc tab RAW_LEAD, không sửa lead hay quản lý admin
       │
       ▼
Google Sheet — RAW_LEAD
  Nguồn dữ liệu lead chính thức, 14 cột

Luồng ghi lead hiện tại — giữ nguyên, độc lập với Admin:
Landing page → Worker POST hiện tại → Apps Script doPost() → RAW_LEAD
```

## Ranh giới dữ liệu và quyền

- **Supabase Auth** xác thực người dùng Admin qua Google OAuth. Frontend gửi
  access token đến Worker; việc đăng nhập thành công tự nó không cấp quyền
  Admin.
- **Supabase database** lưu danh sách email admin, role và dữ liệu quản trị.
  Worker là nơi xác minh role cho mỗi request; không tin vào role do frontend
  tự gửi hoặc tự tính.
- **Admin frontend** chỉ cho phép xem danh sách/chi tiết lead và xuất CSV.
  Không cung cấp thao tác sửa lead hoặc cập nhật Sheet. Việc quản lý admin có
  thể thực hiện trong giao diện qua API Worker; Worker mới được quyền ghi danh
  sách admin/role vào Supabase.
- **Apps Script API riêng cho Admin** chỉ đọc dữ liệu từ `RAW_LEAD`. API này
  phải xác thực request nội bộ từ Worker bằng một bí mật dùng riêng giữa Worker
  và Apps Script; bí mật không được đặt trong frontend, mã nguồn công khai hoặc
  repository.
- **Apps Script `doPost()` hiện tại** tiếp tục nhận luồng ghi lead từ Worker
  như cũ. Không thay đổi giao thức hoặc hành vi này khi triển khai API đọc cho
  Admin.
- Các thông tin xác thực như Supabase service-role key và bí mật Worker–Apps
  Script chỉ được lưu phía server dưới dạng secret. Không đặt chúng trong biến
  `VITE_*`.

## Trạng thái hiện tại và phần cần làm

Kiến trúc trên là **mục tiêu**, chưa có nghĩa các endpoint đã được triển khai.
Worker hiện có trong `be/lead-webhook-worker` là Worker nhận lead công khai;
không mặc định rằng Worker này đã có API Admin, xác minh Supabase JWT, role,
hay API đọc Sheet.

Frontend Admin hiện gọi các endpoint `/admin/api/*` như mô tả trong
[`ADMIN-API-CONTRACT.md`](./ADMIN-API-CONTRACT.md). Trước production cần kiểm
tra và điều chỉnh frontend để:

1. Chỉ giữ các chức năng phù hợp với quyền chỉ đọc lead.
2. Đọc danh sách admin/role từ API được Worker bảo vệ; không dùng danh sách
   frontend làm cơ chế phân quyền.
3. Loại bỏ hoặc ẩn chức năng ghi/cập nhật lead. Chỉ bật quản lý admin khi các
   endpoint Worker lưu và kiểm tra quyền qua Supabase đã được triển khai.
4. Chỉ kết nối các màn hình dashboard, ZNS, realtime hoặc team nếu xác định rõ
   nguồn dữ liệu/API tương ứng và chúng đã có kiểm soát quyền server-side.

Các phần hạ tầng/API tiếp theo cần xác định và triển khai riêng:

1. **Supabase:** chốt schema/bảng lưu admin và role, quy tắc ai được thêm hoặc
   thu hồi admin, chính sách RLS và thao tác server-side qua Worker.
2. **Cloudflare Worker Admin API:** xác minh token Supabase; trả `401` khi token
   thiếu/không hợp lệ, `403` khi người dùng không được phép; triển khai các API
   đọc cần thiết và ghi dữ liệu quản trị vào Supabase.
3. **Apps Script API chỉ đọc:** tạo endpoint đọc `RAW_LEAD`, xác thực request
   từ Worker, giới hạn thao tác ở đọc dữ liệu; giữ nguyên `doPost()` hiện tại.
4. **Tích hợp frontend:** xác nhận route, response shape, phân trang/lọc, xuất
   CSV và CORS cho đúng domain Admin.
5. **Triển khai:** cấu hình Supabase OAuth redirect, Worker secrets và
   `VITE_API_BASE`; deploy frontend lên domain Admin sau khi API đã sẵn sàng.

## Đăng nhập và cấu hình frontend

Frontend sử dụng Supabase URL và anon/publishable key:

```env
VITE_SUPABASE_URL=https://<project-ref>.supabase.co
VITE_SUPABASE_ANON_KEY=<anon-or-publishable-key>
VITE_APP_URL=https://admin.canho-palmriver.vn
VITE_API_BASE=https://<admin-api-worker-domain>
```

`VITE_APP_URL` là URL quay về sau Google OAuth. URL này phải được thêm vào danh
sách redirect URLs cho phép trong Supabase Auth và phải trỏ đến frontend Admin
đã deploy. `VITE_API_BASE` trỏ đến API Worker có các route `/admin/api/*`;
không dùng URL Apps Script trực tiếp từ browser.

Không chia sẻ hoặc commit `.env` có credential thật. Frontend chỉ được chứa
Supabase anon/publishable key; service-role key và bí mật nội bộ chỉ được cấu
hình ở server/Worker.

## Kiểm tra trước khi phát hành

- [ ] Google OAuth quay về đúng domain Admin qua Supabase.
- [ ] Worker từ chối request thiếu/sai token (`401`) và người không có quyền
      (`403`).
- [ ] Người dùng có role phù hợp chỉ đọc được dữ liệu được phép; kiểm tra quyền
      ở Worker, không chỉ ở UI.
- [ ] Apps Script API Admin chỉ đọc tab `RAW_LEAD` và từ chối request không có
      xác thực nội bộ hợp lệ.
- [ ] Admin xem được dữ liệu và xuất CSV; không có API/UI sửa lead.
- [ ] Dữ liệu admin/role được lưu ở Supabase, không ghi vào Google Sheet.
- [ ] Landing page vẫn ghi lead qua Worker POST và Apps Script `doPost()` như
      trước; đã kiểm tra không gây hồi quy.
- [ ] CORS chỉ cho phép đúng origin Admin; không mở wildcard cho API quản trị.
- [ ] `npm run build` thành công và kiểm tra thực tế trên môi trường staging.

README này ghi lại kiến trúc và kế hoạch tích hợp; không khẳng định Worker,
Apps Script, Supabase schema, DNS hay production đã được thay đổi hoặc triển
khai.
