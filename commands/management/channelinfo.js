const { EmbedBuilder, ChannelType } = require('discord.js');
const embedFactory = require('../../utils/embeds');

module.exports = {
    name: 'channelinfo',
    aliases: ['channel', 'ci'],
    description: 'Hiển thị thông tin chi tiết về kênh',
    usage: '!channelinfo [#channel|channel_id]',
    examples: [
        '!channelinfo',
        '!channelinfo #general',
        '!channel 123456789',
        '!ci #announcements'
    ],
    permissions: 'member',
    guildOnly: true,
    category: 'management',
    
    async execute(message, args, client) {
        // Initialize embed factory
        embedFactory.setClient(client);
        
        try {
            let targetChannel = message.channel;
            
            // If channel provided, try to find it
            if (args[0]) {
                const channelMention = message.mentions.channels.first();
                const channelId = args[0].replace(/[<#>]/g, '');
                
                if (channelMention) {
                    targetChannel = channelMention;
                } else {
                    try {
                        targetChannel = await message.guild.channels.fetch(channelId);
                    } catch (error) {
                        const embed = embedFactory.error('Không tìm thấy kênh', 'Kênh không tồn tại hoặc không hợp lệ!', null, message.author);
            return message.reply({ embeds: [embed] });
                    }
                }
            }
            
            // Channel creation date
            const createdAt = Math.floor(targetChannel.createdTimestamp / 1000);
            
            // Channel type mapping
            const channelTypes = {
                [ChannelType.GuildText]: '💬 Text Channel',
                [ChannelType.GuildVoice]: '🔊 Voice Channel',
                [ChannelType.GuildCategory]: '📁 Category',
                [ChannelType.GuildAnnouncement]: '📢 Announcement Channel',
                [ChannelType.GuildStageVoice]: '🎤 Stage Channel',
                [ChannelType.GuildForum]: '💭 Forum Channel',
                [ChannelType.PublicThread]: '🧵 Public Thread',
                [ChannelType.PrivateThread]: '🔒 Private Thread',
                [ChannelType.AnnouncementThread]: '📢 Announcement Thread'
            };
            
            const embed = new EmbedBuilder()
                .setTitle(`📺 Thông tin kênh: ${targetChannel.name}`)
                .setColor('#5865F2')
                .addFields([
                    {
                        name: '🆔 Thông tin chung',
                        value: [
                            `**Tên:** ${targetChannel.name}`,
                            `**ID:** \`${targetChannel.id}\``,
                            `**Loại:** ${channelTypes[targetChannel.type] || 'Unknown'}`,
                            `**Tạo lúc:** <t:${createdAt}:F>`,
                            `**Position:** ${targetChannel.position || 'N/A'}`
                        ].join('\n'),
                        inline: true
                    }
                ]);
            
            // Add text channel specific info
            if (targetChannel.isTextBased()) {
                const textInfo = [];
                
                if (targetChannel.topic) {
                    textInfo.push(`**Topic:** ${targetChannel.topic.substring(0, 100)}${targetChannel.topic.length > 100 ? '...' : ''}`);
                }
                
                if (targetChannel.rateLimitPerUser > 0) {
                    textInfo.push(`**Slowmode:** ${targetChannel.rateLimitPerUser}s`);
                }
                
                if (targetChannel.nsfw !== undefined) {
                    textInfo.push(`**NSFW:** ${targetChannel.nsfw ? 'Có' : 'Không'}`);
                }
                
                if (textInfo.length > 0) {
                    embed.addFields([{
                        name: '💬 Text Channel Info',
                        value: textInfo.join('\n'),
                        inline: true
                    }]);
                }
            }
            
            // Add voice channel specific info
            if (targetChannel.type === ChannelType.GuildVoice || targetChannel.type === ChannelType.GuildStageVoice) {
                const voiceInfo = [];
                
                if (targetChannel.userLimit > 0) {
                    voiceInfo.push(`**User Limit:** ${targetChannel.userLimit}`);
                } else {
                    voiceInfo.push(`**User Limit:** Không giới hạn`);
                }
                
                if (targetChannel.bitrate) {
                    voiceInfo.push(`**Bitrate:** ${targetChannel.bitrate / 1000}kbps`);
                }
                
                if (targetChannel.rtcRegion) {
                    voiceInfo.push(`**Region:** ${targetChannel.rtcRegion}`);
                } else {
                    voiceInfo.push(`**Region:** Tự động`);
                }
                
                if (targetChannel.members) {
                    voiceInfo.push(`**Đang kết nối:** ${targetChannel.members.size} người`);
                }
                
                embed.addFields([{
                    name: '🔊 Voice Channel Info',
                    value: voiceInfo.join('\n'),
                    inline: true
                }]);
            }
            
            // Add category info
            if (targetChannel.parent) {
                embed.addFields([{
                    name: '📁 Category',
                    value: `**${targetChannel.parent.name}**\n\`${targetChannel.parent.id}\``,
                    inline: true
                }]);
            }
            
            // Add thread info if it's a thread
            if (targetChannel.isThread()) {
                const threadInfo = [];
                
                if (targetChannel.ownerId) {
                    threadInfo.push(`**Tạo bởi:** <@${targetChannel.ownerId}>`);
                }
                
                if (targetChannel.memberCount) {
                    threadInfo.push(`**Thành viên:** ${targetChannel.memberCount}`);
                }
                
                if (targetChannel.messageCount) {
                    threadInfo.push(`**Tin nhắn:** ${targetChannel.messageCount}`);
                }
                
                threadInfo.push(`**Archived:** ${targetChannel.archived ? 'Có' : 'Không'}`);
                threadInfo.push(`**Locked:** ${targetChannel.locked ? 'Có' : 'Không'}`);
                
                embed.addFields([{
                    name: '🧵 Thread Info',
                    value: threadInfo.join('\n'),
                    inline: true
                }]);
            }
            
            // Add permission overwrites info
            const overwrites = targetChannel.permissionOverwrites.cache;
            if (overwrites.size > 0) {
                const overwritesList = overwrites.first(5).map(overwrite => {
                    const target = overwrite.type === 0 ? 
                        message.guild.roles.cache.get(overwrite.id) : 
                        message.guild.members.cache.get(overwrite.id);
                    
                    if (!target) return null;
                    
                    const allowCount = overwrite.allow.toArray().length;
                    const denyCount = overwrite.deny.toArray().length;
                    
                    return `**${target.name || target.user.tag}:** +${allowCount} -${denyCount}`;
                }).filter(Boolean);
                
                if (overwritesList.length > 0) {
                    embed.addFields([{
                        name: `🔐 Permission Overwrites (${overwrites.size})`,
                        value: overwritesList.join('\n') + (overwrites.size > 5 ? `\n*và ${overwrites.size - 5} cái khác...*` : ''),
                        inline: false
                    }]);
                }
            }
            
            // Add some recent activity for text channels
            if (targetChannel.isTextBased() && !targetChannel.isThread()) {
                try {
                    const lastMessage = await targetChannel.messages.fetch({ limit: 1 });
                    if (lastMessage.size > 0) {
                        const msg = lastMessage.first();
                        const lastActivity = Math.floor(msg.createdTimestamp / 1000);
                        
                        embed.addFields([{
                            name: '💭 Hoạt động gần nhất',
                            value: `**Tin nhắn cuối:** <t:${lastActivity}:R>\n**Bởi:** ${msg.author.tag}`,
                            inline: true
                        }]);
                    }
                } catch (error) {
                    // Can't read messages, skip this
                }
            }
            
            embed.setTimestamp()
                .setFooter({ 
                    text: `Channel ID: ${targetChannel.id}`, 
                    iconURL: message.guild.iconURL({ dynamic: true }) 
                });
            
            await message.reply({ embeds: [embed] });
            
        } catch (error) {
            console.error('Lỗi khi lấy thông tin channel:', error);
            await message.reply('❌ **Lỗi!** Không thể lấy thông tin kênh!');
        }
    }
}; 