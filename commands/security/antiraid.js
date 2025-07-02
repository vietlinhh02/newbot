const { PermissionFlagsBits } = require('discord.js');
const { hasFlexiblePermission } = require('../../utils/permissions');
const productionStyle = require('../../utils/demoStyle');

module.exports = {
    name: 'antiraid',
    aliases: ['antiraids', 'raidprotection'],
    description: 'Bật/tắt chế độ chống raid cho server',
    usage: '!antiraid [on/off] [level]',
    examples: [
        '!antiraid on',
        '!antiraid off', 
        '!antiraid on strict',
        '!raidprotection status'
    ],
    permissions: 'admin',
    guildOnly: true,
    category: 'security',
    
    async execute(message, args, client) {
        // Check permissions
        if (!await hasFlexiblePermission(message.member, 'antiraid', this.permissions, message.guild.id)) {
            const result = productionStyle.createErrorEmbed(
                'Permission Denied',
                'Bạn cần quyền **Administrator** để cấu hình antiraid!'
            );
            return message.reply({ 
                embeds: [result.embed], 
                files: result.attachments 
            });
        }
        
        // Check bot permissions
        if (!message.guild.members.me.permissions.has([PermissionFlagsBits.KickMembers, PermissionFlagsBits.BanMembers])) {
            const result = productionStyle.createErrorEmbed(
                'Bot Missing Permissions',
                'Bot cần quyền **Kick Members** và **Ban Members** để thực hiện chế độ antiraid!',
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
                const status = guildSettings?.antiRaid ? '🟢 ENABLED' : '🔴 DISABLED';
                const level = guildSettings?.antiRaidLevel || 'none';
                const actions = guildSettings?.antiRaidActions || 'none';
                
                const result = productionStyle.createInfoEmbed(
                    'ANTIRAID STATUS',
                    { tag: 'Security System' },
                    message.author,
                    'Current antiraid configuration for this server',
                    [
                        { name: 'Status', value: status, inline: true },
                        { name: 'Level', value: level, inline: true },
                        { name: 'Actions', value: actions, inline: true },
                        { name: 'How to Use', value: '• `!antiraid on` - Enable (normal level)\n• `!antiraid on strict` - Enable (strict level)\n• `!antiraid off` - Disable antiraid', inline: false },
                        { name: 'Protection Levels', value: '• **normal** - 5 joins trong 30s → timeout\n• **strict** - 3 joins trong 20s → kick/ban', inline: false }
                    ]
                );
                
                return message.reply({ 
                    embeds: [result.embed], 
                    files: result.attachments 
                });
            }
            
            const action = args[0].toLowerCase();
            
            // Turn off antiraid
            if (action === 'off' || action === 'disable') {
                await client.prisma.guildSettings.upsert({
                    where: { guildId: message.guild.id },
                    update: { 
                        antiRaid: false,
                        antiRaidLevel: null,
                        antiRaidActions: null
                    },
                    create: {
                        guildId: message.guild.id,
                        antiRaid: false
                    }
                });
                
                const result = productionStyle.createSuccessEmbed(
                    'ANTIRAID DISABLED',
                    { tag: 'Security Config' },
                    message.author,
                    'Antiraid protection has been disabled for this server',
                    [
                        { name: 'Status', value: '🔴 Disabled', inline: true },
                        { name: 'Effect', value: 'Server không còn được bảo vệ khỏi raid attacks', inline: true },
                        { name: 'Note', value: 'Use `!antiraid on [level]` to enable protection again', inline: false }
                    ]
                );
                
                return message.reply({ 
                    embeds: [result.embed], 
                    files: result.attachments 
                });
            }
            
            // Turn on antiraid
            if (action === 'on' || action === 'enable') {
                const level = args[1]?.toLowerCase() || 'normal';
                
                if (!['normal', 'strict'].includes(level)) {
                    const result = productionStyle.createErrorEmbed(
                        'Invalid Level',
                        'Chỉ chấp nhận `normal` hoặc `strict`!',
                        'Please choose either normal or strict protection level'
                    );
                    return message.reply({ 
                        embeds: [result.embed], 
                        files: result.attachments 
                    });
                }
                
                // Configure antiraid settings based on level
                let raidSettings = {};
                
                if (level === 'normal') {
                    raidSettings = {
                        antiRaid: true,
                        antiRaidLevel: 'normal',
                        antiRaidActions: 'timeout,kick',
                        antiRaidThreshold: 5,
                        antiRaidTimeframe: 30000 // 30 seconds
                    };
                } else if (level === 'strict') {
                    raidSettings = {
                        antiRaid: true,
                        antiRaidLevel: 'strict', 
                        antiRaidActions: 'kick,ban',
                        antiRaidThreshold: 3,
                        antiRaidTimeframe: 20000 // 20 seconds
                    };
                }
                
                await client.prisma.guildSettings.upsert({
                    where: { guildId: message.guild.id },
                    update: raidSettings,
                    create: {
                        guildId: message.guild.id,
                        ...raidSettings
                    }
                });
                
                // Store in memory for quick access
                if (!client.antiRaidData) client.antiRaidData = new Map();
                client.antiRaidData.set(message.guild.id, {
                    joins: [],
                    ...raidSettings
                });
                
                const levelInfo = level === 'normal' ? 
                    '5 joins trong 30s → timeout/kick' : 
                    '3 joins trong 20s → kick/ban';
                
                const result = productionStyle.createSuccessEmbed(
                    'ANTIRAID ENABLED',
                    { tag: 'Security Config' },
                    message.author,
                    'Antiraid protection has been enabled for this server',
                    [
                        { name: 'Status', value: '🟢 Enabled', inline: true },
                        { name: 'Level', value: level.toUpperCase(), inline: true },
                        { name: 'Threshold', value: levelInfo, inline: true },
                        { name: 'Actions', value: raidSettings.antiRaidActions, inline: true },
                        { name: 'Detection', value: `${raidSettings.antiRaidThreshold} joins in ${raidSettings.antiRaidTimeframe/1000}s`, inline: true },
                        { name: 'Effect', value: '🔒 Server đã được bảo vệ khỏi raid attacks!', inline: true },
                        { name: 'How It Works', value: `Users joining rapidly will be automatically ${raidSettings.antiRaidActions.includes('ban') ? 'banned' : 'kicked/timed out'}`, inline: false }
                    ]
                );
                
                await message.reply({ 
                    embeds: [result.embed], 
                    files: result.attachments 
                });
                
                // Log to moderation channel
                try {
                    if (guildSettings?.logChannel) {
                        const logChannel = message.guild.channels.cache.get(guildSettings.logChannel);
                        
                        if (logChannel) {
                            const logResult = productionStyle.createSuccessEmbed(
                                'ANTIRAID CONFIGURATION LOG',
                                { tag: 'Security Log' },
                                message.author,
                                `Antiraid has been enabled by ${message.author.tag}`,
                                [
                                    { name: 'Moderator', value: `${message.author.tag} (${message.author.id})`, inline: true },
                                    { name: 'Level', value: level.toUpperCase(), inline: true },
                                    { name: 'Actions', value: raidSettings.antiRaidActions, inline: true },
                                    { name: 'Threshold', value: `${raidSettings.antiRaidThreshold} joins in ${raidSettings.antiRaidTimeframe/1000}s`, inline: true },
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
                    console.error('Error sending antiraid log:', logError);
                }
                
                return;
            }
            
            // Show status
            if (action === 'status' || action === 'info') {
                const status = guildSettings?.antiRaid ? '🟢 ACTIVE' : '🔴 INACTIVE';
                const level = guildSettings?.antiRaidLevel || 'none';
                const threshold = guildSettings?.antiRaidThreshold || 0;
                const timeframe = guildSettings?.antiRaidTimeframe || 0;
                const actions = guildSettings?.antiRaidActions || 'none';
                
                const result = productionStyle.createInfoEmbed(
                    'ANTIRAID STATUS REPORT',
                    { tag: 'Detailed Status' },
                    message.author,
                    'Complete antiraid system information',
                    [
                        { name: 'Status', value: status, inline: true },
                        { name: 'Level', value: level, inline: true },
                        { name: 'Threshold', value: `${threshold} joins in ${timeframe/1000}s`, inline: true },
                        { name: 'Actions', value: actions, inline: true },
                        { name: 'Last Update', value: `<t:${Math.floor((guildSettings?.updatedAt?.getTime() || Date.now()) / 1000)}:R>`, inline: true },
                        { name: 'System Health', value: client.antiRaidData?.has(message.guild.id) ? '✅ Active in memory' : '⚠️ Not loaded', inline: true }
                    ]
                );
                
                return message.reply({ 
                    embeds: [result.embed], 
                    files: result.attachments 
                });
            }
            
            const result = productionStyle.createErrorEmbed(
                'Invalid Parameter',
                'Dùng `on`, `off`, hoặc `status`!',
                'Use !antiraid on/off/status'
            );
            return message.reply({ 
                embeds: [result.embed], 
                files: result.attachments 
            });
            
        } catch (error) {
            console.error('Antiraid configuration error:', error);
            
            const result = productionStyle.createErrorEmbed(
                'Configuration Failed',
                'Không thể cấu hình antiraid!',
                error.message
            );
            await message.reply({ 
                embeds: [result.embed], 
                files: result.attachments 
            });
        }
    }
}; 