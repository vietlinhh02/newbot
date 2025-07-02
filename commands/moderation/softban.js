const { hasFlexiblePermission } = require('../../utils/permissions');
const productionStyle = require('../../utils/demoStyle');
const logger = require('../../utils/logger');

module.exports = {
    name: 'softban',
    description: 'Softban một người dùng (ban rồi unban để xóa tin nhắn)',
    aliases: ['sb'],
    usage: '!softban <@user|userID> [reason] [delete_days]',
    category: 'moderation',
    permissions: 'admin',
    guildOnly: true,
    examples: [
        '!softban @spammer Spam messages',
        '!softban 123456789 Inappropriate content 3',
        '!softban @user Clean history'
    ],

    async execute(message, args, client) {
        try {
            // Check permissions
            if (!await hasFlexiblePermission(message.member, 'softban', this.permissions, message.guild.id)) {
                const result = productionStyle.createErrorEmbed(
                    'Permission Denied',
                    'Bạn cần quyền **Admin** để sử dụng lệnh này.'
                );
                return message.reply({ 
                    embeds: [result.embed], 
                    files: result.attachments 
                });
            }

            // Check if user is provided
            if (!args[0]) {
                const result = productionStyle.createWarningEmbed(
                    'Missing User Information',
                    'Vui lòng cung cấp người dùng cần softban.',
                    [
                        { name: 'Usage', value: '`!softban <@user|userID> [reason] [delete_days]`' },
                        { name: 'Examples', value: '`!softban @spammer Spam messages`\n`!softban 123456789 Inappropriate content 3`' },
                        { name: 'Note', value: 'Softban will ban then immediately unban to delete messages' }
                    ]
                );
                return message.reply({ 
                    embeds: [result.embed], 
                    files: result.attachments 
                });
            }

            // Parse arguments
            const userArg = args[0];
            const reason = args.slice(1).join(' ') || 'Không có lý do';
            const deleteDays = Math.min(Math.max(parseInt(args[args.length - 1]) || 1, 0), 7);

            // Get target user
            let targetUser;
            const userIdMatch = userArg.match(/^(?:<@!?)?(\d+)>?$/);
            
            if (userIdMatch) {
                const userId = userIdMatch[1];
                try {
                    targetUser = await client.users.fetch(userId);
                } catch (error) {
                    const result = productionStyle.createErrorEmbed(
                        'User Not Found',
                        'Không tìm thấy người dùng với ID này!',
                        'Please provide a valid user ID or mention'
                    );
                    return message.reply({ 
                        embeds: [result.embed], 
                        files: result.attachments 
                    });
                }
            } else {
                const result = productionStyle.createErrorEmbed(
                    'Invalid User Format',
                    'Vui lòng mention user hoặc cung cấp User ID hợp lệ!',
                    'Format: @user or 123456789012345678'
                );
                return message.reply({ 
                    embeds: [result.embed], 
                    files: result.attachments 
                });
            }

            // Get target member if in guild
            let targetMember = null;
            try {
                targetMember = await message.guild.members.fetch(targetUser.id);
            } catch (error) {
                // User not in guild, can still softban by ID
            }

            // Check permissions hierarchy
            if (targetMember) {
                if (targetMember.id === message.author.id) {
                    const result = productionStyle.createErrorEmbed(
                        'Invalid Target',
                        'Bạn không thể softban chính mình.'
                    );
                    return message.reply({ 
                        embeds: [result.embed], 
                        files: result.attachments 
                    });
                }

                if (targetMember.id === message.guild.ownerId) {
                    const result = productionStyle.createErrorEmbed(
                        'Invalid Target',
                        'Không thể softban chủ server.'
                    );
                    return message.reply({ 
                        embeds: [result.embed], 
                        files: result.attachments 
                    });
                }

                if (targetMember.roles.highest.position >= message.member.roles.highest.position && message.author.id !== message.guild.ownerId) {
                    const result = productionStyle.createErrorEmbed(
                        'Role Hierarchy Error',
                        'Bạn không thể softban người có role cao hơn hoặc bằng bạn.'
                    );
                    return message.reply({ 
                        embeds: [result.embed], 
                        files: result.attachments 
                    });
                }

                if (!targetMember.bannable) {
                    const result = productionStyle.createErrorEmbed(
                        'Cannot Softban User',
                        'Bot không có quyền softban người dùng này (role quá cao).'
                    );
                    return message.reply({ 
                        embeds: [result.embed], 
                        files: result.attachments 
                    });
                }
            }

            // Check bot permissions
            if (!message.guild.members.me.permissions.has('BanMembers')) {
                const result = productionStyle.createErrorEmbed(
                    'Bot Missing Permissions',
                    'Bot cần quyền **Ban Members** để thực hiện lệnh này.',
                    'Grant the Ban Members permission to the bot'
                );
                return message.reply({ 
                    embeds: [result.embed], 
                    files: result.attachments 
                });
            }

            // Send DM before softban
            let dmSent = false;
            try {
                const dmResult = productionStyle.createWarningEmbed(
                    'You Have Been Softbanned',
                    { tag: message.guild.name },
                    message.author,
                    `Bạn đã bị softban khỏi **${message.guild.name}**`,
                    [
                        { name: 'Reason', value: reason, inline: true },
                        { name: 'Softbanned By', value: message.author.tag, inline: true },
                        { name: 'Messages Deleted', value: `${deleteDays} days`, inline: true },
                        { name: 'Status', value: 'You can rejoin the server immediately', inline: false },
                        { name: 'Note', value: 'Your messages have been cleared but you are not permanently banned' }
                    ]
                );

                await targetUser.send({ 
                    embeds: [dmResult.embed], 
                    files: dmResult.attachments 
                });
                dmSent = true;
            } catch (error) {
                console.log(`Không thể gửi DM cho ${targetUser.tag}:`, error.message);
            }

            // Perform softban (ban then unban)
            try {
                // Ban user
                await message.guild.members.ban(targetUser.id, {
                    deleteMessageDays: deleteDays,
                    reason: `[SOFTBAN] ${reason} | By: ${message.author.tag}`
                });

                // Immediately unban
                await message.guild.members.unban(targetUser.id, `Softban unban | By: ${message.author.tag}`);

                // Success message
                const result = productionStyle.createSuccessEmbed(
                    'USER SOFTBANNED',
                    { tag: 'Moderation Action' },
                    message.author,
                    `${targetUser.tag} đã bị softban thành công!`,
                    [
                        { name: 'Target User', value: `${targetUser.tag}\n(${targetUser.id})`, inline: true },
                        { name: 'Messages Deleted', value: `${deleteDays} days`, inline: true },
                        { name: 'DM Sent', value: dmSent ? '✅ Success' : '❌ Failed', inline: true },
                        { name: 'Moderator', value: message.author.tag, inline: true },
                        { name: 'Channel', value: message.channel.toString(), inline: true },
                        { name: 'Status', value: '✅ Can rejoin immediately', inline: true },
                        { name: 'Reason', value: reason, inline: false }
                    ]
                );

                const successMsg = await message.reply({ 
                    embeds: [result.embed], 
                    files: result.attachments 
                });

                // Auto delete confirmation after 10 seconds
                setTimeout(() => {
                    successMsg.delete().catch(() => {});
                }, 10000);

                // Log to mod channel
                try {
                    const guildSettings = await client.prisma.guildSettings.findUnique({
                        where: { guildId: message.guild.id }
                    });

                    if (guildSettings?.logChannel) {
                        const logChannel = message.guild.channels.cache.get(guildSettings.logChannel);
                        if (logChannel) {
                            const logResult = productionStyle.createWarningEmbed(
                                'SOFTBAN LOG',
                                { tag: 'Moderation Log' },
                                message.author,
                                `${targetUser.tag} has been softbanned`,
                                [
                                    { name: 'Target User', value: `${targetUser.tag} (${targetUser.id})`, inline: true },
                                    { name: 'Moderator', value: `${message.author.tag} (${message.author.id})`, inline: true },
                                    { name: 'Channel', value: message.channel.toString(), inline: true },
                                    { name: 'Messages Deleted', value: `${deleteDays} days`, inline: true },
                                    { name: 'DM Status', value: dmSent ? 'Sent' : 'Failed', inline: true },
                                    { name: 'Time', value: `<t:${Math.floor(Date.now() / 1000)}:F>`, inline: true },
                                    { name: 'Reason', value: reason, inline: false }
                                ]
                            );

                            await logChannel.send({ 
                                embeds: [logResult.embed], 
                                files: logResult.attachments 
                            });
                        }
                    }
                } catch (error) {
                    logger.error('Error sending softban log', error);
                }

                logger.command(message.author, `softban ${targetUser.tag}`, message.guild);

            } catch (banError) {
                console.error('Error during softban:', banError);
                
                let errorMessage = 'Softban Failed';
                let errorDetail = 'Không thể thực hiện softban!';
                
                if (banError.code === 10013) {
                    errorDetail = 'Người dùng không tồn tại!';
                } else if (banError.code === 50013) {
                    errorDetail = 'Bot không có quyền ban người dùng này!';
                } else if (banError.code === 10007) {
                    errorDetail = 'Người dùng không tồn tại!';
                }

                const result = productionStyle.createErrorEmbed(
                    errorMessage,
                    errorDetail,
                    banError.message
                );
                await message.reply({ 
                    embeds: [result.embed], 
                    files: result.attachments 
                });
            }

        } catch (error) {
            logger.error('Error in softban command', error);
            
            const result = productionStyle.createErrorEmbed(
                'Command Error',
                'Đã xảy ra lỗi khi thực hiện lệnh softban!',
                error.message
            );
            await message.reply({ 
                embeds: [result.embed], 
                files: result.attachments 
            });
        }
    }
}; 