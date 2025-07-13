const { getLevelByName, getNextLevel, canBreakthrough, rollBreakthrough } = require('../../utils/cultivationData');

module.exports = {
    name: 'tuvi',
    aliases: ['rank', 'tu_luyen', 'cultivation', 'level'],
    description: 'Xem thông tin tu luyện và thử đột phá',
    usage: '!tuvi [user] hoặc !tuvi breakthrough',
    examples: [
        '!tuvi',
        '!tuvi @user',
        '!tuvi breakthrough',
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

            // Get tu vi data
            const currentTuViData = getLevelByName(cultivationUser.currentLevel);
            const nextTuViData = getNextLevel(cultivationUser.currentLevel);

            // Build simple text response
            let tuViText = `🧘 **${targetUser.username}** | **${cultivationUser.currentLevel}**\n`;

            // EXP info với công thức mới (1 tin nhắn = 1 EXP, 1 phút = 5 EXP)
            if (cultivationUser.messageCount !== undefined) {
                const messageCount = cultivationUser.messageCount || 0;
                const voiceTime = cultivationUser.voiceTime || 0;
                const voiceMinutes = Math.floor(voiceTime / 60);
                
                tuViText += `⚡ **EXP:** ${cultivationUser.exp} *(${messageCount} tin nhắn + ${voiceMinutes} phút voice`;
                if (roleBonus > 0) {
                    tuViText += ` + bonus ${roleBonus}%`;
                }
                tuViText += `)*\n`;
            } else {
                tuViText += `⚡ **EXP:** ${cultivationUser.exp} *(đang nâng cấp hệ thống...)*\n`;
            }

            if (currentTuViData && nextTuViData) {
                const expNeeded = currentTuViData.exp;
                const progress = Math.min(Math.floor((cultivationUser.exp / expNeeded) * 100), 100);
                const expRemaining = Math.max(expNeeded - cultivationUser.exp, 0);
                
                tuViText += `📊 **Progress:** ${cultivationUser.exp}/${expNeeded} **(${progress}%)**\n`;
                tuViText += `⬆️ **Tu Vi tiếp theo:** ${nextTuViData.name}\n`;
                tuViText += `🎲 **Tỉ lệ đột phá:** ${currentTuViData.breakRate}%\n`;
                
                // Penalty warning
                if (currentTuViData.expPenalty > 0 || currentTuViData.itemPenalty > 0) {
                    tuViText += `⚠️ **Penalty nếu thất bại:** ${currentTuViData.expPenalty}% EXP\n`;
                }
                
                // Breakthrough status
                const canBreak = canBreakthrough(cultivationUser.currentLevel, cultivationUser.exp);
                if (canBreak) {
                    tuViText += `\n🌟 **READY TO BREAKTHROUGH!**\n`;
                    tuViText += `💥 Dùng \`!dotpha\` để thử đột phá!`;
                } else {
                    tuViText += `\n💡 **Cách nhận EXP:**\n`;
                    if (cultivationUser.messageCount !== undefined) {
                        tuViText += `• **1 tin nhắn** = 1 EXP\n`;
                        tuViText += `• **1 phút voice** = 5 EXP\n`;
                        tuViText += `• **Bonus từ VIP roles** (có thể cộng dồn)\n`;
                        
                        if (expRemaining <= 50) {
                            tuViText += `⏰ Cần thêm **${expRemaining} EXP** để đột phá!`;
                        }
                    } else {
                        tuViText += `• Chat và voice để nhận EXP\n`;
                        tuViText += `• Hệ thống đang được nâng cấp`;
                    }
                }

            } else if (!nextTuViData) {
                tuViText += `\n🏆 **ĐÃ ĐẠT TU VI TỐI ĐA!**\n`;
                tuViText += `🎉 Chúc mừng bạn đã hoàn thành hành trình tu luyện!`;
            } else {
                tuViText += `\n❓ **Lỗi dữ liệu tu vi** - Vui lòng báo admin!`;
            }

            await message.reply(tuViText);

        } catch (error) {
            console.error('Error in tuvi command:', error);
            await message.reply(`❌ Lỗi tu vi: ${error.message}`);
        }
    }
}; 