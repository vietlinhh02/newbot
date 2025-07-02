const { getLevelByName, getNextLevel, canBreakthrough, rollBreakthrough, applyBreakthroughPenalty, giveBreakthroughRewards, formatRewards } = require('../../utils/cultivationData');

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

            // Show warning about penalties and rewards if applicable
            if (currentLevelData.expPenalty > 0 || currentLevelData.itemPenalty > 0) {
                const rewardsText = formatRewards(nextLevelData);
                
                const warningText = `⚠️ **CẢNH BÁO ĐỘT PHÁ** ⚠️\n` +
                    `**${message.author.username}** muốn đột phá lên **${nextLevelData.name}**\n\n` +
                    `🎯 **Tỉ lệ thành công:** **${currentLevelData.breakRate}%**\n` +
                    `🎁 **Phần thưởng nếu thành công:** ${rewardsText}\n\n` +
                    `💀 **Nếu thất bại sẽ mất:**\n` +
                    `• **${currentLevelData.expPenalty}%** EXP hiện tại\n` +
                    `• **${currentLevelData.itemPenalty}** vật phẩm ngẫu nhiên\n\n` +
                    `Gõ \`!breakthrough confirm\` để xác nhận đột phá!`;

                if (!args[0] || args[0] !== 'confirm') {
                    return message.reply(warningText);
                }
            } else {
                // Show rewards for safe breakthroughs too
                const rewardsText = formatRewards(nextLevelData);
                if (!args[0] || args[0] !== 'confirm') {
                    const infoText = `🎯 **ĐỘT PHÁ AN TOÀN**\n` +
                        `**${message.author.username}** muốn đột phá lên **${nextLevelData.name}**\n\n` +
                        `✅ **Tỉ lệ thành công:** **${currentLevelData.breakRate}%**\n` +
                        `🎁 **Phần thưởng:** ${rewardsText}\n` +
                        `💚 **Không có rủi ro mất EXP hay vật phẩm**\n\n` +
                        `Gõ \`!breakthrough confirm\` để xác nhận đột phá!`;
                    
                    return message.reply(infoText);
                }
            }

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
                        const oldRole = message.guild.roles.cache.find(r => r.name === currentRoleName);
                        if (oldRole && message.member.roles.cache.has(oldRole.id)) {
                            await message.member.roles.remove(oldRole);
                            console.log(`🗑️ Đã xóa role cũ "${oldRole.name}" của ${message.author.username}`);
                        }
                        
                        // Add new role
                        const newRole = message.guild.roles.cache.find(r => r.name === newRoleName);
                        if (newRole) {
                            // Check if bot can manage this role
                            if (newRole.position >= message.guild.members.me.roles.highest.position) {
                                console.log(`❌ Role "${newRole.name}" có thứ tự cao hơn bot (Bot: ${message.guild.members.me.roles.highest.position}, Role: ${newRole.position})`);
                                await message.channel.send(`⚠️ Bot không thể gán role **${newRole.name}** vì role này có thứ tự cao hơn bot!`);
                            } else {
                                await message.member.roles.add(newRole);
                                console.log(`✅ Đã gán role mới "${newRole.name}" cho ${message.author.username}`);
                            }
                        } else {
                            console.log(`❌ Không tìm thấy role với tên: "${newRoleName}" (từ level: "${nextLevelData.name}")`);
                            await message.channel.send(`⚠️ Không tìm thấy role **${newRoleName}** trong server!`);
                        }
                    } else {
                        console.log(`ℹ️ Role không thay đổi: "${newRoleName}"`);
                    }
                } catch (error) {
                    console.log('❌ Lỗi khi quản lý role:', error.message);
                    await message.channel.send(`⚠️ Không thể quản lý role: ${error.message}`);
                }

                // Build success message with rewards
                let successText = `🎉 **ĐỘT PHÁ THÀNH CÔNG!** **${message.author.username}** đã lên **${nextLevelData.name}** *(${currentLevelData.breakRate}% thành công)*`;
                
                if (rewardsGiven.length > 0) {
                    const rewardsText = rewardsGiven.map(reward => `${reward.icon} ${reward.name} x${reward.quantity}`).join(', ');
                    successText += `\n🎁 **Phần thưởng nhận được:** ${rewardsText}`;
                }

                await message.reply(successText);

            } else {
                // Failure - Apply penalties
                const penalty = await applyBreakthroughPenalty(client, userId, currentLevelData);

                let failureText = `💥 **ĐỘT PHÁ THẤT BẠI!** **${message.author.username}** vẫn ở **${cultivationUser.currentLevel}** *(${currentLevelData.breakRate}% thành công)*`;

                if (penalty.expLost > 0) {
                    failureText += `\n💸 Mất **${penalty.expLost} EXP** (${currentLevelData.expPenalty}%)`;
                }

                if (penalty.itemsLost.length > 0) {
                    const itemsText = penalty.itemsLost.map(item => `${item.name} x${item.quantity}`).join(', ');
                    failureText += `\n🗑️ Mất vật phẩm: ${itemsText}`;
                }

                await message.reply(failureText);
            }

        } catch (error) {
            console.error('Error in breakthrough command:', error);
            await message.reply(`❌ Lỗi đột phá: ${error.message}`);
        }
    }
}; 