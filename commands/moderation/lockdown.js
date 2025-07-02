const { PermissionFlagsBits } = require('discord.js');
const { hasFlexiblePermission } = require('../../utils/permissions');
const productionStyle = require('../../utils/demoStyle');
const { parseTime, formatDurationVietnamese } = require('../../utils/time');

module.exports = {
    name: 'lockdown',
    aliases: ['lock', 'unlock'],
    description: 'Khóa hoặc mở khóa kênh (ngăn @everyone gửi tin nhắn)',
    usage: '!lockdown [channel] [duration] [reason]',
    examples: [
        '!lockdown',
        '!lockdown #general 30m Raid protection',
        '!unlock #general',
        '!lock 1h Emergency'
    ],
    permissions: 'admin',
    guildOnly: true,
    category: 'moderation',
    
    async execute(message, args, client) {
        // Check permissions
        if (!await hasFlexiblePermission(message.member, 'lockdown', this.permissions, message.guild.id)) {
            const result = productionStyle.createErrorEmbed(
                'Permission Denied',
                'Bạn cần quyền **Manage Channels** để sử dụng lệnh này.'
            );
            return message.reply({ 
                embeds: [result.embed], 
                files: result.attachments 
            });
        }

        // Check bot permissions
        if (!message.guild.members.me.permissions.has(PermissionFlagsBits.ManageChannels)) {
            const result = productionStyle.createErrorEmbed(
                'Bot Missing Permissions',
                'Bot cần quyền **Manage Channels** để thực hiện lệnh này!',
                'Grant the Manage Channels permission to the bot'
            );
            return message.reply({ 
                embeds: [result.embed], 
                files: result.attachments 
            });
        }
        
        // Check action
        const cmdUsed = message.content.split(' ')[0].toLowerCase();
        const isUnlock = cmdUsed.includes('unlock');
        
        // Get target channel
        let targetChannel = message.channel;
        let argIndex = 0;
        
        if (args[0] && (args[0].startsWith('<#') || /^\d+$/.test(args[0]))) {
            const channelMention = message.mentions.channels.first();
            if (channelMention) {
                targetChannel = channelMention;
                argIndex = 1;
            }
        }
        
        // Parse additional arguments
        let duration = null;
        let reason = 'Không có lý do được cung cấp';
        
        if (args.length > argIndex) {
            const remainingArgs = args.slice(argIndex);
            
            // Check if first arg is duration
            if (remainingArgs[0] && !isUnlock) {
                const parsedTime = parseTime(remainingArgs[0]);
                if (parsedTime) {
                    duration = parsedTime;
                    reason = remainingArgs.slice(1).join(' ') || reason;
                } else {
                    reason = remainingArgs.join(' ');
                }
            } else if (remainingArgs.length > 0) {
                reason = remainingArgs.join(' ');
            }
        }
        
        // Get everyone role
        const everyoneRole = message.guild.roles.everyone;
        const currentPerms = targetChannel.permissionOverwrites.cache.get(everyoneRole.id);
        const isLocked = currentPerms && currentPerms.deny.has(PermissionFlagsBits.SendMessages);
        
        try {
            if (isUnlock) {
                // Unlock channel
                if (!isLocked) {
                    const result = productionStyle.createWarningEmbed(
                        'Channel Not Locked',
                        `${targetChannel.name} chưa bị khóa!`,
                        [
                            { name: 'Current Status', value: 'Channel is already unlocked' },
                            { name: 'Note', value: 'Users can already send messages' }
                        ]
                    );
                    return message.reply({ 
                        embeds: [result.embed], 
                        files: result.attachments 
                    });
                }
                
                // Remove permission override or set to allow
                await targetChannel.permissionOverwrites.edit(everyoneRole, {
                    SendMessages: null
                });
                
                const result = productionStyle.createSuccessEmbed(
                    'CHANNEL UNLOCKED',
                    { tag: 'Security Action' },
                    message.author,
                    `${targetChannel.name} đã được mở khóa thành công!`,
                    [
                        { name: 'Channel', value: targetChannel.toString(), inline: true },
                        { name: 'Unlocked By', value: message.author.tag, inline: true },
                        { name: 'Time', value: `<t:${Math.floor(Date.now() / 1000)}:F>`, inline: true },
                        { name: 'Status', value: '✅ Users can now send messages', inline: false },
                        { name: 'Reason', value: reason, inline: false }
                    ]
                );
                
                await message.reply({ 
                    embeds: [result.embed], 
                    files: result.attachments 
                });
                
            } else {
                // Lock channel
                if (isLocked) {
                    const result = productionStyle.createWarningEmbed(
                        'Channel Already Locked',
                        `${targetChannel.name} đã bị khóa rồi!`,
                        [
                            { name: 'Current Status', value: 'Channel is already locked' },
                            { name: 'Note', value: 'Use `!unlock` to unlock the channel' }
                        ]
                    );
                    return message.reply({ 
                        embeds: [result.embed], 
                        files: result.attachments 
                    });
                }
                
                // Lock channel
                await targetChannel.permissionOverwrites.edit(everyoneRole, {
                    SendMessages: false
                });
                
                const fields = [
                    { name: 'Channel', value: targetChannel.toString(), inline: true },
                    { name: 'Locked By', value: message.author.tag, inline: true },
                    { name: 'Time', value: `<t:${Math.floor(Date.now() / 1000)}:F>`, inline: true },
                    { name: 'Status', value: '🔒 Users cannot send messages', inline: false }
                ];
                
                if (duration) {
                    const unlockTime = Date.now() + duration;
                    fields.push({ 
                        name: 'Duration', 
                        value: formatDurationVietnamese(duration), 
                        inline: true 
                    });
                    fields.push({ 
                        name: 'Auto Unlock', 
                        value: `<t:${Math.floor(unlockTime / 1000)}:F>`, 
                        inline: true 
                    });
                    
                    // Schedule auto unlock
                    setTimeout(async () => {
                        try {
                            await targetChannel.permissionOverwrites.edit(everyoneRole, {
                                SendMessages: null
                            });
                            
                            const autoUnlockResult = productionStyle.createInfoEmbed(
                                'AUTO UNLOCK',
                                { tag: 'Scheduled Action' },
                                message.author,
                                `${targetChannel.name} đã được tự động mở khóa!`,
                                [
                                    { name: 'Original Duration', value: formatDurationVietnamese(duration) },
                                    { name: 'Originally Locked By', value: message.author.tag },
                                    { name: 'Auto Unlock Time', value: `<t:${Math.floor(Date.now() / 1000)}:F>` }
                                ]
                            );
                            
                            await targetChannel.send({ 
                                embeds: [autoUnlockResult.embed], 
                                files: autoUnlockResult.attachments 
                            });
                        } catch (error) {
                            console.error('Auto unlock error:', error);
                        }
                    }, duration);
                } else {
                    fields.push({ 
                        name: 'Duration', 
                        value: 'Manual unlock required', 
                        inline: true 
                    });
                }
                
                fields.push({ name: 'Reason', value: reason, inline: false });
                
                const result = productionStyle.createWarningEmbed(
                    'CHANNEL LOCKED',
                    { tag: 'Security Action' },
                    message.author,
                    `${targetChannel.name} đã bị khóa!`,
                    fields
                );
                
                await message.reply({ 
                    embeds: [result.embed], 
                    files: result.attachments 
                });
            }
            
            // Log to mod channel
            try {
                const guildSettings = await client.prisma.guildSettings.findUnique({
                    where: { guildId: message.guild.id }
                });
                
                if (guildSettings?.logChannel) {
                    const logChannel = message.guild.channels.cache.get(guildSettings.logChannel);
                    if (logChannel && logChannel.id !== targetChannel.id) {
                        const logFields = [
                            { name: 'Channel', value: targetChannel.toString(), inline: true },
                            { name: 'Action', value: isUnlock ? 'Unlocked' : 'Locked', inline: true },
                            { name: 'Moderator', value: `${message.author.tag} (${message.author.id})`, inline: true },
                            { name: 'Command Channel', value: message.channel.toString(), inline: true },
                            { name: 'Time', value: `<t:${Math.floor(Date.now() / 1000)}:F>`, inline: true }
                        ];
                        
                        if (duration && !isUnlock) {
                            logFields.push({ 
                                name: 'Duration', 
                                value: formatDurationVietnamese(duration), 
                                inline: true 
                            });
                        }
                        
                        logFields.push({ name: 'Reason', value: reason, inline: false });
                        
                        const logResult = productionStyle.createInfoEmbed(
                            `LOCKDOWN ${isUnlock ? 'UNLOCK' : 'LOCK'} LOG`,
                            { tag: 'Moderation Log' },
                            message.author,
                            `Channel ${isUnlock ? 'unlocked' : 'locked'}: ${targetChannel.name}`,
                            logFields
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
            
        } catch (error) {
            console.error('Lockdown error:', error);
            
            const result = productionStyle.createErrorEmbed(
                'Lockdown Failed',
                'Không thể thay đổi quyền channel!',
                error.message
            );
            await message.reply({ 
                embeds: [result.embed], 
                files: result.attachments 
            });
        }
    }
}; 