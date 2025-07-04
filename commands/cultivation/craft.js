const { FARM_MATERIALS, MEDICINES, SPIRIT_STONES, SHOP_ITEMS, CRAFT_RECIPES, FUSION_RECIPES, getItemStorageInfo } = require('../../utils/cultivationData');
const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType } = require('discord.js');

module.exports = {
    name: 'craft',
    aliases: ['ghep', 'alchemy'],
    description: 'Ghép nguyên liệu thành thuốc/đan dược hoặc dung hợp vật phẩm cấp cao',
    usage: '!craft <item> [type]',
    examples: [
        '!craft z1 - Craft thuốc cấp 1',
        '!craft d1 - Craft đan dược hạ phẩm',
        '!craft z2 fusion - Fusion thuốc cấp 2',
        '!craft lt2 fusion - Fusion linh thạch',
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
            const craftType = args[1]?.toLowerCase() || 'craft'; // 'craft' hoặc 'fusion'

            // Validate item - check both MEDICINES and SPIRIT_STONES
            const itemData = MEDICINES[targetItem] || SPIRIT_STONES[targetItem];
            if (!itemData) {
                return message.reply(`❌ Không tìm thấy item "${targetItem}"! Sử dụng \`!craft recipes\` để xem công thức.`);
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

            // Check craft type and recipe
            let recipe;
            let successRate;
            let requiredItems = [];

            if (craftType === 'fusion') {
                recipe = FUSION_RECIPES[targetItem];
                if (!recipe) {
                    return message.reply(`❌ Không thể fusion item "${targetItem}"!`);
                }

                successRate = recipe.successRate;
                for (const [itemId, quantity] of Object.entries(recipe.required)) {
                    let itemType, itemName, haveQty;
                    
                    // Check if this is a spirit stone
                    if (SPIRIT_STONES[itemId]) {
                        itemType = 'spirit';
                        itemName = SPIRIT_STONES[itemId].name;
                        haveQty = userItems[`spirit_${itemId}`] || 0;
                    } else {
                        itemType = 'medicine';
                        itemName = MEDICINES[itemId]?.name || itemId;
                        haveQty = userItems[`medicine_${itemId}`] || 0;
                    }
                    
                    requiredItems.push({
                        type: itemType,
                        id: itemId,
                        needed: quantity,
                        have: haveQty,
                        name: itemName
                    });
                }
            } else {
                recipe = CRAFT_RECIPES[targetItem];
                if (!recipe) {
                    return message.reply(`❌ Không thể craft item "${targetItem}"!`);
                }

                successRate = recipe.successRate;

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
                    .setDescription(`Không thể ${craftType === 'fusion' ? 'dung hợp' : 'chế tạo'} **${itemData.name}**`)
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
                let actualType = item.type;
                let actualId = item.actualId || item.id;
                
                // Handle spirit stones (for fusion compatibility)
                if (item.type === 'spirit') {
                    actualType = 'material';
                    actualId = `spirit_${item.id}`;
                }
                
                await client.prisma.userInventory.update({
                    where: {
                        userId_itemType_itemId: {
                            userId: userId,
                            itemType: actualType,
                            itemId: actualId
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
                    .addFields({
                        name: '📊 Thông tin',
                        value: `• **Loại:** ${craftType === 'fusion' ? 'Dung hợp' : 'Ghép liệu'}\n• **Tỉ lệ thành công:** \`${successRate}%\``,
                        inline: false
                    });
            } else {
                resultEmbed
                    .setTitle('💥 Chế tạo thất bại!')
                    .setDescription(`Không thể tạo ra **${itemData.name}**. Nguyên liệu đã bị tiêu hao.`)
                    .setColor(0xff0000)
                    .addFields({
                        name: '📊 Thông tin',
                        value: `• **Loại:** ${craftType === 'fusion' ? 'Dung hợp' : 'Ghép liệu'}\n• **Tỉ lệ thành công:** \`${successRate}%\`\n• **Lần sau có thể thành công hơn!**`,
                        inline: false
                    });
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
        
        // Page 1: Tổng quan
        const overviewEmbed = new EmbedBuilder()
            .setTitle('🧪 Alchemy Recipes - Tu Tiên')
            .setDescription('**Hệ thống chế tạo và dung hợp vật phẩm tu tiên**')
            .setColor(0x9932cc)
            .setTimestamp()
            .setFooter({ 
                text: `Trang 1/5 • Yêu cầu bởi ${message.author.username}`, 
                iconURL: message.author.displayAvatarURL() 
            })
            .addFields([
                {
                    name: '🔨 CRAFT (Ghép nguyên liệu)',
                    value: `**${Object.keys(CRAFT_RECIPES).length} công thức craft:**\n` +
                           '• **Đan dược:** d1, d2, d3, d4 (từ nguyên liệu + đan phương + đan lò)\n' +
                           '• **Linh thạch:** lt2, lt3, lt4 (từ linh thạch thấp hơn + tụ linh thạch)\n' +
                           '• **Tỉ lệ thành công:** 50%',
                    inline: false
                },
                {
                    name: '⚗️ FUSION (Dung hợp)',
                    value: `**${Object.keys(FUSION_RECIPES).length} công thức fusion:**\n` +
                           '• **Đan dược:** d2, d3, d4 (từ đan dược thấp hơn + đan lò)\n' +
                           '• **Đan phương:** dp2, dp3, dp4 (từ đan phương thấp hơn + pdp)\n' +
                           '• **Tỉ lệ thành công:** 50%',
                    inline: false
                },
                {
                    name: '💡 Cách sử dụng',
                    value: '• `!craft <item>` - Ghép nguyên liệu (50% thành công)\n' +
                           '• `!craft <item> fusion` - Dung hợp vật phẩm (50% thành công)\n' +
                           '• `!craft recipes` - Xem tất cả công thức\n' +
                           '• `!farm` - Thu thập nguyên liệu cơ bản\n' +
                           '• `!shop` - Mua đan phương, đan lò, tụ linh thạch',
                    inline: false
                },
                {
                    name: '📖 Navigation',
                    value: '• **Trang 1:** Tổng quan hệ thống\n' +
                           '• **Trang 2:** CRAFT - Đan dược (d1-d4) và Linh thạch (lt2-lt4)\n' +
                           '• **Trang 3:** FUSION - Đan dược (d2-d4)\n' +
                           '• **Trang 4:** FUSION - Đan phương (dp2-dp4)\n' +
                           '• **Trang 5:** Nguyên liệu & Hướng dẫn\n\n' +
                           '🎮 **Dùng nút bên dưới để chuyển trang!**',
                    inline: false
                }
            ]);
        pages.push(overviewEmbed);

        // Page 2: CRAFT - Đan dược và Linh thạch
        const craftPillsEmbed = new EmbedBuilder()
            .setTitle('🔨 CRAFT - Đan dược & Linh thạch')
            .setDescription('**Chế tạo đan dược từ nguyên liệu + đan phương + đan lò và linh thạch từ linh thạch thấp hơn + tụ linh thạch**')
            .setColor(0x0080ff)
            .setTimestamp()
            .setFooter({ 
                text: `Trang 2/5 • Yêu cầu bởi ${message.author.username}`, 
                iconURL: message.author.displayAvatarURL() 
            });

        // Filter craft recipes for pills (d series) and spirit stones (lt series)
        const craftRecipes = Object.entries(CRAFT_RECIPES).filter(([itemId]) => 
            itemId.startsWith('d') || itemId.startsWith('lt')
        );
        craftRecipes.forEach(([itemId, recipe]) => {
            const itemData = MEDICINES[itemId] || SPIRIT_STONES[itemId];
            
            if (itemData) {
                let ingredients = '';
                if (recipe.materials) {
                    const materials = Object.entries(recipe.materials).map(([id, qty]) => {
                        const materialData = FARM_MATERIALS[id] || SPIRIT_STONES[id] || SHOP_ITEMS[id];
                        return `${materialData?.icon} \`${qty}\``;
                    }).join(' + ');
                    ingredients += materials;
                }
                if (recipe.medicines && Object.keys(recipe.medicines).length > 0) {
                    if (ingredients) ingredients += ' + ';
                    const medicines = Object.entries(recipe.medicines).map(([id, qty]) => {
                        const itemData = MEDICINES[id] || SHOP_ITEMS[id];
                        return `${itemData?.icon} \`${qty}\``;
                    }).join(' + ');
                    ingredients += medicines;
                }

                const description = itemId.startsWith('d') ? 'Đan dược cao cấp cần đan phương' : 'Linh thạch cần nhiều linh thạch thấp hơn';
                craftPillsEmbed.addFields({
                    name: `${itemData.icon} ${itemData.name}`,
                    value: `**Nguyên liệu:** ${ingredients}\n**Tỉ lệ thành công:** \`${recipe.successRate}%\`\n**Lệnh:** \`!craft ${itemId}\`\n**Mô tả:** ${description}`,
                    inline: true
                });
            }
        });
        
        craftPillsEmbed.addFields({
            name: '✅ Lưu ý về chế tạo',
            value: '• **Đan phương & đan lò:** Mua từ `!shop` bằng linh thạch\n' +
                   '• **Nguyên liệu:** Thu thập từ `!farm` (1-7)\n' +
                   '• **Tụ linh thạch:** Mua từ `!shop` để craft linh thạch cao\n' +
                   '• **Tỉ lệ thành công:** 50% (cần chuẩn bị dự phòng)',
            inline: false
        });
        pages.push(craftPillsEmbed);

        // Page 3: FUSION - Đan dược  
        const fusionMedPillsEmbed = new EmbedBuilder()
            .setTitle('⚗️ FUSION - Đan dược')
            .setDescription('**Dung hợp đan dược cấp thấp thành cấp cao hơn**')
            .setColor(0xff6600)
            .setTimestamp()
            .setFooter({ 
                text: `Trang 3/5 • Yêu cầu bởi ${message.author.username}`, 
                iconURL: message.author.displayAvatarURL() 
            });

        // Filter fusion recipes for d series only (bỏ z series)
        const dFusionRecipes = Object.entries(FUSION_RECIPES).filter(([itemId]) => 
            itemId.startsWith('d')
        );
        
        dFusionRecipes.forEach(([itemId, recipe]) => {
            const itemData = MEDICINES[itemId];
            
            if (itemData) {
                const ingredients = Object.entries(recipe.required).map(([id, qty]) => {
                    const sourceData = MEDICINES[id] || SHOP_ITEMS[id] || SPIRIT_STONES[id];
                    return `${sourceData?.icon} \`${qty}\``;
                }).join(' + ');

                fusionMedPillsEmbed.addFields({
                    name: `${itemData.icon} ${itemData.name} 🔮`,
                    value: `**Nguyên liệu:** ${ingredients}\n**Tỉ lệ thành công:** \`${recipe.successRate}%\`\n**Lệnh:** \`!craft ${itemId} fusion\`\n**Loại:** Đan dược`,
                    inline: true
                });
            }
        });
        
        fusionMedPillsEmbed.addFields({
            name: '🔬 Nguyên lý Fusion Đan dược',
            value: '• **Đan dược Fusion:** 9x đan dược + đan lò → đan dược cấp cao\n' +
                   '• **Tỉ lệ thành công:** 50% (thấp hơn craft)\n' +
                   '• **Lợi ích:** Tiết kiệm nguyên liệu khi có nhiều đan dược cấp thấp\n' +
                   '• **Lưu ý:** Luôn cần thêm đan lò cho mọi fusion đan dược',
            inline: false
        });
        pages.push(fusionMedPillsEmbed);

        // Page 4: FUSION - Đan phương
        const fusionAdvancedEmbed = new EmbedBuilder()
            .setTitle('⚗️ FUSION - Đan phương')
            .setDescription('**Dung hợp đan phương - vật phẩm cao cấp để craft đan dược**')
            .setColor(0x8b00ff)
            .setTimestamp()
            .setFooter({ 
                text: `Trang 4/5 • Yêu cầu bởi ${message.author.username}`, 
                iconURL: message.author.displayAvatarURL() 
            });

        // Filter fusion recipes for dp series only
        const dpFusionRecipes = Object.entries(FUSION_RECIPES).filter(([itemId]) => 
            itemId.startsWith('dp')
        );
        
        dpFusionRecipes.forEach(([itemId, recipe]) => {
            const itemData = SHOP_ITEMS[itemId] || SPIRIT_STONES[itemId];
            
            if (itemData) {
                const ingredients = Object.entries(recipe.required).map(([id, qty]) => {
                    const sourceData = SHOP_ITEMS[id] || SPIRIT_STONES[id];
                    return `${sourceData?.icon} \`${qty}\``;
                }).join(' + ');

                fusionAdvancedEmbed.addFields({
                    name: `${itemData.icon} ${itemData.name} 📜`,
                    value: `**Nguyên liệu:** ${ingredients}\n**Tỉ lệ thành công:** \`${recipe.successRate}%\`\n**Lệnh:** \`!craft ${itemId} fusion\`\n**Loại:** Đan phương`,
                    inline: true
                });
            }
        });
        
        fusionAdvancedEmbed.addFields({
            name: '📜 Về Đan phương',
            value: '• **Đan phương:** Cần thiết để craft đan dược\n' +
                   '• **Fusion:** 9x đan phương thấp hơn + 1x phối đan phương\n' +
                   '• **Tỉ lệ thành công:** 50% (rủi ro cao)\n' +
                   '• **Mua từ shop:** Đan phương và phối đan phương bằng linh thạch',
            inline: false
        });
        pages.push(fusionAdvancedEmbed);

        // Page 5: Materials & Guide
        const materialsEmbed = new EmbedBuilder()
            .setTitle('📦 Nguyên liệu & Hướng dẫn')
            .setDescription('**Thông tin về nguyên liệu và cách sử dụng hệ thống**')
            .setColor(0x6600ff)
            .setTimestamp()
            .setFooter({ 
                text: `Trang 5/5 • Yêu cầu bởi ${message.author.username}`, 
                iconURL: message.author.displayAvatarURL() 
            })
            .addFields([
                {
                    name: '🌿 Nguyên liệu Farm',
                    value: Object.entries(FARM_MATERIALS).map(([id, data]) => 
                        `${data.icon} **${data.name}** - \`!farm\``
                    ).join('\n'),
                    inline: true
                },
                {
                    name: '🧪 Đan phương & Đan lò',
                    value: ['dp1', 'dp2', 'dp3', 'dp4', 'pdp', 'dl', 'tlt'].map(id => 
                        `${SHOP_ITEMS[id]?.icon} **${SHOP_ITEMS[id]?.name}** - \`!shop buy ${id}\``
                    ).join('\n'),
                    inline: true
                },
                {
                    name: '💎 Linh thạch',
                    value: Object.entries(SPIRIT_STONES).map(([id, data]) => 
                        `${data.icon} **${data.name}**`
                    ).join('\n'),
                    inline: true
                },
                {
                    name: '📖 Hướng dẫn sử dụng',
                    value: '• `!craft <item>` - Ghép bằng nguyên liệu\n' +
                           '• `!craft <item> fusion` - Dung hợp vật phẩm\n' +
                           '• `!inv` - Xem inventory hiện tại\n' +
                           '• `!farm` - Thu thập nguyên liệu (1-7) + linh thạch (lt1)\n' +
                           '• `!shop` - Mua đan phương, đan lò, tụ linh thạch\n' +
                           '• `!breakthrough` - Nhận linh thạch từ đột phá',
                    inline: true
                },
                {
                    name: '💡 Tips & Chiến thuật',
                    value: '• **Kiểm tra inventory:** `!inv materials`, `!inv medicines`, `!inv stones`\n' +
                           '• **Tích lũy đan lò (dl):** Cần thiết cho mọi đan dược\n' +
                           '• **Fusion thông minh:** Dùng khi có nhiều vật phẩm cấp thấp\n' +
                           '• **Đột phá thường xuyên:** Để có linh thạch fusion',
                    inline: true
                },
                {
                    name: '⚠️ Lưu ý quan trọng',
                    value: '🔥 **Nguyên liệu sẽ bị tiêu hao dù thành công hay thất bại!**\n' +
                           '💰 **Tính toán kỹ trước khi craft/fusion**\n' +
                           '🎯 **Tỉ lệ thành công:** Craft > Fusion\n' +
                           '📈 **Hiệu quả:** Đan dược > Thuốc thường',
                    inline: false
                }
            ]);
        pages.push(materialsEmbed);

        // Tạo buttons
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
            
            // Jump to overview (always show except on page 1)
            if (currentPage !== 0) {
                buttons.push(
                    new ButtonBuilder()
                        .setCustomId('craft_home')
                        .setLabel('🏠 Tổng quan')
                        .setStyle(ButtonStyle.Success)
                );
            }
            
            // Quick navigation to specific sections
            if (totalPages === 5 && currentPage === 0) {
                // Add quick access button on overview page
                buttons.push(
                    new ButtonBuilder()
                        .setCustomId('craft_jump')
                        .setLabel('🚀 Chuyển nhanh')
                        .setStyle(ButtonStyle.Secondary)
                );
            }
            
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
            } else if (interaction.customId === 'craft_home') {
                currentPage = 0;
            } else if (interaction.customId === 'craft_jump') {
                // Show quick navigation info
                                        await interaction.followUp({
                            content: '🚀 **Chuyển nhanh đến trang bằng nút navigation:**\n\n' +
                                     '📖 **Mục lục 5 trang:**\n' +
                                     '• **Trang 1:** 🏠 Tổng quan hệ thống\n' +
                                     '• **Trang 2:** 🔨 CRAFT Đan dược (d1-d4)\n' +
                                     '• **Trang 3:** ⚗️ FUSION Đan dược\n' +
                                     '• **Trang 4:** ⚗️ FUSION Đan phương & Linh thạch\n' +
                                     '• **Trang 5:** 📦 Nguyên liệu & Hướng dẫn\n\n' +
                                     '💡 **Dùng nút `◀ Trước` và `Sau ▶` để chuyển trang**',
                            ephemeral: true
                        });
                return; // Don't update main message
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