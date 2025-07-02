const { PermissionFlagsBits } = require('discord.js');
const { hasFlexiblePermission } = require('../../utils/permissions');
const productionStyle = require('../../utils/demoStyle');

module.exports = {
    name: 'joinrole',
    aliases: ['autorole', 'memberrole'],
    description: 'Cấu hình role tự động cấp cho thành viên mới',
    usage: '!joinrole [@role|role_name]',
    examples: [
        '!joinrole @Member',
        '!autorole Member',
        '!joinrole disable'
    ],
    permissions: 'admin',
    guildOnly: true,
    category: 'config',
    
    async execute(message, args, client) {
        // Check permissions
        if (!await hasFlexiblePermission(message.member, 'joinrole', this.permissions, message.guild.id)) {
            const result = productionStyle.createErrorEmbed(
                'Permission Denied',
                'Bạn cần quyền **Administrator** để cấu hình join role!'
            );
            return message.reply({ 
                embeds: [result.embed], 
                files: result.attachments 
            });
        }
        
        // Check bot permissions
        if (!message.guild.members.me.permissions.has(PermissionFlagsBits.ManageRoles)) {
            const result = productionStyle.createErrorEmbed(
                'Bot Missing Permissions',
                'Bot cần quyền **Manage Roles** để thực hiện lệnh này!',
                'Grant the Manage Roles permission to the bot'
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
            
            // Show current config if no args
            if (!args[0]) {
                const currentRole = guildSettings?.joinRole ? 
                    `<@&${guildSettings.joinRole}>` : 'Chưa cấu hình';
                
                const result = productionStyle.createInfoEmbed(
                    'JOIN ROLE CONFIGURATION',
                    { tag: 'Current Settings' },
                    message.author,
                    'Current auto-role configuration for new members',
                    [
                        { name: 'Current Role', value: currentRole, inline: true },
                        { name: 'Status', value: guildSettings?.joinRole ? '🟢 Enabled' : '🔴 Disabled', inline: true },
                        { name: 'Auto-Applied', value: guildSettings?.joinRole ? 'Yes' : 'No', inline: true },
                        { name: 'Usage Examples', value: '• `!joinrole @role` - Đặt role tự động\n• `!joinrole disable` - Tắt join role' },
                        { name: 'Features', value: '💡 Role sẽ được cấp tự động khi có thành viên mới join server' }
                    ]
                );
                return message.reply({ 
                    embeds: [result.embed], 
                    files: result.attachments 
                });
            }
            
            // Disable join role
            if (args[0].toLowerCase() === 'disable') {
                await client.prisma.guildSettings.upsert({
                    where: { guildId: message.guild.id },
                    update: { joinRole: null },
                    create: {
                        guildId: message.guild.id,
                        joinRole: null
                    }
                });
                
                const result = productionStyle.createSuccessEmbed(
                    'JOIN ROLE DISABLED',
                    { tag: 'Configuration Updated' },
                    message.author,
                    'Đã tắt hệ thống join role!',
                    [
                        { name: 'Status', value: '🔴 Disabled', inline: true },
                        { name: 'Effect', value: 'No auto-role for new members', inline: true },
                        { name: 'Re-enable', value: 'Use `!joinrole @role` to enable', inline: true }
                    ]
                );
                return message.reply({ 
                    embeds: [result.embed], 
                    files: result.attachments 
                });
            }
            
            // Set join role
            let targetRole = null;
            const roleMention = message.mentions.roles.first();
            const roleQuery = args.join(' ').toLowerCase();
            
            if (roleMention) {
                targetRole = roleMention;
            } else {
                // Find role by name or ID
                targetRole = message.guild.roles.cache.find(role => 
                    role.name.toLowerCase().includes(roleQuery) ||
                    role.name.toLowerCase() === roleQuery ||
                    role.id === args[0]
                );
            }
            
            if (!targetRole) {
                const result = productionStyle.createErrorEmbed(
                    'Role Not Found',
                    'Vui lòng mention role hoặc cung cấp tên role hợp lệ!',
                    'Use @role mention, role ID, or exact role name'
                );
                return message.reply({ 
                    embeds: [result.embed], 
                    files: result.attachments 
                });
            }
            
            // Check role position
            if (targetRole.position >= message.guild.members.me.roles.highest.position) {
                const result = productionStyle.createErrorEmbed(
                    'Role Hierarchy Error',
                    'Bot không thể quản lý role này!',
                    'Bot role must be higher than the target role'
                );
                return message.reply({ 
                    embeds: [result.embed], 
                    files: result.attachments 
                });
            }
            
            // Check if role is managed
            if (targetRole.managed) {
                const result = productionStyle.createErrorEmbed(
                    'Invalid Role',
                    'Role được quản lý bởi bot khác!',
                    'Cannot use managed roles for auto-assignment'
                );
                return message.reply({ 
                    embeds: [result.embed], 
                    files: result.attachments 
                });
            }
            
            // Check if role is @everyone
            if (targetRole.id === message.guild.roles.everyone.id) {
                const result = productionStyle.createErrorEmbed(
                    'Invalid Role',
                    'Không thể đặt @everyone làm join role!',
                    '@everyone role cannot be assigned automatically'
                );
                return message.reply({ 
                    embeds: [result.embed], 
                    files: result.attachments 
                });
            }
            
            // Save to database
            await client.prisma.guildSettings.upsert({
                where: { guildId: message.guild.id },
                update: { joinRole: targetRole.id },
                create: {
                    guildId: message.guild.id,
                    joinRole: targetRole.id
                }
            });
            
            const result = productionStyle.createSuccessEmbed(
                'JOIN ROLE CONFIGURED',
                { tag: 'Configuration Updated' },
                message.author,
                'Join role đã được cấu hình thành công!',
                [
                    { name: 'Role', value: targetRole.toString(), inline: true },
                    { name: 'Role ID', value: `\`${targetRole.id}\``, inline: true },
                    { name: 'Position', value: `#${targetRole.position}`, inline: true },
                    { name: 'Color', value: targetRole.hexColor, inline: true },
                    { name: 'Members', value: `${targetRole.members.size}`, inline: true },
                    { name: 'Status', value: '🟢 Active', inline: true },
                    { name: 'Auto-Assignment', value: '💡 Thành viên mới sẽ tự động nhận role này khi join server!' }
                ]
            );
            
            await message.reply({ 
                embeds: [result.embed], 
                files: result.attachments 
            });
            
        } catch (error) {
            console.error('Lỗi khi cấu hình join role:', error);
            
            const result = productionStyle.createErrorEmbed(
                'Configuration Error',
                'Không thể cấu hình join role!',
                error.message
            );
            await message.reply({ 
                embeds: [result.embed], 
                files: result.attachments 
            });
        }
    }
}; 