const { MEDICINES, FARM_MATERIALS, SPIRIT_STONES, SHOP_ITEMS } = require('../../utils/cultivationData');
const { EmbedBuilder } = require('discord.js');

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

            // Build materials display
            const materialDisplay = [];
            for (let i = 1; i <= 7; i++) {
                const material = materials.find(m => m.itemId === i.toString());
                const materialData = FARM_MATERIALS[i.toString()];
                const quantity = material ? material.quantity : 0;
                if (quantity > 0 && materialData && materialData.icon) {
                    materialDisplay.push(`${materialData.icon}${quantity}`);
                }
            }
            
            // Special farmable materials (lt1)
            const specialMaterial = materials.find(m => m.itemId === 'lt1');
            const specialData = FARM_MATERIALS['lt1'];
            const specialQuantity = specialMaterial ? specialMaterial.quantity : 0;
            if (specialQuantity > 0 && specialData && specialData.icon) {
                materialDisplay.push(`${specialData.icon}${specialQuantity}`);
            }

            // Build medicines display
            const medicineDisplay = [];
            ['d1', 'd2', 'd3', 'd4'].forEach(medicineId => {
                const medicine = medicines.find(m => m.itemId === medicineId);
                const medicineData = MEDICINES[medicineId];
                const quantity = medicine ? medicine.quantity : 0;
                if (quantity > 0 && medicineData && medicineData.icon) {
                    medicineDisplay.push(`${medicineData.icon}${quantity}`);
                }
            });
            
            // Extended đan dược (d5+) - gom theo chất lượng
            const extendedMedicines = medicines.filter(m => 
                m.itemId.startsWith('d') && m.itemId.length > 2
            );
            
            // Gom theo chất lượng
            const medicineGroups = {
                'HA_PHAM': 0,
                'TRUNG_PHAM': 0,
                'THUONG_PHAM': 0,
                'TIEN_PHAM': 0
            };
            
            extendedMedicines.forEach(medicine => {
                if (medicine.quantity > 0) {
                    const level = parseInt(medicine.itemId.substring(1));
                    const danDuocLevels = ['HA_PHAM', 'TRUNG_PHAM', 'THUONG_PHAM', 'TIEN_PHAM'];
                    const qualityType = danDuocLevels[(level - 1) % 4];
                    medicineGroups[qualityType] += medicine.quantity;
                }
            });
            
            // Hiển thị theo nhóm chất lượng
            const { VATPHAM_EMOJI_MAP } = require('../../utils/vatphamEmojis');
            Object.entries(medicineGroups).forEach(([quality, total]) => {
                if (total > 0) {
                    const iconKey = `DAN_DUOC_${quality}`;
                    const icon = VATPHAM_EMOJI_MAP[iconKey] || '💊';
                    medicineDisplay.push(`${icon}${total}`);
                }
            });

            // Build spirit stones display
            const stoneDisplay = [];
            ['lt1', 'lt2', 'lt3', 'lt4'].forEach(stoneId => {
                const stone = spiritStones.find(s => s.itemId === stoneId);
                const stoneData = SPIRIT_STONES[stoneId];
                const quantity = stone ? stone.quantity : 0;
                if (quantity > 0 && stoneData && stoneData.icon) {
                    stoneDisplay.push(`${stoneData.icon}${quantity}`);
                }
            });
            
            // Extended stones (lt5+) - gom theo chất lượng
            const extendedStones = spiritStones.filter(s => 
                s.itemId.startsWith('lt') && s.itemId.length > 3
            );
            
            // Gom theo chất lượng
            const stoneGroups = {
                'HA_PHAM': 0,
                'TRUNG_PHAM': 0,
                'THUONG_PHAM': 0,
                'TIEN_PHAM': 0
            };
            
            extendedStones.forEach(stone => {
                if (stone.quantity > 0) {
                    const level = stone.itemId.substring(2);
                    const linhThachLevels = ['HA_PHAM', 'TRUNG_PHAM', 'THUONG_PHAM', 'TIEN_PHAM'];
                    const qualityType = linhThachLevels[(parseInt(level) - 1) % 4];
                    stoneGroups[qualityType] += stone.quantity;
                }
            });
            
            // Hiển thị theo nhóm chất lượng
            Object.entries(stoneGroups).forEach(([quality, total]) => {
                if (total > 0) {
                    const iconKey = `LINH_THACH_${quality}`;
                    const icon = VATPHAM_EMOJI_MAP[iconKey] || '💎';
                    stoneDisplay.push(`${icon}${total}`);
                }
            });

            // Build shop items display
            const shopDisplay = [];
            shopItems.forEach(item => {
                const shopData = SHOP_ITEMS[item.itemId];
                if (shopData && shopData.icon && item.quantity > 0) {
                    shopDisplay.push(`${shopData.icon}${item.quantity}`);
                }
            });

            // Create embed
            const inventoryEmbed = new EmbedBuilder()
                .setTitle(`📦 ${targetUser.username}'s Cultivation Inventory`)
                .setColor(0x00ff88)
                .setTimestamp()
                .setFooter({ 
                    text: `Level: ${cultivationUser.currentLevel} • EXP: ${cultivationUser.exp.toLocaleString()}`, 
                    iconURL: targetUser.displayAvatarURL() 
                })
                .addFields([
                    {
                        name: '🌿 Nguyên liệu Farm',
                        value: materialDisplay.length > 0 ? materialDisplay.join(' ') : '🚫 Chưa có nguyên liệu',
                        inline: false
                    },
                    {
                        name: '🧪 Đan dược (Craft)',
                        value: medicineDisplay.length > 0 ? medicineDisplay.join(' ') : '🚫 Chưa có đan dược',
                        inline: false
                    },
                    {
                        name: '💎 Linh thạch (Craft)',
                        value: stoneDisplay.length > 0 ? stoneDisplay.join(' ') : '🚫 Chưa có linh thạch',
                        inline: false
                    },
                    {
                        name: '🛍️ Shop Items',
                        value: shopDisplay.length > 0 ? shopDisplay.join(' ') : '🚫 Chưa có shop items',
                        inline: false
                    },
                    {
                        name: '💡 Gợi ý',
                        value: '`!farm` - Thu thập nguyên liệu\n`!shop` - Mua nguyên liệu chế tạo\n`!craft` - Chế tạo đan dược & linh thạch\n`!breakthrough` - Đột phá realm',
                        inline: false
                    }
                ]);

            await message.reply({ embeds: [inventoryEmbed] });

        } catch (error) {
            console.error('Error in inventory command:', error);
            await message.reply(`❌ Lỗi inventory: ${error.message}`);
        }
    }
}; 