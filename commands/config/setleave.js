const { hasFlexiblePermission } = require('../../utils/permissions');
const productionStyle = require('../../utils/demoStyle');

module.exports = {
    name: 'setleave',
    aliases: ['leaveset', 'goodbye'],
    description: 'Cấu hình kênh và tin nhắn tạm biệt thành viên rời khỏi server',
    usage: '!setleave [#channel] [message]',
    examples: [
        '!setleave #goodbye Tạm biệt {user}, hy vọng sẽ gặp lại!',
        '!setleave #general {mention} đã rời khỏi {server}',
        '!setleave disable',
        '!goodbye test'
    ],
    permissions: 'admin',
    guildOnly: true,
    category: 'config',
    
    async execute(message, args, client) {
        // Check permissions
        if (!await hasFlexiblePermission(message.member, 'setleave', this.permissions, message.guild.id)) {
            const result = productionStyle.createErrorEmbed(
                'Permission Denied',
                'Bạn cần quyền **Administrator** để cấu hình leave message!'
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
            
            // Show current configuration if no args
            if (!args[0]) {
                const currentChannel = guildSettings?.leaveChannel ? 
                    `<#${guildSettings.leaveChannel}>` : 'Chưa cấu hình';
                const currentMessage = guildSettings?.leaveMessage || 'Chưa cấu hình';
                
                const result = productionStyle.createInfoEmbed(
                    'LEAVE MESSAGE CONFIGURATION',
                    { tag: 'Current Settings' },
                    message.author,
                    'Current goodbye message configuration',
                    [
                        { name: 'Leave Channel', value: currentChannel, inline: true },
                        { name: 'Status', value: guildSettings?.leaveChannel ? '🟢 Enabled' : '🔴 Disabled', inline: true },
                        { name: 'Has Custom Message', value: guildSettings?.leaveMessage ? 'Yes' : 'No', inline: true },
                        { name: 'Current Message', value: currentMessage.length > 200 ? currentMessage.substring(0, 200) + '...' : currentMessage },
                        { name: 'Usage Examples', value: '• `!setleave #goodbye Tạm biệt {user}!`\n• `!setleave disable` - Tắt leave message\n• `!setleave test` - Test current config' },
                        { name: 'Available Variables', value: '• `{user}` - Username\n• `{mention}` - User mention\n• `{server}` - Server name\n• `{membercount}` - Member count' }
                    ]
                );
                return message.reply({ 
                    embeds: [result.embed], 
                    files: result.attachments 
                });
            }
            
            // Handle disable command
            if (args[0].toLowerCase() === 'disable') {
                await client.prisma.guildSettings.upsert({
                    where: { guildId: message.guild.id },
                    update: { 
                        leaveChannel: null,
                        leaveMessage: null 
                    },
                    create: {
                        guildId: message.guild.id,
                        leaveChannel: null,
                        leaveMessage: null
                    }
                });
                
                const result = productionStyle.createSuccessEmbed(
                    'LEAVE MESSAGE DISABLED',
                    { tag: 'Configuration Updated' },
                    message.author,
                    'Hệ thống leave message đã được tắt',
                    [
                        { name: 'Status', value: '🔴 Disabled', inline: true },
                        { name: 'Effect', value: 'No goodbye messages', inline: true },
                        { name: 'Re-enable', value: 'Use `!setleave #channel message`', inline: true }
                    ]
                );
                return message.reply({ 
                    embeds: [result.embed], 
                    files: result.attachments 
                });
            }
            
            // Handle test command
            if (args[0].toLowerCase() === 'test') {
                if (!guildSettings?.leaveChannel || !guildSettings?.leaveMessage) {
                    const result = productionStyle.createWarningEmbed(
                        'No Leave Configuration',
                        'Chưa cấu hình leave message để test!',
                        [
                            { name: 'Required Setup', value: 'Channel and message must be configured first' },
                            { name: 'Setup Command', value: '`!setleave #channel Your goodbye message`' }
                        ]
                    );
                    return message.reply({ 
                        embeds: [result.embed], 
                        files: result.attachments 
                    });
                }
                
                const testChannel = message.guild.channels.cache.get(guildSettings.leaveChannel);
                if (!testChannel) {
                    const result = productionStyle.createErrorEmbed(
                        'Channel Not Found',
                        'Kênh leave đã cấu hình không tồn tại!',
                        'Please reconfigure with a valid channel'
                    );
                    return message.reply({ 
                        embeds: [result.embed], 
                        files: result.attachments 
                    });
                }
                
                // Format test message
                const testMessage = formatLeaveMessage(guildSettings.leaveMessage, message.author, message.guild);
                
                try {
                    await testChannel.send(`🧪 **LEAVE MESSAGE TEST:**\n${testMessage}`);
                    
                    const result = productionStyle.createSuccessEmbed(
                        'LEAVE MESSAGE TEST SENT',
                        { tag: 'Test Successful' },
                        message.author,
                        'Test message đã được gửi thành công!',
                        [
                            { name: 'Test Channel', value: testChannel.toString(), inline: true },
                            { name: 'Message Length', value: `${testMessage.length}/2000`, inline: true },
                            { name: 'Status', value: '✅ Test completed', inline: true },
                            { name: 'Test Message', value: testMessage.length > 200 ? testMessage.substring(0, 200) + '...' : testMessage }
                        ]
                    );
                    return message.reply({ 
                        embeds: [result.embed], 
                        files: result.attachments 
                    });
                } catch (error) {
                    const result = productionStyle.createErrorEmbed(
                        'Test Failed',
                        'Không thể gửi test message!',
                        error.message
                    );
                    return message.reply({ 
                        embeds: [result.embed], 
                        files: result.attachments 
                    });
                }
            }
            
            // Configure leave message
            let targetChannel = null;
            let leaveMessage = '';
            
            // Parse channel
            if (args[0].startsWith('<#') || /^\d+$/.test(args[0])) {
                const channelMention = message.mentions.channels.first();
                const channelId = args[0].replace(/[<#>]/g, '');
                
                if (channelMention) {
                    targetChannel = channelMention;
                } else {
                    targetChannel = message.guild.channels.cache.get(channelId);
                }
                
                if (!targetChannel) {
                    const result = productionStyle.createErrorEmbed(
                        'Channel Not Found',
                        'Không tìm thấy kênh được chỉ định!',
                        'Use #channel mention or valid channel ID'
                    );
                    return message.reply({ 
                        embeds: [result.embed], 
                        files: result.attachments 
                    });
                }
                
                leaveMessage = args.slice(1).join(' ');
            } else {
                // Use current channel if no channel specified
                targetChannel = message.channel;
                leaveMessage = args.join(' ');
            }
            
            // Validate message
            if (!leaveMessage.trim()) {
                const result = productionStyle.createWarningEmbed(
                    'Missing Message',
                    'Vui lòng cung cấp nội dung leave message!',
                    [
                        { name: 'Example', value: '`!setleave #goodbye Tạm biệt {user}!`' },
                        { name: 'Variables', value: '{user}, {mention}, {server}, {membercount}' }
                    ]
                );
                return message.reply({ 
                    embeds: [result.embed], 
                    files: result.attachments 
                });
            }
            
            // Validate message length
            if (leaveMessage.length > 1000) {
                const result = productionStyle.createErrorEmbed(
                    'Message Too Long',
                    'Leave message không được vượt quá 1000 ký tự!',
                    `Current: ${leaveMessage.length}/1000 characters`
                );
                return message.reply({ 
                    embeds: [result.embed], 
                    files: result.attachments 
                });
            }
            
            // Validate channel
            if (!targetChannel.isTextBased()) {
                const result = productionStyle.createErrorEmbed(
                    'Invalid Channel Type',
                    'Chỉ có thể sử dụng text channel làm kênh leave!',
                    'Select a text channel instead'
                );
                return message.reply({ 
                    embeds: [result.embed], 
                    files: result.attachments 
                });
            }
            
            // Check bot permissions
            const botPermissions = targetChannel.permissionsFor(message.guild.members.me);
            if (!botPermissions.has(['ViewChannel', 'SendMessages'])) {
                const result = productionStyle.createErrorEmbed(
                    'Bot Missing Channel Permissions',
                    `Bot cần quyền **View Channel** và **Send Messages** trong ${targetChannel}!`,
                    'Grant the required permissions'
                );
                return message.reply({ 
                    embeds: [result.embed], 
                    files: result.attachments 
                });
            }
            
            // Save to database
            await client.prisma.guildSettings.upsert({
                where: { guildId: message.guild.id },
                update: { 
                    leaveChannel: targetChannel.id,
                    leaveMessage: leaveMessage
                },
                create: {
                    guildId: message.guild.id,
                    leaveChannel: targetChannel.id,
                    leaveMessage: leaveMessage
                }
            });
            
            // Success message
            const result = productionStyle.createSuccessEmbed(
                'LEAVE MESSAGE CONFIGURED',
                { tag: 'Configuration Updated' },
                message.author,
                'Leave message đã được cấu hình thành công!',
                [
                    { name: 'Leave Channel', value: targetChannel.toString(), inline: true },
                    { name: 'Message Length', value: `${leaveMessage.length}/1000`, inline: true },
                    { name: 'Status', value: '🟢 Active', inline: true },
                    { name: 'Leave Message', value: leaveMessage.length > 200 ? leaveMessage.substring(0, 200) + '...' : leaveMessage },
                    { name: 'Test Command', value: 'Use `!setleave test` to test the configuration' },
                    { name: 'Available Variables', value: '`{user}`, `{mention}`, `{server}`, `{membercount}`' }
                ]
            );
            
            await message.reply({ 
                embeds: [result.embed], 
                files: result.attachments 
            });
            
        } catch (error) {
            console.error('Lỗi khi cấu hình leave message:', error);
            
            const result = productionStyle.createErrorEmbed(
                'Configuration Error',
                'Không thể cấu hình leave message!',
                error.message
            );
            await message.reply({ 
                embeds: [result.embed], 
                files: result.attachments 
            });
        }
    }
};

// Helper function to format leave message
function formatLeaveMessage(template, user, guild) {
    return template
        .replace(/{user}/g, user.username)
        .replace(/{mention}/g, `<@${user.id}>`)
        .replace(/{server}/g, guild.name)
        .replace(/{membercount}/g, guild.memberCount.toLocaleString());
} 