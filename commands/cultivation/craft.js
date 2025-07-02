const { FARM_MATERIALS, MEDICINES, SPIRIT_STONES, CRAFT_RECIPES, FUSION_RECIPES, getItemStorageInfo } = require('../../utils/cultivationData');
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
                text: `Trang 1/6 • Yêu cầu bởi ${message.author.username}`, 
                iconURL: message.author.displayAvatarURL() 
            })
            .addFields([
                {
                    name: '🔨 CRAFT (Ghép nguyên liệu)',
                    value: `**${Object.keys(CRAFT_RECIPES).length} công thức craft:**\n` +
                           '• **Thuốc:** z1, z2, z3, z4 (từ nguyên liệu)\n' +
                           '• **Đan dược:** d1, d2, d3, d4 (cần đan phương + đan lò)\n' +
                           '• **Tỉ lệ thành công:** 50-80%',
                    inline: false
                },
                {
                    name: '⚗️ FUSION (Dung hợp)',
                    value: `**${Object.keys(FUSION_RECIPES).length} công thức fusion:**\n` +
                           '• **Thuốc:** z2 ← 9x z1, z3 ← 9x z2...\n' +
                           '• **Đan dược:** d2 ← 9x d1 + dl, d3 ← 9x d2 + dl...\n' +
                           '• **Đan phương:** dp2 ← 9x dp1 + pdp, dp3 ← 9x dp2 + pdp...\n' +
                           '• **Linh thạch:** lt2 ← 9999x lt1 + tlt...\n' +
                           '• **Tỉ lệ thành công:** 50%',
                    inline: false
                },
                {
                    name: '📖 Navigation',
                    value: '• **Trang 1:** Tổng quan hệ thống\n' +
                           '• **Trang 2:** CRAFT - Thuốc (z1-z4)\n' +
                           '• **Trang 3:** CRAFT - Đan dược (d1-d4)\n' +
                           '• **Trang 4:** FUSION - Thuốc & Đan dược\n' +
                           '• **Trang 5:** FUSION - Đan phương & Linh thạch\n' +
                           '• **Trang 6:** Nguyên liệu & Hướng dẫn\n\n' +
                           '🎮 **Dùng nút bên dưới để chuyển trang!**',
                    inline: false
                }
            ]);
        pages.push(overviewEmbed);

        // Page 2: CRAFT - Thuốc (z1-z4)
        const craftMedicinesEmbed = new EmbedBuilder()
            .setTitle('🔨 CRAFT - Thuốc (z1-z4)')
            .setDescription('**Ghép nguyên liệu farm thành thuốc**')
            .setColor(0x00ff00)
            .setTimestamp()
            .setFooter({ 
                text: `Trang 2/6 • Yêu cầu bởi ${message.author.username}`, 
                iconURL: message.author.displayAvatarURL() 
            });

        // Filter craft recipes for medicines (z series)
        const zSeriesRecipes = Object.entries(CRAFT_RECIPES).filter(([itemId]) => itemId.startsWith('z'));
        zSeriesRecipes.forEach(([itemId, recipe]) => {
            const itemData = MEDICINES[itemId];
            
            if (itemData) {
                let ingredients = '';
                if (recipe.materials) {
                    const materials = Object.entries(recipe.materials).map(([id, qty]) => 
                        `${FARM_MATERIALS[id]?.icon} \`${qty}\``
                    ).join(' + ');
                    ingredients += materials;
                }

                craftMedicinesEmbed.addFields({
                    name: `${itemData.icon} ${itemData.name}`,
                    value: `**Nguyên liệu:** ${ingredients}\n**Tỉ lệ thành công:** \`${recipe.successRate}%\`\n**Lệnh:** \`!craft ${itemId}\`\n**Mô tả:** Thuốc cơ bản từ nguyên liệu farm`,
                    inline: true
                });
            }
        });
        
        craftMedicinesEmbed.addFields({
            name: '💡 Lưu ý về thuốc',
            value: '• **Nguồn nguyên liệu:** Thu thập từ lệnh `!farm`\n' +
                   '• **Tỉ lệ thành công:** Cao (50-80%)\n' +
                   '• **Công dụng:** Dùng để fusion thành thuốc cấp cao hơn\n' +
                   '• **Chi phí:** Chỉ cần nguyên liệu farm, không cần đan phương',
            inline: false
        });
        pages.push(craftMedicinesEmbed);

        // Page 3: CRAFT - Đan dược (d1-d4)
        const craftPillsEmbed = new EmbedBuilder()
            .setTitle('🔨 CRAFT - Đan dược (d1-d4)')
            .setDescription('**Chế tạo đan dược từ nguyên liệu + đan phương + đan lò**')
            .setColor(0x0080ff)
            .setTimestamp()
            .setFooter({ 
                text: `Trang 3/6 • Yêu cầu bởi ${message.author.username}`, 
                iconURL: message.author.displayAvatarURL() 
            });

        // Filter craft recipes for pills (d series)
        const dSeriesRecipes = Object.entries(CRAFT_RECIPES).filter(([itemId]) => itemId.startsWith('d'));
        dSeriesRecipes.forEach(([itemId, recipe]) => {
            const itemData = MEDICINES[itemId];
            
            if (itemData) {
                let ingredients = '';
                if (recipe.materials) {
                    const materials = Object.entries(recipe.materials).map(([id, qty]) => 
                        `${FARM_MATERIALS[id]?.icon} \`${qty}\``
                    ).join(' + ');
                    ingredients += materials;
                }
                if (recipe.medicines) {
                    if (ingredients) ingredients += ' + ';
                    const medicines = Object.entries(recipe.medicines).map(([id, qty]) => 
                        `${MEDICINES[id]?.icon} \`${qty}\``
                    ).join(' + ');
                    ingredients += medicines;
                }

                craftPillsEmbed.addFields({
                    name: `${itemData.icon} ${itemData.name}`,
                    value: `**Nguyên liệu:** ${ingredients}\n**Tỉ lệ thành công:** \`${recipe.successRate}%\`\n**Lệnh:** \`!craft ${itemId}\`\n**Mô tả:** Đan dược cao cấp cần đan phương`,
                    inline: true
                });
            }
        });
        
        craftPillsEmbed.addFields({
            name: '✅ Lưu ý về đan dược',
            value: '• **Đan phương & đan lò:** Giờ có thể farm từ `!farm`!\n' +
                   '• **Tỉ lệ thành công:** 50% (cần chuẩn bị dự phòng)\n' +
                   '• **Công dụng:** Hiệu quả cao hơn thuốc thường\n' +
                   '• **Lợi ích:** Có thể craft đan dược mạnh mẽ',
            inline: false
        });
        pages.push(craftPillsEmbed);

        // Page 4: FUSION - Thuốc & Đan dược
        const fusionMedPillsEmbed = new EmbedBuilder()
            .setTitle('⚗️ FUSION - Thuốc & Đan dược')
            .setDescription('**Dung hợp thuốc và đan dược cấp thấp thành cấp cao hơn**')
            .setColor(0xff6600)
            .setTimestamp()
            .setFooter({ 
                text: `Trang 4/6 • Yêu cầu bởi ${message.author.username}`, 
                iconURL: message.author.displayAvatarURL() 
            });

        // Filter fusion recipes for z and d series
        const zAndDFusionRecipes = Object.entries(FUSION_RECIPES).filter(([itemId]) => 
            itemId.startsWith('z') || itemId.startsWith('d')
        );
        
        zAndDFusionRecipes.forEach(([itemId, recipe]) => {
            const itemData = MEDICINES[itemId];
            
            if (itemData) {
                const ingredients = Object.entries(recipe.required).map(([id, qty]) => {
                    const sourceData = MEDICINES[id] || SPIRIT_STONES[id];
                    return `${sourceData?.icon} \`${qty}\``;
                }).join(' + ');

                const categoryIcon = itemId.startsWith('z') ? '💊' : '🔮';
                const categoryName = itemId.startsWith('z') ? 'Thuốc' : 'Đan dược';

                fusionMedPillsEmbed.addFields({
                    name: `${itemData.icon} ${itemData.name} ${categoryIcon}`,
                    value: `**Nguyên liệu:** ${ingredients}\n**Tỉ lệ thành công:** \`${recipe.successRate}%\`\n**Lệnh:** \`!craft ${itemId} fusion\`\n**Loại:** ${categoryName}`,
                    inline: true
                });
            }
        });
        
        fusionMedPillsEmbed.addFields({
            name: '🔬 Nguyên lý Fusion',
            value: '• **Thuốc Fusion:** 9x thuốc cấp thấp → 1x thuốc cấp cao\n' +
                   '• **Đan dược Fusion:** 9x đan dược + đan lò → đan dược cấp cao\n' +
                   '• **Tỉ lệ thành công:** 50% (thấp hơn craft)\n' +
                   '• **Lợi ích:** Tiết kiệm nguyên liệu khi có nhiều vật phẩm cấp thấp',
            inline: false
        });
        pages.push(fusionMedPillsEmbed);

        // Page 5: FUSION - Đan phương & Linh thạch
        const fusionAdvancedEmbed = new EmbedBuilder()
            .setTitle('⚗️ FUSION - Đan phương & Linh thạch')
            .setDescription('**Dung hợp đan phương và linh thạch - vật phẩm cao cấp nhất**')
            .setColor(0x8b00ff)
            .setTimestamp()
            .setFooter({ 
                text: `Trang 5/6 • Yêu cầu bởi ${message.author.username}`, 
                iconURL: message.author.displayAvatarURL() 
            });

        // Filter fusion recipes for dp and lt series
        const dpAndLtFusionRecipes = Object.entries(FUSION_RECIPES).filter(([itemId]) => 
            itemId.startsWith('dp') || itemId.startsWith('lt')
        );
        
        dpAndLtFusionRecipes.forEach(([itemId, recipe]) => {
            const itemData = MEDICINES[itemId] || SPIRIT_STONES[itemId];
            
            if (itemData) {
                const ingredients = Object.entries(recipe.required).map(([id, qty]) => {
                    const sourceData = MEDICINES[id] || SPIRIT_STONES[id];
                    return `${sourceData?.icon} \`${qty}\``;
                }).join(' + ');

                const categoryIcon = itemId.startsWith('dp') ? '📜' : '💎';
                const categoryName = itemId.startsWith('dp') ? 'Đan phương' : 'Linh thạch';

                fusionAdvancedEmbed.addFields({
                    name: `${itemData.icon} ${itemData.name} ${categoryIcon}`,
                    value: `**Nguyên liệu:** ${ingredients}\n**Tỉ lệ thành công:** \`${recipe.successRate}%\`\n**Lệnh:** \`!craft ${itemId} fusion\`\n**Loại:** ${categoryName}`,
                    inline: true
                });
            }
        });
        
        fusionAdvancedEmbed.addFields({
            name: '🏆 Vật phẩm cao cấp',
            value: '• **Đan phương:** Cần thiết để craft đan dược\n' +
                   '• **Linh thạch:** Nhận từ đột phá, dùng để fusion\n' +
                   '• **Tỉ lệ thành công:** 50% (rủi ro cao)\n' +
                   '• **Lưu ý đặc biệt:** Linh thạch cần 9999x thay vì 9x!',
            inline: false
        });
        pages.push(fusionAdvancedEmbed);

        // Page 6: Materials & Guide
        const materialsEmbed = new EmbedBuilder()
            .setTitle('📦 Nguyên liệu & Hướng dẫn')
            .setDescription('**Thông tin về nguyên liệu và cách sử dụng hệ thống**')
            .setColor(0x6600ff)
            .setTimestamp()
            .setFooter({ 
                text: `Trang 6/6 • Yêu cầu bởi ${message.author.username}`, 
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
                    value: ['dp1', 'dp2', 'dp3', 'dp4', 'pdp', 'dl'].map(id => 
                        `${MEDICINES[id]?.icon} **${MEDICINES[id]?.name}**`
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
                           '• `!farm` - Thu thập tất cả (nguyên liệu, đan phương, linh thạch)\n' +
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
            if (totalPages === 6 && currentPage === 0) {
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
                             '📖 **Mục lục 6 trang:**\n' +
                             '• **Trang 1:** 🏠 Tổng quan hệ thống\n' +
                             '• **Trang 2:** 🔨 CRAFT Thuốc (z1-z4)\n' +
                             '• **Trang 3:** 🔨 CRAFT Đan dược (d1-d4)\n' +
                             '• **Trang 4:** ⚗️ FUSION Thuốc & Đan dược\n' +
                             '• **Trang 5:** ⚗️ FUSION Đan phương & Linh thạch\n' +
                             '• **Trang 6:** 📦 Nguyên liệu & Hướng dẫn\n\n' +
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