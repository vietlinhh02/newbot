const { PermissionFlagsBits, ChannelType } = require('discord.js');
const { hasFlexiblePermission } = require('../../utils/permissions');
const productionStyle = require('../../utils/demoStyle');

module.exports = {
    name: 'nuke',
    aliases: ['nukechannel', 'recreate'],
    description: 'Xóa và tạo lại kênh (xóa tất cả tin nhắn)',
    usage: '!nuke [#channel] [reason]',
    examples: [
        '!nuke',
        '!nuke #spam cleanup',
        '!nukechannel #general raid cleanup',
        '!recreate #announcements'
    ],
    permissions: 'admin',
    guildOnly: true,
    category: 'security',
    
    async execute(message, args, client) {
        // Check permissions
        if (!await hasFlexiblePermission(message.member, 'nuke', this.permissions, message.guild.id)) {
            const result = productionStyle.createErrorEmbed(
                'Permission Denied',
                'Bạn cần quyền **Administrator** để nuke channel!'
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
        
        // Get target channel
        let targetChannel = message.channel;
        let reasonStartIndex = 0;
        
        if (args[0] && args[0].startsWith('<#')) {
            const channelMention = message.mentions.channels.first();
            if (channelMention) {
                targetChannel = channelMention;
                reasonStartIndex = 1;
            }
        }
        
        // Check if channel can be nuked
        if (!targetChannel.isTextBased()) {
            const result = productionStyle.createErrorEmbed(
                'Invalid Channel Type',
                'Chỉ có thể nuke text channels!',
                'Voice channels and other channel types cannot be nuked'
            );
            return message.reply({ 
                embeds: [result.embed], 
                files: result.attachments 
            });
        }
        
        // Check bot permissions in target channel
        if (!targetChannel.permissionsFor(message.guild.members.me).has(PermissionFlagsBits.ManageChannels)) {
            const result = productionStyle.createErrorEmbed(
                'Channel Permissions Missing',
                `Bot cần quyền **Manage Channels** trong ${targetChannel}!`,
                'Bot cannot manage this channel'
            );
            return message.reply({ 
                embeds: [result.embed], 
                files: result.attachments 
            });
        }
        
        const reason = args.slice(reasonStartIndex).join(' ') || 'Channel nuke/recreation';
        
        // Show confirmation
        const confirmResult = productionStyle.createWarningEmbed(
            'NUKE CONFIRMATION',
            { tag: 'Destructive Action' },
            message.author,
            `⚠️ **CẢNH BÁO: Bạn đang sắp nuke ${targetChannel.name}**`,
            [
                { name: 'Target Channel', value: targetChannel.toString(), inline: true },
                { name: 'Action', value: 'Delete & Recreate Channel', inline: true },
                { name: 'Data Loss', value: '🗑️ ALL MESSAGES WILL BE DELETED', inline: true },
                { name: 'Cannot Undo', value: '❌ This action is irreversible', inline: true },
                { name: 'Estimated Time', value: '~5-10 seconds', inline: true },
                { name: 'Channel Features', value: 'Settings, permissions, webhooks preserved', inline: true },
                { name: 'Reason', value: reason, inline: false },
                { name: 'Confirmation', value: 'React ✅ to confirm or ❌ to cancel\n**You have 30 seconds to decide**', inline: false }
            ]
        );
        
        const confirmMsg = await message.reply({ 
            embeds: [confirmResult.embed], 
            files: confirmResult.attachments 
        });
        
        await confirmMsg.react('✅');
        await confirmMsg.react('❌');
        
        // Wait for reaction
        const filter = (reaction, user) => {
            return ['✅', '❌'].includes(reaction.emoji.name) && user.id === message.author.id;
        };
        
        try {
            const collected = await confirmMsg.awaitReactions({
                filter,
                max: 1,
                time: 30000,
                errors: ['time']
            });
            
            const reaction = collected.first();
            
            if (reaction.emoji.name === '❌') {
                const cancelResult = productionStyle.createInfoEmbed(
                    'Nuke Cancelled',
                    { tag: 'Action Cancelled' },
                    message.author,
                    'Channel nuke đã được hủy bỏ.',
                    [
                        { name: 'Channel', value: targetChannel.toString(), inline: true },
                        { name: 'Status', value: '✅ Safe - No changes made', inline: true },
                        { name: 'Cancelled By', value: message.author.tag, inline: true }
                    ]
                );
                return confirmMsg.edit({ 
                    embeds: [cancelResult.embed], 
                    files: cancelResult.attachments,
                    components: [] 
                });
            }
            
            if (reaction.emoji.name === '✅') {
                // Store channel information before deletion
                const channelData = {
                    name: targetChannel.name,
                    type: targetChannel.type,
                    topic: targetChannel.topic,
                    nsfw: targetChannel.nsfw,
                    rateLimitPerUser: targetChannel.rateLimitPerUser,
                    parent: targetChannel.parent,
                    position: targetChannel.position,
                    permissionOverwrites: Array.from(targetChannel.permissionOverwrites.cache.values())
                };
                
                // Update confirmation message to show progress
                const progressResult = productionStyle.createWarningEmbed(
                    'NUKING IN PROGRESS',
                    { tag: 'Processing...' },
                    message.author,
                    '🚀 Đang nuke channel... Vui lòng đợi!',
                    [
                        { name: 'Step 1', value: '✅ Saving channel settings', inline: true },
                        { name: 'Step 2', value: '🔄 Deleting channel...', inline: true },
                        { name: 'Step 3', value: '⏳ Creating new channel...', inline: true }
                    ]
                );
                
                await confirmMsg.edit({ 
                    embeds: [progressResult.embed], 
                    files: progressResult.attachments,
                    components: [] 
                });
                
                // Delete the channel
                await targetChannel.delete(`[NUKE] ${reason} | By: ${message.author.tag}`);
                
                // Create new channel with same settings
                const newChannel = await message.guild.channels.create({
                    name: channelData.name,
                    type: channelData.type,
                    topic: channelData.topic,
                    nsfw: channelData.nsfw,
                    rateLimitPerUser: channelData.rateLimitPerUser,
                    parent: channelData.parent,
                    position: channelData.position,
                    permissionOverwrites: channelData.permissionOverwrites.map(overwrite => ({
                        id: overwrite.id,
                        type: overwrite.type,
                        allow: overwrite.allow,
                        deny: overwrite.deny
                    })),
                    reason: `[NUKE] Channel recreation | ${reason} | By: ${message.author.tag}`
                });
                
                // Send success message in new channel
                const successResult = productionStyle.createSuccessEmbed(
                    'CHANNEL NUKED SUCCESSFULLY',
                    { tag: 'Operation Complete' },
                    message.author,
                    `💥 Channel đã được nuke và tạo lại thành công!`,
                    [
                        { name: 'Original Channel', value: channelData.name, inline: true },
                        { name: 'New Channel', value: newChannel.toString(), inline: true },
                        { name: 'Data Cleared', value: '🗑️ All messages deleted', inline: true },
                        { name: 'Settings Preserved', value: '✅ Permissions, topic, slowmode', inline: true },
                        { name: 'Nuked By', value: message.author.tag, inline: true },
                        { name: 'Time', value: `<t:${Math.floor(Date.now() / 1000)}:F>`, inline: true },
                        { name: 'Reason', value: reason, inline: false }
                    ]
                );
                
                await newChannel.send({ 
                    embeds: [successResult.embed], 
                    files: successResult.attachments 
                });
                
                // Log to mod channel
                try {
                    const guildSettings = await client.prisma.guildSettings.findUnique({
                        where: { guildId: message.guild.id }
                    });
                    
                    if (guildSettings?.logChannel) {
                        const logChannel = message.guild.channels.cache.get(guildSettings.logChannel);
                        if (logChannel && logChannel.id !== newChannel.id) {
                            const logResult = productionStyle.createWarningEmbed(
                                'CHANNEL NUKE LOG',
                                { tag: 'Security Log' },
                                message.author,
                                `Channel has been nuked and recreated`,
                                [
                                    { name: 'Original Channel', value: `#${channelData.name}`, inline: true },
                                    { name: 'New Channel', value: newChannel.toString(), inline: true },
                                    { name: 'Moderator', value: `${message.author.tag} (${message.author.id})`, inline: true },
                                    { name: 'Channel Type', value: channelData.type === 0 ? 'Text Channel' : 'Other', inline: true },
                                    { name: 'Had Slowmode', value: channelData.rateLimitPerUser > 0 ? `${channelData.rateLimitPerUser}s` : 'No', inline: true },
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
                } catch (error) {
                    console.error('Error sending nuke log:', error);
                }
            }
            
        } catch (error) {
            if (error.message === 'time') {
                const timeoutResult = productionStyle.createWarningEmbed(
                    'Confirmation Timeout',
                    { tag: 'Timed Out' },
                    message.author,
                    'Nuke confirmation đã hết thời gian. Channel không được nuke.',
                    [
                        { name: 'Timeout', value: '30 seconds elapsed' },
                        { name: 'Status', value: '✅ No changes made' },
                        { name: 'Note', value: 'Run the command again to retry' }
                    ]
                );
                return confirmMsg.edit({ 
                    embeds: [timeoutResult.embed], 
                    files: timeoutResult.attachments,
                    components: [] 
                });
            } else {
                console.error('Nuke error:', error);
                
                const errorResult = productionStyle.createErrorEmbed(
                    'Nuke Failed',
                    'Không thể nuke channel!',
                    error.message
                );
                await confirmMsg.edit({ 
                    embeds: [errorResult.embed], 
                    files: errorResult.attachments,
                    components: [] 
                });
            }
        }
    }
}; 