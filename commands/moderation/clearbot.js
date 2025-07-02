const { PermissionFlagsBits } = require('discord.js');
const { hasFlexiblePermission } = require('../../utils/permissions');
const productionStyle = require('../../utils/demoStyle');
const logger = require('../../utils/logger');

module.exports = {
    name: 'clearbot',
    aliases: ['clearbots', 'purgebot'],
    description: 'Xóa tin nhắn của bot trong channel',
    usage: '!clearbot [#channel] [số_lượng]',
    examples: [
        '!clearbot',
        '!clearbot 50',
        '!clearbot #general 30'
    ],
    permissions: 'moderator',
    guildOnly: true,
    category: 'moderation',

    async execute(message, args, client) {
        // Check permissions
        if (!await hasFlexiblePermission(message.member, 'clearbot', this.permissions, message.guild.id)) {
            const result = productionStyle.createErrorEmbed(
                'Permission Denied',
                'Bạn cần quyền **Moderator** để xóa tin nhắn bot!'
            );
            return message.reply({ 
                embeds: [result.embed], 
                files: result.attachments 
            });
        }

        // Check bot permissions
        if (!message.guild.members.me.permissions.has([PermissionFlagsBits.ManageMessages, PermissionFlagsBits.ReadMessageHistory])) {
            const result = productionStyle.createErrorEmbed(
                'Bot Missing Permissions',
                'Bot cần quyền **Manage Messages** và **Read Message History**!',
                'Grant these permissions to the bot'
            );
            return message.reply({ 
                embeds: [result.embed], 
                files: result.attachments 
            });
        }

        // Parse arguments
        let targetChannel = message.channel;
        let limit = 100;

        if (args[0]) {
            const channelMention = message.mentions.channels.first();
            if (channelMention) {
                targetChannel = channelMention;
                if (args[1] && !isNaN(args[1])) {
                    limit = Math.min(parseInt(args[1]), 1000);
                }
            } else if (!isNaN(args[0])) {
                limit = Math.min(parseInt(args[0]), 1000);
            }
        }

        // Check channel permissions
        const botPermissions = targetChannel.permissionsFor(message.guild.members.me);
        if (!botPermissions.has([PermissionFlagsBits.ViewChannel, PermissionFlagsBits.ManageMessages])) {
            const result = productionStyle.createErrorEmbed(
                'Channel Permissions Missing',
                `Bot cần quyền trong ${targetChannel}!`,
                'Bot needs View Channel and Manage Messages permissions in target channel'
            );
            return message.reply({ 
                embeds: [result.embed], 
                files: result.attachments 
            });
        }

        try {
            // Fetch messages
            const messages = await targetChannel.messages.fetch({ limit });
            
            // Filter bot messages (messages from bots)
            const botMessages = messages.filter(msg => msg.author.bot);
            
            if (botMessages.size === 0) {
                const result = productionStyle.createWarningEmbed(
                    'No Bot Messages Found',
                    `Không tìm thấy tin nhắn bot nào trong ${limit} tin nhắn gần đây!`,
                    [
                        { name: 'Channel', value: targetChannel.toString(), inline: true },
                        { name: 'Messages Checked', value: `${messages.size}`, inline: true },
                        { name: 'Bot Messages Found', value: '0', inline: true }
                    ]
                );
                return message.reply({ 
                    embeds: [result.embed], 
                    files: result.attachments 
                });
            }

            // Split messages by age (Discord API limitation: can't bulk delete messages older than 14 days)
            const twoWeeksAgo = Date.now() - 14 * 24 * 60 * 60 * 1000;
            const recentMessages = [];
            const oldMessages = [];

            botMessages.forEach(msg => {
                if (msg.createdTimestamp > twoWeeksAgo) {
                    recentMessages.push(msg);
                } else {
                    oldMessages.push(msg);
                }
            });

            let deletedCount = 0;
            let bulkDeletedCount = 0;
            let individualDeletedCount = 0;

            // Bulk delete recent messages
            if (recentMessages.length > 0) {
                if (recentMessages.length === 1) {
                    await recentMessages[0].delete();
                    individualDeletedCount = 1;
                } else {
                    await targetChannel.bulkDelete(recentMessages);
                    bulkDeletedCount = recentMessages.length;
                }
                deletedCount += recentMessages.length;
            }

            // Individual delete old messages
            for (const msg of oldMessages) {
                try {
                    await msg.delete();
                    individualDeletedCount++;
                    deletedCount++;
                    // Add small delay to avoid rate limits
                    await new Promise(resolve => setTimeout(resolve, 100));
                } catch (error) {
                    console.log(`Không thể xóa tin nhắn cũ: ${error.message}`);
                }
            }

            // Success message
            const fields = [
                { name: 'Channel', value: targetChannel.toString(), inline: true },
                { name: 'Bot Messages Deleted', value: `${deletedCount}`, inline: true },
                { name: 'Messages Checked', value: `${messages.size}`, inline: true },
                { name: 'Bulk Deleted', value: `${bulkDeletedCount}`, inline: true },
                { name: 'Individual Deleted', value: `${individualDeletedCount}`, inline: true },
                { name: 'Moderator', value: message.author.tag, inline: true }
            ];

            const result = productionStyle.createSuccessEmbed(
                'BOT MESSAGES CLEARED',
                { tag: 'Moderation Action' },
                message.author,
                `Đã xóa ${deletedCount} tin nhắn bot thành công!`,
                fields
            );

            const successMsg = await message.reply({ 
                embeds: [result.embed], 
                files: result.attachments 
            });

            // Auto delete success message after 10 seconds
            setTimeout(() => {
                successMsg.delete().catch(() => {});
            }, 10000);

            // Log to moderation channel
            try {
                const guildSettings = await client.prisma.guildSettings.findUnique({
                    where: { guildId: message.guild.id }
                });

                if (guildSettings?.logChannel) {
                    const logChannel = message.guild.channels.cache.get(guildSettings.logChannel);
                    if (logChannel && logChannel.id !== targetChannel.id) {
                        const logResult = productionStyle.createInfoEmbed(
                            'CLEARBOT LOG',
                            { tag: 'Moderation Log' },
                            message.author,
                            `Bot messages cleared in ${targetChannel.name}`,
                            [
                                { name: 'Target Channel', value: targetChannel.toString(), inline: true },
                                { name: 'Moderator', value: `${message.author.tag} (${message.author.id})`, inline: true },
                                { name: 'Command Channel', value: message.channel.toString(), inline: true },
                                { name: 'Messages Deleted', value: `${deletedCount}`, inline: true },
                                { name: 'Messages Scanned', value: `${messages.size}`, inline: true },
                                { name: 'Time', value: `<t:${Math.floor(Date.now() / 1000)}:F>`, inline: true },
                                { name: 'Method Used', value: `Bulk: ${bulkDeletedCount}, Individual: ${individualDeletedCount}`, inline: false }
                            ]
                        );

                        await logChannel.send({ 
                            embeds: [logResult.embed], 
                            files: logResult.attachments 
                        });
                    }
                }
            } catch (error) {
                console.error('Error sending clearbot log:', error);
            }

            logger.command(message.author, `clearbot ${deletedCount} messages`, message.guild);

        } catch (error) {
            console.error('Error in clearbot:', error);
            
            const result = productionStyle.createErrorEmbed(
                'Clear Bot Messages Failed',
                'Không thể xóa tin nhắn bot!',
                error.message
            );
            await message.reply({ 
                embeds: [result.embed], 
                files: result.attachments 
            });
        }
    }
}; 