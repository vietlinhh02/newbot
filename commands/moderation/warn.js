const { hasFlexiblePermission } = require('../../utils/permissions');
const productionStyle = require('../../utils/demoStyle');

module.exports = {
    name: 'warn',
    aliases: ['w'],
    description: 'Cảnh báo một user',
    usage: '!warn <@user> <lý do>',
    examples: [
        '!warn @User spam tin nhắn',
        '!warn @User toxic behavior',
        '!warn @User vi phạm quy tắc server'
    ],
    permissions: 'helper',
    guildOnly: true,
    category: 'moderation',

    async execute(message, args, client) {
        // Check permissions
        if (!await hasFlexiblePermission(message.member, 'warn', this.permissions, message.guild.id)) {
            const result = productionStyle.createErrorEmbed(
                'Permission Denied',
                'Bạn cần quyền **Moderator** hoặc cao hơn để sử dụng lệnh này!'
            );
            return message.reply({ 
                embeds: [result.embed], 
                files: result.attachments 
            });
        }

        // Check if user and reason provided
        if (!args[0] || !args[1]) {
            const result = productionStyle.createWarningEmbed(
                'Missing Information',
                'Vui lòng cung cấp user và lý do cảnh báo.',
                [
                    { name: 'Cách sử dụng', value: '`!warn <@user> <lý do>`' },
                    { name: 'Ví dụ', value: '`!warn @User spam tin nhắn`' },
                    { name: 'Lưu ý', value: 'Lý do cảnh báo là bắt buộc' }
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
                    'Không thể cảnh báo bot Discord.'
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
                    'Bạn không thể tự cảnh báo chính mình!'
                );
                return message.reply({ 
                    embeds: [result.embed], 
                    files: result.attachments 
                });
            }

            // Check if target is guild owner
            if (targetMember.user.id === message.guild.ownerId) {
                const result = productionStyle.createErrorEmbed(
                    'Cannot Warn Owner',
                    'Không thể cảnh báo chủ sở hữu server!'
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
                    'Bạn không thể cảnh báo user có role cao hơn hoặc bằng bạn!'
                );
                return message.reply({ 
                    embeds: [result.embed], 
                    files: result.attachments 
                });
            }

            // Parse reason
            const reason = args.slice(1).join(' ');

            // Validate reason length
            if (reason.length > 500) {
                const result = productionStyle.createErrorEmbed(
                    'Reason Too Long',
                    'Lý do cảnh báo không được vượt quá 500 ký tự.',
                    `Hiện tại: ${reason.length}/500 ký tự`
                );
                return message.reply({ 
                    embeds: [result.embed], 
                    files: result.attachments 
                });
            }

            // Save warning to database
            let warningCount = 0;
            try {
                const warning = await client.prisma.warn.create({
                    data: {
                        userId: targetMember.user.id,
                        guildId: message.guild.id,
                        reason: reason,
                        warnedBy: message.author.id
                    }
                });

                // Get total warning count for this user
                const warnings = await client.prisma.warn.findMany({
                    where: {
                        userId: targetMember.user.id,
                        guildId: message.guild.id
                    }
                });
                warningCount = warnings.length;
            } catch (error) {
                console.error('Error saving warning to database:', error);
            }

            // Try to send DM to target
            let dmSent = false;
            try {
                const dmResult = productionStyle.createDMEmbed('WARN', message.guild.name, message.author.tag, reason);
                await targetMember.user.send({ 
                    embeds: [dmResult.embed], 
                    files: dmResult.attachments 
                });
                dmSent = true;
            } catch (error) {
                // DM failed, continue
            }

            // Auto-punishment after 3 warnings
            let autoActionTaken = false;
            let autoActionType = '';
            if (warningCount >= 3) {
                try {
                    // Auto timeout for 1 hour
                    await targetMember.timeout(60 * 60 * 1000, `Auto-timeout: Đạt ${warningCount} cảnh báo | Bởi: Bot`);
                    autoActionTaken = true;
                    autoActionType = 'Timeout 1 giờ';
                } catch (error) {
                    console.error('Error applying auto timeout:', error);
                }
            }

            // Success response với production style
            const additionalFields = [
                { name: 'DM Notification', value: dmSent ? 'Đã gửi' : 'Không gửi được', inline: true },
                { name: 'User ID', value: `\`${targetMember.user.id}\``, inline: true },
                { name: 'Warning Count', value: `${warningCount} cảnh báo`, inline: true },
                { name: 'Account Age', value: `<t:${Math.floor(targetMember.user.createdTimestamp / 1000)}:R>`, inline: true }
            ];

            if (autoActionTaken) {
                additionalFields.push({
                    name: 'Auto Action',
                    value: autoActionType,
                    inline: true
                });
            }

            const result = productionStyle.createSuccessEmbed(
                'WARN',
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
                            'WARN',
                            targetMember.user,
                            message.author,
                            reason,
                            [
                                { name: 'Command Channel', value: message.channel.toString(), inline: true },
                                { name: 'Warning Count', value: `${warningCount}`, inline: true },
                                { name: 'DM Status', value: dmSent ? 'Sent' : 'Failed', inline: true },
                                { name: 'Auto Action', value: autoActionTaken ? autoActionType : 'None', inline: true }
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
            console.error('Error executing warn command:', error);
            
            const result = productionStyle.createErrorEmbed(
                'Command Error',
                'Đã xảy ra lỗi khi thực hiện lệnh warn.',
                error.message
            );
            
            await message.reply({ 
                embeds: [result.embed], 
                files: result.attachments 
            });
        }
    }
}; 