// Import emoji mapping mới
const { VATPHAM_EMOJI_MAP } = require('./vatphamEmojis');

// Dữ liệu farming từ FARM.txt (đã giảm tỉ lệ drop) - Updated với emoji mới + vật phẩm đặc biệt
const FARM_MATERIALS = {
    // Nguyên liệu cơ bản (từ FARM.txt)
    1: { name: 'bạch ngọc sương', dropRate: 30, icon: VATPHAM_EMOJI_MAP.BACH_NGOC_SUONG, fallbackIcon: '🔮' },
    2: { name: 'tụ linh thảo', dropRate: 18, icon: VATPHAM_EMOJI_MAP.TU_LINH_THAO, fallbackIcon: '🌿' },
    3: { name: 'tử hoa thảo', dropRate: 16, icon: VATPHAM_EMOJI_MAP.TU_HOA_THAO, fallbackIcon: '🟣' },
    4: { name: 'hồng tú hoa', dropRate: 14, icon: VATPHAM_EMOJI_MAP.HONG_TU_HOA, fallbackIcon: '🌺' },
    5: { name: 'ngũ sắc hoa', dropRate: 6, icon: VATPHAM_EMOJI_MAP.NGU_SAC_HOA, fallbackIcon: '🍃' },
    6: { name: 'ngũ sắc thạch', dropRate: 3, icon: VATPHAM_EMOJI_MAP.NGU_SAC_THACH, fallbackIcon: '🌈' },
    7: { name: 'huyết ngọc hoa', dropRate: 2, icon: VATPHAM_EMOJI_MAP.HUYET_NGOC_HOA, fallbackIcon: '🩸' },
    
    // Đan phương cơ bản (cần thiết để craft đan dược)
    dp1: { name: 'Hạ phẩm đan phương', dropRate: 4, icon: VATPHAM_EMOJI_MAP.DAN_PHUONG_HA_PHAM, fallbackIcon: '📜' },
    pdp: { name: 'Phiên đan phương', dropRate: 1.5, icon: VATPHAM_EMOJI_MAP.PHIEN_DAN_PHUONG, fallbackIcon: '📈' },
    dl: { name: 'Đan lò', dropRate: 3, icon: VATPHAM_EMOJI_MAP.DAN_LO, fallbackIcon: '🏺' },
    
    // Tụ linh thạch (cần thiết để fusion linh thạch)
    tlt: { name: 'Tụ linh thạch', dropRate: 1, icon: VATPHAM_EMOJI_MAP.TU_LINH_THACH, fallbackIcon: '💫' },
    
    // Linh thạch cơ bản (tỉ lệ thấp, bổ sung cho breakthrough)
    lt1: { name: 'Hạ phẩm linh thạch', dropRate: 1, icon: VATPHAM_EMOJI_MAP.LINH_THACH_HA_PHAM, fallbackIcon: '💎' }
};

