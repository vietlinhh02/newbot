const { PermissionFlagsBits } = require('discord.js');
const { hasFlexiblePermission } = require('../../utils/permissions');
const productionStyle = require('../../utils/demoStyle');

module.exports = {
    name: 'disconnect',
    aliases: ['vdisconnect', 'vkick'],
    description: 'Ngắt kết nối voice của người dùng (kick khỏi voice channel)',
    usage: '!disconnect [@user] [reason]',
    examples: [
        '!disconnect @John Disrupting voice',
        '!vdisconnect @user AFK too long',
        '!vkick 123456789 Inappropriate behavior'
    ],
    permissions: 'helper',
    guildOnly: true,
    category: 'voice',
    
    async execute(message, args, client) {
        // Check permissions
        if (!await hasFlexiblePermission(message.member, 'disconnect', this.permissions, message.guild.id)) {
            const result = productionStyle.createErrorEmbed(
                'Permission Denied',
                'Bạn cần quyền **Move Members** để disconnect voice!'
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
        if (!args[0]) {
            const result = productionStyle.createWarningEmbed(
                'Missing Information',
                'Vui lòng cung cấp người dùng cần disconnect!',
                [
                    { name: 'Usage', value: '`!disconnect [@user] [reason]`' },
                    { name: 'Example', value: '`!disconnect @John Disrupting voice`' }
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
        
        // Check if user is bot
        if (targetUser.bot) {
            const result = productionStyle.createErrorEmbed(
                'Invalid Target',
                'Không thể disconnect bot!'
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
                'Không thể disconnect người có role cao hơn hoặc bằng bạn!'
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
                'Không thể disconnect người có role cao hơn bot!'
            );
            return message.reply({ 
                embeds: [result.embed], 
                files: result.attachments 
            });
        }
        
        // Get reason
        const reason = args.slice(1).join(' ') || 'Không có lý do được cung cấp';
        
        try {
            const oldChannel = targetMember.voice.channel;
            
            // Disconnect user from voice (move to null)
            await targetMember.voice.setChannel(null, `Disconnected by ${message.author.tag}: ${reason}`);
            
            // Success message với production style
            const result = productionStyle.createSuccessEmbed(
                'VOICE DISCONNECT',
                targetUser,
                message.author,
                reason,
                [
                    { name: 'From Channel', value: oldChannel.name, inline: true },
                    { name: 'Status', value: 'Disconnected', inline: true },
                    { name: 'Action', value: 'Removed from voice', inline: true }
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
                            'VOICE DISCONNECT',
                            targetUser,
                            message.author,
                            reason,
                            [
                                { name: 'From Channel', value: oldChannel.name, inline: true },
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
            console.error('Lỗi khi disconnect user:', error);
            
            let errorMessage = 'Đã xảy ra lỗi khi disconnect người dùng!';
            
            if (error.code === 50013) {
                errorMessage = 'Bot không có đủ quyền để disconnect người dùng này!';
            }
            
            const result = productionStyle.createErrorEmbed(
                'Voice Disconnect Failed',
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