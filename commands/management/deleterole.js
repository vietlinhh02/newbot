const { hasFlexiblePermission } = require('../../utils/permissions');
const embedFactory = require('../../utils/embeds');
const logger = require('../../utils/logger');
const { ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType } = require('discord.js');

module.exports = {
    name: 'deleterole',
    description: 'Xóa role khỏi server (cần xác nhận)',
    aliases: ['removerole', 'rmrole', 'droprole'],
    usage: '!deleterole <role>',
    category: 'management',
    permissions: 'admin',
    guildOnly: true,
    examples: [
        '!deleterole @VIP',
        '!deleterole "Old Role"',
        '!deleterole 123456789'
    ],

    async execute(message, args, client) {
        try {
            // Check permissions
            if (!await hasFlexiblePermission(message.member, 'deleterole', this.permissions, message.guild.id)) {
                const embed = embedFactory.error(
                    'Không có quyền!',
                    'Bạn cần quyền **Admin** để sử dụng lệnh này.'
                );
                return message.reply({ embeds: [embed] });
            }

            // Check if role is provided
            if (!args[0]) {
                const embed = embedFactory.error(
                    'Thiếu thông tin!',
                    'Vui lòng cung cấp role cần xóa.\n\n**Cách dùng:** `!deleterole <role>`'
                );
                embed.addFields([{
                    name: '💡 Examples:',
                    value: '• `!deleterole @VIP`\n• `!deleterole "Old Role"`\n• `!deleterole 123456789`',
                    inline: false
                }]);
                return message.reply({ embeds: [embed] });
            }

            // Check bot permissions
            if (!message.guild.members.me.permissions.has('ManageRoles')) {
                const embed = embedFactory.error(
                    'Bot thiếu quyền!',
                    'Bot cần quyền **Manage Roles** để xóa role.'
                );
                return message.reply({ embeds: [embed] });
            }

            // Parse role argument
            const roleArg = args.join(' ');
            let targetRole = null;

            // Try to find role by mention, ID, or name
            const roleIdMatch = roleArg.match(/^(?:<@&)?(\d+)>?$/);
            if (roleIdMatch) {
                targetRole = message.guild.roles.cache.get(roleIdMatch[1]);
            } else {
                // Find by name (case insensitive)
                let roleName = roleArg;
                if (roleName.startsWith('"') && roleName.endsWith('"')) {
                    roleName = roleName.slice(1, -1);
                }
                
                targetRole = message.guild.roles.cache.find(role => 
                    role.name.toLowerCase() === roleName.toLowerCase()
                );
            }

            if (!targetRole) {
                const embed = embedFactory.error(
                    'Role không tồn tại!',
                    `Không thể tìm thấy role **${roleArg}** trong server.`
                );
                return message.reply({ embeds: [embed] });
            }

            // Validate role deletion permissions
            const validationResult = this.validateRoleDeletion(targetRole, message.member, message.guild);
            if (!validationResult.canDelete) {
                const embed = embedFactory.error(
                    'Không thể xóa role!',
                    validationResult.reason
                );
                return message.reply({ embeds: [embed] });
            }

            // Get role information before deletion
            const roleInfo = {
                name: targetRole.name,
                id: targetRole.id,
                color: targetRole.hexColor,
                position: targetRole.position,
                memberCount: targetRole.members.size,
                permissions: targetRole.permissions.toArray(),
                mentionable: targetRole.mentionable,
                hoisted: targetRole.hoist,
                createdAt: targetRole.createdAt
            };

            // Show confirmation embed
            const confirmEmbed = embedFactory.warning(
                '⚠️ Xác nhận xóa role',
                `Bạn có chắc chắn muốn xóa role **${targetRole.name}**?`
            );

            confirmEmbed.addFields([
                {
                    name: '📋 Thông tin Role:',
                    value: `**ID:** \`${targetRole.id}\`\n**Màu:** ${targetRole.hexColor}\n**Vị trí:** ${targetRole.position}\n**Thành viên có role:** ${roleInfo.memberCount}`,
                    inline: true
                },
                {
                    name: '⚙️ Thuộc tính:',
                    value: `**Mentionable:** ${roleInfo.mentionable ? 'Có' : 'Không'}\n**Hoisted:** ${roleInfo.hoisted ? 'Có' : 'Không'}\n**Permissions:** ${roleInfo.permissions.length}`,
                    inline: true
                }
            ]);

            if (roleInfo.memberCount > 0) {
                confirmEmbed.addFields([{
                    name: '⚠️ Cảnh báo:',
                    value: `Role này hiện có **${roleInfo.memberCount} thành viên**. Xóa role sẽ loại bỏ role khỏi tất cả thành viên.`,
                    inline: false
                }]);
            }

            // Create confirmation buttons
            const confirmButton = new ButtonBuilder()
                .setCustomId('confirm_delete')
                .setLabel('Xác nhận xóa')
                .setEmoji('🗑️')
                .setStyle(ButtonStyle.Danger);

            const cancelButton = new ButtonBuilder()
                .setCustomId('cancel_delete')
                .setLabel('Hủy bỏ')
                .setEmoji('❌')
                .setStyle(ButtonStyle.Secondary);

            const row = new ActionRowBuilder().addComponents(confirmButton, cancelButton);

            const confirmMsg = await message.reply({ 
                embeds: [confirmEmbed], 
                components: [row] 
            });

            // Handle button interactions
            const collector = confirmMsg.createMessageComponentCollector({
                componentType: ComponentType.Button,
                time: 30000 // 30 seconds
            });

            collector.on('collect', async interaction => {
                if (interaction.user.id !== message.author.id) {
                    await interaction.reply({
                        content: '❌ Chỉ người dùng lệnh mới có thể xác nhận.',
                        ephemeral: true
                    });
                    return;
                }

                await interaction.deferUpdate();

                if (interaction.customId === 'confirm_delete') {
                    try {
                        // Delete the role
                        await targetRole.delete(`Role deleted by ${message.author.tag} using deleterole command`);

                        // Success response
                        const successEmbed = embedFactory.success(
                            'Role đã được xóa!',
                            `**Role:** ${roleInfo.name} (\`${roleInfo.id}\`)\n**Thành viên bị ảnh hưởng:** ${roleInfo.memberCount}`
                        );

                        successEmbed.addFields([{
                            name: '📊 Thông tin đã xóa:',
                            value: `**Màu:** ${roleInfo.color}\n**Vị trí:** ${roleInfo.position}\n**Permissions:** ${roleInfo.permissions.length}\n**Tạo lúc:** <t:${Math.floor(roleInfo.createdAt.getTime() / 1000)}:R>`,
                            inline: false
                        }]);

                        await confirmMsg.edit({ 
                            embeds: [successEmbed], 
                            components: [] 
                        });

                        // Log to mod channel
                        try {
                            const guildSettings = await client.prisma.guildSettings.findUnique({
                                where: { guildId: message.guild.id }
                            });

                            if (guildSettings?.logChannel) {
                                const logChannel = message.guild.channels.cache.get(guildSettings.logChannel);
                                if (logChannel) {
                                    const logEmbed = embedFactory.moderation({
                                        action: 'Role Deleted',
                                        targetUser: { tag: `Role: ${roleInfo.name}`, id: roleInfo.id },
                                        moderator: message.author,
                                        reason: `Deleted role that had ${roleInfo.memberCount} members`,
                                        channel: message.channel.toString(),
                                        fields: [
                                            {
                                                name: '🗑️ Deleted Role Info:',
                                                value: `**Name:** ${roleInfo.name}\n**Color:** ${roleInfo.color}\n**Position:** ${roleInfo.position}`,
                                                inline: true
                                            },
                                            {
                                                name: '👥 Impact:',
                                                value: `**Members Affected:** ${roleInfo.memberCount}\n**Permissions Lost:** ${roleInfo.permissions.length}`,
                                                inline: true
                                            }
                                        ]
                                    });

                                    await logChannel.send({ embeds: [logEmbed] });
                                }
                            }
                        } catch (error) {
                            logger.error('Error sending deleterole log', error);
                        }

                        logger.command(message.author, `deleterole ${roleInfo.name}`, message.guild);

                    } catch (error) {
                        logger.error('Role deletion error', error);
                        
                        let errorMsg = 'Đã xảy ra lỗi khi xóa role.';
                        if (error.code === 50013) {
                            errorMsg = 'Bot không có quyền xóa role này.';
                        } else if (error.code === 10011) {
                            errorMsg = 'Role không tồn tại (có thể đã bị xóa).';
                        }

                        const errorEmbed = embedFactory.error(
                            'Lỗi xóa role!',
                            errorMsg
                        );
                        await confirmMsg.edit({ 
                            embeds: [errorEmbed], 
                            components: [] 
                        });
                    }
                } else {
                    // Cancel deletion
                    const cancelEmbed = embedFactory.info(
                        'Đã hủy xóa role',
                        `Role **${targetRole.name}** không bị xóa.`
                    );
                    await confirmMsg.edit({ 
                        embeds: [cancelEmbed], 
                        components: [] 
                    });
                }
            });

            collector.on('end', (collected) => {
                if (collected.size === 0) {
                    // Timeout
                    const timeoutEmbed = embedFactory.warning(
                        'Hết thời gian chờ',
                        `Không nhận được xác nhận. Role **${targetRole.name}** không bị xóa.`
                    );
                    confirmMsg.edit({ 
                        embeds: [timeoutEmbed], 
                        components: [] 
                    }).catch(() => {});
                }
            });

        } catch (error) {
            logger.error('Deleterole command error', error);
            const embed = embedFactory.error(
                'Lỗi hệ thống!',
                'Đã xảy ra lỗi khi thực thi lệnh deleterole.',
                error.message
            );
            await message.reply({ embeds: [embed] });
        }
    },

    validateRoleDeletion(role, member, guild) {
        // Cannot delete @everyone role
        if (role.id === guild.id) {
            return {
                canDelete: false,
                reason: 'Không thể xóa role @everyone.'
            };
        }

        // Check if role is managed by integration (bot roles, boosts, etc.)
        if (role.managed) {
            return {
                canDelete: false,
                reason: 'Không thể xóa role được quản lý bởi tích hợp (bot roles, nitro boost, etc.).'
            };
        }

        // Check if bot's highest role is higher than target role
        const botHighestRole = guild.members.me.roles.highest;
        if (role.position >= botHighestRole.position) {
            return {
                canDelete: false,
                reason: 'Bot không thể xóa role có vị trí cao hơn hoặc bằng role cao nhất của bot.'
            };
        }

        // Check if user's highest role is higher than target role (unless they're server owner)
        if (member.id !== guild.ownerId && role.position >= member.roles.highest.position) {
            return {
                canDelete: false,
                reason: 'Bạn không thể xóa role có vị trí cao hơn hoặc bằng role cao nhất của bạn.'
            };
        }

        return {
            canDelete: true,
            reason: null
        };
    }
};
