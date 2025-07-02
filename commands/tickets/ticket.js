const { PermissionFlagsBits, ChannelType, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { hasFlexiblePermission } = require('../../utils/permissions');
const embedFactory = require('../../utils/embeds');
const logger = require('../../utils/logger');

// Helper function để check ticket staff permissions
async function hasTicketStaffPermission(member, client) {
    // Administrator luôn có quyền
    const isAdmin = await hasFlexiblePermission(member, 'ticket', 'admin', member.guild.id);
    if (isAdmin) {
        return true;
    }
    
    try {
        // Lấy ticket staff roles từ database
        const guildSettings = await client.prisma.guildSettings.findUnique({
            where: { guildId: member.guild.id }
        });
        
        // Nếu chưa setup staff roles, chỉ admin mới có quyền
        if (!guildSettings || !guildSettings.ticketStaffRoles) {
            return false;
        }
        
        // Check xem member có một trong các staff roles không
        const staffRoleIds = guildSettings.ticketStaffRoles.split(',');
        return member.roles.cache.some(role => staffRoleIds.includes(role.id));
        
    } catch (error) {
        console.error('Lỗi khi check ticket staff permission:', error);
        return false;
    }
}

module.exports = {
    name: 'ticket',
    aliases: ['tickets', 'support'],
    description: 'Hệ thống ticket hỗ trợ khách hàng',
    usage: '!ticket [create|close|add|remove|setup] [options]',
    examples: [
        '!ticket create Bug trong bot',
        '!ticket close Đã giải quyết',
        '!ticket add @user',
        '!ticket setup #support-category'
    ],
    permissions: 'member',
    guildOnly: true,
    category: 'tickets',
    
    async execute(message, args, client) {
        const subcommand = args[0]?.toLowerCase();
        
        if (!subcommand) {
            return this.showHelp(message);
        }
        
        // Check if the command is being used in a DM
        if (!message.guild && subcommand !== 'help') {
            return message.reply({ embeds: [embedFactory.error('Lỗi!', 'Lệnh này chỉ có thể sử dụng trong server!')] });
        }
        
        switch (subcommand) {
            case 'create':
                return this.createTicket(message, args.slice(1), client);
            case 'close':
                return this.closeTicket(message, args.slice(1), client);
            case 'add':
                return this.addUser(message, args.slice(1), client);
            case 'remove':
                return this.removeUser(message, args.slice(1), client);
            case 'setup':
                return this.setupTickets(message, args.slice(1), client);
            case 'setroles':
                return this.setupStaffRoles(message, args.slice(1), client);
            case 'settings':
                return this.showSettings(message, client);
            case 'list':
                return this.listTickets(message, client);
            default:
                return this.showHelp(message);
        }
    },
    
    async showHelp(message) {
        const embed = embedFactory.help({
            title: '🎫 Hệ thống Ticket',
            description: 'Hệ thống hỗ trợ khách hàng qua ticket',
            categories: [
                {
                    emoji: '📝',
                    name: 'Lệnh cơ bản:',
                    value: '`!ticket create [lý do]` - Tạo ticket mới\n' +
                           '`!ticket close [lý do]` - Đóng ticket\n' +
                           '`!ticket list` - Xem danh sách ticket'
                },
                {
                    emoji: '👥',
                    name: 'Quản lý thành viên:',
                    value: '`!ticket add @user` - Thêm user vào ticket\n' +
                           '`!ticket remove @user` - Xóa user khỏi ticket'
                },
                {
                    emoji: '⚙️',
                    name: 'Cấu hình (Admin):',
                    value: '`!ticket setup #category` - Thiết lập ticket system\n' +
                           '`!ticket setroles @role1 @role2` - Setup staff roles\n' +
                           '`!ticket settings` - Xem cấu hình hiện tại'
                }
            ]
        });
        
        await message.reply({ embeds: [embed] });
    },
    
    async createTicket(message, args, client) {
        const reason = args.join(' ') || 'Không có lý do cụ thể';
        
        try {
            // Check if user already has an open ticket
            const existingTicket = await client.prisma.ticket.findFirst({
                where: {
                    userId: message.author.id,
                    guildId: message.guild.id,
                    status: 'open'
                }
            });
            
            if (existingTicket) {
                return message.reply({ embeds: [embedFactory.error('Bạn đã có ticket mở!', `Vui lòng đóng ticket hiện tại (<#${existingTicket.channelId}>) trước khi tạo ticket mới.`)] });
            }
            
            // Get guild settings for ticket configuration
            const guildSettings = await client.prisma.guildSettings.findUnique({
                where: { guildId: message.guild.id }
            });
            
            const ticketCategory = guildSettings?.ticketCategory;
            if (!ticketCategory) {
                return message.reply({ embeds: [embedFactory.error('Chưa cấu hình ticket system!', 'Admin vui lòng dùng `!setup` để thiết lập category cho ticket!')] });
            }
            
            const category = message.guild.channels.cache.get(ticketCategory);
            if (!category || category.type !== ChannelType.GuildCategory) {
                return message.reply({ embeds: [embedFactory.error('Category ticket không tồn tại!', 'Category ticket đã cấu hình không hợp lệ hoặc đã bị xóa. Admin vui lòng cấu hình lại!')] });
            }
            
            // Generate unique ticket ID
            const ticketId = `ticket-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;
            
            // Create ticket channel
            const ticketChannel = await message.guild.channels.create({
                name: `🎫-${message.author.username}`,
                type: ChannelType.GuildText,
                parent: category,
                permissionOverwrites: [
                    {
                        id: message.guild.roles.everyone,
                        deny: [PermissionFlagsBits.ViewChannel]
                    },
                    {
                        id: message.author.id,
                        allow: [
                            PermissionFlagsBits.ViewChannel,
                            PermissionFlagsBits.SendMessages,
                            PermissionFlagsBits.ReadMessageHistory
                        ]
                    },
                    {
                        id: message.guild.members.me.id,
                        allow: [
                            PermissionFlagsBits.ViewChannel,
                            PermissionFlagsBits.SendMessages,
                            PermissionFlagsBits.ManageChannels
                        ]
                    }
                ],
                reason: `Ticket created by ${message.author.tag}: ${reason}`
            });
            
            // Add staff permissions 
            // Luôn add quyền cho admin roles
            const adminRoles = guildSettings.adminRoles?.split(',') || []; // Use configured admin roles
            for (const roleId of adminRoles) {
                const role = message.guild.roles.cache.get(roleId.trim());
                if (role) {
                    await ticketChannel.permissionOverwrites.create(role, {
                        ViewChannel: true,
                        SendMessages: true,
                        ReadMessageHistory: true
                    });
                }
            }
            
            // Add quyền cho support role nếu có
            if (guildSettings.supportRole) {
                const supportRole = message.guild.roles.cache.get(guildSettings.supportRole);
                if (supportRole) {
                    await ticketChannel.permissionOverwrites.create(supportRole, {
                        ViewChannel: true,
                        SendMessages: true,
                        ReadMessageHistory: true
                    });
                }
            }
            
            // Save ticket to database
            await client.prisma.ticket.create({
                data: {
                    ticketId: ticketId,
                    guildId: message.guild.id,
                    channelId: ticketChannel.id,
                    userId: message.author.id,
                    category: 'general',
                    reason: reason,
                    createdBy: message.author.id,
                    status: 'open'
                }
            });
            
            // Create ticket embed
            const ticketEmbed = new EmbedBuilder()
                .setColor(0x00FF00)
                .setTitle('🎫 Ticket được tạo thành công!')
                .setDescription(`**Người tạo:** ${message.author}\n**Lý do:** ${reason}\n**Ticket ID:** \`${ticketId}\``)
                .addFields([
                    {
                        name: '📋 Hướng dẫn:',
                        value: '• Staff sẽ sớm hỗ trợ bạn\n• Dùng `!ticket close` để đóng ticket\n• Giữ lịch sự và mô tả rõ vấn đề',
                        inline: false
                    }
                ])
                .setTimestamp()
                .setFooter({ text: 'Ticket System', iconURL: client.user.displayAvatarURL() });
            
            // Control buttons
            const row = new ActionRowBuilder()
                .addComponents(
                    new ButtonBuilder()
                        .setCustomId('ticket_close')
                        .setLabel('🔒 Đóng Ticket')
                        .setStyle(ButtonStyle.Danger),
                    new ButtonBuilder()
                        .setCustomId('ticket_claim')
                        .setLabel('🙋 Nhận Ticket')
                        .setStyle(ButtonStyle.Primary),
                    new ButtonBuilder()
                        .setCustomId('ticket_transcript')
                        .setLabel('📄 Xuất Log')
                        .setStyle(ButtonStyle.Secondary)
                );
            
            await ticketChannel.send({
                embeds: [ticketEmbed],
                components: [row]
            });
            
            // Confirm to user
            await message.reply({ embeds: [embedFactory.success('Đã tạo ticket thành công!', `Ticket của bạn đã được tạo tại ${ticketChannel}.\n**ID:** \`${ticketId}\`\n**Lý do:** ${reason}`)] });
            
            // Ping staff in ticket channel
            let pingMessage = `@here`;
            if (guildSettings.supportRole) {
                pingMessage = `<@&${guildSettings.supportRole}>`;
            }
            await ticketChannel.send(`${pingMessage} **Ticket mới:** ${reason}`);
            
        } catch (error) {
            logger.error('Lỗi khi tạo ticket:', error);
            await message.reply({ embeds: [embedFactory.error('Lỗi!', 'Không thể tạo ticket!')] });
        }
    },
    
    async closeTicket(message, args, client) {
        const reason = args.join(' ') || 'Đã giải quyết';
        
        try {
            // Check if current channel is a ticket
            const ticket = await client.prisma.ticket.findFirst({
                where: {
                    channelId: message.channel.id,
                    guildId: message.guild.id,
                    status: 'open'
                }
            });
            
            if (!ticket) {
                return message.reply({ embeds: [embedFactory.error('Không tìm thấy ticket!', 'Đây không phải là ticket channel hoặc ticket đã đóng!')] });
            }
            
            // Check permissions to close
            const canClose = ticket.userId === message.author.id || 
                           await hasTicketStaffPermission(message.member, client);
            
            if (!canClose) {
                return message.reply({ embeds: [embedFactory.error('Không đủ quyền!', 'Chỉ người tạo ticket hoặc staff mới có thể đóng!')] });
            }
            
            // Update ticket status
            await client.prisma.ticket.update({
                where: { id: ticket.id },
                data: {
                    status: 'closed',
                    closedBy: message.author.id,
                    closedAt: new Date()
                }
            });
            
            // Close embed
            const closeEmbed = embedFactory.info(
                '🔒 Ticket đã đóng',
                `**Đóng bởi:** ${message.author}\n**Lý do:** ${reason}`
            );
            
            await message.channel.send({ embeds: [closeEmbed] });
            
            // Delete channel after 10 seconds
            setTimeout(async () => {
                try {
                    await message.channel.delete(`Ticket closed by ${message.author.tag}: ${reason}`);
                } catch (error) {
                    logger.error('Lỗi khi xóa ticket channel:', error);
                }
            }, 10000);
            
        } catch (error) {
            logger.error('Lỗi khi đóng ticket:', error);
            await message.reply({ embeds: [embedFactory.error('Lỗi!', 'Không thể đóng ticket!')] });
        }
    },
    
    async addUser(message, args, client) {
        // Check if current channel is a ticket
        const ticket = await client.prisma.ticket.findFirst({
            where: {
                channelId: message.channel.id,
                guildId: message.guild.id,
                status: 'open'
            }
        });
        
        if (!ticket) {
            return message.reply({ embeds: [embedFactory.error('Không tìm thấy ticket!', 'Đây không phải là ticket channel!')] });
        }
        
        // Check permissions
        const hasStaffPermission = await hasTicketStaffPermission(message.member, client);
        if (!hasStaffPermission) {
            return message.reply({ embeds: [embedFactory.error('Không đủ quyền!', 'Chỉ ticket staff mới có thể thêm user vào ticket!')] });
        }
        
        const targetUser = message.mentions.users.first();
        if (!targetUser) {
            return message.reply({ embeds: [embedFactory.error('Thiếu thông tin!', 'Vui lòng mention user cần thêm!')] });
        }
        
        try {
            const targetMember = await message.guild.members.fetch(targetUser.id);
            
            await message.channel.permissionOverwrites.create(targetMember, {
                ViewChannel: true,
                SendMessages: true,
                ReadMessageHistory: true
            });
            
            await message.reply({ embeds: [embedFactory.success('Đã thêm user!', `Đã thêm ${targetUser} vào ticket!`)] });
            
        } catch (error) {
            logger.error('Lỗi khi thêm user:', error);
            await message.reply({ embeds: [embedFactory.error('Lỗi!', 'Không thể thêm user vào ticket!')] });
        }
    },
    
    async removeUser(message, args, client) {
        // Similar to addUser but remove permissions
        const ticket = await client.prisma.ticket.findFirst({
            where: {
                channelId: message.channel.id,
                guildId: message.guild.id,
                status: 'open'
            }
        });
        
        if (!ticket) {
            return message.reply({ embeds: [embedFactory.error('Không tìm thấy ticket!', 'Đây không phải là ticket channel!')] });
        }
        
        const hasStaffPermission = await hasTicketStaffPermission(message.member, client);
        if (!hasStaffPermission) {
            return message.reply({ embeds: [embedFactory.error('Không đủ quyền!', 'Chỉ ticket staff mới có thể xóa user khỏi ticket!')] });
        }
        
        const targetUser = message.mentions.users.first();
        if (!targetUser) {
            return message.reply({ embeds: [embedFactory.error('Thiếu thông tin!', 'Vui lòng mention user cần xóa!')] });
        }
        
        if (targetUser.id === ticket.userId) {
            return message.reply({ embeds: [embedFactory.error('Không thể thực hiện!', 'Không thể xóa người tạo ticket!')] });
        }
        
        try {
            await message.channel.permissionOverwrites.delete(targetUser.id);
            await message.reply({ embeds: [embedFactory.success('Đã xóa user!', `Đã xóa ${targetUser} khỏi ticket!`)] });
            
        } catch (error) {
            logger.error('Lỗi khi xóa user:', error);
            await message.reply({ embeds: [embedFactory.error('Lỗi!', 'Không thể xóa user khỏi ticket!')] });
        }
    },
    
    async setupTickets(message, args, client) {
        // Check permissions
        const isAdmin = await hasFlexiblePermission(message.member, 'ticket', 'admin', message.guild.id);
        if (!isAdmin) {
            return message.reply({ embeds: [embedFactory.error('Không đủ quyền!', 'Bạn cần quyền **Administrator** để setup ticket system!')] });
        }
        
        if (!args[0]) {
            return message.reply({ embeds: [embedFactory.error('Thiếu thông tin!', 'Vui lòng cung cấp category cho tickets!\n\n**Cách dùng:** `!ticket setup #category`')] });
        }
        // Cách tốt hơn để parse category mention
        let categoryChannel = message.mentions.channels.first();
        
        // Nếu không tìm thấy qua mentions, thử parse ID từ string
        if (!categoryChannel) {
            const categoryMatch = args[0].match(/<#(\d+)>/) || args[0].match(/^(\d+)$/);
            if (categoryMatch) {
                const categoryId = categoryMatch[1];
                categoryChannel = message.guild.channels.cache.get(categoryId);
            }
        }
        
        // Nếu vẫn không tìm thấy, thử tìm theo tên
        if (!categoryChannel) {
            const categoryName = args[0].replace('#', '').trim();
            categoryChannel = message.guild.channels.cache.find(ch => 
                ch.type === ChannelType.GuildCategory && 
                ch.name.toLowerCase() === categoryName.toLowerCase()
            );
        }
        
        if (!categoryChannel || categoryChannel.type !== ChannelType.GuildCategory) {
            return message.reply({ embeds: [embedFactory.error('Kênh không hợp lệ!', 'Vui lòng mention một category channel hợp lệ!\n\n**Các cách sử dụng:**\n• `!ticket setup #category-name`\n• `!ticket setup category-name`\n• `!ticket setup 123456789012345678` (ID)')] });
        }
        
        try {
            await client.prisma.guildSettings.upsert({
                where: { guildId: message.guild.id },
                update: { ticketCategory: categoryChannel.id },
                create: {
                    guildId: message.guild.id,
                    ticketCategory: categoryChannel.id
                }
            });
            
            await message.reply({ embeds: [embedFactory.success('Đã cấu hình ticket system thành công!', `📂 **Category:** ${categoryChannel}\n💡 **Tip:** Thành viên có thể dùng \`!ticket create\` để tạo ticket mới!`)] });
            
        } catch (error) {
            logger.error('Lỗi khi setup tickets:', error);
            await message.reply({ embeds: [embedFactory.error('Lỗi!', 'Không thể cấu hình ticket system!')] });
        }
    },
    
    async setupStaffRoles(message, args, client) {
        // Check permissions
        const isAdmin = await hasFlexiblePermission(message.member, 'ticket', 'admin', message.guild.id);
        if (!isAdmin) {
            return message.reply({ embeds: [embedFactory.error('Không đủ quyền!', 'Bạn cần quyền **Administrator** để setup staff roles!')] });
        }
        
        if (args.length === 0) {
            return message.reply({ embeds: [embedFactory.error('Thiếu thông tin!', 'Vui lòng mention các roles cho ticket staff!\n\n**Cách dùng:** `!ticket setroles @Staff @Moderator @Admin`\n**Hoặc:** `!ticket setroles clear` để xóa tất cả roles')] });
        }
        
        if (args[0].toLowerCase() === 'clear') {
            try {
                await client.prisma.guildSettings.upsert({
                    where: { guildId: message.guild.id },
                    update: { ticketStaffRoles: null },
                    create: {
                        guildId: message.guild.id,
                        ticketStaffRoles: null
                    }
                });
                
                return message.reply({ embeds: [embedFactory.success('Đã xóa tất cả ticket staff roles!', 'Bây giờ chỉ Administrator mới có thể handle tickets!')] });
            } catch (error) {
                logger.error('Lỗi khi xóa ticket staff roles:', error);
                return message.reply({ embeds: [embedFactory.error('Lỗi!', 'Không thể xóa ticket staff roles!')] });
            }
        }
        
        // Parse roles từ mentions và tên
        const mentionedRoles = message.mentions.roles;
        const roleNames = args.filter(arg => !arg.startsWith('<@&')); // Lọc ra tên roles không phải mention
        
        const allRoles = [...mentionedRoles.values()];
        
        // Thêm roles theo tên
        for (const roleName of roleNames) {
            const role = message.guild.roles.cache.find(r => 
                r.name.toLowerCase() === roleName.toLowerCase()
            );
            if (role && !allRoles.includes(role)) {
                allRoles.push(role);
            }
        }
        
        if (allRoles.length === 0) {
            return message.reply({ embeds: [embedFactory.error('Không tìm thấy role nào!', 'Vui lòng mention các role hợp lệ hoặc cung cấp ID role.\n\n**Hướng dẫn:**\n• `!ticket setroles @Staff @Moderator` - Mention roles\n• `!ticket setroles Staff Moderator` - Ghi tên roles\n• `!ticket setroles @Staff Moderator Admin` - Kết hợp cả 2')] });
        }
        
        try {
            // Lưu role IDs vào database
            const roleIds = allRoles.map(role => role.id).join(',');
            
            await client.prisma.guildSettings.upsert({
                where: { guildId: message.guild.id },
                update: { ticketStaffRoles: roleIds },
                create: {
                    guildId: message.guild.id,
                    ticketStaffRoles: roleIds
                }
            });
            
            // Giới hạn hiển thị tối đa 10 role để tránh embed quá lớn
            const roleList = allRoles.slice(0, 10).map(role => `• ${role}`).join('\n');
            const moreRoles = allRoles.length > 10 ? `\n\n*...và ${allRoles.length - 10} role khác*` : '';
            
            await message.reply({ embeds: [embedFactory.success('Đã cấu hình ticket staff roles thành công!', `**Roles được phép handle tickets:**\n${roleList}${moreRoles}\n\n💡 **Lưu ý:** Chỉ những người có một trong các roles này hoặc Administrator mới có thể:\n• Claim tickets (🙋 Nhận Ticket)\n• Đóng tickets (🔒 Đóng Ticket)\n• Xuất transcript (📄 Xuất Log)\n• Thêm/xóa user khỏi tickets`)] });                    } catch (error) {            logger.error('Lỗi khi setup ticket staff roles:', error);            await message.reply({ embeds: [embedFactory.error('Lỗi!', 'Không thể cấu hình ticket staff roles!')] });        }
    },
    
    async showSettings(message, client) {
        try {
            const guildSettings = await client.prisma.guildSettings.findUnique({
                where: { guildId: message.guild.id }
            });
            
            const embed = embedFactory.info(
                '⚙️ Cấu hình Ticket System',
                ''
            );
            
            if (!guildSettings || (!guildSettings.ticketCategory && !guildSettings.ticketStaffRoles && !guildSettings.supportRole)) {
                embed.setDescription('❌ **Chưa có cấu hình nào!**\n' +
                    'Dùng `!setup` để bắt đầu cấu hình ticket system!');
                return message.reply({ embeds: [embed] });
            }
            
            // Category info
            let categoryInfo = '❌ Chưa setup';
            if (guildSettings.ticketCategory) {
                const category = message.guild.channels.cache.get(guildSettings.ticketCategory);
                categoryInfo = category ? `✅ ${category}` : '❌ Category không tồn tại';
            }

            // Support Role info
            let supportRoleInfo = '❌ Chưa setup';
            if (guildSettings.supportRole) {
                const supportRole = message.guild.roles.cache.get(guildSettings.supportRole);
                supportRoleInfo = supportRole ? `✅ ${supportRole}` : '❌ Role hỗ trợ không tồn tại';
            }
            
            // Staff roles info
            let staffRolesInfo = '❌ Chưa setup (chỉ Administrator)';
            if (guildSettings.ticketStaffRoles) {
                const roleIds = guildSettings.ticketStaffRoles.split(',');
                const roles = roleIds.map(id => message.guild.roles.cache.get(id)).filter(Boolean);
                
                if (roles.length > 0) {
                    // Giới hạn hiển thị tối đa 5 role để tránh embed quá lớn
                    const displayRoles = roles.slice(0, 5);
                    const moreText = roles.length > 5 ? ` *+${roles.length - 5} khác*` : '';
                    
                    staffRolesInfo = `✅ ${displayRoles.join(' ')}${moreText}\n` +
                        `📊 **Tổng:** ${roles.length} roles`;
                } else {
                    staffRolesInfo = '❌ Roles không tồn tại';
                }
            }
            
            embed.addFields([
                {
                    name: '📂 Category Ticket',
                    value: categoryInfo,
                    inline: false
                },
                {
                    name: '👥 Role Hỗ trợ (Ping)',
                    value: supportRoleInfo,
                    inline: false
                },
                {
                    name: '🛠️ Role Staff Ticket',
                    value: staffRolesInfo,
                    inline: false
                },
                {
                    name: '📋 Hướng dẫn',
                    value: '• Dùng `!setup` để cấu hình ticket system\n' +
                           '• `!ticket setroles @role1 @role2` - Setup staff roles\n' +
                           '• `!ticket setroles clear` - Xóa tất cả staff roles',
                    inline: false
                }
            ]);
            
            await message.reply({ embeds: [embed] });
            
        } catch (error) {
            logger.error('Lỗi khi lấy ticket settings:', error);
            await message.reply({ embeds: [embedFactory.error('Lỗi!', 'Không thể lấy cấu hình ticket!')] });
        }
    },
    
    async listTickets(message, client) {
        try {
            const tickets = await client.prisma.ticket.findMany({
                where: {
                    guildId: message.guild.id,
                    status: 'open'
                },
                orderBy: { createdAt: 'desc' },
                take: 10
            });
            
            if (tickets.length === 0) {
                return message.reply({ embeds: [embedFactory.info('Không có ticket nào!', '📝 **Không có ticket nào đang mở!**')] });
            }
            
            const embed = embedFactory.info(
                `🎫 Danh sách Ticket (${tickets.length})`,
                tickets.map(ticket => {
                    const user = message.guild.members.cache.get(ticket.userId);
                    return `🎫 <#${ticket.channelId}> - ${user ? user.user.tag : 'Unknown'} (<t:${Math.floor(ticket.createdAt.getTime() / 1000)}:R>)`;
                }).join('\n')
            );
            
            await message.reply({ embeds: [embed] });
            
        } catch (error) {
            logger.error('Lỗi khi lấy danh sách tickets:', error);
            await message.reply({ embeds: [embedFactory.error('Lỗi!', 'Không thể lấy danh sách tickets!')] });
        }
    }
}; 