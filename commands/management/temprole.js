const { EmbedBuilder } = require('discord.js');
const ms = require('ms');

module.exports = {
    name: 'temprole',
    aliases: ['role', 'tr', 'addrole'],
    description: 'Cấp role tạm thời cho user',
    usage: '!temprole <@role> <@user> <time> [reason]',
    examples: [
        '!temprole @VIP @user 30m VIP 30 phút',
        '!role @Premium @user 1M Premium 1 tháng',
        '!tr @Helper @user 7d Helper 7 ngày',
        '!addrole @VIP @user 1h VIP 1 giờ',
    ],
    permissions: 'admin',
    guildOnly: true,
    category: 'management',

    async execute(message, args, client) {
        try {
            // Parse arguments
            if (args.length < 3) {
                const embed = new EmbedBuilder()
                    .setTitle('❌ Thiếu tham số')
                    .setDescription('**Cách sử dụng:**\n`!temprole <@role> <@user> <time> [reason]`')
                    .addFields(
                        {
                            name: '📋 Ví dụ',
                            value: '• `!temprole @VIP @user 30m` - VIP 30 phút\n' +
                                   '• `!role @Premium @user 1M` - Premium 1 tháng\n' +
                                   '• `!tr @Helper @user 7d` - Helper 7 ngày',
                            inline: false
                        },
                        {
                            name: '⏰ Định dạng thời gian',
                            value: '• `s` - giây\n• `m` - phút\n• `h` - giờ\n• `d` - ngày\n• `w` - tuần\n• `M` - tháng\n\n⚠️ **Lưu ý:** `m` = phút, `M` = tháng',
                            inline: false
                        },
                        {
                            name: '📱 Thông báo',
                            value: '• ✅ Khi nhận role\n• ✅ Khi mất role (hết hạn)\n• ❌ Không có reminder trước khi hết hạn',
                            inline: false
                        }
                    )
                    .setColor(0xff4757)
                    .setTimestamp();

                return message.reply({ embeds: [embed] });
            }

            // Parse role
            let targetRole;
            const roleArg = args[0];
            if (roleArg.startsWith('<@&') && roleArg.endsWith('>')) {
                const roleId = roleArg.slice(3, -1);
                targetRole = message.guild.roles.cache.get(roleId);
            } else {
                targetRole = message.guild.roles.cache.find(r => 
                    r.name.toLowerCase().includes(roleArg.toLowerCase())
                );
            }

            if (!targetRole) {
                return message.reply('❌ Không tìm thấy role! Hãy mention role hoặc nhập tên role chính xác.');
            }

            // Parse user
            let targetUser;
            const userArg = args[1];
            if (userArg.startsWith('<@') && userArg.endsWith('>')) {
                const userId = userArg.replace(/[<@!>]/g, '');
                targetUser = await message.guild.members.fetch(userId);
            } else {
                const members = await message.guild.members.fetch();
                targetUser = members.find(m => 
                    m.user.username.toLowerCase().includes(userArg.toLowerCase()) ||
                    m.displayName.toLowerCase().includes(userArg.toLowerCase())
                );
            }

            if (!targetUser) {
                return message.reply('❌ Không tìm thấy user! Hãy mention user hoặc nhập tên chính xác.');
            }

            // Parse time
            const timeArg = args[2];
            let duration;
            
            console.log(`🕐 Parsing time: "${timeArg}"`);
            
            // Convert time formats
            if (timeArg.endsWith('M')) {
                // Months - convert to days (30 days per month)
                const months = parseInt(timeArg.slice(0, -1));
                if (isNaN(months) || months <= 0) {
                    return message.reply('❌ Số tháng không hợp lệ! Ví dụ: `1M`, `3M`');
                }
                duration = months * 30 * 24 * 60 * 60 * 1000;
                console.log(`📅 Parsed as ${months} months = ${duration}ms`);
            } else {
                // Use ms library for other formats
                duration = ms(timeArg);
                console.log(`⏱️ MS library parsed "${timeArg}" = ${duration}ms`);
            }

            if (!duration || duration < 1000) {
                return message.reply('❌ Định dạng thời gian không hợp lệ! Ví dụ: `30m`, `1h`, `7d`, `1M`');
            }

            // Check if duration is too long (max 1 year)
            const maxDuration = 365 * 24 * 60 * 60 * 1000;
            if (duration > maxDuration) {
                return message.reply('❌ Thời gian tối đa là 1 năm!');
            }

            // Log duration for very short times
            if (duration < 60 * 60 * 1000) { // Less than 1 hour
                const timeDisplay = ms(duration, { long: true });
                console.log(`⚠️ Very short duration: ${timeDisplay}`);
            }

            // Parse reason
            const reason = args.slice(3).join(' ') || 'Không có lý do';

            // Check permissions
            if (!message.member.permissions.has('ManageRoles')) {
                return message.reply('❌ Bạn không có quyền quản lý roles!');
            }

            // Check bot permissions
            if (!message.guild.members.me.permissions.has('ManageRoles')) {
                return message.reply('❌ Bot không có quyền quản lý roles!');
            }

            // Check role hierarchy with detailed explanation
            const botRole = message.guild.members.me.roles.highest;
            if (targetRole.position >= botRole.position) {
                return message.reply(
                    `❌ **Bot không thể quản lý role này!**\n\n` +
                    `**Role muốn cấp:** ${targetRole} (vị trí ${targetRole.position})\n` +
                    `**Bot role:** ${botRole} (vị trí ${botRole.position})\n\n` +
                    `🔧 **Cách fix:** Vào Server Settings → Roles → Kéo bot role lên trên ${targetRole.name}\n` +
                    `💡 **Hoặc dùng:** \`!rolecheck ${targetRole.name}\` để xem hướng dẫn chi tiết`
                );
            }

            if (targetRole.position >= message.member.roles.highest.position && message.guild.ownerId !== message.author.id) {
                return message.reply(
                    `❌ **Bạn không có quyền cấp role này!**\n\n` +
                    `**Role muốn cấp:** ${targetRole} (vị trí ${targetRole.position})\n` +
                    `**Role cao nhất của bạn:** ${message.member.roles.highest} (vị trí ${message.member.roles.highest.position})\n\n` +
                    `💡 **Lưu ý:** Chỉ có thể cấp roles thấp hơn role của mình (trừ server owner)`
                );
            }

            // First, clean up expired temp roles for this user
            const now = new Date();
            await client.prisma.tempRole.updateMany({
                where: {
                    userId: targetUser.id,
                    guildId: message.guild.id,
                    active: true,
                    expiresAt: {
                        lte: now
                    }
                },
                data: {
                    active: false
                }
            });

            // Check if user already has this SPECIFIC role temporarily and it's still active
            const existingTempRole = await client.prisma.tempRole.findFirst({
                where: {
                    userId: targetUser.id,
                    guildId: message.guild.id,
                    roleId: targetRole.id,
                    active: true,
                    expiresAt: {
                        gt: now // Must be in the future
                    }
                }
            });

            if (existingTempRole) {
                const expiryDate = new Date(existingTempRole.expiresAt);
                const timeLeft = expiryDate.getTime() - Date.now();
                const timeLeftText = timeLeft > 0 ? ms(timeLeft, { long: true }) : 'đã hết hạn';
                
                // Show current temp roles for this user
                const userTempRoles = await client.prisma.tempRole.findMany({
                    where: {
                        userId: targetUser.id,
                        guildId: message.guild.id,
                        active: true,
                        expiresAt: {
                            gt: now
                        }
                    }
                });

                let tempRolesList = '';
                for (const tempRole of userTempRoles) {
                    const role = message.guild.roles.cache.get(tempRole.roleId);
                    if (role) {
                        const timeLeft = tempRole.expiresAt.getTime() - Date.now();
                        const timeText = timeLeft > 0 ? ms(timeLeft, { long: true }) : 'hết hạn';
                        tempRolesList += `• ${role.name}: ${timeText}\n`;
                    }
                }

                return message.reply(
                    `❌ **${targetUser.user.username}** đã có role **${targetRole.name}** tạm thời!\n` +
                    `⏰ **Thời gian còn lại:** ${timeLeftText}\n\n` +
                    `📋 **Temp roles hiện tại:**\n${tempRolesList}\n` +
                    `💡 **Tip:** Bạn có thể cấp các role khác nhau cùng lúc hoặc chờ role này hết hạn!`
                );
            }

            // Calculate expiration date
            const expiresAt = new Date(Date.now() + duration);
            
            console.log(`📅 Expiry calculation:`, {
                currentTime: new Date().toISOString(),
                duration: duration,
                expiresAt: expiresAt.toISOString(),
                timeUntilExpiry: duration
            });

            try {
                // Add role to user
                await targetUser.roles.add(targetRole);

                // Save to database and verify
                const tempRoleRecord = await client.prisma.tempRole.create({
                    data: {
                        userId: targetUser.id,
                        guildId: message.guild.id,
                        roleId: targetRole.id,
                        reason: reason,
                        grantedBy: message.author.id,
                        expiresAt: expiresAt
                    }
                });

                // Verify database write
                console.log(`✅ Created temp role record:`, {
                    id: tempRoleRecord.id,
                    user: targetUser.user.username,
                    role: targetRole.name,
                    expiresAt: tempRoleRecord.expiresAt
                });

                // Create success embed
                const embed = new EmbedBuilder()
                    .setTitle('✅ Cấp role tạm thời thành công!')
                    .setColor(0x2ed573)
                    .addFields(
                        {
                            name: '👤 User',
                            value: `${targetUser}`,
                            inline: true
                        },
                        {
                            name: '🏷️ Role',
                            value: `${targetRole}`,
                            inline: true
                        },
                        {
                            name: '⏰ Thời gian',
                            value: ms(duration, { long: true }),
                            inline: true
                        },
                        {
                            name: '🕐 Input đã parse',
                            value: `\`${timeArg}\` → ${ms(duration, { long: true })}`,
                            inline: true
                        },
                        {
                            name: '📅 Hết hạn vào',
                            value: `<t:${Math.floor(expiresAt.getTime() / 1000)}:F>`,
                            inline: false
                        },
                        {
                            name: '📝 Lý do',
                            value: reason,
                            inline: false
                        },
                        {
                            name: '👮 Được cấp bởi',
                            value: `${message.author}`,
                            inline: false
                        },
                        {
                            name: '🆔 Temp Role ID',
                            value: `\`${tempRoleRecord.id.slice(0, 8)}\``,
                            inline: true
                        },
                        {
                            name: '🔢 Debug Info',
                            value: `Duration: ${duration}ms\nExpires: ${expiresAt.getTime()}`,
                            inline: true
                        }
                    )
                    .setThumbnail(targetUser.user.displayAvatarURL())
                    .setTimestamp();

                await message.reply({ embeds: [embed] });

                // Show warning for very short durations
                if (duration < 10 * 60 * 1000) { // Less than 10 minutes
                    const warningEmbed = new EmbedBuilder()
                        .setTitle('⚠️ Thời gian rất ngắn!')
                        .setDescription(`Role này chỉ có hiệu lực **${ms(duration, { long: true })}**.\nHãy đảm bảo đây là thời gian mong muốn.`)
                        .setColor(0xffa500)
                        .setTimestamp();
                    
                    setTimeout(() => {
                        message.channel.send({ embeds: [warningEmbed] });
                    }, 1000);
                }

                // Verify the temp role was actually saved
                const verification = await client.prisma.tempRole.findUnique({
                    where: { id: tempRoleRecord.id }
                });

                if (!verification) {
                    console.error('❌ CRITICAL: Temp role was not found in database after creation!');
                    return message.reply('❌ Lỗi nghiêm trọng: Temp role không được lưu vào database!');
                }

                console.log(`✅ Database verification successful:`, {
                    id: verification.id,
                    active: verification.active,
                    expiresAt: verification.expiresAt,
                    createdAt: verification.createdAt
                });

                // Count current active temp roles
                const activeTempRolesCount = await client.prisma.tempRole.count({
                    where: { 
                        active: true,
                        guildId: message.guild.id 
                    }
                });

                console.log(`📊 Active temp roles in guild: ${activeTempRolesCount}`);

                // Manually trigger check for expired roles to ensure background task is working
                if (client.tempRoleManager) {
                    try {
                        console.log('🔄 About to manually trigger expired roles check...');
                        await client.tempRoleManager.checkExpiredRoles();
                        console.log('✅ Manually triggered expired roles check completed');
                        
                        // Get manager status
                        const status = client.tempRoleManager.getStatus();
                        console.log('🏷️ TempRoleManager status:', {
                            isRunning: status.isRunning,
                            checksPerformed: status.checksPerformed,
                            lastCheckTime: status.lastCheckTime
                        });
                    } catch (error) {
                        console.error('❌ Error triggering expired roles check:', error);
                    }
                } else {
                    console.warn('⚠️ TempRoleManager not found on client');
                }

                // DM user about the temporary role
                try {
                    const dmEmbed = new EmbedBuilder()
                        .setTitle('🏷️ Bạn đã nhận được role tạm thời!')
                        .setDescription(`Bạn đã được cấp role **${targetRole.name}** trong server **${message.guild.name}**`)
                        .addFields(
                            {
                                name: '⏰ Thời gian',
                                value: ms(duration, { long: true }),
                                inline: true
                            },
                            {
                                name: '📅 Hết hạn',
                                value: `<t:${Math.floor(expiresAt.getTime() / 1000)}:R>`,
                                inline: true
                            },
                            {
                                name: '📝 Lý do',
                                value: reason,
                                inline: false
                            },
                            {
                                name: '🆔 Temp Role ID',
                                value: `\`${tempRoleRecord.id.slice(0, 8)}\``,
                                inline: true
                            }
                        )
                        .setColor(0x3742fa)
                        .setFooter({ text: 'Bạn sẽ nhận thông báo lần nữa khi role hết hạn' })
                        .setTimestamp();

                    await targetUser.send({ embeds: [dmEmbed] });
                    console.log(`✅ Successfully sent DM to ${targetUser.user.username} about temp role`);
                } catch (error) {
                    console.log(`❌ Could not DM user ${targetUser.user.username} about temporary role:`, error.message);
                }

                console.log(`🎉 Temp role process completed successfully for ${targetUser.user.username}`);

            } catch (error) {
                console.error('Error granting temporary role:', error);
                await message.reply(`❌ Lỗi khi cấp role: ${error.message}`);
            }

        } catch (error) {
            console.error('Error in temprole command:', error);
            await message.reply(`❌ Lỗi hệ thống: ${error.message}`);
        }
    }
}; 