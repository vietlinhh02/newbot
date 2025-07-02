const { PermissionFlagsBits, ChannelType } = require('discord.js');
const { hasFlexiblePermission } = require('../../utils/permissions');
const productionStyle = require('../../utils/demoStyle');

module.exports = {
    name: 'move',
    aliases: ['vmove', 'voicemove'],
    description: 'Di chuyển người dùng sang voice channel khác',
    usage: '!move [@user] [#channel|channel_name] [reason]',
    examples: [
        '!move @John #general-voice',
        '!move @user Music Room Meeting time',
        '!vmove 123456789 #afk'
    ],
    permissions: 'helper',
    guildOnly: true,
    category: 'voice',
    
    async execute(message, args, client) {
        // Check permissions
        if (!await hasFlexiblePermission(message.member, 'move', this.permissions, message.guild.id)) {
            const result = productionStyle.createErrorEmbed(
                'Permission Denied',
                'Bạn cần quyền **Move Members** để di chuyển thành viên!'
            );
            return message.reply({ 
                embeds: [result.embed], 
                files: result.attachments 
            });
        }
        
        // Check bot permissions
        if (!message.guild.members.me.permissions.has(PermissionFlagsBits.MoveMembers)) {
            const result = productionStyle.createErrorEmbed(
                'Bot Missing Permissions',
                'Bot cần quyền **Move Members** để thực hiện lệnh này!'
            );
            return message.reply({ 
                embeds: [result.embed], 
                files: result.attachments 
            });
        }
        
        // Check arguments
        if (!args[0] || !args[1]) {
            const result = productionStyle.createWarningEmbed(
                'Missing Information',
                'Vui lòng cung cấp người dùng và kênh đích!',
                [
                    { name: 'Usage', value: '`!move [@user] [#channel] [reason]`' },
                    { name: 'Example', value: '`!move @John #general-voice`' }
                ]
            );
            return message.reply({ 
                embeds: [result.embed], 
                files: result.attachments 
            });
        }
        
        // Parse user
        let targetUser = null;
        let targetMember = null;
        const userMention = message.mentions.users.first();
        const userId = args[0].replace(/[<@!>]/g, '');
        
        if (userMention) {
            targetUser = userMention;
        } else {
            try {
                targetUser = await client.users.fetch(userId);
            } catch (error) {
                const result = productionStyle.createErrorEmbed(
                    'User Not Found',
                    'Vui lòng mention hoặc cung cấp ID hợp lệ!'
                );
                return message.reply({ 
                    embeds: [result.embed], 
                    files: result.attachments 
                });
            }
        }
        
        // Get member object
        try {
            targetMember = await message.guild.members.fetch(targetUser.id);
        } catch (error) {
            const result = productionStyle.createErrorEmbed(
                'Member Not Found',
                'Người dùng không ở trong server này!'
            );
            return message.reply({ 
                embeds: [result.embed], 
                files: result.attachments 
            });
        }
        
        // Check if user is in voice channel
        if (!targetMember.voice.channel) {
            const result = productionStyle.createWarningEmbed(
                'Not in Voice Channel',
                `${targetUser.tag} không ở trong voice channel nào!`
            );
            return message.reply({ 
                embeds: [result.embed], 
                files: result.attachments 
            });
        }
        
        // Parse target channel
        let targetChannel = null;
        const channelMention = message.mentions.channels.first();
        const channelQuery = args[1].toLowerCase().replace(/[<#>]/g, '');
        
        if (channelMention && (channelMention.type === ChannelType.GuildVoice || channelMention.type === ChannelType.GuildStageVoice)) {
            targetChannel = channelMention;
        } else {
            // Try to find voice channel by name or ID
            targetChannel = message.guild.channels.cache.find(channel => 
                (channel.type === ChannelType.GuildVoice || channel.type === ChannelType.GuildStageVoice) &&
                (channel.name.toLowerCase().includes(channelQuery) ||
                 channel.name.toLowerCase() === channelQuery ||
                 channel.id === channelQuery)
            );
        }
        
        if (!targetChannel) {
            const result = productionStyle.createErrorEmbed(
                'Voice Channel Not Found',
                'Vui lòng mention hoặc cung cấp tên voice channel hợp lệ!'
            );
            return message.reply({ 
                embeds: [result.embed], 
                files: result.attachments 
            });
        }
        
        // Check if user is already in target channel
        if (targetMember.voice.channel.id === targetChannel.id) {
            const result = productionStyle.createWarningEmbed(
                'Already in Target Channel',
                `${targetUser.tag} đã ở trong **${targetChannel.name}** rồi!`
            );
            return message.reply({ 
                embeds: [result.embed], 
                files: result.attachments 
            });
        }
        
        // Check bot permissions in target channel
        const botPermissions = targetChannel.permissionsFor(message.guild.members.me);
        if (!botPermissions.has(PermissionFlagsBits.Connect)) {
            const result = productionStyle.createErrorEmbed(
                'Bot Missing Channel Permissions',
                `Bot không có quyền **Connect** trong ${targetChannel}!`
            );
            return message.reply({ 
                embeds: [result.embed], 
                files: result.attachments 
            });
        }
        
        // Check user permissions in target channel
        const userPermissions = targetChannel.permissionsFor(targetMember);
        if (!userPermissions.has(PermissionFlagsBits.Connect)) {
            const result = productionStyle.createErrorEmbed(
                'User Missing Channel Permissions',
                `${targetUser.tag} không có quyền **Connect** trong ${targetChannel}!`
            );
            return message.reply({ 
                embeds: [result.embed], 
                files: result.attachments 
            });
        }
        
        // Get reason
        const reason = args.slice(2).join(' ') || 'Không có lý do được cung cấp';
        
        try {
            const oldChannel = targetMember.voice.channel;
            
            // Move user to target channel
            await targetMember.voice.setChannel(targetChannel, `Moved by ${message.author.tag}: ${reason}`);
            
            // Success message với production style
            const result = productionStyle.createSuccessEmbed(
                'VOICE MOVE',
                targetUser,
                message.author,
                reason,
                [
                    { name: 'From Channel', value: oldChannel.name, inline: true },
                    { name: 'To Channel', value: targetChannel.name, inline: true },
                    { name: 'Status', value: 'Successfully moved', inline: true }
                ]
            );
            
            await message.reply({ 
                embeds: [result.embed], 
                files: result.attachments 
            });
            
            // Log to moderation channel if configured
            try {
                const guildSettings = await client.prisma.guildSettings.findUnique({
                    where: { guildId: message.guild.id }
                });
                
                if (guildSettings?.logChannel) {
                    const logChannel = message.guild.channels.cache.get(guildSettings.logChannel);
                    
                    if (logChannel) {
                        const logResult = productionStyle.createSuccessEmbed(
                            'VOICE MOVE',
                            targetUser,
                            message.author,
                            reason,
                            [
                                { name: 'From Channel', value: oldChannel.name, inline: true },
                                { name: 'To Channel', value: targetChannel.name, inline: true },
                                { name: 'Command Channel', value: message.channel.toString(), inline: true },
                                { name: 'Time', value: `<t:${Math.floor(Date.now() / 1000)}:F>`, inline: true }
                            ]
                        );
                        
                        await logChannel.send({ 
                            embeds: [logResult.embed], 
                            files: logResult.attachments 
                        });
                    }
                }
            } catch (logError) {
                console.error('Lỗi khi gửi log:', logError);
            }
            
        } catch (error) {
            console.error('Lỗi khi di chuyển user:', error);
            
            let errorMessage = 'Đã xảy ra lỗi khi di chuyển người dùng!';
            
            if (error.code === 50013) {
                errorMessage = 'Bot không có đủ quyền để di chuyển người dùng này!';
            } else if (error.code === 40032) {
                errorMessage = 'Voice channel đã đầy!';
            }
            
            const result = productionStyle.createErrorEmbed(
                'Voice Move Failed',
                errorMessage,
                error.message
            );
            
            await message.reply({ 
                embeds: [result.embed], 
                files: result.attachments 
            });
        }
    }
}; 