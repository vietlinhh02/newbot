const { hasFlexiblePermission } = require('../../utils/permissions');
const productionStyle = require('../../utils/demoStyle');
const ms = require('ms');

module.exports = {
    name: 'timeout',
    aliases: ['to', 'silence'],
    description: 'Timeout một user trong thời gian nhất định',
    usage: '!timeout <@user> <thời gian> [lý do]',
    examples: [
        '!timeout @User 10m spam',
        '!timeout @User 1h toxic behavior',
        '!timeout @User 30m vi phạm quy tắc'
    ],
    permissions: 'helper',
    guildOnly: true,
    category: 'moderation',

    async execute(message, args, client) {
        // Check permissions
        if (!await hasFlexiblePermission(message.member, 'timeout', this.permissions, message.guild.id)) {
            const result = productionStyle.createErrorEmbed(
                'Permission Denied',
                'Bạn cần quyền **Moderator** hoặc cao hơn để sử dụng lệnh này!'
            );
            return message.reply({ 
                embeds: [result.embed], 
                files: result.attachments 
            });
        }

        // Check if user and duration provided
        if (!args[0] || !args[1]) {
            const result = productionStyle.createWarningEmbed(
                'Missing Information',
                'Vui lòng cung cấp user và thời gian timeout.',
                [
                    { name: 'Cách sử dụng', value: '`!timeout <@user> <thời gian> [lý do]`' },
                    { name: 'Ví dụ thời gian', value: '`10s` - 10 giây\n`5m` - 5 phút\n`2h` - 2 giờ\n`1d` - 1 ngày' },
                    { name: 'Giới hạn', value: 'Tối đa 28 ngày' },
                    { name: 'Ví dụ đầy đủ', value: '`!timeout @User 30m spam tin nhắn`' }
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
            
            // Try to get member from mentions first
            if (message.mentions.members.first()) {
                targetMember = message.mentions.members.first();
            } else {
                // Try to fetch member by ID
                const userId = args[0].replace(/[<@!>]/g, '');
                try {
                    targetMember = await message.guild.members.fetch(userId);
                } catch (error) {
                    const result = productionStyle.createErrorEmbed(
                        'User Not Found',
                        'Không thể tìm thấy user trong server này.'
                    );
                    return message.reply({ 
                        embeds: [result.embed], 
                        files: result.attachments 
                    });
                }
            }

            // Parse duration
            const durationString = args[1];
            const duration = ms(durationString);
            
            if (!duration || duration < 1000 || duration > 28 * 24 * 60 * 60 * 1000) {
                const result = productionStyle.createErrorEmbed(
                    'Invalid Duration',
                    'Thời gian phải từ 1 giây đến 28 ngày.'
                );
                return message.reply({ 
                    embeds: [result.embed], 
                    files: result.attachments 
                });
            }

            // Check if target is bot
            if (targetMember.user.bot) {
                const result = productionStyle.createErrorEmbed(
                    'Invalid Target',
                    'Không thể timeout bot Discord.'
                );
                return message.reply({ 
                    embeds: [result.embed], 
                    files: result.attachments 
                });
            }

            // Check if target is command executor
            if (targetMember.user.id === message.author.id) {
                const result = productionStyle.createErrorEmbed(
                    'Invalid Action',
                    'Bạn không thể tự timeout chính mình!'
                );
                return message.reply({ 
                    embeds: [result.embed], 
                    files: result.attachments 
                });
            }

            // Check if target is guild owner
            if (targetMember.user.id === message.guild.ownerId) {
                const result = productionStyle.createErrorEmbed(
                    'Cannot Timeout Owner',
                    'Không thể timeout chủ sở hữu server!'
                );
                return message.reply({ 
                    embeds: [result.embed], 
                    files: result.attachments 
                });
            }

            // Check role hierarchy
            if (targetMember.roles.highest.position >= message.member.roles.highest.position) {
                const result = productionStyle.createErrorEmbed(
                    'Insufficient Permissions',
                    'Bạn không thể timeout user có role cao hơn hoặc bằng bạn!'
                );
                return message.reply({ 
                    embeds: [result.embed], 
                    files: result.attachments 
                });
            }

            // Check if bot can timeout target
            if (targetMember.roles.highest.position >= message.guild.members.me.roles.highest.position) {
                const result = productionStyle.createErrorEmbed(
                    'Bot Insufficient Permissions',
                    'Bot không thể timeout user có role cao hơn bot!'
                );
                return message.reply({ 
                    embeds: [result.embed], 
                    files: result.attachments 
                });
            }

            // Check if target is already timed out
            if (targetMember.isCommunicationDisabled()) {
                const currentExpiry = targetMember.communicationDisabledUntil;
                const result = productionStyle.createWarningEmbed(
                    'Already Timed Out',
                    `${targetMember.user.tag} đã bị timeout từ trước.`,
                    [
                        { name: 'Hết hạn hiện tại', value: `<t:${Math.floor(currentExpiry.getTime() / 1000)}:F>` },
                        { name: 'Còn lại', value: `<t:${Math.floor(currentExpiry.getTime() / 1000)}:R>` }
                    ]
                );
                return message.reply({ 
                    embeds: [result.embed], 
                    files: result.attachments 
                });
            }

            // Parse reason
            const reason = args.slice(2).join(' ') || 'Không có lý do được cung cấp';

            // Validate reason length
            if (reason.length > 500) {
                const result = productionStyle.createErrorEmbed(
                    'Reason Too Long',
                    'Lý do timeout không được vượt quá 500 ký tự.',
                    `Hiện tại: ${reason.length}/500 ký tự`
                );
                return message.reply({ 
                    embeds: [result.embed], 
                    files: result.attachments 
                });
            }

            // Calculate expiry time
            const expiresAt = new Date(Date.now() + duration);

            // Try to send DM to target before timeout
            let dmSent = false;
            try {
                const dmResult = productionStyle.createDMEmbed('TIMEOUT', message.guild.name, message.author.tag, reason);
                await targetMember.user.send({ 
                    embeds: [dmResult.embed], 
                    files: dmResult.attachments 
                });
                dmSent = true;
            } catch (error) {
                // DM failed, continue with timeout
            }

            // Execute timeout
            await targetMember.timeout(duration, `${reason} | Bởi: ${message.author.tag}`);

            // Format duration display
            const formatDuration = (ms) => {
                const seconds = Math.floor(ms / 1000);
                const minutes = Math.floor(seconds / 60);
                const hours = Math.floor(minutes / 60);
                const days = Math.floor(hours / 24);

                if (days > 0) return `${days} ngày ${hours % 24} giờ`;
                if (hours > 0) return `${hours} giờ ${minutes % 60} phút`;
                if (minutes > 0) return `${minutes} phút ${seconds % 60} giây`;
                return `${seconds} giây`;
            };

            // Success response với production style
            const additionalFields = [
                { name: 'Timeout Duration', value: `${formatDuration(duration)} (${durationString})`, inline: true },
                { name: 'Expires At', value: `<t:${Math.floor(expiresAt.getTime() / 1000)}:F>`, inline: true },
                { name: 'Time Remaining', value: `<t:${Math.floor(expiresAt.getTime() / 1000)}:R>`, inline: true },
                { name: 'DM Notification', value: dmSent ? 'Đã gửi' : 'Không gửi được', inline: true },
                { name: 'User ID', value: `\`${targetMember.user.id}\``, inline: true },
                { name: 'Status', value: 'Timeout thành công', inline: true }
            ];

            const result = productionStyle.createSuccessEmbed(
                'TIMEOUT',
                targetMember.user,
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
                            'TIMEOUT',
                            targetMember.user,
                            message.author,
                            reason,
                            [
                                { name: 'Command Channel', value: message.channel.toString(), inline: true },
                                { name: 'Duration', value: formatDuration(duration), inline: true },
                                { name: 'Expires At', value: `<t:${Math.floor(expiresAt.getTime() / 1000)}:F>`, inline: true },
                                { name: 'DM Status', value: dmSent ? 'Sent' : 'Failed', inline: true },
                                { name: 'Member Join Date', value: `<t:${Math.floor(targetMember.joinedTimestamp / 1000)}:R>`, inline: true },
                                { name: 'Account Age', value: `<t:${Math.floor(targetMember.user.createdTimestamp / 1000)}:R>`, inline: true }
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
            console.error('Error executing timeout command:', error);
            
            const result = productionStyle.createErrorEmbed(
                'Command Error',
                'Đã xảy ra lỗi khi thực hiện lệnh timeout.',
                error.message
            );
            
            await message.reply({ 
                embeds: [result.embed], 
                files: result.attachments 
            });
        }
    }
}; 