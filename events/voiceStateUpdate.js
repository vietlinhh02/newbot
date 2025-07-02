// Map to store voice join times
const voiceJoinTimes = new Map();

module.exports = {
    name: 'voiceStateUpdate',
    async execute(oldState, newState, client) {
        const userId = newState.id || oldState.id;
        
        try {
            // User joined a voice channel
            if (!oldState.channel && newState.channel) {
                voiceJoinTimes.set(userId, Date.now());
                console.log(`User ${userId} joined voice channel: ${newState.channel.name}`);
            }
            
            // User left a voice channel
            else if (oldState.channel && !newState.channel) {
                const joinTime = voiceJoinTimes.get(userId);
                if (joinTime) {
                    const timeSpent = Math.floor((Date.now() - joinTime) / 1000); // seconds
                    voiceJoinTimes.delete(userId);
                    
                    // Only count if spent at least 30 seconds
                    if (timeSpent >= 30) {
                        await updateVoiceTime(userId, timeSpent, client);
                        console.log(`User ${userId} spent ${timeSpent} seconds in voice`);
                    }
                }
            }
            
            // User switched voice channels (still in voice)
            else if (oldState.channel && newState.channel && oldState.channel.id !== newState.channel.id) {
                // Keep the same join time, just log the switch
                console.log(`User ${userId} switched from ${oldState.channel.name} to ${newState.channel.name}`);
            }
            
        } catch (error) {
            console.error('Error in voiceStateUpdate:', error);
        }
    }
};

async function updateVoiceTime(userId, timeSpent, client) {
    try {
        // Update or create cultivation user with voice time
        try {
            await client.prisma.cultivationUser.upsert({
                where: { userId: userId },
                update: {
                    voiceTime: { increment: timeSpent }
                },
                create: {
                    userId: userId,
                    exp: 0,
                    currentLevel: 'Phàm Nhân',
                    messageCount: 0,
                    voiceTime: timeSpent
                }
            });
        } catch (upsertError) {
            // Nếu không thể upsert với fields mới, thử với fields cũ
            console.warn('Could not upsert with new fields, trying basic upsert:', upsertError.message);
            await client.prisma.cultivationUser.upsert({
                where: { userId: userId },
                update: {
                    // Chỉ update exp tạm thời
                },
                create: {
                    userId: userId,
                    exp: 0,
                    currentLevel: 'Phàm Nhân'
                }
            });
            console.log('Voice time not tracked until database migration is completed');
            return;
        }
        
        // Recalculate EXP based on new voice time
        const user = await client.prisma.cultivationUser.findUnique({
            where: { userId: userId }
        });
        
        if (user && user.messageCount !== undefined) {
            const baseExpFromMessages = user.messageCount || 0; // 1 tin nhắn = 1 EXP
            const baseExpFromVoice = Math.floor((user.voiceTime || 0) / 60) * 5; // 1 phút = 5 EXP
            const totalBaseExp = baseExpFromMessages + baseExpFromVoice;
            
            // Get member to calculate role bonus (if available)
            let roleBonus = 0;
            try {
                // Try to get guild member for role bonus calculation
                const guild = client.guilds.cache.first(); // Assuming single guild bot
                if (guild) {
                    const member = await guild.members.fetch(userId);
                    if (member) {
                        roleBonus = getRoleExpBonus(member);
                    }
                }
            } catch (err) {
                // Member not found or guild issue, use 0 bonus
                console.log('Could not get member for role bonus calculation');
            }
            
            const bonusExp = Math.floor(totalBaseExp * (roleBonus / 100));
            const finalExp = totalBaseExp + bonusExp;
            
            // Update final EXP
            await client.prisma.cultivationUser.update({
                where: { userId: userId },
                data: { exp: finalExp }
            });
            
            console.log(`Updated EXP for user ${userId}: ${finalExp} (${baseExpFromMessages} from messages + ${baseExpFromVoice} from voice + ${bonusExp} bonus)`);
        } else {
            console.log('User does not have messageCount field, EXP recalculation skipped');
        }
        
    } catch (error) {
        console.error('Error updating voice time:', error);
    }
}

// Helper function for role bonus (copy from messageCreate.js)
function getRoleExpBonus(member) {
    let totalBonus = 0;
    
    // Booster role
    if (member.roles.cache.some(role => role.name === '‹PwB› Booster')) {
        totalBonus += 100; // +100% EXP
    }
    
    // VIP roles - có thể cộng dồn tất cả VIP roles
    const vipRoles = [
        { name: '‹PwB› Vip 1', bonus: 10 },
        { name: '‹PwB› Vip 2', bonus: 20 },
        { name: '‹PwB› Vip 3', bonus: 30 },
        { name: '‹PwB› Vip 4', bonus: 40 },
        { name: '‹PwB› Vip 5', bonus: 50 },
        { name: '‹PwB› Vip 6', bonus: 60 },
        { name: '‹PwB› Vip 7', bonus: 70 },
        { name: '‹PwB› Vip 8', bonus: 80 }
    ];
    
    // Cộng dồn tất cả VIP roles
    for (const roleData of vipRoles) {
        if (member.roles.cache.some(role => role.name === roleData.name)) {
            totalBonus += roleData.bonus;
        }
    }
    
    return totalBonus;
} 