const MEDICINES = {
    // Thuốc (z series) - từ FARM.txt  
    z1: { name: 'Thuốc cấp 1', icon: VATPHAM_EMOJI_MAP.DAN_DUOC_HA_PHAM, fallbackIcon: '💊', level: 1 },
    z2: { name: 'Thuốc cấp 2', icon: VATPHAM_EMOJI_MAP.DAN_DUOC_TRUNG_PHAM, fallbackIcon: '💉', level: 2 },
    z3: { name: 'Thuốc cấp 3', icon: VATPHAM_EMOJI_MAP.DAN_DUOC_THUONG_PHAM, fallbackIcon: '🧪', level: 3 },
    z4: { name: 'Thuốc cấp 4', icon: VATPHAM_EMOJI_MAP.DAN_DUOC_TIEN_PHAM, fallbackIcon: '⚗️', level: 4 },
    
    // Đan dược (d series) - từ ghép (1).txt
    d1: { name: 'Hạ phẩm đan dược', icon: VATPHAM_EMOJI_MAP.DAN_DUOC_HA_PHAM, fallbackIcon: '💊', level: 1 },
    d2: { name: 'Trung phẩm đan dược', icon: VATPHAM_EMOJI_MAP.DAN_DUOC_TRUNG_PHAM, fallbackIcon: '💉', level: 2 },
    d3: { name: 'Thượng phẩm đan dược', icon: VATPHAM_EMOJI_MAP.DAN_DUOC_THUONG_PHAM, fallbackIcon: '🧪', level: 3 },
    d4: { name: 'Tiên phẩm đan dược', icon: VATPHAM_EMOJI_MAP.DAN_DUOC_TIEN_PHAM, fallbackIcon: '⚗️', level: 4 },
    
    // Đan phương và đan lò (dp/dl series)
    dp1: { name: 'Hạ phẩm đan phương', icon: VATPHAM_EMOJI_MAP.DAN_PHUONG_HA_PHAM, fallbackIcon: '📜', level: 1 },
    dp2: { name: 'Trung phẩm đan phương', icon: VATPHAM_EMOJI_MAP.DAN_PHUONG_TRUNG_PHAM, fallbackIcon: '📃', level: 2 },
    dp3: { name: 'Thượng phẩm đan phương', icon: VATPHAM_EMOJI_MAP.DAN_PHUONG_THUONG_PHAM, fallbackIcon: '📋', level: 3 },
    dp4: { name: 'Tiên phẩm đan phương', icon: VATPHAM_EMOJI_MAP.DAN_PHUONG_TIEN_PHAM, fallbackIcon: '📊', level: 4 },
    pdp: { name: 'Phiên đan phương', icon: VATPHAM_EMOJI_MAP.PHIEN_DAN_PHUONG, fallbackIcon: '📈', level: 0 },
    dl: { name: 'Đan lò', icon: VATPHAM_EMOJI_MAP.DAN_LO, fallbackIcon: '🏺', level: 0 }
};

// Linh thạch và đan phương - để mở rộng sau
const SPIRIT_STONES = {
    lt1: { name: 'Hạ phẩm linh thạch', icon: VATPHAM_EMOJI_MAP.LINH_THACH_HA_PHAM, fallbackIcon: '💎' },
    lt2: { name: 'Trung phẩm linh thạch', icon: VATPHAM_EMOJI_MAP.LINH_THACH_TRUNG_PHAM, fallbackIcon: '💍' },
    lt3: { name: 'Thượng phẩm linh thạch', icon: VATPHAM_EMOJI_MAP.LINH_THACH_THUONG_PHAM, fallbackIcon: '💠' },
    lt4: { name: 'Tiên phẩm linh thạch', icon: VATPHAM_EMOJI_MAP.LINH_THACH_TIEN_PHAM, fallbackIcon: '🔸' },
    tlt: { name: 'Tụ linh thạch', icon: VATPHAM_EMOJI_MAP.TU_LINH_THACH, fallbackIcon: '💫' }
};

