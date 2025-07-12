// Import emoji mapping mới
const { VATPHAM_EMOJI_MAP } = require('./vatphamEmojis');

/*
LOGIC MỚI:
- !farm: chỉ drop nguyên liệu cơ bản (1-7) + hạ phẩm linh thạch (lt1)
- !craft: craft đan dược (d1-d4) từ nguyên liệu + đan phương + đan lò
        : craft linh thạch cao cấp (lt2-lt4) từ linh thạch thấp hơn + tụ linh thạch
- !shop: mua đan phương (dp1-dp4), phối đan phương (pdp), đan lò (dl), tụ linh thạch (tlt)
       : mua linh đan, linh dược, sách
*/

// Dữ liệu farming từ FARM.txt - CHỈ CÓ NGUYÊN LIỆU CƠ BẢN VÀ LINH THẠCH CẤP 1
const FARM_MATERIALS = {
    // Nguyên liệu cơ bản (từ FARM.txt)
    1: { name: 'bạch ngọc sương', dropRate: 30, icon: VATPHAM_EMOJI_MAP.BACH_NGOC_SUONG, fallbackIcon: '🔮' },
    2: { name: 'tụ linh thảo', dropRate: 18, icon: VATPHAM_EMOJI_MAP.TU_LINH_THAO, fallbackIcon: '🌿' },
    3: { name: 'tử hoa thảo', dropRate: 16, icon: VATPHAM_EMOJI_MAP.TU_HOA_THAO, fallbackIcon: '🟣' },
    4: { name: 'hồng tú hoa', dropRate: 14, icon: VATPHAM_EMOJI_MAP.HONG_TU_HOA, fallbackIcon: '🌺' },
    5: { name: 'ngũ sắc hoa', dropRate: 6, icon: VATPHAM_EMOJI_MAP.NGU_SAC_HOA, fallbackIcon: '🍃' },
    6: { name: 'ngũ sắc thạch', dropRate: 3, icon: VATPHAM_EMOJI_MAP.NGU_SAC_THACH, fallbackIcon: '🌈' },
    7: { name: 'huyết ngọc hoa', dropRate: 2, icon: VATPHAM_EMOJI_MAP.HUYET_NGOC_HOA, fallbackIcon: '🩸' },
    
    // Linh thạch cơ bản (tỉ lệ thấp, bổ sung cho breakthrough)
    lt1: { name: 'hạ phẩm linh thạch', dropRate: 1, icon: VATPHAM_EMOJI_MAP.LINH_THACH_HA_PHAM, fallbackIcon: '💎' }
};

const MEDICINES = {
    // Đan dược (d series) - CRAFT được từ nguyên liệu + đan phương + đan lò
    d1: { name: 'hạ phẩm đan dược', icon: VATPHAM_EMOJI_MAP.DAN_DUOC_HA_PHAM, fallbackIcon: '💊', level: 1 },
    d2: { name: 'trung phẩm đan dược', icon: VATPHAM_EMOJI_MAP.DAN_DUOC_TRUNG_PHAM, fallbackIcon: '💉', level: 2 },
    d3: { name: 'thượng phẩm đan dược', icon: VATPHAM_EMOJI_MAP.DAN_DUOC_THUONG_PHAM, fallbackIcon: '🧪', level: 3 },
    d4: { name: 'tiên phẩm đan dược', icon: VATPHAM_EMOJI_MAP.DAN_DUOC_TIEN_PHAM, fallbackIcon: '⚗️', level: 4 }
};

// Linh thạch - CRAFT được từ linh thạch cấp thấp hơn + tụ linh thạch
const SPIRIT_STONES = {
    lt1: { name: 'hạ phẩm linh thạch', icon: VATPHAM_EMOJI_MAP.LINH_THACH_HA_PHAM, fallbackIcon: '💎' },
    lt2: { name: 'trung phẩm linh thạch', icon: VATPHAM_EMOJI_MAP.LINH_THACH_TRUNG_PHAM, fallbackIcon: '💍' },
    lt3: { name: 'thượng phẩm linh thạch', icon: VATPHAM_EMOJI_MAP.LINH_THACH_THUONG_PHAM, fallbackIcon: '💠' },
    lt4: { name: 'tiên phẩm linh thạch', icon: VATPHAM_EMOJI_MAP.LINH_THACH_TIEN_PHAM, fallbackIcon: '🔸' }
};

