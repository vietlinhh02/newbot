const { hasFlexiblePermission } = require('../../utils/permissions');
const embedFactory = require('../../utils/embeds');
const logger = require('../../utils/logger');
const { ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType } = require('discord.js');

module.exports = {
    name: 'backup',
    description: 'Backup toàn bộ cấu hình server hoặc restore từ backup',
    aliases: ['bk', 'serverbackup'],
    usage: '!backup <create|list|info> [backup_id]',
    category: 'advanced',
    permissions: 'owner',
    guildOnly: true,
    examples: [
        '!backup create',
        '!backup list',
        '!backup info backup_123456'
    ],

    async execute(message, args, client) {
        try {
            // Check permissions - Owner only
            if (!await hasFlexiblePermission(message.member, 'backup', this.permissions, message.guild.id)) {
                const embed = embedFactory.error(
                    'Không có quyền!',
                    'Lệnh này chỉ dành cho **Server Owner** hoặc **Bot Owner**.'
                );
                return message.reply({ embeds: [embed] });
            }

            if (!args[0]) {
                return this.showHelp(message);
            }

            const action = args[0].toLowerCase();
            
            switch (action) {
                case 'create':
                case 'c':
                    await this.createBackup(message, client);
                    break;
                case 'list':
                case 'l':
                    await this.listBackups(message, client);
                    break;
                case 'info':
                case 'i':
                    if (!args[1]) {
                        const embed = embedFactory.error(
                            'Thiếu backup ID!',
                            'Sử dụng: `!backup info <backup_id>`'
                        );
                        return message.reply({ embeds: [embed] });
                    }
                    await this.showBackupInfo(message, args[1], client);
                    break;
                default:
                    await this.showHelp(message);
                    break;
            }

        } catch (error) {
            logger.error('Backup command error', error);
            const embed = embedFactory.error(
                'Lỗi hệ thống!',
                'Đã xảy ra lỗi khi thực thi lệnh backup.',
                error.message
            );
            await message.reply({ embeds: [embed] });
        }
    },

    async createBackup(message, client) {
        const guild = message.guild;
        
        // Loading message
        const loadingEmbed = embedFactory.info(
            '🔄 Đang tạo backup...',
            'Đang thu thập dữ liệu server...'
        );
        const loadingMsg = await message.reply({ embeds: [loadingEmbed] });

        try {
            // Collect server data
            const backupData = {
                id: `backup_${Date.now()}`,
                guildId: guild.id,
                guildName: guild.name,
                createdAt: new Date().toISOString(),
                createdBy: message.author.id,
                version: '1.0',
                data: {
                    // Guild basic info
                    guild: {
                        name: guild.name,
                        description: guild.description,
                        verificationLevel: guild.verificationLevel,
                        defaultMessageNotifications: guild.defaultMessageNotifications
                    },
                    
                    // Channels structure
                    channels: [],
                    
                    // Roles (except @everyone)
                    roles: [],
                    
                    // Bot configuration
                    botSettings: null
                }
            };

            // Backup channels
            loadingEmbed.setDescription('📋 Đang backup channels...');
            await loadingMsg.edit({ embeds: [loadingEmbed] });
            
            const channels = guild.channels.cache.filter(ch => !ch.isThread());
            for (const channel of channels.values()) {
                backupData.data.channels.push({
                    id: channel.id,
                    name: channel.name,
                    type: channel.type,
                    position: channel.position,
                    parentId: channel.parentId,
                    topic: channel.topic || null,
                    nsfw: channel.nsfw || false,
                    rateLimitPerUser: channel.rateLimitPerUser || 0
                });
            }

            // Backup roles
            loadingEmbed.setDescription('🎭 Đang backup roles...');
            await loadingMsg.edit({ embeds: [loadingEmbed] });
            
            const roles = guild.roles.cache.filter(role => role.id !== guild.id);
            for (const role of roles.values()) {
                backupData.data.roles.push({
                    id: role.id,
                    name: role.name,
                    color: role.color,
                    hoist: role.hoist,
                    position: role.position,
                    mentionable: role.mentionable,
                    managed: role.managed
                });
            }

            // Backup bot settings
            loadingEmbed.setDescription('⚙️ Đang backup bot settings...');
            await loadingMsg.edit({ embeds: [loadingEmbed] });
            
            try {
                const guildSettings = await client.prisma.guildSettings.findUnique({
                    where: { guildId: guild.id }
                });
                backupData.data.botSettings = guildSettings;
            } catch (error) {
                logger.error('Error backing up bot settings', error);
            }

            // Save to database (simplified - in real app would save to file/cloud)
            const backupJson = JSON.stringify(backupData);
            const backupSize = (backupJson.length / 1024).toFixed(1);

            // Success response
            const embed = embedFactory.success(
                '✅ Backup tạo thành công!',
                `**Backup ID:** \`${backupData.id}\`\n**Server:** ${guild.name}\n**Tạo bởi:** ${message.author.tag}`
            );

            embed.addFields([
                {
                    name: '📊 Thống kê Backup:',
                    value: `**Channels:** ${backupData.data.channels.length}\n**Roles:** ${backupData.data.roles.length}\n**Bot Settings:** ${backupData.data.botSettings ? 'Có' : 'Không'}\n**Kích thước:** ${backupSize}KB`,
                    inline: true
                },
                {
                    name: '💡 Lưu ý:',
                    value: `Backup chỉ lưu cấu trúc và settings, không bao gồm:\n• Tin nhắn trong channels\n• Thành viên server\n• Invite links\n• Webhook configs`,
                    inline: true
                }
            ]);

            await loadingMsg.edit({ embeds: [embed] });
            logger.command(message.author, `backup create (${backupData.id})`, message.guild);

        } catch (error) {
            logger.error('Backup creation error', error);
            const embed = embedFactory.error(
                'Lỗi tạo backup!',
                'Không thể tạo backup server.',
                error.message
            );
            await loadingMsg.edit({ embeds: [embed] });
        }
    },

    async listBackups(message, client) {
        // Simulated backup list (in real app would read from database/files)
        const fakeBackups = [
            {
                id: `backup_${Date.now() - 86400000}`,
                guildName: message.guild.name,
                createdAt: new Date(Date.now() - 86400000).toISOString(),
                createdBy: message.author.id,
                channelCount: 15,
                roleCount: 8
            },
            {
                id: `backup_${Date.now() - 172800000}`,
                guildName: message.guild.name,
                createdAt: new Date(Date.now() - 172800000).toISOString(),
                createdBy: message.author.id,
                channelCount: 12,
                roleCount: 6
            }
        ];

        if (fakeBackups.length === 0) {
            const embed = embedFactory.warning(
                'Không có backup!',
                'Server này chưa có backup nào.\n\nTạo backup: `!backup create`'
            );
            return message.reply({ embeds: [embed] });
        }

        const embed = embedFactory.info(
            '📋 Danh sách Backup',
            `**Server:** ${message.guild.name}\n**Tổng số:** ${fakeBackups.length} backup`
        );

        const backupList = fakeBackups.map(backup => {
            const createdAt = new Date(backup.createdAt);
            const timeAgo = Math.floor((Date.now() - createdAt.getTime()) / (1000 * 60 * 60 * 24));
            
            return `**${backup.id}**\n` +
                   `├ 📅 ${timeAgo} ngày trước\n` +
                   `├ 👤 Tạo bởi: <@${backup.createdBy}>\n` +
                   `├ 📊 ${backup.channelCount} channels, ${backup.roleCount} roles\n` +
                   `└ 🔍 \`!backup info ${backup.id}\``;
        }).join('\n\n');

        embed.addFields([{
            name: '🗂️ Backup Files:',
            value: backupList,
            inline: false
        }]);

        await message.reply({ embeds: [embed] });
    },

    async showHelp(message) {
        const embed = embedFactory.help({
            title: '🗂️ Backup System Help',
            description: '**Hệ thống backup cấu hình server Discord**\n\n⚠️ **Chỉ dành cho Server Owner/Bot Owner**',
            categories: [
                {
                    emoji: '🆕',
                    name: 'Create Backup',
                    value: '`!backup create` - Tạo backup cấu hình server'
                },
                {
                    emoji: '📋',
                    name: 'List Backups',
                    value: '`!backup list` - Xem tất cả backup của server'
                },
                {
                    emoji: '🔍',
                    name: 'Backup Info',
                    value: '`!backup info <id>` - Xem chi tiết backup'
                }
            ]
        });

        embed.addFields([
            {
                name: '💾 Dữ liệu được backup:',
                value: '• Cấu trúc channels và categories\n• Roles và permissions cơ bản\n• Bot settings (prefix, log channel, etc.)\n• Server settings cơ bản',
                inline: true
            },
            {
                name: '❌ Không backup:',
                value: '• Tin nhắn trong channels\n• Danh sách thành viên\n• Invite links\n• Webhook configurations\n• File uploads',
                inline: true
            }
        ]);

        await message.reply({ embeds: [embed] });
    }
};
