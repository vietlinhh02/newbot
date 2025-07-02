const { ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType, ChannelType } = require('discord.js');
const { hasFlexiblePermission } = require('../../utils/permissions');
const productionStyle = require('../../utils/demoStyle');
const logger = require('../../utils/logger');

module.exports = {
    name: 'setup',
    description: '🚀 Setup Wizard - Giao diện trực quan để cấu hình toàn bộ bot',
    usage: '!setup',
    examples: [
        '!setup'
    ],
    permissions: 'admin',
    guildOnly: true,
    category: 'config',
    
    async execute(message, args, client) {
        // Check permissions
        if (!await hasFlexiblePermission(message.member, 'setup', this.permissions, message.guild.id)) {
            const result = productionStyle.createErrorEmbed(
                'Permission Denied',
                'Bạn cần quyền **Administrator** để sử dụng setup wizard!'
            );
            return message.reply({ 
                embeds: [result.embed], 
                files: result.attachments 
            });
        }

        const guildId = message.guild.id;
        let guildSettings = await client.prisma.guildSettings.findUnique({ where: { guildId } });

        if (!guildSettings) {
            guildSettings = await client.prisma.guildSettings.create({ data: { guildId } });
        }

        const sendSetupMenu = async (interaction = message) => {
            // Status indicators
            const getStatusIcon = (value) => value ? '🟢' : '🔴';
            const getStatusText = (value) => value ? '**Đã cấu hình**' : '**Chưa cấu hình**';

            const setupFields = [
                { 
                    name: `${getStatusIcon(guildSettings.logChannel)} 1️⃣ Kênh Moderation Log`, 
                    value: `📊 ${getStatusText(guildSettings.logChannel)}\n${guildSettings.logChannel ? `📍 <#${guildSettings.logChannel}>` : '💡 Thiết lập kênh ghi log các hành động kiểm duyệt'}`, 
                    inline: true 
                },
                { 
                    name: `${getStatusIcon(guildSettings.muteRoleId)} 2️⃣ Role Mute`, 
                    value: `🎭 ${getStatusText(guildSettings.muteRoleId)}\n${guildSettings.muteRoleId ? `📍 <@&${guildSettings.muteRoleId}>` : '💡 Thiết lập role cho lệnh mute'}`, 
                    inline: true 
                },
                { 
                    name: `${getStatusIcon(guildSettings.welcomeChannel)} 3️⃣ Kênh Welcome/Leave`, 
                    value: `👋 ${getStatusText(guildSettings.welcomeChannel)}\n${guildSettings.welcomeChannel ? `📍 <#${guildSettings.welcomeChannel}>` : '💡 Thiết lập kênh chào mừng thành viên mới'}`, 
                    inline: true 
                },
                { 
                    name: `${getStatusIcon(false)} 4️⃣ Protected Channels`, 
                    value: `🛡️ **0** kênh được bảo vệ\n💡 Bảo vệ các kênh quan trọng khỏi lệnh nuke`, 
                    inline: true 
                },
                { 
                    name: `${getStatusIcon(guildSettings.adminRoles || guildSettings.helperRoles)} 5️⃣ Custom Roles`, 
                    value: `👑 **Admin:** ${guildSettings.adminRoles ? guildSettings.adminRoles.split(',').length : 0} roles\n🤝 **Helper:** ${guildSettings.helperRoles ? guildSettings.helperRoles.split(',').length : 0} roles\n💡 Cấu hình roles tùy chỉnh cho bot`, 
                    inline: true 
                },
                { 
                    name: `${getStatusIcon(guildSettings.ticketCategory && guildSettings.ticketStaffRoles)} 6️⃣ Ticket System`, 
                    value: `🎫 ${getStatusText(guildSettings.ticketCategory && guildSettings.ticketStaffRoles)}\n${guildSettings.ticketCategory ? `📁 <#${guildSettings.ticketCategory}>` : '💡 Thiết lập hệ thống ticket hỗ trợ'}\n${guildSettings.ticketStaffRoles ? `👥 Staff roles configured` : ''}`, 
                    inline: true 
                },
                {
                    name: '📊 Server Statistics',
                    value: [
                        `👥 **Members:** ${message.guild.memberCount}`,
                        `📺 **Channels:** ${message.guild.channels.cache.size}`,
                        `🎭 **Roles:** ${message.guild.roles.cache.size}`,
                        `⚡ **Bot Ping:** ${client.ws.ping}ms`
                    ].join(' • '),
                    inline: false
                }
            ];

            const result = productionStyle.createInfoEmbed(
                'BOT CONFIGURATION CENTER',
                { tag: 'Setup Wizard' },
                message.author,
                '🚀 **Advanced Server Setup Dashboard**\n\n✨ Configure your bot settings with our interactive setup wizard!\n💡 Click the buttons below to customize each feature.',
                setupFields
            );

            const row1 = new ActionRowBuilder()
                .addComponents(
                    new ButtonBuilder().setCustomId('setup_log_channel').setLabel('Log Channel').setEmoji('📊').setStyle(ButtonStyle.Secondary),
                    new ButtonBuilder().setCustomId('setup_mute_role').setLabel('Mute Role').setEmoji('🔇').setStyle(ButtonStyle.Secondary),
                    new ButtonBuilder().setCustomId('setup_welcome_leave').setLabel('Welcome').setEmoji('👋').setStyle(ButtonStyle.Secondary)
                );
            
            const row2 = new ActionRowBuilder()
                .addComponents(
                    new ButtonBuilder().setCustomId('setup_protected_channels').setLabel('Protection').setEmoji('🛡️').setStyle(ButtonStyle.Secondary),
                    new ButtonBuilder().setCustomId('setup_custom_roles').setLabel('Custom Roles').setEmoji('👑').setStyle(ButtonStyle.Secondary),
                    new ButtonBuilder().setCustomId('setup_ticket_system').setLabel('Tickets').setEmoji('🎫').setStyle(ButtonStyle.Secondary)
                );
            
            const exitRow = new ActionRowBuilder()
                .addComponents(
                    new ButtonBuilder().setCustomId('setup_quick_config').setLabel('Quick Setup').setEmoji('⚡').setStyle(ButtonStyle.Success),
                    new ButtonBuilder().setCustomId('setup_reset_all').setLabel('Reset All').setEmoji('🔄').setStyle(ButtonStyle.Danger),
                    new ButtonBuilder().setCustomId('setup_exit').setLabel('Finish').setEmoji('✅').setStyle(ButtonStyle.Primary)
                );

            if (interaction.replied || interaction.deferred) {
                await interaction.editReply({ 
                    embeds: [result.embed], 
                    files: result.attachments,
                    components: [row1, row2, exitRow] 
                });
            } else {
                await interaction.reply({ 
                    embeds: [result.embed], 
                    files: result.attachments,
                    components: [row1, row2, exitRow] 
                });
            }
        };

        await sendSetupMenu();

        const processingInteractions = new Set();

        const collector = message.channel.createMessageComponentCollector({
            componentType: ComponentType.Button,
            time: 300000 // 5 minutes
        });

        collector.on('collect', async interaction => {
            if (interaction.user.id !== message.author.id) {
                const result = productionStyle.createWarningEmbed(
                    'Access Denied',
                    'Chỉ người dùng lệnh mới có thể tương tác với setup menu này.'
                );
                return interaction.reply({ 
                    embeds: [result.embed], 
                    files: result.attachments,
                    ephemeral: true 
                });
            }

            // Check if interaction is already handled or being processed
            if (interaction.replied || interaction.deferred || processingInteractions.has(interaction.id)) {
                return;
            }

            // Mark interaction as being processed
            processingInteractions.add(interaction.id);

            try {
                switch (interaction.customId) {
                    case 'setup_log_channel':
                        await interaction.deferUpdate();
                        await handleLogChannelSetup(interaction, guildId, client, sendSetupMenu, guildSettings);
                        break;
                    case 'setup_mute_role':
                        await interaction.deferUpdate();
                        await handleMuteRoleSetup(interaction, guildId, client, sendSetupMenu, guildSettings);
                        break;
                    case 'setup_welcome_leave':
                        await interaction.deferUpdate();
                        await handleWelcomeLeaveSetup(interaction, guildId, client, sendSetupMenu, guildSettings);
                        break;
                    case 'setup_protected_channels':
                        await interaction.deferUpdate();
                        await handleProtectedChannelsSetup(interaction, guildId, client, sendSetupMenu, guildSettings);
                        break;
                    case 'setup_custom_roles':
                        await interaction.deferUpdate();
                        await handleCustomRolesSetup(interaction, guildId, client, sendSetupMenu, guildSettings);
                        break;
                    case 'setup_ticket_system':
                        await interaction.deferUpdate();
                        await handleTicketSetup(interaction, guildId, client, sendSetupMenu, guildSettings);
                        break;
                    case 'setup_quick_config':
                        await interaction.deferUpdate();
                        await handleQuickSetup(interaction, guildId, client, sendSetupMenu, guildSettings);
                        break;
                    case 'setup_reset_all':
                        await interaction.deferUpdate();
                        await handleResetAll(interaction, guildId, client, sendSetupMenu, guildSettings);
                        break;
                    case 'setup_exit':
                        collector.stop('exit');
                        const successResult = productionStyle.createSuccessEmbed(
                            'SETUP COMPLETE',
                            { tag: 'Configuration Saved' },
                            message.author,
                            'Bot configuration has been saved successfully!',
                            [
                                { name: '🎉 Congratulations!', value: 'Bot đã sẵn sàng hoạt động với cấu hình mới', inline: false },
                                { name: '💡 Pro Tip', value: 'Bạn có thể chạy `!setup` bất cứ lúc nào để thay đổi cấu hình', inline: false },
                                { name: 'Time', value: `<t:${Math.floor(Date.now() / 1000)}:F>`, inline: true }
                            ]
                        );
                        await interaction.update({ 
                            embeds: [successResult.embed], 
                            files: successResult.attachments,
                            components: [] 
                        });
                        break;
                }
            } catch (error) {
                console.error('Setup interaction error:', error);
                // Don't try to respond if already handled
                if (!interaction.replied && !interaction.deferred) {
                    try {
                        await interaction.deferUpdate().catch(() => {});
                    } catch (e) {
                        // Ignore errors when trying to defer
                    }
                }
            } finally {
                // Remove from processing set when done
                processingInteractions.delete(interaction.id);
            }
        });

        collector.on('end', (collected, reason) => {
            // Clean up processing set
            processingInteractions.clear();
            
            if (reason === 'time') {
                const timeoutResult = productionStyle.createWarningEmbed(
                    'Setup Timeout',
                    { tag: 'Session Expired' },
                    message.author,
                    'Phiên cài đặt đã hết hạn sau 5 phút không hoạt động.',
                    [
                        { name: '💡 Suggestion', value: 'Chạy `!setup` để bắt đầu lại quá trình cấu hình', inline: false },
                        { name: 'Timeout', value: '5 minutes elapsed', inline: true }
                    ]
                );
                message.channel.send({ 
                    embeds: [timeoutResult.embed], 
                    files: timeoutResult.attachments 
                }).catch(logger.error);
            }
        });
    }
};

