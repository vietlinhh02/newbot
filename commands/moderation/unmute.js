const { hasFlexiblePermission } = require('../../utils/permissions');
const productionStyle = require('../../utils/demoStyle');

module.exports = {
    name: 'unmute',
    aliases: ['um'],
    description: 'Unmute một user đã bị mute',
    usage: '!unmute <@user> [lý do]',
    examples: [
        '!unmute @User đã cải thiện',
        '!unmute @User hết thời gian phạt',
        '!unmute @User'
    ],
    permissions: 'helper',
    guildOnly: true,
    category: 'moderation',

    async execute(message, args, client) {
        // Check permissions
        if (!await hasFlexiblePermission(message.member, 'unmute', this.permissions, message.guild.id)) {
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
                'Vui lòng cung cấp user cần unmute.',
                [
                    { name: 'Usage', value: '`!unmute <@user> [reason]`' },
                    { name: 'Example', value: '`!unmute @User đã cải thiện`' },
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

        // Get reason
        const reason = args.slice(1).join(' ') || 'Không có lý do được cung cấp';

        // Permission checks
        if (targetMember.id === message.author.id) {
            const result = productionStyle.createErrorEmbed(
                'Invalid Target',
                'Bạn không thể unmute chính mình!'
            );
            return message.reply({ 
                embeds: [result.embed], 
                files: result.attachments 
            });
        }

        if (targetMember.id === message.guild.ownerId) {
            const result = productionStyle.createErrorEmbed(
                'Invalid Target',
                'Không thể unmute chủ server!'
            );
            return message.reply({ 
                embeds: [result.embed], 
                files: result.attachments 
            });
        }

        try {
            // Check current mute status
            const hasTimeout = targetMember.communicationDisabledUntil && targetMember.communicationDisabledUntil > Date.now();
            const muteRole = message.guild.roles.cache.find(role => 
                role.name.toLowerCase() === 'muted' || role.name.toLowerCase() === 'mute'
            );
            const hasMuteRole = muteRole && targetMember.roles.cache.has(muteRole.id);

            if (!hasTimeout && !hasMuteRole) {
                const result = productionStyle.createWarningEmbed(
                    'User Not Muted',
                    `${targetMember.user.tag} không bị mute!`,
                    [
                        { name: 'Timeout Status', value: 'No active timeout', inline: true },
                        { name: 'Mute Role', value: hasMuteRole ? 'Has mute role' : 'No mute role', inline: true },
                        { name: 'Note', value: 'User is already able to chat normally' }
                    ]
                );
                return message.reply({ 
                    embeds: [result.embed], 
                    files: result.attachments 
                });
            }

            // Unmute actions
            const unmuteActions = [];

            // Remove Discord timeout
            if (hasTimeout) {
                await targetMember.timeout(null, `Unmuted by ${message.author.tag}: ${reason}`);
                unmuteActions.push('Removed timeout');
            }

            // Remove mute role
            if (hasMuteRole) {
                await targetMember.roles.remove(muteRole, `Unmuted by ${message.author.tag}: ${reason}`);
                unmuteActions.push('Removed mute role');
            }

            // Send DM to user
            let dmSent = false;
            try {
                const dmResult = productionStyle.createSuccessEmbed(
                    'You Have Been Unmuted',
                    { tag: message.guild.name },
                    message.author,
                    `Bạn đã được unmute trong **${message.guild.name}**!`,
                    [
                        { name: 'Unmuted By', value: message.author.tag, inline: true },
                        { name: 'Reason', value: reason, inline: true },
                        { name: 'Time', value: `<t:${Math.floor(Date.now() / 1000)}:F>`, inline: true },
                        { name: 'Actions Performed', value: unmuteActions.join(', '), inline: false },
                        { name: 'Status', value: '✅ You can now chat normally', inline: false }
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
                'USER UNMUTED',
                { tag: 'Moderation Action' },
                message.author,
                `${targetMember.user.tag} đã được unmute thành công!`,
                [
                    { name: 'Target User', value: `${targetMember.user.tag}\n(${targetMember.id})`, inline: true },
                    { name: 'Actions Performed', value: unmuteActions.join('\n'), inline: true },
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

            // Log to mod channel if configured
            try {
                const guildSettings = await client.prisma.guildSettings.findUnique({
                    where: { guildId: message.guild.id }
                });

                if (guildSettings?.logChannel) {
                    const logChannel = message.guild.channels.cache.get(guildSettings.logChannel);
                    if (logChannel) {
                        const logResult = productionStyle.createSuccessEmbed(
                            'UNMUTE LOG',
                            { tag: 'Moderation Log' },
                            message.author,
                            `${targetMember.user.tag} has been unmuted`,
                            [
                                { name: 'Target User', value: `${targetMember.user.tag} (${targetMember.id})`, inline: true },
                                { name: 'Moderator', value: `${message.author.tag} (${message.author.id})`, inline: true },
                                { name: 'Channel', value: message.channel.toString(), inline: true },
                                { name: 'Actions Performed', value: unmuteActions.join(', '), inline: true },
                                { name: 'DM Status', value: dmSent ? 'Sent' : 'Failed', inline: true },
                                { name: 'Time', value: `<t:${Math.floor(Date.now() / 1000)}:F>`, inline: true },
                                { name: 'Had Timeout', value: hasTimeout ? 'Yes' : 'No', inline: true },
                                { name: 'Had Mute Role', value: hasMuteRole ? 'Yes' : 'No', inline: true },
                                { name: 'Account Created', value: `<t:${Math.floor(targetMember.user.createdTimestamp / 1000)}:F>`, inline: true },
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
                console.error('Error sending to log channel:', error);
            }

        } catch (error) {
            console.error('Error unmuting user:', error);
            
            const result = productionStyle.createErrorEmbed(
                'Unmute Failed',
                'Không thể unmute user!',
                error.message
            );
            await message.reply({ 
                embeds: [result.embed], 
                files: result.attachments 
            });
        }
    }
}; 