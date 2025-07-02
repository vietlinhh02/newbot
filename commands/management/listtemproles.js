const { EmbedBuilder } = require('discord.js');
const ms = require('ms');

module.exports = {
    name: 'listtemproles',
    aliases: ['temprolelist', 'ltr', 'temproles'],
    description: 'Xem danh sách và quản lý temp roles',
    usage: '!listtemproles [user] hoặc !ltr remove <ID> hoặc !ltr extend <ID> <time>',
    examples: [
        '!listtemproles',
        '!ltr @user',
        '!ltr remove abc123',
        '!ltr extend abc123 7d'
    ],
    permissions: 'admin',
    guildOnly: true,
    category: 'management',

    async execute(message, args, client) {
        try {
            const subcommand = args[0]?.toLowerCase();

            // Handle subcommands
            if (subcommand === 'remove') {
                return this.handleRemove(message, args, client);
            }
            
            if (subcommand === 'extend') {
                return this.handleExtend(message, args, client);
            }

            // Handle list command
            return this.handleList(message, args, client);

        } catch (error) {
            console.error('Error in listtemproles command:', error);
            await message.reply(`❌ Lỗi hệ thống: ${error.message}`);
        }
    },

    async handleList(message, args, client) {
        try {
            let targetUser = null;
            
            // Check if user is mentioned
            if (args[0]) {
                const userArg = args[0];
                if (userArg.startsWith('<@') && userArg.endsWith('>')) {
                    const userId = userArg.replace(/[<@!>]/g, '');
                    targetUser = await message.guild.members.fetch(userId).catch(() => null);
                } else {
                    const members = await message.guild.members.fetch();
                    targetUser = members.find(m => 
                        m.user.username.toLowerCase().includes(userArg.toLowerCase()) ||
                        m.displayName.toLowerCase().includes(userArg.toLowerCase())
                    );
                }
            }

            let tempRoles;
            let title;

            if (targetUser) {
                // Get temp roles for specific user
                tempRoles = await client.tempRoleManager.getUserTempRoles(targetUser.id, message.guild.id);
                title = `🏷️ Temp Roles của ${targetUser.user.username}`;
            } else {
                // Get all temp roles for guild
                tempRoles = await client.tempRoleManager.getGuildTempRoles(message.guild.id);
                title = `🏷️ Tất cả Temp Roles trong ${message.guild.name}`;
            }

            if (tempRoles.length === 0) {
                const embed = new EmbedBuilder()
                    .setTitle(title)
                    .setDescription(targetUser ? 
                        `**${targetUser.user.username}** không có temp role nào.` : 
                        'Không có temp role nào trong server.')
                    .setColor(0x95a5a6)
                    .setTimestamp();

                return message.reply({ embeds: [embed] });
            }

            // Create embed with temp roles
            const embed = new EmbedBuilder()
                .setTitle(title)
                .setColor(0x3498db)
                .setFooter({ 
                    text: `Tổng: ${tempRoles.length} temp role(s) | Use !ltr remove <ID> để xóa`,
                    iconURL: message.guild.iconURL()
                })
                .setTimestamp();

            // Group roles by chunks of 10 for pagination
            const pageSize = 10;
            const totalPages = Math.ceil(tempRoles.length / pageSize);
            const currentPage = 1; // For now, just show first page

            const startIndex = (currentPage - 1) * pageSize;
            const endIndex = Math.min(startIndex + pageSize, tempRoles.length);
            const currentRoles = tempRoles.slice(startIndex, endIndex);

            // Add description with stats
            embed.setDescription(
                `📊 **Thống kê:**\n` +
                `• Tổng temp roles: **${tempRoles.length}**\n` +
                `• Trang: **${currentPage}/${totalPages}**\n` +
                `• Hiển thị: **${startIndex + 1}-${endIndex}**\n\n` +
                `📋 **Danh sách:**`
            );

            // Add fields for each temp role
            for (const tempRole of currentRoles) {
                try {
                    const member = await message.guild.members.fetch(tempRole.userId).catch(() => null);
                    const role = message.guild.roles.cache.get(tempRole.roleId);
                    const grantedBy = await client.users.fetch(tempRole.grantedBy).catch(() => null);

                    const memberName = member ? member.user.username : 'User không tìm thấy';
                    const roleName = role ? role.name : 'Role không tìm thấy';
                    const grantedByName = grantedBy ? grantedBy.username : 'Unknown';

                    const timeLeft = tempRole.expiresAt.getTime() - Date.now();
                    const timeLeftText = timeLeft > 0 ? 
                        this.formatDuration(timeLeft) : 
                        '⏰ Đã hết hạn';

                    const fieldName = `${memberName} → ${roleName}`;
                    const fieldValue = 
                        `**ID:** \`${tempRole.id.slice(0, 8)}\`\n` +
                        `**Hết hạn:** <t:${Math.floor(tempRole.expiresAt.getTime() / 1000)}:R>\n` +
                        `**Còn lại:** ${timeLeftText}\n` +
                        `**Cấp bởi:** ${grantedByName}\n` +
                        `**Lý do:** ${tempRole.reason || 'Không có'}`;

                    embed.addFields({
                        name: fieldName,
                        value: fieldValue,
                        inline: true
                    });

                } catch (error) {
                    console.error('Error processing temp role:', error);
                }
            }

            // Add pagination info if needed
            if (totalPages > 1) {
                embed.addFields({
                    name: '📄 Pagination',
                    value: `Use reactions để chuyển trang (feature sắp có)`,
                    inline: false
                });
            }

            await message.reply({ embeds: [embed] });

        } catch (error) {
            console.error('Error listing temp roles:', error);
            await message.reply(`❌ Lỗi khi lấy danh sách temp roles: ${error.message}`);
        }
    },

    async handleRemove(message, args, client) {
        try {
            if (args.length < 2) {
                return message.reply('❌ Thiếu ID temp role! Sử dụng: `!ltr remove <ID>`');
            }

            const tempRoleId = args[1];

            // Find temp role by partial ID
            const allTempRoles = await client.tempRoleManager.getGuildTempRoles(message.guild.id);
            const tempRole = allTempRoles.find(tr => tr.id.startsWith(tempRoleId));

            if (!tempRole) {
                return message.reply(`❌ Không tìm thấy temp role với ID \`${tempRoleId}\``);
            }

            // Get role and user info for confirmation
            const role = message.guild.roles.cache.get(tempRole.roleId);
            const member = await message.guild.members.fetch(tempRole.userId).catch(() => null);

            // Remove the temp role
            await client.tempRoleManager.removeTempRole(tempRole.id);

            const embed = new EmbedBuilder()
                .setTitle('✅ Temp Role đã được gỡ bỏ')
                .addFields(
                    {
                        name: '👤 User',
                        value: member ? `${member}` : 'User không tìm thấy',
                        inline: true
                    },
                    {
                        name: '🏷️ Role',
                        value: role ? `${role}` : 'Role không tìm thấy',
                        inline: true
                    },
                    {
                        name: '🔧 Thực hiện bởi',
                        value: `${message.author}`,
                        inline: true
                    }
                )
                .setColor(0xe74c3c)
                .setTimestamp();

            await message.reply({ embeds: [embed] });

        } catch (error) {
            console.error('Error removing temp role:', error);
            await message.reply(`❌ Lỗi khi gỡ temp role: ${error.message}`);
        }
    },

    async handleExtend(message, args, client) {
        try {
            if (args.length < 3) {
                return message.reply('❌ Thiếu tham số! Sử dụng: `!ltr extend <ID> <time>`\nVí dụ: `!ltr extend abc123 7d`');
            }

            const tempRoleId = args[1];
            const timeArg = args[2];

            // Parse time
            let duration;
            if (timeArg.endsWith('M')) {
                const months = parseInt(timeArg.slice(0, -1));
                duration = months * 30 * 24 * 60 * 60 * 1000;
            } else {
                duration = ms(timeArg);
            }

            if (!duration || duration < 1000) {
                return message.reply('❌ Định dạng thời gian không hợp lệ! Ví dụ: `7d`, `1M`, `24h`');
            }

            // Find temp role
            const allTempRoles = await client.tempRoleManager.getGuildTempRoles(message.guild.id);
            const tempRole = allTempRoles.find(tr => tr.id.startsWith(tempRoleId));

            if (!tempRole) {
                return message.reply(`❌ Không tìm thấy temp role với ID \`${tempRoleId}\``);
            }

            // Extend the temp role
            const newExpiryDate = await client.tempRoleManager.extendTempRole(tempRole.id, duration);

            // Get role and user info
            const role = message.guild.roles.cache.get(tempRole.roleId);
            const member = await message.guild.members.fetch(tempRole.userId).catch(() => null);

            const embed = new EmbedBuilder()
                .setTitle('✅ Temp Role đã được gia hạn')
                .addFields(
                    {
                        name: '👤 User',
                        value: member ? `${member}` : 'User không tìm thấy',
                        inline: true
                    },
                    {
                        name: '🏷️ Role',
                        value: role ? `${role}` : 'Role không tìm thấy',
                        inline: true
                    },
                    {
                        name: '⏰ Thời gian gia hạn',
                        value: ms(duration, { long: true }),
                        inline: true
                    },
                    {
                        name: '📅 Hết hạn mới',
                        value: `<t:${Math.floor(newExpiryDate.getTime() / 1000)}:F>`,
                        inline: false
                    },
                    {
                        name: '🔧 Gia hạn bởi',
                        value: `${message.author}`,
                        inline: true
                    }
                )
                .setColor(0x2ecc71)
                .setTimestamp();

            await message.reply({ embeds: [embed] });

        } catch (error) {
            console.error('Error extending temp role:', error);
            await message.reply(`❌ Lỗi khi gia hạn temp role: ${error.message}`);
        }
    },

    // Format duration helper
    formatDuration(milliseconds) {
        const seconds = Math.floor(milliseconds / 1000);
        const minutes = Math.floor(seconds / 60);
        const hours = Math.floor(minutes / 60);
        const days = Math.floor(hours / 24);

        if (days > 0) {
            return `${days} ngày ${hours % 24} giờ`;
        } else if (hours > 0) {
            return `${hours} giờ ${minutes % 60} phút`;
        } else if (minutes > 0) {
            return `${minutes} phút`;
        } else {
            return `${seconds} giây`;
        }
    }
}; 