const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const embedFactory = require('../../utils/embeds');

module.exports = {
    name: 'avatar',
    aliases: ['av', 'pfp'],
    description: 'Hiển thị avatar của người dùng',
    usage: '!avatar [@user]',
    examples: [
        '!avatar',
        '!avatar @John',
        '!av 123456789',
        '!pfp @member'
    ],
    permissions: 'member',
    guildOnly: false,
    category: 'management',
    
    async execute(message, args, client) {
        // Initialize embed factory
        embedFactory.setClient(client);
        
        try {
            // Get target user
            let targetUser = message.author;
            let targetMember = null;
            
            if (args[0]) {
                // Try to get mentioned user
                const mention = message.mentions.users.first();
                if (mention) {
                    targetUser = mention;
                } else {
                    // Try to get by ID
                    const userId = args[0].replace(/[<@!>]/g, '');
                    try {
                        targetUser = await client.users.fetch(userId);
                    } catch (error) {
                        const embed = embedFactory.error('Không tìm thấy người dùng', 'Vui lòng mention hoặc cung cấp ID hợp lệ!', null, message.author);
            return message.reply({ embeds: [embed] });
                    }
                }
            }
            
            // Try to get member if in guild
            if (message.guild) {
                try {
                    targetMember = await message.guild.members.fetch(targetUser.id);
                } catch (error) {
                    // User not in guild, that's fine
                }
            }
            
            // Get avatars
            const globalAvatar = targetUser.displayAvatarURL({ dynamic: true, size: 1024 });
            const serverAvatar = targetMember?.avatarURL({ dynamic: true, size: 1024 });
            
            // Create main embed with global avatar
            const embed = new EmbedBuilder()
                .setTitle(`🖼️ Avatar của ${targetUser.tag}`)
                .setColor('#5865F2')
                .setImage(globalAvatar)
                .setTimestamp()
                .setFooter({ 
                    text: `ID: ${targetUser.id}`, 
                    iconURL: targetUser.displayAvatarURL({ dynamic: true }) 
                });
            
            // Create action row with download buttons
            const row = new ActionRowBuilder()
                .addComponents(
                    new ButtonBuilder()
                        .setLabel('⬇️ Tải avatar')
                        .setStyle(ButtonStyle.Link)
                        .setURL(globalAvatar)
                );
            
            // If user has server-specific avatar, add button for it
            if (serverAvatar && serverAvatar !== globalAvatar) {
                embed.setDescription('**Loại:** Avatar toàn cầu\n💡 *Người dùng này có avatar riêng trong server, click nút bên dưới để xem*');
                
                row.addComponents(
                    new ButtonBuilder()
                        .setLabel('👤 Avatar server')
                        .setStyle(ButtonStyle.Secondary)
                        .setCustomId(`server_avatar_${targetUser.id}`)
                );
            } else {
                embed.setDescription('**Loại:** Avatar toàn cầu');
            }
            
            const response = await message.reply({ 
                embeds: [embed], 
                components: [row] 
            });
            
            // Handle server avatar button interaction
            if (serverAvatar && serverAvatar !== globalAvatar) {
                const collector = response.createMessageComponentCollector({
                    filter: i => i.user.id === message.author.id && i.customId === `server_avatar_${targetUser.id}`,
                    time: 60000
                });
                
                collector.on('collect', async interaction => {
                    const serverEmbed = new EmbedBuilder()
                        .setTitle(`🖼️ Avatar server của ${targetUser.tag}`)
                        .setColor('#5865F2')
                        .setImage(serverAvatar)
                        .setDescription('**Loại:** Avatar riêng trong server')
                        .setTimestamp()
                        .setFooter({ 
                            text: `ID: ${targetUser.id}`, 
                            iconURL: targetUser.displayAvatarURL({ dynamic: true }) 
                        });
                    
                    const serverRow = new ActionRowBuilder()
                        .addComponents(
                            new ButtonBuilder()
                                .setLabel('⬇️ Tải avatar server')
                                .setStyle(ButtonStyle.Link)
                                .setURL(serverAvatar),
                            new ButtonBuilder()
                                .setLabel('🌐 Avatar toàn cầu')
                                .setStyle(ButtonStyle.Secondary)
                                .setCustomId(`global_avatar_${targetUser.id}`)
                        );
                    
                    await interaction.update({ 
                        embeds: [serverEmbed], 
                        components: [serverRow] 
                    });
                });
                
                // Handle going back to global avatar
                const globalCollector = response.createMessageComponentCollector({
                    filter: i => i.user.id === message.author.id && i.customId === `global_avatar_${targetUser.id}`,
                    time: 60000
                });
                
                globalCollector.on('collect', async interaction => {
                    await interaction.update({ 
                        embeds: [embed], 
                        components: [row] 
                    });
                });
                
                // Disable buttons after timeout
                collector.on('end', () => {
                    const disabledRow = new ActionRowBuilder()
                        .addComponents(
                            new ButtonBuilder()
                                .setLabel('⬇️ Tải avatar')
                                .setStyle(ButtonStyle.Link)
                                .setURL(globalAvatar)
                        );
                    
                    if (serverAvatar && serverAvatar !== globalAvatar) {
                        disabledRow.addComponents(
                            new ButtonBuilder()
                                .setLabel('👤 Avatar server')
                                .setStyle(ButtonStyle.Secondary)
                                .setCustomId(`server_avatar_${targetUser.id}`)
                                .setDisabled(true)
                        );
                    }
                    
                    response.edit({ components: [disabledRow] }).catch(() => {});
                });
            }
            
        } catch (error) {
            console.error('Lỗi khi lấy avatar:', error);
            await message.reply('❌ **Lỗi!** Không thể lấy avatar người dùng!');
        }
    }
}; 