const { hasFlexiblePermission } = require('../../utils/permissions');
const productionStyle = require('../../utils/demoStyle');

module.exports = {
    name: 'kick',
    aliases: ['k'],
    description: 'Kick một user khỏi server',
    usage: '!kick <@user> [lý do]',
    examples: [
        '!kick @User spam',
        '!kick @User toxic behavior',
        '!kick @User vi phạm quy tắc'
    ],
    permissions: 'helper',
    guildOnly: true,
    category: 'moderation',

    async execute(message, args, client) {
        // Check permissions
        if (!await hasFlexiblePermission(message.member, 'kick', this.permissions, message.guild.id)) {
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
                'Vui lòng cung cấp user cần kick.',
                [
                    { name: 'Cách sử dụng', value: '`!kick <@user> [lý do]`' },
                    { name: 'Ví dụ', value: '`!kick @User spam tin nhắn`' },
                    { name: 'Lưu ý', value: 'User phải đang ở trong server' }
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
                    'Không thể kick bot Discord.'
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
                    'Bạn không thể tự kick chính mình!'
                );
                return message.reply({ 
                    embeds: [result.embed], 
                    files: result.attachments 
                });
            }

            // Check if target is guild owner
            if (targetMember.user.id === message.guild.ownerId) {
                const result = productionStyle.createErrorEmbed(
                    'Cannot Kick Owner',
                    'Không thể kick chủ sở hữu server!'
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
                    'Bạn không thể kick user có role cao hơn hoặc bằng bạn!'
                );
                return message.reply({ 
                    embeds: [result.embed], 
                    files: result.attachments 
                });
            }

            // Check if bot can kick target
            if (targetMember.roles.highest.position >= message.guild.members.me.roles.highest.position) {
                const result = productionStyle.createErrorEmbed(
                    'Bot Insufficient Permissions',
                    'Bot không thể kick user có role cao hơn bot!'
                );
                return message.reply({ 
                    embeds: [result.embed], 
                    files: result.attachments 
                });
            }

            // Parse reason
            const reason = args.slice(1).join(' ') || 'Không có lý do được cung cấp';

            // Validate reason length
            if (reason.length > 500) {
                const result = productionStyle.createErrorEmbed(
                    'Reason Too Long',
                    'Lý do kick không được vượt quá 500 ký tự.',
                    `Hiện tại: ${reason.length}/500 ký tự`
                );
                return message.reply({ 
                    embeds: [result.embed], 
                    files: result.attachments 
                });
            }

            // Try to send DM to target before kick
            let dmSent = false;
            try {
                const dmResult = productionStyle.createDMEmbed('KICK', message.guild.name, message.author.tag, reason);
                await targetMember.user.send({ 
                    embeds: [dmResult.embed], 
                    files: dmResult.attachments 
                });
                dmSent = true;
            } catch (error) {
                // DM failed, continue with kick
            }

            // Store user info before kick
            const userTag = targetMember.user.tag;
            const userId = targetMember.user.id;
            const joinedTimestamp = targetMember.joinedTimestamp;
            const accountAge = targetMember.user.createdTimestamp;

            // Execute kick
            await targetMember.kick(`${reason} | Bởi: ${message.author.tag}`);

            // Success response với production style
            const additionalFields = [
                { name: 'DM Notification', value: dmSent ? 'Đã gửi' : 'Không gửi được', inline: true },
                { name: 'User ID', value: `\`${userId}\``, inline: true },
                { name: 'Status', value: 'Kick thành công', inline: true },
                { name: 'Time In Server', value: joinedTimestamp ? `<t:${Math.floor(joinedTimestamp / 1000)}:R>` : 'N/A', inline: true },
                { name: 'Account Age', value: `<t:${Math.floor(accountAge / 1000)}:R>`, inline: true },
                { name: 'Can Rejoin', value: 'Có (nếu có invite)', inline: true }
            ];

            const result = productionStyle.createSuccessEmbed(
                'KICK',
                { tag: userTag, id: userId },
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
                            'KICK',
                            { tag: userTag, id: userId },
                            message.author,
                            reason,
                            [
                                { name: 'Command Channel', value: message.channel.toString(), inline: true },
                                { name: 'DM Status', value: dmSent ? 'Sent' : 'Failed', inline: true },
                                { name: 'Member Since', value: joinedTimestamp ? `<t:${Math.floor(joinedTimestamp / 1000)}:F>` : 'Unknown', inline: true },
                                { name: 'Account Created', value: `<t:${Math.floor(accountAge / 1000)}:F>`, inline: true }
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
            console.error('Error executing kick command:', error);
            
            const result = productionStyle.createErrorEmbed(
                'Command Error',
                'Đã xảy ra lỗi khi thực hiện lệnh kick.',
                error.message
            );
            
            await message.reply({ 
                embeds: [result.embed], 
                files: result.attachments 
            });
        }
    }
}; 