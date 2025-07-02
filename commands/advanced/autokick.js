const { hasFlexiblePermission } = require('../../utils/permissions');
const embedFactory = require('../../utils/embeds');
const logger = require('../../utils/logger');
const { ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType } = require('discord.js');

module.exports = {
    name: 'autokick',
    description: 'Hệ thống tự động kick thành viên theo điều kiện và rules',
    aliases: ['kickbot', 'autoremove', 'conditiokick'],
    usage: '!autokick <add|remove|list|toggle> [condition]',
    category: 'advanced',
    permissions: 'admin',
    guildOnly: true,
    examples: [
        '!autokick add inactive_30d',
        '!autokick add no_roles_7d',
        '!autokick add suspicious_account',
        '!autokick list',
        '!autokick toggle'
    ],

    // In-memory storage for autokick rules
    autoKickData: new Map(),

    async execute(message, args, client) {
        try {
            // Check permissions
            if (!await hasFlexiblePermission(message.member, 'autokick', this.permissions, message.guild.id)) {
                const embed = embedFactory.error(
                    'Không có quyền!',
                    'Lệnh này cần quyền **Administrator** hoặc cao hơn.'
                );
                return message.reply({ embeds: [embed] });
            }

            // Initialize guild data
            if (!this.autoKickData.has(message.guild.id)) {
                this.autoKickData.set(message.guild.id, {
                    enabled: false,
                    rules: [],
                    whitelist: [],
                    stats: { kicked: 0, prevented: 0 }
                });
            }

            if (!args[0]) {
                return this.showStatus(message);
            }

            const action = args[0].toLowerCase();
            
            switch (action) {
                case 'add':
                case 'a':
                    if (!args[1]) {
                        return this.showRuleTypes(message);
                    }
                    await this.addRule(message, args[1]);
                    break;
                case 'remove':
                case 'r':
                case 'delete':
                    if (!args[1]) {
                        const embed = embedFactory.error(
                            'Thiếu rule ID!',
                            'Sử dụng: `!autokick remove <rule_id>`\n\nXem danh sách: `!autokick list`'
                        );
                        return message.reply({ embeds: [embed] });
                    }
                    await this.removeRule(message, args[1]);
                    break;
                case 'list':
                case 'l':
                    await this.listRules(message);
                    break;
                case 'toggle':
                case 't':
                    await this.toggleSystem(message);
                    break;
                case 'test':
                    await this.testRules(message);
                    break;
                case 'whitelist':
                case 'wl':
                    await this.manageWhitelist(message, args.slice(1));
                    break;
                default:
                    await this.showHelp(message);
                    break;
            }

        } catch (error) {
            logger.error('AutoKick command error', error);
            const embed = embedFactory.error(
                'Lỗi autokick!',
                'Đã xảy ra lỗi khi thực thi lệnh autokick.',
                error.message
            );
            await message.reply({ embeds: [embed] });
        }
    },

    async addRule(message, ruleType) {
        const guildData = this.autoKickData.get(message.guild.id);
        
        // Check if rule already exists
        if (guildData.rules.some(r => r.type === ruleType)) {
            const embed = embedFactory.warning(
                'Rule đã tồn tại!',
                `Rule \`${ruleType}\` đã có trong hệ thống AutoKick.`
            );
            return message.reply({ embeds: [embed] });
        }

        const ruleConfig = this.getRuleConfig(ruleType);
        if (!ruleConfig) {
            return this.showRuleTypes(message);
        }

        const rule = {
            id: Date.now(),
            type: ruleType,
            ...ruleConfig,
            addedBy: message.author.id,
            addedAt: new Date().toISOString(),
            triggered: 0,
            lastTriggered: null
        };

        guildData.rules.push(rule);

        const embed = embedFactory.success(
            '✅ Đã thêm AutoKick rule!',
            `**Rule:** \`${ruleType}\`\n**Mô tả:** ${ruleConfig.description}`
        );

        embed.addFields([
            {
                name: '⚙️ Điều kiện kick:',
                value: ruleConfig.condition,
                inline: false
            },
            {
                name: '⚠️ Cảnh báo:',
                value: 'Rule này sẽ **TỰ ĐỘNG KICK** thành viên nếu đáp ứng điều kiện.\nKhông áp dụng cho: Owner, Admin, Bot, Whitelist.',
                inline: false
            }
        ]);

        await message.reply({ embeds: [embed] });
        logger.command(message.author, `autokick add ${ruleType}`, message.guild);
    },

    async removeRule(message, ruleId) {
        const guildData = this.autoKickData.get(message.guild.id);
        const ruleIndex = guildData.rules.findIndex(r => r.id.toString() === ruleId || r.type === ruleId);
        
        if (ruleIndex === -1) {
            const embed = embedFactory.error(
                'Rule không tồn tại!',
                `Rule với ID \`${ruleId}\` không tìm thấy.\n\nXem danh sách: \`!autokick list\``
            );
            return message.reply({ embeds: [embed] });
        }

        const removedRule = guildData.rules[ruleIndex];
        guildData.rules.splice(ruleIndex, 1);

        const embed = embedFactory.success(
            '✅ Đã xóa AutoKick rule!',
            `**Rule:** \`${removedRule.type}\`\n**Đã trigger:** ${removedRule.triggered} lần`
        );

        await message.reply({ embeds: [embed] });
        logger.command(message.author, `autokick remove ${removedRule.type}`, message.guild);
    },

    async listRules(message) {
        const guildData = this.autoKickData.get(message.guild.id);

        if (guildData.rules.length === 0) {
            const embed = embedFactory.warning(
                'Không có AutoKick rules!',
                'Chưa có rule nào được thiết lập.\n\nThêm rule: `!autokick add <rule_type>`\nXem types: `!autokick add`'
            );
            return message.reply({ embeds: [embed] });
        }

        const embed = embedFactory.info(
            '⚡ AutoKick Rules',
            `**Server:** ${message.guild.name}\n**Trạng thái:** ${guildData.enabled ? '🟢 Hoạt động' : '🔴 Tắt'}\n**Tổng rules:** ${guildData.rules.length}`
        );

        const rulesList = guildData.rules.map((rule, index) => {
            const addedBy = message.guild.members.cache.get(rule.addedBy)?.user.tag || 'Unknown';
            const addedDate = new Date(rule.addedAt).toLocaleDateString('vi-VN');
            
            return `**${index + 1}.** \`${rule.type}\`\n` +
                   `├ Mô tả: ${rule.description}\n` +
                   `├ Thêm bởi: ${addedBy}\n` +
                   `├ Ngày thêm: ${addedDate}\n` +
                   `├ Triggered: ${rule.triggered} lần\n` +
                   `└ ID: ${rule.id}`;
        }).join('\n\n');

        embed.addFields([{
            name: '📝 Danh sách Rules:',
            value: rulesList.length > 1000 ? rulesList.substring(0, 1000) + '...' : rulesList,
            inline: false
        }]);

        // Add control buttons
        const buttons = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('autokick_toggle')
                    .setLabel(guildData.enabled ? '🔴 Tắt AutoKick' : '🟢 Bật AutoKick')
                    .setStyle(guildData.enabled ? ButtonStyle.Danger : ButtonStyle.Success),
                new ButtonBuilder()
                    .setCustomId('autokick_test')
                    .setLabel('🧪 Test Rules')
                    .setStyle(ButtonStyle.Secondary),
                new ButtonBuilder()
                    .setCustomId('autokick_stats')
                    .setLabel('📊 Statistics')
                    .setStyle(ButtonStyle.Secondary)
            );

        const msg = await message.reply({ embeds: [embed], components: [buttons] });

        // Handle button interactions
        const collector = msg.createMessageComponentCollector({
            componentType: ComponentType.Button,
            time: 300000
        });

        collector.on('collect', async (interaction) => {
            if (interaction.user.id !== message.author.id) {
                await interaction.reply({ 
                    content: 'Chỉ người gọi lệnh mới có thể sử dụng!', 
                    ephemeral: true 
                });
                return;
            }

            await interaction.deferUpdate();
            
            switch (interaction.customId) {
                case 'autokick_toggle':
                    await this.toggleSystem(message, true);
                    break;
                case 'autokick_test':
                    await this.testRules(message);
                    break;
                case 'autokick_stats':
                    await this.showStats(message);
                    break;
            }
        });
    },

    async toggleSystem(message, isButton = false) {
        const guildData = this.autoKickData.get(message.guild.id);
        guildData.enabled = !guildData.enabled;

        const embed = embedFactory.success(
            `${guildData.enabled ? '🟢' : '🔴'} AutoKick ${guildData.enabled ? 'Đã BẬT' : 'Đã TẮT'}!`,
            `Hệ thống AutoKick đã được **${guildData.enabled ? 'kích hoạt' : 'vô hiệu hóa'}**.`
        );

        if (guildData.enabled && guildData.rules.length === 0) {
            embed.addFields([{
                name: '⚠️ Lưu ý:',
                value: 'AutoKick đã bật nhưng chưa có rule nào.\nThêm rule: `!autokick add <rule_type>`',
                inline: false
            }]);
        }

        if (!isButton) {
            await message.reply({ embeds: [embed] });
        }

        logger.command(message.author, `autokick ${guildData.enabled ? 'enable' : 'disable'}`, message.guild);
    },

    async showStatus(message) {
        const guildData = this.autoKickData.get(message.guild.id);

        const embed = embedFactory.info(
            '⚡ AutoKick System Status',
            `**Server:** ${message.guild.name}`
        );

        embed.addFields([
            {
                name: '⚙️ Trạng thái hệ thống:',
                value: `**Status:** ${guildData.enabled ? '🟢 Hoạt động' : '🔴 Tắt'}\n**Rules:** ${guildData.rules.length}\n**Total Kicks:** ${guildData.stats.kicked}\n**Prevented:** ${guildData.stats.prevented}`,
                inline: true
            },
            {
                name: '🎯 AutoKick Conditions:',
                value: '• Inactive members (30+ days)\n• No roles assigned (7+ days)\n• Suspicious accounts\n• Custom conditions',
                inline: true
            },
            {
                name: '🛡️ Miễn trừ AutoKick:',
                value: '• Server Owner\n• Bot Owner\n• Administrator\n• Bots\n• Whitelist members',
                inline: true
            }
        ]);

        if (guildData.rules.length > 0) {
            const activeRules = guildData.rules
                .slice(0, 3)
                .map(r => `• \`${r.type}\` (${r.triggered} kicks)`)
                .join('\n');
                
            embed.addFields([{
                name: '📝 Active Rules:',
                value: activeRules,
                inline: false
            }]);
        }

        await message.reply({ embeds: [embed] });
    },

    async showRuleTypes(message) {
        const embed = embedFactory.help({
            title: '⚡ AutoKick Rule Types',
            description: '**Các loại rule AutoKick có sẵn**\n\nChọn rule type phù hợp với server',
            categories: [
                {
                    emoji: '😴',
                    name: 'inactive_30d',
                    value: 'Kick members không hoạt động 30+ ngày'
                },
                {
                    emoji: '👥',
                    name: 'no_roles_7d',
                    value: 'Kick members không có role sau 7 ngày'
                },
                {
                    emoji: '🔍',
                    name: 'suspicious_account',
                    value: 'Kick accounts nghi ngờ (tên random, avatar mặc định)'
                },
                {
                    emoji: '📅',
                    name: 'new_account_spam',
                    value: 'Kick accounts mới tạo (<7 ngày) spam'
                },
                {
                    emoji: '⚠️',
                    name: 'multiple_violations',
                    value: 'Kick members có nhiều vi phạm'
                }
            ]
        });

        embed.addFields([
            {
                name: '📝 Cách sử dụng:',
                value: '`!autokick add <rule_type>`\n\nVí dụ: `!autokick add inactive_30d`',
                inline: true
            },
            {
                name: '⚠️ Lưu ý:',
                value: 'Tất cả rules đều có safeguard để tránh kick nhầm admin/owner/bot.',
                inline: true
            }
        ]);

        await message.reply({ embeds: [embed] });
    },

    async showHelp(message) {
        const embed = embedFactory.help({
            title: '⚡ AutoKick System Help',
            description: '**Hệ thống tự động kick thành viên**\n\n⚠️ **Sử dụng cẩn thận - có thể kick nhầm!**',
            categories: [
                {
                    emoji: '➕',
                    name: 'Add Rule',
                    value: '`!autokick add <rule_type>` - Thêm rule autokick'
                },
                {
                    emoji: '➖',
                    name: 'Remove Rule',
                    value: '`!autokick remove <rule_id>` - Xóa rule'
                },
                {
                    emoji: '📋',
                    name: 'List Rules',
                    value: '`!autokick list` - Xem tất cả rules'
                },
                {
                    emoji: '🔄',
                    name: 'Toggle System',
                    value: '`!autokick toggle` - Bật/tắt AutoKick'
                },
                {
                    emoji: '🧪',
                    name: 'Test Rules',
                    value: '`!autokick test` - Test rules với members hiện tại'
                }
            ]
        });

        embed.addFields([
            {
                name: '⚠️ Cảnh báo:',
                value: '• AutoKick sẽ kick NGAY LẬP TỨC khi đúng điều kiện\n• Không thể undo sau khi kick\n• Có thể kick nhầm thành viên tốt\n• Chỉ dùng cho cleanup định kỳ',
                inline: false
            },
            {
                name: '🛡️ An toàn:',
                value: '• Test rules trước khi enable\n• Sử dụng whitelist cho VIPs\n• Monitor logs thường xuyên\n• Backup member list\n• Có kế hoạch invite lại',
                inline: false
            }
        ]);

        await message.reply({ embeds: [embed] });
    },

    // Helper functions
    getRuleConfig(ruleType) {
        const rules = {
            'inactive_30d': {
                description: 'Kick members không hoạt động 30+ ngày',
                condition: 'Không gửi tin nhắn, reactions, hoặc join voice trong 30 ngày',
                severity: 'Medium',
                checkInterval: '24h'
            },
            'no_roles_7d': {
                description: 'Kick members không có role sau 7 ngày join',
                condition: 'Chỉ có @everyone role sau 7 ngày trong server',
                severity: 'Low',
                checkInterval: '12h'
            },
            'suspicious_account': {
                description: 'Kick accounts nghi ngờ',
                condition: 'Tên random + avatar mặc định + không hoạt động',
                severity: 'High',
                checkInterval: '6h'
            },
            'new_account_spam': {
                description: 'Kick accounts mới spam',
                condition: 'Account < 7 ngày + spam messages',
                severity: 'High',
                checkInterval: '1h'
            },
            'multiple_violations': {
                description: 'Kick members vi phạm nhiều lần',
                condition: '3+ warnings hoặc mutes trong 30 ngày',
                severity: 'High',
                checkInterval: '24h'
            }
        };

        return rules[ruleType] || null;
    }
};