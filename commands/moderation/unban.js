const { hasFlexiblePermission } = require('../../utils/permissions');
const productionStyle = require('../../utils/demoStyle');

module.exports = {
    name: 'unban',
    aliases: ['ub'],
    description: 'Unban một user đã bị ban',
    usage: '!unban <userID> [lý do]',
    examples: [
        '!unban 123456789012345678 đã appeal thành công',
        '!unban 987654321098765432 hết thời gian phạt',
        '!unban 111222333444555666'
    ],
    permissions: 'helper',
    guildOnly: true,
    category: 'moderation',

    async execute(message, args, client) {
        // Check permissions
        if (!await hasFlexiblePermission(message.member, 'unban', this.permissions, message.guild.id)) {
            const result = productionStyle.createErrorEmbed(
                'Permission Denied',
                'Bạn cần quyền **Moderator** hoặc cao hơn để sử dụng lệnh này!'
            );
            return message.reply({ 
                embeds: [result.embed], 
                files: result.attachments 
            });
        }

        // Check if user ID provided
        if (!args[0]) {
            const result = productionStyle.createWarningEmbed(
                'Missing User ID',
                'Vui lòng cung cấp User ID của user cần unban.',
                [
                    { name: 'Usage', value: '`!unban <userID> [reason]`' },
                    { name: 'Example', value: '`!unban 123456789012345678 đã appeal`' },
                    { name: 'Note', value: 'Must use User ID, cannot mention banned users' }
                ]
            );
            return message.reply({ 
                embeds: [result.embed], 
                files: result.attachments 
            });
        }

        // Parse user ID
        const userId = args[0].replace(/[<@!>]/g, '');
        if (!/^\d{17,19}$/.test(userId)) {
            const result = productionStyle.createErrorEmbed(
                'Invalid User ID',
                'User ID không hợp lệ!',
                'User ID must be 17-19 digits long'
            );
            return message.reply({ 
                embeds: [result.embed], 
                files: result.attachments 
            });
        }

        // Get reason
        const reason = args.slice(1).join(' ') || 'Không có lý do được cung cấp';

        // Check bot permissions
        if (!message.guild.members.me.permissions.has('BanMembers')) {
            const result = productionStyle.createErrorEmbed(
                'Bot Missing Permissions',
                'Bot cần quyền **Ban Members** để thực hiện lệnh này!',
                'Grant the Ban Members permission to the bot'
            );
            return message.reply({ 
                embeds: [result.embed], 
                files: result.attachments 
            });
        }

        try {
            // Check if user is actually banned
            let banInfo;
            try {
                banInfo = await message.guild.bans.fetch(userId);
            } catch (error) {
                const result = productionStyle.createWarningEmbed(
                    'User Not Banned',
                    'User này không bị ban trong server!',
                    [
                        { name: 'User ID', value: userId },
                        { name: 'Status', value: 'Not banned or invalid ID' },
                        { name: 'Note', value: 'User may not exist or is already unbanned' }
                    ]
                );
                return message.reply({ 
                    embeds: [result.embed], 
                    files: result.attachments 
                });
            }

            // Get user info
            let targetUser;
            try {
                targetUser = await client.users.fetch(userId);
            } catch (error) {
                // User doesn't exist anymore, but we can still unban
                targetUser = {
                    id: userId,
                    tag: `Unknown User (${userId})`,
                    username: 'Unknown User'
                };
            }

            // Remove from tempban database if exists
            try {
                await client.prisma.tempBan.deleteMany({
                    where: {
                        userId: userId,
                        guildId: message.guild.id
                    }
                });
            } catch (error) {
                // No tempban record found, that's fine
            }

            // Perform unban
            await message.guild.members.unban(userId, `Unbanned by ${message.author.tag}: ${reason}`);

            // Success message
            const result = productionStyle.createSuccessEmbed(
                'USER UNBANNED',
                { tag: 'Moderation Action' },
                message.author,
                `${targetUser.tag} đã được unban thành công!`,
                [
                    { name: 'Target User', value: `${targetUser.tag}\n(${targetUser.id})`, inline: true },
                    { name: 'Original Ban Reason', value: banInfo.reason || 'No reason provided', inline: true },
                    { name: 'Unban Reason', value: reason, inline: true },
                    { name: 'Moderator', value: message.author.tag, inline: true },
                    { name: 'Channel', value: message.channel.toString(), inline: true },
                    { name: 'Time', value: `<t:${Math.floor(Date.now() / 1000)}:F>`, inline: true },
                    { name: 'Status', value: '✅ User can now rejoin the server', inline: false }
                ]
            );

            await message.reply({ 
                embeds: [result.embed], 
                files: result.attachments 
            });

            // Log to mod channel if configured
            try {
                const guildSettings = await client.prisma.guildSettings.findUnique({
                    where: { guildId: message.guild.id }
                });

                if (guildSettings?.logChannel) {
                    const logChannel = message.guild.channels.cache.get(guildSettings.logChannel);
                    if (logChannel) {
                        const logResult = productionStyle.createSuccessEmbed(
                            'UNBAN LOG',
                            { tag: 'Moderation Log' },
                            message.author,
                            `${targetUser.tag} has been unbanned`,
                            [
                                { name: 'Target User', value: `${targetUser.tag} (${targetUser.id})`, inline: true },
                                { name: 'Moderator', value: `${message.author.tag} (${message.author.id})`, inline: true },
                                { name: 'Channel', value: message.channel.toString(), inline: true },
                                { name: 'Original Ban Reason', value: banInfo.reason || 'No reason provided', inline: false },
                                { name: 'Unban Reason', value: reason, inline: false },
                                { name: 'Time', value: `<t:${Math.floor(Date.now() / 1000)}:F>`, inline: true },
                                { name: 'User Exists', value: targetUser.username !== 'Unknown User' ? 'Yes' : 'No (Account deleted)', inline: true },
                                { name: 'Tempban Removed', value: 'Yes (if existed)', inline: true }
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
            console.error('Error unbanning user:', error);
            
            let errorMessage = 'Unban Failed';
            let errorDetail = 'Không thể unban user!';
            
            if (error.code === 10013) {
                errorDetail = 'User không tồn tại!';
            } else if (error.code === 50013) {
                errorDetail = 'Bot không có quyền unban!';
            } else if (error.code === 10026) {
                errorDetail = 'User không bị ban!';
            }

            const result = productionStyle.createErrorEmbed(
                errorMessage,
                errorDetail,
                error.message
            );
            await message.reply({ 
                embeds: [result.embed], 
                files: result.attachments 
            });
        }
    }
}; 