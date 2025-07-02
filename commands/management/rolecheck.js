const { EmbedBuilder } = require('discord.js');

module.exports = {
    name: 'rolecheck',
    aliases: ['checkrole', 'hierarchy', 'rc'],
    description: 'Kiểm tra role hierarchy và đưa ra hướng dẫn fix bot permissions',
    usage: '!rolecheck [role_name]',
    examples: [
        '!rolecheck',
        '!rc VIP 8',
        '!hierarchy'
    ],
    permissions: 'admin',
    guildOnly: true,
    category: 'management',

    async execute(message, args, client) {
        try {
            const guild = message.guild;
            const botMember = guild.members.me;
            const botHighestRole = botMember.roles.highest;

            // If specific role provided, check that role
            if (args.length > 0) {
                const roleName = args.join(' ');
                const targetRole = guild.roles.cache.find(r => 
                    r.name.toLowerCase().includes(roleName.toLowerCase())
                );

                if (!targetRole) {
                    return message.reply(`❌ Không tìm thấy role với tên: **${roleName}**`);
                }

                return this.checkSpecificRole(message, targetRole, botMember, botHighestRole);
            }

            // General hierarchy check
            const allRoles = guild.roles.cache.sort((a, b) => b.position - a.position);
            const problemRoles = allRoles.filter(role => 
                role.id !== guild.id && // Not @everyone
                role.position >= botHighestRole.position && // Higher or equal to bot
                !role.managed // Not bot/integration roles
            );

            const vipRoles = allRoles.filter(role => 
                role.name.toLowerCase().includes('vip') ||
                role.name.toLowerCase().includes('premium') ||
                role.name.toLowerCase().includes('booster')
            );

            const embed = new EmbedBuilder()
                .setTitle('🏗️ Role Hierarchy Check')
                .setColor(problemRoles.size > 0 ? 0xe74c3c : 0x2ecc71)
                .setThumbnail(guild.iconURL())
                .setTimestamp();

            // Bot info
            embed.addFields({
                name: '🤖 Bot Information',
                value: 
                    `**Bot Role:** ${botHighestRole}\n` +
                    `**Vị trí:** ${botHighestRole.position}\n` +
                    `**Có thể quản lý:** ${allRoles.filter(r => r.position < botHighestRole.position && r.id !== guild.id).size} roles`,
                inline: true
            });

            // Problem roles
            if (problemRoles.size > 0) {
                const problemList = problemRoles.map(role => 
                    `• ${role} (vị trí ${role.position})`
                ).slice(0, 10).join('\n');

                embed.addFields({
                    name: `❌ Roles bot KHÔNG thể quản lý (${problemRoles.size})`,
                    value: problemList + (problemRoles.size > 10 ? '\n*...và nhiều hơn*' : ''),
                    inline: true
                });
            }

            // VIP roles status
            if (vipRoles.length > 0) {
                const vipList = vipRoles.map(role => {
                    const canManage = role.position < botHighestRole.position;
                    const status = canManage ? '✅' : '❌';
                    return `${status} ${role} (${role.position})`;
                }).slice(0, 8).join('\n');

                embed.addFields({
                    name: '🌟 VIP/Premium Roles Status',
                    value: vipList,
                    inline: false
                });
            }

            // Solution guide
            if (problemRoles.size > 0) {
                embed.addFields({
                    name: '🔧 Cách khắc phục',
                    value: 
                        '**Bước 1:** Vào Server Settings → Roles\n' +
                        '**Bước 2:** Tìm bot role trong danh sách\n' +
                        '**Bước 3:** Kéo thả bot role lên trên tất cả VIP roles\n' +
                        '**Bước 4:** Chạy `!rolecheck` để kiểm tra lại\n' +
                        '\n**Lưu ý:** Bot role phải có vị trí cao hơn roles muốn quản lý',
                    inline: false
                });

                embed.addFields({
                    name: '💡 Tips',
                    value: 
                        '• Vị trí role càng cao = số vị trí càng lớn\n' +
                        '• Bot không thể quản lý roles cao hơn hoặc bằng nó\n' +
                        '• Owner server có thể assign bất kỳ role nào\n' +
                        '• Dùng `!lr assignable` để xem roles có thể assign',
                    inline: false
                });
            } else {
                embed.addFields({
                    name: '✅ Hierarchy Status',
                    value: 
                        '**Tuyệt vời!** Bot có thể quản lý tất cả roles cần thiết.\n' +
                        'Bạn có thể sử dụng `!temprole` với mọi role được hiển thị.',
                    inline: false
                });
            }

            await message.reply({ embeds: [embed] });

        } catch (error) {
            console.error('Error in rolecheck command:', error);
            await message.reply(`❌ Lỗi khi kiểm tra roles: ${error.message}`);
        }
    },

    async checkSpecificRole(message, targetRole, botMember, botHighestRole) {
        const canManage = targetRole.position < botHighestRole.position;
        const canUserAssign = targetRole.position < message.member.roles.highest.position || 
                             message.guild.ownerId === message.author.id;

        const embed = new EmbedBuilder()
            .setTitle(`🔍 Role Check: ${targetRole.name}`)
            .setColor(canManage ? 0x2ecc71 : 0xe74c3c)
            .setTimestamp();

        embed.addFields(
            {
                name: '📊 Role Information',
                value: 
                    `**Role:** ${targetRole}\n` +
                    `**Vị trí:** ${targetRole.position}\n` +
                    `**Members:** ${targetRole.members.size}\n` +
                    `**Màu:** ${targetRole.hexColor}\n` +
                    `**Hoisted:** ${targetRole.hoist ? 'Có' : 'Không'}\n` +
                    `**Mentionable:** ${targetRole.mentionable ? 'Có' : 'Không'}`,
                inline: true
            },
            {
                name: '🤖 Bot Permissions',
                value: 
                    `**Bot role:** ${botHighestRole} (${botHighestRole.position})\n` +
                    `**Có thể quản lý:** ${canManage ? '✅ Có' : '❌ Không'}\n` +
                    `**Lý do:** ${canManage ? 'Role thấp hơn bot' : 'Role cao hơn/bằng bot'}`,
                inline: true
            },
            {
                name: '👤 Your Permissions',
                value: 
                    `**Highest role:** ${message.member.roles.highest.name}\n` +
                    `**Có thể assign:** ${canUserAssign ? '✅ Có' : '❌ Không'}\n` +
                    `**Với temprole:** ${canManage && canUserAssign ? '✅ Có thể dùng' : '❌ Không thể dùng'}`,
                inline: false
            }
        );

        if (!canManage) {
            const higherRoles = message.guild.roles.cache.filter(r => 
                r.position >= targetRole.position && r.position < botHighestRole.position
            ).size;

            embed.addFields({
                name: '🔧 Cách khắc phục',
                value: 
                    `**Để bot có thể quản lý role này:**\n` +
                    `1. Vào Server Settings → Roles\n` +
                    `2. Kéo bot role lên trên **${targetRole.name}**\n` +
                    `3. Bot role cần vị trí > ${targetRole.position}\n` +
                    `4. Có ${higherRoles} roles cần di chuyển`,
                inline: false
            });
        }

        await message.reply({ embeds: [embed] });
    }
}; 