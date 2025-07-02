const { hasFlexiblePermission } = require('../../utils/permissions');
const productionStyle = require('../../utils/demoStyle');

module.exports = {
    name: 'setmuterole',
    aliases: ['muterole'],
    description: 'Thiết lập role mute cho lệnh mute',
    usage: '!setmuterole [@role|disable]',
    examples: [
        '!setmuterole @Muted',
        '!setmuterole disable'
    ],
    permissions: 'admin',
    guildOnly: true,
    category: 'config',
    
    async execute(message, args, client) {
        // Check permissions
        if (!await hasFlexiblePermission(message.member, 'setmuterole', this.permissions, message.guild.id)) {
            const result = productionStyle.createErrorEmbed(
                'Permission Denied',
                'Bạn cần quyền **Administrator** để sử dụng lệnh này.'
            );
            return message.reply({ 
                embeds: [result.embed], 
                files: result.attachments 
            });
        }

        // Show setup recommendation if no args
        if (!args.length) {
            // Get current settings
            const guildSettings = await client.prisma.guildSettings.findUnique({
                where: { guildId: message.guild.id }
            });
            
            const currentRole = guildSettings?.muteRole ? 
                `<@&${guildSettings.muteRole}>` : 'Chưa cấu hình';
            
            const result = productionStyle.createInfoEmbed(
                'MUTE ROLE SETUP GUIDE',
                { tag: 'Configuration Helper' },
                message.author,
                'Thay vì cấu hình từng lệnh riêng biệt, bạn có thể sử dụng Setup Wizard!',
                [
                    { 
                        name: '🚀 Setup Wizard (Recommended)', 
                        value: '• Giao diện trực quan với buttons\n• Tự động tạo role @Muted nếu chưa có\n• Cấu hình permissions cho tất cả channels\n• Hướng dẫn chi tiết từng bước\n\n**Command:** `!setup`' 
                    },
                    { 
                        name: '📊 Current Configuration', 
                        value: `🎭 **Mute Role:** ${currentRole}` 
                    },
                    { 
                        name: '📝 Manual Configuration', 
                        value: '• `!setmuterole @role` - Thiết lập mute role\n• `!setmuterole disable` - Tắt mute role\n\n**Example:** `!setmuterole @Muted`' 
                    },
                    { 
                        name: '🎯 Mute Role Features', 
                        value: '• Tự động áp dụng khi dùng `!mute`\n• Ngăn gửi tin nhắn và nói voice\n• Tương thích với timeout Discord\n• Quản lý permissions tự động' 
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
                    update: { muteRole: null },
                    create: { guildId: message.guild.id, muteRole: null }
                });

                const result = productionStyle.createSuccessEmbed(
                    'MUTE ROLE DISABLED',
                    { tag: 'Configuration Updated' },
                    message.author,
                    'Hệ thống mute role đã được tắt thành công.',
                    [
                        { name: 'Status', value: '🔴 Disabled', inline: true },
                        { name: 'Effect', value: 'Only Discord timeout will be used', inline: true },
                        { name: 'Setup Alternative', value: 'Use `!setup` to reconfigure', inline: true },
                        { name: 'Note', value: 'Lệnh `!mute` sẽ chỉ sử dụng Discord timeout' },
                        { name: 'Tip', value: 'Sử dụng `!setup` để cấu hình lại hoặc thiết lập các tính năng khác' }
                    ]
                );
                return message.reply({ 
                    embeds: [result.embed], 
                    files: result.attachments 
                });
            }

            // Get target role
            const roleMention = message.mentions.roles.first();
            let targetRole = null;

            if (roleMention) {
                targetRole = roleMention;
            } else {
                const roleId = args[0].replace(/[<@&>]/g, '');
                try {
                    targetRole = await message.guild.roles.fetch(roleId);
                } catch (error) {
                    const result = productionStyle.createErrorEmbed(
                        'Role Not Found',
                        'Không tìm thấy role với ID được cung cấp.',
                        'Use @role mention or valid role ID'
                    );
                    return message.reply({ 
                        embeds: [result.embed], 
                        files: result.attachments 
                    });
                }
            }

            if (!targetRole) {
                const result = productionStyle.createErrorEmbed(
                    'Invalid Role',
                    'Vui lòng mention một role hợp lệ hoặc cung cấp ID role.',
                    'Example: !setmuterole @Muted'
                );
                return message.reply({ 
                    embeds: [result.embed], 
                    files: result.attachments 
                });
            }

            // Check if bot can manage this role
            if (targetRole.position >= message.guild.members.me.roles.highest.position) {
                const result = productionStyle.createErrorEmbed(
                    'Role Hierarchy Error',
                    'Bot không thể quản lý role này.',
                    'Bot role must be higher than the mute role',
                    [
                        { name: 'Fix', value: 'Di chuyển role của bot lên cao hơn role mute' },
                        { name: 'Alternative', value: 'Sử dụng `!setup` để tự động tạo và cấu hình role phù hợp' }
                    ]
                );
                return message.reply({ 
                    embeds: [result.embed], 
                    files: result.attachments 
                });
            }

            // Check role permissions
            if (targetRole.permissions.has(['SendMessages', 'Speak'])) {
                const result = productionStyle.createWarningEmbed(
                    'Role Permission Warning',
                    'Role này có quyền gửi tin nhắn hoặc nói voice. Điều này có thể làm mute không hiệu quả.',
                    [
                        { name: 'Warning', value: 'Tạo role mới không có permissions hoặc chỉnh sửa role này' },
                        { name: 'Auto-fix', value: 'Sử dụng `!setup` để bot tự động tạo role tối ưu' }
                    ]
                );
                await message.reply({ 
                    embeds: [result.embed], 
                    files: result.attachments 
                });
            }

            // Update mute role
            await client.prisma.guildSettings.upsert({
                where: { guildId: message.guild.id },
                update: { muteRole: targetRole.id },
                create: { guildId: message.guild.id, muteRole: targetRole.id }
            });

            // Send success message
            const result = productionStyle.createSuccessEmbed(
                'MUTE ROLE CONFIGURED',
                { tag: 'Configuration Updated' },
                message.author,
                'Mute role đã được thiết lập thành công!',
                [
                    { name: 'Mute Role', value: targetRole.toString(), inline: true },
                    { name: 'Position', value: `#${targetRole.position}`, inline: true },
                    { name: 'Members', value: `${targetRole.members.size} người`, inline: true },
                    { name: 'Color', value: targetRole.hexColor, inline: true },
                    { name: 'Permissions', value: targetRole.permissions.has(['SendMessages', 'Speak']) ? '⚠️ Has permissions' : '✅ No send perms', inline: true },
                    { name: 'Status', value: '🟢 Active', inline: true },
                    { name: 'Usage', value: 'Role này sẽ được áp dụng khi sử dụng lệnh `!mute`' },
                    { name: 'Next Steps', value: '• Test với `!mute @user` để kiểm tra\n• Sử dụng `!setup` để cấu hình thêm features khác' }
                ]
            );

            await message.reply({ 
                embeds: [result.embed], 
                files: result.attachments 
            });

        } catch (error) {
            console.error('Lỗi khi thiết lập mute role:', error);
            
            const result = productionStyle.createErrorEmbed(
                'Configuration Error',
                'Đã xảy ra lỗi khi thiết lập mute role.',
                error.message
            );
            
            await message.reply({ 
                embeds: [result.embed], 
                files: result.attachments 
            });
        }
    }
}; 