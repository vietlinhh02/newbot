const { PermissionFlagsBits, ChannelType } = require('discord.js');
const { hasFlexiblePermission } = require('../../utils/permissions');
const productionStyle = require('../../utils/demoStyle');

module.exports = {
    name: 'lockserver',
    aliases: ['serverlock', 'emergencylock'],
    description: 'Khóa toàn bộ server trong trường hợp khẩn cấp (ngăn @everyone gửi tin nhắn)',
    usage: '!lockserver [duration] [reason]',
    examples: [
        '!lockserver 30m Raid attack',
        '!serverlock 1h Emergency maintenance',
        '!emergencylock Spam attack detected'
    ],
    permissions: 'admin',
    guildOnly: true,
    category: 'security',
    
    async execute(message, args, client) {
        // Check permissions
        if (!await hasFlexiblePermission(message.member, 'lockserver', this.permissions, message.guild.id)) {
            const result = productionStyle.createErrorEmbed(
                'Permission Denied',
                'Bạn cần quyền **Administrator** để khóa server!'
            );
            return message.reply({ 
                embeds: [result.embed], 
                files: result.attachments 
            });
        }
        
        // Check bot permissions
        if (!message.guild.members.me.permissions.has([PermissionFlagsBits.ManageChannels, PermissionFlagsBits.ManageRoles])) {
            const result = productionStyle.createErrorEmbed(
                'Bot Missing Permissions',
                'Bot cần quyền **Manage Channels** và **Manage Roles** để thực hiện lệnh này!',
                'Grant these permissions to the bot'
            );
            return message.reply({ 
                embeds: [result.embed], 
                files: result.attachments 
            });
        }
        
        // Parse duration and reason
        let duration = null;
        const MAX_LOCKDOWN_DURATION_MS = 7 * 24 * 60 * 60 * 1000; // 7 days in milliseconds
        let reason = args.join(' ') || 'Emergency server lockdown';
        
        if (args[0]) {
            const durationMatch = args[0].match(/^(\d+)([smhd])$/);
            if (durationMatch) {
                const amount = parseInt(durationMatch[1]);
                const unit = durationMatch[2];
                
                const multipliers = {
                    's': 1000,
                    'm': 60 * 1000,
                    'h': 60 * 60 * 1000,
                    'd': 24 * 60 * 60 * 1000
                };
                
                duration = amount * multipliers[unit];
                
                // Limit duration to MAX_LOCKDOWN_DURATION_MS
                if (duration > MAX_LOCKDOWN_DURATION_MS) {
                    const maxDays = Math.floor(MAX_LOCKDOWN_DURATION_MS / (24 * 60 * 60 * 1000));
                    const result = productionStyle.createErrorEmbed(
                        'Duration Too Long',
                        `Thời gian khóa quá dài! Thời gian khóa tối đa là ${maxDays} ngày.`,
                        'Please use a shorter duration'
                    );
                    return message.reply({ 
                        embeds: [result.embed], 
                        files: result.attachments 
                    });
                }

                reason = args.slice(1).join(' ') || 'Emergency server lockdown';
            }
        }
        
        // Format duration display
        const formatDuration = (ms) => {
            const seconds = Math.floor(ms / 1000);
            const minutes = Math.floor(seconds / 60);
            const hours = Math.floor(minutes / 60);
            const days = Math.floor(hours / 24);
            
            if (days > 0) return `${days} ngày ${hours % 24} giờ`;
            if (hours > 0) return `${hours} giờ ${minutes % 60} phút`;
            if (minutes > 0) return `${minutes} phút`;
            return `${seconds} giây`;
        };
        
        // Show confirmation
        const confirmFields = [
            { name: 'Action Impact', value: '• Ngăn @everyone gửi tin nhắn trong tất cả text channels\n• Chỉ Administrator và Moderator có thể gửi tin nhắn\n• Áp dụng cho toàn bộ server', inline: false },
            { name: 'Duration', value: duration ? formatDuration(duration) : 'Vô thời hạn (manual unlock required)', inline: true },
            { name: 'Auto Unlock', value: duration ? `<t:${Math.floor((Date.now() + duration) / 1000)}:F>` : 'Manual unlock only', inline: true },
            { name: 'Reason', value: reason, inline: false },
            { name: 'Confirmation', value: 'React ✅ để xác nhận hoặc ❌ để hủy bỏ\n**Bạn có 30 giây để quyết định**', inline: false }
        ];
        
        const confirmResult = productionStyle.createWarningEmbed(
            'SERVER LOCKDOWN CONFIRMATION',
            { tag: 'Emergency Action' },
            message.author,
            '🚨 **CẢNH BÁO: KHÓA SERVER EMERGENCY**',
            confirmFields
        );
        
        const confirmMessage = await message.reply({ 
            embeds: [confirmResult.embed], 
            files: confirmResult.attachments 
        });
        
        await confirmMessage.react('✅');
        await confirmMessage.react('❌');
        
        // Wait for reaction
        const filter = (reaction, user) => {
            return ['✅', '❌'].includes(reaction.emoji.name) && user.id === message.author.id;
        };
        
        try {
            const collected = await confirmMessage.awaitReactions({
                filter,
                max: 1,
                time: 30000,
                errors: ['time']
            });
            
            const reaction = collected.first();
            
            if (reaction.emoji.name === '❌') {
                const cancelResult = productionStyle.createInfoEmbed(
                    'Lockdown Cancelled',
                    { tag: 'Action Cancelled' },
                    message.author,
                    'Server lockdown đã được hủy bỏ.',
                    [
                        { name: 'Status', value: '✅ No changes made to server' },
                        { name: 'Cancelled By', value: message.author.tag },
                        { name: 'Time', value: `<t:${Math.floor(Date.now() / 1000)}:F>` }
                    ]
                );
                return confirmMessage.edit({ 
                    embeds: [cancelResult.embed], 
                    files: cancelResult.attachments,
                    components: [] 
                });
            }
            
            if (reaction.emoji.name === '✅') {
                // Update confirmation message to show progress
                const progressResult = productionStyle.createWarningEmbed(
                    'LOCKDOWN IN PROGRESS',
                    { tag: 'Processing...' },
                    message.author,
                    '🔒 Đang khóa server... Vui lòng đợi!',
                    [
                        { name: 'Progress', value: 'Đang áp dụng khóa cho tất cả text channels...' },
                        { name: 'Estimated Time', value: '~10-30 seconds depending on server size' }
                    ]
                );
                
                await confirmMessage.edit({ 
                    embeds: [progressResult.embed], 
                    files: progressResult.attachments,
                    components: [] 
                });
                
                const everyoneRole = message.guild.roles.everyone;
                const lockedChannels = [];
                const failedChannels = [];
                
                // Get all text channels
                const textChannels = message.guild.channels.cache.filter(channel => 
                    channel.type === ChannelType.GuildText || 
                    channel.type === ChannelType.GuildNews
                );
                
                // Lock each text channel
                for (const [, channel] of textChannels) {
                    try {
                        // Check if channel is already locked
                        const currentPerms = channel.permissionOverwrites.cache.get(everyoneRole.id);
                        const isAlreadyLocked = currentPerms && currentPerms.deny.has(PermissionFlagsBits.SendMessages);
                        
                        if (!isAlreadyLocked) {
                            await channel.permissionOverwrites.edit(everyoneRole, {
                                SendMessages: false
                            }, { reason: `Server lockdown: ${reason}` });
                            
                            lockedChannels.push(channel.name);
                        }
                    } catch (error) {
                        console.error(`Failed to lock ${channel.name}:`, error);
                        failedChannels.push(`${channel.name}: ${error.message}`);
                    }
                }
                
                // Schedule auto unlock if duration is set
                if (duration) {
                    setTimeout(async () => {
                        try {
                            let unlockedChannels = 0;
                            
                            for (const [, channel] of textChannels) {
                                try {
                                    await channel.permissionOverwrites.edit(everyoneRole, {
                                        SendMessages: null
                                    }, { reason: `Auto unlock after ${formatDuration(duration)}` });
                                    unlockedChannels++;
                                } catch (error) {
                                    console.error(`Auto unlock failed for ${channel.name}:`, error);
                                }
                            }
                            
                            // Send auto unlock notification
                            const unlockResult = productionStyle.createSuccessEmbed(
                                'AUTO UNLOCK COMPLETE',
                                { tag: 'Scheduled Action' },
                                message.author,
                                `Server đã được tự động mở khóa sau ${formatDuration(duration)}!`,
                                [
                                    { name: 'Unlocked Channels', value: `${unlockedChannels}/${textChannels.size}` },
                                    { name: 'Original Lockdown By', value: message.author.tag },
                                    { name: 'Auto Unlock Time', value: `<t:${Math.floor(Date.now() / 1000)}:F>` }
                                ]
                            );
                            
                            await message.channel.send({ 
                                embeds: [unlockResult.embed], 
                                files: unlockResult.attachments 
                            });
                            
                        } catch (error) {
                            console.error('Auto unlock error:', error);
                        }
                    }, duration);
                }
                
                // Success message
                const successFields = [
                    { name: 'Locked Channels', value: `${lockedChannels.length}`, inline: true },
                    { name: 'Failed Channels', value: `${failedChannels.length}`, inline: true },
                    { name: 'Total Channels', value: `${textChannels.size}`, inline: true },
                    { name: 'Locked By', value: message.author.tag, inline: true },
                    { name: 'Duration', value: duration ? formatDuration(duration) : 'Manual unlock required', inline: true },
                    { name: 'Time', value: `<t:${Math.floor(Date.now() / 1000)}:F>`, inline: true }
                ];
                
                if (duration) {
                    successFields.push({ 
                        name: 'Auto Unlock', 
                        value: `<t:${Math.floor((Date.now() + duration) / 1000)}:F>`, 
                        inline: true 
                    });
                }
                
                if (lockedChannels.length > 0) {
                    const channelList = lockedChannels.slice(0, 10).join(', ');
                    const moreText = lockedChannels.length > 10 ? `\n... and ${lockedChannels.length - 10} more` : '';
                    successFields.push({ 
                        name: 'Successfully Locked', 
                        value: channelList + moreText, 
                        inline: false 
                    });
                }
                
                if (failedChannels.length > 0) {
                    const errorList = failedChannels.slice(0, 3).join('\n');
                    const moreErrors = failedChannels.length > 3 ? `\n... and ${failedChannels.length - 3} more errors` : '';
                    successFields.push({ 
                        name: 'Failed to Lock', 
                        value: errorList + moreErrors, 
                        inline: false 
                    });
                }
                
                successFields.push({ name: 'Reason', value: reason, inline: false });
                
                const successResult = productionStyle.createWarningEmbed(
                    'SERVER LOCKED DOWN',
                    { tag: 'Emergency Response' },
                    message.author,
                    `🔒 Server đã được khóa thành công! ${lockedChannels.length}/${textChannels.size} channels locked`,
                    successFields
                );
                
                await confirmMessage.edit({ 
                    embeds: [successResult.embed], 
                    files: successResult.attachments,
                    components: [] 
                });
                
                // Log to mod channel
                try {
                    const guildSettings = await client.prisma.guildSettings.findUnique({
                        where: { guildId: message.guild.id }
                    });
                    
                    if (guildSettings?.logChannel) {
                        const logChannel = message.guild.channels.cache.get(guildSettings.logChannel);
                        if (logChannel) {
                            const logResult = productionStyle.createWarningEmbed(
                                'SERVER LOCKDOWN LOG',
                                { tag: 'Security Log' },
                                message.author,
                                `Server has been locked down by ${message.author.tag}`,
                                [
                                    { name: 'Moderator', value: `${message.author.tag} (${message.author.id})`, inline: true },
                                    { name: 'Command Channel', value: message.channel.toString(), inline: true },
                                    { name: 'Locked Channels', value: `${lockedChannels.length}/${textChannels.size}`, inline: true },
                                    { name: 'Failed Locks', value: `${failedChannels.length}`, inline: true },
                                    { name: 'Duration', value: duration ? formatDuration(duration) : 'Manual unlock', inline: true },
                                    { name: 'Time', value: `<t:${Math.floor(Date.now() / 1000)}:F>`, inline: true },
                                    { name: 'Auto Unlock', value: duration ? `<t:${Math.floor((Date.now() + duration) / 1000)}:F>` : 'N/A', inline: true },
                                    { name: 'Action Type', value: 'Emergency Response', inline: true },
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
                    console.error('Error sending lockdown log:', error);
                }
            }
            
        } catch (error) {
            if (error.message === 'time') {
                const timeoutResult = productionStyle.createWarningEmbed(
                    'Confirmation Timeout',
                    { tag: 'Timed Out' },
                    message.author,
                    'Lockdown confirmation đã hết thời gian. Server không được khóa.',
                    [
                        { name: 'Timeout', value: '30 seconds elapsed' },
                        { name: 'Status', value: '✅ No changes made' },
                        { name: 'Note', value: 'Run the command again to retry' }
                    ]
                );
                return confirmMessage.edit({ 
                    embeds: [timeoutResult.embed], 
                    files: timeoutResult.attachments,
                    components: [] 
                });
            } else {
                console.error('Lockdown error:', error);
                
                const errorResult = productionStyle.createErrorEmbed(
                    'Lockdown Failed',
                    'Không thể khóa server!',
                    error.message
                );
                await confirmMessage.edit({ 
                    embeds: [errorResult.embed], 
                    files: errorResult.attachments,
                    components: [] 
                });
            }
        }
    }
}; 