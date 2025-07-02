const { PermissionFlagsBits } = require('discord.js');
const { hasFlexiblePermission } = require('../../utils/permissions');
const productionStyle = require('../../utils/demoStyle');

module.exports = {
    name: 'setlog',
    aliases: ['logchannel', 'setlogchannel'],
    description: 'Thiết lập kênh log cho các hoạt động moderation',
    usage: '!setlog [#channel | disable]',
    examples: [
        '!setlog #mod-logs',
        '!setlog disable'
    ],
    permissions: 'admin',
    guildOnly: true,
    category: 'config',
    
    async execute(message, args, client) {
        // Check permissions
        if (!await hasFlexiblePermission(message.member, 'setlog', this.permissions, message.guild.id)) {
            const result = productionStyle.createErrorEmbed(
                'Permission Denied',
                'Bạn cần quyền **Administrator** để sử dụng lệnh này.'
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
                'Bot cần quyền **Manage Channels** để thực hiện lệnh này!'
            );
            return message.reply({ 
                embeds: [result.embed], 
                files: result.attachments 
            });
        }

        // Show setup recommendation if no args
        if (!args.length) {
            const result = productionStyle.createSuccessEmbed(
                'LOG CHANNEL SETUP',
                { tag: 'Configuration Guide' },
                message.author,
                'Thay vì cấu hình từng lệnh riêng biệt, bạn có thể sử dụng **Setup Wizard** để cấu hình tất cả!',
                [
                    {
                        name: 'Setup Wizard (Recommended)',
                        value: '• Visual interface with buttons\n• Configure all settings at once\n• Step-by-step guidance\n• Automatic quick setup\n\n**Command:** `!setup`',
                        inline: false
                    },
                    {
                        name: 'Or Use This Command',
                        value: '• `!setlog #channel` - Set log channel\n• `!setlog disable` - Disable logging\n\n**Example:** `!setlog #mod-logs`',
                        inline: false
                    },
                    {
                        name: 'Log Channel Features',
                        value: '• Records all moderation actions\n• Tracks ban, kick, mute, warn\n• Complete history storage\n• Transparent management',
                        inline: false
                    }
                ]
            );
            return message.reply({ 
                embeds: [result.embed], 
                files: result.attachments 
            });
        }
        
        try {
            // Get current settings
            const guildSettings = await client.prisma.guildSettings.findUnique({
                where: { guildId: message.guild.id }
            });
            
            if (args[0].toLowerCase() === 'disable') {
                await client.prisma.guildSettings.upsert({
                    where: { guildId: message.guild.id },
                    update: { logChannel: null },
                    create: { guildId: message.guild.id, logChannel: null }
                });
                
                const result = productionStyle.createSuccessEmbed(
                    'LOG CHANNEL DISABLED',
                    { tag: 'Configuration' },
                    message.author,
                    'Hệ thống log moderation đã được tắt thành công.',
                    [
                        { name: 'Next Steps', value: 'Use `!setup` to reconfigure or set up other features', inline: false }
                    ]
                );
                return message.reply({ 
                    embeds: [result.embed], 
                    files: result.attachments 
                });
            }
            
            // Get target channel
            const channelMention = message.mentions.channels.first();
            let targetChannel = null;
            
            if (channelMention) {
                targetChannel = channelMention;
            } else {
                const channelId = args[0].replace(/[<#>]/g, '');
                try {
                    targetChannel = await message.guild.channels.fetch(channelId);
                } catch (error) {
                    const result = productionStyle.createErrorEmbed(
                        'Channel Not Found',
                        'Không tìm thấy kênh với ID được cung cấp.'
                    );
                    return message.reply({ 
                        embeds: [result.embed], 
                        files: result.attachments 
                    });
                }
            }
            
            if (!targetChannel) {
                const result = productionStyle.createErrorEmbed(
                    'Invalid Channel',
                    'Vui lòng mention một kênh hợp lệ hoặc cung cấp ID kênh.',
                    'Example: !setlog #mod-logs'
                );
                return message.reply({ 
                    embeds: [result.embed], 
                    files: result.attachments 
                });
            }

            if (!targetChannel.isTextBased()) {
                const result = productionStyle.createErrorEmbed(
                    'Invalid Channel Type',
                    'Chỉ có thể thiết lập log cho text channel.'
                );
                return message.reply({ 
                    embeds: [result.embed], 
                    files: result.attachments 
                });
            }
            
            // Check bot permissions in target channel
            const botPermissions = targetChannel.permissionsFor(message.guild.members.me);
            if (!botPermissions.has(['ViewChannel', 'SendMessages', 'EmbedLinks'])) {
                const result = productionStyle.createErrorEmbed(
                    'Bot Missing Channel Permissions',
                    `Bot cần quyền **View Channel**, **Send Messages** và **Embed Links** trong ${targetChannel}`
                );
                return message.reply({ 
                    embeds: [result.embed], 
                    files: result.attachments 
                });
            }
            
            // Update log channel
            await client.prisma.guildSettings.upsert({
                where: { guildId: message.guild.id },
                update: { logChannel: targetChannel.id },
                create: { guildId: message.guild.id, logChannel: targetChannel.id }
            });
            
            // Send success message
            const result = productionStyle.createSuccessEmbed(
                'LOG CHANNEL SET',
                { tag: 'Configuration' },
                message.author,
                'Kênh log đã được thiết lập thành công!',
                [
                    { name: 'Log Channel', value: targetChannel.toString(), inline: true },
                    { name: 'Status', value: 'Active', inline: true },
                    { name: 'Will Log', value: 'Ban, Kick, Mute, Warn, Clear and other actions', inline: false },
                    { name: 'Next Steps', value: 'Use `!setup` to configure additional features', inline: false }
                ]
            );

            await message.reply({ 
                embeds: [result.embed], 
                files: result.attachments 
            });

            // Send test log message to verify
            try {
                const testResult = productionStyle.createSuccessEmbed(
                    'LOG CHANNEL TEST',
                    { tag: 'System Test' },
                    message.author,
                    'Kênh log đã được thiết lập thành công!',
                    [
                        { name: 'Configured By', value: message.author.tag, inline: true },
                        { name: 'Time', value: `<t:${Math.floor(Date.now() / 1000)}:F>`, inline: true }
                    ]
                );
                await targetChannel.send({ 
                    embeds: [testResult.embed], 
                    files: testResult.attachments 
                });
            } catch (error) {
                console.error('Không thể gửi test message đến log channel:', error);
            }
            
        } catch (error) {
            console.error('Lỗi khi thiết lập log channel:', error);
            
            const result = productionStyle.createErrorEmbed(
                'System Error',
                'Đã xảy ra lỗi khi thiết lập log channel.',
                error.message
            );
            
            await message.reply({ 
                embeds: [result.embed], 
                files: result.attachments 
            });
        }
    }
}; 