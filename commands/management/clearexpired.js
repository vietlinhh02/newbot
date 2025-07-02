const { EmbedBuilder } = require('discord.js');

module.exports = {
    name: 'clearexpired',
    aliases: ['clearexp', 'cleantemproles'],
    description: 'Clear tất cả temp roles đã hết hạn (admin only)',
    usage: '!clearexpired [user]',
    examples: [
        '!clearexpired',
        '!clearexp @user',
        '!cleantemproles'
    ],
    permissions: 'admin',
    guildOnly: true,
    category: 'management',

    async execute(message, args, client) {
        try {
            const now = new Date();
            let targetUser = null;

            // Check if specific user mentioned
            if (args.length > 0) {
                const userArg = args[0];
                if (userArg.startsWith('<@') && userArg.endsWith('>')) {
                    const userId = userArg.replace(/[<@!>]/g, '');
                    targetUser = await message.guild.members.fetch(userId).catch(() => null);
                    
                    if (!targetUser) {
                        return message.reply('❌ Không tìm thấy user này!');
                    }
                }
            }

            const initialMessage = await message.reply('🔄 Đang kiểm tra và clear expired temp roles...');

            let whereCondition = {
                guildId: message.guild.id,
                active: true,
                expiresAt: {
                    lte: now
                }
            };

            // If specific user, add user filter
            if (targetUser) {
                whereCondition.userId = targetUser.id;
            }

            // Find expired temp roles
            const expiredRoles = await client.prisma.tempRole.findMany({
                where: whereCondition
            });

            if (expiredRoles.length === 0) {
                const embed = new EmbedBuilder()
                    .setTitle('✅ Không có temp roles hết hạn')
                    .setDescription(targetUser ? 
                        `**${targetUser.user.username}** không có temp roles nào đã hết hạn.` :
                        'Server không có temp roles nào đã hết hạn.')
                    .setColor(0x2ecc71)
                    .setTimestamp();

                return initialMessage.edit({ content: null, embeds: [embed] });
            }

            // Group by user for better display
            const userRoles = {};
            for (const tempRole of expiredRoles) {
                if (!userRoles[tempRole.userId]) {
                    userRoles[tempRole.userId] = [];
                }
                userRoles[tempRole.userId].push(tempRole);
            }

            // Remove expired roles from Discord first
            let removedFromDiscord = 0;
            let failedToRemove = 0;

            for (const userId in userRoles) {
                try {
                    const member = await message.guild.members.fetch(userId).catch(() => null);
                    if (!member) continue;

                    for (const tempRole of userRoles[userId]) {
                        const role = message.guild.roles.cache.get(tempRole.roleId);
                        if (role && member.roles.cache.has(role.id)) {
                            try {
                                await member.roles.remove(role);
                                removedFromDiscord++;
                                console.log(`✅ Removed expired role ${role.name} from ${member.user.username}`);
                            } catch (error) {
                                console.log(`❌ Failed to remove role ${role.name} from ${member.user.username}`);
                                failedToRemove++;
                            }
                        }
                    }
                } catch (error) {
                    console.log('Error processing user:', error);
                }
            }

            // Mark as inactive in database
            const updateResult = await client.prisma.tempRole.updateMany({
                where: whereCondition,
                data: {
                    active: false
                }
            });

            // Create detailed result embed
            const embed = new EmbedBuilder()
                .setTitle('🧹 Clear Expired Temp Roles - Completed')
                .setColor(0x2ecc71)
                .addFields(
                    {
                        name: '📊 Thống kê',
                        value: 
                            `**Expired roles tìm thấy:** ${expiredRoles.length}\n` +
                            `**Removed từ Discord:** ${removedFromDiscord}\n` +
                            `**Failed to remove:** ${failedToRemove}\n` +
                            `**Updated database:** ${updateResult.count}`,
                        inline: true
                    },
                    {
                        name: '👥 Affected Users',
                        value: `**${Object.keys(userRoles).length}** users`,
                        inline: true
                    }
                )
                .setTimestamp();

            // Add user details if specific user or few users
            const userCount = Object.keys(userRoles).length;
            if (userCount <= 5) {
                let userDetails = '';
                for (const userId in userRoles) {
                    try {
                        const member = await message.guild.members.fetch(userId).catch(() => null);
                        const userName = member ? member.user.username : `User ${userId}`;
                        const roleCount = userRoles[userId].length;
                        userDetails += `• **${userName}:** ${roleCount} role(s)\n`;
                    } catch (error) {
                        userDetails += `• User ${userId}: ${userRoles[userId].length} role(s)\n`;
                    }
                }

                embed.addFields({
                    name: '🔍 Chi tiết users',
                    value: userDetails || 'Không có user nào',
                    inline: false
                });
            }

            // Add cleanup info
            embed.addFields({
                name: '💡 Thông tin',
                value: 
                    '• Expired temp roles đã được removed khỏi Discord\n' +
                    '• Database records đã được marked inactive\n' +
                    '• Users có thể nhận temp roles mới cho các roles này\n' +
                    '• Background task sẽ tự động clean up tương lai',
                inline: false
            });

            await initialMessage.edit({ content: null, embeds: [embed] });

        } catch (error) {
            console.error('Error in clearexpired command:', error);
            await message.reply(`❌ Lỗi khi clear expired roles: ${error.message}`);
        }
    }
}; 