// Linh đan, linh dược và sách chỉ có thể mua từ shop
const SHOP_ITEMS = {
    // Linh đan series (dùng linh thạch mua) - sử dụng đan dược emoji
    ld1: { 
        name: 'Hạ phẩm linh đan', 
        icon: VATPHAM_EMOJI_MAP.DAN_DUOC_HA_PHAM, 
        fallbackIcon: '🟢',
        price: 100, 
        currency: 'lt1',
        category: 'medicine',
        description: 'Linh đan cấp thấp nhất, tăng EXP tu luyện'
    },
    ld2: { 
        name: 'Trung phẩm linh đan', 
        icon: VATPHAM_EMOJI_MAP.DAN_DUOC_TRUNG_PHAM, 
        fallbackIcon: '🔵',
        price: 1000, 
        currency: 'lt1',
        category: 'medicine',
        description: 'Linh đan trung bình, tăng nhiều EXP hơn'
    },
    ld3: { 
        name: 'Thượng phẩm linh đan', 
        icon: VATPHAM_EMOJI_MAP.DAN_DUOC_THUONG_PHAM, 
        fallbackIcon: '🟣',
        price: 5000, 
        currency: 'lt2',
        category: 'medicine',
        description: 'Linh đan cấp cao, tăng EXP và tỉ lệ đột phá'
    },
    ld4: { 
        name: 'Tiên phẩm linh đan', 
        icon: VATPHAM_EMOJI_MAP.DAN_DUOC_TIEN_PHAM, 
        fallbackIcon: '🟡',
        price: 1000, 
        currency: 'lt3',
        category: 'medicine',
        description: 'Linh đan cực phẩm, hiệu quả tuyệt đỉnh'
    },
    
    // Linh dược series (dùng linh thạch mua) - sử dụng đan phương emoji
    ly1: { 
        name: 'Hạ phẩm linh dược', 
        icon: VATPHAM_EMOJI_MAP.DAN_PHUONG_HA_PHAM, 
        fallbackIcon: '💚',
        price: 500, 
        currency: 'lt1',
        category: 'medicine',
        description: 'Linh dược hồi phục và tăng sức mạnh tu luyện'
    },
    ly2: { 
        name: 'Trung phẩm linh dược', 
        icon: VATPHAM_EMOJI_MAP.DAN_PHUONG_TRUNG_PHAM, 
        fallbackIcon: '💙',
        price: 2000, 
        currency: 'lt1',
        category: 'medicine',
        description: 'Linh dược mạnh mẽ, hiệu quả lâu dài'
    },
    ly3: { 
        name: 'Thượng phẩm linh dược', 
        icon: VATPHAM_EMOJI_MAP.DAN_PHUONG_THUONG_PHAM, 
        fallbackIcon: '💜',
        price: 2000, 
        currency: 'lt2',
        category: 'medicine',
        description: 'Linh dược cao cấp, có thể cứu sống trong thời khắc nguy hiểm'
    },
    ly4: { 
        name: 'Tiên phẩm linh dược', 
        icon: VATPHAM_EMOJI_MAP.DAN_PHUONG_TIEN_PHAM, 
        fallbackIcon: '💛',
        price: 500, 
        currency: 'lt3',
        category: 'medicine',
        description: 'Linh dược tiên phẩm, hồi sinh hoàn toàn'
    },
    
    // Sách kỹ thuật (dùng linh thạch mua) - sử dụng nguyên liệu emoji
    book1: { 
        name: 'Cơ bản tu tiên', 
        icon: VATPHAM_EMOJI_MAP.BACH_NGOC_SUONG, 
        fallbackIcon: '📗',
        price: 50, 
        currency: 'lt1',
        category: 'book',
        description: 'Sách dạy kỹ thuật tu tiên cơ bản'
    },
    book2: { 
        name: 'Trung cấp võ học', 
        icon: VATPHAM_EMOJI_MAP.TU_LINH_THAO, 
        fallbackIcon: '📘',
        price: 300, 
        currency: 'lt1',
        category: 'book',
        description: 'Sách võ học trung cấp, mở khóa kỹ năng mới'
    },
    book3: { 
        name: 'Cao thủ chiến thuật', 
        icon: VATPHAM_EMOJI_MAP.NGU_SAC_HOA, 
        fallbackIcon: '📙',
        price: 1500, 
        currency: 'lt2',
        category: 'book',
        description: 'Sách chiến thuật cao cấp, tăng khả năng đột phá'
    },
    book4: { 
        name: 'Thiên cơ bí pháp', 
        icon: VATPHAM_EMOJI_MAP.NGU_SAC_THACH, 
        fallbackIcon: '📕',
        price: 200, 
        currency: 'lt3',
        category: 'book',
        description: 'Sách bí truyền, chỉ có trong huyền thoại'
    },
    book5: { 
        name: 'Ma đạo tâm kinh', 
        icon: VATPHAM_EMOJI_MAP.HUYET_NGOC_HOA, 
        fallbackIcon: '📓',
        price: 100, 
        currency: 'lt4',
        category: 'book',
        description: 'Sách cấm thư nguy hiểm, sức mạnh khủng khiếp'
    },
    
    // Special books với giá cực cao - sử dụng emoji hiếm nhất
    scroll1: { 
        name: 'Thiên thư kim quyển', 
        icon: VATPHAM_EMOJI_MAP.TU_LINH_THACH, 
        fallbackIcon: '📜',
        price: 10000, 
        currency: 'lt4',
        category: 'book',
        description: 'Bí kíp tối thượng, chỉ dành cho cao thủ'
    },
    scroll2: { 
        name: 'Huyền thiên bảo điển', 
        icon: VATPHAM_EMOJI_MAP.PHIEN_DAN_PHUONG, 
        fallbackIcon: '📋',
        price: 50000, 
        currency: 'lt4',
        category: 'book',
        description: 'Kinh sách thần thoại, power tuyệt đỉnh'
    }
};



