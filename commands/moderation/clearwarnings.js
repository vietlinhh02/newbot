const { hasFlexiblePermission } = require('../../utils/permissions');
const productionStyle = require('../../utils/demoStyle');

module.exports = {
    name: 'clearwarnings',
    aliases: ['clearwarns'],
    description: 'Xóa tất cả cảnh báo của một người dùng',
    usage: '!clearwarnings [@user] [reason]',
    examples: [
        '!clearwarnings @User',
        '!clearwarnings @User Reformed behavior'
    ],
    permissions: 'admin',
    guildOnly: true,
    category: 'moderation',
    
    async execute(message, args, client) {
        // Check permissions
        if (!await hasFlexiblePermission(message.member, 'clearwarnings', this.permissions, message.guild.id)) {
            const result = productionStyle.createErrorEmbed(
                'Permission Denied',
                'Bạn cần quyền **Moderate Members** để sử dụng lệnh này.'
            );
            return message.reply({ 
                embeds: [result.embed], 
                files: result.attachments 
            });
        }

        // Check if user mentioned or provided ID
        if (!args[0]) {
            const result = productionStyle.createWarningEmbed(
                'Missing User Information',
                'Vui lòng mention user hoặc cung cấp User ID!',
                [
                    { name: 'Usage', value: '`!clearwarnings [@user|userID] [reason]`' },
                    { name: 'Example', value: '`!clearwarnings @User Reformed behavior`' },
                    { name: 'Note', value: 'Reason is optional but recommended for logs' }
                ]
            );
            return message.reply({ 
                embeds: [result.embed], 
                files: result.attachments 
            });
        }
        
        // Get target member
        let targetMember;
        const userMention = message.mentions.members.first();
        const userID = args[0].replace(/[<@!>]/g, '');
        
        if (userMention) {
            targetMember = userMention;
        } else {
            try {
                targetMember = await message.guild.members.fetch(userID);
            } catch (error) {
                const result = productionStyle.createErrorEmbed(
                    'User Not Found',
                    'Không tìm thấy user trong server này!',
                    'Make sure the user ID is correct and the user is in this server'
                );
                return message.reply({ 
                    embeds: [result.embed], 
                    files: result.attachments 
                });
            }
        }

        // Permission checks
        if (targetMember.id === message.author.id) {
            const result = productionStyle.createErrorEmbed(
                'Invalid Target',
                'Bạn không thể xóa cảnh báo của chính mình!'
            );
            return message.reply({ 
                embeds: [result.embed], 
                files: result.attachments 
            });
        }

        if (targetMember.id === message.guild.ownerId) {
            const result = productionStyle.createErrorEmbed(
                'Invalid Target', 
                'Không thể xóa cảnh báo của chủ server!'
            );
            return message.reply({ 
                embeds: [result.embed], 
                files: result.attachments 
            });
        }

        // Role hierarchy check
        if (targetMember.roles.highest.position >= message.member.roles.highest.position && message.author.id !== message.guild.ownerId) {
            const result = productionStyle.createErrorEmbed(
                'Role Hierarchy Error',
                'Bạn không thể xóa cảnh báo của người có role cao hơn hoặc bằng bạn!'
            );
            return message.reply({ 
                embeds: [result.embed], 
                files: result.attachments 
            });
        }

        try {
            // Get current warnings
            const currentWarnings = await client.prisma.warn.findMany({
                where: {
                    userId: targetMember.id,
                    guildId: message.guild.id
                },
                orderBy: {
                    warnedAt: 'desc'
                }
            });

            if (currentWarnings.length === 0) {
                const result = productionStyle.createWarningEmbed(
                    'No Warnings Found',
                    `${targetMember.user.tag} không có cảnh báo nào để xóa.`,
                    [
                        { name: 'Current Warnings', value: '0', inline: true },
                        { name: 'Status', value: 'Clean record', inline: true },
                        { name: 'Note', value: 'User has no warnings to clear', inline: true }
                    ]
                );
                return message.reply({ 
                    embeds: [result.embed], 
                    files: result.attachments 
                });
            }

            // Get reason
            const reason = args.slice(1).join(' ') || 'Không có lý do được cung cấp';

            // Delete all warnings
            await client.prisma.warn.deleteMany({
                where: {
                    userId: targetMember.id,
                    guildId: message.guild.id
                }
            });

            // Send DM to user
            let dmSent = false;
            try {
                const dmResult = productionStyle.createSuccessEmbed(
                    'Warnings Cleared',
                    { tag: message.guild.name },
                    message.author,
                    'Tất cả cảnh báo của bạn đã được xóa!',
                    [
                        { name: 'Warnings Cleared', value: `${currentWarnings.length}`, inline: true },
                        { name: 'Cleared By', value: message.author.tag, inline: true },
                        { name: 'Reason', value: reason, inline: false },
                        { name: 'Server', value: message.guild.name, inline: true },
                        { name: 'Time', value: `<t:${Math.floor(Date.now() / 1000)}:F>`, inline: true }
                    ]
                );

                await targetMember.send({ 
                    embeds: [dmResult.embed], 
                    files: dmResult.attachments 
                });
                dmSent = true;
            } catch (error) {
                console.log(`Không thể gửi DM cho ${targetMember.user.tag}:`, error.message);
            }

            // Success message
            const result = productionStyle.createSuccessEmbed(
                'WARNINGS CLEARED',
                { tag: 'Moderation Action' },
                message.author,
                `Đã xóa thành công ${currentWarnings.length} cảnh báo của ${targetMember.user.tag}`,
                [
                    { name: 'Target User', value: `${targetMember.user.tag}\n(${targetMember.id})`, inline: true },
                    { name: 'Warnings Cleared', value: `${currentWarnings.length}`, inline: true },
                    { name: 'DM Sent', value: dmSent ? '✅ Success' : '❌ Failed', inline: true },
                    { name: 'Moderator', value: message.author.tag, inline: true },
                    { name: 'Channel', value: message.channel.toString(), inline: true },
                    { name: 'Time', value: `<t:${Math.floor(Date.now() / 1000)}:F>`, inline: true },
                    { name: 'Reason', value: reason, inline: false }
                ]
            );

            await message.reply({ 
                embeds: [result.embed], 
                files: result.attachments 
            });

            // Log to moderation channel
            try {
                const guildSettings = await client.prisma.guildSettings.findUnique({
                    where: { guildId: message.guild.id }
                });

                if (guildSettings?.logChannel) {
                    const logChannel = message.guild.channels.cache.get(guildSettings.logChannel);
                    if (logChannel) {
                        const logResult = productionStyle.createInfoEmbed(
                            'WARNINGS CLEARED LOG',
                            { tag: 'Moderation Log' },
                            message.author,
                            `${currentWarnings.length} warnings cleared for ${targetMember.user.tag}`,
                            [
                                { name: 'Target User', value: `${targetMember.user.tag} (${targetMember.id})`, inline: true },
                                { name: 'Warnings Cleared', value: `${currentWarnings.length}`, inline: true },
                                { name: 'Moderator', value: `${message.author.tag} (${message.author.id})`, inline: true },
                                { name: 'Channel', value: message.channel.toString(), inline: true },
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
            } catch (logError) {
                console.error('Lỗi khi gửi log:', logError);
            }

        } catch (error) {
            console.error('Lỗi khi xóa cảnh báo:', error);
            
            const result = productionStyle.createErrorEmbed(
                'Database Error',
                'Không thể xóa cảnh báo từ database!',
                error.message
            );
            await message.reply({ 
                embeds: [result.embed], 
                files: result.attachments 
            });
        }
    }
}; 