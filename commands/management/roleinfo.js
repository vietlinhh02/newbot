const { EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const embedFactory = require('../../utils/embeds');

module.exports = {
    name: 'roleinfo',
    aliases: ['role', 'ri'],
    description: 'Hiển thị thông tin chi tiết về vai trò',
    usage: '!roleinfo [@role|role_name|role_id]',
    examples: [
        '!roleinfo @Moderator',
        '!roleinfo Admin',
        '!role 123456789',
        '!ri Staff'
    ],
    permissions: 'member',
    guildOnly: true,
    category: 'management',
    
    async execute(message, args, client) {
        // Initialize embed factory
        embedFactory.setClient(client);
        
        try {
            if (!args[0]) {
                return message.reply('❌ **Thiếu thông tin!** Vui lòng cung cấp vai trò cần xem!\n' +
                    '**Cách dùng:** `!roleinfo [@role|role_name|role_id]`\n' +
                    '**Ví dụ:** `!roleinfo @Moderator`');
            }
            
            let targetRole = null;
            
            // Try to get mentioned role
            if (message.mentions.roles.first()) {
                targetRole = message.mentions.roles.first();
            } else {
                // Try to find by name or ID
                const query = args.join(' ').toLowerCase();
                const roleId = args[0].replace(/[<@&>]/g, '');
                
                // First try by ID
                targetRole = message.guild.roles.cache.get(roleId);
                
                // If not found, try by name (case insensitive)
                if (!targetRole) {
                    targetRole = message.guild.roles.cache.find(role => 
                        role.name.toLowerCase().includes(query) || 
                        role.name.toLowerCase() === query
                    );
                }
            }
            
            if (!targetRole) {
                const embed = embedFactory.error('Không tìm thấy vai trò', 'Vai trò không tồn tại hoặc không hợp lệ!', null, message.author);
            return message.reply({ embeds: [embed] });
            }
            
            // Role creation date
            const createdAt = Math.floor(targetRole.createdTimestamp / 1000);
            
            // Count members with this role
            const memberCount = targetRole.members.size;
            
            // Get permissions
            const permissions = targetRole.permissions.toArray();
            
            // Categorize important permissions
            const adminPerms = permissions.filter(perm => 
                ['Administrator', 'ManageGuild', 'ManageChannels', 'ManageRoles'].includes(perm)
            );
            
            const moderationPerms = permissions.filter(perm => 
                ['BanMembers', 'KickMembers', 'ModerateMembers', 'ManageMessages'].includes(perm)
            );
            
            const generalPerms = permissions.filter(perm => 
                !adminPerms.includes(perm) && !moderationPerms.includes(perm)
            );
            
            // Permission names in Vietnamese
            const permissionNames = {
                'Administrator': '👑 Quản trị viên',
                'ManageGuild': '⚙️ Quản lý Server',
                'ManageChannels': '📺 Quản lý Kênh',
                'ManageRoles': '🎭 Quản lý Vai trò',
                'BanMembers': '🔨 Ban thành viên',
                'KickMembers': '👢 Kick thành viên',
                'ModerateMembers': '🔇 Moderate thành viên',
                'ManageMessages': '💬 Quản lý Tin nhắn',
                'ViewChannel': '👁️ Xem kênh',
                'SendMessages': '📝 Gửi tin nhắn',
                'ReadMessageHistory': '📖 Đọc lịch sử',
                'UseExternalEmojis': '😀 Dùng emoji ngoài',
                'AddReactions': '👍 Thêm reaction',
                'AttachFiles': '📎 Đính kèm file',
                'EmbedLinks': '🔗 Nhúng link',
                'MentionEveryone': '📢 Mention Everyone',
                'Connect': '🔊 Kết nối voice',
                'Speak': '🎤 Nói trong voice'
            };
            
            const embed = new EmbedBuilder()
                .setTitle(`🎭 Thông tin vai trò: ${targetRole.name}`)
                .setColor(targetRole.color || 0x99AAB5)
                .addFields([
                    {
                        name: '🆔 Thông tin chung',
                        value: [
                            `**Tên:** ${targetRole.name}`,
                            `**ID:** \`${targetRole.id}\``,
                            `**Màu:** ${targetRole.hexColor}`,
                            `**Tạo lúc:** <t:${createdAt}:F>`,
                            `**Thành viên:** ${memberCount.toLocaleString()}`
                        ].join('\n'),
                        inline: true
                    },
                    {
                        name: '⚙️ Thuộc tính',
                        value: [
                            `**Hiển thị riêng:** ${targetRole.hoist ? 'Có' : 'Không'}`,
                            `**Có thể mention:** ${targetRole.mentionable ? 'Có' : 'Không'}`,
                            `**Quản lý bởi bot:** ${targetRole.managed ? 'Có' : 'Không'}`,
                            `**Vị trí:** ${targetRole.position}/${message.guild.roles.cache.size - 1}`
                        ].join('\n'),
                        inline: true
                    }
                ]);
            
            // Add admin permissions if any
            if (adminPerms.length > 0) {
                embed.addFields([{
                    name: '⚡ Quyền Quản trị',
                    value: adminPerms.map(perm => permissionNames[perm] || perm).join('\n'),
                    inline: true
                }]);
            }
            
            // Add moderation permissions if any
            if (moderationPerms.length > 0) {
                embed.addFields([{
                    name: '🛡️ Quyền Moderation',
                    value: moderationPerms.map(perm => permissionNames[perm] || perm).join('\n'),
                    inline: true
                }]);
            }
            
            // Add some members with this role (max 5 để tránh embed quá lớn)
            if (memberCount > 0 && memberCount <= 15) {
                const roleMembers = targetRole.members.first(5);
                const memberNames = roleMembers.map(member => member.user.tag);
                
                // Tính tổng độ dài để đảm bảo không quá dài
                const totalLength = memberNames.join(', ').length;
                
                if (totalLength <= 200) {
                    embed.addFields([{
                        name: `👥 Thành viên (${memberCount})`,
                        value: memberNames.join(', ') + 
                               (memberCount > 5 ? ` và ${memberCount - 5} người khác...` : ''),
                        inline: false
                    }]);
                } else {
                    embed.addFields([{
                        name: `👥 Thành viên (${memberCount})`,
                        value: `Có ${memberCount} thành viên (tên quá dài để hiển thị)`,
                        inline: false
                    }]);
                }
            } else if (memberCount > 15) {
                embed.addFields([{
                    name: `👥 Thành viên (${memberCount})`,
                    value: 'Quá nhiều thành viên để hiển thị',
                    inline: false
                }]);
            }
            
            // Add role hierarchy info
            const higherRoles = message.guild.roles.cache.filter(r => r.position > targetRole.position).size;
            const lowerRoles = message.guild.roles.cache.filter(r => r.position < targetRole.position && r.id !== message.guild.roles.everyone.id).size;
            
            embed.addFields([{
                name: '📊 Phân cấp',
                value: `**Cao hơn:** ${higherRoles} vai trò\n**Thấp hơn:** ${lowerRoles} vai trò`,
                inline: true
            }]);
            
            embed.setTimestamp()
                .setFooter({ 
                    text: `Role ID: ${targetRole.id}`, 
                    iconURL: message.guild.iconURL({ dynamic: true }) 
                });
            
            await message.reply({ embeds: [embed] });
            
        } catch (error) {
            console.error('Lỗi khi lấy thông tin role:', error);
            await message.reply('❌ **Lỗi!** Không thể lấy thông tin vai trò!');
        }
    }
}; 