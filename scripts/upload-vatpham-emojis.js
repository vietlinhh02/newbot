const { Client, GatewayIntentBits } = require('discord.js');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildEmojisAndStickers
    ]
});

// Thư mục chứa ảnh vật phẩm
const VATPHAM_DIRS = [
    path.join(__dirname, '../vật phẩm/Vật Phẩm/Đan, Đan phương'),
    path.join(__dirname, '../vật phẩm/Vật Phẩm/Linh thạch, Tụ linh thạch'), 
    path.join(__dirname, '../vật phẩm/Vật Phẩm/Nguyên liệu')
];

// Server ID cụ thể
const TARGET_GUILD_ID = '1121465550581805111';

// Mapping tên file thành tên emoji
const EMOJI_NAMES = {
    // Đan dược
    'd1.png': 'dan_duoc_ha_pham',
    'd2.png': 'dan_duoc_trung_pham',
    'd3.png': 'dan_duoc_thuong_pham',
    'd4.png': 'dan_duoc_tien_pham',
    'dl.png': 'dan_lo',
    
    // Đan phương
    'dp1.png': 'dan_phuong_ha_pham',
    'dp2.png': 'dan_phuong_trung_pham',
    'dp3.png': 'dan_phuong_thuong_pham',
    'dp4.png': 'dan_phuong_tien_pham',
    'pdp.png': 'phien_dan_phuong',
    
    // Linh thạch
    'lt1.png': 'linh_thach_ha_pham',
    'lt2.png': 'linh_thach_trung_pham',
    'lt3.png': 'linh_thach_thuong_pham',
    'lt4.png': 'linh_thach_tien_pham',
    'tlt.png': 'tu_linh_thach',
    
    // Nguyên liệu
    '1 bạch ngọc sương.png': 'bach_ngoc_suong',
    '2 tụ linh thảo.png': 'tu_linh_thao',
    '3 tử hoa thảo.png': 'tu_hoa_thao',
    '4 hồng tú hoa.png': 'hong_tu_hoa',
    '5 ngũ sắc hoa.png': 'ngu_sac_hoa',
    '6 ngũ sắc thạch.png': 'ngu_sac_thach',
    '7 huyết ngọc hoa.png': 'huyet_ngoc_hoa'
};

async function uploadVatPhamEmojis() {
    try {
        console.log('🚀 Bắt đầu upload emoji vật phẩm tu tiên...');
        
        // Lấy guild cụ thể
        const guild = client.guilds.cache.get(TARGET_GUILD_ID);
        if (!guild) {
            console.error(`❌ Không tìm thấy server với ID: ${TARGET_GUILD_ID}`);
            return;
        }

        console.log(`📍 Server: ${guild.name}`);
        
        // Kiểm tra quyền bot
        const botMember = await guild.members.fetch(client.user.id);
        const hasPermission = botMember.permissions.has('ManageEmojisAndStickers');
        
        if (!hasPermission) {
            console.error('❌ Bot không có quyền "Manage Emojis and Stickers"!');
            return;
        }

        // Lấy emoji hiện tại
        await guild.emojis.fetch();
        const currentEmojis = guild.emojis.cache;
        console.log(`📊 Emoji hiện tại: ${currentEmojis.size}/${guild.maximumEmojis || 50}`);

        // Thu thập tất cả file ảnh từ các thư mục
        let allFiles = [];
        for (const dir of VATPHAM_DIRS) {
            if (fs.existsSync(dir)) {
                const files = fs.readdirSync(dir)
                    .filter(file => file.endsWith('.png'))
                    .map(file => ({ file, dir }));
                allFiles = allFiles.concat(files);
            }
        }

        console.log(`📁 Tìm thấy ${allFiles.length} file ảnh vật phẩm`);

        let uploadCount = 0;
        let skipCount = 0;
        let errorCount = 0;
        const emojiMapping = {};

        console.log('\n📤 Bắt đầu upload...');

        for (const { file, dir } of allFiles) {
            try {
                // Tạo tên emoji
                const emojiName = EMOJI_NAMES[file] || file.replace('.png', '').toLowerCase().replace(/[^a-z0-9_]/g, '_');
                const fullEmojiName = `vatpham_${emojiName}`;
                
                // Kiểm tra emoji đã tồn tại
                const existingEmoji = currentEmojis.find(emoji => emoji.name === fullEmojiName);
                
                if (existingEmoji) {
                    console.log(`⏭️  ${file} → :${existingEmoji.name}: (đã tồn tại)`);
                    emojiMapping[emojiName.toUpperCase()] = `<:${existingEmoji.name}:${existingEmoji.id}>`;
                    skipCount++;
                    continue;
                }

                // Kiểm tra giới hạn emoji
                if (currentEmojis.size + uploadCount >= (guild.maximumEmojis || 50)) {
                    console.warn(`⚠️  Đã đạt giới hạn emoji (${guild.maximumEmojis || 50}), dừng upload`);
                    break;
                }

                // Upload emoji
                const imagePath = path.join(dir, file);
                const imageBuffer = fs.readFileSync(imagePath);
                
                console.log(`📤 ${file} → :${fullEmojiName}:`);
                
                const emoji = await guild.emojis.create({
                    attachment: imageBuffer,
                    name: fullEmojiName,
                    reason: 'Tu Tiên Bot - Vật phẩm emoji upload'
                });

                console.log(`✅ Upload thành công :${emoji.name}: (ID: ${emoji.id})`);
                emojiMapping[emojiName.toUpperCase()] = `<:${emoji.name}:${emoji.id}>`;
                uploadCount++;

                // Delay để tránh rate limit
                await new Promise(resolve => setTimeout(resolve, 1200));
                
            } catch (error) {
                console.error(`❌ Lỗi upload ${file}:`, error.message);
                errorCount++;
            }
        }

        console.log('\n📊 Tổng kết upload:');
        console.log(`✅ Upload thành công: ${uploadCount} emoji mới`);
        console.log(`⏭️  Đã bỏ qua: ${skipCount} emoji có sẵn`);
        console.log(`❌ Lỗi: ${errorCount} file thất bại`);

        // Tạo mapping cho code
        if (Object.keys(emojiMapping).length > 0) {
            console.log('\n🔧 Emoji Mapping được tạo:');
            console.log('```javascript');
            console.log('const VATPHAM_EMOJI_MAP = {');
            for (const [key, value] of Object.entries(emojiMapping)) {
                console.log(`    '${key}': '${value}',`);
            }
            console.log('};');
            console.log('```');

            // Ghi vào file
            const mappingContent = `// Vật phẩm emoji mapping - Auto generated
const VATPHAM_EMOJI_MAP = {
${Object.entries(emojiMapping).map(([key, value]) => `    '${key}': '${value}',`).join('\n')}
};

module.exports = { VATPHAM_EMOJI_MAP };
`;
            
            fs.writeFileSync(path.join(__dirname, '../utils/vatphamEmojis.js'), mappingContent);
            console.log('\n💾 Đã lưu mapping vào utils/vatphamEmojis.js');
        }

        console.log(`\n🎉 Hoàn thành setup ${Object.keys(emojiMapping).length} emoji vật phẩm!`);

    } catch (error) {
        console.error('💥 Lỗi trong quá trình upload:', error);
    }
}

client.once('ready', async () => {
    console.log(`🤖 Bot đã đăng nhập: ${client.user.tag}`);
    
    await uploadVatPhamEmojis();
    
    console.log('\n🏁 Hoàn thành upload emoji!');
    process.exit(0);
});

client.login(process.env.TOKEN); 