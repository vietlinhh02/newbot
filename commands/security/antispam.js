const { PermissionFlagsBits } = require('discord.js');
const { hasFlexiblePermission } = require('../../utils/permissions');
const productionStyle = require('../../utils/demoStyle');

module.exports = {
    name: 'antispam',
    aliases: ['spamprotection', 'nospam'],
    description: 'Bật/tắt chế độ chống spam tin nhắn',
    usage: '!antispam [on/off] [max_messages] [timeframe]',
    examples: [
        '!antispam on',
        '!antispam on 5 10',
        '!antispam off',
        '!nospam status'
    ],
    permissions: 'admin',
    guildOnly: true,
    category: 'security',
    
    async execute(message, args, client) {
        // Check permissions
        if (!await hasFlexiblePermission(message.member, 'antispam', this.permissions, message.guild.id)) {
            const result = productionStyle.createErrorEmbed(
                'Permission Denied',
                'Bạn cần quyền **Administrator** để cấu hình antispam!'
            );
            return message.reply({ 
                embeds: [result.embed], 
                files: result.attachments 
            });
        }
        
        // Check bot permissions
        if (!message.guild.members.me.permissions.has([PermissionFlagsBits.ManageMessages, PermissionFlagsBits.ModerateMembers])) {
            const result = productionStyle.createErrorEmbed(
                'Bot Missing Permissions',
                'Bot cần quyền **Manage Messages** và **Moderate Members** để thực hiện chế độ antispam!',
                'Grant these permissions to the bot'
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
            
            // Show current status if no args
            if (!args[0]) {
                const status = guildSettings?.antiSpam ? '🟢 BẬT' : '🔴 TẮT';
                const maxMessages = guildSettings?.spamMaxMessages || 5;
                const timeframe = guildSettings?.spamTimeframe || 10;
                const actions = guildSettings?.spamActions || 'timeout,delete';
                
                const result = productionStyle.createInfoEmbed(
                    'ANTISPAM STATUS',
                    { tag: 'Security System' },
                    message.author,
                    'Current antispam configuration for this server',
                    [
                        { name: 'Status', value: status, inline: true },
                        { name: 'Threshold', value: `${maxMessages} messages/${timeframe}s`, inline: true },
                        { name: 'Actions', value: actions, inline: true },
                        { name: 'Usage', value: '• `!antispam on` - Enable (5 messages/10s)\n• `!antispam on 3 5` - Enable (3 messages/5s)\n• `!antispam off` - Disable', inline: false },
                        { name: 'Current Actions', value: 'Delete spam messages + timeout user', inline: false }
                    ]
                );
                
                return message.reply({ 
                    embeds: [result.embed], 
                    files: result.attachments 
                });
            }
            
            const action = args[0].toLowerCase();
            
            // Turn off antispam
            if (action === 'off' || action === 'disable') {
                await client.prisma.guildSettings.upsert({
                    where: { guildId: message.guild.id },
                    update: { 
                        antiSpam: false,
                        spamMaxMessages: null,
                        spamTimeframe: null,
                        spamActions: null
                    },
                    create: {
                        guildId: message.guild.id,
                        antiSpam: false
                    }
                });
                
                // Clear spam tracking data
                if (client.spamData) {
                    client.spamData.delete(message.guild.id);
                }
                
                const result = productionStyle.createSuccessEmbed(
                    'ANTISPAM DISABLED',
                    { tag: 'Security Config' },
                    message.author,
                    'Antispam protection has been disabled for this server',
                    [
                        { name: 'Status', value: '🔴 Disabled', inline: true },
                        { name: 'Effect', value: 'Members can send messages freely', inline: true },
                        { name: 'Data Cleared', value: 'Spam tracking data removed', inline: true },
                        { name: 'Note', value: 'Use `!antispam on` to enable protection again', inline: false }
                    ]
                );
                
                return message.reply({ 
                    embeds: [result.embed], 
                    files: result.attachments 
                });
            }
            
            // Turn on antispam
            if (action === 'on' || action === 'enable') {
                const maxMessages = parseInt(args[1]) || 5;
                const timeframe = parseInt(args[2]) || 10;
                
                // Validate parameters
                if (maxMessages < 2 || maxMessages > 50) {
                    const result = productionStyle.createErrorEmbed(
                        'Invalid Parameters',
                        'Max messages phải từ 2 đến 50!',
                        'Please provide a valid message count'
                    );
                    return message.reply({ 
                        embeds: [result.embed], 
                        files: result.attachments 
                    });
                }
                
                if (timeframe < 5 || timeframe > 300) {
                    const result = productionStyle.createErrorEmbed(
                        'Invalid Parameters',
                        'Timeframe phải từ 5 đến 300 giây!',
                        'Please provide a valid timeframe'
                    );
                    return message.reply({ 
                        embeds: [result.embed], 
                        files: result.attachments 
                    });
                }
                
                const spamSettings = {
                    antiSpam: true,
                    spamMaxMessages: maxMessages,
                    spamTimeframe: timeframe,
                    spamActions: 'timeout,delete'
                };
                
                await client.prisma.guildSettings.upsert({
                    where: { guildId: message.guild.id },
                    update: spamSettings,
                    create: {
                        guildId: message.guild.id,
                        ...spamSettings
                    }
                });
                
                // Initialize spam tracking
                if (!client.spamData) client.spamData = new Map();
                client.spamData.set(message.guild.id, {
                    userMessages: new Map(),
                    ...spamSettings
                });
                
                const result = productionStyle.createSuccessEmbed(
                    'ANTISPAM ENABLED',
                    { tag: 'Security Config' },
                    message.author,
                    'Antispam protection has been enabled for this server',
                    [
                        { name: 'Status', value: '🟢 Enabled', inline: true },
                        { name: 'Threshold', value: `${maxMessages} messages`, inline: true },
                        { name: 'Timeframe', value: `${timeframe} seconds`, inline: true },
                        { name: 'Actions', value: 'Delete messages + timeout user', inline: true },
                        { name: 'Effect', value: `Users sending more than ${maxMessages} messages in ${timeframe} seconds will be timed out`, inline: false },
                        { name: 'Exemptions', value: 'Administrators and Moderators are exempt from spam detection', inline: false }
                    ]
                );
                
                await message.reply({ 
                    embeds: [result.embed], 
                    files: result.attachments 
                });
                
                // Log to mod channel
                try {
                    if (guildSettings?.logChannel) {
                        const logChannel = message.guild.channels.cache.get(guildSettings.logChannel);
                        
                        if (logChannel) {
                            const logResult = productionStyle.createSuccessEmbed(
                                'ANTISPAM CONFIGURATION LOG',
                                { tag: 'Security Log' },
                                message.author,
                                `Antispam has been enabled by ${message.author.tag}`,
                                [
                                    { name: 'Moderator', value: `${message.author.tag} (${message.author.id})`, inline: true },
                                    { name: 'Threshold', value: `${maxMessages} messages/${timeframe}s`, inline: true },
                                    { name: 'Actions', value: 'timeout,delete', inline: true },
                                    { name: 'Time', value: `<t:${Math.floor(Date.now() / 1000)}:F>`, inline: true }
                                ]
                            );
                            
                            await logChannel.send({ 
                                embeds: [logResult.embed], 
                                files: logResult.attachments 
                            });
                        }
                    }
                } catch (logError) {
                    console.error('Error sending antispam log:', logError);
                }
                
                return;
            }
            
            // Invalid action
            const result = productionStyle.createErrorEmbed(
                'Invalid Action',
                'Hành động không hợp lệ! Chỉ chấp nhận `on` hoặc `off`.',
                'Use `!antispam on` to enable or `!antispam off` to disable'
            );
            return message.reply({ 
                embeds: [result.embed], 
                files: result.attachments 
            });
            
        } catch (error) {
            console.error('Antispam error:', error);
            
            const result = productionStyle.createErrorEmbed(
                'Configuration Failed',
                'Không thể cấu hình antispam!',
                error.message
            );
            await message.reply({ 
                embeds: [result.embed], 
                files: result.attachments 
            });
        }
    }
}; 