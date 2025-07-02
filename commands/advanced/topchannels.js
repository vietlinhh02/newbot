const embedFactory = require('../../utils/embeds');
const { hasFlexiblePermission } = require('../../utils/permissions');

module.exports = {
    name: 'topchannels',
    aliases: ['topchannel', 'channelstats'],
    description: 'Xem top channels hoạt động',
    usage: '!topchannels [limit]',
    examples: [
        '!topchannels',
        '!topchannels 10'
    ],
    permissions: 'admin',
    guildOnly: true,
    category: 'advanced',

    async execute(message, args, client) {
        // Initialize embed factory
        embedFactory.setClient(client);
        
            // Check permissions
            if (!await hasFlexiblePermission(message.member, 'topchannels', this.permissions, message.guild.id)) {
            const embed = embedFactory.error('Không có quyền!', 'Cần quyền **Administrator** để xem thống kê này.', null, message.author);
                return message.reply({ embeds: [embed] });
            }

        try {
            const limit = Math.min(parseInt(args[0]) || 10, 15); // Limit to 15 to prevent lag
            
            // Simple activity check - count messages in recent history
            const channels = message.guild.channels.cache
                .filter(channel => channel.isTextBased() && channel.type !== 12) // No threads
                .first(20); // Only check first 20 channels
            
            const channelStats = [];
            
            for (const channel of channels) {
                try {
                    const messages = await channel.messages.fetch({ limit: 50 }); // Reduced from 100
                    const messageCount = messages.size;
                    const uniqueUsers = new Set(messages.map(m => m.author.id)).size;
                    
                    channelStats.push({
                        channel,
                        messageCount,
                        uniqueUsers,
                        score: messageCount + (uniqueUsers * 2) // Simple scoring
                    });
                } catch (error) {
                    // Skip channels we can't access
                    continue;
                }
            }

            // Sort by score and limit results
            channelStats.sort((a, b) => b.score - a.score);
            const topChannels = channelStats.slice(0, limit);

            if (topChannels.length === 0) {
                const embed = embedFactory.warning(
                    'Không có dữ liệu!',
                    'Không thể thu thập thống kê channels.',
                    [],
                    message.author
                );
                return message.reply({ embeds: [embed] });
            }

            // Create simple results
            const channelList = topChannels.map((data, index) => {
                const rank = index + 1;
                return `**${rank}.** ${data.channel} - ${data.messageCount} tin nhắn`;
            }).join('\n');
            
            const embed = embedFactory.info(
                `Top ${limit} Channels hoạt động`,
                channelList,
                [],
                message.author
            );

            await message.reply({ embeds: [embed] });

        } catch (error) {
            console.error('Top channels error:', error);
            const embed = embedFactory.error(
                'Lỗi hệ thống!',
                'Không thể lấy thống kê channels.',
                [],
                message.author
            );
            await message.reply({ embeds: [embed] });
        }
    }
};