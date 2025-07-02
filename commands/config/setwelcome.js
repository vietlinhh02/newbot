const { hasFlexiblePermission } = require('../../utils/permissions');
const productionStyle = require('../../utils/demoStyle');
const welcomeCard = require('../../utils/welcomeCard');

module.exports = {
    name: 'setwelcome',
    aliases: ['welcomeset', 'welcome'],
    description: 'Cấu hình hệ thống chào mừng với welcome card đẹp',
    usage: '!setwelcome [subcommand] [options]',
    examples: [
        '!setwelcome #welcome Chào mừng {user} đến với {server}!',
        '!setwelcome card enable',
        '!setwelcome bg https://example.com/image.jpg',
        '!setwelcome colors #ffffff #5865f2',
        '!setwelcome test'
    ],
    permissions: 'admin',
    guildOnly: true,
    category: 'config',
    
    async execute(message, args, client) {
        // Check permissions
        if (!await hasFlexiblePermission(message.member, 'setwelcome', this.permissions, message.guild.id)) {
            const result = productionStyle.createErrorEmbed(
                'Permission Denied',
                'Bạn cần quyền **Administrator** để cấu hình welcome!'
            );
            return message.reply({ 
                embeds: [result.embed], 
                files: result.attachments 
            });
        }
        
        // Show help if no args
        if (!args.length) {
            return this.showWelcomeHelp(message, client);
        }

        const subcommand = args[0].toLowerCase();
        
        try {
            switch (subcommand) {
                case 'card':
                    return await this.handleCardCommand(message, args.slice(1), client);
                    
                case 'bg':
                case 'background':
                    return await this.handleBackgroundCommand(message, args.slice(1), client);
                    
                case 'colors':
                case 'color':
                    return await this.handleColorsCommand(message, args.slice(1), client);
                    
                case 'disable':
                    return await this.handleDisable(message, client);
                    
                case 'test':
                    return await this.handleTest(message, client);
                    
                case 'status':
                    return await this.showStatus(message, client);
                    
                default:
                    // Handle setting channel and message (legacy format)
                    return await this.handleLegacySetup(message, args, client);
            }
            
        } catch (error) {
            console.error('Lỗi khi cấu hình welcome:', error);
            
            const result = productionStyle.createErrorEmbed(
                'Configuration Error',
                'Đã xảy ra lỗi khi cấu hình welcome system.',
                error.message
            );
            
            await message.reply({ 
                embeds: [result.embed], 
                files: result.attachments 
            });
        }
    },

    async showWelcomeHelp(message, client) {
        const guildSettings = await client.prisma.guildSettings.findUnique({
            where: { guildId: message.guild.id }
        });
        
        const currentChannel = guildSettings?.welcomeChannel ? 
            `<#${guildSettings.welcomeChannel}>` : 'Chưa cấu hình';
        const cardEnabled = guildSettings?.welcomeCardEnabled || false;
        
        const result = productionStyle.createInfoEmbed(
            'WELCOME CARD SYSTEM',
            { tag: 'Configuration Guide' },
            message.author,
            'Hệ thống chào mừng với welcome card đẹp và background tùy chỉnh!',
            [
                {
                    name: 'Current Status',
                    value: `📺 **Channel:** ${currentChannel}\n🖼️ **Welcome Card:** ${cardEnabled ? '✅ Enabled' : '❌ Disabled'}`,
                    inline: false
                },
                {
                    name: 'Welcome Card Commands',
                    value: [
                        '• `!setwelcome card enable/disable` - Bật/tắt welcome card',
                        '• `!setwelcome bg <image_url>` - Set background image',
                        '• `!setwelcome colors <text> <accent>` - Set màu text và accent',
                        '• `!setwelcome test` - Test welcome card'
                    ].join('\n'),
                    inline: false
                },
                {
                    name: 'Basic Commands',
                    value: [
                        '• `!setwelcome #channel message` - Setup cơ bản',
                        '• `!setwelcome status` - Xem cấu hình hiện tại',
                        '• `!setwelcome disable` - Tắt hệ thống'
                    ].join('\n'),
                    inline: false
                },
                {
                    name: 'Variables',
                    value: '`{user}`, `{mention}`, `{server}`, `{membercount}`',
                    inline: true
                },
                {
                    name: 'Quick Setup',
                    value: 'Dùng `!setup` để cấu hình nhanh tất cả tính năng',
                    inline: true
                }
            ]
        );
        
        await message.reply({ 
            embeds: [result.embed], 
            files: result.attachments 
        });
    },

    async handleCardCommand(message, args, client) {
        if (!args[0]) {
            const result = productionStyle.createWarningEmbed(
                'Missing Parameter',
                'Vui lòng chọn `enable` hoặc `disable`',
                [
                    { name: 'Example', value: '`!setwelcome card enable`' },
                    { name: 'Options', value: 'enable, disable, on, off' }
                ]
            );
            return message.reply({ 
                embeds: [result.embed], 
                files: result.attachments 
            });
        }

        const action = args[0].toLowerCase();
        const enabled = action === 'enable' || action === 'on' || action === 'true';
        
        if (!['enable', 'disable', 'on', 'off', 'true', 'false'].includes(action)) {
            const result = productionStyle.createErrorEmbed(
                'Invalid Parameter',
                'Chỉ chấp nhận `enable` hoặc `disable`',
                'Valid options: enable, disable, on, off'
            );
            return message.reply({ 
                embeds: [result.embed], 
                files: result.attachments 
            });
        }

        await client.prisma.guildSettings.upsert({
            where: { guildId: message.guild.id },
            update: { welcomeCardEnabled: enabled },
            create: { guildId: message.guild.id, welcomeCardEnabled: enabled }
        });

        const result = productionStyle.createSuccessEmbed(
            `WELCOME CARD ${enabled ? 'ENABLED' : 'DISABLED'}`,
            { tag: 'Configuration Updated' },
            message.author,
            `Hệ thống welcome card đã được ${enabled ? 'kích hoạt' : 'tắt'}.`,
            [
                { 
                    name: 'Status', 
                    value: enabled ? '🟢 Enabled' : '🔴 Disabled', 
                    inline: true 
                },
                { 
                    name: 'Next Steps', 
                    value: enabled 
                        ? '• Thiết lập background: `!setwelcome bg <url>`\n• Test card: `!setwelcome test`'
                        : '• Bật lại: `!setwelcome card enable`', 
                    inline: false 
                }
            ]
        );
        
        await message.reply({ 
            embeds: [result.embed], 
            files: result.attachments 
        });
    },

    async handleBackgroundCommand(message, args, client) {
        const imageUrl = args[0];
        
        if (!imageUrl) {
            const result = productionStyle.createWarningEmbed(
                'Missing Image URL',
                'Vui lòng cung cấp URL của hình ảnh background.',
                [
                    { name: 'Example', value: '`!setwelcome bg https://example.com/image.jpg`' },
                    { name: 'Supported Formats', value: 'JPG, PNG, GIF, WEBP' },
                    { name: 'Recommended Size', value: '800x400px' }
                ]
            );
            return message.reply({ 
                embeds: [result.embed], 
                files: result.attachments 
            });
        }

        // Validate URL format
        try {
            new URL(imageUrl);
        } catch (error) {
            const result = productionStyle.createErrorEmbed(
                'Invalid URL',
                'Vui lòng cung cấp URL hình ảnh hợp lệ.',
                'Must be a valid HTTP/HTTPS URL'
            );
            return message.reply({ 
                embeds: [result.embed], 
                files: result.attachments 
            });
        }

        // Test if image can be loaded
        try {
            const testCard = await welcomeCard.createWelcomeCard(message.author, message.guild, {
                backgroundUrl: imageUrl,
                welcomeText: 'Test Background',
                subtitle: 'Kiểm tra background image'
            });
            
            if (!testCard) {
                const result = productionStyle.createErrorEmbed(
                    'Image Load Failed',
                    'URL hình ảnh không thể truy cập hoặc định dạng không hỗ trợ.',
                    'Check URL and image format'
                );
                return message.reply({ 
                    embeds: [result.embed], 
                    files: result.attachments 
                });
            }
            
            // Save to database
            await client.prisma.guildSettings.upsert({
                where: { guildId: message.guild.id },
                update: { 
                    welcomeBackgroundUrl: imageUrl,
                    welcomeCardEnabled: true // Auto-enable card when setting background
                },
                create: {
                    guildId: message.guild.id,
                    welcomeBackgroundUrl: imageUrl,
                    welcomeCardEnabled: true
                }
            });

            const result = productionStyle.createSuccessEmbed(
                'BACKGROUND CONFIGURED',
                { tag: 'Welcome Card Updated' },
                message.author,
                'Background image cho welcome card đã được cập nhật.',
                [
                    { name: 'Background URL', value: `[Link](${imageUrl})`, inline: false },
                    { name: 'Welcome Card', value: '🟢 Auto-enabled', inline: true },
                    { name: 'Test', value: 'Use `!setwelcome test` to preview', inline: true }
                ]
            );

            await message.reply({ 
                embeds: [result.embed], 
                files: [testCard, ...result.attachments] 
            });
            
        } catch (error) {
            console.error('Error testing background image:', error);
            const result = productionStyle.createErrorEmbed(
                'Background Test Failed',
                'Không thể tải hoặc xử lý hình ảnh background.',
                error.message
            );
            await message.reply({ 
                embeds: [result.embed], 
                files: result.attachments 
            });
        }
    },

    async handleColorsCommand(message, args, client) {
        if (args.length < 2) {
            const result = productionStyle.createWarningEmbed(
                'Missing Color Parameters',
                'Vui lòng cung cấp 2 màu: text color và accent color.',
                [
                    { name: 'Example', value: '`!setwelcome colors #ffffff #5865f2`' },
                    { name: 'Format', value: 'Hex color codes (e.g., #ffffff, #ff0000)' },
                    { name: 'Usage', value: 'First color: text, Second color: accent' }
                ]
            );
            return message.reply({ 
                embeds: [result.embed], 
                files: result.attachments 
            });
        }

        const textColor = args[0];
        const accentColor = args[1];

        // Validate hex color format
        const hexColorRegex = /^#([0-9A-F]{3}){1,2}$/i;
        
        if (!hexColorRegex.test(textColor) || !hexColorRegex.test(accentColor)) {
            const result = productionStyle.createErrorEmbed(
                'Invalid Color Format',
                'Vui lòng sử dụng định dạng hex color (e.g., #ffffff)',
                'Both colors must be valid hex codes'
            );
            return message.reply({ 
                embeds: [result.embed], 
                files: result.attachments 
            });
        }
            
        await client.prisma.guildSettings.upsert({
            where: { guildId: message.guild.id },
            update: { 
                welcomeTextColor: textColor,
                welcomeAccentColor: accentColor
            },
            create: { 
                guildId: message.guild.id,
                welcomeTextColor: textColor,
                welcomeAccentColor: accentColor
            }
        });

        const result = productionStyle.createSuccessEmbed(
            'COLORS UPDATED',
            { tag: 'Welcome Card Customized' },
            message.author,
            'Màu sắc cho welcome card đã được thiết lập.',
            [
                { name: 'Text Color', value: `\`${textColor}\``, inline: true },
                { name: 'Accent Color', value: `\`${accentColor}\``, inline: true },
                { name: 'Preview', value: 'Use `!setwelcome test` to see changes', inline: false }
            ]
        );

        await message.reply({ 
            embeds: [result.embed], 
            files: result.attachments 
        });
    },

    async handleDisable(message, client) {
        await client.prisma.guildSettings.upsert({
            where: { guildId: message.guild.id },
            update: { 
                welcomeChannel: null,
                welcomeMessage: null,
                welcomeCardEnabled: false,
                welcomeBackgroundUrl: null,
                welcomeTextColor: null,
                welcomeAccentColor: null
            },
            create: { guildId: message.guild.id }
        });
        
        const result = productionStyle.createSuccessEmbed(
            'WELCOME SYSTEM DISABLED',
            { tag: 'Configuration Updated' },
            message.author,
            'Toàn bộ hệ thống chào mừng đã được tắt.',
            [
                { name: 'Status', value: '🔴 All welcome features disabled', inline: true },
                { name: 'Reset', value: 'All settings cleared', inline: true },
                { name: 'Re-enable', value: 'Use `!setwelcome` or `!setup` to configure again', inline: false }
            ]
        );
        
        await message.reply({ 
            embeds: [result.embed], 
            files: result.attachments 
        });
    },

    async handleTest(message, client) {
        const guildSettings = await client.prisma.guildSettings.findUnique({
            where: { guildId: message.guild.id }
        });

        if (!guildSettings?.welcomeChannel) {
            const result = productionStyle.createWarningEmbed(
                'No Welcome Configuration',
                'Vui lòng thiết lập kênh welcome trước khi test.',
                [
                    { name: 'Setup Required', value: 'Channel must be configured first' },
                    { name: 'Basic Setup', value: '`!setwelcome #channel message`' },
                    { name: 'Advanced Setup', value: '`!setup` for full configuration' }
                ]
            );
            return message.reply({ 
                embeds: [result.embed], 
                files: result.attachments 
            });
        }
                
        const testChannel = message.guild.channels.cache.get(guildSettings.welcomeChannel);
        if (!testChannel) {
            const result = productionStyle.createErrorEmbed(
                'Welcome Channel Not Found',
                'Kênh welcome đã bị xóa.',
                'Channel was deleted or is inaccessible',
                [
                    { name: 'Fix', value: 'Reconfigure with `!setwelcome #channel message`' }
                ]
            );
            return message.reply({ 
                embeds: [result.embed], 
                files: result.attachments 
            });
        }
                
        try {
            if (guildSettings.welcomeCardEnabled) {
                // Create welcome card
                const card = await welcomeCard.createWelcomeCard(message.author, message.guild, {
                    backgroundUrl: guildSettings.welcomeBackgroundUrl,
                    welcomeText: welcomeCard.formatText(guildSettings.welcomeMessage || 'Welcome to {server}!', message.author, message.guild),
                    subtitle: `You are member #${message.guild.memberCount}`,
                    textColor: guildSettings.welcomeTextColor || '#ffffff',
                    accentColor: guildSettings.welcomeAccentColor || '#5865f2'
                });

                if (card) {
                    await testChannel.send({
                        content: `🧪 **Welcome Card Test** - ${message.author}`,
                        files: [card]
                    });
                } else {
                    throw new Error('Failed to create welcome card');
                }
            } else {
                // Send regular text message
                const testMessage = formatWelcomeMessage(guildSettings.welcomeMessage || 'Welcome {mention} to {server}!', message.author, message.guild);
                
                const testResult = productionStyle.createInfoEmbed(
                    'WELCOME TEST MESSAGE',
                    { tag: 'Test Message' },
                    message.author,
                    testMessage,
                    [
                        { name: 'Test User', value: message.author.tag, inline: true },
                        { name: 'Test Time', value: `<t:${Math.floor(Date.now() / 1000)}:F>`, inline: true }
                    ]
                );
                
                await testChannel.send({ 
                    embeds: [testResult.embed], 
                    files: testResult.attachments 
                });
            }
            
            const result = productionStyle.createSuccessEmbed(
                'WELCOME TEST SUCCESSFUL',
                { tag: 'Test Completed' },
                message.author,
                `Welcome ${guildSettings.welcomeCardEnabled ? 'card' : 'message'} đã được gửi thành công!`,
                [
                    { name: 'Test Channel', value: testChannel.toString(), inline: true },
                    { name: 'Type', value: guildSettings.welcomeCardEnabled ? 'Welcome Card' : 'Text Message', inline: true },
                    { name: 'Status', value: '✅ Test completed', inline: true }
                ]
            );
            await message.reply({ 
                embeds: [result.embed], 
                files: result.attachments 
            });
            
        } catch (error) {
            console.error('Test welcome error:', error);
            const result = productionStyle.createErrorEmbed(
                'Welcome Test Failed',
                `Không thể gửi test message đến ${testChannel}`,
                error.message
            );
            await message.reply({ 
                embeds: [result.embed], 
                files: result.attachments 
            });
        }
    },

    async showStatus(message, client) {
        const guildSettings = await client.prisma.guildSettings.findUnique({
            where: { guildId: message.guild.id }
        });

        const result = productionStyle.createInfoEmbed(
            'WELCOME SYSTEM STATUS',
            { tag: 'Current Configuration' },
            message.author,
            'Trạng thái hiện tại của hệ thống welcome',
            [
                {
                    name: 'Welcome Channel',
                    value: guildSettings?.welcomeChannel ? `<#${guildSettings.welcomeChannel}>` : 'Chưa cấu hình',
                    inline: true
                },
                {
                    name: 'Welcome Card',
                    value: guildSettings?.welcomeCardEnabled ? '✅ Enabled' : '❌ Disabled',
                    inline: true
                },
                {
                    name: 'Background',
                    value: guildSettings?.welcomeBackgroundUrl ? '[Custom set](' + guildSettings.welcomeBackgroundUrl + ')' : 'Default',
                    inline: true
                },
                {
                    name: 'Welcome Message',
                    value: guildSettings?.welcomeMessage ? `\`\`\`${guildSettings.welcomeMessage.length > 100 ? guildSettings.welcomeMessage.substring(0, 100) + '...' : guildSettings.welcomeMessage}\`\`\`` : 'Not configured',
                    inline: false
                },
                {
                    name: 'Colors',
                    value: `**Text:** \`${guildSettings?.welcomeTextColor || '#ffffff'}\`\n**Accent:** \`${guildSettings?.welcomeAccentColor || '#5865f2'}\``,
                    inline: false
                }
            ]
        );

        await message.reply({ 
            embeds: [result.embed], 
            files: result.attachments 
        });
    },

    async handleLegacySetup(message, args, client) {
        // Handle old format: !setwelcome #channel message
        if (!args[1]) {
            const result = productionStyle.createWarningEmbed(
                'Missing Information',
                'Vui lòng cung cấp cả kênh và tin nhắn welcome.',
                [
                    { name: 'Usage', value: '`!setwelcome #channel message`' },
                    { name: 'Example', value: '`!setwelcome #welcome Chào mừng {user} đến với {server}!`' },
                    { name: 'Variables', value: '`{user}`, `{mention}`, `{server}`, `{membercount}`' }
                ]
            );
            return message.reply({ 
                embeds: [result.embed], 
                files: result.attachments 
            });
        }
            
        // Parse channel
        let welcomeChannel = null;
        const channelMention = message.mentions.channels.first();
        
        if (channelMention) {
            welcomeChannel = channelMention;
        } else {
            const channelId = args[0].replace(/[<#>]/g, '');
            try {
                welcomeChannel = await message.guild.channels.fetch(channelId);
            } catch (error) {
                const result = productionStyle.createErrorEmbed(
                    'Channel Not Found',
                    'Không tìm thấy kênh được chỉ định!',
                    'Use #channel mention or valid channel ID'
                );
                return message.reply({ 
                    embeds: [result.embed], 
                    files: result.attachments 
                });
            }
        }
        
        if (!welcomeChannel) {
            const result = productionStyle.createErrorEmbed(
                'Invalid Channel',
                'Không tìm thấy kênh welcome!',
                'Please mention a valid channel'
            );
            return message.reply({ 
                embeds: [result.embed], 
                files: result.attachments 
            });
        }
            
        // Validate channel
        if (!welcomeChannel.isTextBased()) {
            const result = productionStyle.createErrorEmbed(
                'Invalid Channel Type',
                'Chỉ có thể sử dụng text channel làm kênh welcome.',
                'Select a text channel instead'
            );
            return message.reply({ 
                embeds: [result.embed], 
                files: result.attachments 
            });
        }
            
        // Check bot permissions
        const botPermissions = welcomeChannel.permissionsFor(message.guild.members.me);
        if (!botPermissions.has(['ViewChannel', 'SendMessages', 'EmbedLinks', 'AttachFiles'])) {
            const result = productionStyle.createErrorEmbed(
                'Bot Missing Channel Permissions',
                `Bot cần quyền **View Channel**, **Send Messages**, **Embed Links** và **Attach Files** trong ${welcomeChannel}`,
                'Grant the required permissions'
            );
            return message.reply({ 
                embeds: [result.embed], 
                files: result.attachments 
            });
        }
            
        // Get welcome message
        const welcomeMessage = args.slice(1).join(' ');
        
        if (welcomeMessage.length > 1000) {
            const result = productionStyle.createErrorEmbed(
                'Message Too Long',
                'Welcome message không được vượt quá 1000 ký tự.',
                `Current: ${welcomeMessage.length}/1000 characters`
            );
            return message.reply({ 
                embeds: [result.embed], 
                files: result.attachments 
            });
        }
            
        // Save to database
        await client.prisma.guildSettings.upsert({
            where: { guildId: message.guild.id },
            update: { 
                welcomeChannel: welcomeChannel.id,
                welcomeMessage: welcomeMessage
            },
            create: {
                guildId: message.guild.id,
                welcomeChannel: welcomeChannel.id,
                welcomeMessage: welcomeMessage
            }
        });
        
        const result = productionStyle.createSuccessEmbed(
            'WELCOME SYSTEM CONFIGURED',
            { tag: 'Configuration Updated' },
            message.author,
            'Welcome system đã được cấu hình thành công!',
            [
                { name: 'Welcome Channel', value: welcomeChannel.toString(), inline: true },
                { name: 'Message Length', value: `${welcomeMessage.length}/1000`, inline: true },
                { name: 'Status', value: '🟢 Active', inline: true },
                { name: 'Welcome Message', value: welcomeMessage.length > 200 ? welcomeMessage.substring(0, 200) + '...' : welcomeMessage },
                { name: 'Advanced Features', value: '• Enable welcome cards: `!setwelcome card enable`\n• Test configuration: `!setwelcome test`\n• Full setup wizard: `!setup`' }
            ]
        );
        
        await message.reply({ 
            embeds: [result.embed], 
            files: result.attachments 
        });
    }
};

// Helper function to format welcome message
function formatWelcomeMessage(template, user, guild) {
    return template
        .replace(/{user}/g, user.username)
        .replace(/{mention}/g, `<@${user.id}>`)
        .replace(/{server}/g, guild.name)
        .replace(/{membercount}/g, guild.memberCount.toLocaleString());
} 