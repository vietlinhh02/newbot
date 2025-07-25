const { PermissionFlagsBits } = require('discord.js');
const { hasFlexiblePermission } = require('../../utils/permissions');
const productionStyle = require('../../utils/demoStyle');

module.exports = {
    name: 'vmute',
    aliases: ['voicemute', 'micmute'],
    description: 'Tắt mic của người dùng trong voice channel',
    usage: '!vmute [@user] [reason]',
    examples: [
        '!vmute @John Spam mic',
        '!voicemute @user Inappropriate content',
        '!micmute 123456789 Annoying sounds'
    ],
    permissions: 'helper',
    guildOnly: true,
    category: 'voice',
    
    async execute(message, args, client) {
        // Check permissions
        if (!await hasFlexiblePermission(message.member, 'vmute', this.permissions, message.guild.id)) {
            const result = productionStyle.createErrorEmbed(
                'Permission Denied',
                'Bạn cần quyền **Mute Members** để mute voice!'
            );
            return message.reply({ 
                embeds: [result.embed], 
                files: result.attachments 
            });
        }
        
        // Check bot permissions
        if (!message.guild.members.me.permissions.has(PermissionFlagsBits.MuteMembers)) {
            const result = productionStyle.createErrorEmbed(
                'Bot Missing Permissions',
                'Bot cần quyền **Mute Members** để thực hiện lệnh này!'
            );
            return message.reply({ 
                embeds: [result.embed], 
                files: result.attachments 
            });
        }
        
        // Check arguments
        if (!args[0]) {
            const result = productionStyle.createWarningEmbed(
                'Missing Information',
                'Vui lòng cung cấp người dùng cần mute!',
                [
                    { name: 'Usage', value: '`!vmute [@user] [reason]`' },
                    { name: 'Example', value: '`!vmute @John Spam mic`' }
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
        
        // Check if user is already voice muted
        if (targetMember.voice.mute) {
            const result = productionStyle.createWarningEmbed(
                'Already Voice Muted',
                `${targetUser.tag} đã bị mute voice rồi!`
            );
            return message.reply({ 
                embeds: [result.embed], 
                files: result.attachments 
            });
        }
        
        // Check if user is bot
        if (targetUser.bot) {
            const result = productionStyle.createErrorEmbed(
                'Invalid Target',
                'Không thể mute voice bot!'
            );
            return message.reply({ 
                embeds: [result.embed], 
                files: result.attachments 
            });
        }
        
        // Check role hierarchy
        if (targetMember.roles.highest.position >= message.member.roles.highest.position && message.author.id !== message.guild.ownerId) {
            const result = productionStyle.createErrorEmbed(
                'Insufficient Permissions',
                'Không thể mute voice người có role cao hơn hoặc bằng bạn!'
            );
            return message.reply({ 
                embeds: [result.embed], 
                files: result.attachments 
            });
        }
        
        // Check bot role hierarchy
        if (targetMember.roles.highest.position >= message.guild.members.me.roles.highest.position) {
            const result = productionStyle.createErrorEmbed(
                'Bot Insufficient Permissions',
                'Không thể mute voice người có role cao hơn bot!'
            );
            return message.reply({ 
                embeds: [result.embed], 
                files: result.attachments 
            });
        }
        
        // Get reason
        const reason = args.slice(1).join(' ') || 'Không có lý do được cung cấp';
        
        try {
            // Voice mute user
            await targetMember.voice.setMute(true, `Voice muted by ${message.author.tag}: ${reason}`);
            
            // Success message với production style
            const result = productionStyle.createSuccessEmbed(
                'VOICE MUTE',
                targetUser,
                message.author,
                reason,
                [
                    { name: 'Voice Channel', value: targetMember.voice.channel.name, inline: true },
                    { name: 'Status', value: 'Voice Muted', inline: true },
                    { name: 'Action', value: 'Microphone disabled', inline: true }
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
                            'VOICE MUTE',
                            targetUser,
                            message.author,
                            reason,
                            [
                                { name: 'Voice Channel', value: targetMember.voice.channel.name, inline: true },
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
            console.error('Lỗi khi voice mute user:', error);
            
            let errorMessage = 'Đã xảy ra lỗi khi mute voice người dùng!';
            
            if (error.code === 50013) {
                errorMessage = 'Bot không có đủ quyền để mute voice người dùng này!';
            }
            
            const result = productionStyle.createErrorEmbed(
                'Voice Mute Failed',
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