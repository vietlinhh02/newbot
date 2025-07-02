const { ChannelType } = require('discord.js');
const embedFactory = require('../../utils/embeds');
const logger = require('../../utils/logger');

module.exports = {
    name: 'channellist',
    aliases: ['channels', 'listchannels'],
    description: 'Hiển thị danh sách channel trong server',
    usage: '!channellist [loại]',
    examples: [
        '!channellist',
        '!channellist text',
        '!channellist voice'
    ],
    permissions: 'member',
    guildOnly: true,
    category: 'management',
    
    async execute(message, args, client) {
        // Initialize embed factory
        embedFactory.setClient(client);
        
        try {
            const guild = message.guild;
            const filterType = args[0]?.toLowerCase();
            
            // Filter channels by type
            let channels = Array.from(guild.channels.cache.values());
            let filterTitle = 'Tất cả Channels';
            
            if (filterType) {
                switch (filterType) {
                    case 'text':
                        channels = channels.filter(ch => ch.type === ChannelType.GuildText);
                        filterTitle = 'Text Channels';
                        break;
                    case 'voice':
                        channels = channels.filter(ch => ch.type === ChannelType.GuildVoice);
                        filterTitle = 'Voice Channels';
                        break;
                    case 'category':
                        channels = channels.filter(ch => ch.type === ChannelType.GuildCategory);
                        filterTitle = 'Category Channels';
                        break;
                }
            }
            
            // Sort by position
            channels.sort((a, b) => a.position - b.position);
            
            // Limit to 30 channels to prevent lag
            if (channels.length > 30) {
                channels = channels.slice(0, 30);
            }
            
            if (channels.length === 0) {
                const embed = embedFactory.warning(
                    'Không có channel!',
                    `Không tìm thấy channel loại "${filterType}".`,
                    [],
                    message.author
                );
                return message.reply({ embeds: [embed] });
            }
            
            // Create simple channel list
            const channelList = channels.map(ch => {
                let icon = '#';
                if (ch.type === ChannelType.GuildVoice) icon = '🔊';
                if (ch.type === ChannelType.GuildCategory) icon = '📁';
                return `${icon} ${ch.name}`;
            }).join('\n');
            
            const embed = embedFactory.info(
                `${filterTitle} (${channels.length})`,
                channelList.length > 2000 ? channelList.substring(0, 2000) + '\n...' : channelList,
                [],
                message.author
            );
            
            await message.reply({ embeds: [embed] });
            
        } catch (error) {
            logger.error('Channellist command error', error);
            const embed = embedFactory.error(
                'Lỗi hệ thống!',
                'Không thể lấy danh sách channels.',
                [],
                message.author
            );
            await message.reply({ embeds: [embed] });
        }
    }
}; 