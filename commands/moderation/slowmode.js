const { hasFlexiblePermission } = require('../../utils/permissions');
const productionStyle = require('../../utils/demoStyle');

module.exports = {
    name: 'slowmode',
    aliases: ['slow', 'sm'],
    description: 'Thiết lập slowmode cho channel',
    usage: '!slowmode <thời gian> [channel]',
    examples: [
        '!slowmode 5s',
        '!slowmode 30s #general',
        '!slowmode 0 (tắt slowmode)',
        '!slowmode 10m #spam'
    ],
    permissions: 'helper',
    guildOnly: true,
    category: 'moderation',

    async execute(message, args, client) {
        // Check permissions
        if (!await hasFlexiblePermission(message.member, 'slowmode', this.permissions, message.guild.id)) {
            const result = productionStyle.createErrorEmbed(
                'Permission Denied',
                'Bạn cần quyền **Moderator** hoặc cao hơn để sử dụng lệnh này!'
            );
            return message.reply({ 
                embeds: [result.embed], 
                files: result.attachments 
            });
        }

        // Check if time provided
        if (!args[0]) {
            const result = productionStyle.createWarningEmbed(
                'Missing Time Parameter',
                'Vui lòng cung cấp thời gian slowmode.',
                [
                    { name: 'Usage', value: '`!slowmode <thời gian> [channel]`' },
                    { name: 'Time Examples', value: '`5s` - 5 seconds\n`30s` - 30 seconds\n`2m` - 2 minutes\n`0` - disable slowmode' },
                    { name: 'Limit', value: 'Maximum 6 hours (21600 seconds)' }
                ]
            );
            return message.reply({ 
                embeds: [result.embed], 
                files: result.attachments 
            });
        }

        // Parse time argument
        const timeArg = args[0].toLowerCase();
        let seconds = 0;
        
        if (timeArg === '0' || timeArg === 'off' || timeArg === 'disable') {
            seconds = 0;
        } else {
            // Parse time format (5s, 30s, 2m, 1h)
            const timeMatch = timeArg.match(/^(\d+)([smh])?$/);
            if (!timeMatch) {
                const result = productionStyle.createErrorEmbed(
                    'Invalid Time Format',
                    'Định dạng thời gian không hợp lệ!',
                    'Use format: 5s, 30s, 2m, 1h or 0 to disable'
                );
                return message.reply({ 
                    embeds: [result.embed], 
                    files: result.attachments 
                });
            }
            
            const value = parseInt(timeMatch[1]);
            const unit = timeMatch[2] || 's'; // Default to seconds
            
            switch (unit) {
                case 's':
                    seconds = value;
                    break;
                case 'm':
                    seconds = value * 60;
                    break;
                case 'h':
                    seconds = value * 3600;
                    break;
            }
        }

        // Validate time range
        if (seconds < 0 || seconds > 21600) { // Max 6 hours
            const result = productionStyle.createErrorEmbed(
                'Invalid Time Range',
                'Thời gian slowmode phải từ 0 đến 21600 giây (6 giờ)!',
                'Use a value between 0 and 21600 seconds'
            );
            return message.reply({ 
                embeds: [result.embed], 
                files: result.attachments 
            });
        }

        // Get target channel
        let targetChannel = message.channel;
        if (args[1]) {
            const channelMention = message.mentions.channels.first();
            const channelId = args[1].replace(/[<#>]/g, '');
            
            if (channelMention) {
                targetChannel = channelMention;
            } else {
                const foundChannel = message.guild.channels.cache.get(channelId);
                if (foundChannel && foundChannel.isTextBased()) {
                    targetChannel = foundChannel;
                } else {
                    const result = productionStyle.createErrorEmbed(
                        'Channel Not Found',
                        'Không tìm thấy text channel với ID này!',
                        'Please provide a valid channel mention or ID'
                    );
                    return message.reply({ 
                        embeds: [result.embed], 
                        files: result.attachments 
                    });
                }
            }
        }

        // Check if target is text channel
        if (!targetChannel.isTextBased()) {
            const result = productionStyle.createErrorEmbed(
                'Invalid Channel Type',
                'Chỉ có thể set slowmode cho text channel!',
                'Voice channels do not support slowmode'
            );
            return message.reply({ 
                embeds: [result.embed], 
                files: result.attachments 
            });
        }

        // Check bot permissions
        if (!targetChannel.permissionsFor(message.guild.members.me).has('ManageChannels')) {
            const result = productionStyle.createErrorEmbed(
                'Bot Missing Permissions',
                `Bot cần quyền **Manage Channels** trong ${targetChannel}!`,
                'Grant Manage Channels permission to the bot'
            );
            return message.reply({ 
                embeds: [result.embed], 
                files: result.attachments 
            });
        }

        try {
            // Get current slowmode
            const currentSlowmode = targetChannel.rateLimitPerUser;
            
            // Set new slowmode
            await targetChannel.setRateLimitPerUser(seconds, `Slowmode changed by ${message.author.tag}`);

            // Format duration display
            const formatDuration = (sec) => {
                if (sec === 0) return 'Disabled';
                if (sec < 60) return `${sec} seconds`;
                if (sec < 3600) return `${Math.floor(sec / 60)} minutes ${sec % 60} seconds`;
                return `${Math.floor(sec / 3600)} hours ${Math.floor((sec % 3600) / 60)} minutes`;
            };

            // Success response
            const fields = [
                { name: 'Channel', value: targetChannel.toString(), inline: true },
                { name: 'New Slowmode', value: formatDuration(seconds), inline: true },
                { name: 'Previous Slowmode', value: formatDuration(currentSlowmode), inline: true },
                { name: 'Status', value: seconds === 0 ? '⚡ Slowmode disabled' : '🐌 Slowmode enabled', inline: true },
                { name: 'Moderator', value: message.author.tag, inline: true },
                { name: 'Time', value: `<t:${Math.floor(Date.now() / 1000)}:F>`, inline: true }
            ];

            if (seconds > 0) {
                fields.push({ 
                    name: 'Effect', 
                    value: `Users must wait ${formatDuration(seconds)} between messages`, 
                    inline: false 
                });
            }

            const result = productionStyle.createSuccessEmbed(
                'SLOWMODE UPDATED',
                { tag: 'Channel Management' },
                message.author,
                `Slowmode cho ${targetChannel.name} đã được cập nhật!`,
                fields
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
                    if (logChannel && logChannel.id !== message.channel.id) {
                        const logResult = productionStyle.createInfoEmbed(
                            'SLOWMODE LOG',
                            { tag: 'Moderation Log' },
                            message.author,
                            `Channel slowmode changed in ${targetChannel.name}`,
                            [
                                { name: 'Command Channel', value: message.channel.toString(), inline: true },
                                { name: 'Target Channel', value: targetChannel.toString(), inline: true },
                                { name: 'Moderator', value: `${message.author.tag} (${message.author.id})`, inline: true },
                                { name: 'New Slowmode', value: formatDuration(seconds), inline: true },
                                { name: 'Old Slowmode', value: formatDuration(currentSlowmode), inline: true },
                                { name: 'Change Type', value: seconds === 0 ? 'Disabled' : 'Enabled/Modified', inline: true },
                                { name: 'Duration Change', value: `${currentSlowmode}s → ${seconds}s`, inline: false }
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
            console.error('Error setting slowmode:', error);
            
            const result = productionStyle.createErrorEmbed(
                'Slowmode Update Failed',
                'Không thể cập nhật slowmode!',
                error.message
            );
            await message.reply({ 
                embeds: [result.embed], 
                files: result.attachments 
            });
        }
    }
}; 