const { PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const { hasFlexiblePermission } = require('../../utils/permissions');
const productionStyle = require('../../utils/demoStyle');

module.exports = {
    name: 'embed',
    aliases: ['embedmsg', 'announcement-embed'],
    description: 'Tạo và gửi embed message đẹp mắt',
    usage: '!embed [#channel] [title] | [description] | [color] | [footer] | [image_url]',
    examples: [
        '!embed #general Thông báo | Server sẽ update vào 10h | #ff0000',
        '!embed this Welcome | Chào mừng bạn đến server! | blue | Enjoy your stay',
        '!embed #announcements Event | Sự kiện đặc biệt | green | Tham gia ngay! | https://image.url'
    ],
    permissions: 'admin',
    guildOnly: true,
    category: 'announcement',
    
    async execute(message, args, client) {
        // Check permissions
        if (!await hasFlexiblePermission(message.member, 'embed', this.permissions, message.guild.id)) {
            const result = productionStyle.createErrorEmbed(
                'Permission Denied',
                'Bạn cần quyền **Administrator** để gửi embed!'
            );
            return message.reply({ 
                embeds: [result.embed], 
                files: result.attachments 
            });
        }
        
        // Check bot permissions
        if (!message.guild.members.me.permissions.has(PermissionFlagsBits.EmbedLinks)) {
            const result = productionStyle.createErrorEmbed(
                'Bot Missing Permissions',
                'Bot cần quyền **Embed Links** để thực hiện lệnh này!'
            );
            return message.reply({ 
                embeds: [result.embed], 
                files: result.attachments 
            });
        }
        
        // Check arguments
        if (!args[0]) {
            const result = productionStyle.createInfoEmbed(
                'EMBED COMMAND GUIDE',
                { tag: 'Help & Usage' },
                message.author,
                'Tạo và gửi embed message đẹp mắt',
                [
                    { name: 'Syntax', value: '`!embed [#channel] [title] | [description] | [color] | [footer] | [image_url]`' },
                    { name: 'Examples', value: '• `!embed #general Thông báo | Server update | red | Admin Team`\n• `!embed this Welcome | Chào mừng! | blue | Enjoy`' },
                    { name: 'Colors', value: '`red`, `blue`, `green`, `yellow`, `purple`, `orange`, `pink`, `#hex`' },
                    { name: 'Tip', value: 'Dùng `this` để gửi vào kênh hiện tại' }
                ]
            );
            return message.reply({ 
                embeds: [result.embed], 
                files: result.attachments 
            });
        }
        
        try {
            // Parse target channel
            let targetChannel = message.channel;
            let argStart = 0;
            
            if (args[0].toLowerCase() !== 'this') {
                const channelMention = message.mentions.channels.first();
                const channelId = args[0].replace(/[<#>]/g, '');
                
                if (channelMention) {
                    targetChannel = channelMention;
                    argStart = 1;
                } else if (/^\d+$/.test(channelId)) {
                    const foundChannel = message.guild.channels.cache.get(channelId);
                    if (foundChannel) {
                        targetChannel = foundChannel;
                        argStart = 1;
                    }
                } else if (args[0].startsWith('#')) {
                    const result = productionStyle.createErrorEmbed(
                        'Channel Not Found',
                        'Không tìm thấy kênh được mention!',
                        'Please check the channel exists and you have access'
                    );
                    return message.reply({ 
                        embeds: [result.embed], 
                        files: result.attachments 
                    });
                }
            } else {
                argStart = 1;
            }
            
            // Parse embed content from remaining args
            const content = args.slice(argStart).join(' ');
            const parts = content.split('|').map(part => part.trim());
            
            const title = parts[0] || null;
            const description = parts[1] || null;
            const colorInput = parts[2] || null;
            const footer = parts[3] || null;
            const imageUrl = parts[4] || null;
            
            // Validate content
            if (!title && !description) {
                const result = productionStyle.createWarningEmbed(
                    'Missing Content',
                    'Embed cần ít nhất title hoặc description!',
                    [
                        { name: 'Required', value: 'Title OR Description', inline: true },
                        { name: 'Format', value: 'title | description', inline: true },
                        { name: 'Example', value: '`!embed Hello | World`', inline: false }
                    ]
                );
                return message.reply({ 
                    embeds: [result.embed], 
                    files: result.attachments 
                });
            }
            
            // Validate content length
            if (title && title.length > 256) {
                const result = productionStyle.createErrorEmbed(
                    'Title Too Long',
                    'Tối đa 256 ký tự cho tiêu đề!',
                    `Current: ${title.length}/256 characters`
                );
                return message.reply({ 
                    embeds: [result.embed], 
                    files: result.attachments 
                });
            }
            
            if (description && description.length > 4096) {
                const result = productionStyle.createErrorEmbed(
                    'Description Too Long',
                    'Tối đa 4096 ký tự cho mô tả!',
                    `Current: ${description.length}/4096 characters`
                );
                return message.reply({ 
                    embeds: [result.embed], 
                    files: result.attachments 
                });
            }
            
            if (footer && footer.length > 2048) {
                const result = productionStyle.createErrorEmbed(
                    'Footer Too Long',
                    'Tối đa 2048 ký tự cho footer!',
                    `Current: ${footer.length}/2048 characters`
                );
                return message.reply({ 
                    embeds: [result.embed], 
                    files: result.attachments 
                });
            }
            
            // Parse color
            let embedColor = 0x5865F2; // Discord blurple default
            
            const colorMap = {
                'red': 0xFF0000,
                'green': 0x00FF00,
                'blue': 0x0000FF,
                'yellow': 0xFFFF00,
                'purple': 0x800080,
                'orange': 0xFFA500,
                'pink': 0xFFC0CB,
                'black': 0x000000,
                'white': 0xFFFFFF,
                'grey': 0x808080,
                'gray': 0x808080,
                'blurple': 0x5865F2,
                'dark': 0x2F3136
            };
            
            if (colorInput) {
                if (colorMap[colorInput.toLowerCase()]) {
                    embedColor = colorMap[colorInput.toLowerCase()];
                } else if (colorInput.startsWith('#')) {
                    try {
                        embedColor = parseInt(colorInput.slice(1), 16);
                    } catch (error) {
                        const result = productionStyle.createErrorEmbed(
                            'Invalid Color',
                            'Màu hex không hợp lệ!',
                            'Use format #ff0000 or color names'
                        );
                        return message.reply({ 
                            embeds: [result.embed], 
                            files: result.attachments 
                        });
                    }
                } else if (/^[0-9a-fA-F]{6}$/.test(colorInput)) {
                    embedColor = parseInt(colorInput, 16);
                } else {
                    const result = productionStyle.createErrorEmbed(
                        'Invalid Color',
                        'Vui lòng sử dụng tên màu hoặc mã hex (#ff0000)!',
                        'Available: red, blue, green, yellow, purple, orange, pink'
                    );
                    return message.reply({ 
                        embeds: [result.embed], 
                        files: result.attachments 
                    });
                }
            }
            
            // Check bot permissions in target channel
            if (!targetChannel.isTextBased()) {
                const result = productionStyle.createErrorEmbed(
                    'Invalid Channel Type',
                    'Chỉ có thể gửi embed vào text channel!'
                );
                return message.reply({ 
                    embeds: [result.embed], 
                    files: result.attachments 
                });
            }
            
            if (!targetChannel.permissionsFor(message.guild.members.me).has([PermissionFlagsBits.SendMessages, PermissionFlagsBits.EmbedLinks])) {
                const result = productionStyle.createErrorEmbed(
                    'Bot Missing Channel Permissions',
                    `Bot không có quyền gửi embed trong ${targetChannel}!`,
                    'Required: Send Messages & Embed Links'
                );
                return message.reply({ 
                    embeds: [result.embed], 
                    files: result.attachments 
                });
            }
            
            // Create the custom embed
            const customEmbed = new EmbedBuilder()
                .setColor(embedColor)
                .setTimestamp();
            
            if (title) customEmbed.setTitle(title);
            if (description) customEmbed.setDescription(description);
            if (footer) customEmbed.setFooter({ text: footer, iconURL: message.author.displayAvatarURL() });
            if (imageUrl) {
                try {
                    customEmbed.setImage(imageUrl);
                } catch (error) {
                    const result = productionStyle.createWarningEmbed(
                        'Invalid Image URL',
                        'Embed sẽ được gửi nhưng không có hình ảnh.',
                        [{ name: 'Note', value: 'URL hình ảnh không hợp lệ' }]
                    );
                    await message.reply({ 
                        embeds: [result.embed], 
                        files: result.attachments 
                    });
                }
            }
            
            // Send the embed
            await targetChannel.send({ embeds: [customEmbed] });
            
            // Confirm success
            const result = productionStyle.createSuccessEmbed(
                'EMBED SENT SUCCESSFULLY',
                { tag: 'Message Delivered' },
                message.author,
                title || description || 'Custom embed message',
                [
                    { name: 'Target Channel', value: targetChannel.toString(), inline: true },
                    { name: 'Title', value: title || 'None', inline: true },
                    { name: 'Color', value: colorInput || 'blurple', inline: true },
                    { name: 'Characters', value: `${(title?.length || 0) + (description?.length || 0)}`, inline: true },
                    { name: 'Has Image', value: imageUrl ? 'Yes' : 'No', inline: true },
                    { name: 'Status', value: 'Successfully sent', inline: true }
                ]
            );
            
            await message.reply({ 
                embeds: [result.embed], 
                files: result.attachments 
            });
            
            // Log to moderation channel
            try {
                const guildSettings = await client.prisma.guildSettings.findUnique({
                    where: { guildId: message.guild.id }
                });
                
                if (guildSettings?.logChannel && guildSettings.logChannel !== targetChannel.id) {
                    const logChannel = message.guild.channels.cache.get(guildSettings.logChannel);
                    
                    if (logChannel) {
                        const logResult = productionStyle.createInfoEmbed(
                            'EMBED LOG',
                            { tag: 'Moderation Log' },
                            message.author,
                            (title || description || 'Custom embed').substring(0, 200),
                            [
                                { name: 'Target Channel', value: targetChannel.toString(), inline: true },
                                { name: 'Title', value: title || 'None', inline: true },
                                { name: 'Color', value: colorInput || 'blurple', inline: true },
                                { name: 'Has Image', value: imageUrl ? 'Yes' : 'No', inline: true },
                                { name: 'Time', value: `<t:${Math.floor(Date.now() / 1000)}:F>`, inline: true }
                            ]
                        );
                        
                        await logChannel.send({ 
                            embeds: [logResult.embed], 
                            files: logResult.attachments 
                        });
                    }
                }
            } catch (logError) {
                console.error('Lỗi khi gửi log:', logError);
            }
            
        } catch (error) {
            console.error('Lỗi khi gửi embed:', error);
            
            let errorMessage = 'Embed Send Failed';
            let errorDetail = 'Không thể gửi embed!';
            
            if (error.code === 50013) {
                errorDetail = 'Bot không có quyền gửi embed trong kênh đó!';
            } else if (error.code === 50001) {
                errorDetail = 'Bot không có quyền truy cập kênh đó!';
            } else if (error.code === 10003) {
                errorDetail = 'Kênh không tồn tại!';
            }
            
            const result = productionStyle.createErrorEmbed(
                errorMessage,
                errorDetail,
                error.message
            );
            
            await message.reply({ 
                embeds: [result.embed], 
                files: result.attachments 
            });
        }
    }
}; 