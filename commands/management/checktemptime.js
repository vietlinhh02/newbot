const { EmbedBuilder } = require('discord.js');
const ms = require('ms');

module.exports = {
    name: 'checktemptime',
    aliases: ['ctt', 'timecheck'],
    description: 'Debug command để kiểm tra thời gian temp roles',
    usage: '!checktemptime [@user]',
    permissions: ['ADMINISTRATOR'],
    adminOnly: true,
    async execute(message, args, client) {
        try {
            // Check if user has permission
            if (!message.member.permissions.has('ADMINISTRATOR')) {
                return message.reply('❌ Bạn không có quyền sử dụng lệnh này.');
            }

            let targetUser = message.author;
            
            // Parse user if provided
            if (args[0]) {
                const userArg = args[0];
                if (userArg.startsWith('<@') && userArg.endsWith('>')) {
                    const userId = userArg.replace(/[<@!>]/g, '');
                    try {
                        targetUser = await message.guild.members.fetch(userId);
                        targetUser = targetUser.user;
                    } catch {
                        return message.reply('❌ Không tìm thấy user!');
                    }
                }
            }

            const now = new Date();
            console.log(`🕐 Current time: ${now.toISOString()}`);

            // Get all temp roles for this user
            const userTempRoles = await client.prisma.tempRole.findMany({
                where: {
                    userId: targetUser.id,
                    guildId: message.guild.id,
                    active: true
                },
                orderBy: {
                    expiresAt: 'asc'
                }
            });

            if (userTempRoles.length === 0) {
                return message.reply(`ℹ️ ${targetUser.username} không có temp roles nào đang active.`);
            }

            const embed = new EmbedBuilder()
                .setTitle('🕐 Temp Roles Time Check')
                .setDescription(`Checking temp roles for **${targetUser.username}**`)
                .setColor(0x3498db)
                .setTimestamp();

            let description = `**Current Time:** <t:${Math.floor(now.getTime() / 1000)}:F>\n\n`;

            for (const tempRole of userTempRoles) {
                const role = message.guild.roles.cache.get(tempRole.roleId);
                const roleName = role ? role.name : `Unknown (${tempRole.roleId})`;
                
                const expiresAt = new Date(tempRole.expiresAt);
                const timeUntilExpiry = expiresAt.getTime() - now.getTime();
                const timeFromCreation = now.getTime() - tempRole.createdAt.getTime();
                
                let status;
                let statusIcon;
                
                if (timeUntilExpiry > 0) {
                    status = `⏳ **Còn:** ${ms(timeUntilExpiry, { long: true })}`;
                    statusIcon = '🟢';
                } else {
                    const overdue = Math.abs(timeUntilExpiry);
                    status = `⏰ **Hết hạn từ:** ${ms(overdue, { long: true })} trước`;
                    statusIcon = '🔴';
                }

                description += `${statusIcon} **${roleName}**\n`;
                description += `├ **ID:** \`${tempRole.id.slice(0, 8)}\`\n`;
                description += `├ **Tạo lúc:** <t:${Math.floor(tempRole.createdAt.getTime() / 1000)}:R>\n`;
                description += `├ **Hết hạn:** <t:${Math.floor(expiresAt.getTime() / 1000)}:F>\n`;
                description += `├ **Time until expiry:** ${timeUntilExpiry}ms\n`;
                description += `└ ${status}\n\n`;

                console.log(`🔍 Role ${roleName}:`, {
                    id: tempRole.id,
                    createdAt: tempRole.createdAt.toISOString(),
                    expiresAt: expiresAt.toISOString(),
                    timeUntilExpiry: timeUntilExpiry,
                    isExpired: timeUntilExpiry <= 0
                });
            }

            embed.setDescription(description);

            // Add summary field
            const activeCount = userTempRoles.filter(r => new Date(r.expiresAt).getTime() > now.getTime()).length;
            const expiredCount = userTempRoles.length - activeCount;

            embed.addFields({
                name: '📊 Tổng kết',
                value: `• **Active:** ${activeCount}\n• **Expired:** ${expiredCount}\n• **Total:** ${userTempRoles.length}`,
                inline: false
            });

            await message.reply({ embeds: [embed] });

        } catch (error) {
            console.error('Error in checktemptime command:', error);
            await message.reply('❌ Có lỗi xảy ra khi kiểm tra temp roles.');
        }
    }
}; 