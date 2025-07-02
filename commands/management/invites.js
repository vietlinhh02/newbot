const { EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const embedFactory = require('../../utils/embeds');
const { hasFlexiblePermission } = require('../../utils/permissions');

module.exports = {
    name: 'invites',
    aliases: ['invitelist', 'serverinvites'],
    description: 'Hiển thị danh sách invite links của server',
    usage: '!invites',
    examples: ['!invites', '!invitelist'],
    permissions: 'helper',
    guildOnly: true,
    category: 'management',
    
    async execute(message, args, client) {
        // Initialize embed factory
        embedFactory.setClient(client);
        
        try {
            // Check permissions
            if (!await hasFlexiblePermission(message.member, 'invites', this.permissions, message.guild.id)) {
                const embed = embedFactory.error('Không có quyền', 'Bạn cần quyền **Helper** để sử dụng lệnh này.', null, message.author);
            return message.reply({ embeds: [embed] });
            }

            // Check bot permissions
            if (!message.guild.members.me.permissions.has(PermissionFlagsBits.ManageGuild)) {
                return message.reply('❌ Bot cần quyền **Manage Server** để xem invite links!');
            }
            
            // Fetch all invites
            const invites = await message.guild.invites.fetch();
            
            if (invites.size === 0) {
                return message.reply('📝 **Server này không có invite link nào!**');
            }
            
            const embed = new EmbedBuilder()
                .setTitle(`🔗 Invite Links - ${message.guild.name}`)
                .setColor('#5865F2')
                .setDescription(`**Tổng cộng:** ${invites.size} invite links`)
                .setTimestamp()
                .setFooter({ 
                    text: `Server ID: ${message.guild.id}`, 
                    iconURL: message.guild.iconURL({ dynamic: true }) 
                });
            
            // Sort invites by uses (highest first)
            const sortedInvites = Array.from(invites.values())
                .sort((a, b) => (b.uses || 0) - (a.uses || 0));
            
            // Show top 10 invites
            const inviteList = sortedInvites.slice(0, 10).map((invite, index) => {
                const creator = invite.inviter ? invite.inviter.tag : 'Unknown';
                const uses = invite.uses || 0;
                const maxUses = invite.maxUses || '∞';
                const expiresAt = invite.expiresTimestamp ? 
                    `<t:${Math.floor(invite.expiresTimestamp / 1000)}:R>` : 'Không bao giờ';
                const channel = invite.channel ? `#${invite.channel.name}` : 'Unknown';
                
                return `**${index + 1}.** \`${invite.code}\`\n` +
                       `↳ **Tạo bởi:** ${creator}\n` +
                       `↳ **Uses:** ${uses}/${maxUses} • **Kênh:** ${channel}\n` +
                       `↳ **Hết hạn:** ${expiresAt}`;
            }).join('\n\n');
            
            if (inviteList) {
                embed.addFields([{
                    name: `📋 Top Invite Links (${Math.min(10, invites.size)})`,
                    value: inviteList,
                    inline: false
                }]);
            }
            
            // Add statistics
            const totalUses = sortedInvites.reduce((acc, invite) => acc + (invite.uses || 0), 0);
            const permanentInvites = sortedInvites.filter(invite => !invite.expiresTimestamp).length;
            const temporaryInvites = sortedInvites.filter(invite => invite.expiresTimestamp).length;
            const limitedInvites = sortedInvites.filter(invite => invite.maxUses > 0).length;
            
            embed.addFields([
                {
                    name: '📊 Thống kê',
                    value: [
                        `**Tổng uses:** ${totalUses}`,
                        `**Vĩnh viễn:** ${permanentInvites}`,
                        `**Có thời hạn:** ${temporaryInvites}`,
                        `**Giới hạn uses:** ${limitedInvites}`
                    ].join('\n'),
                    inline: true
                },
                {
                    name: '🏆 Top Inviter',
                    value: getTopInviters(sortedInvites),
                    inline: true
                }
            ]);
            
            // Add vanity URL if exists
            if (message.guild.vanityURLCode) {
                embed.addFields([{
                    name: '✨ Vanity URL',
                    value: `**discord.gg/${message.guild.vanityURLCode}**\n*Sử dụng: ${message.guild.vanityURLUses || 0}*`,
                    inline: false
                }]);
            }
            
            await message.reply({ embeds: [embed] });
            
        } catch (error) {
            console.error('Lỗi khi lấy invites:', error);
            
            let errorMessage = 'Không thể lấy danh sách invite!';
            
            if (error.code === 50013) {
                errorMessage = 'Bot không có quyền xem invite links!';
            }
            
            await message.reply(`❌ **Lỗi!** ${errorMessage}`);
        }
    }
};

function getTopInviters(invites) {
    const inviters = {};
    
    invites.forEach(invite => {
        if (invite.inviter) {
            const tag = invite.inviter.tag;
            if (!inviters[tag]) {
                inviters[tag] = 0;
            }
            inviters[tag] += invite.uses || 0;
        }
    });
    
    const topInviters = Object.entries(inviters)
        .sort(([,a], [,b]) => b - a)
        .slice(0, 3);
    
    if (topInviters.length === 0) {
        return 'Không có dữ liệu';
    }
    
    return topInviters.map(([user, uses], index) => {
        const medal = ['🥇', '🥈', '🥉'][index] || '🏅';
        return `${medal} **${user}:** ${uses} uses`;
    }).join('\n');
} 