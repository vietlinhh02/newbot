const { EmbedBuilder, PermissionFlagsBits, ChannelType } = require('discord.js');
const { hasFlexiblePermission } = require('../utils/permissions');

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
    name: 'interactionCreate',
    async execute(interaction, client) {
        // Chỉ xử lý button interactions
        if (!interaction.isButton()) return;

        try {
            // Xử lý ticket buttons
            if (interaction.customId.startsWith('ticket_')) {
                await handleTicketButtons(interaction, client);
            }
        } catch (error) {
            console.error('Lỗi khi xử lý interaction:', error);
            
            const errorEmbed = new EmbedBuilder()
                .setColor(0xFF0000)
                .setTitle('❌ Lỗi!')
                .setDescription('Đã xảy ra lỗi khi xử lý yêu cầu. Vui lòng thử lại!')
                .setTimestamp();

            if (interaction.deferred || interaction.replied) {
                await interaction.followUp({ embeds: [errorEmbed], flags: 64 });
            } else {
                await interaction.reply({ embeds: [errorEmbed], flags: 64 });
            }
        }
    }
};

async function handleTicketButtons(interaction, client) {
    const { customId, channel, member, guild } = interaction;

    // Kiểm tra xem channel hiện tại có phải ticket không
    const ticket = await client.prisma.ticket.findFirst({
        where: {
            channelId: channel.id,
            guildId: guild.id,
            status: 'open'
        }
    });

    if (!ticket && customId !== 'ticket_claim') {
        return interaction.reply({
            content: '❌ **Đây không phải là ticket channel!**',
            flags: 64 // ephemeral flag
        });
    }

    switch (customId) {
        case 'ticket_close':
            await handleTicketClose(interaction, client, ticket);
            break;
            
        case 'ticket_claim':
            await handleTicketClaim(interaction, client, ticket);
            break;
            
        case 'ticket_transcript':
            await handleTicketTranscript(interaction, client, ticket);
            break;
    }
}

