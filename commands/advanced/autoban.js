const { hasFlexiblePermission } = require('../../utils/permissions');
const embedFactory = require('../../utils/embeds');
const logger = require('../../utils/logger');
const { ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType } = require('discord.js');

module.exports = {
    name: 'autoban',
    description: 'Hệ thống tự động ban thành viên dựa trên keywords và điều kiện',
    aliases: ['autobanlist', 'keywordban'],
    usage: '!autoban <add|remove|list|toggle> [keyword/condition]',
    category: 'advanced',
    permissions: 'admin',
    guildOnly: true,
    examples: [
        '!autoban add scam',
        '!autoban add "discord nitro"',
        '!autoban remove spam',
        '!autoban list',
        '!autoban toggle'
    ],

    // In-memory storage (in real app, use database)
    autoBanData: new Map(),

    async execute(message, args, client) {
        try {
            // Check permissions
            if (!await hasFlexiblePermission(message.member, 'autoban', this.permissions, message.guild.id)) {
                const embed = embedFactory.error(
                    'Không có quyền!',
                    'Lệnh này cần quyền **Administrator** hoặc cao hơn.'
                );
                return message.reply({ embeds: [embed] });
            }

            // Initialize guild data if not exists
            if (!this.autoBanData.has(message.guild.id)) {
                this.autoBanData.set(message.guild.id, {
                    enabled: false,
                    keywords: [],
                    actions: [],
                    whitelist: []
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
                        const embed = embedFactory.error(
                            'Thiếu keyword!',
                            'Sử dụng: `!autoban add <keyword>`\n\nVí dụ: `!autoban add "discord nitro"`'
                        );
                        return message.reply({ embeds: [embed] });
                    }
                    await this.addKeyword(message, args.slice(1).join(' '));
                    break;
                case 'remove':
                case 'r':
                case 'delete':
                    if (!args[1]) {
                        const embed = embedFactory.error(
                            'Thiếu keyword!',
                            'Sử dụng: `!autoban remove <keyword>`'
                        );
                        return message.reply({ embeds: [embed] });
                    }
                    await this.removeKeyword(message, args.slice(1).join(' '));
                    break;
                case 'list':
                case 'l':
                    await this.listKeywords(message);
                    break;
                case 'toggle':
                case 't':
                    await this.toggleSystem(message);
                    break;
                case 'settings':
                case 's':
                    await this.showSettings(message);
                    break;
                case 'test':
                    if (!args[1]) {
                        const embed = embedFactory.error(
                            'Thiếu text để test!',
                            'Sử dụng: `!autoban test <text>`'
                        );
                        return message.reply({ embeds: [embed] });
                    }
                    await this.testKeyword(message, args.slice(1).join(' '));
                    break;
                default:
                    await this.showHelp(message);
                    break;
            }

        } catch (error) {
            logger.error('Autoban command error', error);
            const embed = embedFactory.error(
                'Lỗi autoban!',
                'Đã xảy ra lỗi khi thực thi lệnh autoban.',
                error.message
            );
            await message.reply({ embeds: [embed] });
        }
    },

    async addKeyword(message, keyword) {
        const guildData = this.autoBanData.get(message.guild.id);
        const cleanKeyword = keyword.toLowerCase().trim();

        // Check if keyword already exists
        if (guildData.keywords.some(k => k.keyword === cleanKeyword)) {
            const embed = embedFactory.warning(
                'Keyword đã tồn tại!',
                `Keyword \`${cleanKeyword}\` đã có trong danh sách autoban.`
            );
            return message.reply({ embeds: [embed] });
        }

        // Add keyword
        const keywordData = {
            id: Date.now(),
            keyword: cleanKeyword,
            addedBy: message.author.id,
            addedAt: new Date().toISOString(),
            triggered: 0,
            lastTriggered: null
        };

        guildData.keywords.push(keywordData);

        const embed = embedFactory.success(
            '✅ Đã thêm AutoBan keyword!',
            `**Keyword:** \`${cleanKeyword}\`\n**Thêm bởi:** ${message.author.tag}`
        );

        embed.addFields([
            {
                name: '⚠️ Cảnh báo:',
                value: 'Keyword này sẽ **TỰ ĐỘNG BAN** thành viên khi:\n• Gửi tin nhắn chứa keyword\n• Đặt nickname chứa keyword\n• Username chứa keyword (khi join)',
                inline: false
            },
            {
                name: '🛡️ Bảo vệ:',
                value: 'Autoban sẽ **KHÔNG** áp dụng cho:\n• Server Owner\n• Bot Owner\n• Thành viên có quyền Administrator\n• Bots',
                inline: false
            }
        ]);

        await message.reply({ embeds: [embed] });
        logger.command(message.author, `autoban add "${cleanKeyword}"`, message.guild);
    },

    async removeKeyword(message, keyword) {
        const guildData = this.autoBanData.get(message.guild.id);
        const cleanKeyword = keyword.toLowerCase().trim();

        const keywordIndex = guildData.keywords.findIndex(k => k.keyword === cleanKeyword);
        
        if (keywordIndex === -1) {
            const embed = embedFactory.error(
                'Keyword không tồn tại!',
                `Keyword \`${cleanKeyword}\` không có trong danh sách.\n\nXem danh sách: \`!autoban list\``
            );
            return message.reply({ embeds: [embed] });
        }

        const removedKeyword = guildData.keywords[keywordIndex];
        guildData.keywords.splice(keywordIndex, 1);

        const embed = embedFactory.success(
            '✅ Đã xóa AutoBan keyword!',
            `**Keyword:** \`${cleanKeyword}\`\n**Đã trigger:** ${removedKeyword.triggered} lần`
        );

        await message.reply({ embeds: [embed] });
        logger.command(message.author, `autoban remove "${cleanKeyword}"`, message.guild);
    },

    async listKeywords(message) {
        const guildData = this.autoBanData.get(message.guild.id);

        if (guildData.keywords.length === 0) {
            const embed = embedFactory.warning(
                'Không có AutoBan keywords!',
                'Chưa có keyword nào được thiết lập.\n\nThêm keyword: `!autoban add <keyword>`'
            );
            return message.reply({ embeds: [embed] });
        }

        const embed = embedFactory.info(
            '🚫 AutoBan Keywords',
            `**Server:** ${message.guild.name}\n**Trạng thái:** ${guildData.enabled ? '🟢 Hoạt động' : '🔴 Tắt'}\n**Tổng:** ${guildData.keywords.length} keywords`
        );

        const keywordList = guildData.keywords.map((k, index) => {
            const addedBy = message.guild.members.cache.get(k.addedBy)?.user.tag || 'Unknown';
            const addedDate = new Date(k.addedAt).toLocaleDateString('vi-VN');
            
            return `**${index + 1}.** \`${k.keyword}\`\n` +
                   `├ Thêm bởi: ${addedBy}\n` +
                   `├ Ngày thêm: ${addedDate}\n` +
                   `├ Triggered: ${k.triggered} lần\n` +
                   `└ ID: ${k.id}`;
        }).join('\n\n');

        embed.addFields([{
            name: '📝 Danh sách Keywords:',
            value: keywordList.length > 1000 ? keywordList.substring(0, 1000) + '...' : keywordList,
            inline: false
        }]);

        if (keywordList.length > 1000) {
            embed.addFields([{
                name: '📄 Lưu ý:',
                value: 'Danh sách quá dài, chỉ hiển thị một phần. Sử dụng `!autoban settings` để xem đầy đủ.',
                inline: false
            }]);
        }

        // Add control buttons
        const buttons = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('autoban_toggle')
                    .setLabel(guildData.enabled ? '🔴 Tắt AutoBan' : '🟢 Bật AutoBan')
                    .setStyle(guildData.enabled ? ButtonStyle.Danger : ButtonStyle.Success),
                new ButtonBuilder()
                    .setCustomId('autoban_clear_all')
                    .setLabel('🗑️ Xóa tất cả')
                    .setStyle(ButtonStyle.Danger)
            );

        const msg = await message.reply({ embeds: [embed], components: [buttons] });

        // Handle button interactions
        const collector = msg.createMessageComponentCollector({
            componentType: ComponentType.Button,
            time: 300000 // 5 minutes
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
            
            if (interaction.customId === 'autoban_toggle') {
                await this.toggleSystem(message, true);
            } else if (interaction.customId === 'autoban_clear_all') {
                await this.clearAllKeywords(message);
            }
        });
    },

    async toggleSystem(message, isButton = false) {
        const guildData = this.autoBanData.get(message.guild.id);
        guildData.enabled = !guildData.enabled;

        const embed = embedFactory.success(
            `${guildData.enabled ? '🟢' : '🔴'} AutoBan ${guildData.enabled ? 'Đã BẬT' : 'Đã TẮT'}!`,
            `Hệ thống AutoBan đã được **${guildData.enabled ? 'kích hoạt' : 'vô hiệu hóa'}**.`
        );

        if (guildData.enabled && guildData.keywords.length === 0) {
            embed.addFields([{
                name: '⚠️ Lưu ý:',
                value: 'AutoBan đã bật nhưng chưa có keyword nào.\nThêm keyword: `!autoban add <keyword>`',
                inline: false
            }]);
        }

        if (!isButton) {
            await message.reply({ embeds: [embed] });
        }

        logger.command(message.author, `autoban ${guildData.enabled ? 'enable' : 'disable'}`, message.guild);
    },

    async showStatus(message) {
        const guildData = this.autoBanData.get(message.guild.id);

        const embed = embedFactory.info(
            '🤖 AutoBan System Status',
            `**Server:** ${message.guild.name}`
        );

        embed.addFields([
            {
                name: '⚙️ Trạng thái hệ thống:',
                value: `**Status:** ${guildData.enabled ? '🟢 Hoạt động' : '🔴 Tắt'}\n**Keywords:** ${guildData.keywords.length}\n**Total Triggers:** ${guildData.keywords.reduce((sum, k) => sum + k.triggered, 0)}`,
                inline: true
            },
            {
                name: '🎯 Hành động AutoBan:',
                value: '• Ban ngay lập tức\n• Xóa tin nhắn vi phạm\n• Log vào channel\n• Thông báo cho mods',
                inline: true
            },
            {
                name: '🛡️ Miễn trừ AutoBan:',
                value: '• Server Owner\n• Bot Owner\n• Administrator\n• Bots\n• Whitelist users',
                inline: true
            }
        ]);

        if (guildData.keywords.length > 0) {
            const recentKeywords = guildData.keywords
                .slice(-3)
                .map(k => `• \`${k.keyword}\` (${k.triggered} triggers)`)
                .join('\n');
                
            embed.addFields([{
                name: '📝 Keywords gần đây:',
                value: recentKeywords,
                inline: false
            }]);
        }

        await message.reply({ embeds: [embed] });
    },

    async showHelp(message) {
        const embed = embedFactory.help({
            title: '🚫 AutoBan System Help',
            description: '**Hệ thống tự động ban dựa trên keywords**\n\n⚠️ **Cực kỳ nguy hiểm - sử dụng cẩn thận!**',
            categories: [
                {
                    emoji: '➕',
                    name: 'Add Keyword',
                    value: '`!autoban add <keyword>` - Thêm keyword cần ban'
                },
                {
                    emoji: '➖',
                    name: 'Remove Keyword',
                    value: '`!autoban remove <keyword>` - Xóa keyword'
                },
                {
                    emoji: '📋',
                    name: 'List Keywords',
                    value: '`!autoban list` - Xem tất cả keywords'
                },
                {
                    emoji: '🔄',
                    name: 'Toggle System',
                    value: '`!autoban toggle` - Bật/tắt AutoBan'
                },
                {
                    emoji: '🧪',
                    name: 'Test Keyword',
                    value: '`!autoban test <text>` - Test keyword matching'
                }
            ]
        });

        embed.addFields([
            {
                name: '⚠️ Cảnh báo nghiêm trọng:',
                value: '• AutoBan sẽ **BAN NGAY LẬP TỨC** không cần xác nhận\n• Không thể undo sau khi ban\n• Có thể ban nhầm thành viên vô tội\n• Chỉ sử dụng cho spam/raid nghiêm trọng',
                inline: false
            },
            {
                name: '🛡️ Khuyến nghị an toàn:',
                value: '• Test keyword trước khi thêm\n• Sử dụng keywords cụ thể\n• Kiểm tra log thường xuyên\n• Backup danh sách thành viên\n• Có kế hoạch rollback',
                inline: false
            }
        ]);

        await message.reply({ embeds: [embed] });
    }
};
