const { FARM_MATERIALS, MEDICINES, SPIRIT_STONES, SHOP_ITEMS, CRAFT_RECIPES, getItemStorageInfo } = require('../../utils/cultivationData');
const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType } = require('discord.js');

module.exports = {
    name: 'chetao',
    aliases: ['ghep', 'alchemy', 'craft', 'chetao'],
    description: 'Chế tạo đan dược và linh thạch từ nguyên liệu',
    usage: '!chetao <item>',
    examples: [
        '!chetao d1 - Chế tạo đan dược hạ phẩm',
        '!chetao d2 - Chế tạo đan dược trung phẩm',
        '!chetao lt2 - Chế tạo linh thạch trung phẩm',
    ],
    permissions: 'everyone',
    guildOnly: true,
    category: 'cultivation',

    async execute(message, args, client) {
        try {
            const userId = message.author.id;
            const guildId = message.guild.id;

            if (!args[0] || args[0] === ' ' || args[0] === 'recipe') {
                return this.showRecipes(message, client);
            }

            const targetItem = args[0].toLowerCase();

            // Validate item - check both MEDICINES and SPIRIT_STONES
            const itemData = MEDICINES[targetItem] || SPIRIT_STONES[targetItem];
            if (!itemData) {
                return message.reply(`❌ Không tìm thấy item "${targetItem}"! Sử dụng \`!chetao \` để xem công thức.`);
            }

            // Check if item can be crafted
            const recipe = CRAFT_RECIPES[targetItem];
            if (!recipe) {
                return message.reply(`❌ Không thể chế tạo item "${targetItem}"! Sử dụng \`!chetao \` để xem công thức.`);
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

            // Show craft confirmation
            const materialsText = requiredItems.map(item => {
                const storageInfo = getItemStorageInfo(item.id);
                return `${storageInfo.icon} **${item.name}** x${item.needed}`;
            }).join('\n');

            const confirmEmbed = new EmbedBuilder()
                .setTitle('🧪 Xác nhận chế tạo')
                .setDescription(`Bạn có chắc chắn muốn chế tạo **${itemData.name}**?`)
                .setColor(0x0080ff)
                .addFields([
                    {
                        name: '📊 Thông tin chế tạo',
                        value: `• **Vật phẩm:** ${itemData.icon} ${itemData.name}\n• **Tỉ lệ thành công:** ${successRate}%\n• **Mô tả:** ${itemData.description}`,
                        inline: false
                    },
                    {
                        name: '📦 Nguyên liệu sẽ tiêu tốn',
                        value: materialsText,
                        inline: false
                    },
                    {
                        name: '⚠️ Lưu ý',
                        value: '• Nguyên liệu sẽ bị tiêu tốn dù thành công hay thất bại\n• Chỉ nhận được vật phẩm nếu chế tạo thành công\n• Có thể thử lại nếu thất bại',
                        inline: false
                    }
                ])
                .setTimestamp()
                .setFooter({ 
                    text: `Chế Tạo • ${message.author.username}`, 
                    iconURL: message.author.displayAvatarURL() 
                });

            const confirmButtons = new ActionRowBuilder()
                .addComponents(
                    new ButtonBuilder()
                        .setCustomId('craft_confirm')
                        .setLabel('🔨 Xác nhận chế tạo')
                        .setStyle(ButtonStyle.Primary),
                    new ButtonBuilder()
                        .setCustomId('craft_cancel')
                        .setLabel('❌ Hủy bỏ')
                        .setStyle(ButtonStyle.Secondary)
                );

            const reply = await message.reply({ 
                embeds: [confirmEmbed], 
                components: [confirmButtons] 
            });

            // Handle button interactions
            const collector = reply.createMessageComponentCollector({
                componentType: ComponentType.Button,
                time: 60000, // 1 minute
                filter: i => i.user.id === message.author.id
            });

            collector.on('collect', async interaction => {
                if (interaction.customId === 'craft_confirm') {
                    await this.performCraft(interaction, client, userId, targetItem, itemData, recipe, requiredItems, successRate);
                } else if (interaction.customId === 'craft_cancel') {
                    const cancelEmbed = new EmbedBuilder()
                        .setTitle('❌ Đã hủy chế tạo')
                        .setDescription('Quá trình chế tạo đã bị hủy.')
                        .setColor(0xff4444)
                        .setTimestamp()
                        .setFooter({ 
                            text: `Chế Tạo • ${message.author.username}`, 
                            iconURL: message.author.displayAvatarURL() 
                        });

                    await interaction.update({ 
                        embeds: [cancelEmbed], 
                        components: [] 
                    });
                }
            });

            collector.on('end', () => {
                // Disable buttons when expired
                const disabledButtons = new ActionRowBuilder()
                    .addComponents(
                        new ButtonBuilder()
                            .setCustomId('craft_confirm')
                            .setLabel('🔨 Xác nhận chế tạo')
                            .setStyle(ButtonStyle.Primary)
                            .setDisabled(true),
                        new ButtonBuilder()
                            .setCustomId('craft_cancel')
                            .setLabel('❌ Hủy bỏ')
                            .setStyle(ButtonStyle.Secondary)
                            .setDisabled(true)
                    );
                
                reply.edit({ components: [disabledButtons] }).catch(() => {});
            });

            return; // Exit early since we're handling the craft in the collector

        } catch (error) {
            console.error('Error in chetao command:', error);
            await message.reply(`❌ Lỗi chế tạo: ${error.message}`);
        }
    },

    async performCraft(interaction, client, userId, targetItem, itemData, recipe, requiredItems, successRate) {
        try {
            // Consume materials first (regardless of success/failure)
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

            // Attempt craft
            const success = Math.random() * 100 < successRate;

            if (success) {
                // Success - Add crafted item to inventory
                const storageInfo = getItemStorageInfo(targetItem);
                
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
                            increment: 1
                        }
                    },
                    create: {
                        userId: userId,
                        itemType: storageInfo.category,
                        itemId: storageInfo.actualId,
                        quantity: 1
                    }
                });

                // Build success embed
                const successEmbed = new EmbedBuilder()
                    .setTitle('🎉 Chế Tạo Thành Công!')
                    .setDescription(`**${interaction.user.username}** đã chế tạo thành công!`)
                    .setColor(0x00ff00)
                    .addFields([
                        {
                            name: '⚡ Kết quả',
                            value: `• **Vật phẩm:** ${itemData.icon} ${itemData.name}\n• **Tỉ lệ thành công:** ${successRate}%`,
                            inline: false
                        }
                    ])
                    .setTimestamp()
                    .setFooter({ 
                        text: `Chế Tạo • ${interaction.user.username}`, 
                        iconURL: interaction.user.displayAvatarURL() 
                    });

                // Show consumed materials
                const consumedText = requiredItems.map(item => {
                    const storageInfo = getItemStorageInfo(item.id);
                    return `${storageInfo.icon} ${item.name} x${item.needed}`;
                }).join(', ');

                successEmbed.addFields({
                    name: '💊 Nguyên liệu đã tiêu tốn',
                    value: consumedText,
                    inline: false
                });

                await interaction.update({ 
                    embeds: [successEmbed], 
                    components: [] 
                });

            } else {
                // Failure - Show failure message
                const failureEmbed = new EmbedBuilder()
                    .setTitle('💥 Chế Tạo Thất Bại!')
                    .setDescription(`**${interaction.user.username}** đã thất bại trong chế tạo!`)
                    .setColor(0xff4444)
                    .addFields([
                        {
                            name: '💔 Kết quả',
                            value: `• **Vật phẩm:** Không nhận được\n• **Tỉ lệ thành công:** ${successRate}%`,
                            inline: false
                        }
                    ])
                    .setTimestamp()
                    .setFooter({ 
                        text: `Chế Tạo • ${interaction.user.username}`, 
                        iconURL: interaction.user.displayAvatarURL() 
                    });

                // Show consumed materials
                const consumedText = requiredItems.map(item => {
                    const storageInfo = getItemStorageInfo(item.id);
                    return `${storageInfo.icon} ${item.name} x${item.needed}`;
                }).join(', ');

                failureEmbed.addFields({
                    name: '📦 Nguyên liệu đã tiêu tốn',
                    value: consumedText,
                    inline: false
                });

                await interaction.update({ 
                    embeds: [failureEmbed], 
                    components: [] 
                });
            }

        } catch (error) {
            console.error('Error in performCraft:', error);
            await interaction.update({ 
                content: `❌ Lỗi chế tạo: ${error.message}`,
                embeds: [],
                components: [] 
            });
        }
    },

    async showRecipes(message, client) {
        try {
            const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType } = require('discord.js');

            // Create recipe pages
            const pages = [];
            
            // Page 1: Đan dược recipes
            const medicineEmbed = new EmbedBuilder()
                .setTitle('🧪 Công Thức Chế Tạo Đan Dược')
                .setDescription('**Danh sách công thức chế tạo đan dược:**\n\n💡 **Hướng dẫn:**\n🛒 Mua vật phẩm: `!cuahang <item_id> [số_lượng]`\n🔨 Chế tạo: `!chetao <item_id>`')
                .setColor(0x00ff88)
                .setTimestamp()
                .setFooter({ 
                    text: `Trang 1/2 • Chế Tạo • ${message.author.username}`, 
                    iconURL: message.author.displayAvatarURL() 
                });

            // Medicine recipes format: icon + name + id -> materials needed -> requirements -> success rate
            const medicineRecipes = [
                {
                    name: `${MEDICINES['d1'].icon || MEDICINES['d1'].fallbackIcon || '💊'} ${MEDICINES['d1'].name} (d1)`,
                    materials: `${FARM_MATERIALS['1'].icon}×9 ${FARM_MATERIALS['2'].icon}×9 ${FARM_MATERIALS['3'].icon}×9 ${FARM_MATERIALS['4'].icon}×9`,
                    requirements: `${SHOP_ITEMS['dp1'].icon}×1 ${SHOP_ITEMS['dl'].icon}×1`,
                    successRate: '50%'
                },
                {
                    name: `${MEDICINES['d2'].icon || MEDICINES['d2'].fallbackIcon || '💉'} ${MEDICINES['d2'].name} (d2)`,
                    materials: `${FARM_MATERIALS['1'].icon}×9 ${FARM_MATERIALS['3'].icon}×9 ${FARM_MATERIALS['4'].icon}×9 ${FARM_MATERIALS['5'].icon}×9`,
                    requirements: `${SHOP_ITEMS['dp2'].icon}×1 ${SHOP_ITEMS['dl'].icon}×1`,
                    successRate: '50%'
                },
                {
                    name: `${MEDICINES['d3'].icon || MEDICINES['d3'].fallbackIcon || '🧪'} ${MEDICINES['d3'].name} (d3)`,
                    materials: `${FARM_MATERIALS['1'].icon}×9 ${FARM_MATERIALS['4'].icon}×9 ${FARM_MATERIALS['5'].icon}×9 ${FARM_MATERIALS['6'].icon}×9`,
                    requirements: `${SHOP_ITEMS['dp3'].icon}×1 ${SHOP_ITEMS['dl'].icon}×1`,
                    successRate: '50%'
                },
                {
                    name: `${MEDICINES['d4'].icon || MEDICINES['d4'].fallbackIcon || '⚗️'} ${MEDICINES['d4'].name} (d4)`,
                    materials: `${FARM_MATERIALS['1'].icon}×9 ${FARM_MATERIALS['5'].icon}×5 ${FARM_MATERIALS['6'].icon}×5 ${FARM_MATERIALS['7'].icon}×5`,
                    requirements: `${SHOP_ITEMS['dp4'].icon}×1 ${SHOP_ITEMS['dl'].icon}×1`,
                    successRate: '50%'
                }
            ];

            medicineRecipes.forEach(recipe => {
                medicineEmbed.addFields({
                    name: recipe.name,
                    value: `📦 Nguyên liệu: ${recipe.materials}\n🔧 Vật phẩm cần thiết: ${recipe.requirements}\n🎲 Tỉ lệ thành công: ${recipe.successRate}`,
                    inline: false
                });
            });

            pages.push(medicineEmbed);

            // Page 2: Linh thạch recipes
            const stoneEmbed = new EmbedBuilder()
                .setTitle('💎 Công Thức Chế Tạo Linh Thạch')
                .setDescription('**Danh sách công thức chế tạo linh thạch:**\n\n💡 **Hướng dẫn:**\n🛒 Mua vật phẩm: `!cuahang <item_id> [số_lượng]`\n🔨 Chế tạo: `!chetao <item_id>`')
                .setColor(0x00ff88)
                .setTimestamp()
                .setFooter({ 
                    text: `Trang 2/2 • Chế Tạo • ${message.author.username}`, 
                    iconURL: message.author.displayAvatarURL() 
                });

            const stoneRecipes = [
                {
                    name: `${SPIRIT_STONES['lt2'].icon || SPIRIT_STONES['lt2'].fallbackIcon || '💍'} ${SPIRIT_STONES['lt2'].name} (lt2)`,
                    materials: `${SPIRIT_STONES['lt1'].icon}×99`,
                    requirements: `${SHOP_ITEMS['tlt'].icon}×1`,
                    successRate: '50%'
                },
                {
                    name: `${SPIRIT_STONES['lt3'].icon || SPIRIT_STONES['lt3'].fallbackIcon || '💠'} ${SPIRIT_STONES['lt3'].name} (lt3)`,
                    materials: `${SPIRIT_STONES['lt2'].icon}×99`,
                    requirements: `${SHOP_ITEMS['tlt'].icon}×1`,
                    successRate: '50%'
                },
                {
                    name: `${SPIRIT_STONES['lt4'].icon || SPIRIT_STONES['lt4'].fallbackIcon || '🔸'} ${SPIRIT_STONES['lt4'].name} (lt4)`,
                    materials: `${SPIRIT_STONES['lt3'].icon}×99`,
                    requirements: `${SHOP_ITEMS['tlt'].icon}×1`,
                    successRate: '50%'
                }
            ];

            stoneRecipes.forEach(recipe => {
                stoneEmbed.addFields({
                    name: recipe.name,
                    value: `📦 Nguyên liệu: ${recipe.materials}\n🔧 Vật phẩm cần thiết: ${recipe.requirements}\n🎲 Tỉ lệ thành công: ${recipe.successRate}`,
                    inline: false
                });
            });

            pages.push(stoneEmbed);

            // Create navigation buttons
            const createButtons = (currentPage, totalPages) => {
                const buttons = [];
                
                buttons.push(
                    new ButtonBuilder()
                        .setCustomId('craft_recipes_prev')
                        .setLabel('◀ Trước')
                        .setStyle(ButtonStyle.Secondary)
                        .setDisabled(currentPage === 0)
                );
                
                buttons.push(
                    new ButtonBuilder()
                        .setCustomId('craft_recipes_page')
                        .setLabel(`${currentPage + 1}/${totalPages}`)
                        .setStyle(ButtonStyle.Primary)
                        .setDisabled(true)
                );
                
                buttons.push(
                    new ButtonBuilder()
                        .setCustomId('craft_recipes_next')
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
                if (interaction.customId === 'craft_recipes_prev' && currentPage > 0) {
                    currentPage--;
                } else if (interaction.customId === 'craft_recipes_next' && currentPage < pages.length - 1) {
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

        } catch (error) {
            console.error('Error in showRecipes:', error);
            await message.reply(`❌ Lỗi hiển thị công thức: ${error.message}`);
        }
    }
}; 