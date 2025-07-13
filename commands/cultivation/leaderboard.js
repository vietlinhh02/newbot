const { hasFlexiblePermission } = require('../../utils/permissions');
const { CULTIVATION_LEVELS } = require('../../utils/cultivationData');

module.exports = {
    name: 'leaderboard',
    aliases: ['lb', 'top', 'rank_top', 'bang_xep_hang'],
    description: 'Xem bảng xếp hạng tu luyện server',
    usage: '!leaderboard [exp|level]',
    examples: [
        '!leaderboard',
        '!lb exp',
        '!lb level',
        '!top'
    ],
    permissions: 'everyone',
    guildOnly: true,
    category: 'cultivation',

    async execute(message, args, client) {
        try {
            const guildId = message.guild.id;
            const sortBy = args[0]?.toLowerCase() || 'exp'; // 'exp' hoặc 'level'

            // Get all cultivation users globally
            const users = await client.prisma.cultivationUser.findMany({
                orderBy: sortBy === 'level' 
                    ? [{ currentLevel: 'desc' }, { exp: 'desc' }]
                    : { exp: 'desc' },
                take: 15 // Top 15 users
            });

            if (users.length === 0) {
                return message.reply(`❌ **Chưa có tu sĩ nào** bắt đầu tu luyện! Gửi tin nhắn trong server để bắt đầu hành trình tu luyện.`);
            }

            // Sort users by level index for level leaderboard
            if (sortBy === 'level') {
                users.sort((a, b) => {
                    const aIndex = CULTIVATION_LEVELS.findIndex(level => level.name === a.currentLevel);
                    const bIndex = CULTIVATION_LEVELS.findIndex(level => level.name === b.currentLevel);
                    
                    if (aIndex !== bIndex) {
                        return bIndex - aIndex; // Higher level first
                    }
                    return b.exp - a.exp; // Same level, higher exp first
                });
            }

            // Get Discord users for display
            const leaderboardData = [];
            for (let i = 0; i < users.length; i++) {
                const user = users[i];
                try {
                    const discordUser = await client.users.fetch(user.userId);
                    leaderboardData.push({
                        ...user,
                        discordUser: discordUser,
                        rank: i + 1
                    });
                } catch (error) {
                    // Skip users that can't be fetched
                    continue;
                }
            }

            // Find current user's rank
            const currentUserRank = leaderboardData.findIndex(user => user.userId === message.author.id);
            
            // Create leaderboard text
            let leaderboardText = `====== **🏆 BẢNG XẾP HẠNG TU LUYỆN TOÀN CẦU** ======\n`;
            leaderboardText += `**Phạm vi:** Cross-Server Global\n`;
            leaderboardText += `**Xếp theo:** ${sortBy === 'level' ? 'Tu Vi' : 'EXP'}\n\n`;

            // Top 10 users
            const topUsers = leaderboardData.slice(0, 10);
            for (let i = 0; i < topUsers.length; i++) {
                const user = topUsers[i];
                const medal = user.rank === 1 ? '🥇' : user.rank === 2 ? '🥈' : user.rank === 3 ? '🥉' : '🏅';
                const levelIndex = CULTIVATION_LEVELS.findIndex(level => level.name === user.currentLevel);
                
                if (sortBy === 'level') {
                    leaderboardText += `${medal} **#${user.rank}** ${user.discordUser.username}\n`;
                    leaderboardText += `    📊 ${user.currentLevel} | ⚡ ${user.exp} EXP\n`;
                } else {
                    leaderboardText += `${medal} **#${user.rank}** ${user.discordUser.username}\n`;
                    leaderboardText += `    ⚡ ${user.exp} EXP | 📊 ${user.currentLevel}\n`;
                }
                
                if (i < topUsers.length - 1) leaderboardText += '\n';
            }

            // Show current user's rank if they're not in top 10
            if (currentUserRank >= 10) {
                const currentUser = leaderboardData[currentUserRank];
                leaderboardText += `\n\n**👤 VỊ TRÍ CỦA BẠN:**\n`;
                leaderboardText += `🏅 **#${currentUser.rank}** ${currentUser.discordUser.username}\n`;
                leaderboardText += `📊 ${currentUser.currentLevel} | ⚡ ${currentUser.exp} EXP`;
            } else if (currentUserRank >= 0) {
                leaderboardText += `\n\n**👤 VỊ TRÍ CỦA BẠN:** #${currentUserRank + 1} trong top!`;
            }

            // Server stats
            const totalUsers = users.length;
            const totalExp = users.reduce((sum, user) => sum + user.exp, 0);
            const avgExp = Math.floor(totalExp / totalUsers);
            const topLevel = users[0]?.currentLevel || 'Phàm Nhân';

            leaderboardText += `\n\n**📊 THỐNG KÊ SERVER:**\n`;
            leaderboardText += `Tổng tu sĩ: **${totalUsers}** | Trung bình EXP: **${avgExp}**\n`;
            leaderboardText += `Tu Vi cao nhất: **${topLevel}** | Tổng EXP: **${totalExp.toLocaleString()}**\n`;
            leaderboardText += `\n💡 *Dùng \`!lb exp\` hoặc \`!lb level\` để đổi cách sắp xếp*`;

            await message.reply(leaderboardText);

        } catch (error) {
            console.error('Error in leaderboard command:', error);
            await message.reply(`❌ Lỗi leaderboard: ${error.message}`);
        }
    }
}; 