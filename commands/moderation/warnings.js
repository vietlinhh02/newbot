const { hasFlexiblePermission } = require('../../utils/permissions');
const productionStyle = require('../../utils/demoStyle');

module.exports = {
    name: 'warnings',
    aliases: ['warns', 'viewwarns'],
    description: 'Xem danh sách cảnh báo của một user',
    usage: '!warnings <@user>',
    examples: [
        '!warnings @User',
        '!warns @User',
        '!warnings 123456789012345678'
    ],
    permissions: 'helper',
    guildOnly: true,
    category: 'moderation',

    async execute(message, args, client) {
        // Check permissions
        if (!await hasFlexiblePermission(message.member, 'warnings', this.permissions, message.guild.id)) {
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
                'Missing User Information',
                'Vui lòng cung cấp user cần xem cảnh báo.',
                [
                    { name: 'Usage', value: '`!warnings <@user>`' },
                    { name: 'Example', value: '`!warnings @User`' },
                    { name: 'Note', value: 'You can use User ID instead of mention' }
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
        const userId = args[0].replace(/[<@!>]/g, '');

        if (userMention) {
            targetMember = userMention;
        } else {
            try {
                targetMember = await message.guild.members.fetch(userId);
            } catch (error) {
                const result = productionStyle.createErrorEmbed(
                    'User Not Found',
                    'Không tìm thấy user trong server này!',
                    'Please provide a valid user mention or ID'
                );
                return message.reply({ 
                    embeds: [result.embed], 
                    files: result.attachments 
                });
            }
        }

        try {
            // Get warnings from database
            const warnings = await client.prisma.warn.findMany({
                where: {
                    userId: targetMember.id,
                    guildId: message.guild.id
                },
                orderBy: {
                    warnedAt: 'desc'
                }
            });

            if (warnings.length === 0) {
                const result = productionStyle.createSuccessEmbed(
                    'No Warnings Found',
                    { tag: 'Clean Record' },
                    message.author,
                    `${targetMember.user.tag} không có cảnh báo nào!`,
                    [
                        { name: 'User', value: `${targetMember.user.tag}\n(${targetMember.id})`, inline: true },
                        { name: 'Total Warnings', value: '0', inline: true },
                        { name: 'Status', value: '✅ Clean record', inline: true },
                        { name: 'Account Created', value: `<t:${Math.floor(targetMember.user.createdTimestamp / 1000)}:F>`, inline: true },
                        { name: 'Joined Server', value: `<t:${Math.floor(targetMember.joinedTimestamp / 1000)}:F>`, inline: true },
                        { name: 'Note', value: 'This user has maintained good behavior', inline: false }
                    ]
                );
                return message.reply({ 
                    embeds: [result.embed], 
                    files: result.attachments 
                });
            }

            // Format warnings for display
            const warningList = [];
            const maxDisplay = 10; // Limit displayed warnings to prevent embed overflow

            for (let i = 0; i < Math.min(warnings.length, maxDisplay); i++) {
                const warning = warnings[i];
                const warningDate = new Date(warning.warnedAt);
                const timeAgo = `<t:${Math.floor(warningDate.getTime() / 1000)}:R>`;
                
                // Get moderator info
                let moderatorName = 'Unknown Moderator';
                if (warning.warnedBy) {
                    try {
                        const moderator = await client.users.fetch(warning.warnedBy);
                        moderatorName = moderator.tag;
                    } catch (error) {
                        moderatorName = `Unknown (${warning.warnedBy})`;
                    }
                }

                const warningText = `**Warning #${i + 1}** ${timeAgo}\n` +
                    `**Reason:** ${warning.reason}\n` +
                    `**Moderator:** ${moderatorName}`;
                
                warningList.push(warningText);
            }

            // Calculate warning stats
            const totalWarnings = warnings.length;
            const recentWarnings = warnings.filter(w => Date.now() - new Date(w.warnedAt).getTime() < 7 * 24 * 60 * 60 * 1000).length; // Last 7 days
            const oldestWarning = warnings[warnings.length - 1];
            const newestWarning = warnings[0];

            const fields = [
                { name: 'User Information', value: `${targetMember.user.tag}\n(${targetMember.id})`, inline: true },
                { name: 'Total Warnings', value: `${totalWarnings}`, inline: true },
                { name: 'Recent (7 days)', value: `${recentWarnings}`, inline: true },
                { name: 'First Warning', value: `<t:${Math.floor(new Date(oldestWarning.warnedAt).getTime() / 1000)}:F>`, inline: true },
                { name: 'Latest Warning', value: `<t:${Math.floor(new Date(newestWarning.warnedAt).getTime() / 1000)}:F>`, inline: true },
                { name: 'Account Age', value: `<t:${Math.floor(targetMember.user.createdTimestamp / 1000)}:R>`, inline: true }
            ];

            // Add warnings list
            if (warningList.length > 0) {
                const warningsText = warningList.slice(0, 5).join('\n\n'); // Show first 5 warnings
                fields.push({ 
                    name: `Warning History (Showing ${Math.min(5, warningList.length)}/${totalWarnings})`, 
                    value: warningsText, 
                    inline: false 
                });

                if (totalWarnings > 5) {
                    fields.push({ 
                        name: 'Additional Warnings', 
                        value: `... and ${totalWarnings - 5} more warnings. Use database or detailed logs for complete history.`, 
                        inline: false 
                    });
                }
            }

            // Determine warning level
            let warningLevel = 'Low Risk';
            let embedType = 'createInfoEmbed';
            
            if (totalWarnings >= 10) {
                warningLevel = 'High Risk';
                embedType = 'createErrorEmbed';
            } else if (totalWarnings >= 5) {
                warningLevel = 'Medium Risk';
                embedType = 'createWarningEmbed';
            } else if (recentWarnings >= 3) {
                warningLevel = 'Recent Activity';
                embedType = 'createWarningEmbed';
            }

            fields.push({ 
                name: 'Risk Assessment', 
                value: `**Level:** ${warningLevel}\n**Score:** ${totalWarnings}/∞`, 
                inline: true 
            });

            const result = productionStyle[embedType](
                'USER WARNING HISTORY',
                { tag: 'Moderation Records' },
                message.author,
                `Warning history for ${targetMember.user.tag}`,
                fields
            );

            await message.reply({ 
                embeds: [result.embed], 
                files: result.attachments 
            });

        } catch (error) {
            console.error('Error fetching warnings:', error);
            
            const result = productionStyle.createErrorEmbed(
                'Database Error',
                'Không thể lấy danh sách cảnh báo!',
                error.message
            );
            await message.reply({ 
                embeds: [result.embed], 
                files: result.attachments 
            });
        }
    }
}; 