const { hasFlexiblePermission } = require('../../utils/permissions');
const productionStyle = require('../../utils/demoStyle');
const logger = require('../../utils/logger');

module.exports = {
    name: 'purge',
    description: 'Xóa tin nhắn của một người dùng cụ thể trong channel',
    aliases: ['purgeuser', 'pu'],
    usage: '!purge <@user|userID> [amount] [channel]',
    category: 'moderation',
    permissions: 'admin',
    guildOnly: true,
    examples: [
        '!purge @spammer 50',
        '!purge 123456789 25',
        '!purge @user 100 #general'
    ],

    async execute(message, args, client) {
        try {
            // Check permissions
            if (!await hasFlexiblePermission(message.member, 'purge', this.permissions, message.guild.id)) {
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
                const embed = embedFactory.error(
                    'Thiếu thông tin!',
                    'Vui lòng cung cấp người dùng cần purge.\n\n**Cách dùng:** `!purge <@user|userID> [amount] [channel]`'
                );
                return message.reply({ embeds: [embed] });
            }

            // Parse arguments
            const userArg = args[0];
            const amount = Math.min(Math.max(parseInt(args[1]) || 50, 1), 1000);
            const channelArg = args[2];

            // Get target user
            let targetUser;
            const userIdMatch = userArg.match(/^(?:<@!?)?(\d+)>?$/);
            
            if (userIdMatch) {
                const userId = userIdMatch[1];
                try {
                    targetUser = await client.users.fetch(userId);
                } catch (error) {
                    const embed = embedFactory.error(
                        'Người dùng không tồn tại!',
                        `Không thể tìm thấy người dùng với ID: ${userId}`
                    );
                    return message.reply({ embeds: [embed] });
                }
            } else {
                const embed = embedFactory.error(
                    'ID không hợp lệ!',
                    'Vui lòng cung cấp mention hoặc ID người dùng hợp lệ.'
                );
                return message.reply({ embeds: [embed] });
            }

            // Get target channel
            let targetChannel = message.channel;
            if (channelArg) {
                const channelIdMatch = channelArg.match(/^(?:<#)?(\d+)>?$/);
                if (channelIdMatch) {
                    const channelId = channelIdMatch[1];
                    targetChannel = message.guild.channels.cache.get(channelId);
                    if (!targetChannel) {
                        const embed = embedFactory.error(
                            'Channel không tồn tại!',
                            `Không thể tìm thấy channel với ID: ${channelId}`
                        );
                        return message.reply({ embeds: [embed] });
                    }
                }
            }

            // Check bot permissions
            if (!targetChannel.permissionsFor(message.guild.members.me).has(['ManageMessages', 'ReadMessageHistory'])) {
                const embed = embedFactory.error(
                    'Bot thiếu quyền!',
                    `Bot cần quyền **Manage Messages** và **Read Message History** trong ${targetChannel}.`
                );
                return message.reply({ embeds: [embed] });
            }

            // Check if channel is text-based
            if (!targetChannel.isTextBased()) {
                const embed = embedFactory.error(
                    'Channel không hợp lệ!',
                    'Chỉ có thể purge tin nhắn trong text channels.'
                );
                return message.reply({ embeds: [embed] });
            }

            // Send loading message
            const loadingEmbed = embedFactory.info(
                'Đang tìm kiếm tin nhắn...',
                `🔍 Đang tìm tin nhắn của **${targetUser.tag}** trong ${targetChannel}...`
            );
            const loadingMsg = await message.reply({ embeds: [loadingEmbed] });

            try {
                // Fetch messages
                let messagesFound = [];
                let lastMessageId = null;
                let totalChecked = 0;
                const maxCheck = Math.min(amount * 10, 5000); // Don't check more than 5k messages

                while (messagesFound.length < amount && totalChecked < maxCheck) {
                    const fetchOptions = { limit: 100 };
                    if (lastMessageId) {
                        fetchOptions.before = lastMessageId;
                    }

                    const messages = await targetChannel.messages.fetch(fetchOptions);
                    if (messages.size === 0) break;

                    // Filter messages from target user
                    const userMessages = messages.filter(msg => 
                        msg.author.id === targetUser.id && 
                        Date.now() - msg.createdTimestamp < 1209600000 // 14 days limit
                    );

                    messagesFound.push(...userMessages.values());
                    totalChecked += messages.size;
                    lastMessageId = messages.last()?.id;

                    // Update progress
                    if (totalChecked % 500 === 0) {
                        const progressEmbed = embedFactory.info(
                            'Đang tìm kiếm tin nhắn...',
                            `🔍 Đã kiểm tra ${totalChecked} tin nhắn, tìm thấy ${messagesFound.length} từ **${targetUser.tag}**...`
                        );
                        await loadingMsg.edit({ embeds: [progressEmbed] });
                    }
                }

                // Limit to requested amount
                messagesFound = messagesFound.slice(0, amount);

                if (messagesFound.length === 0) {
                    const embed = embedFactory.warning(
                        'Không tìm thấy tin nhắn!',
                        `Không tìm thấy tin nhắn nào của **${targetUser.tag}** trong ${targetChannel}.\n\n**Lưu ý:** Chỉ có thể xóa tin nhắn trong vòng 14 ngày.`
                    );
                    return loadingMsg.edit({ embeds: [embed] });
                }

                // Delete messages in batches
                let deletedCount = 0;
                const batchSize = 100;

                for (let i = 0; i < messagesFound.length; i += batchSize) {
                    const batch = messagesFound.slice(i, i + batchSize);
                    
                    if (batch.length === 1) {
                        // Single message
                        await batch[0].delete();
                        deletedCount++;
                    } else {
                        // Bulk delete (only works for messages < 14 days old)
                        try {
                            await targetChannel.bulkDelete(batch, true);
                            deletedCount += batch.length;
                        } catch (error) {
                            // Fallback to individual deletion
                            for (const msg of batch) {
                                try {
                                    await msg.delete();
                                    deletedCount++;
                                    await new Promise(resolve => setTimeout(resolve, 100)); // Rate limit
                                } catch (deleteError) {
                                    // Skip if can't delete
                                }
                            }
                        }
                    }

                    // Update progress for large deletions
                    if (messagesFound.length > 50 && (i + batchSize) % 200 === 0) {
                        const progressEmbed = embedFactory.info(
                            'Đang xóa tin nhắn...',
                            `🗑️ Đã xóa ${deletedCount}/${messagesFound.length} tin nhắn...`
                        );
                        await loadingMsg.edit({ embeds: [progressEmbed] });
                    }
                }

                // Success response
                const embed = embedFactory.success(
                    'Purge thành công!',
                    `**Đã xóa:** ${deletedCount} tin nhắn\n**Người dùng:** ${targetUser.tag} (\`${targetUser.id}\`)\n**Channel:** ${targetChannel}\n**Tin nhắn đã kiểm tra:** ${totalChecked.toLocaleString()}`
                );

                await loadingMsg.edit({ embeds: [embed] });

                // Auto delete confirmation after 10 seconds
                setTimeout(() => {
                    loadingMsg.delete().catch(() => {});
                }, 10000);

                // Log to mod channel
                try {
                    const guildSettings = await client.prisma.guildSettings.findUnique({
                        where: { guildId: message.guild.id }
                    });

                    if (guildSettings?.logChannel) {
                        const logChannel = message.guild.channels.cache.get(guildSettings.logChannel);
                        if (logChannel) {
                            const logEmbed = embedFactory.moderation({
                                action: 'Message Purge',
                                targetUser,
                                moderator: message.author,
                                reason: `Purged ${deletedCount} messages from user`,
                                channel: targetChannel.toString(),
                                fields: [
                                    {
                                        name: '🗑️ Messages Deleted:',
                                        value: deletedCount.toString(),
                                        inline: true
                                    },
                                    {
                                        name: '🔍 Messages Checked:',
                                        value: totalChecked.toLocaleString(),
                                        inline: true
                                    }
                                ]
                            });

                            await logChannel.send({ embeds: [logEmbed] });
                        }
                    }
                } catch (error) {
                    logger.error('Error sending purge log', error);
                }

                logger.command(message.author, `purge ${targetUser.tag} ${deletedCount}`, message.guild);

            } catch (error) {
                logger.error('Purge execution error', error);
                
                let errorMsg = 'Đã xảy ra lỗi khi xóa tin nhắn.';
                if (error.code === 50013) {
                    errorMsg = 'Bot không có quyền xóa tin nhắn trong channel này.';
                } else if (error.code === 50034) {
                    errorMsg = 'Không thể xóa tin nhắn cũ hơn 14 ngày.';
                }

                const embed = embedFactory.error(
                    'Lỗi Purge!',
                    errorMsg,
                    error.message
                );
                await loadingMsg.edit({ embeds: [embed] });
            }

        } catch (error) {
            logger.error('Purge command error', error);
            const embed = embedFactory.error(
                'Lỗi hệ thống!',
                'Đã xảy ra lỗi khi thực thi lệnh purge.',
                error.message
            );
            await message.reply({ embeds: [embed] });
        }
    }
}; 