const { hasFlexiblePermission } = require('../../utils/permissions');
const embedFactory = require('../../utils/embeds');
const logger = require('../../utils/logger');
const { PermissionsBitField } = require('discord.js');

module.exports = {
    name: 'createrole',
    description: 'Tạo role mới với tên, màu và quyền tùy chỉnh',
    aliases: ['newrole', 'mkrole'],
    usage: '!createrole <name> [color] [permissions] [mentionable] [hoisted]',
    category: 'management',
    permissions: 'admin',
    guildOnly: true,
    examples: [
        '!createrole "Moderator" red',
        '!createrole Helper blue hoisted',
        '!createrole VIP gold mentionable'
    ],

    async execute(message, args, client) {
        try {
            // Check permissions
            if (!await hasFlexiblePermission(message.member, 'createrole', this.permissions, message.guild.id)) {
                const embed = embedFactory.error(
                    'Không có quyền!',
                    'Bạn cần quyền **Admin** để sử dụng lệnh này.'
                );
                return message.reply({ embeds: [embed] });
            }

            // Check if role name is provided
            if (!args[0]) {
                const embed = embedFactory.error(
                    'Thiếu thông tin!',
                    'Vui lòng cung cấp tên role.\n\n**Cách dùng:** `!createrole <name> [color] [permissions]`'
                );
                return message.reply({ embeds: [embed] });
            }

            // Check bot permissions
            if (!message.guild.members.me.permissions.has('ManageRoles')) {
                const embed = embedFactory.error(
                    'Bot thiếu quyền!',
                    'Bot cần quyền **Manage Roles** để tạo role.'
                );
                return message.reply({ embeds: [embed] });
            }

            // Parse role name (handle quotes)
            let roleName = args.join(' ');
            let additionalArgs = [];
            
            if (args[0].startsWith('"')) {
                const quoteMatch = roleName.match(/"([^"]+)"/);
                if (quoteMatch) {
                    roleName = quoteMatch[1];
                    additionalArgs = roleName.replace(quoteMatch[0], '').trim().split(' ').filter(Boolean);
                }
            } else {
                roleName = args[0];
                additionalArgs = args.slice(1);
            }

            // Validate role name
            if (roleName.length > 100) {
                const embed = embedFactory.error(
                    'Tên role quá dài!',
                    'Tên role không được vượt quá 100 ký tự.'
                );
                return message.reply({ embeds: [embed] });
            }

            // Check if role already exists
            const existingRole = message.guild.roles.cache.find(role => 
                role.name.toLowerCase() === roleName.toLowerCase()
            );
            if (existingRole) {
                const embed = embedFactory.error(
                    'Role đã tồn tại!',
                    `Role **${roleName}** đã tồn tại trong server.`
                );
                return message.reply({ embeds: [embed] });
            }

            // Parse additional options
            let roleColor = null;
            let mentionable = false;
            let hoisted = false;

            for (const arg of additionalArgs) {
                const lowerArg = arg.toLowerCase();
                
                if (lowerArg === 'mentionable') {
                    mentionable = true;
                } else if (lowerArg === 'hoisted' || lowerArg === 'hoist') {
                    hoisted = true;
                } else if (this.isValidColor(arg)) {
                    roleColor = this.parseColor(arg);
                }
            }

            try {
                // Create role
                const roleData = {
                    name: roleName,
                    mentionable,
                    hoist: hoisted,
                    reason: `Role created by ${message.author.tag}`
                };

                if (roleColor) {
                    roleData.color = roleColor;
                }

                const newRole = await message.guild.roles.create(roleData);

                // Success response
                const embed = embedFactory.success(
                    'Role đã được tạo!',
                    `**Role:** ${newRole}\n**ID:** \`${newRole.id}\`\n**Tên:** ${roleName}`
                );

                embed.addFields([
                    {
                        name: '🎨 Thông tin Role:',
                        value: `**Màu:** ${newRole.hexColor}\n**Mentionable:** ${mentionable ? 'Có' : 'Không'}\n**Hoisted:** ${hoisted ? 'Có' : 'Không'}\n**Vị trí:** ${newRole.position}`,
                        inline: true
                    }
                ]);

                await message.reply({ embeds: [embed] });

                logger.command(message.author, `createrole ${roleName}`, message.guild);

            } catch (error) {
                logger.error('Role creation error', error);
                
                let errorMsg = 'Đã xảy ra lỗi khi tạo role.';
                if (error.code === 50013) {
                    errorMsg = 'Bot không có quyền tạo role.';
                } else if (error.code === 30005) {
                    errorMsg = 'Server đã đạt giới hạn số lượng role (250 roles).';
                }

                const embed = embedFactory.error(
                    'Lỗi tạo role!',
                    errorMsg
                );
                await message.reply({ embeds: [embed] });
            }

        } catch (error) {
            logger.error('Createrole command error', error);
            const embed = embedFactory.error(
                'Lỗi hệ thống!',
                'Đã xảy ra lỗi khi thực thi lệnh createrole.'
            );
            await message.reply({ embeds: [embed] });
        }
    },

    isValidColor(color) {
        const colorNames = ['red', 'green', 'blue', 'yellow', 'orange', 'purple', 'pink', 'white', 'black', 'grey', 'gray', 'gold', 'silver'];
        return colorNames.includes(color.toLowerCase()) || /^#[0-9A-F]{6}$/i.test(color);
    },

    parseColor(color) {
        const colorMap = {
            'red': '#FF0000',
            'green': '#00FF00', 
            'blue': '#0000FF',
            'yellow': '#FFFF00',
            'orange': '#FFA500',
            'purple': '#800080',
            'pink': '#FFC0CB',
            'white': '#FFFFFF',
            'black': '#000000',
            'grey': '#808080',
            'gray': '#808080',
            'gold': '#FFD700',
            'silver': '#C0C0C0'
        };

        if (color.startsWith('#')) {
            return color;
        }
        
        return colorMap[color.toLowerCase()] || null;
    }
};