// Đan phương, đan lò, tụ linh thạch, linh đan, linh dược và sách chỉ có thể mua từ shop
const SHOP_ITEMS = {
    // Đan phương và đan lò - cần thiết để craft đan dược (tạm chưa có giá)
    dp1: { 
        name: 'hạ phẩm đan phương', 
        icon: VATPHAM_EMOJI_MAP.DAN_PHUONG_HA_PHAM, 
        fallbackIcon: '📜',
        category: 'medicine',
        description: 'Đan phương cấp thấp, dùng để craft đan dược'
    },
    dp2: { 
        name: 'trung phẩm đan phương', 
        icon: VATPHAM_EMOJI_MAP.DAN_PHUONG_TRUNG_PHAM, 
        fallbackIcon: '📃',
        category: 'medicine',
        description: 'Đan phương trung bình, dùng để craft đan dược'
    },
    dp3: { 
        name: 'thượng phẩm đan phương', 
        icon: VATPHAM_EMOJI_MAP.DAN_PHUONG_THUONG_PHAM, 
        fallbackIcon: '📋',
        category: 'medicine',
        description: 'Đan phương cao cấp, dùng để craft đan dược'
    },
    dp4: { 
        name: 'tiên phẩm đan phương', 
        icon: VATPHAM_EMOJI_MAP.DAN_PHUONG_TIEN_PHAM, 
        fallbackIcon: '📊',
        category: 'medicine',
        description: 'Đan phương tiên phẩm, dùng để craft đan dược'
    },
    pdp: { 
        name: 'Phối đan phương', 
        icon: VATPHAM_EMOJI_MAP.PHIEN_DAN_PHUONG, 
        fallbackIcon: '📈',
        category: 'medicine',
        description: 'Phối đan phương, dùng để craft đan phương cao cấp'
    },
    dl: { 
        name: 'Đan lò', 
        icon: VATPHAM_EMOJI_MAP.DAN_LO, 
        fallbackIcon: '🏺',
        category: 'medicine',
        description: 'Đan lò, dùng để craft đan dược'
    },
    
    // Tụ linh thạch - cần thiết để craft linh thạch (tạm chưa có giá)
    tlt: { 
        name: 'Tụ linh thạch', 
        icon: VATPHAM_EMOJI_MAP.TU_LINH_THACH, 
        fallbackIcon: '💫',
        category: 'material',
        description: 'Tụ linh thạch, dùng để craft linh thạch cao cấp'
    },
    
    // Linh đan series (dùng linh thạch mua) - sử dụng đan dược emoji
    ld1: { 
        name: 'hạ phẩm linh đan', 
        icon: VATPHAM_EMOJI_MAP.DAN_DUOC_HA_PHAM, 
        fallbackIcon: '🟢',
        price: 100, 
        currency: 'lt1',
        category: 'medicine',
        description: 'Linh đan cấp thấp nhất, tăng EXP tu luyện'
    },
    ld2: { 
        name: 'trung phẩm linh đan', 
        icon: VATPHAM_EMOJI_MAP.DAN_DUOC_TRUNG_PHAM, 
        fallbackIcon: '🔵',
        price: 1000, 
        currency: 'lt1',
        category: 'medicine',
        description: 'Linh đan trung bình, tăng nhiều EXP hơn'
    },
    ld3: { 
        name: 'thượng phẩm linh đan', 
        icon: VATPHAM_EMOJI_MAP.DAN_DUOC_THUONG_PHAM, 
        fallbackIcon: '🟣',
        price: 5000, 
        currency: 'lt2',
        category: 'medicine',
        description: 'Linh đan cấp cao, tăng EXP và tỉ lệ đột phá'
    },
    ld4: { 
        name: 'tiên phẩm linh đan', 
        icon: VATPHAM_EMOJI_MAP.DAN_DUOC_TIEN_PHAM, 
        fallbackIcon: '🟡',
        price: 1000, 
        currency: 'lt3',
        category: 'medicine',
        description: 'Linh đan cực phẩm, hiệu quả tuyệt đỉnh'
    },
    
    // Linh dược series (dùng linh thạch mua) - sử dụng đan phương emoji
    ly1: { 
        name: 'hạ phẩm linh dược', 
        icon: VATPHAM_EMOJI_MAP.DAN_PHUONG_HA_PHAM, 
        fallbackIcon: '💚',
        price: 500, 
        currency: 'lt1',
        category: 'medicine',
        description: 'Linh dược hồi phục và tăng sức mạnh tu luyện'
    },
    ly2: { 
        name: 'trung phẩm linh dược', 
        icon: VATPHAM_EMOJI_MAP.DAN_PHUONG_TRUNG_PHAM, 
        fallbackIcon: '💙',
        price: 2000, 
        currency: 'lt1',
        category: 'medicine',
        description: 'Linh dược mạnh mẽ, hiệu quả lâu dài'
    },
    ly3: { 
        name: 'thượng phẩm linh dược', 
        icon: VATPHAM_EMOJI_MAP.DAN_PHUONG_THUONG_PHAM, 
        fallbackIcon: '💜',
        price: 2000, 
        currency: 'lt2',
        category: 'medicine',
        description: 'Linh dược cao cấp, có thể cứu sống trong thời khắc nguy hiểm'
    },
    ly4: { 
        name: 'tiên phẩm linh dược', 
        icon: VATPHAM_EMOJI_MAP.DAN_PHUONG_TIEN_PHAM, 
        fallbackIcon: '💛',
        price: 500, 
        currency: 'lt3',
        category: 'medicine',
        description: 'Linh dược tiên phẩm, hồi sinh hoàn toàn'
    },
    
    // Sách kỹ thuật (dùng linh thạch mua) - chỉ giữ 3 sách cơ bản
    book1: { 
        name: 'cơ bản tu tiên', 
        icon: VATPHAM_EMOJI_MAP.BACH_NGOC_SUONG, 
        fallbackIcon: '📗',
        price: 50, 
        currency: 'lt1',
        category: 'book',
        description: 'Sách dạy kỹ thuật tu tiên cơ bản'
    },
    book2: { 
        name: 'trung cấp võ học', 
        icon: VATPHAM_EMOJI_MAP.TU_LINH_THAO, 
        fallbackIcon: '📘',
        price: 300, 
        currency: 'lt1',
        category: 'book',
        description: 'Sách võ học trung cấp, mở khóa kỹ năng mới'
    },
    book3: { 
        name: 'cao thủ chiến thuật', 
        icon: VATPHAM_EMOJI_MAP.NGU_SAC_HOA, 
        fallbackIcon: '📙',
        price: 1500, 
        currency: 'lt2',
        category: 'book',
        description: 'Sách chiến thuật cao cấp, tăng khả năng đột phá'
    }
};



// Công thức craft - ĐAN DƯỢC và LINH THẠCH
const CRAFT_RECIPES = {
    // Đan dược (d series) - từ nguyên liệu + đan phương + đan lò
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
    },
    
    // Linh thạch (lt series) - từ linh thạch cấp thấp hơn + tụ linh thạch
    lt2: {
        materials: { lt1: 9999, tlt: 1 },
        medicines: {},
        successRate: 50,
        type: 'craft'
    },
    lt3: {
        materials: { lt2: 9999, tlt: 1 },
        medicines: {},
        successRate: 50,
        type: 'craft'
    },
    lt4: {
        materials: { lt3: 9999, tlt: 1 },
        medicines: {},
        successRate: 50,
        type: 'craft'
    }
};

