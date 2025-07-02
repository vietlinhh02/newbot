const { hasFlexiblePermission } = require('../../utils/permissions');
const productionStyle = require('../../utils/demoStyle');
const logger = require('../../utils/logger');
const { ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType } = require('discord.js');

module.exports = {
    name: 'massban',
    description: 'Ban hàng loạt theo tiêu chí (NGUY HIỂM - chỉ dành cho Owner)',
    aliases: ['bulkban', 'banall'],
    usage: '!massban <criteria> [reason]',
    category: 'security',
    permissions: 'owner', // Owner only!
    guildOnly: true,
    examples: [
        '!massban new-accounts "Account younger than 7 days"',
        '!massban no-avatar "No profile picture"',
        '!massban no-activity "No messages in 30 days"'
    ],

    async execute(message, args, client) {
        try {
            // STRICT permission check - Owner only
            if (!await hasFlexiblePermission(message.member, 'massban', this.permissions, message.guild.id)) {
                const result = productionStyle.createErrorEmbed(
                    'ACCESS DENIED',
                    'Lệnh này chỉ dành cho **Bot Owner**.\n\n⚠️ **Massban là lệnh cực kỳ nguy hiểm!**'
                );
                return message.reply({ 
                    embeds: [result.embed], 
                    files: result.attachments 
                });
            }

            // Additional safety check - must be guild owner or bot owner
            const config = require('../../config.json');
            const isBotOwner = config.botOwners?.includes(message.author.id);
            const isGuildOwner = message.guild.ownerId === message.author.id;

            if (!isBotOwner && !isGuildOwner) {
                const result = productionStyle.createErrorEmbed(
                    'INSUFFICIENT PERMISSIONS',
                    'Chỉ **Bot Owner** hoặc **Server Owner** mới có thể sử dụng lệnh này.'
                );
                return message.reply({ 
                    embeds: [result.embed], 
                    files: result.attachments 
                });
            }

            // Check bot permissions
            if (!message.guild.members.me.permissions.has('BanMembers')) {
                const result = productionStyle.createErrorEmbed(
                    'Bot Missing Permissions',
                    'Bot cần quyền **Ban Members** để thực hiện massban.',
                    'Grant the Ban Members permission to the bot'
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

            const criteria = args[0].toLowerCase();
            const reason = args.slice(1).join(' ') || 'Mass ban by security criteria';

            // Get targets based on criteria
            const targets = await this.getTargetsByCriteria(criteria, message.guild, client);

            if (targets.length === 0) {
                const result = productionStyle.createWarningEmbed(
                    'No Targets Found',
                    `Không có thành viên nào phù hợp với tiêu chí **${criteria}**.`,
                    [
                        { name: 'Criteria', value: criteria, inline: true },
                        { name: 'Members Checked', value: message.guild.memberCount.toString(), inline: true },
                        { name: 'Matches Found', value: '0', inline: true }
                    ]
                );
                return message.reply({ 
                    embeds: [result.embed], 
                    files: result.attachments 
                });
            }

            // Safety limits
            const MAX_MASSBAN = 50; // Maximum users per massban
            if (targets.length > MAX_MASSBAN) {
                const result = productionStyle.createErrorEmbed(
                    'TOO MANY TARGETS',
                    `Tìm thấy ${targets.length} người dùng, nhưng chỉ có thể massban tối đa ${MAX_MASSBAN} người cùng lúc.\n\n**Lý do bảo mật:** Ngăn chặn việc ban nhầm số lượng lớn.`,
                    `Found ${targets.length} targets, limit is ${MAX_MASSBAN}`
                );
                return message.reply({ 
                    embeds: [result.embed], 
                    files: result.attachments 
                });
            }

            // Filter out protected users
            const protectedUsers = await this.filterProtectedUsers(targets, message.guild, client);
            const finalTargets = targets.filter(member => !protectedUsers.includes(member.id));

            if (finalTargets.length === 0) {
                const result = productionStyle.createWarningEmbed(
                    'All Targets Protected',
                    'Không có thành viên nào có thể bị ban (tất cả đều được bảo vệ).',
                    [
                        { name: 'Total Found', value: targets.length.toString(), inline: true },
                        { name: 'Protected', value: protectedUsers.length.toString(), inline: true },
                        { name: 'Available to Ban', value: '0', inline: true }
                    ]
                );
                return message.reply({ 
                    embeds: [result.embed], 
                    files: result.attachments 
                });
            }

            // Show confirmation with detailed info
            await this.showConfirmation(message, criteria, finalTargets, protectedUsers.length, reason, client);

        } catch (error) {
            logger.error('Massban command error', error);
            const result = productionStyle.createErrorEmbed(
                'System Error',
                'Đã xảy ra lỗi khi thực thi lệnh massban.',
                error.message
            );
            await message.reply({ 
                embeds: [result.embed], 
                files: result.attachments 
            });
        }
    },

    async getTargetsByCriteria(criteria, guild, client) {
        const targets = [];
        const members = await guild.members.fetch();

        switch (criteria) {
            case 'new-accounts':
            case 'new':
                // Accounts younger than 7 days
                const sevenDaysAgo = Date.now() - (7 * 24 * 60 * 60 * 1000);
                members.forEach(member => {
                    if (member.user.createdTimestamp > sevenDaysAgo) {
                        targets.push(member);
                    }
                });
                break;

            case 'no-avatar':
            case 'no-pfp':
                // Users with default Discord avatar
                members.forEach(member => {
                    if (!member.user.avatar) {
                        targets.push(member);
                    }
                });
                break;

            case 'no-roles':
                // Users with no roles (except @everyone)
                members.forEach(member => {
                    if (member.roles.cache.size === 1) { // Only @everyone
                        targets.push(member);
                    }
                });
                break;

            case 'suspicious':
                // Combination of suspicious factors
                const threeDaysAgo = Date.now() - (3 * 24 * 60 * 60 * 1000);
                members.forEach(member => {
                    const isSuspicious = (
                        member.user.createdTimestamp > threeDaysAgo && // Very new account
                        !member.user.avatar && // No avatar
                        member.roles.cache.size === 1 // No roles
                    );
                    if (isSuspicious) {
                        targets.push(member);
                    }
                });
                break;

            case 'bots':
                // All bot accounts (except this bot)
                members.forEach(member => {
                    if (member.user.bot && member.id !== client.user.id) {
                        targets.push(member);
                    }
                });
                break;

            default:
                break;
        }

        return targets;
    },

    async filterProtectedUsers(targets, guild, client) {
        const protected = [];

        for (const member of targets) {
            // Protect server owner
            if (member.id === guild.ownerId) {
                protected.push(member.id);
                continue;
            }

            // Protect bot owners
            const config = require('../../config.json');
            if (config.botOwners?.includes(member.id)) {
                protected.push(member.id);
                continue;
            }

            // Protect admins and mods
            if (member.permissions.has('Administrator') || 
                member.permissions.has('BanMembers') || 
                member.permissions.has('KickMembers')) {
                protected.push(member.id);
                continue;
            }

            // Protect whitelisted users
            try {
                const guildSettings = await client.prisma.guildSettings.findUnique({
                    where: { guildId: guild.id }
                });
                
                if (guildSettings?.whitelist) {
                    const whitelist = JSON.parse(guildSettings.whitelist);
                    if (whitelist.includes(member.id)) {
                        protected.push(member.id);
                        continue;
                    }
                }
            } catch (error) {
                // Continue if whitelist check fails
            }

            // Protect users with high roles
            if (member.roles.highest.position >= guild.members.me.roles.highest.position) {
                protected.push(member.id);
                continue;
            }
        }

        return protected;
    },

    async showConfirmation(message, criteria, targets, protectedCount, reason, client) {
        // Show sample of targets
        const sampleTargets = targets.slice(0, 5).map(member => 
            `• ${member.user.tag} (\`${member.id}\`) - Tạo <t:${Math.floor(member.user.createdTimestamp / 1000)}:R>`
        ).join('\n');
        
        const confirmResult = productionStyle.createWarningEmbed(
            'MASSBAN CONFIRMATION - EXTREMELY DANGEROUS',
            { tag: 'DESTRUCTIVE ACTION' },
            message.author,
            '⚠️ **THIS ACTION CANNOT BE UNDONE**',
            [
                { name: 'Criteria', value: criteria, inline: true },
                { name: 'Targets to Ban', value: targets.length.toString(), inline: true },
                { name: 'Protected Users', value: protectedCount.toString(), inline: true },
                { name: 'Reason', value: reason, inline: false },
                { name: 'Sample Targets', value: sampleTargets + (targets.length > 5 ? `\n... và ${targets.length - 5} người khác` : ''), inline: false },
                { name: 'Safety Protections', value: '• Server Owner được bảo vệ\n• Bot Owner được bảo vệ\n• Admin/Mod được bảo vệ\n• Whitelist được bảo vệ\n• Role cao được bảo vệ', inline: false },
                { name: '⚠️ FINAL WARNING', value: '**HÀNH ĐỘNG NÀY KHÔNG THỂ HOÀN TÁC!**\n\nBạn có 30 giây để xác nhận.\nSuy nghĩ kỹ trước khi xác nhận!', inline: false }
            ]
        );

        // Confirmation buttons
        const confirmButton = new ButtonBuilder()
            .setCustomId('massban_confirm')
            .setLabel('XÁC NHẬN MASSBAN')
            .setEmoji('💥')
            .setStyle(ButtonStyle.Danger);

        const cancelButton = new ButtonBuilder()
            .setCustomId('massban_cancel')
            .setLabel('HỦY BỎ')
            .setEmoji('❌')
            .setStyle(ButtonStyle.Secondary);

        const row = new ActionRowBuilder().addComponents(confirmButton, cancelButton);

        const confirmMsg = await message.reply({ 
            embeds: [confirmResult.embed], 
            files: confirmResult.attachments,
            components: [row] 
        });

        // Handle confirmation
        const collector = confirmMsg.createMessageComponentCollector({
            componentType: ComponentType.Button,
            time: 30000 // 30 seconds only
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

            if (interaction.customId === 'massban_confirm') {
                await this.executeMassBan(confirmMsg, targets, reason, criteria, message, client);
            } else {
                const cancelResult = productionStyle.createInfoEmbed(
                    'Massban Cancelled',
                    { tag: 'Action Cancelled' },
                    message.author,
                    'Massban đã được hủy bỏ. Không có ai bị ban.',
                    [
                        { name: 'Status', value: '✅ Cancelled by user' },
                        { name: 'Targets Spared', value: targets.length.toString() },
                        { name: 'Time', value: `<t:${Math.floor(Date.now() / 1000)}:F>` }
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
                    'Không nhận được xác nhận trong 30 giây. Massban đã được hủy.',
                    [
                        { name: 'Timeout', value: '30 seconds elapsed' },
                        { name: 'Status', value: '✅ No users banned' },
                        { name: 'Safety', value: 'Automatic cancellation for safety' }
                    ]
                );
                confirmMsg.edit({ 
                    embeds: [timeoutResult.embed], 
                    files: timeoutResult.attachments,
                    components: [] 
                }).catch(() => {});
            }
        });
    },

    async executeMassBan(confirmMsg, targets, reason, criteria, originalMessage, client) {
        const embed = productionStyle.createInfoEmbed(
            '⚡ Đang thực hiện Massban...',
            `Đang ban ${targets.length} người dùng...`
        );
        await confirmMsg.edit({ embeds: [embed], components: [] });

        let bannedCount = 0;
        let failedCount = 0;
        const failures = [];

        // Ban in batches to avoid rate limits
        const batchSize = 5;
        for (let i = 0; i < targets.length; i += batchSize) {
            const batch = targets.slice(i, i + batchSize);
            
            const batchPromises = batch.map(async (member) => {
                try {
                    await member.ban({ 
                        reason: `[MASSBAN] ${reason} | Criteria: ${criteria} | By: ${originalMessage.author.tag}`,
                        deleteMessageDays: 1
                    });
                    bannedCount++;
                } catch (error) {
                    failedCount++;
                    failures.push(`${member.user.tag}: ${error.message}`);
                }
            });

            await Promise.all(batchPromises);

            // Update progress
            if (targets.length > 10) {
                const progress = Math.min(i + batchSize, targets.length);
                const progressEmbed = productionStyle.createInfoEmbed(
                    '⚡ Đang thực hiện Massban...',
                    `Tiến độ: ${progress}/${targets.length}\nĐã ban: ${bannedCount}\nThất bại: ${failedCount}`
                );
                await confirmMsg.edit({ embeds: [progressEmbed] });
            }

            // Rate limit protection
            await new Promise(resolve => setTimeout(resolve, 1000)); // 1 second delay between batches
        }

        // Final result
        const resultEmbed = productionStyle.createSuccessEmbed(
            'Massban hoàn thành!',
            `**Tiêu chí:** ${criteria}\n**Đã ban:** ${bannedCount} người dùng\n**Thất bại:** ${failedCount} người dùng`
        );

        if (failures.length > 0) {
            const failureText = failures.slice(0, 5).join('\n') + 
                (failures.length > 5 ? `\n... và ${failures.length - 5} lỗi khác` : '');
            
            resultEmbed.addFields([{
                name: '❌ Thất bại:',
                value: failureText,
                inline: false
            }]);
        }

        await confirmMsg.edit({ embeds: [resultEmbed], components: [] });

        // Log to database and mod channel
        try {
            // Save massban record
            await client.prisma.ban.create({
                data: {
                    userId: 'MASSBAN',
                    guildId: originalMessage.guild.id,
                    reason: `[MASSBAN] ${reason} | Criteria: ${criteria} | Banned: ${bannedCount}`,
                    bannedBy: originalMessage.author.id
                }
            });

            // Log to mod channel
            const guildSettings = await client.prisma.guildSettings.findUnique({
                where: { guildId: originalMessage.guild.id }
            });

            if (guildSettings?.logChannel) {
                const logChannel = originalMessage.guild.channels.cache.get(guildSettings.logChannel);
                if (logChannel) {
                    const logEmbed = productionStyle.createModerationEmbed({
                        action: 'MASSBAN Executed',
                        targetUser: { tag: `${bannedCount} Users`, id: 'massban' },
                        moderator: originalMessage.author,
                        reason: `Criteria: ${criteria} | Reason: ${reason}`,
                        channel: originalMessage.channel.toString(),
                        fields: [
                            {
                                name: '📊 Statistics:',
                                value: `**Successful:** ${bannedCount}\n**Failed:** ${failedCount}\n**Criteria:** ${criteria}`,
                                inline: true
                            }
                        ]
                    });

                    await logChannel.send({ embeds: [logEmbed] });
                }
            }
        } catch (error) {
            logger.error('Error logging massban', error);
        }

        logger.security('Massban executed', `${bannedCount} users banned by ${originalMessage.author.tag} with criteria: ${criteria}`, 'high');
        logger.command(originalMessage.author, `massban ${criteria} (${bannedCount} banned)`, originalMessage.guild);
    },

    async showHelp(message) {
        const embed = productionStyle.createHelpEmbed({
            title: '💥 Massban Command - NGUY HIỂM!',
            description: '⚠️ **Lệnh này cực kỳ nguy hiểm và chỉ dành cho Bot Owner/Server Owner!**\n\nBan hàng loạt theo tiêu chí nhất định.',
            categories: [
                {
                    emoji: '🆕',
                    name: 'new-accounts',
                    value: 'Ban tài khoản mới hơn 7 ngày'
                },
                {
                    emoji: '👤',
                    name: 'no-avatar',
                    value: 'Ban user không có avatar'
                },
                {
                    emoji: '🎭',
                    name: 'no-roles',
                    value: 'Ban user không có role nào'
                },
                {
                    emoji: '🤖',
                    name: 'bots',
                    value: 'Ban tất cả bot (trừ bot này)'
                },
                {
                    emoji: '⚠️',
                    name: 'suspicious',
                    value: 'Ban tài khoản đáng ngờ (kết hợp nhiều tiêu chí)'
                }
            ]
        });

        embed.addFields([
            {
                name: '🛡️ Bảo vệ tự động:',
                value: '• Server Owner\n• Bot Owner\n• Admin/Moderator\n• Whitelist users\n• High role users',
                inline: true
            },
            {
                name: '⚠️ Giới hạn an toàn:',
                value: '• Tối đa 50 user/lần\n• Chỉ Owner được dùng\n• Xác nhận bắt buộc\n• Không thể hoàn tác',
                inline: true
            }
        ]);

        await message.reply({ embeds: [embed] });
    }
};
