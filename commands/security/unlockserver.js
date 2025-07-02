const { PermissionFlagsBits, ChannelType } = require('discord.js');
const { hasFlexiblePermission } = require('../../utils/permissions');
const productionStyle = require('../../utils/demoStyle');

module.exports = {
    name: 'unlockserver',
    aliases: ['serverunlock', 'emergencyunlock'],
    description: 'Mở khóa server đã bị khóa trước đó',
    usage: '!unlockserver [reason]',
    examples: [
        '!unlockserver Threat resolved',
        '!serverunlock Emergency over',
        '!emergencyunlock Manual unlock'
    ],
    permissions: 'admin',
    guildOnly: true,
    category: 'security',
    
    async execute(message, args, client) {
        // Check permissions
        if (!await hasFlexiblePermission(message.member, 'unlockserver', this.permissions, message.guild.id)) {
            const result = productionStyle.createErrorEmbed(
                'Permission Denied',
                'Bạn cần quyền **Administrator** để mở khóa server!'
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
        
        const reason = args.join(' ') || 'Manual server unlock';
        
        try {
            const everyoneRole = message.guild.roles.everyone;
            const unlockedChannels = [];
            const failedChannels = [];
            
            // Get all text channels
            const textChannels = message.guild.channels.cache.filter(channel => 
                channel.type === ChannelType.GuildText || 
                channel.type === ChannelType.GuildNews
            );
            
            // Check if server was actually locked
            let wasLocked = false;
            for (const [, channel] of textChannels) {
                const permissions = channel.permissionOverwrites.cache.get(everyoneRole.id);
                if (permissions && permissions.deny.has(PermissionFlagsBits.SendMessages)) {
                    wasLocked = true;
                    break;
                }
            }
            
            if (!wasLocked) {
                const result = productionStyle.createWarningEmbed(
                    'Server Not Locked',
                    'Server chưa bị khóa hoặc đã được mở khóa trước đó!',
                    [
                        { name: 'Current Status', value: 'All channels appear to be unlocked' },
                        { name: 'Note', value: 'Use `!lockserver` to lock the server if needed' }
                    ]
                );
                return message.reply({ 
                    embeds: [result.embed], 
                    files: result.attachments 
                });
            }
            
            // Unlock each text channel
            for (const [, channel] of textChannels) {
                try {
                    // Check if channel has permission overrides for @everyone
                    const permissions = channel.permissionOverwrites.cache.get(everyoneRole.id);
                    
                    if (permissions && permissions.deny.has(PermissionFlagsBits.SendMessages)) {
                        // Remove the SendMessages deny permission
                        await channel.permissionOverwrites.edit(everyoneRole, {
                            SendMessages: null
                        }, { reason: `Server unlock: ${reason}` });
                        
                        unlockedChannels.push(channel.name);
                    }
                } catch (error) {
                    console.error(`Failed to unlock ${channel.name}:`, error);
                    failedChannels.push(`${channel.name}: ${error.message}`);
                }
            }
            
            // Success message
            const fields = [
                { name: 'Unlocked Channels', value: `${unlockedChannels.length}`, inline: true },
                { name: 'Failed Channels', value: `${failedChannels.length}`, inline: true },
                { name: 'Total Channels', value: `${textChannels.size}`, inline: true },
                { name: 'Unlocked By', value: message.author.tag, inline: true },
                { name: 'Time', value: `<t:${Math.floor(Date.now() / 1000)}:F>`, inline: true },
                { name: 'Status', value: '🔓 Server is now unlocked', inline: true }
            ];
            
            if (unlockedChannels.length > 0) {
                const channelList = unlockedChannels.slice(0, 10).join(', ');
                const moreText = unlockedChannels.length > 10 ? `\n... and ${unlockedChannels.length - 10} more` : '';
                fields.push({ 
                    name: 'Successfully Unlocked', 
                    value: channelList + moreText, 
                    inline: false 
                });
            }
            
            if (failedChannels.length > 0) {
                const errorList = failedChannels.slice(0, 3).join('\n');
                const moreErrors = failedChannels.length > 3 ? `\n... and ${failedChannels.length - 3} more errors` : '';
                fields.push({ 
                    name: 'Failed to Unlock', 
                    value: errorList + moreErrors, 
                    inline: false 
                });
            }
            
            fields.push({ name: 'Reason', value: reason, inline: false });
            
            const result = productionStyle.createSuccessEmbed(
                'SERVER UNLOCKED',
                { tag: 'Emergency Response' },
                message.author,
                `Server đã được mở khóa thành công! ${unlockedChannels.length}/${textChannels.size} channels unlocked`,
                fields
            );
            
            await message.reply({ 
                embeds: [result.embed], 
                files: result.attachments 
            });
            
            // Log to mod channel
            try {
                const guildSettings = await client.prisma.guildSettings.findUnique({
                    where: { guildId: message.guild.id }
                });
                
                if (guildSettings?.logChannel) {
                    const logChannel = message.guild.channels.cache.get(guildSettings.logChannel);
                    if (logChannel) {
                        const logResult = productionStyle.createSuccessEmbed(
                            'SERVER UNLOCK LOG',
                            { tag: 'Security Log' },
                            message.author,
                            `Server has been unlocked by ${message.author.tag}`,
                            [
                                { name: 'Moderator', value: `${message.author.tag} (${message.author.id})`, inline: true },
                                { name: 'Command Channel', value: message.channel.toString(), inline: true },
                                { name: 'Unlocked Channels', value: `${unlockedChannels.length}/${textChannels.size}`, inline: true },
                                { name: 'Failed Unlocks', value: `${failedChannels.length}`, inline: true },
                                { name: 'Time', value: `<t:${Math.floor(Date.now() / 1000)}:F>`, inline: true },
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
                console.error('Error sending unlock log:', error);
            }
            
        } catch (error) {
            console.error('Server unlock error:', error);
            
            const result = productionStyle.createErrorEmbed(
                'Server Unlock Failed',
                'Không thể mở khóa server!',
                error.message
            );
            await message.reply({ 
                embeds: [result.embed], 
                files: result.attachments 
            });
        }
    }
}; 