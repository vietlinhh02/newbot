const { EmbedBuilder } = require('discord.js');

module.exports = {
    name: 'temprolestatus',
    aliases: ['trs', 'trm-status'],
    description: 'Xem trạng thái TempRoleManager và force check',
    usage: '!temprolestatus [force]',
    permissions: ['ADMINISTRATOR'],
    adminOnly: true,
    async execute(message, args, client) {
        try {
            // Check if user has permission
            if (!message.member.permissions.has('ADMINISTRATOR')) {
                return message.reply('❌ Bạn không có quyền sử dụng lệnh này.');
            }

            const forceCheck = args[0] === 'force';
            let status;

            if (forceCheck) {
                if (!client.tempRoleManager) {
                    return message.reply('❌ TempRoleManager không tồn tại trên client!');
                }
                
                const embed = new EmbedBuilder()
                    .setTitle('🔄 Đang force check...')
                    .setDescription('Đang kiểm tra expired roles...')
                    .setColor(0xffa500)
                    .setTimestamp();
                
                const msg = await message.reply({ embeds: [embed] });
                
                status = await client.tempRoleManager.forceCheck();
                
                // Update embed with results
                embed.setTitle('✅ Force check hoàn thành')
                    .setDescription('Đã kiểm tra expired roles thành công')
                    .setColor(0x2ecc71);
                
                await msg.edit({ embeds: [embed] });
            } else {
                if (!client.tempRoleManager) {
                    return message.reply('❌ TempRoleManager không tồn tại trên client!');
                }
                
                status = client.tempRoleManager.getStatus();
            }

            // Format uptime
            const formatDuration = (ms) => {
                const seconds = Math.floor(ms / 1000);
                const minutes = Math.floor(seconds / 60);
                const hours = Math.floor(minutes / 60);
                const days = Math.floor(hours / 24);

                if (days > 0) return `${days}d ${hours % 24}h ${minutes % 60}m`;
                if (hours > 0) return `${hours}h ${minutes % 60}m`;
                if (minutes > 0) return `${minutes}m ${seconds % 60}s`;
                return `${seconds}s`;
            };

            // Get active temp roles count
            const activeTempRoles = await client.prisma.tempRole.count({
                where: { 
                    active: true,
                    guildId: message.guild.id 
                }
            });

            const totalActiveTempRoles = await client.prisma.tempRole.count({
                where: { active: true }
            });

            const embed = new EmbedBuilder()
                .setTitle('🏷️ TempRoleManager Status')
                .addFields(
                    {
                        name: '🟢 Trạng thái',
                        value: status.isRunning ? '✅ Đang chạy' : '❌ Không chạy',
                        inline: true
                    },
                    {
                        name: '⏰ Interval',
                        value: `${status.checkInterval / 1000 / 60} phút`,
                        inline: true
                    },
                    {
                        name: '🔄 Checks đã thực hiện',
                        value: `${status.checksPerformed}`,
                        inline: true
                    },
                    {
                        name: '🚀 Khởi động lúc',
                        value: status.startTime ? `<t:${Math.floor(status.startTime.getTime() / 1000)}:F>` : 'Chưa khởi động',
                        inline: false
                    },
                    {
                        name: '🕐 Check cuối',
                        value: status.lastCheckTime ? `<t:${Math.floor(status.lastCheckTime.getTime() / 1000)}:R>` : 'Chưa check',
                        inline: true
                    },
                    {
                        name: '⏭️ Check tiếp theo',
                        value: status.nextCheck ? `<t:${Math.floor(status.nextCheck.getTime() / 1000)}:R>` : 'Không xác định',
                        inline: true
                    },
                    {
                        name: '⏳ Uptime',
                        value: status.uptime > 0 ? formatDuration(status.uptime) : 'N/A',
                        inline: true
                    },
                    {
                        name: '📊 Temp Roles (Server này)',
                        value: `${activeTempRoles}`,
                        inline: true
                    },
                    {
                        name: '📊 Temp Roles (Tổng)',
                        value: `${totalActiveTempRoles}`,
                        inline: true
                    },
                    {
                        name: '🆔 Interval ID',
                        value: status.intervalId ? `${status.intervalId}` : 'Không có',
                        inline: true
                    }
                )
                .setColor(status.isRunning ? 0x2ecc71 : 0xe74c3c)
                .setTimestamp()
                .setFooter({ 
                    text: 'Sử dụng !temprolestatus force để force check ngay' 
                });

            await message.reply({ embeds: [embed] });

        } catch (error) {
            console.error('Error in temprolestatus command:', error);
            await message.reply('❌ Có lỗi xảy ra khi kiểm tra status TempRoleManager.');
        }
    }
}; 