// Công thức ghép từ ghép (1).txt - CHỈ ĐAN DƯỢC
const CRAFT_RECIPES = {
    // Đan dược (d series) - từ ghép (1).txt
    d1: {
        materials: { 1: 9, 2: 9, 3: 9, 4: 9 },
        medicines: { dp1: 1, dl: 1 },
        successRate: 50,
        type: 'craft'
    },
    d2: {
        materials: { 1: 9, 3: 9, 4: 9, 5: 9 },
        medicines: { dp2: 1, dl: 1 },
        successRate: 50,
        type: 'craft'
    },
    d3: {
        materials: { 1: 9, 4: 9, 5: 9, 6: 9 },
        medicines: { dp3: 1, dl: 1 },
        successRate: 50,
        type: 'craft'
    },
    d4: {
        materials: { 1: 9, 5: 5, 6: 5, 7: 5 },
        medicines: { dp4: 1, dl: 1 },
        successRate: 50,
        type: 'craft'
    }
};

// Công thức dung hợp từ ghép (1).txt - CHỈ ĐAN DƯỢC & ĐAN PHƯƠNG & LINH THẠCH
const FUSION_RECIPES = {
    // Đan dược (d series) - từ ghép (1).txt  
    d2: { required: { d1: 9, dl: 1 }, successRate: 50 },
    d3: { required: { d2: 9, dl: 1 }, successRate: 50 },
    d4: { required: { d3: 9, dl: 1 }, successRate: 50 },
    
    // Đan phương (dp series) - từ ghép (1).txt
    dp2: { required: { dp1: 9, pdp: 1 }, successRate: 50 },
    dp3: { required: { dp2: 9, pdp: 1 }, successRate: 50 },
    dp4: { required: { dp3: 9, pdp: 1 }, successRate: 50 },
    
    // Linh thạch (lt series) - từ ghép (1).txt (cần nhiều để fusion)
    lt2: { required: { lt1: 9999, tlt: 1 }, successRate: 50 },
    lt3: { required: { lt2: 9999, tlt: 1 }, successRate: 50 },
    lt4: { required: { lt3: 9999, tlt: 1 }, successRate: 50 }
};

