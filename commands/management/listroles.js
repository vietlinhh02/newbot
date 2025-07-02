const { EmbedBuilder } = require('discord.js');

module.exports = {
    name: 'listroles',
    aliases: ['roles', 'rolelist', 'lr'],
    description: 'Xem danh sách roles có thể add được cho users',
    usage: '!listroles [filter]',
    examples: [
        '!listroles',
        '!roles manageable',
        '!lr assignable',
        '!listroles hoisted'
    ],
    permissions: 'admin',
    guildOnly: true,
    category: 'management',

    async execute(message, args, client) {
        try {
            const filter = args[0]?.toLowerCase();
            const guild = message.guild;
            
            // Fetch all roles
            const allRoles = guild.roles.cache.sort((a, b) => b.position - a.position);
            const botMember = guild.members.me;
            const userMember = message.member;

            // Filter roles based on criteria
            let filteredRoles = allRoles;
            let filterDescription = 'Tất cả roles';

            switch (filter) {
                case 'manageable':
                case 'manage':
                    filteredRoles = allRoles.filter(role => 
                        role.id !== guild.id && // Not @everyone
                        role.position < botMember.roles.highest.position // Bot can manage
                    );
                    filterDescription = 'Roles bot có thể quản lý';
                    break;

                case 'assignable':
                case 'assign':
                    filteredRoles = allRoles.filter(role => 
                        role.id !== guild.id && // Not @everyone
                        role.position < botMember.roles.highest.position && // Bot can manage
                        (role.position < userMember.roles.highest.position || guild.ownerId === message.author.id) // User can assign
                    );
                    filterDescription = 'Roles bạn có thể assign';
                    break;

                case 'hoisted':
                case 'hoist':
                    filteredRoles = allRoles.filter(role => role.hoist);
                    filterDescription = 'Roles hiển thị riêng biệt';
                    break;

                case 'mentionable':
                case 'mention':
                    filteredRoles = allRoles.filter(role => role.mentionable);
                    filterDescription = 'Roles có thể mention';
                    break;

                case 'color':
                case 'colored':
                    filteredRoles = allRoles.filter(role => role.color !== 0);
                    filterDescription = 'Roles có màu';
                    break;

                case 'bot':
                    filteredRoles = allRoles.filter(role => role.managed);
                    filterDescription = 'Roles của bot/integration';
                    break;

                case 'dangerous':
                case 'admin':
                    filteredRoles = allRoles.filter(role => 
                        role.permissions.has('Administrator') ||
                        role.permissions.has('ManageGuild') ||
                        role.permissions.has('ManageRoles') ||
                        role.permissions.has('ManageChannels')
                    );
                    filterDescription = 'Roles có quyền nguy hiểm';
                    break;

                default:
                    // Show all roles except @everyone
                    filteredRoles = allRoles.filter(role => role.id !== guild.id);
                    filterDescription = 'Tất cả roles (trừ @everyone)';
                    break;
            }

            if (filteredRoles.size === 0) {
                const embed = new EmbedBuilder()
                    .setTitle('📋 Danh Sách Roles')
                    .setDescription(`**Filter:** ${filterDescription}\n\n❌ Không có role nào phù hợp với filter này.`)
                    .setColor(0x95a5a6)
                    .setTimestamp();

                return message.reply({ embeds: [embed] });
            }

            // Create main embed
            const embed = new EmbedBuilder()
                .setTitle('📋 Danh Sách Roles')
                .setColor(0x3498db)
                .setFooter({ 
                    text: `${filteredRoles.size} role(s) | ${guild.name}`,
                    iconURL: guild.iconURL()
                })
                .setTimestamp();

            // Add stats field
            const stats = this.getRoleStats(allRoles, botMember, userMember, guild);
            embed.addFields({
                name: '📊 Thống kê',
                value: 
                    `**Filter:** ${filterDescription}\n` +
                    `**Tổng roles:** ${stats.total}\n` +
                    `**Bot có thể quản lý:** ${stats.manageable}\n` +
                    `**Bạn có thể assign:** ${stats.assignable}\n` +
                    `**Hiển thị:** ${filteredRoles.size}`,
                inline: false
            });

            // Display roles in compact format to avoid 1024 char limit
            const rolesArray = Array.from(filteredRoles.values());
            const pageSize = 10; // Reduced to fit in 1024 chars
            const totalPages = Math.ceil(rolesArray.length / pageSize);

            for (let page = 0; page < totalPages; page++) {
                const startIndex = page * pageSize;
                const endIndex = Math.min(startIndex + pageSize, rolesArray.length);
                const pageRoles = rolesArray.slice(startIndex, endIndex);

                // Create compact list format
                let rolesList = '';
                pageRoles.forEach((role, index) => {
                    const canManage = role.position < botMember.roles.highest.position;
                    const canAssign = canManage && (role.position < userMember.roles.highest.position || guild.ownerId === message.author.id);
                    
                    const statusIcon = canAssign ? '✅' : canManage ? '⚠️' : '❌';
                    const memberCount = role.members.size;
                    const position = startIndex + index + 1;
                    
                    // Truncate role name if too long
                    let roleName = role.name;
                    if (roleName.length > 25) {
                        roleName = roleName.substring(0, 22) + '...';
                    }
                    
                    // Add compact indicators
                    const indicators = [];
                    if (role.hoist) indicators.push('📌');
                    if (role.managed) indicators.push('🤖');
                    if (role.permissions.has('Administrator')) indicators.push('👑');
                    const infoStr = indicators.join('');
                    
                    rolesList += `\`${position.toString().padStart(2)}\` ${statusIcon} **${roleName}** \`${memberCount}\` ${infoStr}\n`;
                });

                const fieldName = totalPages === 1 
                    ? `🏷️ Roles (${rolesArray.length} total)`
                    : `🏷️ Roles - Trang ${page + 1}/${totalPages}`;

                embed.addFields({
                    name: fieldName,
                    value: rolesList || 'Không có role nào',
                    inline: false
                });
            }

            // Add legend and bot info
            const botHighestRole = botMember.roles.highest;
            const botPosition = botHighestRole.position;
            
            embed.addFields({
                name: '📖 Chú thích & Bot Info',
                value: 
                    '**Status:** ✅ Có thể assign | ⚠️ Bot quản lý được | ❌ Không có quyền\n' +
                    '**Icons:** 📌 Hoisted | 🤖 Bot role | 👑 Admin | \\`số\\` Members\n' +
                    `**Bot Role:** ${botHighestRole} (vị trí ${botPosition})\n` +
                    `**Bot có thể quản lý:** Roles có vị trí < ${botPosition}`,
                inline: false
            });

            // Add filter options and hierarchy guide
            embed.addFields(
                {
                    name: '🔍 Filters có sẵn',
                    value: 
                        '• `manageable` - Roles bot có thể quản lý\n' +
                        '• `assignable` - Roles bạn có thể assign\n' +
                        '• `hoisted` - Roles hiển thị riêng\n' +
                        '• `mentionable` - Roles có thể mention\n' +
                        '• `colored` - Roles có màu\n' +
                        '• `bot` - Roles của bot\n' +
                        '• `dangerous` - Roles có quyền admin',
                    inline: true
                },
                {
                    name: '🏗️ Role Hierarchy Guide',
                    value: 
                        '**Để bot assign được role cao:**\n' +
                        '1. Vào Server Settings → Roles\n' +
                        '2. Kéo bot role lên trên VIP roles\n' +
                        '3. Bot role phải cao hơn roles muốn cấp\n' +
                        '4. Vị trí càng cao = số càng lớn',
                    inline: true
                }
            );

            await message.reply({ embeds: [embed] });

        } catch (error) {
            console.error('Error in listroles command:', error);
            await message.reply(`❌ Lỗi khi lấy danh sách roles: ${error.message}`);
        }
    },

    getRoleStats(allRoles, botMember, userMember, guild) {
        const total = allRoles.size - 1; // Exclude @everyone
        let manageable = 0;
        let assignable = 0;

        allRoles.forEach(role => {
            if (role.id === guild.id) return; // Skip @everyone
            
            if (role.position < botMember.roles.highest.position) {
                manageable++;
                if (role.position < userMember.roles.highest.position || guild.ownerId === userMember.id) {
                    assignable++;
                }
            }
        });

        return { total, manageable, assignable };
    }
}; 