/**
 * AI TRUTH POLICE AGENT (Mock)
 * Mạng lưới thứ 2 (Layer 2) kiểm duyệt sự thật P2P.
 * 
 * Script này cắm trực tiếp vào relay Gun.js cục bộ.
 * Khi chạy, nó sẽ tự động:
 * 1. Bơm data thô (bài viết) vào Layer 1 (`data/makai/feed`)
 * 2. Phân tích bài viết (giả lập) và bơm dấu kiểm duyệt AI vào Layer 2 (`ai_verification/makai/feed`)
 */

const Gun = require('gun');
require('gun/lib/radix');
require('gun/lib/radisk');
require('gun/lib/store');

// Kết nối thẳng tới trạm trung chuyển (Relay) đang chạy của MAKAI
const gun = Gun({ peers: ['http://localhost:3400/gun'] });

console.log('🛡️  [AI TRUTH POLICE] Tỉnh thức. Đang quét mạng P2P...');

const PATH = 'makai/feed';

// 1. NGƯỜI DÙNG: Bơm tin đồn vào Layer 1
const rawData = {
  author: '@sotatek_founder',
  content: 'Sản phẩm MAKAI sắp tung ra tính năng Cảnh Sát Sự Thật AI (Network-in-Network). 1 máy tính bật là mạng lưới sống!',
  timestamp: Date.now(),
};

// 2. AI AGENT: Hệ thống miễn dịch phi tập trung xác nhận (Layer 2)
const aiVerification = {
  status: 'Trust',
  confidence: 99.8,
  agent_id: 'Basao_SafeBlock_AI_v1',
  rationale: '[SYSTEM] Dữ liệu khớp với định dạng Bát Nhã. Thuật toán đồng thuận đánh giá thông điệp mang tính chất xây dựng. (SafeBlock: Mức Độ 1)',
  timestamp: Date.now()
};

console.log(`\n📡 [NODE] Đang phát tán dữ liệu thô (Layer 1) vào: data/${PATH}`);
gun.get(`data/${PATH}`).put(rawData, (ack) => {
  if (ack.err) {
    console.error('❌ Lỗi Layer 1:', ack.err);
  } else {
    console.log('✅ Layer 1 phát sóng thành công!');
    
    // AI duyệt xong -> Đóng dấu
    console.log(`\n🛡️  [AI AGENT] Đang đóng dấu Sự Thật (Layer 2) vào: ai_verification/${PATH}`);
    gun.get(`ai_verification/${PATH}`).put(aiVerification, (ack2) => {
      if (ack2.err) {
        console.error('❌ Lỗi Layer 2:', ack2.err);
      } else {
        console.log('✅ Layer 2: Dấu thập tự AI đã được khắc lên mạng P2P!');
        console.log('\n=============================================');
        console.log('📱 Bây giờ anh hãy mở app Trusking trên điện thoại');
        console.log('   và gõ lệnh: truth://makai/feed');
        console.log('   để xem Trình duyệt tự gộp cả 2 lớp dữ liệu lại nhé!');
        console.log('=============================================\n');
        
        // Để network kịp đồng bộ, thoát sau 2 giây
        setTimeout(() => process.exit(0), 2000);
      }
    });
  }
});
