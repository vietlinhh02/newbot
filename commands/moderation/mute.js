const { hasFlexiblePermission } = require('../../utils/permissions');
const productionStyle = require('../../utils/demoStyle');
const ms = require('ms');

module.exports = {
    name: 'mute',
    aliases: ['m', 'silence'],
    description: 'Mute một user trong thời gian nhất định',
    usage: '!mute <@user> [thời gian] [lý do]',
    examples: [
        '!mute @User 10m spam',
        '!mute @User 1h toxic behavior',
        '!mute @User vi phạm quy tắc'
    ],
    permissions: 'helper',
    guildOnly: true,
    category: 'moderation',
    
    async execute(message, args, client) {
        // Check permissions
        if (!await hasFlexiblePermission(message.member, 'mute', this.permissions, message.guild.id)) {
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
                'Vui lòng cung cấp user cần mute.',
                [
                    { name: 'Cách sử dụng', value: '`!mute <@user> [thời gian] [lý do]`' },
                    { name: 'Ví dụ thời gian', value: '`10s` - 10 giây\n`5m` - 5 phút\n`2h` - 2 giờ\n`1d` - 1 ngày' },
                    { name: 'Lưu ý', value: 'Nếu không có thời gian, mute vô thời hạn' }
                ]
            );
            return message.reply({ 
                embeds: [result.embed], 
                files: result.attachments 
            });
        }

        try {
            // Parse target member
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

            // Check if target is bot
            if (targetMember.user.bot) {
                const result = productionStyle.createErrorEmbed(
                    'Invalid Target',
                    'Không thể mute bot Discord.'
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
                    'Bạn không thể tự mute chính mình!'
                );
                return message.reply({ 
                    embeds: [result.embed], 
                    files: result.attachments 
                });
            }

            // Check if target is guild owner
            if (targetMember.user.id === message.guild.ownerId) {
                const result = productionStyle.createErrorEmbed(
                    'Cannot Mute Owner',
                    'Không thể mute chủ sở hữu server!'
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
                    'Bạn không thể mute user có role cao hơn hoặc bằng bạn!'
                );
                return message.reply({ 
                    embeds: [result.embed], 
                    files: result.attachments 
                });
            }

            // Check if bot can mute target
            if (targetMember.roles.highest.position >= message.guild.members.me.roles.highest.position) {
                const result = productionStyle.createErrorEmbed(
                    'Bot Insufficient Permissions',
                    'Bot không thể mute user có role cao hơn bot!'
                );
                return message.reply({ 
                    embeds: [result.embed], 
                    files: result.attachments 
                });
            }

            // Check if target is already muted/timed out
            if (targetMember.isCommunicationDisabled()) {
                const expiresAt = targetMember.communicationDisabledUntil;
                const result = productionStyle.createWarningEmbed(
                    'Already Muted',
                    `${targetMember.user.tag} đã bị timeout/mute từ trước.`,
                    [
                        { name: 'Hết hạn hiện tại', value: `<t:${Math.floor(expiresAt.getTime() / 1000)}:F>` },
                        { name: 'Còn lại', value: `<t:${Math.floor(expiresAt.getTime() / 1000)}:R>` }
                    ]
                );
                return message.reply({ 
                    embeds: [result.embed], 
                    files: result.attachments 
                });
            }

            // Parse duration and reason
            let duration = null;
            let durationMs = null;
            let reasonStartIndex = 1;

            // Check if args[1] is a duration
            if (args[1]) {
                const parsed = ms(args[1]);
                if (parsed && parsed > 0) {
                    durationMs = parsed;
                    duration = args[1];
                    reasonStartIndex = 2;
                    
                    // Validate duration (max 28 days for Discord timeout)
                    if (durationMs > 28 * 24 * 60 * 60 * 1000) {
                        const result = productionStyle.createErrorEmbed(
                            'Duration Too Long',
                            'Thời gian mute tối đa là 28 ngày.'
                        );
                        return message.reply({ 
                            embeds: [result.embed], 
                            files: result.attachments 
                        });
                    }
                }
            }

            // Parse reason
            const reason = args.slice(reasonStartIndex).join(' ') || 'Không có lý do được cung cấp';

            // Validate reason length
            if (reason.length > 500) {
                const result = productionStyle.createErrorEmbed(
                    'Reason Too Long',
                    'Lý do mute không được vượt quá 500 ký tự.',
                    `Hiện tại: ${reason.length}/500 ký tự`
                );
                return message.reply({ 
                    embeds: [result.embed], 
                    files: result.attachments 
                });
            }

            // Try to send DM to target before mute
            let dmSent = false;
            try {
                const dmResult = productionStyle.createDMEmbed('MUTE', message.guild.name, message.author.tag, reason);
                await targetMember.user.send({ 
                    embeds: [dmResult.embed], 
                    files: dmResult.attachments 
                });
                dmSent = true;
            } catch (error) {
                // DM failed, continue with mute
            }

            // Execute mute/timeout
            let muteType = '';
            if (durationMs) {
                // Use Discord timeout for temporary mutes
                await targetMember.timeout(durationMs, `${reason} | Bởi: ${message.author.tag}`);
                muteType = 'Discord Timeout';
            } else {
                // Find or create mute role for permanent mutes
                let muteRole = null;
                
                // Try to find existing mute role
                muteRole = message.guild.roles.cache.find(role => 
                    role.name.toLowerCase() === 'muted' || 
                    role.name.toLowerCase() === 'mute'
                );

                if (!muteRole) {
                    // Create mute role if it doesn't exist
                    try {
                        muteRole = await message.guild.roles.create({
                            name: 'Muted',
                            color: '#808080',
                            permissions: [],
                            reason: 'Auto-created mute role'
                        });

                        // Setup permissions for the mute role in all channels
                        const channels = message.guild.channels.cache;
                        for (const [, channel] of channels) {
                            if (channel.isTextBased() || channel.isVoiceBased()) {
                                try {
                                    await channel.permissionOverwrites.create(muteRole, {
                                        SendMessages: false,
                                        Speak: false,
                                        AddReactions: false
                                    });
                                } catch (error) {
                                    console.error(`Error setting permissions for ${channel.name}:`, error);
                                }
                            }
                        }
                    } catch (error) {
                        const result = productionStyle.createErrorEmbed(
                            'Mute Role Creation Failed',
                            'Không thể tạo hoặc tìm thấy mute role.',
                            error.message
                        );
                        return message.reply({ 
                            embeds: [result.embed], 
                            files: result.attachments 
                        });
                    }
                }

                // Add mute role to user
                await targetMember.roles.add(muteRole, `${reason} | Bởi: ${message.author.tag}`);
                muteType = 'Role-based Mute';
            }

            // Format duration display
            const formatDuration = (ms) => {
                if (!ms) return 'Vô thời hạn';
                
                const seconds = Math.floor(ms / 1000);
                const minutes = Math.floor(seconds / 60);
                const hours = Math.floor(minutes / 60);
                const days = Math.floor(hours / 24);

                if (days > 0) return `${days} ngày ${hours % 24} giờ`;
                if (hours > 0) return `${hours} giờ ${minutes % 60} phút`;
                if (minutes > 0) return `${minutes} phút ${seconds % 60} giây`;
                return `${seconds} giây`;
            };

            // Calculate expiry time
            const expiresAt = durationMs ? new Date(Date.now() + durationMs) : null;

            // Success response với production style
            const additionalFields = [
                { name: 'DM Notification', value: dmSent ? 'Đã gửi' : 'Không gửi được', inline: true },
                { name: 'User ID', value: `\`${targetMember.user.id}\``, inline: true },
                { name: 'Mute Type', value: muteType, inline: true },
                { name: 'Duration', value: formatDuration(durationMs), inline: true }
            ];

            if (expiresAt) {
                additionalFields.push({
                    name: 'Expires At',
                    value: `<t:${Math.floor(expiresAt.getTime() / 1000)}:F>`,
                    inline: true
                });
                additionalFields.push({
                    name: 'Time Remaining',
                    value: `<t:${Math.floor(expiresAt.getTime() / 1000)}:R>`,
                    inline: true
                });
            }

            const result = productionStyle.createSuccessEmbed(
                'MUTE',
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
                            'MUTE',
                            targetMember.user,
                            message.author,
                            reason,
                            [
                                { name: 'Command Channel', value: message.channel.toString(), inline: true },
                                { name: 'Mute Type', value: muteType, inline: true },
                                { name: 'Duration', value: formatDuration(durationMs), inline: true },
                                { name: 'DM Status', value: dmSent ? 'Sent' : 'Failed', inline: true },
                                { name: 'Expires At', value: expiresAt ? `<t:${Math.floor(expiresAt.getTime() / 1000)}:F>` : 'Never', inline: true },
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
            console.error('Error executing mute command:', error);
            
            const result = productionStyle.createErrorEmbed(
                'Command Error',
                'Đã xảy ra lỗi khi thực hiện lệnh mute.',
                error.message
            );
            
            await message.reply({ 
                embeds: [result.embed], 
                files: result.attachments 
            });
        }
    }
}; 