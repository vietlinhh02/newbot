const embedFactory = require('../../utils/embeds');

module.exports = {
    name: 'membercount',
    aliases: ['members', 'mc', 'count'],
    description: 'Hiển thị số lượng thành viên trong server',
    usage: '!membercount',
    examples: ['!membercount', '!members', '!mc'],
    permissions: 'member',
    guildOnly: true,
    category: 'management',
    
    async execute(message, args, client) {
        // Initialize embed factory
        embedFactory.setClient(client);
        
        try {
            const guild = message.guild;
            await guild.fetch(); // Ensure we have fresh data
            
            // Get member statistics
            const totalMembers = guild.memberCount;
            const members = guild.members.cache;
            
            // Count by status
            const onlineMembers = members.filter(m => m.presence?.status === 'online').size;
            const idleMembers = members.filter(m => m.presence?.status === 'idle').size;
            const dndMembers = members.filter(m => m.presence?.status === 'dnd').size;
            const offlineMembers = members.filter(m => !m.presence || m.presence?.status === 'offline').size;
            
            // Count bots vs humans
            const bots = members.filter(m => m.user.bot).size;
            const humans = totalMembers - bots;
            
            // Count boosters
            const boosters = members.filter(m => m.premiumSince).size;
            
            // Simple response for basic usage
            if (!args[0] || args[0] !== 'detailed') {
                return message.reply(`👥 **${guild.name}** có **${totalMembers.toLocaleString()}** thành viên (**${humans.toLocaleString()}** người, **${bots}** bot)`);
            }
            
            // Detailed embed response
            const embed = new EmbedBuilder()
                .setTitle(`👥 Thống kê thành viên: ${guild.name}`)
                .setColor('#5865F2')
                .setThumbnail(guild.iconURL({ dynamic: true }))
                .addFields([
                    {
                        name: '📊 Tổng quan',
                        value: [
                            `**Tổng cộng:** ${totalMembers.toLocaleString()}`,
                            `**Người dùng:** ${humans.toLocaleString()}`,
                            `**Bot:** ${bots}`
                        ].join('\n'),
                        inline: true
                    },
                    {
                        name: '🟢 Trạng thái online',
                        value: [
                            `🟢 **Online:** ${onlineMembers}`,
                            `🟡 **Idle:** ${idleMembers}`, 
                            `🔴 **Bận:** ${dndMembers}`,
                            `⚫ **Offline:** ${offlineMembers}`
                        ].join('\n'),
                        inline: true
                    }
                ]);
            
            // Add booster info if any
            if (boosters > 0) {
                embed.addFields([{
                    name: '💎 Nitro Boosters',
                    value: `**${boosters}** thành viên đang boost server`,
                    inline: true
                }]);
            }
            
            // Add join rate info (approximate)
            const now = Date.now();
            const dayAgo = now - (24 * 60 * 60 * 1000);
            const weekAgo = now - (7 * 24 * 60 * 60 * 1000);
            
            const joinedToday = members.filter(m => m.joinedTimestamp > dayAgo).size;
            const joinedThisWeek = members.filter(m => m.joinedTimestamp > weekAgo).size;
            
            if (joinedToday > 0 || joinedThisWeek > 0) {
                embed.addFields([{
                    name: '📈 Tham gia gần đây',
                    value: [
                        `**Hôm nay:** ${joinedToday}`,
                        `**Tuần này:** ${joinedThisWeek}`
                    ].join('\n'),
                    inline: true
                }]);
            }
            
            embed.setTimestamp()
                .setFooter({ 
                    text: `Server ID: ${guild.id}`, 
                    iconURL: guild.iconURL({ dynamic: true }) 
                });
            
            await message.reply({ embeds: [embed] });
            
        } catch (error) {
            console.error('Lỗi khi đếm thành viên:', error);
            await message.reply('❌ **Lỗi!** Không thể lấy thống kê thành viên!');
        }
    }
}; 