const { MEDICINES, FARM_MATERIALS, SPIRIT_STONES, SHOP_ITEMS } = require('../../utils/cultivationData');

module.exports = {
    name: 'inventory',
    aliases: ['inv', 'kho', 'bag', 'zoo', 'materials', 'farm_items', 'nguyen_lieu', 'z'],
    description: 'Xem kho đồ tu luyện (nguyên liệu + thuốc + linh thạch + shop items) của bạn',
    usage: '!inventory [user] [type]',
    examples: [
        '!inventory - Xem tất cả',
        '!inv @user - Xem của user khác', 
        '!zoo - Alias cũ vẫn hoạt động'
    ],
    permissions: 'everyone',
    guildOnly: true,
    category: 'cultivation',

    async execute(message, args, client) {
        try {
            // Parse arguments
            let targetUser = message.author;
            
            // Check arguments
            for (const arg of args) {
                if (arg.startsWith('<@') || /^\d+$/.test(arg.replace(/[<@!>]/g, ''))) {
                    // This is a user mention or ID
                    const userMention = message.mentions.users.first();
                    const userId = arg.replace(/[<@!>]/g, '');
                    
                    if (userMention) {
                        targetUser = userMention;
                    } else {
                        try {
                            targetUser = await client.users.fetch(userId);
                        } catch (error) {
                            return message.reply('❌ Không tìm thấy user này!');
                        }
                    }
                }
            }

            const userId = targetUser.id;

            // Get cultivation user data
            const cultivationUser = await client.prisma.cultivationUser.findUnique({
                where: {
                    userId: userId
                }
            });

            if (!cultivationUser) {
                return message.reply(`❌ **${targetUser.username}** chưa bắt đầu tu luyện! Gửi tin nhắn trong server để bắt đầu nhận EXP.`);
            }

            // Get inventory data
            const inventory = await client.prisma.userInventory.findMany({
                where: {
                    userId: userId
                },
                orderBy: { itemId: 'asc' }
            });

            // Separate materials, medicines, spirit stones, and shop items
            const materials = inventory.filter(item => 
                item.itemType === 'material' && 
                !item.itemId.startsWith('lt') && 
                !SHOP_ITEMS[item.itemId]
            );
            const medicines = inventory.filter(item => 
                item.itemType === 'medicine' && 
                !SHOP_ITEMS[item.itemId]
            );
            const spiritStones = inventory.filter(item => 
                item.itemType === 'material' && 
                item.itemId.startsWith('lt')
            );
            const shopItems = inventory.filter(item => 
                SHOP_ITEMS[item.itemId] && item.quantity > 0
            );

            // Build response
            let responseText = `====== **${targetUser.username}'s Cultivation Inventory** ======\n`;

            // Show materials
            responseText += `\n🌿 **NGUYÊN LIỆU FARM:**\n`;
            
            const materialDisplay = [];
            let totalMaterials = 0;
            
            // Basic materials (1-7)
            for (let i = 1; i <= 7; i++) {
                const material = materials.find(m => m.itemId === i.toString());
                const materialData = FARM_MATERIALS[i.toString()];
                const quantity = material ? material.quantity : 0;
                if (quantity > 0 && materialData && materialData.icon) {
                    materialDisplay.push(`${materialData.icon}${quantity}`);
                } else if (quantity > 0 && materialData && materialData.fallbackIcon) {
                    materialDisplay.push(`${materialData.fallbackIcon}${quantity}`);
                }
                totalMaterials += quantity;
            }
            
            // Special farmable materials (lt1 từ farm)
            const specialMaterial = materials.find(m => m.itemId === 'lt1');
            const specialData = FARM_MATERIALS['lt1'];
            const specialQuantity = specialMaterial ? specialMaterial.quantity : 0;
            if (specialQuantity > 0 && specialData && specialData.icon) {
                materialDisplay.push(`${specialData.icon}${specialQuantity}`);
                totalMaterials += specialQuantity;
            } else if (specialQuantity > 0 && specialData && specialData.fallbackIcon) {
                materialDisplay.push(`${specialData.fallbackIcon}${specialQuantity}`);
                totalMaterials += specialQuantity;
            }
            
            if (materialDisplay.length > 0) {
                responseText += materialDisplay.join(' ') + '\n';
            } else {
                responseText += '🚫 Chưa có nguyên liệu nào! Dùng `!farm` để thu thập.\n';
            }

            // Show medicines
            responseText += `\n🧪 **THUỐC & ĐAN DƯỢC:**\n`;
            
            const medicineDisplay = [];
            
            // Không hiển thị thuốc cũ z series nữa
            
            // Đan dược (d series) - d1-d4
            ['d1', 'd2', 'd3', 'd4'].forEach(medicineId => {
                const medicine = medicines.find(m => m.itemId === medicineId);
                const medicineData = MEDICINES[medicineId];
                const quantity = medicine ? medicine.quantity : 0;
                if (quantity > 0 && medicineData && medicineData.icon) {
                    medicineDisplay.push(`${medicineData.icon}${quantity}`);
                }
            });
            
            // Extended đan dược from additems (d5+)
            const extendedMedicines = medicines.filter(m => 
                m.itemId.startsWith('d') && m.itemId.length > 2
            );
            extendedMedicines.forEach(medicine => {
                if (medicine.quantity > 0) {
                    const level = parseInt(medicine.itemId.substring(1));
                    const danDuocLevels = ['HA_PHAM', 'TRUNG_PHAM', 'THUONG_PHAM', 'TIEN_PHAM'];
                    const iconKey = `DAN_DUOC_${danDuocLevels[(level - 1) % 4]}`;
                    const { VATPHAM_EMOJI_MAP } = require('../../utils/vatphamEmojis');
                    const icon = VATPHAM_EMOJI_MAP[iconKey] || '💊';
                    medicineDisplay.push(`${icon}${medicine.quantity}`);
                }
            });
            
            // Shop items đan phương và đan lò sẽ hiển thị ở phần shop items bên dưới

            if (medicineDisplay.length > 0) {
                responseText += medicineDisplay.join(' ') + '\n';
            } else {
                responseText += '🚫 Chưa có thuốc/đan dược nào! Dùng `!craft` để chế tạo từ nguyên liệu + đan phương + đan lò.\n';
            }

            // Show spirit stones
            responseText += `\n💎 **LINH THẠCH (craft từ đột phá):**\n`;
            
            const stoneDisplay = [];
            let totalStones = 0;
            
            // Check for spirit stones (lt1-lt4)
            ['lt1', 'lt2', 'lt3', 'lt4'].forEach(stoneId => {
                const stone = spiritStones.find(s => s.itemId === stoneId);
                const stoneData = SPIRIT_STONES[stoneId];
                const quantity = stone ? stone.quantity : 0;
                if (quantity > 0 && stoneData && stoneData.icon) {
                    stoneDisplay.push(`${stoneData.icon}${quantity}`);
                    totalStones += quantity;
                } else if (quantity > 0 && stoneData && stoneData.fallbackIcon) {
                    stoneDisplay.push(`${stoneData.fallbackIcon}${quantity}`);
                    totalStones += quantity;
                }
            });
            
            // Check for extended spirit stones from additems (lt5+)
            const extendedStones = spiritStones.filter(s => 
                s.itemId.startsWith('lt') && s.itemId.length > 3
            );
            extendedStones.forEach(stone => {
                if (stone.quantity > 0) {
                    const level = stone.itemId.substring(2);
                    const linhThachLevels = ['HA_PHAM', 'TRUNG_PHAM', 'THUONG_PHAM', 'TIEN_PHAM'];
                    const iconKey = `LINH_THACH_${linhThachLevels[(parseInt(level) - 1) % 4]}`;
                    const { VATPHAM_EMOJI_MAP } = require('../../utils/vatphamEmojis');
                    const icon = VATPHAM_EMOJI_MAP[iconKey] || '💎';
                    stoneDisplay.push(`${icon}${stone.quantity}`);
                    totalStones += stone.quantity;
                }
            });

            if (stoneDisplay.length > 0) {
                responseText += stoneDisplay.join(' ') + '\n';
            } else {
                responseText += '🚫 Chưa có linh thạch nào! Dùng `!craft` để craft từ lt1 (farmable) + tụ linh thạch.\n';
            }

            // Show shop items (đan phương, đan lò, tụ linh thạch)
            responseText += `\n🛍️ **VẬT PHẨM SHOP (nguyên liệu chế tạo):**\n`;
            
            const shopDisplay = [];
            
            // Check for shop items
            shopItems.forEach(item => {
                const shopData = SHOP_ITEMS[item.itemId];
                if (shopData && shopData.icon && item.quantity > 0) {
                    shopDisplay.push(`${shopData.icon}${item.quantity}`);
                } else if (shopData && shopData.fallbackIcon && item.quantity > 0) {
                    shopDisplay.push(`${shopData.fallbackIcon}${item.quantity}`);
                }
            });

            if (shopDisplay.length > 0) {
                responseText += shopDisplay.join(' ') + '\n';
            } else {
                responseText += '🚫 Chưa có vật phẩm shop nào! Dùng `!shop` để mua nguyên liệu chế tạo.\n';
            }

            // Add user stats
            responseText += `\n📊 **THỐNG KÊ:**\n`;
            responseText += `• **Level:** ${cultivationUser.currentLevel}\n`;
            responseText += `• **EXP:** ${cultivationUser.exp}\n`;

            // Add helpful tips
            responseText += `\n💡 **GỢI Ý:**\n`;
            responseText += `• \`!farm\` - Thu thập nguyên liệu (1-9), linh thạch (1-99), EXP (1-60) + bonus VIP\n`;
            responseText += `• \`!shop\` - Mua nguyên liệu chế tạo (đan phương, đan lò, tụ linh thạch)\n`;
            responseText += `• \`!craft\` - Chế tạo đan dược từ nguyên liệu + đan phương + đan lò (50% thành công)\n`;
            responseText += `• \`!breakthrough\` - Đột phá cần có đan dược/linh thạch trong túi (random mất 1-10% EXP khi thất bại)\n`;
            responseText += `• **1 tin nhắn** = 1 EXP | **1 phút voice** = 1 EXP + bonus VIP\n`;
            responseText += `• **CHÚ Ý:** Đột phá sẽ tiêu tốn vật phẩm yêu cầu dù thành công hay thất bại!`;

            await message.reply(responseText);

        } catch (error) {
            console.error('Error in inventory command:', error);
            await message.reply(`❌ Lỗi inventory: ${error.message}`);
        }
    }
}; 