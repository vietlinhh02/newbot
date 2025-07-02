const { PermissionFlagsBits } = require('discord.js');
const { hasFlexiblePermission } = require('../../utils/permissions');
const productionStyle = require('../../utils/demoStyle');

module.exports = {
    name: 'automod',
    aliases: ['automoderation', 'modauto'],
    description: 'Bật/tắt hệ thống kiểm duyệt tự động',
    usage: '!automod [on/off] [type]',
    examples: [
        '!automod on',
        '!automod off',
        '!automod on links',
        '!modauto status'
    ],
    permissions: 'admin',
    guildOnly: true,
    category: 'config',
    
    async execute(message, args, client) {
        // Check permissions
        if (!await hasFlexiblePermission(message.member, 'automod', this.permissions, message.guild.id)) {
            const result = productionStyle.createErrorEmbed(
                'Permission Denied',
                'Bạn cần quyền **Administrator** để cấu hình automod!'
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
                'Bot cần quyền **Manage Messages** và **Moderate Members** để thực hiện automod!',
                'Required for message deletion and timeouts'
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
            
            // Show status if no arguments
            if (!args[0]) {
                const isEnabled = guildSettings?.autoMod || false;
                const filters = guildSettings?.autoModFilters || 'none';
                const actions = guildSettings?.autoModActions || 'none';
                
                const result = productionStyle.createInfoEmbed(
                    'AUTOMOD STATUS',
                    { tag: 'Configuration Status' },
                    message.author,
                    isEnabled ? 'Automod system is currently enabled' : 'Automod system is currently disabled',
                    [
                        { name: 'Status', value: isEnabled ? '🟢 Enabled' : '🔴 Disabled', inline: true },
                        { name: 'Filters', value: filters === 'none' ? 'Not configured' : filters, inline: true },
                        { name: 'Actions', value: actions === 'none' ? 'Not configured' : actions, inline: true },
                        { name: 'Usage', value: '• `!automod on [type]` - Enable automod\n• `!automod off` - Disable automod\n• `!automod status` - Show current status' },
                        { name: 'Filter Types', value: '• `all` - All filters\n• `links` - Block links\n• `spam` - Anti-spam\n• `caps` - Excessive caps\n• `profanity` - Bad words' }
                    ]
                );
                return message.reply({ 
                    embeds: [result.embed], 
                    files: result.attachments 
                });
            }
            
            const action = args[0].toLowerCase();
            
            if (action === 'off' || action === 'disable') {
                // Disable automod
                await client.prisma.guildSettings.upsert({
                    where: { guildId: message.guild.id },
                    update: { autoMod: false },
                    create: {
                        guildId: message.guild.id,
                        autoMod: false
                    }
                });
                
                const result = productionStyle.createSuccessEmbed(
                    'AUTOMOD DISABLED',
                    { tag: 'Configuration Updated' },
                    message.author,
                    'Hệ thống kiểm duyệt tự động đã được tắt',
                    [
                        { name: 'Status', value: '🔴 Disabled', inline: true },
                        { name: 'Effect', value: 'No automatic moderation', inline: true },
                        { name: 'Manual Override', value: 'Manual commands still work', inline: true }
                    ]
                );
                return message.reply({ 
                    embeds: [result.embed], 
                    files: result.attachments 
                });
            }
            
            if (action === 'on' || action === 'enable') {
                const filterType = args[1]?.toLowerCase() || 'all';
                let filters = '';
                let actions = 'delete,warn';
                
                switch (filterType) {
                    case 'links':
                        filters = 'links';
                        break;
                    case 'spam':
                        filters = 'spam';
                        break;
                    case 'caps':
                        filters = 'caps';
                        break;
                    case 'profanity':
                        filters = 'profanity';
                        actions = 'delete,warn,timeout';
                        break;
                    case 'all':
                    default:
                        filters = 'links,spam,caps,profanity';
                        actions = 'delete,warn,timeout';
                        break;
                }
                
                const autoModSettings = {
                    autoMod: true,
                    autoModFilters: filters,
                    autoModActions: actions
                };
                
                await client.prisma.guildSettings.upsert({
                    where: { guildId: message.guild.id },
                    update: autoModSettings,
                    create: {
                        guildId: message.guild.id,
                        ...autoModSettings
                    }
                });
                
                const result = productionStyle.createSuccessEmbed(
                    'AUTOMOD ENABLED',
                    { tag: 'Configuration Updated' },
                    message.author,
                    'Hệ thống kiểm duyệt tự động đã được bật',
                    [
                        { name: 'Status', value: '🟢 Enabled', inline: true },
                        { name: 'Filter Type', value: filterType.toUpperCase(), inline: true },
                        { name: 'Actions', value: actions.replace(/,/g, ', '), inline: true },
                        { name: 'Active Filters', value: filters.replace(/,/g, ', '), inline: false },
                        { name: 'Note', value: 'Bot will automatically moderate content based on configured filters' }
                    ]
                );
                return message.reply({ 
                    embeds: [result.embed], 
                    files: result.attachments 
                });
            }
            
            // Invalid action
            const result = productionStyle.createWarningEmbed(
                'Invalid Action',
                'Vui lòng sử dụng `on` hoặc `off`',
                [
                    { name: 'Valid Commands', value: '• `!automod on` - Enable all filters\n• `!automod on spam` - Enable spam filter only\n• `!automod off` - Disable automod' },
                    { name: 'Filter Types', value: 'all, links, spam, caps, profanity' }
                ]
            );
            return message.reply({ 
                embeds: [result.embed], 
                files: result.attachments 
            });
            
        } catch (error) {
            console.error('Lỗi khi cấu hình automod:', error);
            
            const result = productionStyle.createErrorEmbed(
                'Configuration Error',
                'Không thể cấu hình automod!',
                error.message
            );
            await message.reply({ 
                embeds: [result.embed], 
                files: result.attachments 
            });
        }
    }
}; 