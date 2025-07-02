const { MEDICINES, FARM_MATERIALS, SPIRIT_STONES } = require('../../utils/cultivationData');

module.exports = {
    name: 'inventory',
    aliases: ['inv', 'kho', 'bag', 'zoo', 'materials', 'farm_items', 'nguyen_lieu', 'z'],
    description: 'Xem kho đồ tu luyện (nguyên liệu farm + thuốc + linh thạch) của bạn',
    usage: '!inventory [user] [type]',
    examples: [
        '!inventory - Xem tất cả',
        '!inv @user - Xem của user khác', 
        '!inv materials - Chỉ xem nguyên liệu',
        '!inv medicines - Chỉ xem thuốc',
        '!inv stones - Chỉ xem linh thạch',
        '!zoo - Alias cũ vẫn hoạt động'
    ],
    permissions: 'everyone',
    guildOnly: true,
    category: 'cultivation',

    async execute(message, args, client) {
        try {
            // Parse arguments
            let targetUser = message.author;
            let filterType = 'all'; // 'all', 'materials', 'medicines', 'stones'
            
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
                } else if (['materials', 'material', 'nguyen_lieu', 'nl', 'farm'].includes(arg.toLowerCase())) {
                    filterType = 'materials';
                } else if (['medicines', 'medicine', 'thuoc', 'med', 'drugs'].includes(arg.toLowerCase())) {
                    filterType = 'medicines';
                } else if (['stones', 'stone', 'linh_thach', 'lt', 'spirit'].includes(arg.toLowerCase())) {
                    filterType = 'stones';
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

            // Separate materials, medicines, and spirit stones
            const materials = inventory.filter(item => item.itemType === 'material' && !item.itemId.startsWith('spirit_'));
            const medicines = inventory.filter(item => item.itemType === 'medicine');
            const spiritStones = inventory.filter(item => item.itemType === 'material' && item.itemId.startsWith('spirit_'));

            // Build response
            let responseText = `====== **${targetUser.username}'s Cultivation Inventory** ======\n`;

            // Show materials if requested
            if (filterType === 'all' || filterType === 'materials') {
                responseText += `\n🌿 **NGUYÊN LIỆU FARM:**\n`;
                
                const materialDisplay = [];
                let totalMaterials = 0;
                
                for (let i = 1; i <= 7; i++) {
                    const material = materials.find(m => m.itemId === i.toString());
                    const materialData = FARM_MATERIALS[i.toString()];
                    const quantity = material ? material.quantity : 0;
                    materialDisplay.push(`${materialData.icon}${quantity}`);
                    totalMaterials += quantity;
                }
                
                responseText += materialDisplay.join(' ') + '\n';
                
                if (totalMaterials === 0) {
                    responseText += '🚫 Chưa có nguyên liệu nào! Dùng `!farm` để thu thập.\n';
                }
            }

            // Show medicines if requested
            if (filterType === 'all' || filterType === 'medicines') {
                responseText += `\n🧪 **THUỐC ĐÃ CHẾ TẠO:**\n`;
                
                const medicineDisplay = [];
                
                // Thuốc (z series)
                ['z1', 'z2', 'z3', 'z4'].forEach(medicineId => {
                    const medicine = medicines.find(m => m.itemId === medicineId);
                    const medicineData = MEDICINES[medicineId];
                    const quantity = medicine ? medicine.quantity : 0;
                    if (quantity > 0) {
                        medicineDisplay.push(`${medicineData.icon}${quantity}`);
                    }
                });
                
                // Đan dược (d series)
                ['d1', 'd2', 'd3', 'd4'].forEach(medicineId => {
                    const medicine = medicines.find(m => m.itemId === medicineId);
                    const medicineData = MEDICINES[medicineId];
                    const quantity = medicine ? medicine.quantity : 0;
                    if (quantity > 0) {
                        medicineDisplay.push(`${medicineData.icon}${quantity}`);
                    }
                });
                
                // Đan phương và đan lò (dp/dl series)
                ['dp1', 'dp2', 'dp3', 'dp4', 'pdp', 'dl'].forEach(medicineId => {
                    const medicine = medicines.find(m => m.itemId === medicineId);
                    const medicineData = MEDICINES[medicineId];
                    const quantity = medicine ? medicine.quantity : 0;
                    if (quantity > 0) {
                        medicineDisplay.push(`${medicineData.icon}${quantity}`);
                    }
                });

                if (medicineDisplay.length > 0) {
                    responseText += medicineDisplay.join(' ') + '\n';
                } else {
                    responseText += '🚫 Chưa có thuốc/đan dược nào! Dùng `!craft` để chế tạo.\n';
                }
            }

            // Show spirit stones if requested
            if (filterType === 'all' || filterType === 'stones') {
                responseText += `\n💎 **LINH THẠCH (từ đột phá):**\n`;
                
                const stoneDisplay = [];
                let totalStones = 0;
                
                // Check for spirit stones (stored with spirit_ prefix)
                ['lt1', 'lt2', 'lt3', 'lt4'].forEach(stoneId => {
                    const stone = spiritStones.find(s => s.itemId === `spirit_${stoneId}`);
                    const stoneData = SPIRIT_STONES[stoneId];
                    const quantity = stone ? stone.quantity : 0;
                    if (quantity > 0) {
                        stoneDisplay.push(`${stoneData.icon}${quantity}`);
                        totalStones += quantity;
                    }
                });

                if (stoneDisplay.length > 0) {
                    responseText += stoneDisplay.join(' ') + '\n';
                } else {
                    responseText += '🚫 Chưa có linh thạch nào! Đột phá thành công để nhận linh thạch.\n';
                }
            }

            // Add user stats
            responseText += `\n📊 **THỐNG KÊ:**\n`;
            responseText += `• **Level:** ${cultivationUser.currentLevel}\n`;
            responseText += `• **EXP:** ${cultivationUser.exp}\n`;

            // Add helpful tips
            if (filterType === 'all') {
                responseText += `\n💡 **GỢI Ý:**\n`;
                responseText += `• \`!inv materials\` - Chỉ xem nguyên liệu\n`;
                responseText += `• \`!inv medicines\` - Chỉ xem thuốc\n`;
                responseText += `• \`!inv stones\` - Chỉ xem linh thạch\n`;
                responseText += `• \`!farm\` - Thu thập nguyên liệu (10+ tùy VIP)\n`;
                responseText += `• \`!craft recipes\` - Xem công thức chế tạo\n`;
                responseText += `• \`!breakthrough\` - Đột phá để nhận linh thạch\n`;
                responseText += `• **1 tin nhắn** = 1 EXP | **1 phút voice** = 5 EXP`;
            } else if (filterType === 'materials') {
                responseText += `\n💡 *Dùng \`!craft recipes\` để xem công thức chế tạo thuốc*`;
            } else if (filterType === 'medicines') {
                responseText += `\n💡 *Dùng \`!inv materials\` để xem nguyên liệu farm*`;
            } else if (filterType === 'stones') {
                responseText += `\n💡 *Dùng \`!breakthrough\` để đột phá và nhận thêm linh thạch*`;
            }

            await message.reply(responseText);

        } catch (error) {
            console.error('Error in inventory command:', error);
            await message.reply(`❌ Lỗi inventory: ${error.message}`);
        }
    }
}; 