// --- Enhanced Handlers for each setup option ---

async function handleLogChannelSetup(interaction, guildId, client, sendSetupMenu, guildSettings) {
    const promptResult = productionStyle.createInfoEmbed(
        'LOG CHANNEL CONFIGURATION',
        { tag: 'Moderation Setup' },
        interaction.user,
        'Thiết lập kênh để ghi lại tất cả hoạt động kiểm duyệt',
        [
            { name: '📝 Instructions', value: '• Mention kênh: `#mod-logs`\n• Hoặc gõ `disable` để tắt\n• Hoặc gõ `cancel` để hủy', inline: false },
            { name: '💡 Benefits', value: '• Theo dõi mọi hành động moderation\n• Lưu trữ lịch sử đầy đủ\n• Minh bạch trong quản lý', inline: false },
            { name: 'Timeout', value: '60 seconds to respond', inline: true }
        ]
    );
    await interaction.editReply({ 
        embeds: [promptResult.embed], 
        files: promptResult.attachments,
        components: [] 
    });

    const filter = m => m.author.id === interaction.user.id;
    try {
        const collected = await interaction.channel.awaitMessages({ filter, max: 1, time: 60000 });
        const response = collected.first();
        const content = response.content.toLowerCase();
        await response.delete().catch(() => {});

        if (content === 'cancel') {
            return sendSetupMenu(interaction);
        }

        if (content === 'disable') {
            await client.prisma.guildSettings.update({
                where: { guildId },
                data: { logChannel: null }
            });
                                // Successfully disabled - no need for followUp since we'll return to menu
        } else {
            const channelMention = response.mentions.channels.first();
            let targetChannel = null;

            if (channelMention) {
                targetChannel = channelMention;
            } else {
                const channelId = content.replace(/[<#>]/g, '');
                try {
                    targetChannel = await interaction.guild.channels.fetch(channelId);
                } catch (e) { /* ignore */ }
            }

                            if (!targetChannel || !targetChannel.isTextBased()) {
                    // Invalid channel - will return to menu with error indication
                } else {
                    const botPermissions = targetChannel.permissionsFor(interaction.guild.members.me);
                    if (!botPermissions.has(['ViewChannel', 'SendMessages', 'EmbedLinks'])) {
                        // Bot missing permissions - will return to menu
                    } else {
                        await client.prisma.guildSettings.update({
                            where: { guildId },
                            data: { logChannel: targetChannel.id }
                        });
                        // Successfully configured - will return to menu showing updated status
                    }
                }
        }
    } catch (error) {
        // Timeout occurred - will return to menu
    }

    // Refresh settings and return to menu
    guildSettings = await client.prisma.guildSettings.findUnique({ where: { guildId } });
    await sendSetupMenu(interaction);
}

async function handleQuickSetup(interaction, guildId, client, sendSetupMenu, guildSettings) {
    const result = productionStyle.createInfoEmbed(
        'QUICK SETUP',
        { tag: 'Automated Configuration' },
        interaction.user,
        'Thiết lập nhanh các cấu hình cơ bản cho server',
        [
            { name: '🎯 What will be configured', value: '• Tạo kênh #mod-logs\n• Tạo role @Muted\n• Thiết lập kênh #welcome', inline: false },
            { name: '⚠️ Important Note', value: 'Sẽ tạo mới nếu chưa có, bỏ qua nếu đã tồn tại', inline: false },
            { name: 'Estimated Time', value: '~10 seconds', inline: true },
            { name: 'Confirmation Required', value: 'Click confirm to proceed', inline: true }
        ]
    );

    const confirmRow = new ActionRowBuilder()
        .addComponents(
            new ButtonBuilder().setCustomId('quick_confirm').setLabel('Xác nhận').setEmoji('✅').setStyle(ButtonStyle.Success),
            new ButtonBuilder().setCustomId('quick_cancel').setLabel('Hủy').setEmoji('❌').setStyle(ButtonStyle.Danger)
        );

    await interaction.editReply({ 
        embeds: [result.embed], 
        files: result.attachments,
        components: [confirmRow] 
    });

    try {
        const response = await interaction.channel.awaitMessageComponent({
            filter: i => i.user.id === interaction.user.id,
            time: 30000
        });

        await response.deferUpdate();

        if (response.customId === 'quick_confirm') {
            let logChannel = null;
            let muteRole = null;
            let welcomeChannel = null;
            const results = [];

            // Create log channel if not exists
            try {
                logChannel = interaction.guild.channels.cache.find(c => c.name === 'mod-logs');
                if (!logChannel) {
                    logChannel = await interaction.guild.channels.create({
                        name: 'mod-logs',
                        type: 0,
                        permissionOverwrites: [
                            {
                                id: interaction.guild.roles.everyone,
                                deny: ['ViewChannel']
                            }
                        ]
                    });
                    results.push(`✅ Created #mod-logs channel`);
                } else {
                    results.push(`ℹ️ #mod-logs already exists`);
                }
            } catch (error) {
                console.error('Error creating log channel:', error);
                results.push(`❌ Failed to create #mod-logs`);
            }

            // Create mute role if not exists
            try {
                muteRole = interaction.guild.roles.cache.find(r => r.name === 'Muted');
                if (!muteRole) {
                    muteRole = await interaction.guild.roles.create({
                        name: 'Muted',
                        color: '#808080',
                        permissions: []
                    });
                    results.push(`✅ Created @Muted role`);
                } else {
                    results.push(`ℹ️ @Muted role already exists`);
                }
            } catch (error) {
                console.error('Error creating mute role:', error);
                results.push(`❌ Failed to create @Muted role`);
            }

            // Find or suggest welcome channel
            welcomeChannel = interaction.guild.channels.cache.find(c => 
                c.name.includes('welcome') || c.name.includes('general')
            );
            if (welcomeChannel) {
                results.push(`✅ Found welcome channel: ${welcomeChannel.name}`);
            } else {
                results.push(`⚠️ No suitable welcome channel found`);
            }

            // Update database
            await client.prisma.guildSettings.update({
                where: { guildId },
                data: {
                    logChannel: logChannel?.id,
                    muteRoleId: muteRole?.id,
                    welcomeChannel: welcomeChannel?.id
                }
            });

            // Quick setup completed successfully - will return to menu showing updated status
        }

        return sendSetupMenu(interaction);
    } catch (error) {
        return sendSetupMenu(interaction);
    }
}

async function handleResetAll(interaction, guildId, client, sendSetupMenu, guildSettings) {
    const result = productionStyle.createWarningEmbed(
        'RESET ALL SETTINGS',
        { tag: 'Destructive Action' },
        interaction.user,
        '⚠️ **This will permanently delete ALL bot configurations**',
        [
            { name: '⚠️ WARNING', value: 'Tất cả cài đặt bot sẽ bị xóa và trở về mặc định!', inline: false },
            { name: '📋 Will be reset', value: '• Log channel\n• Mute role\n• Welcome channel\n• Protected channels\n• Custom roles\n• Ticket system', inline: false },
            { name: 'Cannot Undo', value: '❌ This action is irreversible', inline: true },
            { name: 'Confirmation Required', value: 'Click confirm to proceed', inline: true }
        ]
    );

    const confirmRow = new ActionRowBuilder()
        .addComponents(
            new ButtonBuilder().setCustomId('reset_confirm').setLabel('Xác nhận Reset').setEmoji('🔄').setStyle(ButtonStyle.Danger),
            new ButtonBuilder().setCustomId('reset_cancel').setLabel('Hủy').setEmoji('❌').setStyle(ButtonStyle.Secondary)
        );
    
    await interaction.editReply({ 
        embeds: [result.embed], 
        files: result.attachments,
        components: [confirmRow] 
    });

    try {
        const response = await interaction.channel.awaitMessageComponent({
            filter: i => i.user.id === interaction.user.id,
            time: 30000
        });

        await response.deferUpdate();

        if (response.customId === 'reset_confirm') {
            await client.prisma.guildSettings.update({
                where: { guildId },
                data: {
                    logChannel: null,
                    muteRoleId: null,
                    welcomeChannel: null,
                    leaveChannel: null,
                    adminRoles: null,
                    helperRoles: null,
                    ticketCategory: null,
                    ticketStaffRoles: null
                }
            });

            // Reset completed successfully - will return to menu showing cleared status
        }

        return sendSetupMenu(interaction);
    } catch (error) {
        return sendSetupMenu(interaction);
    }
}

// Simplified placeholder handlers for remaining setup options
async function handleMuteRoleSetup(interaction, guildId, client, sendSetupMenu, guildSettings) {
    const result = productionStyle.createInfoEmbed(
        'MUTE ROLE SETUP',
        { tag: 'Coming Soon' },
        interaction.user,
        'Mute role configuration will be implemented in next update.',
        [
            { name: 'Status', value: 'Under Development', inline: true },
            { name: 'ETA', value: 'Next update', inline: true }
        ]
    );
    await interaction.editReply({ 
        embeds: [result.embed], 
        files: result.attachments,
        components: [] 
    });
    
    setTimeout(() => sendSetupMenu(interaction), 3000);
}

async function handleWelcomeLeaveSetup(interaction, guildId, client, sendSetupMenu, guildSettings) {
    const result = productionStyle.createInfoEmbed(
        'WELCOME/LEAVE SETUP',
        { tag: 'Coming Soon' },
        interaction.user,
        'Welcome and leave message configuration will be implemented soon.',
        [
            { name: 'Status', value: 'Under Development', inline: true },
            { name: 'ETA', value: 'Next update', inline: true }
        ]
    );
    await interaction.editReply({ 
        embeds: [result.embed], 
        files: result.attachments,
        components: [] 
    });
    
    setTimeout(() => sendSetupMenu(interaction), 3000);
}

async function handleProtectedChannelsSetup(interaction, guildId, client, sendSetupMenu, guildSettings) {
    const result = productionStyle.createInfoEmbed(
        'PROTECTED CHANNELS SETUP',
        { tag: 'Coming Soon' },
        interaction.user,
        'Protected channels configuration will be implemented soon.',
        [
            { name: 'Status', value: 'Under Development', inline: true },
            { name: 'ETA', value: 'Next update', inline: true }
        ]
    );
    await interaction.editReply({ 
        embeds: [result.embed], 
        files: result.attachments,
        components: [] 
    });
    
    setTimeout(() => sendSetupMenu(interaction), 3000);
}

async function handleCustomRolesSetup(interaction, guildId, client, sendSetupMenu, guildSettings) {
    const result = productionStyle.createInfoEmbed(
        'CUSTOM ROLES SETUP',
        { tag: 'Coming Soon' },
        interaction.user,
        'Custom roles configuration will be implemented soon.',
        [
            { name: 'Status', value: 'Under Development', inline: true },
            { name: 'ETA', value: 'Next update', inline: true }
        ]
    );
    await interaction.editReply({ 
        embeds: [result.embed], 
        files: result.attachments,
        components: [] 
    });
    
    setTimeout(() => sendSetupMenu(interaction), 3000);
}

async function handleTicketSetup(interaction, guildId, client, sendSetupMenu, guildSettings) {
    const promptResult = productionStyle.createInfoEmbed(
        'TICKET SYSTEM CONFIGURATION',
        { tag: 'Support Setup' },
        interaction.user,
        'Thiết lập hệ thống ticket hỗ trợ khách hàng',
        [
            { name: '📝 Instructions', value: '• Mention category: `#ticket-category`\n• Hoặc gõ `disable` để tắt\n• Hoặc gõ `cancel` để hủy', inline: false },
            { name: '💡 Benefits', value: '• Hỗ trợ khách hàng có tổ chức\n• Tự động tạo private channels\n• Quản lý permissions', inline: false },
            { name: 'Current Status', value: guildSettings.ticketCategory ? `✅ Category: <#${guildSettings.ticketCategory}>` : '❌ Not configured', inline: false }
        ]
    );
    await interaction.editReply({ 
        embeds: [promptResult.embed], 
        files: promptResult.attachments,
        components: [] 
    });

    const filter = m => m.author.id === interaction.user.id;
    try {
        const collected = await interaction.channel.awaitMessages({ filter, max: 1, time: 60000 });
        const response = collected.first();
        const content = response.content.toLowerCase();
        await response.delete().catch(() => {});

        if (content === 'cancel') {
            return sendSetupMenu(interaction);
        }

        if (content === 'disable') {
            await client.prisma.guildSettings.update({
                where: { guildId },
                data: { 
                    ticketCategory: null,
                    ticketStaffRoles: null 
                }
            });
        } else {
            const categoryMention = response.mentions.channels.first();
            let targetCategory = null;

            if (categoryMention) {
                targetCategory = categoryMention;
            } else {
                const categoryId = content.replace(/[<#>]/g, '');
                try {
                    targetCategory = await interaction.guild.channels.fetch(categoryId);
                } catch (e) { /* ignore */ }
            }

            if (!targetCategory || targetCategory.type !== 4) { // 4 = Category channel
                // Invalid category - will return to menu
            } else {
                const botPermissions = targetCategory.permissionsFor(interaction.guild.members.me);
                if (!botPermissions.has(['ViewChannel', 'ManageChannels'])) {
                    // Bot missing permissions - will return to menu
                } else {
                    await client.prisma.guildSettings.update({
                        where: { guildId },
                        data: { ticketCategory: targetCategory.id }
                    });
                    // Successfully configured - will return to menu showing updated status
                }
            }
        }
    } catch (error) {
        // Timeout occurred - will return to menu
    }

    // Refresh settings and return to menu
    guildSettings = await client.prisma.guildSettings.findUnique({ where: { guildId } });
    await sendSetupMenu(interaction);
}