// Dữ liệu levels từ file "Role nhận , Level , exp , % đột phá , đan dược" - UPDATED FULL DATA
const CULTIVATION_LEVELS = [
    // Nhập Môn Tu Tiên
    { name: 'Phàm Nhân', exp: 100, breakRate: 100, expPenalty: 0, itemPenalty: 0, rewards: ['lt1:1'] },
    { name: 'Võ Giả', exp: 300, breakRate: 100, expPenalty: 0, itemPenalty: 0, rewards: ['lt1:1'] },
    { name: 'Tầm Tiên', exp: 500, breakRate: 100, expPenalty: 0, itemPenalty: 0, rewards: ['lt1:9'] },
    { name: 'Vấn Đạo', exp: 1000, breakRate: 100, expPenalty: 0, itemPenalty: 0, rewards: ['lt1:99'] },
    
    // Luyện Khí - Sơ Kỳ
    { name: 'Luyện Khí - Sơ Kỳ - Tầng 1', exp: 2000, breakRate: 80, expPenalty: 10, itemPenalty: 1, rewards: ['lt1:10'] },
    { name: 'Luyện Khí - Sơ Kỳ - Tầng 2', exp: 4000, breakRate: 80, expPenalty: 10, itemPenalty: 1, rewards: ['lt1:20'] },
    { name: 'Luyện Khí - Sơ Kỳ - Tầng 3', exp: 6000, breakRate: 80, expPenalty: 15, itemPenalty: 1, rewards: ['lt1:30'] },
    { name: 'Luyện Khí - Sơ Kỳ - Tầng 4', exp: 8000, breakRate: 80, expPenalty: 15, itemPenalty: 2, rewards: ['lt1:40'] },
    { name: 'Luyện Khí - Sơ Kỳ - Tầng 5', exp: 10000, breakRate: 80, expPenalty: 20, itemPenalty: 2, rewards: ['lt1:50'] },
    { name: 'Luyện Khí - Sơ Kỳ - Tầng 6', exp: 12000, breakRate: 80, expPenalty: 20, itemPenalty: 2, rewards: ['lt1:60'] },
    { name: 'Luyện Khí - Sơ Kỳ - Tầng 7', exp: 14000, breakRate: 80, expPenalty: 25, itemPenalty: 3, rewards: ['lt1:70'] },
    { name: 'Luyện Khí - Sơ Kỳ - Tầng 8', exp: 16000, breakRate: 80, expPenalty: 25, itemPenalty: 3, rewards: ['lt1:80'] },
    { name: 'Luyện Khí - Sơ Kỳ - Tầng 9', exp: 18000, breakRate: 40, expPenalty: 30, itemPenalty: 5, rewards: ['lt1:100'] },
    
    // Luyện Khí - Trung Kỳ
    { name: 'Luyện Khí - Trung Kỳ - Tầng 1', exp: 22000, breakRate: 80, expPenalty: 15, itemPenalty: 2, rewards: ['lt1:110'] },
    { name: 'Luyện Khí - Trung Kỳ - Tầng 2', exp: 24000, breakRate: 80, expPenalty: 15, itemPenalty: 2, rewards: ['lt1:120'] },
    { name: 'Luyện Khí - Trung Kỳ - Tầng 3', exp: 26000, breakRate: 80, expPenalty: 20, itemPenalty: 3, rewards: ['lt1:130'] },
    { name: 'Luyện Khí - Trung Kỳ - Tầng 4', exp: 28000, breakRate: 80, expPenalty: 20, itemPenalty: 3, rewards: ['lt1:140'] },
    { name: 'Luyện Khí - Trung Kỳ - Tầng 5', exp: 30000, breakRate: 80, expPenalty: 25, itemPenalty: 4, rewards: ['lt1:150'] },
    { name: 'Luyện Khí - Trung Kỳ - Tầng 6', exp: 32000, breakRate: 80, expPenalty: 25, itemPenalty: 4, rewards: ['lt1:160'] },
    { name: 'Luyện Khí - Trung Kỳ - Tầng 7', exp: 34000, breakRate: 80, expPenalty: 30, itemPenalty: 5, rewards: ['lt1:170'] },
    { name: 'Luyện Khí - Trung Kỳ - Tầng 8', exp: 36000, breakRate: 80, expPenalty: 30, itemPenalty: 5, rewards: ['lt1:180'] },
    { name: 'Luyện Khí - Trung Kỳ - Tầng 9', exp: 38000, breakRate: 40, expPenalty: 35, itemPenalty: 7, rewards: ['lt1:200'] },
    
    // Luyện Khí - Hậu Kỳ
    { name: 'Luyện Khí - Hậu Kỳ - Tầng 1', exp: 42000, breakRate: 80, expPenalty: 20, itemPenalty: 3, rewards: ['lt1:250'] },
    { name: 'Luyện Khí - Hậu Kỳ - Tầng 2', exp: 46000, breakRate: 80, expPenalty: 20, itemPenalty: 3, rewards: ['lt1:300'] },
    { name: 'Luyện Khí - Hậu Kỳ - Tầng 3', exp: 48000, breakRate: 80, expPenalty: 25, itemPenalty: 4, rewards: ['lt1:350'] },
    { name: 'Luyện Khí - Hậu Kỳ - Tầng 4', exp: 50000, breakRate: 80, expPenalty: 25, itemPenalty: 4, rewards: ['lt1:400'] },
    { name: 'Luyện Khí - Hậu Kỳ - Tầng 5', exp: 52000, breakRate: 80, expPenalty: 30, itemPenalty: 5, rewards: ['lt1:450'] },
    { name: 'Luyện Khí - Hậu Kỳ - Tầng 6', exp: 54000, breakRate: 80, expPenalty: 30, itemPenalty: 5, rewards: ['lt1:500'] },
    { name: 'Luyện Khí - Hậu Kỳ - Tầng 7', exp: 56000, breakRate: 80, expPenalty: 35, itemPenalty: 6, rewards: ['lt1:550'] },
    { name: 'Luyện Khí - Hậu Kỳ - Tầng 8', exp: 58000, breakRate: 80, expPenalty: 35, itemPenalty: 6, rewards: ['lt1:600'] },
    { name: 'Luyện Khí - Hậu Kỳ - Tầng 9', exp: 60000, breakRate: 20, expPenalty: 40, itemPenalty: 10, rewards: ['lt1:1000'] },
    
    // Trúc Cơ - Sơ Kỳ
    { name: 'Trúc Cơ - Sơ Kỳ - Tầng 1', exp: 70000, breakRate: 80, expPenalty: 25, itemPenalty: 4, rewards: ['lt1:1200', 'lt2:1'] },
    { name: 'Trúc Cơ - Sơ Kỳ - Tầng 2', exp: 72000, breakRate: 80, expPenalty: 25, itemPenalty: 4, rewards: ['lt1:1300', 'lt2:1'] },
    { name: 'Trúc Cơ - Sơ Kỳ - Tầng 3', exp: 74000, breakRate: 80, expPenalty: 30, itemPenalty: 5, rewards: ['lt1:1400', 'lt2:1'] },
    { name: 'Trúc Cơ - Sơ Kỳ - Tầng 4', exp: 76000, breakRate: 80, expPenalty: 30, itemPenalty: 5, rewards: ['lt1:1500', 'lt2:1'] },
    { name: 'Trúc Cơ - Sơ Kỳ - Tầng 5', exp: 78000, breakRate: 80, expPenalty: 35, itemPenalty: 6, rewards: ['lt1:1600', 'lt2:1'] },
    { name: 'Trúc Cơ - Sơ Kỳ - Tầng 6', exp: 80000, breakRate: 80, expPenalty: 35, itemPenalty: 6, rewards: ['lt1:1700', 'lt2:1'] },
    { name: 'Trúc Cơ - Sơ Kỳ - Tầng 7', exp: 82000, breakRate: 80, expPenalty: 40, itemPenalty: 7, rewards: ['lt1:1800', 'lt2:1'] },
    { name: 'Trúc Cơ - Sơ Kỳ - Tầng 8', exp: 84000, breakRate: 80, expPenalty: 40, itemPenalty: 7, rewards: ['lt1:1900', 'lt2:1'] },
    { name: 'Trúc Cơ - Sơ Kỳ - Tầng 9', exp: 86000, breakRate: 40, expPenalty: 45, itemPenalty: 10, rewards: ['lt1:2000', 'lt2:3'] },

    // Tiếp tục với các level khác theo file dữ liệu...
    // Phi Thăng kiếp (Special breakthrough)
    { name: 'Phi Thăng kiếp', exp: 330000, breakRate: 5, expPenalty: 50, itemPenalty: 20, rewards: ['lt1:9999', 'lt2:999', 'lt3:99'] },

    // Luyện Hư realm
    { name: 'Luyện Hư - Sơ Kỳ - Tầng 1', exp: 340000, breakRate: 80, expPenalty: 30, itemPenalty: 8, rewards: ['lt2:1'] },
    
    // Cuối cùng
    { name: 'Bạch Ngọc Chí Tôn', exp: 10000000, breakRate: 0, expPenalty: 0, itemPenalty: 0, rewards: [] }
];

