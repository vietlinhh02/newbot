const { FARM_MATERIALS, MEDICINES, SPIRIT_STONES, SHOP_ITEMS, CRAFT_RECIPES, getItemStorageInfo } = require('../../utils/cultivationData');
const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType } = require('discord.js');

module.exports = {
    name: 'craft',
    aliases: ['ghep', 'alchemy'],
    description: 'Chế tạo đan dược và linh thạch từ nguyên liệu',
    usage: '!craft <item>',
    examples: [
        '!craft d1 - Craft đan dược hạ phẩm',
        '!craft d2 - Craft đan dược trung phẩm',
        '!craft lt2 - Craft linh thạch trung phẩm'
    ],
    permissions: 'everyone',
    guildOnly: true,
    category: 'cultivation',

    async execute(message, args, client) {
        try {
            const userId = message.author.id;
            const guildId = message.guild.id;

            if (!args[0]) {
                return message.reply(`❌ Vui lòng chỉ định item muốn craft! Ví dụ: \`!craft d1\``);
            }

            const targetItem = args[0].toLowerCase();

            // Validate item - check both MEDICINES and SPIRIT_STONES
            const itemData = MEDICINES[targetItem] || SPIRIT_STONES[targetItem];
            if (!itemData) {
                return message.reply(`❌ Không tìm thấy item "${targetItem}"! Chỉ có thể craft đan dược (d1-d4) và linh thạch (lt2-lt4).`);
            }

            // Check if item can be crafted
            const recipe = CRAFT_RECIPES[targetItem];
            if (!recipe) {
                return message.reply(`❌ Không thể craft item "${targetItem}"! Chỉ có thể craft đan dược (d1-d4) và linh thạch (lt2-lt4).`);
            }

            // Get user data
            const cultivationUser = await client.prisma.cultivationUser.findUnique({
                where: {
                    userId: userId
                }
            });

            if (!cultivationUser) {
                return message.reply(`❌ **${message.author.username}** chưa bắt đầu tu luyện! Gửi tin nhắn trong server để bắt đầu nhận EXP.`);
            }

            // Get user inventory
            const inventory = await client.prisma.userInventory.findMany({
                where: {
                    userId: userId
                }
            });

            // Convert to easy lookup using storage info
            const userItems = {};
            inventory.forEach(item => {
                // Standard lookup key
                const key = `${item.itemType}_${item.itemId}`;
                userItems[key] = item.quantity;
                
                // Handle spirit stones - store both ways for compatibility
                if (item.itemId.startsWith('spirit_')) {
                    const actualId = item.itemId.replace('spirit_', '');
                    userItems[`spirit_${actualId}`] = item.quantity;
                }
                
                // Also create reverse lookup for farmable medicines
                if (item.itemType === 'medicine') {
                    userItems[`medicine_${item.itemId}`] = item.quantity;
                }
                
                // Create lookup for numbered materials
                if (item.itemType === 'material' && !item.itemId.startsWith('spirit_')) {
                    userItems[`material_${item.itemId}`] = item.quantity;
                }
            });

            // Get recipe and required items
            const successRate = recipe.successRate;
            let requiredItems = [];

            // Add materials
            if (recipe.materials) {
                for (const [itemId, quantity] of Object.entries(recipe.materials)) {
                    const storageInfo = getItemStorageInfo(itemId);
                    const key = `${storageInfo.category}_${storageInfo.actualId}`;
                    requiredItems.push({
                        type: storageInfo.category,
                        id: itemId,
                        actualId: storageInfo.actualId,
                        needed: quantity,
                        have: userItems[key] || 0,
                        name: storageInfo.name
                    });
                }
            }

            // Add medicines
            if (recipe.medicines) {
                for (const [itemId, quantity] of Object.entries(recipe.medicines)) {
                    const storageInfo = getItemStorageInfo(itemId);
                    const key = `${storageInfo.category}_${storageInfo.actualId}`;
                    requiredItems.push({
                        type: storageInfo.category,
                        id: itemId,
                        actualId: storageInfo.actualId,
                        needed: quantity,
                        have: userItems[key] || 0,
                        name: storageInfo.name
                    });
                }
            }

            // Check if user has enough materials
            const missingItems = requiredItems.filter(item => item.have < item.needed);

            if (missingItems.length > 0) {
                const missingText = missingItems.map(item => {
                    const storageInfo = getItemStorageInfo(item.id);
                    return `${storageInfo.icon} **${item.name}**: Cần \`${item.needed}\`, có \`${item.have}\``;
                }).join('\n');

                const errorEmbed = new EmbedBuilder()
                    .setTitle('❌ Không đủ nguyên liệu!')
                    .setDescription(`Không thể chế tạo **${itemData.name}**`)
                    .setColor(0xffa500)
                    .addFields({
                        name: '📦 Nguyên liệu thiếu',
                        value: missingText,
                        inline: false
                    })
                    .setTimestamp()
                    .setFooter({ 
                        text: message.author.username, 
                        iconURL: message.author.displayAvatarURL() 
                    });

                return message.reply({ embeds: [errorEmbed] });
            }

            // Perform crafting
            const success = Math.random() * 100 < successRate;

            // Remove materials regardless of success/failure
            for (const item of requiredItems) {
                await client.prisma.userInventory.update({
                    where: {
                        userId_itemType_itemId: {
                            userId: userId,
                            itemType: item.type,
                            itemId: item.actualId
                        }
                    },
                    data: {
                        quantity: {
                            decrement: item.needed
                        }
                    }
                });
            }

            // If successful, add the crafted item
            if (success) {
                const resultStorageInfo = getItemStorageInfo(targetItem);
                
                await client.prisma.userInventory.upsert({
                    where: {
                        userId_itemType_itemId: {
                            userId: userId,
                            itemType: resultStorageInfo.category,
                            itemId: resultStorageInfo.actualId
                        }
                    },
                    update: {
                        quantity: {
                            increment: 1
                        }
                    },
                    create: {
                        userId: userId,
                        itemType: resultStorageInfo.category,
                        itemId: resultStorageInfo.actualId,
                        quantity: 1
                    }
                });
            }

            // Show result với embed
            const resultEmbed = new EmbedBuilder()
                .setTimestamp()
                .setFooter({ 
                    text: message.author.username, 
                    iconURL: message.author.displayAvatarURL() 
                });

            if (success) {
                resultEmbed
                    .setTitle('🧪 Chế tạo thành công!')
                    .setDescription(`${itemData.icon} **${itemData.name}** đã được tạo ra!`)
                    .setColor(0x00ff00)
                    .addFields([
                        {
                            name: '✅ Kết quả',
                            value: `${itemData.icon} **${itemData.name}** x1`,
                            inline: true
                        },
                        {
                            name: '📊 Thông tin',
                            value: `• **Loại:** Chế tạo\n• **Tỉ lệ thành công:** \`${successRate}%\``,
                            inline: true
                        }
                    ]);
            } else {
                resultEmbed
                    .setTitle('💥 Chế tạo thất bại!')
                    .setDescription(`Không may mắn! Nguyên liệu đã bị tiêu hao.`)
                    .setColor(0xff4444)
                    .addFields([
                        {
                            name: '💔 Kết quả',
                            value: `Không nhận được gì`,
                            inline: true
                        },
                        {
                            name: '📊 Thông tin',
                            value: `• **Loại:** Chế tạo\n• **Tỉ lệ thành công:** \`${successRate}%\`\n• **Lần sau có thể thành công hơn!**`,
                            inline: true
                        }
                    ]);
            }

            await message.reply({ embeds: [resultEmbed] });

        } catch (error) {
            console.error('Error in craft command:', error);
            await message.reply(`❌ Lỗi craft: ${error.message}`);
        }
    }
}; 