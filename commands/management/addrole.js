const { PermissionFlagsBits } = require('discord.js');
const { hasFlexiblePermission } = require('../../utils/permissions');
const embedFactory = require('../../utils/embeds');

module.exports = {
    name: 'addrole',
    aliases: ['giverole', 'ar'],
    description: 'Thêm role cho người dùng',
    usage: '!addrole [@user] [@role|role_name] [reason]',
    examples: [
        '!addrole @John @Member',
        '!addrole @user Helper Promoted to helper',
        '!ar 123456789 @VIP Premium member'
    ],
    permissions: 'admin',
    guildOnly: true,
    category: 'management',
    
    async execute(message, args, client) {
        // Initialize embed factory
        embedFactory.setClient(client);
        
        // Check permissions
        if (!await hasFlexiblePermission(message.member, 'addrole', this.permissions, message.guild.id)) {
            const embed = embedFactory.error('Không đủ quyền', 'Bạn cần quyền **Manage Roles** để thêm role!', null, message.author);
            return message.reply({ embeds: [embed] });
        }
        
        // Check bot permissions
        if (!message.guild.members.me.permissions.has(PermissionFlagsBits.ManageRoles)) {
            return message.reply('❌ Bot cần quyền **Manage Roles** để thực hiện lệnh này!');
        }
        
        // Check arguments
        if (!args[0] || !args[1]) {
            return message.reply('❌ **Thiếu thông tin!** Vui lòng cung cấp người dùng và role!\n' +
                '**Cách dùng:** `!addrole [@user] [@role|role_name] [reason]`\n' +
                '**Ví dụ:** `!addrole @John @Member`');
        }
        
        // Parse user
        let targetUser = null;
        let targetMember = null;
        const userMention = message.mentions.users.first();
        const userId = args[0].replace(/[<@!>]/g, '');
        
        if (userMention) {
            targetUser = userMention;
        } else {
            try {
                targetUser = await client.users.fetch(userId);
            } catch (error) {
                const embed = embedFactory.error('Không tìm thấy người dùng', 'Vui lòng mention hoặc cung cấp ID hợp lệ!', null, message.author);
            return message.reply({ embeds: [embed] });
            }
        }
        
        // Get member object
        try {
            targetMember = await message.guild.members.fetch(targetUser.id);
        } catch (error) {
            const embed = embedFactory.error('Người dùng không ở trong server này', 'Người dùng không ở trong server này!', null, message.author);
            return message.reply({ embeds: [embed] });
        }
        
        // Parse role
        let targetRole = null;
        const roleMention = message.mentions.roles.first();
        const roleQuery = args[1].toLowerCase().replace(/[<@&>]/g, '');
        
        if (roleMention) {
            targetRole = roleMention;
        } else {
            // Try to find role by name or ID
            targetRole = message.guild.roles.cache.find(role => 
                role.name.toLowerCase().includes(roleQuery) ||
                role.name.toLowerCase() === roleQuery ||
                role.id === roleQuery
            );
        }
        
        if (!targetRole) {
            const embed = embedFactory.error('Không tìm thấy role', 'Vui lòng mention role hoặc cung cấp tên role hợp lệ!', null, message.author);
            return message.reply({ embeds: [embed] });
        }
        
        // Get reason
        const reason = args.slice(2).join(' ') || 'Không có lý do được cung cấp';
        
        // Security checks
        if (targetRole.id === message.guild.roles.everyone.id) {
            const embed = embedFactory.error('Không thể thêm role @everyone', 'Không thể thêm role @everyone!', null, message.author);
            return message.reply({ embeds: [embed] });
        }
        
        if (targetRole.managed) {
            const embed = embedFactory.error('Không thể thêm role này', 'Role được quản lý bởi bot hoặc integration!', null, message.author);
            return message.reply({ embeds: [embed] });
        }
        
        // Check role hierarchy
        if (targetRole.position >= message.member.roles.highest.position && 
            message.guild.ownerId !== message.author.id) {
            const embed = embedFactory.error('Không thể thêm role này', 'Role cao hơn hoặc bằng role cao nhất của bạn!', null, message.author);
            return message.reply({ embeds: [embed] });
        }
        
        if (targetRole.position >= message.guild.members.me.roles.highest.position) {
            const embed = embedFactory.error('Không thể thêm role này', 'Role cao hơn role cao nhất của bot!', null, message.author);
            return message.reply({ embeds: [embed] });
        }
        
        // Check if user already has the role
        if (targetMember.roles.cache.has(targetRole.id)) {
            return message.reply(`❌ **${targetUser.tag}** đã có role **${targetRole.name}** rồi!`);
        }
        
        try {
            // Add role to user
            await targetMember.roles.add(targetRole, `Role added by ${message.author.tag}: ${reason}`);
            
            // Success message
            await message.reply(`✅ **Đã thêm role ${targetRole.name} cho ${targetUser.tag}**\n` +
                `📝 **Lý do:** ${reason}`);
            
            // Log to moderation channel
            try {
                const guildSettings = await client.prisma.guildSettings.findUnique({
                    where: { guildId: message.guild.id }
                });
                
                if (guildSettings?.logChannel) {
                    const logChannel = message.guild.channels.cache.get(guildSettings.logChannel);
                    
                    if (logChannel) {
                        const logEmbed = createModerationEmbed({
                            action: 'ROLE ADDED',
                            targetUser: targetUser,
                            moderator: message.author,
                            reason: reason,
                            channel: message.channel
                        });
                        
                        logEmbed.addFields([
                            {
                                name: '🎭 Role Info',
                                value: `**Role:** ${targetRole}\n**Color:** ${targetRole.hexColor}\n**Position:** ${targetRole.position}`,
                                inline: true
                            }
                        ]);
                        
                        await logChannel.send({ embeds: [logEmbed] });
                    }
                }
            } catch (logError) {
                console.error('Lỗi khi gửi log:', logError);
            }
            
        } catch (error) {
            console.error('Lỗi khi thêm role:', error);
            
            let errorMessage = 'Đã xảy ra lỗi khi thêm role!';
            
            if (error.code === 50013) {
                errorMessage = 'Bot không có đủ quyền để thêm role này!';
            } else if (error.code === 50001) {
                errorMessage = 'Bot không có quyền truy cập!';
            }
            
            await message.reply(`❌ **Lỗi!** ${errorMessage}`);
        }
    }
}; 