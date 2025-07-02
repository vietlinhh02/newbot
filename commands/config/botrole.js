const { hasFlexiblePermission } = require('../../utils/permissions');
const productionStyle = require('../../utils/demoStyle');
const logger = require('../../utils/logger');

module.exports = {
    name: 'botrole',
    description: 'Cấu hình role tự động cho bot khi join server',
    aliases: ['setbotrole', 'botautorole'],
    usage: '!botrole <@role|role_name|disable>',
    category: 'config',
    permissions: 'admin',
    guildOnly: true,
    examples: [
        '!botrole @Bot',
        '!botrole "Discord Bots"',
        '!botrole disable'
    ],

    async execute(message, args, client) {
        try {
            // Check permissions
            if (!await hasFlexiblePermission(message.member, 'botrole', this.permissions, message.guild.id)) {
                const result = productionStyle.createErrorEmbed(
                    'Permission Denied',
                    'Bạn cần quyền **Admin** để sử dụng lệnh này.'
                );
                return message.reply({ 
                    embeds: [result.embed], 
                    files: result.attachments 
                });
            }

            // Check bot permissions
            if (!message.guild.members.me.permissions.has('ManageRoles')) {
                const result = productionStyle.createErrorEmbed(
                    'Bot Missing Permissions',
                    'Bot cần quyền **Manage Roles** để tự cấp role.',
                    'Grant the Manage Roles permission to the bot'
                );
                return message.reply({ 
                    embeds: [result.embed], 
                    files: result.attachments 
                });
            }

            // Parse argument
            if (!args[0]) {
                return this.showCurrentConfig(message, client);
            }

            const roleArg = args.join(' ').toLowerCase();

            // Handle disable command
            if (roleArg === 'disable' || roleArg === 'off' || roleArg === 'none') {
                try {
                    await client.prisma.guildSettings.upsert({
                        where: { guildId: message.guild.id },
                        update: { botRole: null },
                        create: {
                            guildId: message.guild.id,
                            botRole: null
                        }
                    });

                    const result = productionStyle.createSuccessEmbed(
                        'BOT ROLE DISABLED',
                        { tag: 'Configuration Updated' },
                        message.author,
                        'Bot sẽ không tự cấp role khi join server nữa.',
                        [
                            { name: 'Status', value: '🔴 Disabled', inline: true },
                            { name: 'Effect', value: 'No auto-role assignment', inline: true },
                            { name: 'Manual', value: 'Can still assign manually', inline: true }
                        ]
                    );
                    return message.reply({ 
                        embeds: [result.embed], 
                        files: result.attachments 
                    });
                } catch (error) {
                    logger.error('Database error in botrole disable', error);
                    const result = productionStyle.createErrorEmbed(
                        'Database Error',
                        'Không thể lưu cấu hình vào database.',
                        error.message
                    );
                    return message.reply({ 
                        embeds: [result.embed], 
                        files: result.attachments 
                    });
                }
            }

            // Find target role
            let targetRole = null;
            const originalArg = args.join(' ');

            // Try role mention first
            const roleIdMatch = originalArg.match(/^<@&(\d+)>$/);
            if (roleIdMatch) {
                try {
                    targetRole = await message.guild.roles.fetch(roleIdMatch[1]);
                } catch (error) {
                    logger.error('Role fetch error', error);
                }
            }

            // Try role ID
            if (!targetRole && /^\d+$/.test(originalArg)) {
                try {
                    targetRole = await message.guild.roles.fetch(originalArg);
                } catch (error) {
                    logger.error('Role fetch by ID error', error);
                }
            }

            // Try role name search
            if (!targetRole) {
                targetRole = message.guild.roles.cache.find(role => 
                    role.name.toLowerCase() === roleArg ||
                    role.name.toLowerCase().includes(roleArg)
                );
            }

            if (!targetRole) {
                const result = productionStyle.createErrorEmbed(
                    'Role Not Found',
                    'Không tìm thấy role với tên hoặc ID được cung cấp!',
                    'Use @role mention, role ID, or exact role name'
                );
                return message.reply({ 
                    embeds: [result.embed], 
                    files: result.attachments 
                });
            }

            // Validate role
            if (targetRole.managed) {
                const result = productionStyle.createErrorEmbed(
                    'Invalid Role',
                    'Role này được quản lý bởi Discord/bot khác!',
                    'Cannot assign managed roles automatically'
                );
                return message.reply({ 
                    embeds: [result.embed], 
                    files: result.attachments 
                });
            }

            if (targetRole.position >= message.guild.members.me.roles.highest.position) {
                const result = productionStyle.createErrorEmbed(
                    'Role Hierarchy Error',
                    'Bot không thể quản lý role này!',
                    'Bot role must be higher in hierarchy'
                );
                return message.reply({ 
                    embeds: [result.embed], 
                    files: result.attachments 
                });
            }

            if (targetRole.id === message.guild.roles.everyone.id) {
                const result = productionStyle.createErrorEmbed(
                    'Invalid Role',
                    'Không thể sử dụng @everyone làm bot role!',
                    'Choose a specific role instead'
                );
                return message.reply({ 
                    embeds: [result.embed], 
                    files: result.attachments 
                });
            }

            try {
                // Save to database
                await client.prisma.guildSettings.upsert({
                    where: { guildId: message.guild.id },
                    update: { botRole: targetRole.id },
                    create: {
                        guildId: message.guild.id,
                        botRole: targetRole.id
                    }
                });

                // Assign role to bot immediately
                await message.guild.members.me.roles.add(targetRole, `Bot role configured by ${message.author.tag}`);

                const result = productionStyle.createSuccessEmbed(
                    'BOT ROLE CONFIGURED',
                    { tag: 'Configuration Updated' },
                    message.author,
                    'Bot role đã được cấu hình thành công!',
                    [
                        { name: 'Role', value: targetRole.toString(), inline: true },
                        { name: 'Role ID', value: `\`${targetRole.id}\``, inline: true },
                        { name: 'Color', value: targetRole.hexColor, inline: true },
                        { name: 'Position', value: `#${targetRole.position}`, inline: true },
                        { name: 'Members', value: `${targetRole.members.size}`, inline: true },
                        { name: 'Status', value: '🟢 Applied to bot', inline: true },
                        { name: 'Auto-Assignment', value: '• Bot sẽ tự cấp role này khi join server\n• Role đã được cấp cho bot hiện tại\n• Có thể thay đổi bằng `!botrole <role>`\n• Tắt bằng `!botrole disable`' }
                    ]
                );

                await message.reply({ 
                    embeds: [result.embed], 
                    files: result.attachments 
                });

                logger.info(`Bot role configured in guild ${message.guild.id}`, {
                    guildId: message.guild.id,
                    roleId: targetRole.id,
                    roleName: targetRole.name,
                    configuredBy: message.author.id
                });

            } catch (dbError) {
                logger.error('Database error saving bot role', dbError);
                const result = productionStyle.createErrorEmbed(
                    'Database Error',
                    'Không thể lưu cấu hình!',
                    dbError.message
                );
                return message.reply({ 
                    embeds: [result.embed], 
                    files: result.attachments 
                });
            }

        } catch (error) {
            logger.error('Error in botrole command', error);
            const result = productionStyle.createErrorEmbed(
                'Command Error',
                'Đã xảy ra lỗi khi thực hiện lệnh!',
                error.message
            );
            await message.reply({ 
                embeds: [result.embed], 
                files: result.attachments 
            });
        }
    },

    async showCurrentConfig(message, client) {
        try {
            const guildSettings = await client.prisma.guildSettings.findUnique({
                where: { guildId: message.guild.id }
            });

            const currentRole = guildSettings?.botRole ? 
                message.guild.roles.cache.get(guildSettings.botRole) : null;

            const result = productionStyle.createInfoEmbed(
                'BOT ROLE CONFIGURATION',
                { tag: 'Current Settings' },
                message.author,
                'Current bot role auto-assignment configuration',
                [
                    { 
                        name: 'Current Role', 
                        value: currentRole ? currentRole.toString() : '❌ Not configured', 
                        inline: true 
                    },
                    { 
                        name: 'Status', 
                        value: currentRole ? '🟢 Enabled' : '🔴 Disabled', 
                        inline: true 
                    },
                    { 
                        name: 'Auto-Applied', 
                        value: currentRole ? 'Yes' : 'No', 
                        inline: true 
                    },
                    { 
                        name: 'Usage Examples', 
                        value: '• `!botrole @Bot` - Set bot role\n• `!botrole "Discord Bots"` - Set by name\n• `!botrole disable` - Disable auto-role' 
                    },
                    { 
                        name: 'Features', 
                        value: '• Automatically assigns role when bot joins new servers\n• Immediately applies to current bot\n• Validates role hierarchy and permissions\n• Supports role mentions, IDs, and names' 
                    }
                ]
            );

            return message.reply({ 
                embeds: [result.embed], 
                files: result.attachments 
            });

        } catch (error) {
            logger.error('Error showing bot role config', error);
            const result = productionStyle.createErrorEmbed(
                'Config Fetch Error',
                'Không thể lấy cấu hình hiện tại!',
                error.message
            );
            return message.reply({ 
                embeds: [result.embed], 
                files: result.attachments 
            });
        }
    }
};
