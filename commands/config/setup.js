const { EmbedBuilder, PermissionsBitField } = require('discord.js');
const { setupRoleHierarchy } = require('../../utils/cultivationData');

module.exports = {
    name: 'setup',
    aliases: ['thiết_lập', 'cai_dat'],
    description: 'Thiết lập bot cho server (tạo role cultivation, setup hierarchy)',
    usage: '!setup [roles]',
    examples: [
        '!setup - Setup tất cả',
        '!setup roles - Chỉ setup roles cultivation'
    ],
    permissions: 'ADMINISTRATOR',
    guildOnly: true,
    category: 'config',

    async execute(message, args, client) {
        try {
            // Check permissions
            if (!message.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
                return message.reply('❌ Bạn cần quyền Administrator để sử dụng lệnh này!');
            }

            const action = args[0]?.toLowerCase();

            if (action === 'roles' || !action) {
                // Setup roles
                const setupEmbed = new EmbedBuilder()
                    .setTitle('🔧 Đang thiết lập Role Hierarchy...')
                    .setDescription('Bot đang tạo và sắp xếp các role cultivation...')
                    .setColor(0x00ff88)
                    .setTimestamp();

                const setupMessage = await message.reply({ embeds: [setupEmbed] });

                try {
                    const success = await setupRoleHierarchy(message.guild);
                    
                    if (success) {
                        const successEmbed = new EmbedBuilder()
                            .setTitle('✅ Thiết lập thành công!')
                            .setDescription('Đã tạo và sắp xếp tất cả role cultivation theo thứ tự hierarchy.')
                            .setColor(0x00ff00)
                            .addFields([
                                {
                                    name: '🎭 Roles đã tạo',
                                    value: 'Tất cả roles cultivation đã được tạo với màu sắc và thứ tự phù hợp',
                                    inline: false
                                },
                                {
                                    name: '📊 Hierarchy',
                                    value: 'Role cao hơn được đặt ở vị trí cao hơn trong danh sách',
                                    inline: false
                                },
                                {
                                    name: '💡 Lưu ý',
                                    value: 'Bot cần có role cao hơn các role cultivation để có thể gán role cho members',
                                    inline: false
                                }
                            ])
                            .setTimestamp()
                            .setFooter({ 
                                text: `Setup by ${message.author.username}`, 
                                iconURL: message.author.displayAvatarURL() 
                            });

                        await setupMessage.edit({ embeds: [successEmbed] });
                    } else {
                        throw new Error('Setup failed');
                    }
                } catch (error) {
                    console.error('Setup error:', error);
                    
                    const errorEmbed = new EmbedBuilder()
                        .setTitle('❌ Lỗi thiết lập!')
                        .setDescription('Không thể thiết lập role hierarchy.')
                        .setColor(0xff4444)
                        .addFields([
                            {
                                name: '🔍 Nguyên nhân có thể',
                                value: '• Bot không có quyền Manage Roles\n• Role của bot thấp hơn role cần tạo\n• Server đã đạt giới hạn số role',
                                inline: false
                            },
                            {
                                name: '🛠️ Cách khắc phục',
                                value: '• Kiểm tra quyền của bot\n• Di chuyển role bot lên cao hơn\n• Liên hệ admin server để hỗ trợ',
                                inline: false
                            }
                        ])
                        .setTimestamp();

                    await setupMessage.edit({ embeds: [errorEmbed] });
                }
            } else {
                // Show available options
                const helpEmbed = new EmbedBuilder()
                    .setTitle('🔧 Setup Bot')
                    .setDescription('Thiết lập bot cho server của bạn')
                    .setColor(0x0099ff)
                    .addFields([
                        {
                            name: '📋 Các tùy chọn',
                            value: '• `!setup` - Thiết lập tất cả\n• `!setup roles` - Chỉ thiết lập roles cultivation',
                            inline: false
                        },
                        {
                            name: '⚠️ Yêu cầu',
                            value: '• Quyền Administrator\n• Bot cần quyền Manage Roles\n• Role bot phải cao hơn roles cần tạo',
                            inline: false
                        }
                    ])
                    .setTimestamp()
                    .setFooter({ 
                        text: `Requested by ${message.author.username}`, 
                        iconURL: message.author.displayAvatarURL() 
                    });

                await message.reply({ embeds: [helpEmbed] });
            }

        } catch (error) {
            console.error('Error in setup command:', error);
            await message.reply(`❌ Lỗi setup: ${error.message}`);
        }
    }
};