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

            // Helper function to format items with icons
            const formatItemWithIcon = (itemName, quantity) => {
                // Try to find the item in different data sources
                let icon = '';
                
                // Check farm materials
                if (FARM_MATERIALS[itemName] || FARM_MATERIALS[itemName.toLowerCase()]) {
                    const item = FARM_MATERIALS[itemName] || FARM_MATERIALS[itemName.toLowerCase()];
                    icon = item.icon || item.fallbackIcon || '🌿';
                }
                // Check medicines
                else if (MEDICINES[itemName] || MEDICINES[itemName.toLowerCase()]) {
                    const item = MEDICINES[itemName] || MEDICINES[itemName.toLowerCase()];
                    icon = item.icon || item.fallbackIcon || '💊';
                }
                // Check spirit stones
                else if (SPIRIT_STONES[itemName] || SPIRIT_STONES[itemName.toLowerCase()]) {
                    const item = SPIRIT_STONES[itemName] || SPIRIT_STONES[itemName.toLowerCase()];
                    icon = item.icon || item.fallbackIcon || '💎';
                }
                // Check shop items
                else if (SHOP_ITEMS[itemName] || SHOP_ITEMS[itemName.toLowerCase()]) {
                    const item = SHOP_ITEMS[itemName] || SHOP_ITEMS[itemName.toLowerCase()];
                    icon = item.icon || item.fallbackIcon || '📜';
                }
                // Try to match by name (for Vietnamese names)
                else {
                    const nameMap = {
                        'Bạch ngọc sương': FARM_MATERIALS['1'],
                        'Tụ linh thảo': FARM_MATERIALS['2'],
                        'Tử hoa thảo': FARM_MATERIALS['3'],
                        'Hồng tú hoa': FARM_MATERIALS['4'],
                        'Ngũ sắc hoa': FARM_MATERIALS['5'],
                        'Ngũ sắc thạch': FARM_MATERIALS['6'],
                        'Huyết ngọc hoa': FARM_MATERIALS['7'],
                        'Hạ phẩm linh thạch': SPIRIT_STONES['lt1'],
                        'Trung phẩm linh thạch': SPIRIT_STONES['lt2'],
                        'Thượng phẩm linh thạch': SPIRIT_STONES['lt3'],
                        'Tiên phẩm linh thạch': SPIRIT_STONES['lt4'],
                        'Hạ phẩm đan phương': SHOP_ITEMS['dp1'],
                        'Trung phẩm đan phương': SHOP_ITEMS['dp2'],
                        'Thượng phẩm đan phương': SHOP_ITEMS['dp3'],
                        'Tiên phẩm đan phương': SHOP_ITEMS['dp4'],
                        'Đan lò': SHOP_ITEMS['dl'],
                        'Tụ linh thạch': SHOP_ITEMS['tlt']
                    };
                    
                    if (nameMap[itemName]) {
                        icon = nameMap[itemName].icon || nameMap[itemName].fallbackIcon || '🔮';
                    } else {
                        icon = '🔮'; // Default icon
                    }
                }
                
                return `${icon}${itemName} x${quantity}`;
            };

            // Create recipe pages
            const pages = [];
            
            // Page 1: Đan dược recipes
            const medicineEmbed = new EmbedBuilder()
                .setTitle('🧪 Công Thức Chế Tạo - Đan Dược')
                .setDescription('**Danh sách công thức chế tạo đan dược:**')
                .setColor(0x00ff88)
                .setTimestamp()
                .setFooter({ 
                    text: `Trang 1/2 • Chế Tạo • ${message.author.username}`, 
                    iconURL: message.author.displayAvatarURL() 
                });

            const medicineRecipes = [
                {
                    name: `${MEDICINES['d1'].icon || MEDICINES['d1'].fallbackIcon || '💊'} Hạ phẩm đan dược (d1)`,
                    materials: `${formatItemWithIcon('Bạch ngọc sương', 9)}, ${formatItemWithIcon('Tụ linh thảo', 9)}, ${formatItemWithIcon('Tử hoa thảo', 9)}, ${formatItemWithIcon('Hồng tú hoa', 9)}`,
                    requirements: `${formatItemWithIcon('Hạ phẩm đan phương', 1)}, ${formatItemWithIcon('Đan lò', 1)}`,
                    successRate: '50%'
                },
                {
                    name: `${MEDICINES['d2'].icon || MEDICINES['d2'].fallbackIcon || '💉'} Trung phẩm đan dược (d2)`,
                    materials: `${formatItemWithIcon('Bạch ngọc sương', 9)}, ${formatItemWithIcon('Tử hoa thảo', 9)}, ${formatItemWithIcon('Hồng tú hoa', 9)}, ${formatItemWithIcon('Ngũ sắc hoa', 9)}`,
                    requirements: `${formatItemWithIcon('Trung phẩm đan phương', 1)}, ${formatItemWithIcon('Đan lò', 1)}`,
                    successRate: '50%'
                },
                {
                    name: `${MEDICINES['d3'].icon || MEDICINES['d3'].fallbackIcon || '🧪'} Thượng phẩm đan dược (d3)`,
                    materials: `${formatItemWithIcon('Bạch ngọc sương', 9)}, ${formatItemWithIcon('Hồng tú hoa', 9)}, ${formatItemWithIcon('Ngũ sắc hoa', 9)}, ${formatItemWithIcon('Ngũ sắc thạch', 9)}`,
                    requirements: `${formatItemWithIcon('Thượng phẩm đan phương', 1)}, ${formatItemWithIcon('Đan lò', 1)}`,
                    successRate: '50%'
                },
                {
                    name: `${MEDICINES['d4'].icon || MEDICINES['d4'].fallbackIcon || '⚗️'} Tiên phẩm đan dược (d4)`,
                    materials: `${formatItemWithIcon('Bạch ngọc sương', 9)}, ${formatItemWithIcon('Ngũ sắc hoa', 5)}, ${formatItemWithIcon('Ngũ sắc thạch', 5)}, ${formatItemWithIcon('Huyết ngọc hoa', 5)}`,
                    requirements: `${formatItemWithIcon('Tiên phẩm đan phương', 1)}, ${formatItemWithIcon('Đan lò', 1)}`,
                    successRate: '50%'
                }
            ];

            // Split recipes into individual fields with even shorter text
            medicineRecipes.forEach((recipe, index) => {
                // Create shorter versions of materials and requirements
                const shortMaterials = recipe.materials.split(', ').map(item => {
                    return item.replace(' x', '×').replace('Bạch ngọc sương', 'BNS').replace('Tụ linh thảo', 'TLT').replace('Tử hoa thảo', 'THT').replace('Hồng tú hoa', 'HTH').replace('Ngũ sắc hoa', 'NSH').replace('Ngũ sắc thạch', 'NST').replace('Huyết ngọc hoa', 'HNH');
                }).join(', ');
                
                const shortRequirements = recipe.requirements.replace('Hạ phẩm đan phương', 'HP ĐP').replace('Trung phẩm đan phương', 'TP ĐP').replace('Thượng phẩm đan phương', 'THP ĐP').replace('Tiên phẩm đan phương', 'TIP ĐP').replace('Đan lò', 'ĐL').replace(' x', '×');
                
                medicineEmbed.addFields({
                    name: `${recipe.name}`,
                    value: `📦 ${shortMaterials}\n🔧 ${shortRequirements}\n🎲 ${recipe.successRate}`,
                    inline: false
                });
            });

            pages.push(medicineEmbed);

            // Page 2: Linh thạch recipes
            const stoneEmbed = new EmbedBuilder()
                .setTitle('💎 Công Thức Chế Tạo - Linh Thạch')
                .setDescription('**Danh sách công thức chế tạo linh thạch:**')
                .setColor(0x00ff88)
                .setTimestamp()
                .setFooter({ 
                    text: `Trang 2/2 • Chế Tạo • ${message.author.username}`, 
                    iconURL: message.author.displayAvatarURL() 
                });

            const stoneRecipes = [
                {
                    name: `${SPIRIT_STONES['lt2'].icon || SPIRIT_STONES['lt2'].fallbackIcon || '💍'} Trung phẩm linh thạch (lt2)`,
                    materials: `${formatItemWithIcon('Hạ phẩm linh thạch', 9999)}`,
                    requirements: `${formatItemWithIcon('Tụ linh thạch', 1)}`,
                    successRate: '50%'
                },
                {
                    name: `${SPIRIT_STONES['lt3'].icon || SPIRIT_STONES['lt3'].fallbackIcon || '💠'} Thượng phẩm linh thạch (lt3)`,
                    materials: `${formatItemWithIcon('Trung phẩm linh thạch', 9999)}`,
                    requirements: `${formatItemWithIcon('Tụ linh thạch', 1)}`,
                    successRate: '50%'
                },
                {
                    name: `${SPIRIT_STONES['lt4'].icon || SPIRIT_STONES['lt4'].fallbackIcon || '🔸'} Tiên phẩm linh thạch (lt4)`,
                    materials: `${formatItemWithIcon('Thượng phẩm linh thạch', 9999)}`,
                    requirements: `${formatItemWithIcon('Tụ linh thạch', 1)}`,
                    successRate: '50%'
                }
            ];

            // Split stone recipes into individual fields with shorter text
            stoneRecipes.forEach((recipe, index) => {
                // Create shorter versions
                const shortMaterials = recipe.materials.replace('Hạ phẩm linh thạch', 'HP LT').replace('Trung phẩm linh thạch', 'TP LT').replace('Thượng phẩm linh thạch', 'THP LT').replace(' x', '×');
                const shortRequirements = recipe.requirements.replace('Tụ linh thạch', 'TLT').replace(' x', '×');
                
                stoneEmbed.addFields({
                    name: `${recipe.name}`,
                    value: `📦 ${shortMaterials}\n🔧 ${shortRequirements}\n🎲 ${recipe.successRate}`,
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