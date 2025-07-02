const { hasFlexiblePermission } = require('../../utils/permissions');
const embedFactory = require('../../utils/embeds');
const logger = require('../../utils/logger');
const { ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType } = require('discord.js');

module.exports = {
    name: 'autorole',
    description: 'Hệ thống tự động cấp role theo điều kiện và hoạt động',
    aliases: ['autorank', 'levelrole', 'activityrole'],
    usage: '!autorole <add|remove|list|toggle> [condition] [role]',
    category: 'advanced',
    permissions: 'admin',
    guildOnly: true,
    examples: [
        '!autorole add messages_100 @Active',
        '!autorole add days_7 @Verified',
        '!autorole add voice_10h @Speaker',
        '!autorole list',
        '!autorole toggle'
    ],

    // In-memory storage for autorole rules
    autoRoleData: new Map(),

    async execute(message, args, client) {
        try {
            // Check permissions
            if (!await hasFlexiblePermission(message.member, 'autorole', this.permissions, message.guild.id)) {
                const embed = embedFactory.error(
                    'Không có quyền!',
                    'Lệnh này cần quyền **Administrator** hoặc cao hơn.'
                );
                return message.reply({ embeds: [embed] });
            }

            // Initialize guild data
            if (!this.autoRoleData.has(message.guild.id)) {
                this.autoRoleData.set(message.guild.id, {
                    enabled: false,
                    rules: [],
                    stats: { assigned: 0, removed: 0 }
                });
            }

            if (!args[0]) {
                return this.showStatus(message);
            }

            const action = args[0].toLowerCase();
            
            switch (action) {
                case 'add':
                case 'a':
                    if (!args[1] || !args[2]) {
                        return this.showRuleTypes(message);
                    }
                    await this.addRule(message, args[1], args.slice(2).join(' '));
                    break;
                case 'remove':
                case 'r':
                case 'delete':
                    if (!args[1]) {
                        const embed = embedFactory.error(
                            'Thiếu rule ID!',
                            'Sử dụng: `!autorole remove <rule_id>`\n\nXem danh sách: `!autorole list`'
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
                    await this.testRules(message, args[1]);
                    break;
                case 'scan':
                    await this.scanMembers(message);
                    break;
                default:
                    await this.showHelp(message);
                    break;
            }

        } catch (error) {
            logger.error('AutoRole command error', error);
            const embed = embedFactory.error(
                'Lỗi autorole!',
                'Đã xảy ra lỗi khi thực thi lệnh autorole.',
                error.message
            );
            await message.reply({ embeds: [embed] });
        }
    },

    async addRule(message, condition, roleInput) {
        const guildData = this.autoRoleData.get(message.guild.id);
        
        // Parse role
        const role = this.parseRole(message.guild, roleInput);
        if (!role) {
            const embed = embedFactory.error(
                'Role không tìm thấy!',
                `Không thể tìm thấy role: \`${roleInput}\`\n\nSử dụng: @role, role_name, hoặc role_id`
            );
            return message.reply({ embeds: [embed] });
        }

        // Check if rule already exists
        if (guildData.rules.some(r => r.condition === condition && r.roleId === role.id)) {
            const embed = embedFactory.warning(
                'Rule đã tồn tại!',
                `Rule \`${condition}\` cho role ${role} đã có trong hệ thống.`
            );
            return message.reply({ embeds: [embed] });
        }

        const ruleConfig = this.getRuleConfig(condition);
        if (!ruleConfig) {
            return this.showRuleTypes(message);
        }

        // Check role permissions
        if (role.position >= message.guild.members.me.roles.highest.position) {
            const embed = embedFactory.error(
                'Role quá cao!',
                `Bot không thể quản lý role ${role} vì nó cao hơn role của bot.`
            );
            return message.reply({ embeds: [embed] });
        }

        const rule = {
            id: Date.now(),
            condition: condition,
            roleId: role.id,
            roleName: role.name,
            ...ruleConfig,
            addedBy: message.author.id,
            addedAt: new Date().toISOString(),
            triggered: 0,
            lastTriggered: null
        };

        guildData.rules.push(rule);

        const embed = embedFactory.success(
            '✅ Đã thêm AutoRole rule!',
            `**Điều kiện:** \`${condition}\`\n**Role:** ${role}\n**Mô tả:** ${ruleConfig.description}`
        );

        embed.addFields([
            {
                name: '⚙️ Chi tiết rule:',
                value: `**Requirement:** ${ruleConfig.requirement}\n**Type:** ${ruleConfig.type}\n**Check Interval:** ${ruleConfig.checkInterval}`,
                inline: true
            },
            {
                name: '🎯 Áp dụng cho:',
                value: 'Tất cả thành viên đáp ứng điều kiện sẽ tự động được cấp role này.',
                inline: true
            }
        ]);

        await message.reply({ embeds: [embed] });
        logger.command(message.author, `autorole add ${condition} ${role.name}`, message.guild);
    },

    async removeRule(message, ruleId) {
        const guildData = this.autoRoleData.get(message.guild.id);
        const ruleIndex = guildData.rules.findIndex(r => r.id.toString() === ruleId || r.condition === ruleId);
        
        if (ruleIndex === -1) {
            const embed = embedFactory.error(
                'Rule không tồn tại!',
                `Rule với ID \`${ruleId}\` không tìm thấy.\n\nXem danh sách: \`!autorole list\``
            );
            return message.reply({ embeds: [embed] });
        }

        const removedRule = guildData.rules[ruleIndex];
        guildData.rules.splice(ruleIndex, 1);

        const embed = embedFactory.success(
            '✅ Đã xóa AutoRole rule!',
            `**Rule:** \`${removedRule.condition}\`\n**Role:** ${removedRule.roleName}\n**Đã trigger:** ${removedRule.triggered} lần`
        );

        await message.reply({ embeds: [embed] });
        logger.command(message.author, `autorole remove ${removedRule.condition}`, message.guild);
    },

    async listRules(message) {
        const guildData = this.autoRoleData.get(message.guild.id);

        if (guildData.rules.length === 0) {
            const embed = embedFactory.warning(
                'Không có AutoRole rules!',
                'Chưa có rule nào được thiết lập.\n\nThêm rule: `!autorole add <condition> <role>`\nXem conditions: `!autorole add`'
            );
            return message.reply({ embeds: [embed] });
        }

        const embed = embedFactory.info(
            '🎭 AutoRole Rules',
            `**Server:** ${message.guild.name}\n**Trạng thái:** ${guildData.enabled ? '🟢 Hoạt động' : '🔴 Tắt'}\n**Tổng rules:** ${guildData.rules.length}`
        );

        const rulesList = guildData.rules.map((rule, index) => {
            const role = message.guild.roles.cache.get(rule.roleId);
            const roleDisplay = role ? role.toString() : `Deleted Role (${rule.roleName})`;
            const addedBy = message.guild.members.cache.get(rule.addedBy)?.user.tag || 'Unknown';
            
            return `**${index + 1}.** \`${rule.condition}\` → ${roleDisplay}\n` +
                   `├ Requirement: ${rule.requirement}\n` +
                   `├ Type: ${rule.type}\n` +
                   `├ Triggered: ${rule.triggered} lần\n` +
                   `├ Added by: ${addedBy}\n` +
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
                    .setCustomId('autorole_toggle')
                    .setLabel(guildData.enabled ? '🔴 Tắt AutoRole' : '🟢 Bật AutoRole')
                    .setStyle(guildData.enabled ? ButtonStyle.Danger : ButtonStyle.Success),
                new ButtonBuilder()
                    .setCustomId('autorole_scan')
                    .setLabel('🔍 Scan Members')
                    .setStyle(ButtonStyle.Primary),
                new ButtonBuilder()
                    .setCustomId('autorole_stats')
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
                case 'autorole_toggle':
                    await this.toggleSystem(message, true);
                    break;
                case 'autorole_scan':
                    await this.scanMembers(message);
                    break;
                case 'autorole_stats':
                    await this.showStats(message);
                    break;
            }
        });
    },

    async toggleSystem(message, isButton = false) {
        const guildData = this.autoRoleData.get(message.guild.id);
        guildData.enabled = !guildData.enabled;

        const embed = embedFactory.success(
            `${guildData.enabled ? '🟢' : '🔴'} AutoRole ${guildData.enabled ? 'Đã BẬT' : 'Đã TẮT'}!`,
            `Hệ thống AutoRole đã được **${guildData.enabled ? 'kích hoạt' : 'vô hiệu hóa'}**.`
        );

        if (guildData.enabled && guildData.rules.length === 0) {
            embed.addFields([{
                name: '⚠️ Lưu ý:',
                value: 'AutoRole đã bật nhưng chưa có rule nào.\nThêm rule: `!autorole add <condition> <role>`',
                inline: false
            }]);
        }

        if (!isButton) {
            await message.reply({ embeds: [embed] });
        }

        logger.command(message.author, `autorole ${guildData.enabled ? 'enable' : 'disable'}`, message.guild);
    },

    async showStatus(message) {
        const guildData = this.autoRoleData.get(message.guild.id);

        const embed = embedFactory.info(
            '🎭 AutoRole System Status',
            `**Server:** ${message.guild.name}`
        );

        embed.addFields([
            {
                name: '⚙️ Trạng thái hệ thống:',
                value: `**Status:** ${guildData.enabled ? '🟢 Hoạt động' : '🔴 Tắt'}\n**Rules:** ${guildData.rules.length}\n**Roles Assigned:** ${guildData.stats.assigned}\n**Roles Removed:** ${guildData.stats.removed}`,
                inline: true
            },
            {
                name: '🎯 AutoRole Types:',
                value: '• Activity-based roles\n• Time-based roles\n• Level/XP roles\n• Achievement roles',
                inline: true
            },
            {
                name: '📈 Benefits:',
                value: '• Tự động reward active members\n• Khuyến khích participation\n• Giảm workload cho mods\n• Tạo hierarchy rõ ràng',
                inline: true
            }
        ]);

        if (guildData.rules.length > 0) {
            const activeRules = guildData.rules
                .slice(0, 3)
                .map(r => `• \`${r.condition}\` → ${r.roleName} (${r.triggered} assignments)`)
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
            title: '🎭 AutoRole Conditions',
            description: '**Các điều kiện AutoRole có sẵn**\n\nChọn condition phù hợp để auto-assign roles',
            categories: [
                {
                    emoji: '💬',
                    name: 'messages_X',
                    value: 'Cấp role khi gửi X tin nhắn\nVD: `messages_100`'
                },
                {
                    emoji: '📅',
                    name: 'days_X',
                    value: 'Cấp role khi ở server X ngày\nVD: `days_7`'
                },
                {
                    emoji: '🔊',
                    name: 'voice_Xh',
                    value: 'Cấp role khi ở voice X giờ\nVD: `voice_10h`'
                },
                {
                    emoji: '❤️',
                    name: 'reactions_X',
                    value: 'Cấp role khi react X lần\nVD: `reactions_50`'
                },
                {
                    emoji: '🏆',
                    name: 'level_X',
                    value: 'Cấp role khi đạt level X\nVD: `level_5`'
                }
            ]
        });

        embed.addFields([
            {
                name: '📝 Cách sử dụng:',
                value: '`!autorole add <condition> <@role>`\n\nVí dụ: `!autorole add messages_100 @Active Member`',
                inline: true
            },
            {
                name: '⚠️ Lưu ý:',
                value: 'Bot cần có quyền Manage Roles và role của bot phải cao hơn role được assign.',
                inline: true
            }
        ]);

        await message.reply({ embeds: [embed] });
    },

    async showHelp(message) {
        const embed = embedFactory.help({
            title: '🎭 AutoRole System Help',
            description: '**Hệ thống tự động cấp role**\n\nTự động reward members dựa trên hoạt động',
            categories: [
                {
                    emoji: '➕',
                    name: 'Add Rule',
                    value: '`!autorole add <condition> <role>` - Thêm rule auto-assign'
                },
                {
                    emoji: '➖',
                    name: 'Remove Rule',
                    value: '`!autorole remove <rule_id>` - Xóa rule'
                },
                {
                    emoji: '📋',
                    name: 'List Rules',
                    value: '`!autorole list` - Xem tất cả rules'
                },
                {
                    emoji: '🔄',
                    name: 'Toggle System',
                    value: '`!autorole toggle` - Bật/tắt AutoRole'
                },
                {
                    emoji: '🔍',
                    name: 'Scan Members',
                    value: '`!autorole scan` - Quét và assign roles cho existing members'
                }
            ]
        });

        embed.addFields([
            {
                name: '🎯 Use Cases:',
                value: '• Reward active chatters\n• Verify long-time members\n• Recognize voice participants\n• Create engagement hierarchy\n• Automate member progression',
                inline: true
            },
            {
                name: '✅ Best Practices:',
                value: '• Từ từ tăng requirements\n• Test với 1-2 rules trước\n• Monitor role assignments\n• Backup roles trước khi thay đổi\n• Communicate với members',
                inline: true
            }
        ]);

        await message.reply({ embeds: [embed] });
    },

    // Helper functions
    parseRole(guild, roleInput) {
        // Try role mention first
        const mentionMatch = roleInput.match(/^<@&(\d+)>$/);
        if (mentionMatch) {
            return guild.roles.cache.get(mentionMatch[1]);
        }

        // Try role ID
        if (/^\d+$/.test(roleInput)) {
            return guild.roles.cache.get(roleInput);
        }

        // Try role name
        return guild.roles.cache.find(role => 
            role.name.toLowerCase() === roleInput.toLowerCase()
        );
    },

    getRuleConfig(condition) {
        const configs = {
            // Message-based rules
            messages_50: { description: 'Cấp role khi gửi 50 tin nhắn', requirement: '50 messages', type: 'Activity', checkInterval: '1h' },
            messages_100: { description: 'Cấp role khi gửi 100 tin nhắn', requirement: '100 messages', type: 'Activity', checkInterval: '1h' },
            messages_500: { description: 'Cấp role khi gửi 500 tin nhắn', requirement: '500 messages', type: 'Activity', checkInterval: '6h' },
            
            // Time-based rules
            days_1: { description: 'Cấp role khi ở server 1 ngày', requirement: '1 day membership', type: 'Time', checkInterval: '1h' },
            days_7: { description: 'Cấp role khi ở server 7 ngày', requirement: '7 days membership', type: 'Time', checkInterval: '6h' },
            days_30: { description: 'Cấp role khi ở server 30 ngày', requirement: '30 days membership', type: 'Time', checkInterval: '24h' },
            
            // Voice-based rules
            voice_1h: { description: 'Cấp role khi ở voice 1 giờ', requirement: '1 hour voice time', type: 'Voice', checkInterval: '1h' },
            voice_10h: { description: 'Cấp role khi ở voice 10 giờ', requirement: '10 hours voice time', type: 'Voice', checkInterval: '6h' },
            
            // Reaction-based rules
            reactions_25: { description: 'Cấp role khi react 25 lần', requirement: '25 reactions given', type: 'Engagement', checkInterval: '1h' },
            reactions_100: { description: 'Cấp role khi react 100 lần', requirement: '100 reactions given', type: 'Engagement', checkInterval: '6h' },
            
            // Level-based rules (if level system exists)
            level_5: { description: 'Cấp role khi đạt level 5', requirement: 'Level 5', type: 'Level', checkInterval: '1h' },
            level_10: { description: 'Cấp role khi đạt level 10', requirement: 'Level 10', type: 'Level', checkInterval: '6h' }
        };

        return configs[condition] || null;
    }
};