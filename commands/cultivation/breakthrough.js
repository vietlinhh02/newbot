const { getLevelByName, getNextLevel, canBreakthrough, rollBreakthrough, applyBreakthroughPenalty, giveBreakthroughRewards, formatRewards } = require('../../utils/cultivationData');
const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType } = require('discord.js');

module.exports = {
    name: 'breakthrough',
    aliases: ['dotpha', 'bt'],
    description: 'Thử đột phá lên level cao hơn (có rủi ro mất đồ và EXP)',
    usage: '!breakthrough',
    examples: [
        '!breakthrough',
        '!dotpha',
        '!bt'
    ],
    permissions: 'everyone',
    guildOnly: true,
    category: 'cultivation',

    async execute(message, args, client) {
        try {
            const userId = message.author.id;
            const guildId = message.guild.id;

            // Get user data
            const cultivationUser = await client.prisma.cultivationUser.findUnique({
                where: {
                    userId: userId
                }
            });

            if (!cultivationUser) {
                return message.reply('❌ Bạn cần bắt đầu tu luyện trước! Gửi tin nhắn trong server để bắt đầu nhận EXP.');
            }

            // Check if can breakthrough
            if (!canBreakthrough(cultivationUser.currentLevel, cultivationUser.exp)) {
                const currentLevelData = getLevelByName(cultivationUser.currentLevel);
                const expNeeded = currentLevelData ? currentLevelData.exp - cultivationUser.exp : 0;

                return message.reply(`❌ **${message.author.username}** cần thêm **${expNeeded} exp** để có thể đột phá! *(Hiện tại: ${cultivationUser.exp}/${currentLevelData?.exp || 'N/A'})*`);
            }

            const currentLevelData = getLevelByName(cultivationUser.currentLevel);
            const nextLevelData = getNextLevel(cultivationUser.currentLevel);

            if (!nextLevelData) {
                return message.reply('🏆 **Bạn đã đạt đến đỉnh cao của tu luyện!**');
            }

            // Create confirmation embed based on risk level
            const rewardsText = formatRewards(nextLevelData);
            const hasRisk = currentLevelData.expPenalty > 0 || currentLevelData.itemPenalty > 0;

            const confirmEmbed = new EmbedBuilder()
                .setTitle(hasRisk ? '⚠️ Cảnh Báo Đột Phá' : '🎯 Đột Phá An Toàn')
                .setDescription(`**${message.author.username}** muốn đột phá lên **${nextLevelData.name}**`)
                .setColor(hasRisk ? 0xff4444 : 0x00ff88)
                .addFields([
                    {
                        name: '📊 Thông tin đột phá',
                        value: `• **Level hiện tại:** ${cultivationUser.currentLevel}\n• **Level mục tiêu:** ${nextLevelData.name}\n• **Tỉ lệ thành công:** **${currentLevelData.breakRate}%**\n• **EXP hiện tại:** ${cultivationUser.exp.toLocaleString()}`,
                        inline: false
                    },
                    {
                        name: '🎁 Phần thưởng nếu thành công',
                        value: rewardsText,
                        inline: false
                    }
                ])
                .setTimestamp()
                .setFooter({ 
                    text: `Breakthrough • ${message.author.username}`, 
                    iconURL: message.author.displayAvatarURL() 
                });

            if (hasRisk) {
                confirmEmbed.addFields({
                    name: '💀 Nguy cơ nếu thất bại',
                    value: `• Mất **1-10%** EXP hiện tại (random)\n• Mất **${currentLevelData.itemPenalty}** vật phẩm ngẫu nhiên`,
                    inline: false
                });
            } else {
                confirmEmbed.addFields({
                    name: '💚 An toàn',
                    value: 'Không có rủi ro mất EXP hay vật phẩm',
                    inline: false
                });
            }

            const confirmButtons = new ActionRowBuilder()
                .addComponents(
                    new ButtonBuilder()
                        .setCustomId('breakthrough_confirm')
                        .setLabel('⚡ Xác nhận đột phá')
                        .setStyle(hasRisk ? ButtonStyle.Danger : ButtonStyle.Success),
                    new ButtonBuilder()
                        .setCustomId('breakthrough_cancel')
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
                if (interaction.customId === 'breakthrough_confirm') {
                    await this.performBreakthrough(interaction, client, userId, currentLevelData, nextLevelData, cultivationUser);
                } else if (interaction.customId === 'breakthrough_cancel') {
                    const cancelEmbed = new EmbedBuilder()
                        .setTitle('❌ Đã hủy đột phá')
                        .setDescription('Quá trình đột phá đã bị hủy.')
                        .setColor(0xff4444)
                        .setTimestamp()
                        .setFooter({ 
                            text: `Breakthrough • ${message.author.username}`, 
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
                            .setCustomId('breakthrough_confirm')
                            .setLabel('⚡ Xác nhận đột phá')
                            .setStyle(hasRisk ? ButtonStyle.Danger : ButtonStyle.Success)
                            .setDisabled(true),
                        new ButtonBuilder()
                            .setCustomId('breakthrough_cancel')
                            .setLabel('❌ Hủy bỏ')
                            .setStyle(ButtonStyle.Secondary)
                            .setDisabled(true)
                    );
                
                reply.edit({ components: [disabledButtons] }).catch(() => {});
            });

            return; // Exit early since we're handling the breakthrough in the collector

        } catch (error) {
            console.error('Error in breakthrough command:', error);
            await message.reply(`❌ Lỗi đột phá: ${error.message}`);
        }
    },

    async performBreakthrough(interaction, client, userId, currentLevelData, nextLevelData, cultivationUser) {
        try {
            // Attempt breakthrough
            const success = rollBreakthrough(currentLevelData.breakRate);

            if (success) {
                // Success - Update level
                await client.prisma.cultivationUser.update({
                    where: {
                        userId: userId
                    },
                    data: {
                        currentLevel: nextLevelData.name
                    }
                });

                // Give breakthrough rewards
                const rewardsGiven = await giveBreakthroughRewards(client, userId, nextLevelData);

                // Try to manage roles (remove old, add new if different)
                try {
                    // Convert level names to role names (remove "- Tầng X" part)
                    const currentRoleName = currentLevelData.name.replace(/\s*-\s*Tầng\s*\d+$/, '');
                    const newRoleName = nextLevelData.name.replace(/\s*-\s*Tầng\s*\d+$/, '');
                    
                    // Only change roles if they're different
                    if (currentRoleName !== newRoleName) {
                        // Remove old role
                        const oldRole = interaction.guild.roles.cache.find(r => r.name === currentRoleName);
                        if (oldRole && interaction.member.roles.cache.has(oldRole.id)) {
                            await interaction.member.roles.remove(oldRole);
                            console.log(`🗑️ Đã xóa role cũ "${oldRole.name}" của ${interaction.user.username}`);
                        }
                        
                        // Add new role
                        const newRole = interaction.guild.roles.cache.find(r => r.name === newRoleName);
                        if (newRole) {
                            // Check if bot can manage this role
                            if (newRole.position >= interaction.guild.members.me.roles.highest.position) {
                                console.log(`❌ Role "${newRole.name}" có thứ tự cao hơn bot (Bot: ${interaction.guild.members.me.roles.highest.position}, Role: ${newRole.position})`);
                                await interaction.followUp(`⚠️ Bot không thể gán role **${newRole.name}** vì role này có thứ tự cao hơn bot!`);
                            } else {
                                await interaction.member.roles.add(newRole);
                                console.log(`✅ Đã gán role mới "${newRole.name}" cho ${interaction.user.username}`);
                            }
                        } else {
                            console.log(`❌ Không tìm thấy role với tên: "${newRoleName}" (từ level: "${nextLevelData.name}")`);
                            await interaction.followUp(`⚠️ Không tìm thấy role **${newRoleName}** trong server!`);
                        }
                    } else {
                        console.log(`ℹ️ Role không thay đổi: "${newRoleName}"`);
                    }
                } catch (error) {
                    console.log('❌ Lỗi khi quản lý role:', error.message);
                    await interaction.followUp(`⚠️ Không thể quản lý role: ${error.message}`);
                }

                // Build success embed
                const successEmbed = new EmbedBuilder()
                    .setTitle('🎉 Đột Phá Thành Công!')
                    .setDescription(`**${interaction.user.username}** đã đột phá thành công!`)
                    .setColor(0x00ff00)
                    .addFields([
                        {
                            name: '⚡ Kết quả',
                            value: `• **Level mới:** ${nextLevelData.name}\n• **Tỉ lệ thành công:** ${currentLevelData.breakRate}%`,
                            inline: false
                        }
                    ])
                    .setTimestamp()
                    .setFooter({ 
                        text: `Breakthrough • ${interaction.user.username}`, 
                        iconURL: interaction.user.displayAvatarURL() 
                    });

                if (rewardsGiven.length > 0) {
                    const rewardsText = rewardsGiven.map(reward => `${reward.icon} ${reward.name} x${reward.quantity}`).join(', ');
                    successEmbed.addFields({
                        name: '🎁 Phần thưởng nhận được',
                        value: rewardsText,
                        inline: false
                    });
                }

                await interaction.update({ 
                    embeds: [successEmbed], 
                    components: [] 
                });

            } else {
                // Failure - Apply penalties
                const penalty = await applyBreakthroughPenalty(client, userId, currentLevelData);

                const failureEmbed = new EmbedBuilder()
                    .setTitle('💥 Đột Phá Thất Bại!')
                    .setDescription(`**${interaction.user.username}** đã thất bại trong đột phá!`)
                    .setColor(0xff4444)
                    .addFields([
                        {
                            name: '💔 Kết quả',
                            value: `• **Level:** Vẫn ở ${cultivationUser.currentLevel}\n• **Tỉ lệ thành công:** ${currentLevelData.breakRate}%`,
                            inline: false
                        }
                    ])
                    .setTimestamp()
                    .setFooter({ 
                        text: `Breakthrough • ${interaction.user.username}`, 
                        iconURL: interaction.user.displayAvatarURL() 
                    });

                if (penalty.expLost > 0 || penalty.itemsLost.length > 0) {
                    let penaltyText = '';
                    if (penalty.expLost > 0) {
                        // Tính % thực tế đã mất để hiển thị
                        const actualPercent = Math.round((penalty.expLost / (cultivationUser.exp + penalty.expLost)) * 100);
                        penaltyText += `💸 Mất **${penalty.expLost} EXP** (${actualPercent}%)\n`;
                    }
                    if (penalty.itemsLost.length > 0) {
                        const itemsText = penalty.itemsLost.map(item => `${item.name} x${item.quantity}`).join(', ');
                        penaltyText += `🗑️ Mất vật phẩm: ${itemsText}`;
                    }

                    failureEmbed.addFields({
                        name: '🪦 Thiệt hại',
                        value: penaltyText,
                        inline: false
                    });
                }

                await interaction.update({ 
                    embeds: [failureEmbed], 
                    components: [] 
                });
            }

        } catch (error) {
            console.error('Error in performBreakthrough:', error);
            await interaction.update({ 
                content: `❌ Lỗi đột phá: ${error.message}`,
                embeds: [],
                components: [] 
            });
        }
    }
}; 