async function handleTicketClose(interaction, client, ticket) {
    const { member, channel } = interaction;

    // Kiểm tra quyền đóng ticket
    const canClose = ticket.userId === member.id || await hasTicketStaffPermission(member, client);
    
    if (!canClose) {
        return interaction.reply({
            content: '❌ **Không đủ quyền!** Chỉ người tạo ticket hoặc staff mới có thể đóng!',
            flags: 64
        });
    }

    // Tạo embed xác nhận
    const confirmEmbed = new EmbedBuilder()
        .setColor(0xFF6B35)
        .setTitle('⚠️ Xác nhận đóng ticket')
        .setDescription('Bạn có chắc muốn đóng ticket này không?\n**Lưu ý:** Channel sẽ bị xóa sau 10 giây!')
        .setTimestamp();

    // Buttons xác nhận
    const { ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
    const confirmRow = new ActionRowBuilder()
        .addComponents(
            new ButtonBuilder()
                .setCustomId('ticket_close_confirm')
                .setLabel('✅ Đóng Ticket')
                .setStyle(ButtonStyle.Danger),
            new ButtonBuilder()
                .setCustomId('ticket_close_cancel')
                .setLabel('❌ Hủy')
                .setStyle(ButtonStyle.Secondary)
        );

    await interaction.reply({
        embeds: [confirmEmbed],
        components: [confirmRow],
        flags: 64
    });

    // Collector cho buttons xác nhận
    const filter = (i) => i.user.id === interaction.user.id && (i.customId === 'ticket_close_confirm' || i.customId === 'ticket_close_cancel');
    const collector = interaction.channel.createMessageComponentCollector({ filter, time: 30000, max: 1 });

    collector.on('collect', async (i) => {
        if (i.customId === 'ticket_close_confirm') {
            // Đóng ticket
            await client.prisma.ticket.update({
                where: { id: ticket.id },
                data: {
                    status: 'closed',
                    closedBy: member.id,
                    closedAt: new Date()
                }
            });

            const closeEmbed = new EmbedBuilder()
                .setColor(0xFF0000)
                .setTitle('🔒 Ticket đã đóng')
                .setDescription(`**Đóng bởi:** ${member}\n**Thời gian:** <t:${Math.floor(Date.now() / 1000)}:F>`)
                .setTimestamp();

            await i.update({
                content: '✅ **Ticket đã được đóng!**',
                embeds: [],
                components: []
            });

            await channel.send({ embeds: [closeEmbed] });

            // Xóa channel sau 10 giây
            setTimeout(async () => {
                try {
                    await channel.delete(`Ticket closed by ${member.user.tag}`);
                } catch (error) {
                    console.error('Lỗi khi xóa ticket channel:', error);
                }
            }, 10000);

        } else {
            await i.update({
                content: '❌ **Đã hủy đóng ticket.**',
                embeds: [],
                components: []
            });
        }
    });

    collector.on('end', (collected) => {
        if (collected.size === 0) {
            interaction.editReply({
                content: '⏰ **Hết thời gian! Đã hủy đóng ticket.**',
                embeds: [],
                components: []
            }).catch(() => {});
        }
    });
}

async function handleTicketClaim(interaction, client, ticket) {
    const { member, channel } = interaction;

    // Kiểm tra quyền staff
    const hasStaffPermission = await hasTicketStaffPermission(member, client);
    if (!hasStaffPermission) {
        return interaction.reply({
            content: '❌ **Không đủ quyền!** Chỉ ticket staff mới có thể claim ticket!',
            flags: 64
        });
    }

    // Kiểm tra xem đã claim chưa
    if (ticket.claimedBy) {
        const claimer = await interaction.guild.members.fetch(ticket.claimedBy).catch(() => null);
        return interaction.reply({
            content: `❌ **Ticket đã được claim bởi ${claimer ? claimer : 'Unknown'}!**`,
            flags: 64
        });
    }

    // Claim ticket
    await client.prisma.ticket.update({
        where: { id: ticket.id },
        data: {
            claimedBy: member.id,
            claimedAt: new Date()
        }
    });

    const claimEmbed = new EmbedBuilder()
        .setColor(0x00FF00)
        .setTitle('🙋 Ticket đã được claim')
        .setDescription(`**Staff phụ trách:** ${member}\n**Thời gian:** <t:${Math.floor(Date.now() / 1000)}:F>`)
        .setTimestamp();

    await interaction.reply({ embeds: [claimEmbed] });

    // Ping user tạo ticket
    const ticketOwner = await interaction.guild.members.fetch(ticket.userId).catch(() => null);
    if (ticketOwner) {
        await channel.send(`${ticketOwner}, staff ${member} sẽ hỗ trợ bạn! 🎯`);
    }
}

async function handleTicketTranscript(interaction, client, ticket) {
    const { member, channel } = interaction;

    // Kiểm tra quyền
    const canTranscript = ticket.userId === member.id || await hasTicketStaffPermission(member, client);
    
    if (!canTranscript) {
        return interaction.reply({
            content: '❌ **Không đủ quyền!** Chỉ người tạo ticket hoặc staff mới có thể xuất log!',
            flags: 64
        });
    }

    await interaction.deferReply({ flags: 64 });

    try {
        // Lấy tin nhắn trong channel
        const messages = await channel.messages.fetch({ limit: 100 });
        const sortedMessages = messages.sort((a, b) => a.createdTimestamp - b.createdTimestamp);

        // Tạo transcript
        let transcript = `=== TRANSCRIPT TICKET ===\n`;
        transcript += `Ticket ID: ${ticket.ticketId}\n`;
        transcript += `Channel: #${channel.name}\n`;
        transcript += `Tạo bởi: ${interaction.guild.members.cache.get(ticket.userId)?.user.tag || 'Unknown'}\n`;
        transcript += `Ngày tạo: ${ticket.createdAt.toLocaleString('vi-VN')}\n`;
        transcript += `${ticket.claimedBy ? `Được claim bởi: ${interaction.guild.members.cache.get(ticket.claimedBy)?.user.tag || 'Unknown'}\n` : ''}`;
        transcript += `Xuất bởi: ${member.user.tag}\n`;
        transcript += `Ngày xuất: ${new Date().toLocaleString('vi-VN')}\n`;
        transcript += `\n=== TIN NHẮN ===\n\n`;

        sortedMessages.forEach(msg => {
            const timestamp = msg.createdAt.toLocaleString('vi-VN');
            const author = msg.author.tag;
            const content = msg.content || '[Embed/File]';
            transcript += `[${timestamp}] ${author}: ${content}\n`;
        });

        // Tạo file
        const buffer = Buffer.from(transcript, 'utf-8');
        const fileName = `ticket-${ticket.ticketId}-${Date.now()}.txt`;

        await interaction.editReply({
            content: '✅ **Đã xuất transcript thành công!**',
            files: [{
                attachment: buffer,
                name: fileName
            }]
        });

    } catch (error) {
        console.error('Lỗi khi tạo transcript:', error);
        await interaction.editReply({
            content: '❌ **Lỗi!** Không thể tạo transcript!'
        });
    }
} 