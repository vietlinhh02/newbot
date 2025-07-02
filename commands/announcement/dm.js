const { PermissionFlagsBits } = require('discord.js');
const { hasFlexiblePermission } = require('../../utils/permissions');
const productionStyle = require('../../utils/demoStyle');

module.exports = {
    name: 'dm',
    aliases: ['directmessage', 'pm', 'whisper'],
    description: 'Gửi tin nhắn riêng cho người dùng qua DM',
    usage: '!dm [@user] [message]',
    examples: [
        '!dm @John Xin chào! Bạn có thắc mắc gì không?',
        '!directmessage @user Cảm ơn bạn đã tham gia server!',
        '!pm 123456789 Tin nhắn quan trọng cho bạn'
    ],
    permissions: 'admin',
    guildOnly: true,
    category: 'announcement',
    
    async execute(message, args, client) {
        // Check permissions
        if (!await hasFlexiblePermission(message.member, 'dm', this.permissions, message.guild.id)) {
            const result = productionStyle.createErrorEmbed(
                'Permission Denied',
                'Bạn cần quyền **Administrator** để gửi DM!'
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
                'Vui lòng cung cấp người dùng và tin nhắn!',
                [
                    { name: 'Usage', value: '`!dm [@user] [message]`' },
                    { name: 'Example', value: '`!dm @John Xin chào bạn!`' },
                    { name: 'Note', value: 'Có thể mention hoặc dùng User ID' }
                ]
            );
            return message.reply({ 
                embeds: [result.embed], 
                files: result.attachments 
            });
        }
        
        // Parse user
        let targetUser = null;
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
                    'Vui lòng mention hoặc cung cấp ID hợp lệ!',
                    `Invalid input: ${args[0]}`
                );
                return message.reply({ 
                    embeds: [result.embed], 
                    files: result.attachments 
                });
            }
        }
        
        // Check if target is bot
        if (targetUser.bot) {
            const result = productionStyle.createErrorEmbed(
                'Invalid Target',
                'Không thể gửi DM cho bot!'
            );
            return message.reply({ 
                embeds: [result.embed], 
                files: result.attachments 
            });
        }
        
        // Check if target is the command user
        if (targetUser.id === message.author.id) {
            const result = productionStyle.createErrorEmbed(
                'Invalid Target',
                'Không thể gửi DM cho chính mình!'
            );
            return message.reply({ 
                embeds: [result.embed], 
                files: result.attachments 
            });
        }
        
        // Get DM message
        const dmMessage = args.slice(1).join(' ');
        
        // Check message length
        if (dmMessage.length > 2000) {
            const result = productionStyle.createErrorEmbed(
                'Message Too Long',
                'Discord giới hạn tối đa 2000 ký tự!',
                `Current: ${dmMessage.length}/2000 characters`
            );
            return message.reply({ 
                embeds: [result.embed], 
                files: result.attachments 
            });
        }
        
        // Check if target user is in the same guild
        let targetMember = null;
        try {
            targetMember = await message.guild.members.fetch(targetUser.id);
        } catch (error) {
            const result = productionStyle.createErrorEmbed(
                'User Not In Server',
                'Chỉ có thể gửi DM cho thành viên trong server.',
                'User must be a member of this server'
            );
            return message.reply({ 
                embeds: [result.embed], 
                files: result.attachments 
            });
        }
        
        // Check role hierarchy (can't DM users with higher or equal roles unless you're owner)
        if (targetMember.roles.highest.position >= message.member.roles.highest.position && message.author.id !== message.guild.ownerId) {
            const result = productionStyle.createErrorEmbed(
                'Role Hierarchy Error',
                'Không thể gửi DM cho người có role cao hơn hoặc bằng bạn!',
                'Check your role permissions'
            );
            return message.reply({ 
                embeds: [result.embed], 
                files: result.attachments 
            });
        }
        
        try {
            // Create DM message with server info using production style
            const dmResult = productionStyle.createInfoEmbed(
                'Tin nhắn từ Server',
                { tag: message.guild.name },
                message.author,
                dmMessage,
                [
                    { name: 'From', value: `${message.author.tag}`, inline: true },
                    { name: 'Server', value: message.guild.name, inline: true },
                    { name: 'Time', value: `<t:${Math.floor(Date.now() / 1000)}:F>`, inline: true }
                ]
            );
            
            // Send DM to target user
            await targetUser.send({ 
                embeds: [dmResult.embed], 
                files: dmResult.attachments 
            });
            
            // Delete original command message for privacy
            try {
                await message.delete();
            } catch (deleteError) {
                console.log('Không thể xóa tin nhắn lệnh:', deleteError.message);
            }
            
            // Send confirmation message
            const confirmResult = productionStyle.createSuccessEmbed(
                'DM SENT SUCCESSFULLY',
                { tag: 'Message Delivered' },
                message.author,
                dmMessage.length > 100 ? dmMessage.substring(0, 100) + '...' : dmMessage,
                [
                    { name: 'Recipient', value: targetUser.tag, inline: true },
                    { name: 'Message Length', value: `${dmMessage.length}/2000`, inline: true },
                    { name: 'Status', value: 'Delivered', inline: true }
                ]
            );
            
            const confirmMessage = await message.channel.send({ 
                embeds: [confirmResult.embed], 
                files: confirmResult.attachments 
            });
            
            // Auto-delete confirmation after 10 seconds
            setTimeout(() => {
                confirmMessage.delete().catch(() => {});
            }, 10000);
            
            // Log to moderation channel
            try {
                const guildSettings = await client.prisma.guildSettings.findUnique({
                    where: { guildId: message.guild.id }
                });
                
                if (guildSettings?.logChannel) {
                    const logChannel = message.guild.channels.cache.get(guildSettings.logChannel);
                    
                    if (logChannel) {
                        const logResult = productionStyle.createInfoEmbed(
                            'DM LOG',
                            { tag: 'Moderation Log' },
                            message.author,
                            dmMessage.length > 200 ? dmMessage.substring(0, 200) + '...' : dmMessage,
                            [
                                { name: 'From', value: `${message.author.tag} (${message.author.id})`, inline: true },
                                { name: 'To', value: `${targetUser.tag} (${targetUser.id})`, inline: true },
                                { name: 'Channel', value: message.channel.toString(), inline: true },
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
            console.error('Lỗi khi gửi DM:', error);
            
            let errorMessage = 'Không thể gửi DM!';
            let errorDetail = error.message;
            
            if (error.code === 50007) {
                errorMessage = 'User Has DMs Disabled';
                errorDetail = 'Người dùng đã tắt DM hoặc không cho phép DM từ thành viên server!';
            } else if (error.code === 50013) {
                errorMessage = 'Bot Permission Error';
                errorDetail = 'Bot không có quyền gửi DM!';
            } else if (error.code === 10013) {
                errorMessage = 'User Not Found';
                errorDetail = 'Người dùng không tồn tại!';
            }
            
            const result = productionStyle.createErrorEmbed(
                errorMessage,
                errorDetail
            );
            
            await message.reply({ 
                embeds: [result.embed], 
                files: result.attachments 
            });
        }
    }
}; 