// Helper functions

function getRandomDrop() {
    const random = Math.random() * 100;
    
    // 15% chance of getting nothing (miss)
    if (random <= 15) {
        return null;
    }
    
    // Adjust random for remaining 85%
    const adjustedRandom = ((random - 15) / 85) * 100;
    let cumulative = 0;
    
    for (const [id, material] of Object.entries(FARM_MATERIALS)) {
        cumulative += material.dropRate;
        if (adjustedRandom <= cumulative) {
            return { id, ...material };
        }
    }
    
    // Fallback
    return { id: '1', ...FARM_MATERIALS[1] };
}

function getLevelByName(levelName) {
    return CULTIVATION_LEVELS.find(level => level.name === levelName);
}

function getNextLevel(currentLevelName) {
    const currentIndex = CULTIVATION_LEVELS.findIndex(level => level.name === currentLevelName);
    if (currentIndex === -1 || currentIndex === CULTIVATION_LEVELS.length - 1) {
        return null;
    }
    return CULTIVATION_LEVELS[currentIndex + 1];
}

function canBreakthrough(currentLevel, exp) {
    const levelData = getLevelByName(currentLevel);
    if (!levelData) return false;
    
    return exp >= levelData.exp;
}

function rollBreakthrough(breakRate) {
    return Math.random() * 100 < breakRate;
}

