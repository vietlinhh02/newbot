const { CULTIVATION_LEVELS } = require('../../utils/cultivationData');
const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType } = require('discord.js');

module.exports = {
    name: 'adminbreakthrough',
    aliases: ['abt', 'adminbt'],
    description: 'Đột phá lên level cao hơn mà không cần EXP (chỉ dành cho admin)',
    usage: '!adminbreakthrough [level]',
    examples: [
        '!adminbreakthrough - Xem danh sách các level có thể đột phá',
        '!adminbreakthrough 10 - Đột phá lên level 10',
        '!adminbreakthrough Luyện Khí - Sơ Kỳ - Tầng 5 - Đột phá lên level cụ thể'
    ],
    permissions: 'admin',
    guildOnly: true,
    category: 'cultivation',

    async execute(message, args, client) {
        try {
            // Check if user is admin
            if (!message.member.permissions.has('Administrator')) {
                return message.reply('❌ Chỉ có admin mới có thể sử dụng lệnh này!');
            }

            const userId = message.author.id;

            // Get or create user cultivation data
            let cultivationUser = await client.prisma.cultivationUser.findUnique({
                where: { userId: userId }
            });

            if (!cultivationUser) {
                cultivationUser = await client.prisma.cultivationUser.create({
                    data: {
                        userId: userId,
                        exp: 0,
                        currentLevel: 'Phàm Nhân',
                        messageCount: 0,
                        voiceTime: 0
                    }
                });
            }

            // If no args, show available levels
            if (!args[0]) {
                return this.showLevelsList(message, client, cultivationUser.currentLevel);
            }

            // Parse target level
            let targetLevel = null;
            let targetIndex = -1;

            // Check if it's a number (level index)
            if (!isNaN(args[0])) {
                targetIndex = parseInt(args[0]) - 1; // Convert to 0-based index
                if (targetIndex >= 0 && targetIndex < CULTIVATION_LEVELS.length) {
                    targetLevel = CULTIVATION_LEVELS[targetIndex];
                }
            } else {
                // Search by level name
                const searchTerm = args.join(' ').toLowerCase();
                targetIndex = CULTIVATION_LEVELS.findIndex(level => 
                    level.name.toLowerCase().includes(searchTerm) || 
                    level.name.toLowerCase() === searchTerm
                );
                
                if (targetIndex !== -1) {
                    targetLevel = CULTIVATION_LEVELS[targetIndex];
                }
            }

            if (!targetLevel) {
                return message.reply('❌ Không tìm thấy tu vi! Sử dụng `!adminbreakthrough` để xem danh sách các tu vi.');
            }

            // Get current level index
            const currentIndex = CULTIVATION_LEVELS.findIndex(level => level.name === cultivationUser.currentLevel);
            
            if (currentIndex === -1) {
                return message.reply('❌ Lỗi: Không tìm thấy level hiện tại trong hệ thống!');
            }

            // Check if target level is valid
            if (targetIndex <= currentIndex) {
                return message.reply(`❌ Không thể đột phá xuống tu vi thấp hơn hoặc cùng tu vi! Tu vi hiện tại: **${cultivationUser.currentLevel}** (${currentIndex + 1})`);
            }

            // Confirmation dialog
            const confirmEmbed = new EmbedBuilder()
                .setTitle('⚡ Admin Breakthrough - Xác nhận')
                .setDescription(`Bạn có chắc chắn muốn đột phá từ **${cultivationUser.currentLevel}** lên **${targetLevel.name}**?`)
                .setColor(0xffd700)
                .addFields([
                    {
                        name: '📊 Thông tin đột phá',
                        value: `• **Tu Vi hiện tại:** ${cultivationUser.currentLevel} (${currentIndex + 1})\n• **Tu Vi mục tiêu:** ${targetLevel.name} (${targetIndex + 1})\n• **EXP hiện tại:** ${cultivationUser.exp.toLocaleString()}\n• **EXP sau đột phá:** ${targetLevel.exp.toLocaleString()}`,
                        inline: false
                    },
                    {
                        name: '🎁 Phần thưởng nhận được',
                        value: targetLevel.rewards ? targetLevel.rewards.join(', ') : 'Không có',
                        inline: false
                    },
                    {
                        name: '⚠️ Lưu ý',
                        value: '• Đây là tính năng admin đặc biệt\n• Không tiêu tốn đan dược hay nguyên liệu\n• Có thể đột phá lên bất kỳ level nào\n• **EXP sẽ được set thành 9999 để test**',
                        inline: false
                    }
                ])
                .setTimestamp()
                .setFooter({ 
                    text: `Admin Command • ${message.author.username}`, 
                    iconURL: message.author.displayAvatarURL() 
                });

            const confirmButtons = new ActionRowBuilder()
                .addComponents(
                    new ButtonBuilder()
                        .setCustomId('admin_breakthrough_confirm')
                        .setLabel('✅ Xác nhận đột phá')
                        .setStyle(ButtonStyle.Success),
                    new ButtonBuilder()
                        .setCustomId('admin_breakthrough_cancel')
                        .setLabel('❌ Hủy bỏ')
                        .setStyle(ButtonStyle.Danger)
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
                if (interaction.customId === 'admin_breakthrough_confirm') {
                    // Perform breakthrough with test EXP
                    await client.prisma.cultivationUser.update({
                        where: { userId: userId },
                        data: {
                            currentLevel: targetLevel.name,
                            exp: 9999 // Set EXP to 9999 for testing
                        }
                    });

                    // Add rewards if any
                    if (targetLevel.rewards && targetLevel.rewards.length > 0) {
                        for (const reward of targetLevel.rewards) {
                            const [itemId, quantity] = reward.split(':');
                            const qty = parseInt(quantity) || 1;
                            
                            // Determine item type
                            let itemType = 'material';
                            if (itemId.startsWith('lt')) {
                                itemType = 'material';
                            } else if (itemId.startsWith('d')) {
                                itemType = 'medicine';
                            }

                            await client.prisma.userInventory.upsert({
                                where: {
                                    userId_itemType_itemId: {
                                        userId: userId,
                                        itemType: itemType,
                                        itemId: itemId
                                    }
                                },
                                update: {
                                    quantity: {
                                        increment: qty
                                    }
                                },
                                create: {
                                    userId: userId,
                                    itemType: itemType,
                                    itemId: itemId,
                                    quantity: qty
                                }
                            });
                        }
                    }

                    const successEmbed = new EmbedBuilder()
                        .setTitle('🌟 Admin Breakthrough Thành Công!')
                        .setDescription(`**${message.author.username}** đã đột phá thành công!`)
                        .setColor(0x00ff00)
                        .addFields([
                            {
                                name: '🎉 Kết quả',
                                value: `• **Tu Vi mới:** ${targetLevel.name}\n• **EXP test:** 9,999\n• **Đã nhảy qua:** ${targetIndex - currentIndex} tu vi`,
                                inline: false
                            },
                            {
                                name: '🎁 Phần thưởng',
                                value: targetLevel.rewards ? targetLevel.rewards.join(', ') : 'Không có',
                                inline: false
                            },
                            {
                                name: '💡 Hướng dẫn tiếp theo',
                                value: '• Sử dụng `!tuvi` để xem thông tin tu vi\n• Sử dụng `!testexp` để thêm EXP test\n• Sử dụng `!dotpha` để test đột phá bình thường',
                                inline: false
                            }
                        ])
                        .setTimestamp()
                        .setFooter({ 
                            text: `Admin Command • ${message.author.username}`, 
                            iconURL: message.author.displayAvatarURL() 
                        });

                    await interaction.update({ 
                        embeds: [successEmbed], 
                        components: [] 
                    });
                } else if (interaction.customId === 'admin_breakthrough_cancel') {
                    const cancelEmbed = new EmbedBuilder()
                        .setTitle('❌ Đã hủy Admin Breakthrough')
                        .setDescription('Quá trình đột phá admin đã bị hủy.')
                        .setColor(0xff4444)
                        .setTimestamp()
                        .setFooter({ 
                            text: `Admin Command • ${message.author.username}`, 
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
                            .setCustomId('admin_breakthrough_confirm')
                            .setLabel('✅ Xác nhận đột phá')
                            .setStyle(ButtonStyle.Success)
                            .setDisabled(true),
                        new ButtonBuilder()
                            .setCustomId('admin_breakthrough_cancel')
                            .setLabel('❌ Hủy bỏ')
                            .setStyle(ButtonStyle.Danger)
                            .setDisabled(true)
                    );
                
                reply.edit({ components: [disabledButtons] }).catch(() => {});
            });

        } catch (error) {
            console.error('Error in adminbreakthrough command:', error);
            await message.reply(`❌ Lỗi admin breakthrough: ${error.message}`);
        }
    },

    async showLevelsList(message, client, currentLevel) {
        // Find current level index
        const currentIndex = CULTIVATION_LEVELS.findIndex(level => level.name === currentLevel);
        
        // Create pages showing levels
        const pages = [];
        const levelsPerPage = 10;
        
        for (let i = 0; i < CULTIVATION_LEVELS.length; i += levelsPerPage) {
            const pageEmbed = new EmbedBuilder()
                .setTitle('⚡ Admin Breakthrough - Danh sách Tu Vi')
                .setDescription('**Chọn tu vi bạn muốn đột phá đến (Admin Only):**')
                .setColor(0xff6600)
                .setTimestamp()
                .setFooter({ 
                    text: `Trang ${Math.floor(i / levelsPerPage) + 1}/${Math.ceil(CULTIVATION_LEVELS.length / levelsPerPage)} • Admin Command • ${message.author.username}`, 
                    iconURL: message.author.displayAvatarURL() 
                });

            let levelsText = '';
            for (let j = i; j < Math.min(i + levelsPerPage, CULTIVATION_LEVELS.length); j++) {
                const level = CULTIVATION_LEVELS[j];
                const levelNumber = j + 1;
                const isCurrent = j === currentIndex;
                const isAvailable = j > currentIndex;
                
                let status = '';
                if (isCurrent) {
                    status = '👤 **[HIỆN TẠI]**';
                } else if (isAvailable) {
                    status = '✅ Có thể đột phá';
                } else {
                    status = '📜 Đã qua';
                }
                
                levelsText += `**${levelNumber}.** ${level.name}\n`;
                levelsText += `├ EXP: ${level.exp.toLocaleString()}\n`;
                levelsText += `├ Tỉ lệ đột phá: ${level.breakRate}%\n`;
                levelsText += `└ ${status}\n\n`;
            }

            pageEmbed.addFields({
                name: '📋 Danh sách Tu Vi',
                value: levelsText,
                inline: false
            });

            if (i === 0) {
                pageEmbed.addFields(                {
                    name: '💡 Hướng dẫn sử dụng',
                    value: '• `!adminbreakthrough <số>` - Đột phá đến tu vi theo số thứ tự\n• `!adminbreakthrough <tên tu vi>` - Đột phá đến tu vi theo tên\n• Ví dụ: `!adminbreakthrough 15` hoặc `!adminbreakthrough Luyện Khí`\n• **EXP sẽ được set thành 9999 sau khi đột phá để test**',
                    inline: false
                });
            }

            pages.push(pageEmbed);
        }

        // Create navigation buttons
        const createButtons = (currentPage, totalPages) => {
            const buttons = [];
            
            buttons.push(
                new ButtonBuilder()
                    .setCustomId('admin_levels_prev')
                    .setLabel('◀ Trước')
                    .setStyle(ButtonStyle.Secondary)
                    .setDisabled(currentPage === 0)
            );
            
            buttons.push(
                new ButtonBuilder()
                    .setCustomId('admin_levels_page')
                    .setLabel(`${currentPage + 1}/${totalPages}`)
                    .setStyle(ButtonStyle.Primary)
                    .setDisabled(true)
            );
            
            buttons.push(
                new ButtonBuilder()
                    .setCustomId('admin_levels_next')
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
            if (interaction.customId === 'admin_levels_prev' && currentPage > 0) {
                currentPage--;
            } else if (interaction.customId === 'admin_levels_next' && currentPage < pages.length - 1) {
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
