const { hasFlexiblePermission } = require('../../utils/permissions');
const productionStyle = require('../../utils/demoStyle');
const logger = require('../../utils/logger');
const { ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType } = require('discord.js');

module.exports = {
    name: 'whitelist',
    description: 'Quản lý danh sách trắng (miễn kiểm tra bảo mật)',
    aliases: ['wl', 'allowlist'],
    usage: '!whitelist <add|remove|list|clear> [@user|userID]',
    category: 'security',
    permissions: 'admin',
    guildOnly: true,
    examples: [
        '!whitelist add @VIPMember',
        '!whitelist remove 123456789',
        '!whitelist list',
        '!whitelist clear'
    ],

    async execute(message, args, client) {
        try {
            // Check permissions
            if (!await hasFlexiblePermission(message.member, 'whitelist', this.permissions, message.guild.id)) {
                const result = productionStyle.createErrorEmbed(
                    'Permission Denied',
                    'Bạn cần quyền **Admin** để sử dụng lệnh này.'
                );
                return message.reply({ 
                    embeds: [result.embed], 
                    files: result.attachments 
                });
            }

            // Show help if no args
            if (!args[0]) {
                return this.showHelp(message);
            }

            const action = args[0].toLowerCase();
            const userArg = args[1];

            switch (action) {
                case 'add':
                    if (!userArg) {
                        const result = productionStyle.createErrorEmbed(
                            'Missing Information',
                            'Vui lòng cung cấp người dùng cần thêm vào whitelist.\n\n**Cách dùng:** `!whitelist add @user`'
                        );
                        return message.reply({ 
                            embeds: [result.embed], 
                            files: result.attachments 
                        });
                    }
                    await this.addToWhitelist(message, userArg, client);
                    break;

                case 'remove':
                case 'rm':
                    if (!userArg) {
                        const result = productionStyle.createErrorEmbed(
                            'Missing Information',
                            'Vui lòng cung cấp người dùng cần xóa khỏi whitelist.\n\n**Cách dùng:** `!whitelist remove @user`'
                        );
                        return message.reply({ 
                            embeds: [result.embed], 
                            files: result.attachments 
                        });
                    }
                    await this.removeFromWhitelist(message, userArg, client);
                    break;

                case 'list':
                case 'show':
                    await this.showWhitelist(message, client);
                    break;

                case 'clear':
                    await this.clearWhitelist(message, client);
                    break;

                case 'status':
                    await this.showStatus(message, client);
                    break;

                default:
                    const result = productionStyle.createErrorEmbed(
                        'Invalid Action',
                        'Sử dụng: `add`, `remove`, `list`, `clear`, hoặc `status`.\n\n**Cách dùng:** `!whitelist <action> [user]`'
                    );
                    await message.reply({ 
                        embeds: [result.embed], 
                        files: result.attachments 
                    });
                    break;
            }

        } catch (error) {
            logger.error('Whitelist command error', error);
            const result = productionStyle.createErrorEmbed(
                'System Error',
                'Đã xảy ra lỗi khi thực thi lệnh whitelist.',
                error.message
            );
            await message.reply({ 
                embeds: [result.embed], 
                files: result.attachments 
            });
        }
    },

    async addToWhitelist(message, userArg, client) {
        try {
            // Parse user
            const targetUser = await this.parseUser(userArg, message.guild, client);
            if (!targetUser) {
                const result = productionStyle.createErrorEmbed(
                    'User Not Found',
                    `Không thể tìm thấy người dùng **${userArg}**.`,
                    'Please provide a valid user mention or ID'
                );
                return message.reply({ 
                    embeds: [result.embed], 
                    files: result.attachments 
                });
            }

            // Check if already whitelisted
            const isWhitelisted = await this.isUserWhitelisted(targetUser.id, message.guild.id, client);
            if (isWhitelisted) {
                const result = productionStyle.createWarningEmbed(
                    'Already Whitelisted',
                    `**${targetUser.tag}** đã có trong danh sách trắng.`,
                    [
                        { name: 'User', value: targetUser.tag, inline: true },
                        { name: 'Status', value: '✅ Already in whitelist', inline: true },
                        { name: 'Note', value: 'No action needed', inline: true }
                    ]
                );
                return message.reply({ 
                    embeds: [result.embed], 
                    files: result.attachments 
                });
            }

            // Add to whitelist
            await this.addUserToWhitelist(targetUser.id, message.guild.id, message.author.id, client);

            const result = productionStyle.createSuccessEmbed(
                'ADDED TO WHITELIST',
                { tag: 'Security Management' },
                message.author,
                `Successfully added **${targetUser.tag}** to the security whitelist`,
                [
                    { name: 'User Added', value: `${targetUser.tag} (\`${targetUser.id}\`)`, inline: true },
                    { name: 'Added By', value: message.author.tag, inline: true },
                    { name: 'Time', value: `<t:${Math.floor(Date.now() / 1000)}:F>`, inline: true },
                    { name: 'Whitelist Benefits', value: '• Miễn kiểm tra anti-spam\n• Miễn kiểm tra anti-raid\n• Miễn kiểm tra anti-alt\n• Ưu tiên trong các hệ thống bảo mật', inline: false }
                ]
            );

            await message.reply({ 
                embeds: [result.embed], 
                files: result.attachments 
            });

            // Log action
            this.logWhitelistAction(message, 'ADD', targetUser, client);
            logger.command(message.author, `whitelist add ${targetUser.tag}`, message.guild);

        } catch (error) {
            logger.error('Add to whitelist error', error);
            const result = productionStyle.createErrorEmbed(
                'Add Failed',
                'Không thể thêm người dùng vào danh sách trắng.',
                error.message
            );
            await message.reply({ 
                embeds: [result.embed], 
                files: result.attachments 
            });
        }
    },

    async removeFromWhitelist(message, userArg, client) {
        try {
            // Parse user
            const targetUser = await this.parseUser(userArg, message.guild, client);
            if (!targetUser) {
                const result = productionStyle.createErrorEmbed(
                    'User Not Found',
                    `Không thể tìm thấy người dùng **${userArg}**.`,
                    'Please provide a valid user mention or ID'
                );
                return message.reply({ 
                    embeds: [result.embed], 
                    files: result.attachments 
                });
            }

            // Check if whitelisted
            const isWhitelisted = await this.isUserWhitelisted(targetUser.id, message.guild.id, client);
            if (!isWhitelisted) {
                const result = productionStyle.createWarningEmbed(
                    'Not Whitelisted',
                    `**${targetUser.tag}** không có trong danh sách trắng.`,
                    [
                        { name: 'User', value: targetUser.tag, inline: true },
                        { name: 'Status', value: '❌ Not in whitelist', inline: true },
                        { name: 'Note', value: 'No action needed', inline: true }
                    ]
                );
                return message.reply({ 
                    embeds: [result.embed], 
                    files: result.attachments 
                });
            }

            // Remove from whitelist
            await this.removeUserFromWhitelist(targetUser.id, message.guild.id, client);

            const result = productionStyle.createSuccessEmbed(
                'REMOVED FROM WHITELIST',
                { tag: 'Security Management' },
                message.author,
                `Successfully removed **${targetUser.tag}** from the security whitelist`,
                [
                    { name: 'User Removed', value: `${targetUser.tag} (\`${targetUser.id}\`)`, inline: true },
                    { name: 'Removed By', value: message.author.tag, inline: true },
                    { name: 'Time', value: `<t:${Math.floor(Date.now() / 1000)}:F>`, inline: true },
                    { name: 'Effect', value: 'User này sẽ bị kiểm tra bởi tất cả hệ thống bảo mật như bình thường.', inline: false }
                ]
            );

            await message.reply({ 
                embeds: [result.embed], 
                files: result.attachments 
            });

            // Log action
            this.logWhitelistAction(message, 'REMOVE', targetUser, client);
            logger.command(message.author, `whitelist remove ${targetUser.tag}`, message.guild);

        } catch (error) {
            logger.error('Remove from whitelist error', error);
            const result = productionStyle.createErrorEmbed(
                'Remove Failed',
                'Không thể xóa người dùng khỏi danh sách trắng.',
                error.message
            );
            await message.reply({ 
                embeds: [result.embed], 
                files: result.attachments 
            });
        }
    },

    async showWhitelist(message, client) {
        try {
            const whitelistedUsers = await this.getWhitelistedUsers(message.guild.id, client);

            if (whitelistedUsers.length === 0) {
                const result = productionStyle.createInfoEmbed(
                    'WHITELIST IS EMPTY',
                    { tag: 'Security System' },
                    message.author,
                    `No users are currently whitelisted in ${message.guild.name}`,
                    [
                        { name: 'Total Users', value: '0', inline: true },
                        { name: 'Status', value: '❌ Empty', inline: true },
                        { name: 'Protection Level', value: 'All users subject to security checks', inline: true },
                        { name: 'Add Users', value: 'Use `!whitelist add @user` to add trusted users', inline: false }
                    ]
                );
                return message.reply({ 
                    embeds: [result.embed], 
                    files: result.attachments 
                });
            } else {
                // Pagination for large lists
                const usersPerPage = 10;
                const totalPages = Math.ceil(whitelistedUsers.length / usersPerPage);
                let currentPage = 0;

                const generateEmbed = async (page) => {
                    const start = page * usersPerPage;
                    const pageUsers = whitelistedUsers.slice(start, start + usersPerPage);
                    
                    const userList = [];
                    for (const userId of pageUsers) {
                        try {
                            const user = await client.users.fetch(userId);
                            const member = message.guild.members.cache.get(userId);
                            const status = member ? '🟢 In Server' : '🔴 Left Server';
                            userList.push(`• **${user.tag}** (\`${userId}\`) - ${status}`);
                        } catch (error) {
                            userList.push(`• **Unknown User** (\`${userId}\`) - 🔴 Not Found`);
                        }
                    }

                    const result = productionStyle.createInfoEmbed(
                        'SECURITY WHITELIST',
                        { tag: 'Security System' },
                        message.author,
                        `Security whitelist for ${message.guild.name}`,
                        [
                            { name: 'Total Users', value: whitelistedUsers.length.toString(), inline: true },
                            { name: 'Current Page', value: `${page + 1}/${totalPages}`, inline: true },
                            { name: 'Showing', value: `${start + 1}-${Math.min(start + usersPerPage, whitelistedUsers.length)}`, inline: true },
                            { name: `👥 Whitelisted Users`, value: userList.join('\n') || 'No data', inline: false }
                        ]
                    );

                    return result;
                };

                const embedResult = await generateEmbed(currentPage);
                const components = totalPages > 1 ? this.createPaginationButtons(currentPage, totalPages) : [];

                const reply = await message.reply({ 
                    embeds: [embedResult.embed], 
                    files: embedResult.attachments,
                    components 
                });

                if (totalPages > 1) {
                    this.handlePagination(reply, message, generateEmbed, totalPages);
                }
            }

        } catch (error) {
            logger.error('Show whitelist error', error);
            const result = productionStyle.createErrorEmbed(
                'Display Failed',
                'Không thể lấy danh sách whitelist.',
                error.message
            );
            await message.reply({ 
                embeds: [result.embed], 
                files: result.attachments 
            });
        }
    },

    async clearWhitelist(message, client) {
        try {
            const whitelistedUsers = await this.getWhitelistedUsers(message.guild.id, client);

            if (whitelistedUsers.length === 0) {
                const result = productionStyle.createWarningEmbed(
                    'Whitelist Already Empty',
                    'Whitelist hiện không có người dùng nào.',
                    [
                        { name: 'Current Status', value: 'Empty', inline: true },
                        { name: 'Users Count', value: '0', inline: true },
                        { name: 'Action Required', value: 'None', inline: true }
                    ]
                );
                return message.reply({ 
                    embeds: [result.embed], 
                    files: result.attachments 
                });
            }

            // Confirmation
            const confirmResult = productionStyle.createWarningEmbed(
                'CLEAR WHITELIST CONFIRMATION',
                { tag: 'Destructive Action' },
                message.author,
                '⚠️ **This will remove ALL users from the security whitelist**',
                [
                    { name: 'Users to Remove', value: whitelistedUsers.length.toString(), inline: true },
                    { name: 'Action Type', value: 'PERMANENT', inline: true },
                    { name: 'Can Undo', value: '❌ Cannot be undone', inline: true },
                    { name: 'Effect', value: 'All removed users will be subject to normal security checks', inline: false },
                    { name: 'Confirmation', value: 'Click **Confirm** to proceed or **Cancel** to abort\n**You have 30 seconds to decide**', inline: false }
                ]
            );

            const confirmButton = new ButtonBuilder()
                .setCustomId('confirm_clear')
                .setLabel('Xác nhận xóa')
                .setEmoji('🗑️')
                .setStyle(ButtonStyle.Danger);

            const cancelButton = new ButtonBuilder()
                .setCustomId('cancel_clear')
                .setLabel('Hủy bỏ')
                .setEmoji('❌')
                .setStyle(ButtonStyle.Secondary);

            const row = new ActionRowBuilder().addComponents(confirmButton, cancelButton);

            const confirmMsg = await message.reply({ 
                embeds: [confirmResult.embed], 
                files: confirmResult.attachments,
                components: [row] 
            });

            const collector = confirmMsg.createMessageComponentCollector({
                componentType: ComponentType.Button,
                time: 30000
            });

            collector.on('collect', async interaction => {
                if (interaction.user.id !== message.author.id) {
                    await interaction.reply({
                        content: '❌ Chỉ người dùng lệnh mới có thể xác nhận.',
                        ephemeral: true
                    });
                    return;
                }

                await interaction.deferUpdate();

                if (interaction.customId === 'confirm_clear') {
                    await this.clearAllWhitelisted(message.guild.id, client);

                    const successResult = productionStyle.createSuccessEmbed(
                        'WHITELIST CLEARED',
                        { tag: 'Security Management' },
                        message.author,
                        'All users have been removed from the security whitelist',
                        [
                            { name: 'Users Removed', value: whitelistedUsers.length.toString(), inline: true },
                            { name: 'Cleared By', value: message.author.tag, inline: true },
                            { name: 'Time', value: `<t:${Math.floor(Date.now() / 1000)}:F>`, inline: true },
                            { name: 'Effect', value: 'All users will now be subject to standard security checks', inline: false }
                        ]
                    );

                    await confirmMsg.edit({ 
                        embeds: [successResult.embed], 
                        files: successResult.attachments,
                        components: [] 
                    });

                    logger.command(message.author, `whitelist clear (${whitelistedUsers.length} users)`, message.guild);
                } else {
                    const cancelResult = productionStyle.createInfoEmbed(
                        'Clear Cancelled',
                        { tag: 'Action Cancelled' },
                        message.author,
                        'Whitelist clear operation has been cancelled',
                        [
                            { name: 'Status', value: '✅ No changes made', inline: true },
                            { name: 'Users Preserved', value: whitelistedUsers.length.toString(), inline: true },
                            { name: 'Cancelled By', value: message.author.tag, inline: true }
                        ]
                    );
                    await confirmMsg.edit({ 
                        embeds: [cancelResult.embed], 
                        files: cancelResult.attachments,
                        components: [] 
                    });
                }
            });

            collector.on('end', (collected) => {
                if (collected.size === 0) {
                    const timeoutResult = productionStyle.createWarningEmbed(
                        'Confirmation Timeout',
                        { tag: 'Timed Out' },
                        message.author,
                        'Clear confirmation timed out. Whitelist không bị xóa.',
                        [
                            { name: 'Timeout', value: '30 seconds elapsed', inline: true },
                            { name: 'Status', value: '✅ No changes made', inline: true },
                            { name: 'Safety', value: 'Automatic cancellation for safety', inline: true }
                        ]
                    );
                    confirmMsg.edit({ 
                        embeds: [timeoutResult.embed], 
                        files: timeoutResult.attachments,
                        components: [] 
                    }).catch(() => {});
                }
            });

        } catch (error) {
            logger.error('Clear whitelist error', error);
            const result = productionStyle.createErrorEmbed(
                'Clear Failed',
                'Không thể xóa danh sách trắng.',
                error.message
            );
            await message.reply({ 
                embeds: [result.embed], 
                files: result.attachments 
            });
        }
    },

    async showHelp(message) {
        const result = productionStyle.createInfoEmbed(
            'WHITELIST COMMAND HELP',
            { tag: 'Command Guide' },
            message.author,
            'Quản lý danh sách trắng để miễn kiểm tra bảo mật cho các thành viên đáng tin cậy',
            [
                { name: '➕ Add User', value: '`!whitelist add @user` - Thêm user vào whitelist', inline: false },
                { name: '➖ Remove User', value: '`!whitelist remove @user` - Xóa user khỏi whitelist', inline: false },
                { name: '📋 List Users', value: '`!whitelist list` - Hiển thị danh sách whitelist', inline: false },
                { name: '🗑️ Clear All', value: '`!whitelist clear` - Xóa toàn bộ whitelist', inline: false },
                { name: '🛡️ Whitelist Benefits', value: '• Miễn kiểm tra anti-spam\n• Miễn kiểm tra anti-raid\n• Miễn kiểm tra anti-alt\n• Ưu tiên trong hệ thống bảo mật', inline: false }
            ]
        );

        await message.reply({ 
            embeds: [result.embed], 
            files: result.attachments 
        });
    },

    async parseUser(userArg, guild, client) {
        // Try user mention or ID
        const userIdMatch = userArg.match(/^(?:<@!?)?(\d+)>?$/);
        if (userIdMatch) {
            const userId = userIdMatch[1];
            try {
                return await client.users.fetch(userId);
            } catch (error) {
                return null;
            }
        }
        return null;
    },

    async isUserWhitelisted(userId, guildId, client) {
        try {
            const guildSettings = await client.prisma.guildSettings.findUnique({
                where: { guildId }
            });
            
            if (!guildSettings?.whitelist) return false;
            
            const whitelist = JSON.parse(guildSettings.whitelist);
            return whitelist.includes(userId);
        } catch (error) {
            return false;
        }
    },

    async addUserToWhitelist(userId, guildId, addedBy, client) {
        const guildSettings = await client.prisma.guildSettings.findUnique({
            where: { guildId }
        });

        let whitelist = [];
        if (guildSettings?.whitelist) {
            whitelist = JSON.parse(guildSettings.whitelist);
        }

        if (!whitelist.includes(userId)) {
            whitelist.push(userId);
        }

        await client.prisma.guildSettings.upsert({
            where: { guildId },
            update: { whitelist: JSON.stringify(whitelist) },
            create: {
                guildId,
                whitelist: JSON.stringify(whitelist)
            }
        });
    },

    async removeUserFromWhitelist(userId, guildId, client) {
        const guildSettings = await client.prisma.guildSettings.findUnique({
            where: { guildId }
        });

        if (!guildSettings?.whitelist) return;

        let whitelist = JSON.parse(guildSettings.whitelist);
        whitelist = whitelist.filter(id => id !== userId);

        await client.prisma.guildSettings.update({
            where: { guildId },
            data: { whitelist: JSON.stringify(whitelist) }
        });
    },

    async getWhitelistedUsers(guildId, client) {
        try {
            const guildSettings = await client.prisma.guildSettings.findUnique({
                where: { guildId }
            });

            if (!guildSettings?.whitelist) return [];
            return JSON.parse(guildSettings.whitelist);
        } catch (error) {
            return [];
        }
    },

    async clearAllWhitelisted(guildId, client) {
        await client.prisma.guildSettings.upsert({
            where: { guildId },
            update: { whitelist: JSON.stringify([]) },
            create: {
                guildId,
                whitelist: JSON.stringify([])
            }
        });
    },

    createPaginationButtons(currentPage, totalPages) {
        return [new ActionRowBuilder().addComponents([
            new ButtonBuilder()
                .setCustomId('wl_prev')
                .setEmoji('◀️')
                .setStyle(ButtonStyle.Primary)
                .setDisabled(currentPage === 0),
            new ButtonBuilder()
                .setCustomId('wl_page')
                .setLabel(`${currentPage + 1}/${totalPages}`)
                .setStyle(ButtonStyle.Secondary)
                .setDisabled(true),
            new ButtonBuilder()
                .setCustomId('wl_next')
                .setEmoji('▶️')
                .setStyle(ButtonStyle.Primary)
                .setDisabled(currentPage === totalPages - 1)
        ])];
    },

    async handlePagination(reply, originalMessage, generateEmbed, totalPages) {
        let currentPage = 0;
        
        const collector = reply.createMessageComponentCollector({
            componentType: ComponentType.Button,
            time: 300000
        });

        collector.on('collect', async interaction => {
            if (interaction.user.id !== originalMessage.author.id) {
                await interaction.reply({
                    content: '❌ Chỉ người dùng lệnh mới có thể sử dụng pagination.',
                    ephemeral: true
                });
                return;
            }

            await interaction.deferUpdate();

            if (interaction.customId === 'wl_prev' && currentPage > 0) {
                currentPage--;
            } else if (interaction.customId === 'wl_next' && currentPage < totalPages - 1) {
                currentPage++;
            }

            const newEmbed = await generateEmbed(currentPage);
            const newComponents = this.createPaginationButtons(currentPage, totalPages);

            await reply.edit({
                embeds: [newEmbed],
                components: newComponents
            });
        });

        collector.on('end', () => {
            reply.edit({ components: [] }).catch(() => {});
        });
    },

    async logWhitelistAction(message, action, targetUser, client) {
        try {
            const guildSettings = await client.prisma.guildSettings.findUnique({
                where: { guildId: message.guild.id }
            });

            if (guildSettings?.logChannel) {
                const logChannel = message.guild.channels.cache.get(guildSettings.logChannel);
                if (logChannel) {
                    const logEmbed = productionStyle.createModeration({
                        action: `Whitelist ${action}`,
                        targetUser,
                        moderator: message.author,
                        reason: `${action === 'ADD' ? 'Added to' : 'Removed from'} security whitelist`,
                        channel: message.channel.toString()
                    });

                    await logChannel.send({ embeds: [logEmbed] });
                }
            }
        } catch (error) {
            logger.error('Error sending whitelist log', error);
        }
    }
};
