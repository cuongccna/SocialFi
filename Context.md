\# PROJECT: CryptoCrush - SocialFi Dating Telegram Mini App



\## 1. Project Vision



Ứng dụng hẹn hò kết hợp đầu tư tài chính (SocialFi) trên Telegram.



\* \*\*Core Concept:\*\* Biến User thành "Token" và Mối quan hệ thành "Hợp đồng thông minh".

\* \*\*Target:\*\* Gen Z, Crypto Traders, Degens.

\* \*\*Key Mechanics:\*\* Swipe-to-Earn, Profile Market Cap, Prediction Markets for Couples, Jury DAO.



\## 2. Tech Stack (Non-negotiable)



\* \*\*Frontend:\*\* React + Vite (TypeScript).

\* \*\*UI/UX:\*\* TailwindCSS, Shadcn/UI, \*\*Framer Motion\*\* (Bắt buộc cho Animation Swipe \& Particle Effects).

\* \*\*Telegram Integration:\*\* `@telegram-apps/sdk`, `@tonconnect/ui-react`.

\* \*\*Backend:\*\* Node.js (Express).

\* \*\*Database:\*\* \*\*PostgreSQL\*\* + \*\*PostGIS\*\* Extension (Sử dụng Raw SQL hoặc Knex.js).

\* \*\*Bot logic:\*\* `grammy.js` (Để xử lý thông báo và chat ẩn danh).



---



\## 3. Database Schema Strategy (PostgreSQL)



\### A. Core User \& Assets



\* \*\*`users`\*\*:

\* `id` (UUID), `telegram\_id` (BigInt, Unique).

\* `location` (GEOGRAPHY Point).

\* `wallet\_address`, `wallet\_rank` (Whale/Shark/Shrimp).

\* `market\_price` (Float - Default 10.0), `price\_change\_24h` (Float).

\* `balance\_love` (Decimal - Token nội bộ).







\### B. Dating \& Matching



\* \*\*`swipes`\*\*: `actor\_id`, `target\_id`, `action` (LIKE/PASS/SUPER), `timestamp`.

\* \*\*`relationships`\*\* (Matches):

\* `id` (UUID), `user\_a`, `user\_b`.

\* `status`: 'MATCHED', 'MINTED\_CONTRACT', 'BURNED\_CONTRACT'.

\* `start\_date`, `contract\_address` (Fake/Simulated for MVP).







\### C. SocialFi Modules (The "Crazy" Features)



\* \*\*`prediction\_markets`\*\* (Sàn cược):

\* `relationship\_id`, `expiry\_date`.

\* `pool\_long` (Tiền cược bền lâu), `pool\_short` (Tiền cược chia tay).

\* `status`: 'OPEN', 'PAYOUT\_LONG', 'PAYOUT\_SHORT'.





\* \*\*`bets`\*\*: `user\_id`, `market\_id`, `position` (LONG/SHORT), `amount`.

\* \*\*`disputes`\*\* (Kiện cáo):

\* `relationship\_id`, `plaintiff\_id`, `defendant\_id`.

\* `evidence\_content`, `status` (VOTING).





\* \*\*`jury\_votes`\*\*: `dispute\_id`, `juror\_id`, `vote\_side`.



---



\## 4. Feature Modules \& Business Logic



\### Module 1: The Feed (Sàn Giao Dịch Con Người)



\* \*\*Swipe Logic:\*\*

\* Swipe Right (LONG) -> Tăng `market\_price` user kia +0.5%.

\* Swipe Left (SHORT) -> Giảm `market\_price` user kia -0.2%.

\* Match -> Pump mạnh 5%.





\* \*\*Geo-Query:\*\* Luôn dùng PostGIS `ST\_DWithin` để tìm user trong bán kính X km, loại trừ những người đã swipe.

\* \*\*Reward:\*\* Mỗi lượt Swipe nhận 1 $LOVE (Mining).



\### Module 2: Anonymous Connection (Bot Relay)



\* \*\*KHÔNG xây dựng Real-time Chat trong App.\*\*

\* \*\*Flow:\*\* User A nhắn trong App -> Backend gọi Bot Telegram -> Bot gửi tin nhắn cho User B.

\* \*\*Privacy Feature (Blur-to-Earn):\*\*

\* Ảnh gửi qua Bot mặc định bị làm mờ (Blur).

\* Người nhận phải trả $LOVE hoặc Stars để xem ảnh rõ nét (Unblur).







\### Module 3: Love Contract \& Betting (Sàn Cược)



\* \*\*Mint Contract:\*\* 2 User match nhau có thể "Mint NFT Tình Yêu".

\* \*\*Betting:\*\*

\* Cộng đồng đặt cược vào độ bền của Contract này.

\* Nếu Contract bị "Burn" (Chia tay) trước hạn -> Đội SHORT ăn hết tiền đội LONG.

\* Nếu Contract tồn tại qua hạn -> Đội LONG ăn tiền.







\### Module 4: Jury DAO (Tòa Án)



\* \*\*Cơ chế:\*\* Biến các vụ tranh chấp thành một dạng "Swipe Feed".

\* User đóng vai Bồi thẩm đoàn: Vuốt Trái (Bênh User A), Vuốt Phải (Bênh User B).

\* Bên thắng kiện được cộng điểm uy tín, bên thua bị phạt $LOVE.



---



\## 5. UI/UX Guidelines



\* \*\*Theme:\*\* Dark Mode, Cyberpunk, Neon Green/Red (Trading style).

\* \*\*Vibe:\*\* Tài chính, FOMO, High-tech.

\* \*\*Terminology:\*\* Dùng từ ngữ Crypto (Long, Short, Pump, Dump, Liquidity, Whale) thay cho từ ngữ hẹn hò truyền thống.



---





