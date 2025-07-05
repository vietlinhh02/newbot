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
        '!craft lt2 - Craft linh thạch trung phẩm',
        '!craft recipes - xem công thức'
    ],
    permissions: 'everyone',
    guildOnly: true,
    category: 'cultivation',

    async execute(message, args, client) {
        try {
            const userId = message.author.id;
            const guildId = message.guild.id;

            if (!args[0] || args[0] === 'recipes' || args[0] === 'recipe') {
                return this.showRecipes(message, client);
            }

            const targetItem = args[0].toLowerCase();

            // Validate item - check both MEDICINES and SPIRIT_STONES
            const itemData = MEDICINES[targetItem] || SPIRIT_STONES[targetItem];
            if (!itemData) {
                return message.reply(`❌ Không tìm thấy item "${targetItem}"! Sử dụng \`!craft recipes\` để xem công thức.`);
            }

            // Check if item can be crafted
            const recipe = CRAFT_RECIPES[targetItem];
            if (!recipe) {
                return message.reply(`❌ Không thể craft item "${targetItem}"! Sử dụng \`!craft recipes\` để xem công thức.`);
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
    },

    async showRecipes(message, client) {
        // Tạo các trang với thông tin chi tiết
        const pages = [];
        
        // Page 1: CRAFT - Đan dược
        const craftPillsEmbed = new EmbedBuilder()
            .setTitle('🔨 CRAFT - Đan dược')
            .setDescription('**Chế tạo đan dược từ nguyên liệu + đan phương + đan lò**')
            .setColor(0x0080ff)
            .setTimestamp()
            .setFooter({ 
                text: `Trang 1/2 • Yêu cầu bởi ${message.author.username}`, 
                iconURL: message.author.displayAvatarURL() 
            });

        // Filter craft recipes for pills (d series) only
        const dCraftRecipes = Object.entries(CRAFT_RECIPES).filter(([itemId]) => 
            itemId.startsWith('d')
        );
        dCraftRecipes.forEach(([itemId, recipe]) => {
            const itemData = MEDICINES[itemId];
            
            if (itemData) {
                let ingredients = '';
                if (recipe.materials) {
                    const materials = Object.entries(recipe.materials).map(([id, qty]) => {
                        const materialData = FARM_MATERIALS[id];
                        return `${materialData?.icon} \`${qty}\``;
                    }).join(' + ');
                    ingredients += materials;
                }
                if (recipe.medicines && Object.keys(recipe.medicines).length > 0) {
                    if (ingredients) ingredients += ' + ';
                    const medicines = Object.entries(recipe.medicines).map(([id, qty]) => {
                        const itemData = SHOP_ITEMS[id];
                        return `${itemData?.icon} \`${qty}\``;
                    }).join(' + ');
                    ingredients += medicines;
                }

                craftPillsEmbed.addFields({
                    name: `${itemData.icon} ${itemData.name}`,
                    value: `**Nguyên liệu:** ${ingredients}\n**Tỉ lệ thành công:** \`${recipe.successRate}%\`\n**Lệnh:** \`!craft ${itemId}\`\n**Mô tả:** Đan dược cao cấp từ nguyên liệu`,
                    inline: true
                });
            }
        });
        
        craftPillsEmbed.addFields({
            name: '✅ Lưu ý về chế tạo đan dược',
            value: '• **Đan phương & đan lò:** Mua từ `!shop` bằng linh thạch\n' +
                   '• **Nguyên liệu:** Thu thập từ `!farm` (1-7)\n' +
                   '• **Tỉ lệ thành công:** 50% (cần chuẩn bị dự phòng)\n' +
                   '• **Đan dược cao hơn:** Cần đan phương và nguyên liệu cao hơn',
            inline: false
        });
        pages.push(craftPillsEmbed);

        // Page 2: CRAFT - Linh thạch & Hướng dẫn
        const craftStonesEmbed = new EmbedBuilder()
            .setTitle('🔨 CRAFT - Linh thạch & Hướng dẫn')
            .setDescription('**Chế tạo linh thạch cao cấp và hướng dẫn sử dụng**')
            .setColor(0xff6600)
            .setTimestamp()
            .setFooter({ 
                text: `Trang 2/2 • Yêu cầu bởi ${message.author.username}`, 
                iconURL: message.author.displayAvatarURL() 
            });

        // Filter craft recipes for spirit stones (lt series)
        const ltCraftRecipes = Object.entries(CRAFT_RECIPES).filter(([itemId]) => 
            itemId.startsWith('lt')
        );
        ltCraftRecipes.forEach(([itemId, recipe]) => {
            const itemData = SPIRIT_STONES[itemId];
            
            if (itemData) {
                let ingredients = '';
                if (recipe.materials) {
                    const materials = Object.entries(recipe.materials).map(([id, qty]) => {
                        const materialData = SPIRIT_STONES[id] || SHOP_ITEMS[id];
                        return `${materialData?.icon} \`${qty}\``;
                    }).join(' + ');
                    ingredients += materials;
                }

                craftStonesEmbed.addFields({
                    name: `${itemData.icon} ${itemData.name}`,
                    value: `**Nguyên liệu:** ${ingredients}\n**Tỉ lệ thành công:** \`${recipe.successRate}%\`\n**Lệnh:** \`!craft ${itemId}\`\n**Mô tả:** Linh thạch cần nhiều linh thạch thấp hơn`,
                    inline: true
                });
            }
        });
        
        craftStonesEmbed.addFields({
            name: '💎 Về Linh thạch',
            value: '• **Tụ linh thạch:** Mua từ `!shop` để craft linh thạch cao\n' +
                   '• **Linh thạch lt1:** Thu thập từ `!farm` (rất ít)\n' +
                   '• **Tỉ lệ thành công:** 50% (rủi ro cao)\n' +
                   '• **Cần rất nhiều:** 9999x linh thạch thấp hơn để craft',
            inline: false
        },
        {
            name: '📚 Tổng kết hệ thống',
            value: '🌾 **Farm** → Nguyên liệu (1-7) + lt1\n' +
                   '🏪 **Shop** → Đan phương, đan lò, tụ linh thạch\n' +
                   '🔨 **Craft** → Đan dược (d1-d4) + Linh thạch (lt2-lt4)\n' +
                   '💊 **Sử dụng** → Tăng EXP và đột phá cảnh giới\n\n' +
                   '💡 **Mẹo:** Luôn chuẩn bị thêm nguyên liệu vì tỉ lệ thành công chỉ 50%!',
            inline: false
        });
        pages.push(craftStonesEmbed);

        // Create navigation buttons
        const createButtons = (currentPage, totalPages) => {
            const buttons = [];
            
            // Previous button
            buttons.push(
                new ButtonBuilder()
                    .setCustomId('craft_prev')
                    .setLabel('◀ Trước')
                    .setStyle(ButtonStyle.Secondary)
                    .setDisabled(currentPage === 0)
            );
            
            // Page indicator
            buttons.push(
                new ButtonBuilder()
                    .setCustomId('craft_page')
                    .setLabel(`${currentPage + 1}/${totalPages}`)
                    .setStyle(ButtonStyle.Primary)
                    .setDisabled(true)
            );
            
            // Next button
            buttons.push(
                new ButtonBuilder()
                    .setCustomId('craft_next')
                    .setLabel('Sau ▶')
                    .setStyle(ButtonStyle.Secondary)
                    .setDisabled(currentPage === totalPages - 1)
            );
            

            
            return new ActionRowBuilder().addComponents(buttons);
        };

        // Send initial message
        let currentPage = 0;
        const reply = await message.reply({ 
            embeds: [pages[currentPage]], 
            components: [createButtons(currentPage, pages.length)]
        });

        // Handle pagination
        const collector = reply.createMessageComponentCollector({
            componentType: ComponentType.Button,
            time: 300000, // 5 minutes
            filter: i => i.user.id === message.author.id
        });

        collector.on('collect', async interaction => {
            if (interaction.customId === 'craft_prev' && currentPage > 0) {
                currentPage--;
            } else if (interaction.customId === 'craft_next' && currentPage < pages.length - 1) {
                currentPage++;
            }

            await interaction.update({
                embeds: [pages[currentPage]],
                components: [createButtons(currentPage, pages.length)]
            });
        });

        collector.on('end', () => {
            // Disable all buttons when expired
            const disabledButtons = createButtons(currentPage, pages.length);
            disabledButtons.components.forEach(button => {
                if (!button.data.disabled) button.setDisabled(true);
            });
            
            reply.edit({ 
                embeds: [pages[currentPage]], 
                components: [disabledButtons] 
            }).catch(() => {});
        });
    }
}; 