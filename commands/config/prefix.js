const { hasFlexiblePermission } = require('../../utils/permissions');
const productionStyle = require('../../utils/demoStyle');

module.exports = {
    name: 'prefix',
    aliases: ['setprefix'],
    description: 'Thiết lập prefix cho bot trong server này',
    usage: '!prefix [new_prefix]',
    examples: [
        '!prefix ?',
        '!prefix !',
        '!prefix .',
        '!prefix reset'
    ],
    permissions: 'admin',
    guildOnly: true,
    category: 'config',
    
    async execute(message, args, client) {
        // Check permissions
        if (!await hasFlexiblePermission(message.member, 'prefix', this.permissions, message.guild.id)) {
            const result = productionStyle.createErrorEmbed(
                'Permission Denied',
                'Bạn cần quyền **Administrator** để thay đổi prefix.'
            );
            return message.reply({ 
                embeds: [result.embed], 
                files: result.attachments 
            });
        }
        
        // Show current prefix and setup recommendation if no args
        if (!args.length) {
            // Get current settings
            const guildSettings = await client.prisma.guildSettings.findUnique({
                where: { guildId: message.guild.id }
            });
            
            const currentPrefix = guildSettings?.prefix || '!';
            
            const result = productionStyle.createSuccessEmbed(
                'PREFIX CONFIG',
                { tag: 'Bot Configuration' },
                message.author,
                'Quản lý prefix của bot trong server này',
                [
                    {
                        name: 'Current Prefix',
                        value: `\`${currentPrefix}\``,
                        inline: true
                    },
                    {
                        name: 'Usage',
                        value: `\`${currentPrefix}prefix [new_prefix]\`\n\`${currentPrefix}prefix reset\``,
                        inline: true
                    },
                    {
                        name: 'Examples',
                        value: `\`${currentPrefix}prefix ?\` → Change prefix to \`?\`\n\`${currentPrefix}prefix .\` → Change prefix to \`.\`\n\`${currentPrefix}prefix reset\` → Reset to \`!\``,
                        inline: false
                    },
                    {
                        name: 'Setup Wizard',
                        value: `Use \`${currentPrefix}setup\` to configure entire bot with visual interface!`,
                        inline: false
                    },
                    {
                        name: 'Important Notes',
                        value: '• Prefix cannot contain spaces\n• Maximum 5 characters\n• Cannot conflict with other bot prefixes',
                        inline: false
                    }
                ]
            );
            return message.reply({ 
                embeds: [result.embed], 
                files: result.attachments 
            });
        }

        try {
            const newPrefix = args[0];
            
            // Reset prefix to default
            if (newPrefix.toLowerCase() === 'reset') {
                await client.prisma.guildSettings.upsert({
                    where: { guildId: message.guild.id },
                    update: { prefix: '!' },
                    create: { guildId: message.guild.id, prefix: '!' }
                });

                const result = productionStyle.createSuccessEmbed(
                    'PREFIX RESET',
                    { tag: 'Configuration' },
                    message.author,
                    'Prefix đã được reset về mặc định thành công!',
                    [
                        { name: 'New Prefix', value: '`!`', inline: true },
                        { name: 'Examples', value: '`!help`, `!ping`, `!setup`', inline: true },
                        { name: 'Next Steps', value: 'Use `!setup` to configure other features', inline: false }
                    ]
                );
                return message.reply({ 
                    embeds: [result.embed], 
                    files: result.attachments 
                });
            }

            // Validate prefix
            if (newPrefix.length > 5) {
                const result = productionStyle.createErrorEmbed(
                    'Prefix Too Long',
                    'Prefix không được vượt quá 5 ký tự.',
                    `You entered: "${newPrefix}" (${newPrefix.length} characters)`
                );
                return message.reply({ 
                    embeds: [result.embed], 
                    files: result.attachments 
                });
            }
            
            if (newPrefix.includes(' ')) {
                const result = productionStyle.createErrorEmbed(
                    'Invalid Prefix',
                    'Prefix không được chứa khoảng trắng.',
                    'Valid examples: `?`, `!`, `.`, `>>`, `$`'
                );
                return message.reply({ 
                    embeds: [result.embed], 
                    files: result.attachments 
                });
            }
            
            // Common prefix conflicts
            const commonPrefixes = ['@everyone', '@here', '<@', '<#', 'http', 'https'];
            if (commonPrefixes.some(p => newPrefix.toLowerCase().includes(p))) {
                const result = productionStyle.createErrorEmbed(
                    'Prefix Conflict',
                    'Prefix này có thể gây xung đột với Discord hoặc các bot khác.',
                    'Please choose a different prefix.'
                );
                return message.reply({ 
                    embeds: [result.embed], 
                    files: result.attachments 
                });
            }
            
            // Update prefix
            await client.prisma.guildSettings.upsert({
                where: { guildId: message.guild.id },
                update: { prefix: newPrefix },
                create: { guildId: message.guild.id, prefix: newPrefix }
            });
            
            // Send success message
            const result = productionStyle.createSuccessEmbed(
                'PREFIX UPDATED',
                { tag: 'Configuration' },
                message.author,
                'Prefix bot đã được thay đổi thành công!',
                [
                    { name: 'New Prefix', value: `\`${newPrefix}\``, inline: true },
                    { name: 'Length', value: `${newPrefix.length}/5 characters`, inline: true },
                    { name: 'Usage Examples', value: `\`${newPrefix}help\`, \`${newPrefix}ping\`, \`${newPrefix}setup\``, inline: false },
                    { name: 'Next Steps', value: `• Test with \`${newPrefix}ping\` to verify\n• Use \`${newPrefix}setup\` to configure more features`, inline: false },
                    { name: 'Reset Option', value: `You can use \`${newPrefix}prefix reset\` to return to \`!\` anytime`, inline: false }
                ]
            );

            await message.reply({ 
                embeds: [result.embed], 
                files: result.attachments 
            });
            
        } catch (error) {
            console.error('Lỗi khi thiết lập prefix:', error);
            
            const result = productionStyle.createErrorEmbed(
                'System Error',
                'Đã xảy ra lỗi khi thiết lập prefix.',
                error.message
            );
            
            await message.reply({ 
                embeds: [result.embed], 
                files: result.attachments 
            });
        }
    }
}; 