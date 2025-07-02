const { hasFlexiblePermission } = require('../../utils/permissions');
const productionStyle = require('../../utils/demoStyle');

module.exports = {
    name: 'ban',
    aliases: ['b'],
    description: 'Ban một user khỏi server',
    usage: '!ban <@user> [lý do]',
    examples: [
        '!ban @User spam',
        '!ban @User toxic behavior',
        '!ban @User vi phạm quy tắc server'
    ],
    permissions: 'helper',
    guildOnly: true,
    category: 'moderation',
    
    async execute(message, args, client) {
        // Check permissions
        if (!await hasFlexiblePermission(message.member, 'ban', this.permissions, message.guild.id)) {
            const result = productionStyle.createErrorEmbed(
                'Permission Denied',
                'Bạn cần quyền **Moderator** hoặc cao hơn để sử dụng lệnh này!'
            );
            return message.reply({ 
                embeds: [result.embed], 
                files: result.attachments 
            });
        }
        
        // Check if user provided
        if (!args[0]) {
            const result = productionStyle.createWarningEmbed(
                'Missing Information',
                'Vui lòng cung cấp user cần ban.',
                [
                    { name: 'Cách sử dụng', value: '`!ban <@user> [lý do]`' },
                    { name: 'Ví dụ', value: '`!ban @User spam tin nhắn`' },
                    { name: 'Lưu ý', value: 'Lý do ban là tùy chọn nhưng nên cung cấp' }
                ]
            );
            return message.reply({ 
                embeds: [result.embed], 
                files: result.attachments 
            });
        }

        try {
            // Parse target user
            let targetMember = null;
            let targetUser = null;

            // Try to get member from mentions first
            if (message.mentions.members.first()) {
                targetMember = message.mentions.members.first();
                targetUser = targetMember.user;
            } else {
                // Try to fetch user by ID (might not be in server)
                const userId = args[0].replace(/[<@!>]/g, '');
                try {
                    targetUser = await client.users.fetch(userId);
                    
                    // Check if user is in server
                    try {
                        targetMember = await message.guild.members.fetch(userId);
                    } catch (error) {
                        // User not in server, that's fine for ban
                        targetMember = null;
                    }
                } catch (error) {
                    const result = productionStyle.createErrorEmbed(
                        'User Not Found',
                        'Không thể tìm thấy user với ID đã cung cấp.'
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
                    'Không thể ban bot Discord.'
                );
                return message.reply({ 
                    embeds: [result.embed], 
                    files: result.attachments 
                });
            }
            
            // Check if target is command executor
            if (targetUser.id === message.author.id) {
                const result = productionStyle.createErrorEmbed(
                    'Invalid Action',
                    'Bạn không thể tự ban chính mình!'
                );
                return message.reply({ 
                    embeds: [result.embed], 
                    files: result.attachments 
                });
            }
            
            // Check if target is guild owner
            if (targetUser.id === message.guild.ownerId) {
                const result = productionStyle.createErrorEmbed(
                    'Cannot Ban Owner',
                    'Không thể ban chủ sở hữu server!'
                );
                return message.reply({ 
                    embeds: [result.embed], 
                    files: result.attachments 
                });
            }
            
            // Check role hierarchy (only if user is in server)
            if (targetMember) {
                if (targetMember.roles.highest.position >= message.member.roles.highest.position) {
                    const result = productionStyle.createErrorEmbed(
                        'Insufficient Permissions',
                        'Bạn không thể ban user có role cao hơn hoặc bằng bạn!'
                    );
                    return message.reply({ 
                        embeds: [result.embed], 
                        files: result.attachments 
                    });
                }

                // Check if bot can ban target
                if (targetMember.roles.highest.position >= message.guild.members.me.roles.highest.position) {
                    const result = productionStyle.createErrorEmbed(
                        'Bot Insufficient Permissions',
                        'Bot không thể ban user có role cao hơn bot!'
                    );
                    return message.reply({ 
                        embeds: [result.embed], 
                        files: result.attachments 
                    });
                }
            }
            
            // Check if user is already banned
            try {
                const existingBan = await message.guild.bans.fetch(targetUser.id);
                if (existingBan) {
                    const result = productionStyle.createWarningEmbed(
                        'Already Banned',
                        `${targetUser.tag} đã bị ban từ trước.`,
                        [
                            { name: 'Lý do ban hiện tại', value: existingBan.reason || 'Không có lý do' }
                        ]
                    );
                    return message.reply({ 
                        embeds: [result.embed], 
                        files: result.attachments 
                    });
                }
            } catch (error) {
                // User not banned, continue
            }

            // Parse reason
            const reason = args.slice(1).join(' ') || 'Không có lý do được cung cấp';

            // Validate reason length
            if (reason.length > 500) {
                const result = productionStyle.createErrorEmbed(
                    'Reason Too Long',
                    'Lý do ban không được vượt quá 500 ký tự.',
                    `Hiện tại: ${reason.length}/500 ký tự`
                );
                return message.reply({ 
                    embeds: [result.embed], 
                    files: result.attachments 
                });
            }
            
            // Try to send DM to target before ban (only if user is in server)
            let dmSent = false;
            if (targetMember) {
                try {
                    const dmResult = productionStyle.createDMEmbed('BAN', message.guild.name, message.author.tag, reason);
                    await targetUser.send({ 
                        embeds: [dmResult.embed], 
                        files: dmResult.attachments 
                    });
                    dmSent = true;
                } catch (error) {
                    // DM failed, continue with ban
                }
            }
            
            // Execute ban
            await message.guild.members.ban(targetUser.id, {
                deleteMessageSeconds: 7 * 24 * 60 * 60, // Delete 7 days of messages
                reason: `${reason} | Bởi: ${message.author.tag}`
            });
            
            // Success response với production style
            const additionalFields = [
                { name: 'DM Notification', value: dmSent ? 'Đã gửi' : 'Không gửi được', inline: true },
                { name: 'User ID', value: `\`${targetUser.id}\``, inline: true },
                { name: 'Message Cleanup', value: 'Xóa tin nhắn 7 ngày gần đây', inline: true },
                { name: 'Status', value: 'Ban thành công', inline: true },
                { name: 'In Server', value: targetMember ? 'Có' : 'Không', inline: true },
                { name: 'Account Age', value: `<t:${Math.floor(targetUser.createdTimestamp / 1000)}:R>`, inline: true }
            ];

            const result = productionStyle.createSuccessEmbed(
                'BAN',
                targetUser,
                message.author,
                reason,
                additionalFields
            );
            
            await message.reply({ 
                embeds: [result.embed], 
                files: result.attachments 
            });
            
            // Log to mod channel if configured (giữ nguyên logic logging)
            try {
                const guildSettings = await client.prisma.guildSettings.findUnique({
                    where: { guildId: message.guild.id }
                });
                
                if (guildSettings?.logChannel) {
                    const logChannel = message.guild.channels.cache.get(guildSettings.logChannel);
                    if (logChannel) {
                        const logResult = productionStyle.createSuccessEmbed(
                            'BAN',
                            targetUser,
                            message.author,
                            reason,
                            [
                                { name: 'Command Channel', value: message.channel.toString(), inline: true },
                                { name: 'DM Status', value: dmSent ? 'Sent' : 'Failed', inline: true },
                                { name: 'Was In Server', value: targetMember ? 'Yes' : 'No', inline: true },
                                { name: 'Messages Deleted', value: '7 days', inline: true }
                            ]
                        );
                        await logChannel.send({ 
                            embeds: [logResult.embed], 
                            files: logResult.attachments 
                        });
                    }
                }
            } catch (error) {
                console.error('Error sending to log channel:', error);
            }
            
        } catch (error) {
            console.error('Error executing ban command:', error);
            
            const result = productionStyle.createErrorEmbed(
                'Command Error',
                'Đã xảy ra lỗi khi thực hiện lệnh ban.',
                error.message
            );
            
            await message.reply({ 
                embeds: [result.embed], 
                files: result.attachments 
            });
        }
    }
}; 