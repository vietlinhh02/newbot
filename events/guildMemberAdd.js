const welcomeCard = require('../utils/welcomeCard');
const embedFactory = require('../utils/embeds');

module.exports = {
    name: 'guildMemberAdd',
    once: false,
    
    async execute(member, client) {
        try {
            // Initialize embed factory
            embedFactory.setClient(client);
            
            // Get guild settings
            const guildSettings = await client.prisma.guildSettings.findUnique({
                where: { guildId: member.guild.id }
            });
            
            // Check if welcome is configured
            if (!guildSettings?.welcomeChannel) {
                return; // No welcome system configured
            }
            
            // Get welcome channel
            const welcomeChannel = member.guild.channels.cache.get(guildSettings.welcomeChannel);
            if (!welcomeChannel) {
                console.log(`Welcome channel not found for guild ${member.guild.id}`);
                return;
            }
            
            // Check bot permissions
            const requiredPerms = ['ViewChannel', 'SendMessages'];
            if (guildSettings.welcomeCardEnabled) {
                requiredPerms.push('AttachFiles');
            }
            
            const botPermissions = welcomeChannel.permissionsFor(member.guild.members.me);
            if (!botPermissions.has(requiredPerms)) {
                console.log(`Insufficient permissions in ${welcomeChannel.name} for guild ${member.guild.id}`);
                return;
            }
            
            // Send welcome message based on card setting
            if (guildSettings.welcomeCardEnabled) {
                await this.sendWelcomeCard(member, welcomeChannel, guildSettings);
            } else {
                await this.sendWelcomeMessage(member, welcomeChannel, guildSettings);
            }
            
            // Optional: Auto-assign join role if configured
            if (guildSettings.joinRole) {
                try {
                    const joinRole = member.guild.roles.cache.get(guildSettings.joinRole);
                    if (joinRole && joinRole.editable && member.guild.members.me.roles.highest.position > joinRole.position) {
                        await member.roles.add(joinRole, 'Auto-assigned join role');
                        console.log(`Assigned join role ${joinRole.name} to ${member.user.tag}`);
                    }
                } catch (error) {
                    console.error('Error assigning join role:', error);
                }
            }
            
            console.log(`Welcome ${guildSettings.welcomeCardEnabled ? 'card' : 'message'} sent for ${member.user.tag} in ${member.guild.name}`);
            
        } catch (error) {
            console.error('Error in guildMemberAdd event:', error);
        }
    },
    
    async sendWelcomeCard(member, welcomeChannel, guildSettings) {
        try {
            // Format welcome text
            const welcomeText = welcomeCard.formatText(
                guildSettings.welcomeMessage || 'Welcome to {server}!',
                member.user,
                member.guild
            );
            
            // Create welcome card
            const card = await welcomeCard.createWelcomeCard(member.user, member.guild, {
                backgroundUrl: guildSettings.welcomeBackgroundUrl,
                welcomeText: welcomeText,
                subtitle: `You are member #${member.guild.memberCount}`,
                textColor: guildSettings.welcomeTextColor || '#ffffff',
                accentColor: guildSettings.welcomeAccentColor || '#5865f2'
            });
            
            if (card) {
                // Create welcome embed for additional info
                const welcomeEmbed = embedFactory.welcome({
                    user: member.user,
                    guild: member.guild,
                    memberCount: member.guild.memberCount,
                    joinedAt: member.joinedAt
                });
                
                await welcomeChannel.send({
                    content: `🎉 Welcome ${member}!`,
                    embeds: [welcomeEmbed],
                    files: [card]
                });
            } else {
                // Fallback to regular message if card creation fails
                console.log('Welcome card creation failed, falling back to regular message');
                await this.sendWelcomeMessage(member, welcomeChannel, guildSettings);
            }
            
        } catch (error) {
            console.error('Error sending welcome card:', error);
            // Fallback to regular message
            await this.sendWelcomeMessage(member, welcomeChannel, guildSettings);
        }
    },
    
    async sendWelcomeMessage(member, welcomeChannel, guildSettings) {
        try {
            // Format welcome message
            const welcomeMessage = formatWelcomeMessage(
                guildSettings.welcomeMessage || 'Welcome {mention} to {server}!', 
                member.user, 
                member.guild
            );
            
            // Create welcome embed
            const welcomeEmbed = embedFactory.welcome({
                user: member.user,
                guild: member.guild,
                memberCount: member.guild.memberCount,
                joinedAt: member.joinedAt,
                message: welcomeMessage
            });
            
            await welcomeChannel.send({
                content: `👋 ${member}`,
                embeds: [welcomeEmbed]
            });
            
        } catch (error) {
            console.error('Error sending welcome message:', error);
            // Last fallback - plain text
            try {
                const simpleMessage = formatWelcomeMessage(
                    guildSettings.welcomeMessage || 'Welcome {mention} to {server}!',
                    member.user,
                    member.guild
                );
                await welcomeChannel.send(simpleMessage);
            } catch (finalError) {
                console.error('Final fallback failed:', finalError);
            }
        }
    }
};

// Helper function to format welcome message
function formatWelcomeMessage(template, user, guild) {
    return template
        .replace(/{user}/g, user.username)
        .replace(/{mention}/g, `<@${user.id}>`)
        .replace(/{server}/g, guild.name)
        .replace(/{membercount}/g, guild.memberCount.toLocaleString());
} 