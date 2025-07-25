const { getRandomDrop, getLevelByName, getNextLevel, canBreakthrough, rollBreakthrough, FARM_MATERIALS, getItemStorageInfo } = require('../../utils/cultivationData');

module.exports = {
    name: 'thugom',
    aliases: ['f', 'thu_thap', 'farm', 'thugom'],
    description: 'Thu thập nguyên liệu để chế tạo đan dược (1 giờ 1 lần, 10+ nguyên liệu tùy VIP)',
    usage: '!thugom',
    examples: [
        '!thugom - Thu thập nguyên liệu',
        '!f - Thu thập nguyên liệu'
    ],
    permissions: 'everyone',
    guildOnly: true,
    category: 'cultivation',

    async execute(message, args, client) {
        try {
            const userId = message.author.id;
            const guildId = message.guild.id;
            
            // Check cooldown (1 giờ)
            const cooldownTime = 60 * 60 * 1000; // 1 hour
            
            // Get or create user
            let user = await client.prisma.cultivationUser.findUnique({
                where: {
                    userId: userId
                }
            });

            if (!user) {
                user = await client.prisma.cultivationUser.create({
                    data: {
                        userId: userId,
                        exp: 0,
                        currentLevel: 'Phàm Nhân'
                    }
                });
            }

            // Check cooldown
            if (user.lastFarmTime) {
                const timeSinceLastFarm = Date.now() - user.lastFarmTime.getTime();
                if (timeSinceLastFarm < cooldownTime) {
                    const remainingTime = cooldownTime - timeSinceLastFarm;
                    const hours = Math.floor(remainingTime / (60 * 60 * 1000));
                    const minutes = Math.floor((remainingTime % (60 * 60 * 1000)) / (60 * 1000));
                    
                    let timeText = '';
                    if (hours > 0) timeText += `${hours}h `;
                    if (minutes > 0) timeText += `${minutes}p`;
                    if (!timeText) timeText = '< 1p';
                    
                    return message.reply(`⏰ **${message.author.username}** cần nghỉ ngơi \`${timeText}\` nữa mới có thể thu gom tiếp!`);
                }
            }

            // Calculate VIP role bonus
            let roleBonus = 0;
            try {
                const member = message.guild.members.cache.get(userId);
                if (member) {
                    const vipRoles = {
                        '‹PwB› Booster': 100,
                        '‹PwB› Vip 1': 10,
                        '‹PwB› Vip 2': 20,
                        '‹PwB› Vip 3': 30,
                        '‹PwB› Vip 4': 40,
                        '‹PwB› Vip 5': 50,
                        '‹PwB› Vip 6': 60,
                        '‹PwB› Vip 7': 70,
                        '‹PwB› Vip 8': 80
                    };

                    member.roles.cache.forEach(role => {
                        if (vipRoles[role.name]) {
                            roleBonus += vipRoles[role.name];
                        }
                    });
                }
            } catch (error) {
                console.log('Could not calculate role bonus for farm');
            }

            // Calculate total materials to farm (base random 1-9 + bonus)
            const baseMaterials = Math.floor(Math.random() * 9) + 1; // Random 1-9
            const bonusMaterials = Math.floor(baseMaterials * (roleBonus / 100));
            const totalMaterials = baseMaterials + bonusMaterials;

            // Generate random drops (không bao gồm linh thạch)
            const drops = [];
            const dropCounts = {}; // Track quantity of each item

            for (let i = 0; i < totalMaterials; i++) {
                let drop = getRandomDrop();
                
                // Nếu trúng linh thạch, roll lại để tránh lấy linh thạch trong phần này
                while (drop && drop.id === 'lt1') {
                    drop = getRandomDrop();
                }
                
                // If miss, try again (ensure we get all materials)
                if (!drop) {
                    i--; // Retry this iteration
                    continue;
                }
                
                drops.push(drop);

                // Count drops for inventory update
                if (!dropCounts[drop.id]) {
                    dropCounts[drop.id] = 0;
                }
                dropCounts[drop.id]++;
            }

            // Tách riêng farm linh thạch - random từ 1-99 + bonus
            const baseSpiritStones = Math.floor(Math.random() * 99) + 1; // Random 1-99
            const bonusSpiritStones = Math.floor(baseSpiritStones * (roleBonus / 100));
            const totalSpiritStones = baseSpiritStones + bonusSpiritStones;
            
            // Add linh thạch vào dropCounts
            dropCounts['lt1'] = totalSpiritStones;

            // Farm EXP - random từ 1-60 + bonus
            const baseExpGain = Math.floor(Math.random() * 60) + 1; // Random 1-60
            const bonusExpGain = Math.floor(baseExpGain * (roleBonus / 100));
            const totalExpGain = baseExpGain + bonusExpGain;

            // Cập nhật EXP cho user
            await client.prisma.cultivationUser.update({
                where: {
                    userId: userId
                },
                data: {
                    exp: {
                        increment: totalExpGain
                    },
                    lastFarmTime: new Date()
                }
            });

            // Update inventory for each unique item
            for (const [itemId, quantity] of Object.entries(dropCounts)) {
                const storageInfo = getItemStorageInfo(itemId);
                
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
                            increment: quantity
                        }
                    },
                    create: {
                        userId: userId,
                        itemType: storageInfo.category,
                        itemId: storageInfo.actualId,
                        quantity: quantity
                    }
                });
            }

            // Update farm time - đã được update cùng với EXP ở trên

            // Create response message with grouped items (tách riêng linh thạch)
            const groupedDrops = {};
            drops.forEach(drop => {
                if (!groupedDrops[drop.id]) {
                    groupedDrops[drop.id] = {
                        name: drop.name,
                        icon: drop.icon,
                        count: 0
                    };
                }
                groupedDrops[drop.id].count++;
            });

            const dropsText = Object.values(groupedDrops)
                .map(item => `${item.icon} ${item.name} x${item.count}`)
                .join(', ');

            let replyText = `🌾 **${message.author.username}** đã thu gom và nhận được:\n`;
            replyText += `📦 **${totalMaterials} nguyên liệu:** ${dropsText}\n`;
            replyText += `💎 **${totalSpiritStones} linh thạch:** ${FARM_MATERIALS.lt1.icon} ${FARM_MATERIALS.lt1.name} x${totalSpiritStones}\n`;
            replyText += `⭐ **${totalExpGain} EXP** được thêm vào tu luyện!\n`;
            
            if (roleBonus > 0) {
                replyText += `✨ *Bonus nguyên liệu: ${baseMaterials} base + ${bonusMaterials} VIP (+${roleBonus}%)*\n`;
                replyText += `✨ *Bonus linh thạch: ${baseSpiritStones} base + ${bonusSpiritStones} VIP (+${roleBonus}%)*\n`;
                replyText += `✨ *Bonus EXP: ${baseExpGain} base + ${bonusExpGain} VIP (+${roleBonus}%)*\n`;
            }
            
            replyText += `\n💡 *EXP: 1 tin nhắn = 1 EXP | 1 phút voice = 1 EXP + VIP bonus*`;

            await message.reply(replyText);

        } catch (error) {
            console.error('Error in thugom command:', error);
            await message.reply(`❌ Lỗi thu gom: ${error.message}`);
        }
    }
}; 