// Dữ liệu levels từ file "Role nhận , Level , exp , % đột phá , đan dược" - REQUIREMENTS SYSTEM
const CULTIVATION_LEVELS = [
    // Nhập Môn Tu Tiên
    { name: 'Phàm Nhân', exp: 100, breakRate: 100, expPenalty: 0, itemPenalty: 0, requirements: ['lt1:1'], role: 'Nhập Môn Tu Tiên' },
    { name: 'Võ Giả', exp: 300, breakRate: 100, expPenalty: 0, itemPenalty: 0, requirements: ['lt1:1'], role: 'Nhập Môn Tu Tiên' },
    { name: 'Tầm Tiên', exp: 500, breakRate: 100, expPenalty: 0, itemPenalty: 0, requirements: ['lt1:9'], role: 'Nhập Môn Tu Tiên' },
    { name: 'Vấn Đạo', exp: 1000, breakRate: 100, expPenalty: 0, itemPenalty: 0, requirements: ['lt1:99'], role: 'Nhập Môn Tu Tiên' },
    
    // Luyện Khí - Sơ Kỳ
    { name: 'Luyện Khí - Sơ Kỳ - Tầng 1', exp: 2000, breakRate: 80, expPenalty: 10, itemPenalty: 1, requirements: ['d1:1'], role: 'Luyện Khí - Sơ Kỳ' },
    { name: 'Luyện Khí - Sơ Kỳ - Tầng 2', exp: 4000, breakRate: 80, expPenalty: 10, itemPenalty: 1, requirements: ['d1:1'], role: 'Luyện Khí - Sơ Kỳ' },
    { name: 'Luyện Khí - Sơ Kỳ - Tầng 3', exp: 6000, breakRate: 80, expPenalty: 15, itemPenalty: 1, requirements: ['d1:1'], role: 'Luyện Khí - Sơ Kỳ' },
    { name: 'Luyện Khí - Sơ Kỳ - Tầng 4', exp: 8000, breakRate: 80, expPenalty: 15, itemPenalty: 2, requirements: ['d1:1'], role: 'Luyện Khí - Sơ Kỳ' },
    { name: 'Luyện Khí - Sơ Kỳ - Tầng 5', exp: 10000, breakRate: 80, expPenalty: 20, itemPenalty: 2, requirements: ['d1:1'], role: 'Luyện Khí - Sơ Kỳ' },
    { name: 'Luyện Khí - Sơ Kỳ - Tầng 6', exp: 12000, breakRate: 80, expPenalty: 20, itemPenalty: 2, requirements: ['d1:1'], role: 'Luyện Khí - Sơ Kỳ' },
    { name: 'Luyện Khí - Sơ Kỳ - Tầng 7', exp: 14000, breakRate: 80, expPenalty: 25, itemPenalty: 3, requirements: ['d1:1'], role: 'Luyện Khí - Sơ Kỳ' },
    { name: 'Luyện Khí - Sơ Kỳ - Tầng 8', exp: 16000, breakRate: 80, expPenalty: 25, itemPenalty: 3, requirements: ['d1:1'], role: 'Luyện Khí - Sơ Kỳ' },
    { name: 'Luyện Khí - Sơ Kỳ - Tầng 9', exp: 18000, breakRate: 40, expPenalty: 30, itemPenalty: 5, requirements: ['d1:2'], role: 'Luyện Khí - Sơ Kỳ' },
    
    // Luyện Khí - Trung Kỳ
    { name: 'Luyện Khí - Trung Kỳ - Tầng 1', exp: 22000, breakRate: 80, expPenalty: 15, itemPenalty: 2, requirements: ['d1:1'], role: 'Luyện Khí - Trung Kỳ' },
    { name: 'Luyện Khí - Trung Kỳ - Tầng 2', exp: 24000, breakRate: 80, expPenalty: 15, itemPenalty: 2, requirements: ['d1:1'], role: 'Luyện Khí - Trung Kỳ' },
    { name: 'Luyện Khí - Trung Kỳ - Tầng 3', exp: 26000, breakRate: 80, expPenalty: 20, itemPenalty: 3, requirements: ['d1:1'], role: 'Luyện Khí - Trung Kỳ' },
    { name: 'Luyện Khí - Trung Kỳ - Tầng 4', exp: 28000, breakRate: 80, expPenalty: 20, itemPenalty: 3, requirements: ['d1:1'], role: 'Luyện Khí - Trung Kỳ' },
    { name: 'Luyện Khí - Trung Kỳ - Tầng 5', exp: 30000, breakRate: 80, expPenalty: 25, itemPenalty: 4, requirements: ['d1:1'], role: 'Luyện Khí - Trung Kỳ' },
    { name: 'Luyện Khí - Trung Kỳ - Tầng 6', exp: 32000, breakRate: 80, expPenalty: 25, itemPenalty: 4, requirements: ['d1:1'], role: 'Luyện Khí - Trung Kỳ' },
    { name: 'Luyện Khí - Trung Kỳ - Tầng 7', exp: 34000, breakRate: 80, expPenalty: 30, itemPenalty: 5, requirements: ['d1:1'], role: 'Luyện Khí - Trung Kỳ' },
    { name: 'Luyện Khí - Trung Kỳ - Tầng 8', exp: 36000, breakRate: 80, expPenalty: 30, itemPenalty: 5, requirements: ['d1:1'], role: 'Luyện Khí - Trung Kỳ' },
    { name: 'Luyện Khí - Trung Kỳ - Tầng 9', exp: 38000, breakRate: 40, expPenalty: 35, itemPenalty: 7, requirements: ['d1:2'], role: 'Luyện Khí - Trung Kỳ' },
    
    // Luyện Khí - Hậu Kỳ
    { name: 'Luyện Khí - Hậu Kỳ - Tầng 1', exp: 42000, breakRate: 80, expPenalty: 20, itemPenalty: 3, requirements: ['d1:1'], role: 'Luyện Khí - Hậu Kỳ' },
    { name: 'Luyện Khí - Hậu Kỳ - Tầng 2', exp: 46000, breakRate: 80, expPenalty: 20, itemPenalty: 3, requirements: ['d1:1'], role: 'Luyện Khí - Hậu Kỳ' },
    { name: 'Luyện Khí - Hậu Kỳ - Tầng 3', exp: 48000, breakRate: 80, expPenalty: 25, itemPenalty: 4, requirements: ['d1:1'], role: 'Luyện Khí - Hậu Kỳ' },
    { name: 'Luyện Khí - Hậu Kỳ - Tầng 4', exp: 50000, breakRate: 80, expPenalty: 25, itemPenalty: 4, requirements: ['d1:1'], role: 'Luyện Khí - Hậu Kỳ' },
    { name: 'Luyện Khí - Hậu Kỳ - Tầng 5', exp: 52000, breakRate: 80, expPenalty: 30, itemPenalty: 5, requirements: ['d1:1'], role: 'Luyện Khí - Hậu Kỳ' },
    { name: 'Luyện Khí - Hậu Kỳ - Tầng 6', exp: 54000, breakRate: 80, expPenalty: 30, itemPenalty: 5, requirements: ['d1:1'], role: 'Luyện Khí - Hậu Kỳ' },
    { name: 'Luyện Khí - Hậu Kỳ - Tầng 7', exp: 56000, breakRate: 80, expPenalty: 35, itemPenalty: 6, requirements: ['d1:1'], role: 'Luyện Khí - Hậu Kỳ' },
    { name: 'Luyện Khí - Hậu Kỳ - Tầng 8', exp: 58000, breakRate: 80, expPenalty: 35, itemPenalty: 6, requirements: ['d1:1'], role: 'Luyện Khí - Hậu Kỳ' },
    { name: 'Luyện Khí - Hậu Kỳ - Tầng 9', exp: 60000, breakRate: 20, expPenalty: 40, itemPenalty: 10, requirements: ['d1:3'], role: 'Luyện Khí - Hậu Kỳ' },
    
    // Trúc Cơ - Sơ Kỳ (sửa lỗi chính tả từ "Tâng" thành "Tầng")
    { name: 'Trúc Cơ - Sơ Kỳ - Tầng 1', exp: 70000, breakRate: 80, expPenalty: 25, itemPenalty: 4, requirements: ['d1:2'], role: 'Trúc Cơ - Sơ Kỳ' },
    { name: 'Trúc Cơ - Sơ Kỳ - Tầng 2', exp: 72000, breakRate: 80, expPenalty: 25, itemPenalty: 4, requirements: ['d1:2'], role: 'Trúc Cơ - Sơ Kỳ' },
    { name: 'Trúc Cơ - Sơ Kỳ - Tầng 3', exp: 74000, breakRate: 80, expPenalty: 30, itemPenalty: 5, requirements: ['d1:2'], role: 'Trúc Cơ - Sơ Kỳ' },
    { name: 'Trúc Cơ - Sơ Kỳ - Tầng 4', exp: 76000, breakRate: 80, expPenalty: 30, itemPenalty: 5, requirements: ['d1:2'], role: 'Trúc Cơ - Sơ Kỳ' },
    { name: 'Trúc Cơ - Sơ Kỳ - Tầng 5', exp: 78000, breakRate: 80, expPenalty: 35, itemPenalty: 6, requirements: ['d1:2'], role: 'Trúc Cơ - Sơ Kỳ' },
    { name: 'Trúc Cơ - Sơ Kỳ - Tầng 6', exp: 80000, breakRate: 80, expPenalty: 35, itemPenalty: 6, requirements: ['d1:2'], role: 'Trúc Cơ - Sơ Kỳ' },
    { name: 'Trúc Cơ - Sơ Kỳ - Tầng 7', exp: 82000, breakRate: 80, expPenalty: 40, itemPenalty: 7, requirements: ['d1:2'], role: 'Trúc Cơ - Sơ Kỳ' },
    { name: 'Trúc Cơ - Sơ Kỳ - Tầng 8', exp: 84000, breakRate: 80, expPenalty: 40, itemPenalty: 7, requirements: ['d1:2'], role: 'Trúc Cơ - Sơ Kỳ' },
    { name: 'Trúc Cơ - Sơ Kỳ - Tầng 9', exp: 86000, breakRate: 40, expPenalty: 45, itemPenalty: 10, requirements: ['d1:3'], role: 'Trúc Cơ - Sơ Kỳ' },
    
    // Trúc Cơ - Trung Kỳ
    { name: 'Trúc Cơ - Trung Kỳ - Tầng 1', exp: 90000, breakRate: 80, expPenalty: 25, itemPenalty: 4, requirements: ['d1:2'], role: 'Trúc Cơ - Trung Kỳ' },
    { name: 'Trúc Cơ - Trung Kỳ - Tầng 2', exp: 92000, breakRate: 80, expPenalty: 25, itemPenalty: 4, requirements: ['d1:2'], role: 'Trúc Cơ - Trung Kỳ' },
    { name: 'Trúc Cơ - Trung Kỳ - Tầng 3', exp: 96000, breakRate: 80, expPenalty: 30, itemPenalty: 5, requirements: ['d1:2'], role: 'Trúc Cơ - Trung Kỳ' },
    { name: 'Trúc Cơ - Trung Kỳ - Tầng 4', exp: 98000, breakRate: 80, expPenalty: 30, itemPenalty: 5, requirements: ['d1:2'], role: 'Trúc Cơ - Trung Kỳ' },
    { name: 'Trúc Cơ - Trung Kỳ - Tầng 5', exp: 100000, breakRate: 80, expPenalty: 35, itemPenalty: 6, requirements: ['d1:2'], role: 'Trúc Cơ - Trung Kỳ' },
    { name: 'Trúc Cơ - Trung Kỳ - Tầng 6', exp: 102000, breakRate: 80, expPenalty: 35, itemPenalty: 6, requirements: ['d1:2'], role: 'Trúc Cơ - Trung Kỳ' },
    { name: 'Trúc Cơ - Trung Kỳ - Tầng 7', exp: 104000, breakRate: 80, expPenalty: 40, itemPenalty: 7, requirements: ['d1:2'], role: 'Trúc Cơ - Trung Kỳ' },
    { name: 'Trúc Cơ - Trung Kỳ - Tầng 8', exp: 106000, breakRate: 80, expPenalty: 40, itemPenalty: 7, requirements: ['d1:2'], role: 'Trúc Cơ - Trung Kỳ' },
    { name: 'Trúc Cơ - Trung Kỳ - Tầng 9', exp: 108000, breakRate: 40, expPenalty: 45, itemPenalty: 10, requirements: ['d1:3'], role: 'Trúc Cơ - Trung Kỳ' },
    
    // Trúc Cơ - Hậu Kỳ (sửa lỗi chính tả từ "Tâng" thành "Tầng")
    { name: 'Trúc Cơ - Hậu Kỳ - Tầng 1', exp: 112000, breakRate: 80, expPenalty: 25, itemPenalty: 4, requirements: ['d1:2'], role: 'Trúc Cơ - Hậu Kỳ' },
    { name: 'Trúc Cơ - Hậu Kỳ - Tầng 2', exp: 114000, breakRate: 80, expPenalty: 25, itemPenalty: 4, requirements: ['d1:2'], role: 'Trúc Cơ - Hậu Kỳ' },
    { name: 'Trúc Cơ - Hậu Kỳ - Tầng 3', exp: 116000, breakRate: 80, expPenalty: 30, itemPenalty: 5, requirements: ['d1:2'], role: 'Trúc Cơ - Hậu Kỳ' },
    { name: 'Trúc Cơ - Hậu Kỳ - Tầng 4', exp: 118000, breakRate: 80, expPenalty: 30, itemPenalty: 5, requirements: ['d1:2'], role: 'Trúc Cơ - Hậu Kỳ' },
    { name: 'Trúc Cơ - Hậu Kỳ - Tầng 5', exp: 120000, breakRate: 80, expPenalty: 35, itemPenalty: 6, requirements: ['d1:2'], role: 'Trúc Cơ - Hậu Kỳ' },
    { name: 'Trúc Cơ - Hậu Kỳ - Tầng 6', exp: 122000, breakRate: 80, expPenalty: 35, itemPenalty: 6, requirements: ['d1:2'], role: 'Trúc Cơ - Hậu Kỳ' },
    { name: 'Trúc Cơ - Hậu Kỳ - Tầng 7', exp: 124000, breakRate: 80, expPenalty: 40, itemPenalty: 7, requirements: ['d1:2'], role: 'Trúc Cơ - Hậu Kỳ' },
    { name: 'Trúc Cơ - Hậu Kỳ - Tầng 8', exp: 126000, breakRate: 80, expPenalty: 40, itemPenalty: 7, requirements: ['d1:2'], role: 'Trúc Cơ - Hậu Kỳ' },
    { name: 'Trúc Cơ - Hậu Kỳ - Tầng 9', exp: 128000, breakRate: 20, expPenalty: 45, itemPenalty: 10, requirements: ['d1:4'], role: 'Trúc Cơ - Hậu Kỳ' },
    
    // Kim Đan levels
    { name: 'Kim Đan - Sơ Kỳ - Tầng 1', exp: 138000, breakRate: 80, expPenalty: 30, itemPenalty: 5, requirements: ['d1:3'], role: 'Kim Đan - Sơ Kỳ' },
    { name: 'Kim Đan - Sơ Kỳ - Tầng 9', exp: 154000, breakRate: 40, expPenalty: 35, itemPenalty: 8, requirements: ['d1:4'], role: 'Kim Đan - Sơ Kỳ' },
    { name: 'Kim Đan - Trung Kỳ - Tầng 1', exp: 158000, breakRate: 80, expPenalty: 30, itemPenalty: 5, requirements: ['d1:3'], role: 'Kim Đan - Trung Kỳ' },
    { name: 'Kim Đan - Trung Kỳ - Tầng 9', exp: 174000, breakRate: 40, expPenalty: 35, itemPenalty: 8, requirements: ['d1:4'], role: 'Kim Đan - Trung Kỳ' },
    { name: 'Kim Đan - Hậu Kỳ - Tầng 1', exp: 178000, breakRate: 80, expPenalty: 30, itemPenalty: 5, requirements: ['d1:3'], role: 'Kim Đan - Hậu Kỳ' },
    { name: 'Kim Đan - Hậu Kỳ - Tầng 9', exp: 194000, breakRate: 20, expPenalty: 40, itemPenalty: 10, requirements: ['d1:5'], role: 'Kim Đan - Hậu Kỳ' },
    
    // Nguyên Anh levels  
    { name: 'Nguyên Anh - Sơ Kỳ - Tầng 1', exp: 198000, breakRate: 80, expPenalty: 30, itemPenalty: 6, requirements: ['d1:4'], role: 'Nguyên Anh - Sơ Kỳ' },
    { name: 'Nguyên Anh - Sơ Kỳ - Tầng 9', exp: 214000, breakRate: 40, expPenalty: 35, itemPenalty: 8, requirements: ['d1:5'], role: 'Nguyên Anh - Sơ Kỳ' },
    { name: 'Nguyên Anh - Trung Kỳ - Tầng 1', exp: 218000, breakRate: 80, expPenalty: 30, itemPenalty: 6, requirements: ['d1:4'], role: 'Nguyên Anh - Trung Kỳ' },
    { name: 'Nguyên Anh - Trung Kỳ - Tầng 9', exp: 236000, breakRate: 40, expPenalty: 35, itemPenalty: 8, requirements: ['d1:5'], role: 'Nguyên Anh - Trung Kỳ' },
    { name: 'Nguyên Anh - Hậu Kỳ - Tầng 1', exp: 240000, breakRate: 80, expPenalty: 30, itemPenalty: 6, requirements: ['d1:4'], role: 'Nguyên Anh - Hậu Kỳ' },
    { name: 'Nguyên Anh - Hậu Kỳ - Tầng 9', exp: 256000, breakRate: 20, expPenalty: 40, itemPenalty: 12, requirements: ['d1:6'], role: 'Nguyên Anh - Hậu Kỳ' },
    
    // Hóa Thần levels
    { name: 'Hóa Thần - Sơ Kỳ - Tầng 1', exp: 266000, breakRate: 80, expPenalty: 35, itemPenalty: 7, requirements: ['d1:5'], role: 'Hóa Thần - Sơ Kỳ' },
    { name: 'Hóa Thần - Sơ Kỳ - Tầng 9', exp: 282000, breakRate: 40, expPenalty: 40, itemPenalty: 10, requirements: ['d1:6'], role: 'Hóa Thần - Sơ Kỳ' },
    { name: 'Hóa Thần - Trung Kỳ - Tầng 1', exp: 286000, breakRate: 80, expPenalty: 35, itemPenalty: 7, requirements: ['d1:6'], role: 'Hóa Thần - Trung Kỳ' },
    { name: 'Hóa Thần - Trung Kỳ - Tầng 9', exp: 302000, breakRate: 40, expPenalty: 40, itemPenalty: 10, requirements: ['d1:7'], role: 'Hóa Thần - Trung Kỳ' },
    { name: 'Hóa Thần - Hậu Kỳ - Tầng 1', exp: 306000, breakRate: 80, expPenalty: 35, itemPenalty: 7, requirements: ['d1:7'], role: 'Hóa Thần - Hậu Kỳ' },
    { name: 'Hóa Thần - Hậu Kỳ - Tầng 9', exp: 322000, breakRate: 20, expPenalty: 45, itemPenalty: 15, requirements: ['d1:8'], role: 'Hóa Thần - Hậu Kỳ' },
    
    // Phi Thăng kiếp (Special breakthrough)
    { name: 'Phi Thăng kiếp', exp: 330000, breakRate: 5, expPenalty: 50, itemPenalty: 20, requirements: ['d1:9', 'lt1:999'], role: 'Phi Thăng kiếp' },

    // Luyện Hư realm  
    { name: 'Luyện Hư - Sơ Kỳ - Tầng 1', exp: 340000, breakRate: 80, expPenalty: 30, itemPenalty: 8, requirements: ['lt2:1'], role: 'Luyện Hư - Sơ Kỳ' },
    { name: 'Luyện Hư - Sơ Kỳ - Tầng 9', exp: 380000, breakRate: 40, expPenalty: 35, itemPenalty: 10, requirements: ['lt2:1'], role: 'Luyện Hư - Sơ Kỳ' },
    { name: 'Luyện Hư - Trung Kỳ - Tầng 1', exp: 390000, breakRate: 80, expPenalty: 35, itemPenalty: 8, requirements: ['d2:1'], role: 'Luyện Hư - Trung Kỳ' },
    { name: 'Luyện Hư - Trung Kỳ - Tầng 9', exp: 430000, breakRate: 40, expPenalty: 40, itemPenalty: 12, requirements: ['d2:2'], role: 'Luyện Hư - Trung Kỳ' },
    { name: 'Luyện Hư - Hậu Kỳ - Tầng 1', exp: 440000, breakRate: 80, expPenalty: 35, itemPenalty: 8, requirements: ['d2:2'], role: 'Luyện Hư - Hậu Kỳ' },
    { name: 'Luyện Hư - Hậu Kỳ - Tầng 9', exp: 480000, breakRate: 20, expPenalty: 45, itemPenalty: 15, requirements: ['d2:3'], role: 'Luyện Hư - Hậu Kỳ' },
    
    // Hợp Thể levels
    { name: 'Hợp Thể - Sơ Kỳ - Tầng 1', exp: 505000, breakRate: 80, expPenalty: 35, itemPenalty: 10, requirements: ['d2:3'], role: 'Hợp Thể - Sơ Kỳ' },
    { name: 'Hợp Thể - Sơ Kỳ - Tầng 9', exp: 545000, breakRate: 40, expPenalty: 40, itemPenalty: 12, requirements: ['d2:4'], role: 'Hợp Thể - Sơ Kỳ' },
    { name: 'Hợp Thể - Trung Kỳ - Tầng 1', exp: 555000, breakRate: 80, expPenalty: 35, itemPenalty: 10, requirements: ['d2:4'], role: 'Hợp Thể - Trung Kỳ' },
    { name: 'Hợp Thể - Trung Kỳ - Tầng 9', exp: 595000, breakRate: 40, expPenalty: 40, itemPenalty: 12, requirements: ['d2:5'], role: 'Hợp Thể - Trung Kỳ' },
    { name: 'Hợp Thể - Hậu Kỳ - Tầng 1', exp: 605000, breakRate: 80, expPenalty: 35, itemPenalty: 10, requirements: ['d2:5'], role: 'Hợp Thể - Hậu Kỳ' },
    { name: 'Hợp Thể - Hậu Kỳ - Tầng 9', exp: 645000, breakRate: 20, expPenalty: 45, itemPenalty: 15, requirements: ['d2:6'], role: 'Hợp Thể - Hậu Kỳ' },
    
    // Đại Thừa levels
    { name: 'Đại Thừa - Sơ Kỳ - Tầng 1', exp: 670000, breakRate: 80, expPenalty: 40, itemPenalty: 12, requirements: ['d2:6'], role: 'Đại Thừa - Sơ Kỳ' },
    { name: 'Đại Thừa - Sơ Kỳ - Tầng 9', exp: 710000, breakRate: 40, expPenalty: 45, itemPenalty: 15, requirements: ['d2:7'], role: 'Đại Thừa - Sơ Kỳ' },
    { name: 'Đại Thừa - Trung Kỳ - Tầng 1', exp: 720000, breakRate: 80, expPenalty: 40, itemPenalty: 12, requirements: ['d2:7'], role: 'Đại Thừa - Trung Kỳ' },
    { name: 'Đại Thừa - Trung Kỳ - Tầng 9', exp: 760000, breakRate: 40, expPenalty: 45, itemPenalty: 15, requirements: ['d2:8'], role: 'Đại Thừa - Trung Kỳ' },
    { name: 'Đại Thừa - Hậu Kỳ - Tầng 1', exp: 770000, breakRate: 80, expPenalty: 40, itemPenalty: 12, requirements: ['d2:8'], role: 'Đại Thừa - Hậu Kỳ' },
    { name: 'Đại Thừa - Hậu Kỳ - Tầng 9', exp: 810000, breakRate: 20, expPenalty: 50, itemPenalty: 18, requirements: ['d2:9'], role: 'Đại Thừa - Hậu Kỳ' },
    
    // Thăng Tiên kiếp
    { name: 'Thăng Tiên kiếp', exp: 860000, breakRate: 5, expPenalty: 50, itemPenalty: 20, requirements: ['d2:9', 'lt3:999'], role: 'Thăng Tiên kiếp' },
    
    // Chân Tiên realm
    { name: 'Chân Tiên - Sơ Kỳ - Tầng 1', exp: 910000, breakRate: 80, expPenalty: 40, itemPenalty: 15, requirements: ['d3:2'], role: 'Chân Tiên - Sơ Kỳ' },
    { name: 'Chân Tiên - Sơ Kỳ - Tầng 9', exp: 990000, breakRate: 40, expPenalty: 45, itemPenalty: 18, requirements: ['d3:3'], role: 'Chân Tiên - Sơ Kỳ' },
    { name: 'Chân Tiên - Trung Kỳ - Tầng 1', exp: 1010000, breakRate: 80, expPenalty: 40, itemPenalty: 15, requirements: ['d3:3'], role: 'Chân Tiên - Trung Kỳ' },
    { name: 'Chân Tiên - Trung Kỳ - Tầng 9', exp: 1090000, breakRate: 40, expPenalty: 45, itemPenalty: 18, requirements: ['d3:4'], role: 'Chân Tiên - Trung Kỳ' },
    { name: 'Chân Tiên - Hậu Kỳ - Tầng 1', exp: 1110000, breakRate: 80, expPenalty: 40, itemPenalty: 15, requirements: ['d3:4'], role: 'Chân Tiên - Hậu Kỳ' },
    { name: 'Chân Tiên - Hậu Kỳ - Tầng 9', exp: 1190000, breakRate: 20, expPenalty: 50, itemPenalty: 20, requirements: ['d3:6'], role: 'Chân Tiên - Hậu Kỳ' },
    
    // Kim Tiên realm
    { name: 'Kim Tiên - Sơ Kỳ - Tầng 1', exp: 1240000, breakRate: 80, expPenalty: 45, itemPenalty: 18, requirements: ['d3:6'], role: 'Kim Tiên - Sơ Kỳ' },
    { name: 'Kim Tiên - Sơ Kỳ - Tầng 9', exp: 1320000, breakRate: 40, expPenalty: 50, itemPenalty: 20, requirements: ['d3:7'], role: 'Kim Tiên - Sơ Kỳ' },
    { name: 'Kim Tiên - Trung Kỳ - Tầng 1', exp: 1340000, breakRate: 80, expPenalty: 45, itemPenalty: 18, requirements: ['d3:7'], role: 'Kim Tiên - Trung Kỳ' },
    { name: 'Kim Tiên - Trung Kỳ - Tầng 9', exp: 1420000, breakRate: 40, expPenalty: 50, itemPenalty: 20, requirements: ['d3:8'], role: 'Kim Tiên - Trung Kỳ' },
    { name: 'Kim Tiên - Hậu Kỳ - Tầng 1', exp: 1440000, breakRate: 80, expPenalty: 45, itemPenalty: 18, requirements: ['d3:8'], role: 'Kim Tiên - Hậu Kỳ' },
    { name: 'Kim Tiên - Hậu Kỳ - Tầng 9', exp: 1520000, breakRate: 20, expPenalty: 55, itemPenalty: 25, requirements: ['d3:9'], role: 'Kim Tiên - Hậu Kỳ' },
    
    // Thái Ất realm
    { name: 'Thái Ất - Hạ Vị - Tầng 1', exp: 1570000, breakRate: 60, expPenalty: 45, itemPenalty: 20, requirements: ['d4:1'], role: 'Thái Ất - Hạ Vị' },
    { name: 'Thái Ất - Hạ Vị - Tầng 9', exp: 1670000, breakRate: 30, expPenalty: 50, itemPenalty: 25, requirements: ['d4:2'], role: 'Thái Ất - Hạ Vị' },
    { name: 'Thái Ất - Trung Vị - Tầng 1', exp: 1690000, breakRate: 60, expPenalty: 45, itemPenalty: 20, requirements: ['d4:2'], role: 'Thái Ất - Trung Vị' },
    { name: 'Thái Ất - Trung Vị - Tầng 9', exp: 1870000, breakRate: 30, expPenalty: 50, itemPenalty: 25, requirements: ['d4:3'], role: 'Thái Ất - Trung Vị' },
    { name: 'Thái Ất - Thượng Vị - Tầng 1', exp: 1900000, breakRate: 60, expPenalty: 45, itemPenalty: 20, requirements: ['d4:3'], role: 'Thái Ất - Thượng Vị' },
    { name: 'Thái Ất - Thượng Vị - Tầng 9', exp: 1980000, breakRate: 15, expPenalty: 55, itemPenalty: 30, requirements: ['d4:5'], role: 'Thái Ất - Thượng Vị' },
    
    // Đại La realm
    { name: 'Đại La - Hạ Vị - Tầng 1', exp: 2030000, breakRate: 60, expPenalty: 50, itemPenalty: 25, requirements: ['d4:5'], role: 'Đại La - Hạ Vị' },
    { name: 'Đại La - Hạ Vị - Tầng 9', exp: 2110000, breakRate: 30, expPenalty: 55, itemPenalty: 30, requirements: ['d4:6'], role: 'Đại La - Hạ Vị' },
    { name: 'Đại La - Trung Vị - Tầng 1', exp: 2130000, breakRate: 60, expPenalty: 50, itemPenalty: 25, requirements: ['d4:6'], role: 'Đại La - Trung Vị' },
    { name: 'Đại La - Trung Vị - Tầng 9', exp: 2210000, breakRate: 30, expPenalty: 55, itemPenalty: 30, requirements: ['d4:7'], role: 'Đại La - Trung Vị' },
    { name: 'Đại La - Thượng Vị - Tầng 1', exp: 2230000, breakRate: 60, expPenalty: 50, itemPenalty: 25, requirements: ['d4:7'], role: 'Đại La - Thượng Vị' },
    { name: 'Đại La - Thượng Vị - Tầng 9', exp: 2310000, breakRate: 30, expPenalty: 55, itemPenalty: 30, requirements: ['d4:8'], role: 'Đại La - Thượng Vị' },
    
    // Hợp Đạo kiếp
    { name: 'Hợp Đạo kiếp', exp: 2500000, breakRate: 0.5, expPenalty: 60, itemPenalty: 35, requirements: ['d4:9', 'lt4:999'], role: 'Hợp Đạo kiếp' },
    
    // Đạo Tổ levels - cần tất cả loại đan dược và linh thạch
    { name: 'Đạo Tổ - Nhân Cảnh', exp: 3000000, breakRate: 0.1, expPenalty: 50, itemPenalty: 20, requirements: ['d2:9', 'd3:9', 'd4:9', 'lt1:999', 'lt2:999', 'lt3:999', 'lt4:999'], role: 'Đạo Tổ - Nhân Cảnh' },
    { name: 'Đạo Tổ - Địa Cảnh', exp: 4000000, breakRate: 0.1, expPenalty: 50, itemPenalty: 20, requirements: ['d2:9', 'd3:9', 'd4:9', 'lt1:999', 'lt2:999', 'lt3:999', 'lt4:999'], role: 'Đạo Tổ - Địa Cảnh' },
    { name: 'Đạo Tổ - Thiên Cảnh', exp: 5000000, breakRate: 0.1, expPenalty: 50, itemPenalty: 20, requirements: ['d2:9', 'd3:9', 'd4:9', 'lt1:999', 'lt2:999', 'lt3:999', 'lt4:999'], role: 'Đạo Tổ - Thiên Cảnh' },
    
    // Cuối cùng
    { name: 'Bạch Ngọc Chí Tôn', exp: 10000000, breakRate: 0, expPenalty: 0, itemPenalty: 0, requirements: [], role: 'Bạch Ngọc Chí Tôn' }
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

    // Apply EXP penalty - random từ 1-10% thay vì theo levelData.expPenalty
    if (levelData.expPenalty > 0) {
        const user = await client.prisma.cultivationUser.findUnique({
            where: { userId: userId }
        });

        if (user) {
            // Random mất từ 1-10% EXP
            const randomPenaltyPercent = Math.floor(Math.random() * 10) + 1; // 1-10%
            const expLoss = Math.floor(user.exp * (randomPenaltyPercent / 100));
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
    
    // Check FARM_MATERIALS first (chỉ còn 1-7, lt1)
    if (FARM_MATERIALS[itemId]) {
        return {
            category: 'material',
            actualId: itemId,
            name: FARM_MATERIALS[itemId].name,
            icon: FARM_MATERIALS[itemId].icon
        };
    }
    
    // Check MEDICINES (d1-d4)
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
    
    // Check SHOP_ITEMS (dp1-dp4, pdp, dl, tlt, linh đan, linh dược, sách)
    if (SHOP_ITEMS[itemId]) {
        const shopItem = SHOP_ITEMS[itemId];
        return {
            category: shopItem.category,
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

// Function to automatically create and manage roles
async function ensureRoleExists(guild, roleName, position = 0) {
    try {
        // Check if role already exists
        let role = guild.roles.cache.find(r => r.name === roleName);
        
        if (!role) {
            // Create new role
            role = await guild.roles.create({
                name: roleName,
                color: getRoleColor(roleName),
                position: position,
                mentionable: false,
                hoist: true // Show separately in member list
            });
            console.log(`✅ Created role: ${roleName}`);
        }
        
        return role;
    } catch (error) {
        console.error(`❌ Error creating role ${roleName}:`, error);
        return null;
    }
}

// Get role color based on cultivation level
function getRoleColor(roleName) {
    const colorMap = {
        'Nhập Môn Tu Tiên': '#FFFFFF',        // White
        'Luyện Khí - Sơ Kỳ': '#00FF00',      // Green
        'Luyện Khí - Trung Kỳ': '#00FF88',   // Light Green
        'Luyện Khí - Hậu Kỳ': '#00FFFF',     // Cyan
        'Trúc Cơ - Sơ Kỳ': '#0088FF',       // Blue
        'Trúc Cơ - Trung Kỳ': '#0044FF',     // Dark Blue
        'Trúc Cơ - Hậu Kỳ': '#8800FF',      // Purple
        'Kim Đan - Sơ Kỳ': '#FF00FF',       // Magenta
        'Kim Đan - Trung Kỳ': '#FF0088',     // Pink
        'Kim Đan - Hậu Kỳ': '#FF0044',      // Red Pink
        'Nguyên Anh - Sơ Kỳ': '#FF4400',    // Orange Red
        'Nguyên Anh - Trung Kỳ': '#FF8800',  // Orange
        'Nguyên Anh - Hậu Kỳ': '#FFCC00',   // Yellow Orange
        'Hóa Thần - Sơ Kỳ': '#FFFF00',      // Yellow
        'Hóa Thần - Trung Kỳ': '#CCFF00',   // Yellow Green
        'Hóa Thần - Hậu Kỳ': '#88FF00',     // Light Green
        'Phi Thăng kiếp': '#FF0000',         // Red
        'Luyện Hư - Sơ Kỳ': '#8844FF',      // Purple Blue
        'Chân Tiên - Sơ Kỳ': '#4488FF',     // Sky Blue
        'Kim Tiên - Sơ Kỳ': '#FFAA00',      // Gold
        'Thái Ất - Hạ Vị': '#AA44FF',       // Violet
        'Đại La - Hạ Vị': '#44AAFF',        // Light Blue
        'Thăng Tiên kiếp': '#FF4444',        // Bright Red
        'Hợp Đạo kiếp': '#AA0000',          // Dark Red
        'Đạo Tổ - Nhân Cảnh': '#000000',    // Black
        'Đạo Tổ - Địa Cảnh': '#444444',     // Dark Gray
        'Đạo Tổ - Thiên Cảnh': '#888888',   // Gray
        'Bạch Ngọc Chí Tôn': '#FFD700'      // Gold
    };
    
    return colorMap[roleName] || '#CCCCCC'; // Default gray
}

// Setup role hierarchy for all cultivation roles
async function setupRoleHierarchy(guild) {
    try {
        console.log('🔧 Setting up cultivation role hierarchy...');
        
        // Get all unique roles from CULTIVATION_LEVELS in reverse order (highest first)
        const uniqueRoles = [...new Set(CULTIVATION_LEVELS.map(level => level.role))].reverse();
        
        // Get bot's highest role position
        const botMember = guild.members.me;
        const botHighestPosition = botMember.roles.highest.position;
        
        // Create/update roles with proper hierarchy
        for (let i = 0; i < uniqueRoles.length; i++) {
            const roleName = uniqueRoles[i];
            const targetPosition = Math.max(1, botHighestPosition - i - 1); // Below bot's role
            
            const role = await ensureRoleExists(guild, roleName, targetPosition);
            if (role && role.position !== targetPosition) {
                try {
                    await role.setPosition(targetPosition);
                    console.log(`📍 Set position for ${roleName}: ${targetPosition}`);
                } catch (posError) {
                    console.log(`⚠️ Could not set position for ${roleName}: ${posError.message}`);
                }
            }
        }
        
        console.log('✅ Role hierarchy setup complete!');
        return true;
    } catch (error) {
        console.error('❌ Error setting up role hierarchy:', error);
        return false;
    }
}

// Remove old function and replace with new one
async function giveBreakthroughRewards(client, userId, levelData) {
    // No longer gives rewards, just return empty array for compatibility
    return [];
}

function formatRewards(levelData) {
    if (!levelData.rewards || levelData.rewards.length === 0) {
        return 'Không có phần thưởng';
    }

    return levelData.rewards.map(rewardString => {
        const [itemType, quantity] = rewardString.split(':');
        const qty = parseInt(quantity);

        let itemName, itemIcon;
        if (itemType.startsWith('lt')) {
            itemName = SPIRIT_STONES[itemType]?.name || itemType;
            itemIcon = SPIRIT_STONES[itemType]?.icon || '💎';
        } else {
            itemName = FARM_MATERIALS[itemType]?.name || itemType;
            itemIcon = FARM_MATERIALS[itemType]?.icon || '🔮';
        }

        return `${itemIcon} ${itemName} x${qty}`;
    }).join(', ');
}

// Helper function to check breakthrough requirements
async function checkBreakthroughRequirements(client, userId, levelData) {
    if (!levelData.requirements || levelData.requirements.length === 0) {
        return { canBreakthrough: true, missingItems: [] };
    }

    // Get user inventory
    const inventory = await client.prisma.userInventory.findMany({
        where: { userId: userId }
    });

    // Convert to easy lookup
    const userItems = {};
    inventory.forEach(item => {
        const key = `${item.itemType}_${item.itemId}`;
        userItems[key] = item.quantity;
        
        // Handle spirit stones - store both ways for compatibility
        if (item.itemId.startsWith('spirit_')) {
            const actualId = item.itemId.replace('spirit_', '');
            userItems[actualId] = item.quantity;
        }
    });

    const missingItems = [];
    
    for (const requirementString of levelData.requirements) {
        const [itemType, quantity] = requirementString.split(':');
        const needed = parseInt(quantity);
        
        const storageInfo = getItemStorageInfo(itemType);
        const key = `${storageInfo.category}_${storageInfo.actualId}`;
        const have = userItems[key] || 0;
        
        if (have < needed) {
            missingItems.push({
                itemType,
                name: storageInfo.name,
                icon: storageInfo.icon,
                needed,
                have
            });
        }
    }

    return {
        canBreakthrough: missingItems.length === 0,
        missingItems
    };
}

// Helper function to consume breakthrough requirements
async function consumeBreakthroughRequirements(client, userId, levelData) {
    if (!levelData.requirements || levelData.requirements.length === 0) {
        return [];
    }

    const consumedItems = [];
    
    for (const requirementString of levelData.requirements) {
        const [itemType, quantity] = requirementString.split(':');
        const needed = parseInt(quantity);
        
        const storageInfo = getItemStorageInfo(itemType);
        
        try {
            await client.prisma.userInventory.update({
                where: {
                    userId_itemType_itemId: {
                        userId: userId,
                        itemType: storageInfo.category,
                        itemId: storageInfo.actualId
                    }
                },
                data: {
                    quantity: { decrement: needed }
                }
            });

            consumedItems.push({
                name: storageInfo.name,
                quantity: needed,
                icon: storageInfo.icon
            });

        } catch (error) {
            console.error(`Error consuming requirement ${itemType}:${quantity}:`, error);
        }
    }

    return consumedItems;
}

function formatRequirements(levelData) {
    if (!levelData.requirements || levelData.requirements.length === 0) {
        return 'Không có yêu cầu';
    }

    return levelData.requirements.map(requirementString => {
        const [itemType, quantity] = requirementString.split(':');
        const qty = parseInt(quantity);

        const storageInfo = getItemStorageInfo(itemType);
        return `${storageInfo.icon} ${storageInfo.name} x${qty}`;
    }).join(', ');
}

module.exports = {
    FARM_MATERIALS,
    MEDICINES,
    SPIRIT_STONES,
    SHOP_ITEMS,
    CRAFT_RECIPES,
    CULTIVATION_LEVELS,
    getRandomDrop,
    getLevelByName,
    getNextLevel,
    canBreakthrough,
    rollBreakthrough,
    applyBreakthroughPenalty,
    giveBreakthroughRewards,
    formatRequirements,
    getItemStorageInfo,
    checkBreakthroughRequirements,
    consumeBreakthroughRequirements,
    ensureRoleExists,
    setupRoleHierarchy,
    getRoleColor
};   