async function applyBreakthroughPenalty(client, userId, levelData) {
    if (!levelData.expPenalty && !levelData.itemPenalty) {
        return { expLost: 0, itemsLost: [] };
    }

    const results = { expLost: 0, itemsLost: [] };

    // Apply EXP penalty
    if (levelData.expPenalty > 0) {
        const user = await client.prisma.cultivationUser.findUnique({
            where: { userId: userId }
        });

        if (user) {
            const expLoss = Math.floor(user.exp * (levelData.expPenalty / 100));
            const newExp = Math.max(0, user.exp - expLoss);
            
            await client.prisma.cultivationUser.update({
                where: { userId: userId },
                data: { exp: newExp }
            });

            results.expLost = expLoss;
        }
    }

    // Apply item penalty
    if (levelData.itemPenalty > 0) {
        const inventory = await client.prisma.userInventory.findMany({
            where: { userId }
        });

        const availableItems = inventory.filter(item => item.quantity > 0);
        const itemsToLose = Math.min(levelData.itemPenalty, availableItems.length);

        for (let i = 0; i < itemsToLose; i++) {
            if (availableItems.length === 0) break;

            const randomIndex = Math.floor(Math.random() * availableItems.length);
            const selectedItem = availableItems[randomIndex];
            
            const lossQuantity = Math.min(
                Math.floor(Math.random() * 3) + 1, // Lose 1-3 of each item
                selectedItem.quantity
            );

            await client.prisma.userInventory.update({
                where: {
                    userId_itemType_itemId: {
                        userId,
                        itemType: selectedItem.itemType,
                        itemId: selectedItem.itemId
                    }
                },
                data: { quantity: { decrement: lossQuantity } }
            });

            // Get item name for display
            let itemName = 'Unknown Item';
            if (selectedItem.itemType === 'material' && FARM_MATERIALS[selectedItem.itemId]) {
                itemName = FARM_MATERIALS[selectedItem.itemId].name;
            } else if (selectedItem.itemType === 'medicine' && MEDICINES[selectedItem.itemId]) {
                itemName = MEDICINES[selectedItem.itemId].name;
            }

            results.itemsLost.push({ name: itemName, quantity: lossQuantity });

            // Remove from available list if quantity reaches 0
            selectedItem.quantity -= lossQuantity;
            if (selectedItem.quantity <= 0) {
                availableItems.splice(randomIndex, 1);
            }
        }
    }

    return results;
}

