const { PermissionFlagsBits } = require('discord.js');
const { hasFlexiblePermission, getPermissionErrorMessage } = require('../../utils/permissions');
const productionStyle = require('../../utils/demoStyle');

module.exports = {
    name: 'announce',
    aliases: ['announcement', 'say'],
    description: 'Gửi thông báo đến kênh được chỉ định',
    usage: '!announce [#channel] [message]',
    examples: [
        '!announce #general Xin chào mọi người!',
        '!announcement #announcements Server sẽ bảo trì vào 10h sáng mai',
        '!say this Đây là tin nhắn test'
    ],
    permissions: 'admin',
    guildOnly: true,
    category: 'announcement',
    
    async execute(message, args, client) {
        // Check permissions
        if (!await hasFlexiblePermission(message.member, 'announce', this.permissions, message.guild.id)) {
            const errorMessage = getPermissionErrorMessage(this.permissions, 'announce');
            const result = productionStyle.createErrorEmbed(
                'Permission Denied',
                errorMessage
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
                'Vui lòng cung cấp kênh hoặc tin nhắn!',
                [
                    { name: 'Usage', value: '`!announce [#channel] [message]`' },
                    { name: 'Example', value: '`!announce #general Xin chào mọi người!`' },
                    { name: 'Tip', value: 'Use `this` to send in current channel' }
                ]
            );
            return message.reply({ 
                embeds: [result.embed], 
                files: result.attachments 
            });
        }
        
        let targetChannel = null;
        let messageArgs = [...args];

        if (args[0]) {
            const firstArg = args[0].toLowerCase();
            const channelId = args[0].replace(/[<#>]/g, '');
            const mentionedChannel = message.mentions.channels.first();

            if (mentionedChannel) {
                targetChannel = mentionedChannel;
                messageArgs.shift();
            } else if (firstArg === 'this') {
                targetChannel = message.channel;
                messageArgs.shift();
            } else {
                const foundChannel = message.guild.channels.cache.find(ch =>
                    ch.isTextBased() && (
                        ch.id === channelId ||
                        ch.name.toLowerCase() === firstArg ||
                        ch.name.toLowerCase().includes(firstArg)
                    )
                );
                if (foundChannel) {
                    targetChannel = foundChannel;
                    messageArgs.shift();
                }
            }
        }

        if (!targetChannel) {
            targetChannel = message.channel;
        }

        const announceMessage = messageArgs.join(' ');
        
        // Check if message is provided
        if (!announceMessage.trim()) {
            const result = productionStyle.createErrorEmbed(
                'Missing Message',
                'Vui lòng cung cấp nội dung thông báo!',
                'Example: `!announce #general Xin chào mọi người!`'
            );
            return message.reply({ 
                embeds: [result.embed], 
                files: result.attachments 
            });
        }
        
        // Check if message is too long
        if (announceMessage.length > 2000) {
            const result = productionStyle.createErrorEmbed(
                'Message Too Long',
                'Discord giới hạn tối đa 2000 ký tự!',
                `Current: ${announceMessage.length}/2000 characters`
            );
            return message.reply({ 
                embeds: [result.embed], 
                files: result.attachments 
            });
        }
        
        // Check bot permissions in target channel
        if (!targetChannel.isTextBased()) {
            const result = productionStyle.createErrorEmbed(
                'Invalid Channel Type',
                'Chỉ có thể gửi thông báo vào text channel!'
            );
            return message.reply({ 
                embeds: [result.embed], 
                files: result.attachments 
            });
        }
        
        const botPermissions = targetChannel.permissionsFor(message.guild.members.me);
        if (!botPermissions.has(['ViewChannel', 'SendMessages'])) {
            const result = productionStyle.createErrorEmbed(
                'Bot Missing Channel Permissions',
                `Bot cần quyền **View Channel** và **Send Messages** trong ${targetChannel}!`
            );
            return message.reply({ 
                embeds: [result.embed], 
                files: result.attachments 
            });
        }
        
        try {
            // Send announcement
            await targetChannel.send(announceMessage);
            
            // Delete original command message if not in same channel
            if (targetChannel.id !== message.channel.id) {
                try {
                    await message.delete();
                } catch (deleteError) {
                    console.log('Không thể xóa tin nhắn lệnh:', deleteError.message);
                }
            }
            
            // Confirmation message với production style
            if (targetChannel.id !== message.channel.id) {
                const result = productionStyle.createSuccessEmbed(
                    'ANNOUNCEMENT SENT',
                    { tag: 'Message Delivered' },
                    message.author,
                    announceMessage.length > 100 ? announceMessage.substring(0, 100) + '...' : announceMessage,
                    [
                        { name: 'Target Channel', value: targetChannel.toString(), inline: true },
                        { name: 'Message Length', value: `${announceMessage.length}/2000 characters`, inline: true },
                        { name: 'Status', value: 'Successfully sent', inline: true }
                    ]
                );
                
                const confirmMsg = await message.channel.send({ 
                    embeds: [result.embed], 
                    files: result.attachments 
                });
                
                // Auto-delete confirmation after 5 seconds
                setTimeout(() => {
                    confirmMsg.delete().catch(() => {});
                }, 5000);
            }
            
            // Log to moderation channel if configured
            try {
                const guildSettings = await client.prisma.guildSettings.findUnique({
                    where: { guildId: message.guild.id }
                });
                
                if (guildSettings?.logChannel && guildSettings.logChannel !== targetChannel.id) {
                    const logChannel = message.guild.channels.cache.get(guildSettings.logChannel);
                    
                    if (logChannel) {
                        const logResult = productionStyle.createSuccessEmbed(
                            'ANNOUNCEMENT LOG',
                            { tag: 'Moderation Log' },
                            message.author,
                            announceMessage.length > 200 ? announceMessage.substring(0, 200) + '...' : announceMessage,
                            [
                                { name: 'Target Channel', value: targetChannel.toString(), inline: true },
                                { name: 'Message Length', value: `${announceMessage.length}`, inline: true },
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
            console.error('Lỗi khi gửi thông báo:', error);
            
            let errorMessage = 'Không thể gửi thông báo!';
            
            if (error.code === 50013) {
                errorMessage = 'Bot không có quyền gửi tin nhắn trong kênh đó!';
            } else if (error.code === 50001) {
                errorMessage = 'Bot không có quyền truy cập kênh đó!';
            } else if (error.code === 10003) {
                errorMessage = 'Kênh không tồn tại!';
            }
            
            const result = productionStyle.createErrorEmbed(
                'Announcement Failed',
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