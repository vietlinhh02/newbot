const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const embedFactory = require('../../utils/embeds');

module.exports = {
    name: 'roles',
    aliases: ['rolelist', 'listroles'],
    description: 'Hiển thị danh sách tất cả vai trò trong server',
    usage: '!roles [page_number]',
    examples: [
        '!roles',
        '!roles 2',
        '!rolelist',
        '!listroles'
    ],
    permissions: 'member',
    guildOnly: true,
    category: 'management',
    
    async execute(message, args, client) {
        // Initialize embed factory
        embedFactory.setClient(client);
        
        try {
            const guild = message.guild;
            
            // Get all roles except @everyone, sorted by position (highest first)
            const roles = guild.roles.cache
                .filter(role => role.id !== guild.roles.everyone.id)
                .sort((a, b) => b.position - a.position);
            
            if (roles.size === 0) {
                return message.reply('📝 **Server này không có vai trò nào khác ngoài @everyone!**');
            }
            
            // Pagination settings
            const rolesPerPage = 15;
            const totalPages = Math.ceil(roles.size / rolesPerPage);
            let currentPage = 1;
            
            // Parse page number from args
            if (args[0]) {
                const pageNum = parseInt(args[0]);
                if (!isNaN(pageNum) && pageNum >= 1 && pageNum <= totalPages) {
                    currentPage = pageNum;
                }
            }
            
            const createRoleEmbed = (page) => {
                const startIndex = (page - 1) * rolesPerPage;
                const endIndex = startIndex + rolesPerPage;
                const pageRoles = Array.from(roles.values()).slice(startIndex, endIndex);
                
                const embed = new EmbedBuilder()
                    .setTitle(`🎭 Danh sách vai trò trong ${guild.name}`)
                    .setColor('#5865F2')
                    .setDescription(`**Tổng cộng:** ${roles.size} vai trò | **Trang:** ${page}/${totalPages}`)
                    .setTimestamp()
                    .setFooter({ 
                        text: `Server ID: ${guild.id}`, 
                        iconURL: guild.iconURL({ dynamic: true }) 
                    });
                
                // Create role list with formatted info
                const roleList = pageRoles.map((role, index) => {
                    const actualIndex = startIndex + index + 1;
                    const memberCount = role.members.size;
                    const colorHex = role.hexColor !== '#000000' ? role.hexColor : '';
                    
                    // Role info string
                    let roleInfo = `**${actualIndex}.** ${role}`;
                    
                    // Add member count
                    if (memberCount > 0) {
                        roleInfo += ` (${memberCount} thành viên)`;
                    }
                    
                    // Add color indicator
                    if (colorHex) {
                        roleInfo += ` \`${colorHex}\``;
                    }
                    
                    // Add special indicators
                    const indicators = [];
                    if (role.managed) indicators.push('🤖');
                    if (role.hoist) indicators.push('📌');
                    if (role.mentionable) indicators.push('💬');
                    if (role.permissions.has('Administrator')) indicators.push('👑');
                    
                    if (indicators.length > 0) {
                        roleInfo += ` ${indicators.join('')}`;
                    }
                    
                    return roleInfo;
                }).join('\n');
                
                embed.addFields([{
                    name: `📋 Vai trò (${startIndex + 1}-${Math.min(endIndex, roles.size)})`,
                    value: roleList || 'Không có vai trò nào',
                    inline: false
                }]);
                
                // Add legend
                embed.addFields([{
                    name: '📖 Chú thích',
                    value: [
                        '🤖 = Quản lý bởi bot',
                        '📌 = Hiển thị riêng biệt',
                        '💬 = Có thể mention',
                        '👑 = Có quyền Administrator'
                    ].join(' • '),
                    inline: false
                }]);
                
                return embed;
            };
            
            const embed = createRoleEmbed(currentPage);
            
            // Create navigation buttons
            const createButtons = (page) => {
                const row = new ActionRowBuilder();
                
                // Previous page button
                row.addComponents(
                    new ButtonBuilder()
                        .setCustomId('roles_prev')
                        .setLabel('⬅️ Trước')
                        .setStyle(ButtonStyle.Secondary)
                        .setDisabled(page <= 1)
                );
                
                // Page indicator
                row.addComponents(
                    new ButtonBuilder()
                        .setCustomId('roles_page')
                        .setLabel(`${page}/${totalPages}`)
                        .setStyle(ButtonStyle.Primary)
                        .setDisabled(true)
                );
                
                // Next page button
                row.addComponents(
                    new ButtonBuilder()
                        .setCustomId('roles_next')
                        .setLabel('Sau ➡️')
                        .setStyle(ButtonStyle.Secondary)
                        .setDisabled(page >= totalPages)
                );
                
                // Info button
                row.addComponents(
                    new ButtonBuilder()
                        .setCustomId('roles_info')
                        .setLabel('📊 Thống kê')
                        .setStyle(ButtonStyle.Success)
                );
                
                return row;
            };
            
            const components = totalPages > 1 ? [createButtons(currentPage)] : [];
            const response = await message.reply({ 
                embeds: [embed], 
                components: components 
            });
            
            // Handle button interactions
            if (totalPages > 1) {
                const collector = response.createMessageComponentCollector({
                    filter: i => i.user.id === message.author.id,
                    time: 300000 // 5 minutes
                });
                
                collector.on('collect', async interaction => {
                    if (interaction.customId === 'roles_prev' && currentPage > 1) {
                        currentPage--;
                    } else if (interaction.customId === 'roles_next' && currentPage < totalPages) {
                        currentPage++;
                    } else if (interaction.customId === 'roles_info') {
                        // Show role statistics
                        const statsEmbed = new EmbedBuilder()
                            .setTitle(`📊 Thống kê vai trò - ${guild.name}`)
                            .setColor('#5865F2')
                            .addFields([
                                {
                                    name: '📈 Tổng quan',
                                    value: [
                                        `**Tổng vai trò:** ${roles.size}`,
                                        `**Có màu:** ${roles.filter(r => r.hexColor !== '#000000').size}`,
                                        `**Hiển thị riêng:** ${roles.filter(r => r.hoist).size}`,
                                        `**Có thể mention:** ${roles.filter(r => r.mentionable).size}`
                                    ].join('\n'),
                                    inline: true
                                },
                                {
                                    name: '🤖 Đặc biệt',
                                    value: [
                                        `**Quản lý bởi bot:** ${roles.filter(r => r.managed).size}`,
                                        `**Có quyền Admin:** ${roles.filter(r => r.permissions.has('Administrator')).size}`,
                                        `**Không có thành viên:** ${roles.filter(r => r.members.size === 0).size}`
                                    ].join('\n'),
                                    inline: true
                                }
                            ])
                            .setTimestamp();
                        
                        // Top 5 roles by member count
                        const topRoles = Array.from(roles.values())
                            .filter(r => r.members.size > 0)
                            .sort((a, b) => b.members.size - a.members.size)
                            .slice(0, 5);
                        
                        if (topRoles.length > 0) {
                            statsEmbed.addFields([{
                                name: '👥 Top 5 vai trò có nhiều thành viên nhất',
                                value: topRoles.map((role, i) => 
                                    `**${i + 1}.** ${role.name} - ${role.members.size} thành viên`
                                ).join('\n'),
                                inline: false
                            }]);
                        }
                        
                        await interaction.update({ embeds: [statsEmbed], components: [createButtons(currentPage)] });
                        return;
                    }
                    
                    const newEmbed = createRoleEmbed(currentPage);
                    await interaction.update({ 
                        embeds: [newEmbed], 
                        components: [createButtons(currentPage)] 
                    });
                });
                
                collector.on('end', () => {
                    const disabledRow = createButtons(currentPage);
                    disabledRow.components.forEach(button => {
                        if (!button.data.disabled) button.setDisabled(true);
                    });
                    
                    response.edit({ components: [disabledRow] }).catch(() => {});
                });
            }
            
        } catch (error) {
            console.error('Lỗi khi lấy danh sách roles:', error);
            await message.reply('❌ **Lỗi!** Không thể lấy danh sách vai trò!');
        }
    }
}; 