// Helper function to determine item storage category
function getItemStorageInfo(itemId) {
    // Check if it's a number (basic materials 1-7)
    if (!isNaN(itemId)) {
        return {
            category: 'material',
            actualId: itemId,
            name: FARM_MATERIALS[itemId]?.name || `Material ${itemId}`,
            icon: FARM_MATERIALS[itemId]?.icon || '🔮'
        };
    }
    
    // Check FARM_MATERIALS first (includes dp1, pdp, dl, tlt, lt1)
    if (FARM_MATERIALS[itemId]) {
        const category = ['dp1', 'dp2', 'dp3', 'dp4', 'pdp', 'dl'].includes(itemId) ? 'medicine' : 'material';
        return {
            category: category,
            actualId: itemId,
            name: FARM_MATERIALS[itemId].name,
            icon: FARM_MATERIALS[itemId].icon
        };
    }
    
    // Check MEDICINES
    if (MEDICINES[itemId]) {
        return {
            category: 'medicine',
            actualId: itemId,
            name: MEDICINES[itemId].name,
            icon: MEDICINES[itemId].icon
        };
    }
    
    // Check SPIRIT_STONES (lt2, lt3, lt4)
    if (SPIRIT_STONES[itemId]) {
        return {
            category: 'material',
            actualId: `spirit_${itemId}`,
            name: SPIRIT_STONES[itemId].name,
            icon: SPIRIT_STONES[itemId].icon
        };
    }
    
    // Check SHOP_ITEMS (linh đan, linh dược, sách)
    if (SHOP_ITEMS[itemId]) {
        const shopItem = SHOP_ITEMS[itemId];
        const category = shopItem.category === 'book' ? 'book' : 'medicine';
        return {
            category: category,
            actualId: itemId,
            name: shopItem.name,
            icon: shopItem.icon || shopItem.fallbackIcon
        };
    }
    
    // Default fallback
    return {
        category: 'material',
        actualId: itemId,
        name: itemId,
        icon: '❓'
    };
}

async function giveBreakthroughRewards(client, userId, levelData) {
    if (!levelData.rewards || levelData.rewards.length === 0) {
        return [];
    }

    const rewardsGiven = [];

    for (const rewardString of levelData.rewards) {
        const [itemType, quantity] = rewardString.split(':');
        const qty = parseInt(quantity);

        const storageInfo = getItemStorageInfo(itemType);

        try {
            await client.prisma.userInventory.upsert({
                where: {
                    userId_itemType_itemId: {
                        userId: userId,
                        itemType: storageInfo.category,
                        itemId: storageInfo.actualId
                    }
                },
                update: {
                    quantity: {
                        increment: qty
                    }
                },
                create: {
                    userId: userId,
                    itemType: storageInfo.category,
                    itemId: storageInfo.actualId,
                    quantity: qty
                }
            });

            rewardsGiven.push({
                name: storageInfo.name,
                quantity: qty,
                icon: storageInfo.icon
            });

        } catch (error) {
            console.error(`Error giving reward ${itemType}:${quantity}:`, error);
        }
    }

    return rewardsGiven;
}

function formatRewards(levelData) {
    if (!levelData.rewards || levelData.rewards.length === 0) {
        return 'Không có phần thưởng';
    }

    return levelData.rewards.map(rewardString => {
        const [itemType, quantity] = rewardString.split(':');
        const qty = parseInt(quantity);

        let itemName, itemIcon;
        if (itemType.startsWith('z')) {
            itemName = MEDICINES[itemType]?.name || itemType;
            itemIcon = MEDICINES[itemType]?.icon || '💊';
        } else if (itemType.startsWith('lt')) {
            itemName = SPIRIT_STONES[itemType]?.name || itemType;
            itemIcon = SPIRIT_STONES[itemType]?.icon || '💎';
        } else {
            itemName = FARM_MATERIALS[itemType]?.name || itemType;
            itemIcon = FARM_MATERIALS[itemType]?.icon || '🔮';
        }

        return `${itemIcon} ${itemName} x${qty}`;
    }).join(', ');
}

module.exports = {
    FARM_MATERIALS,
    MEDICINES,
    SPIRIT_STONES,
    SHOP_ITEMS,
    CRAFT_RECIPES,
    FUSION_RECIPES,
    CULTIVATION_LEVELS,
    getRandomDrop,
    getLevelByName,
    getNextLevel,
    canBreakthrough,
    rollBreakthrough,
    applyBreakthroughPenalty,
    giveBreakthroughRewards,
    formatRewards,
    getItemStorageInfo
}; 