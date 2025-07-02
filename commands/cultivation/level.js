const { getLevelByName, getNextLevel, canBreakthrough, rollBreakthrough } = require('../../utils/cultivationData');

module.exports = {
    name: 'level',
    aliases: ['rank', 'tu_luyen', 'cultivation'],
    description: 'Xem thông tin tu luyện và thử đột phá',
    usage: '!level [user] hoặc !level breakthrough',
    examples: [
        '!level',
        '!level @user',
        '!level breakthrough',
        '!rank breakthrough'
    ],
    permissions: 'everyone',
    guildOnly: true,
    category: 'cultivation',

    async execute(message, args, client) {
        try {
            const userId = message.author.id;
            const guildId = message.guild.id;

            // Check target user
            let targetUser = message.author;
            if (args[0]) {
                const userMention = message.mentions.users.first();
                const userIdArg = args[0].replace(/[<@!>]/g, '');
                
                if (userMention) {
                    targetUser = userMention;
                } else {
                    try {
                        targetUser = await client.users.fetch(userIdArg);
                    } catch (error) {
                        return message.reply('❌ Không tìm thấy user này!');
                    }
                }
            }

            const targetUserId = targetUser.id;

            // Get cultivation user data
            const cultivationUser = await client.prisma.cultivationUser.findUnique({
                where: {
                    userId: targetUserId
                }
            });

            if (!cultivationUser) {
                return message.reply(`❌ **${targetUser.username}** chưa bắt đầu tu luyện! Gửi tin nhắn trong server để bắt đầu nhận EXP.`);
            }

            // Calculate VIP role bonus
            let roleBonus = 0;
            try {
                const member = await message.guild.members.fetch(targetUserId);
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
                console.log('Could not fetch member for role bonus calculation');
            }

            // Get level data
            const currentLevelData = getLevelByName(cultivationUser.currentLevel);
            const nextLevelData = getNextLevel(cultivationUser.currentLevel);

            // Build simple text response
            let levelText = `🧘 **${targetUser.username}** | **${cultivationUser.currentLevel}**\n`;

            // EXP info với công thức mới (1 tin nhắn = 1 EXP, 1 phút = 5 EXP)
            if (cultivationUser.messageCount !== undefined) {
                const messageCount = cultivationUser.messageCount || 0;
                const voiceTime = cultivationUser.voiceTime || 0;
                const voiceMinutes = Math.floor(voiceTime / 60);
                
                levelText += `⚡ **EXP:** ${cultivationUser.exp} *(${messageCount} tin nhắn + ${voiceMinutes} phút voice`;
                if (roleBonus > 0) {
                    levelText += ` + bonus ${roleBonus}%`;
                }
                levelText += `)*\n`;
            } else {
                levelText += `⚡ **EXP:** ${cultivationUser.exp} *(đang nâng cấp hệ thống...)*\n`;
            }

            if (currentLevelData && nextLevelData) {
                const expNeeded = currentLevelData.exp;
                const progress = Math.min(Math.floor((cultivationUser.exp / expNeeded) * 100), 100);
                const expRemaining = Math.max(expNeeded - cultivationUser.exp, 0);
                
                levelText += `📊 **Progress:** ${cultivationUser.exp}/${expNeeded} **(${progress}%)**\n`;
                levelText += `⬆️ **Level tiếp theo:** ${nextLevelData.name}\n`;
                levelText += `🎲 **Tỉ lệ đột phá:** ${currentLevelData.breakRate}%\n`;
                
                // Penalty warning
                if (currentLevelData.expPenalty > 0 || currentLevelData.itemPenalty > 0) {
                    levelText += `⚠️ **Penalty nếu thất bại:** ${currentLevelData.expPenalty}% EXP + ${currentLevelData.itemPenalty} vật phẩm\n`;
                }
                
                // Breakthrough status
                const canBreak = canBreakthrough(cultivationUser.currentLevel, cultivationUser.exp);
                if (canBreak) {
                    levelText += `\n🌟 **READY TO BREAKTHROUGH!**\n`;
                    levelText += `💥 Dùng \`!breakthrough\` để thử đột phá!`;
                } else {
                    levelText += `\n💡 **Cách nhận EXP:**\n`;
                    if (cultivationUser.messageCount !== undefined) {
                        levelText += `• **1 tin nhắn** = 1 EXP\n`;
                        levelText += `• **1 phút voice** = 5 EXP\n`;
                        levelText += `• **Bonus từ VIP roles** (có thể cộng dồn)\n`;
                        
                        if (expRemaining <= 50) {
                            levelText += `⏰ Cần thêm **${expRemaining} EXP** để đột phá!`;
                        }
                    } else {
                        levelText += `• Chat và voice để nhận EXP\n`;
                        levelText += `• Hệ thống đang được nâng cấp`;
                    }
                }

            } else if (!nextLevelData) {
                levelText += `\n🏆 **ĐÃ ĐẠT LEVEL TỐI ĐA!**\n`;
                levelText += `🎉 Chúc mừng bạn đã hoàn thành hành trình tu luyện!`;
            } else {
                levelText += `\n❓ **Lỗi dữ liệu level** - Vui lòng báo admin!`;
            }

            await message.reply(levelText);

        } catch (error) {
            console.error('Error in level command:', error);
            await message.reply(`❌ Lỗi level: ${error.message}`);
        }
    }
}; 