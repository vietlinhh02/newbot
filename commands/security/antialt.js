const { hasFlexiblePermission } = require('../../utils/permissions');
const productionStyle = require('../../utils/demoStyle');
const logger = require('../../utils/logger');

module.exports = {
    name: 'antialt',
    description: 'Cấu hình chống tài khoản alt (kiểm tra tuổi tài khoản)',
    aliases: ['anti-alt', 'altprotection'],
    usage: '!antialt <on|off> [min_days] [action]',
    category: 'security',
    permissions: 'admin',
    guildOnly: true,
    examples: [
        '!antialt on 7',
        '!antialt on 14 kick',
        '!antialt off',
        '!antialt status'
    ],

    async execute(message, args, client) {
        try {
            // Check permissions
            if (!await hasFlexiblePermission(message.member, 'antialt', this.permissions, message.guild.id)) {
                const result = productionStyle.createErrorEmbed(
                    'Permission Denied',
                    'Bạn cần quyền **Admin** để sử dụng lệnh này.'
                );
                return message.reply({ 
                    embeds: [result.embed], 
                    files: result.attachments 
                });
            }

            // Show current status if no args
            if (!args[0] || args[0].toLowerCase() === 'status') {
                return this.showStatus(message, client);
            }

            const action = args[0].toLowerCase();
            const minDays = parseInt(args[1]) || 7;
            const punishment = args[2]?.toLowerCase() || 'warn';

            if (action === 'off' || action === 'disable') {
                try {
                    await client.prisma.guildSettings.upsert({
                        where: { guildId: message.guild.id },
                        update: { 
                            antiAlt: false,
                            antiAltMinDays: null,
                            antiAltAction: null
                        },
                        create: {
                            guildId: message.guild.id,
                            antiAlt: false
                        }
                    });

                    const result = productionStyle.createSuccessEmbed(
                        'ANTI-ALT DISABLED',
                        { tag: 'Security Config' },
                        message.author,
                        'Anti-alt protection has been disabled for this server',
                        [
                            { name: 'Status', value: '🔴 Disabled', inline: true },
                            { name: 'Effect', value: 'All account ages will be accepted', inline: true },
                            { name: 'Note', value: 'Use `!antialt on [days] [action]` to enable again', inline: false }
                        ]
                    );
                    return message.reply({ 
                        embeds: [result.embed], 
                        files: result.attachments 
                    });
                } catch (error) {
                    logger.error('Database error in antialt disable', error);
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

            if (action === 'on' || action === 'enable') {
                // Validate parameters
                if (minDays < 1 || minDays > 365) {
                    const result = productionStyle.createErrorEmbed(
                        'Invalid Parameters',
                        'Số ngày tối thiểu phải từ 1 đến 365.',
                        'Please provide a valid day count between 1 and 365'
                    );
                    return message.reply({ 
                        embeds: [result.embed], 
                        files: result.attachments 
                    });
                }

                const validActions = ['warn', 'kick', 'ban'];
                if (!validActions.includes(punishment)) {
                    const result = productionStyle.createErrorEmbed(
                        'Invalid Action',
                        `Hành động phải là một trong: ${validActions.join(', ')}`,
                        'Please choose warn, kick, or ban'
                    );
                    return message.reply({ 
                        embeds: [result.embed], 
                        files: result.attachments 
                    });
                }

                // Check bot permissions based on action
                if (punishment === 'kick' && !message.guild.members.me.permissions.has('KickMembers')) {
                    const result = productionStyle.createErrorEmbed(
                        'Bot Missing Permissions',
                        'Bot cần quyền **Kick Members** để thực hiện hành động kick.',
                        'Grant the Kick Members permission to the bot'
                    );
                    return message.reply({ 
                        embeds: [result.embed], 
                        files: result.attachments 
                    });
                }

                if (punishment === 'ban' && !message.guild.members.me.permissions.has('BanMembers')) {
                    const result = productionStyle.createErrorEmbed(
                        'Bot Missing Permissions',
                        'Bot cần quyền **Ban Members** để thực hiện hành động ban.',
                        'Grant the Ban Members permission to the bot'
                    );
                    return message.reply({ 
                        embeds: [result.embed], 
                        files: result.attachments 
                    });
                }

                try {
                    await client.prisma.guildSettings.upsert({
                        where: { guildId: message.guild.id },
                        update: { 
                            antiAlt: true,
                            antiAltMinDays: minDays,
                            antiAltAction: punishment
                        },
                        create: {
                            guildId: message.guild.id,
                            antiAlt: true,
                            antiAltMinDays: minDays,
                            antiAltAction: punishment
                        }
                    });

                    const result = productionStyle.createSuccessEmbed(
                        'ANTI-ALT ENABLED',
                        { tag: 'Security Config' },
                        message.author,
                        'Anti-alt protection has been enabled for this server',
                        [
                            { name: 'Status', value: '🟢 Enabled', inline: true },
                            { name: 'Minimum Age', value: `${minDays} days`, inline: true },
                            { name: 'Action', value: this.formatAction(punishment), inline: true },
                            { name: 'Detection', value: `Accounts newer than ${minDays} days will be ${this.formatAction(punishment).toLowerCase()}`, inline: false },
                            { name: 'Trigger', value: 'Automatic when new members join the server', inline: true },
                            { name: 'Configuration', value: `Change with \`!antialt on <days> <action>\`\nDisable with \`!antialt off\``, inline: true },
                            { name: 'Protection Benefits', value: '• Chống tài khoản alt\n• Chống spam từ tài khoản mới\n• Chống raid với tài khoản fake', inline: false }
                        ]
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
                                    'ANTI-ALT CONFIGURATION LOG',
                                    { tag: 'Security Log' },
                                    message.author,
                                    `Anti-alt has been configured by ${message.author.tag}`,
                                    [
                                        { name: 'Moderator', value: `${message.author.tag} (${message.author.id})`, inline: true },
                                        { name: 'Minimum Age', value: `${minDays} days`, inline: true },
                                        { name: 'Action', value: punishment, inline: true },
                                        { name: 'Time', value: `<t:${Math.floor(Date.now() / 1000)}:F>`, inline: true }
                                    ]
                                );

                                await logChannel.send({ 
                                    embeds: [logResult.embed], 
                                    files: logResult.attachments 
                                });
                            }
                        }
                    } catch (error) {
                        logger.error('Error sending antialt log', error);
                    }

                    logger.command(message.author, `antialt ${action} ${minDays} ${punishment}`, message.guild);

                } catch (error) {
                    logger.error('Database error in antialt enable', error);
                    const result = productionStyle.createErrorEmbed(
                        'Database Error',
                        'Không thể lưu cấu hình vào database.',
                        error.message
                    );
                    await message.reply({ 
                        embeds: [result.embed], 
                        files: result.attachments 
                    });
                }
            } else {
                const result = productionStyle.createErrorEmbed(
                    'Invalid Parameters',
                    'Sử dụng `on` hoặc `off` để bật/tắt anti-alt.\n\n**Cách dùng:** `!antialt <on|off> [min_days] [action]`'
                );
                await message.reply({ 
                    embeds: [result.embed], 
                    files: result.attachments 
                });
            }

        } catch (error) {
            logger.error('Antialt command error', error);
            const result = productionStyle.createErrorEmbed(
                'System Error',
                'Đã xảy ra lỗi khi thực thi lệnh antialt.',
                error.message
            );
            await message.reply({ 
                embeds: [result.embed], 
                files: result.attachments 
            });
        }
    },

    async showStatus(message, client) {
        try {
            const guildSettings = await client.prisma.guildSettings.findUnique({
                where: { guildId: message.guild.id }
            });

            if (guildSettings?.antiAlt) {
                const minDays = guildSettings.antiAltMinDays || 7;
                const action = guildSettings.antiAltAction || 'warn';
                
                const result = productionStyle.createInfoEmbed(
                    'ANTI-ALT STATUS',
                    { tag: 'Security System' },
                    message.author,
                    `Anti-alt protection is currently enabled for ${message.guild.name}`,
                    [
                        { name: 'Status', value: '✅ ENABLED', inline: true },
                        { name: 'Minimum Age', value: `${minDays} days`, inline: true },
                        { name: 'Action', value: this.formatAction(action), inline: true },
                        { name: 'Detection Method', value: 'Automatic when new members join', inline: true },
                        { name: 'Current Rule', value: `Accounts ≥ ${minDays} days old are allowed`, inline: true },
                        { name: 'Punishment', value: `Accounts < ${minDays} days → ${this.formatAction(action)}`, inline: true },
                        { name: 'Statistics', value: `• Protection: Active\n• Target: Alt accounts\n• Method: Account age verification`, inline: false }
                    ]
                );

                await message.reply({ 
                    embeds: [result.embed], 
                    files: result.attachments 
                });
            } else {
                const result = productionStyle.createInfoEmbed(
                    'ANTI-ALT STATUS',
                    { tag: 'Security System' },
                    message.author,
                    `Anti-alt protection is currently disabled for ${message.guild.name}`,
                    [
                        { name: 'Status', value: '❌ DISABLED', inline: true },
                        { name: 'Effect', value: 'All account ages accepted', inline: true },
                        { name: 'Risk Level', value: 'Alt accounts can join freely', inline: true },
                        { name: 'Enable Protection', value: 'Use `!antialt on <days> [action]` to enable', inline: false }
                    ]
                );

                await message.reply({ 
                    embeds: [result.embed], 
                    files: result.attachments 
                });
            }

            // Add usage guide
            const usageResult = productionStyle.createInfoEmbed(
                'ANTI-ALT USAGE GUIDE',
                { tag: 'Help' },
                message.author,
                'How to configure anti-alt protection',
                [
                    { name: 'Enable with Warning', value: '`!antialt on 7 warn` - Warn accounts < 7 days', inline: false },
                    { name: 'Enable with Kick', value: '`!antialt on 14 kick` - Kick accounts < 14 days', inline: false },
                    { name: 'Enable with Ban', value: '`!antialt on 30 ban` - Ban accounts < 30 days', inline: false },
                    { name: 'Disable Protection', value: '`!antialt off` - Turn off anti-alt system', inline: false }
                ]
            );

            await message.channel.send({ 
                embeds: [usageResult.embed], 
                files: usageResult.attachments 
            });

        } catch (error) {
            logger.error('Error showing antialt status', error);
            const result = productionStyle.createErrorEmbed(
                'Database Error',
                'Không thể lấy cấu hình từ database.',
                error.message
            );
            await message.reply({ 
                embeds: [result.embed], 
                files: result.attachments 
            });
        }
    },

    formatAction(action) {
        const actionMap = {
            'warn': 'Cảnh báo',
            'kick': 'Kick khỏi server',
            'ban': 'Ban khỏi server'
        };
        return actionMap[action] || action;
    },

    // Function to check account age (used by guildMemberAdd event)
    async checkAccountAge(member, client) {
        try {
            const guildSettings = await client.prisma.guildSettings.findUnique({
                where: { guildId: member.guild.id }
            });

            if (!guildSettings?.antiAlt) {
                return; // Anti-alt disabled
            }

            const accountAge = Date.now() - member.user.createdTimestamp;
            const minAge = (guildSettings.antiAltMinDays || 7) * 24 * 60 * 60 * 1000; // Convert days to ms
            const action = guildSettings.antiAltAction || 'warn';

            if (accountAge < minAge) {
                const dayAge = Math.floor(accountAge / (24 * 60 * 60 * 1000));
                const reason = `Account too young: ${dayAge} days old (minimum: ${guildSettings.antiAltMinDays} days)`;

                // Execute action
                switch (action) {
                    case 'warn':
                        // Send DM warning
                        try {
                            const dmResult = productionStyle.createWarningEmbed(
                                `Account Age Warning - ${member.guild.name}`,
                                { tag: 'Security Alert' },
                                member.user,
                                `Your account is ${dayAge} days old, but this server requires accounts to be at least ${guildSettings.antiAltMinDays} days old.\n\nPlease wait until your account is older to join this server.`
                            );
                            await member.send({ 
                                embeds: [dmResult.embed], 
                                files: dmResult.attachments 
                            });
                        } catch (error) {
                            // DM failed
                        }
                        break;

                    case 'kick':
                        try {
                            // Send DM before kick
                            const dmResult = productionStyle.createErrorEmbed(
                                `Kicked from ${member.guild.name}`,
                                `Your account is too young (${dayAge} days). Minimum required: ${guildSettings.antiAltMinDays} days.\n\nYou can rejoin when your account is older.`
                            );
                            await member.send({ 
                                embeds: [dmResult.embed], 
                                files: dmResult.attachments 
                            });
                            await new Promise(resolve => setTimeout(resolve, 1000));
                            
                            await member.kick(reason);
                        } catch (error) {
                            logger.error('Anti-alt kick error', error);
                        }
                        break;

                    case 'ban':
                        try {
                            // Send DM before ban
                            const dmResult = productionStyle.createErrorEmbed(
                                `Banned from ${member.guild.name}`,
                                `Your account is too young (${dayAge} days). Minimum required: ${guildSettings.antiAltMinDays} days.\n\nThis is an anti-alt protection measure.`
                            );
                            await member.send({ 
                                embeds: [dmResult.embed], 
                                files: dmResult.attachments 
                            });
                            await new Promise(resolve => setTimeout(resolve, 1000));
                            
                            await member.ban({ reason, deleteMessageDays: 1 });
                        } catch (error) {
                            logger.error('Anti-alt ban error', error);
                        }
                        break;
                }

                // Log to mod channel
                try {
                    if (guildSettings.logChannel) {
                        const logChannel = member.guild.channels.cache.get(guildSettings.logChannel);
                        if (logChannel) {
                            const logResult = productionStyle.createWarningEmbed(
                                'ANTI-ALT DETECTION',
                                { tag: 'Security Log' },
                                { tag: 'Anti-Alt System', id: 'system' },
                                `New member detected with young account`,
                                [
                                    { name: 'Target User', value: `${member.user.tag} (${member.user.id})`, inline: true },
                                    { name: 'Account Age', value: `${dayAge} days`, inline: true },
                                    { name: 'Required Age', value: `${guildSettings.antiAltMinDays} days`, inline: true },
                                    { name: 'Action Taken', value: action.charAt(0).toUpperCase() + action.slice(1), inline: true },
                                    { name: 'Account Created', value: `<t:${Math.floor(member.user.createdTimestamp / 1000)}:F>`, inline: true },
                                    { name: 'Join Attempt', value: `<t:${Math.floor(Date.now() / 1000)}:F>`, inline: true },
                                    { name: 'Detection Reason', value: reason, inline: false }
                                ]
                            );

                            await logChannel.send({ 
                                embeds: [logResult.embed], 
                                files: logResult.attachments 
                            });
                        }
                    }
                } catch (error) {
                    logger.error('Error sending antialt detection log', error);
                }

                logger.security('Anti-alt triggered', `${member.user.tag} (${dayAge} days old) ${action}ed`, 'medium');
            }

        } catch (error) {
            logger.error('Anti-alt check error', error);
        }
    }
};
