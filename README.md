# Trusking - Tìm Sự Thật 🛡️
*(Tên cũ: BrowserOS Mobile)*

**Trusking** là một Trình duyệt Di động (Mobile Browser) siêu nhẹ mã nguồn mở, được thiết kế đặc biệt cho kỷ nguyên Internet Phi Tập Trung (P2P). Tầm nhìn cốt lõi của Trusking là giải phóng thông tin khỏi các máy chủ tập trung: **"Chỉ cần 1 máy tính/điện thoại còn bật trên thế giới, mạng lưới Sự Thật vẫn còn sống."**

Trusking là một phần quan trọng trong **Hệ sinh thái Basao (BPT Land / MAKAI / SafeBlock)**, tập trung vào việc áp dụng triết lý "7 Lớp Sự Thật" vào hạ tầng truyền thông Internet.

---

## 🌟 Tầm Nhìn (Vision) & Kiến Trúc Lõi (Core Architecture)

Trusking từ bỏ cấu trúc WebKit 30GB+ nặng nề để hướng tới một trải nghiệm Mobile-First cực nhẹ, tận dụng WebView có sẵn của hệ điều hành. Tuy nhiên, sức mạnh thực sự nằm ở **Lõi Phân Tán P2P (Decentralized Core)**.

### 1. Trình Duyệt Nội Tại P2P
Trusking không chỉ là một ứng dụng dùng để xem (Consumer), mà bên trong nó ngầm chạy một "Trạm Phát Sóng" (Node) sử dụng công nghệ `Gun.js`.
- Bất kỳ thiết bị nào cài Trusking đều phân tán dữ liệu cho nhau trực tiếp (Mesh Network).
- Nếu nhập link URL truyền thống (`https://`), nó hoạt động như Chrome/Safari.
- Nếu nhập link Sự Thật (`truth://` hoặc `trusking://`), nó ngắt kết nối Internet Server và tải dữ liệu P2P từ các điện thoại xung quanh.

### 2. Kiến trúc Mạng-Trong-Mạng (Network-in-Network): AI Truth Police
Trái tim của hệ sinh thái Sự Thật là **Cảnh sát AI (AI Truth Police)**. 
Trusking vận hành đồng thời 2 lớp mạng lưới (Graph Layers):
- **Layer 1 (Data):** Nơi người dùng phát tán nội dung tự do.
- **Layer 2 (Verification):** Nơi các Autonomous AI Agents (chạy hoàn toàn độc lập với tư cách là một Node) dùng LLM để phân tích ngữ cảnh của thông tin tại Layer 1, từ đó "Đóng dấu Sự thật" (✅ Trust, 🛡️ Safe, ❌ Fake).
- **Trình Duyệt Hiển Thị:** Trusking tự động gộp (merge) Layer 1 và Layer 2, hiển thị bài viết gốc kèm Huy hiệu Xác minh của AI một cách minh bạch, **không ai có thể giả mạo hay thay đổi**.

### 3. Tương Lai: Browser Truth Verification Engine (BTVE)
Trusking hướng tới việc biến mỗi trình duyệt thành một **Truth Node** trong mạng lưới *Truth Graph*, bằng cách áp dụng thuật toán chấm điểm sự thật phân tán trực tiếp trên thiết bị (Local-First):

$$TruthScore(claim) = \sum (Trust(node) \times EvidenceWeight \times Proximity)$$

- **Nguyên lý hoạt động:** Khi một tin đồn (Claim) xuất hiện, Trusking Broadcast yêu cầu xác minh (Verification Request) ra mạng lưới xung quanh.
- Các Node gần tâm chấn tự động đóng góp bằng chứng thực địa (Ảnh, Video được ký bằng WebCrypto để chống fake metadata). Trình duyệt của Cảnh sát AI hoặc của Người đọc sẽ tự động chấm điểm Sự thật dựa trên chất lượng bằng chứng và uy tín của các Node đóng góp.
- **Mật độ lan truyền:** Tin đồn lan truyền quá nhanh mà không có bằng chứng gốc sẽ tự động bị dán nhãn ⚠️ Cảnh Báo Đỏ, biến mạng xã hội từ nơi *Lan truyền cảm xúc* thành mạng lưới *Chứng minh sự thật*.

---

## 🚀 Hướng Dẫn Kỹ Thuật (Getting Started)

Dự án được viết bằng **React Native (Expo)** để duy trì dung lượng cực nhẹ và chạy trên cả 2 nền tảng iOS & Android.

### Chạy Dự Án
1. Cài đặt các thư viện:
   ```bash
   npm install
   ```
2. Chạy ứng dụng trên máy ảo hoặc điện thoại thật (cần App *Expo Go*):
   ```bash
   npx expo start
   ```

### Chạy Node Cảnh Sát AI (Mock)
Để thử nghiệm tính năng Mạng-Trong-Mạng, hãy chạy script bơm dữ liệu mô phỏng AI Agent:
```bash
node ai_agent_mock.js
```
Sau đó mở ứng dụng, gõ vào thanh URL:
`truth://makai/feed`

---

> 🪷 *"Bát Nhã soi tâm – Trí tuệ dẫn đường"*
