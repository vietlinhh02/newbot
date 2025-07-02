module.exports = {
    name: 'guildMemberRemove',
    once: false,
    
    async execute(member, client) {
        try {
            // Get guild settings
            const guildSettings = await client.prisma.guildSettings.findUnique({
                where: { guildId: member.guild.id }
            });
            
            // Check if leave message is configured
            if (!guildSettings?.leaveChannel || !guildSettings?.leaveMessage) {
                return; // No leave system configured
            }
            
            // Get leave channel
            const leaveChannel = member.guild.channels.cache.get(guildSettings.leaveChannel);
            if (!leaveChannel) {
                console.log(`Leave channel not found for guild ${member.guild.id}`);
                return;
            }
            
            // Check bot permissions
            const botPermissions = leaveChannel.permissionsFor(member.guild.members.me);
            if (!botPermissions.has(['ViewChannel', 'SendMessages'])) {
                console.log(`No permissions to send leave message in ${leaveChannel.name}`);
                return;
            }
            
            // Format leave message
            const leaveMessage = formatLeaveMessage(
                guildSettings.leaveMessage, 
                member.user, 
                member.guild
            );
            
            // Send leave message
            await leaveChannel.send(leaveMessage);
            
            console.log(`Leave message sent for ${member.user.tag} in ${member.guild.name}`);
            
        } catch (error) {
            console.error('Error in guildMemberRemove event:', error);
        }
    }
};

// Helper function to format leave message
function formatLeaveMessage(template, user, guild) {
    return template
        .replace(/{user}/g, user.username)
        .replace(/{mention}/g, `<@${user.id}>`)
        .replace(/{server}/g, guild.name)
        .replace(/{membercount}/g, guild.memberCount.toLocaleString());
} 