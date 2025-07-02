const { hasFlexiblePermission } = require('../../utils/permissions');
const productionStyle = require('../../utils/demoStyle');

module.exports = {
    name: 'clear',
    aliases: ['purge', 'delete'],
    description: 'Xóa một số lượng tin nhắn trong kênh',
    usage: '!clear <số lượng> [user]',
    examples: [
        '!clear 10',
        '!clear 50 @User',
        '!clear 25'
    ],
    permissions: 'helper',
    guildOnly: true,
    category: 'moderation',

    async execute(message, args, client) {
        // Check permissions
        if (!await hasFlexiblePermission(message.member, 'clear', this.permissions, message.guild.id)) {
            const result = productionStyle.createErrorEmbed(
                'Permission Denied',
                'Bạn cần quyền **Moderator** hoặc cao hơn để sử dụng lệnh này!'
            );
            return message.reply({ 
                embeds: [result.embed], 
                files: result.attachments 
            });
        }

        // Check if amount provided
        if (!args[0]) {
            const result = productionStyle.createWarningEmbed(
                'Missing Amount',
                'Vui lòng cung cấp số lượng tin nhắn cần xóa.',
                [
                    { name: 'Cách sử dụng', value: '`!clear <số lượng> [user]`' },
                    { name: 'Ví dụ', value: '`!clear 10` - Xóa 10 tin nhắn\n`!clear 50 @User` - Xóa 50 tin nhắn của user' },
                    { name: 'Giới hạn', value: '1-100 tin nhắn' }
                ]
            );
            return message.reply({ 
                embeds: [result.embed], 
                files: result.attachments 
            });
        }

        // Parse amount
        const amount = parseInt(args[0]);
        
        if (isNaN(amount) || amount < 1 || amount > 100) {
            const result = productionStyle.createErrorEmbed(
                'Invalid Amount',
                'Số lượng tin nhắn phải từ 1 đến 100.'
            );
            return message.reply({ 
                embeds: [result.embed], 
                files: result.attachments 
            });
        }

        try {
            // Check if filtering by user
            let targetUser = null;
            if (args[1]) {
                if (message.mentions.users.first()) {
                    targetUser = message.mentions.users.first();
                } else {
                    const userId = args[1].replace(/[<@!>]/g, '');
                    try {
                        targetUser = await client.users.fetch(userId);
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
            }

            // Fetch messages
            const fetchedMessages = await message.channel.messages.fetch({ 
                limit: amount + 1, // +1 for the command message
                before: message.id 
            });

            let messagesToDelete = Array.from(fetchedMessages.values());

            // Filter by user if specified
            if (targetUser) {
                messagesToDelete = messagesToDelete.filter(msg => msg.author.id === targetUser.id);
            }

            // Remove messages older than 14 days (Discord limitation)
            const twoWeeksAgo = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000);
            const validMessages = messagesToDelete.filter(msg => msg.createdAt > twoWeeksAgo);
            const tooOldCount = messagesToDelete.length - validMessages.length;

            if (validMessages.length === 0) {
                const result = productionStyle.createWarningEmbed(
                    'No Messages to Delete',
                    'Không tìm thấy tin nhắn nào để xóa hoặc tất cả tin nhắn đã quá 14 ngày.',
                    [
                        { name: 'Lý do', value: 'Discord không cho phép xóa tin nhắn cũ hơn 14 ngày' }
                    ]
                );
                return message.reply({ 
                    embeds: [result.embed], 
                    files: result.attachments 
                });
            }

            // Delete the command message first
            try {
                await message.delete();
            } catch (error) {
                console.error('Could not delete command message:', error);
            }

            // Bulk delete messages
            let deletedCount = 0;
            if (validMessages.length === 1) {
                // Delete single message
                await validMessages[0].delete();
                deletedCount = 1;
            } else {
                // Bulk delete
                const deleted = await message.channel.bulkDelete(validMessages, true);
                deletedCount = deleted.size;
            }

            // Success message với production style
            const additionalFields = [
                { name: 'Messages Deleted', value: `${deletedCount} tin nhắn`, inline: true },
                { name: 'Channel', value: message.channel.toString(), inline: true },
                { name: 'Performed By', value: message.author.tag, inline: true }
            ];

            if (targetUser) {
                additionalFields.push({
                    name: 'Filtered User',
                    value: targetUser.tag,
                    inline: true
                });
            }

            if (tooOldCount > 0) {
                additionalFields.push({
                    name: 'Old Messages Skipped',
                    value: `${tooOldCount} tin nhắn quá cũ (>14 ngày)`,
                    inline: false
                });
            }

            const result = productionStyle.createSuccessEmbed(
                'CLEAR',
                targetUser || { tag: 'All users' },
                message.author,
                `Xóa ${deletedCount} tin nhắn${targetUser ? ` của ${targetUser.tag}` : ''}`,
                additionalFields
            );

            // Send confirmation and auto-delete after 5 seconds
            const confirmMsg = await message.channel.send({ 
                embeds: [result.embed], 
                files: result.attachments 
            });
            
            setTimeout(async () => {
                try {
                    await confirmMsg.delete();
                } catch (error) {
                    console.error('Could not delete confirmation message:', error);
                }
            }, 5000);

            // Log to mod channel if configured (giữ nguyên logic logging)
            try {
                const guildSettings = await client.prisma.guildSettings.findUnique({
                    where: { guildId: message.guild.id }
                });

                if (guildSettings?.logChannel) {
                    const logChannel = message.guild.channels.cache.get(guildSettings.logChannel);
                    if (logChannel && logChannel.id !== message.channel.id) {
                        const logResult = productionStyle.createSuccessEmbed(
                            'CLEAR',
                            targetUser || { tag: 'All users' },
                            message.author,
                            `Cleared ${deletedCount} messages`,
                            [
                                { name: 'Command Channel', value: message.channel.toString(), inline: true },
                                { name: 'Messages Deleted', value: `${deletedCount}`, inline: true },
                                { name: 'Filtered User', value: targetUser ? targetUser.tag : 'None', inline: true },
                                { name: 'Old Messages Skipped', value: `${tooOldCount}`, inline: true }
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
            console.error('Error executing clear command:', error);
            
            const result = productionStyle.createErrorEmbed(
                'Command Error',
                'Đã xảy ra lỗi khi thực hiện lệnh clear.',
                error.message
            );
            
            await message.reply({ 
                embeds: [result.embed], 
                files: result.attachments 
            });
        }
    }
}; 