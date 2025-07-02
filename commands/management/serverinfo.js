const { ChannelType } = require('discord.js');
const productionStyle = require('../../utils/demoStyle');

module.exports = {
    name: 'serverinfo',
    aliases: ['server', 'guildinfo'],
    description: 'Hiển thị thông tin chi tiết về server',
    usage: '!serverinfo',
    examples: ['!serverinfo', '!server'],
    permissions: 'member',
    guildOnly: true,
    category: 'management',
    
    async execute(message, args, client) {
        const guild = message.guild;
        
        try {
            // Fetch guild to get all data
            await guild.fetch();
            
            // Gather comprehensive server information
            const fields = [];
            
            // Basic server info
            const owner = await guild.fetchOwner();
            const createdAt = Math.floor(guild.createdTimestamp / 1000);
            
            fields.push({
                name: 'Basic Information',
                value: [
                    `Server Name: ${guild.name}`,
                    `Server ID: \`${guild.id}\``,
                    `Owner: ${owner.user.tag}`,
                    `Created: <t:${createdAt}:F>`,
                    `Member Count: \`${guild.memberCount}\``
                ].join('\n'),
                inline: false
            });
            
            // Channel information
            const channels = guild.channels.cache;
            const textChannels = channels.filter(c => c.type === ChannelType.GuildText).size;
            const voiceChannels = channels.filter(c => c.type === ChannelType.GuildVoice).size;
            const categories = channels.filter(c => c.type === ChannelType.GuildCategory).size;
            const newsChannels = channels.filter(c => c.type === ChannelType.GuildAnnouncement).size;
            const stageChannels = channels.filter(c => c.type === ChannelType.GuildStageVoice).size;
            
            fields.push({
                name: 'Channels & Categories',
                value: [
                    `Text Channels: \`${textChannels}\``,
                    `Voice Channels: \`${voiceChannels}\``,
                    `Categories: \`${categories}\``,
                    `News Channels: \`${newsChannels}\``,
                    `Stage Channels: \`${stageChannels}\``
                ].join('\n'),
                inline: true
            });
            
            // Security and verification info
            const verificationLevels = {
                0: 'None',
                1: 'Low',
                2: 'Medium', 
                3: 'High',
                4: 'Very High'
            };
            
            const explicitContentFilters = {
                0: 'Disabled',
                1: 'Members without roles',
                2: 'All members'
            };
            
            // Add security section
            fields.push({
                name: 'Security & Roles',
                value: [
                    `Roles: \`${guild.roles.cache.size - 1}\``,
                    `Verification Level: \`${verificationLevels[guild.verificationLevel]}\``,
                    `Content Filter: \`${explicitContentFilters[guild.explicitContentFilter]}\``
                ].join('\n'),
                inline: true
            });
            
            // Server boost information
            if (guild.premiumSubscriptionCount > 0) {
                fields.push({
                    name: 'Nitro Boost Information',
                    value: [
                        `Boost Level: \`${guild.premiumTier}\``,
                        `Boost Count: \`${guild.premiumSubscriptionCount}\``,
                        `Boosters: \`${guild.premiumSubscriptionCount}\``
                    ].join('\n'),
                    inline: true
                });
            }
            
            const result = productionStyle.createSuccessEmbed(
                'SERVER INFO',
                { tag: guild.name },
                message.author,
                `Comprehensive information for ${guild.name}`,
                fields
            );
            
            await message.reply({ 
                embeds: [result.embed], 
                files: result.attachments 
            });
            
        } catch (error) {
            console.error('Lỗi khi lấy thông tin server:', error);
            
            const result = productionStyle.createErrorEmbed(
                'Server Info Error',
                'Không thể lấy thông tin server!',
                error.message
            );
            
            await message.reply({ 
                embeds: [result.embed], 
                files: result.attachments 
            });
        }
    }
}; 