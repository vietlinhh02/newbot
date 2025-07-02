const { hasPermission, hasFlexiblePermission, getPermissionErrorMessage } = require('../utils/permissions');
const embedFactory = require('../utils/embeds');
const logger = require('../utils/logger');
const config = require('../config.json');
const { getLevelByName, getNextLevel, canBreakthrough } = require('../utils/cultivationData');

// Map to store cooldowns
const cooldowns = new Map();

// Hàm tính bonus exp theo role (có thể cộng dồn)
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

// Hàm xử lý message và voice exp
async function processActivityExp(message, client) {
    const userId = message.author.id;
    const guildId = message.guild.id;
    
    try {
        // Tìm hoặc tạo cultivation user
        let cultivationUser = await client.prisma.cultivationUser.findUnique({
            where: { userId: userId }
        });
        
        if (!cultivationUser) {
            // Tạo user mới với tất cả fields cần thiết
            try {
                cultivationUser = await client.prisma.cultivationUser.create({
                    data: {
                        userId: userId,
                        exp: 0,
                        currentLevel: 'Phàm Nhân',
                        messageCount: 1, // Bắt đầu với 1 vì đây là tin nhắn đầu tiên
                        voiceTime: 0
                    }
                });
                console.log(`Created new cultivation user for ${userId}`);
                return; // Skip processing for first message to avoid issues
            } catch (createError) {
                // Nếu không thể tạo với fields mới, tạo với fields cũ
                console.warn('Database might not have new fields yet, creating with basic fields');
                cultivationUser = await client.prisma.cultivationUser.create({
                    data: {
                        userId: userId,
                        exp: 0,
                        currentLevel: 'Phàm Nhân'
                    }
                });
                return; // Skip processing since we can't update messageCount yet
            }
        }
        
        // Check if user has new fields (messageCount), if not skip processing
        if (cultivationUser.messageCount === undefined) {
            console.log('User does not have messageCount field, skipping EXP processing until migration is run');
            return;
        }
        
        // Cập nhật message count với safe fallback
        const currentMessageCount = cultivationUser.messageCount || 0;
        const newMessageCount = currentMessageCount + 1;
        
        // Tính EXP từ activity với công thức mới:
        // - 1 tin nhắn = 1 EXP base
        // - 1 phút voice = 5 EXP base
        const baseExpFromMessages = newMessageCount; // 1 tin nhắn = 1 EXP
        const currentVoiceTime = cultivationUser.voiceTime || 0;
        const baseExpFromVoice = Math.floor(currentVoiceTime / 60) * 5; // 1 phút = 5 EXP
        const totalBaseExp = baseExpFromMessages + baseExpFromVoice;
        
        // Tính bonus từ roles
        const roleBonus = getRoleExpBonus(message.member);
        const bonusExp = Math.floor(totalBaseExp * (roleBonus / 100));
        const finalExp = totalBaseExp + bonusExp;
        
        // Validate values before updating (prevent NaN)
        if (isNaN(newMessageCount) || isNaN(finalExp)) {
            console.error('NaN detected in EXP calculation:', {
                newMessageCount,
                finalExp,
                totalBaseExp,
                roleBonus,
                baseExpFromMessages,
                baseExpFromVoice
            });
            return;
        }
        
        // Lưu exp trước khi update để so sánh breakthrough
        const oldExp = cultivationUser.exp || 0;
        const currentLevelData = getLevelByName(cultivationUser.currentLevel);
        const nextLevelData = getNextLevel(cultivationUser.currentLevel);
        
        // Cập nhật user data - thử với fields mới trước
        try {
            const updatedUser = await client.prisma.cultivationUser.update({
                where: { userId: userId },
                data: { 
                    messageCount: newMessageCount,
                    exp: finalExp
                }
            });
            
            // CHỈ thông báo khi có thể đột phá (và trước đó chưa đủ exp)
            if (nextLevelData && currentLevelData) {
                const couldBreakthroughBefore = canBreakthrough(cultivationUser.currentLevel, oldExp);
                const canBreakthroughNow = canBreakthrough(updatedUser.currentLevel, updatedUser.exp);
                
                // Chỉ thông báo khi lần đầu đủ exp để breakthrough
                if (!couldBreakthroughBefore && canBreakthroughNow) {
                                    const breakthroughMessage = `🌟 **${message.author.username}** đã đủ exp để đột phá!\n` +
                    `⬆️ **${updatedUser.currentLevel}** → **${nextLevelData.name}**\n` +
                    `📊 **EXP:** ${updatedUser.exp}\n` +
                    `💫 Dùng \`!breakthrough\` để thử đột phá!`;
                    
                    await message.reply(breakthroughMessage);
                }
            }
            
        } catch (updateError) {
            // Nếu update fail vì chưa có fields mới, chỉ update exp
            console.warn('Could not update with new fields, updating only exp:', updateError.message);
            await client.prisma.cultivationUser.update({
                where: { userId: userId },
                data: { exp: finalExp }
            });
        }
        
    } catch (error) {
        console.error('Error processing activity exp:', error);
    }
}

module.exports = {
    name: 'messageCreate',
    async execute(message, client) {
        // Ignore bots
        if (message.author.bot) return;
        
        // Only process messages in guilds
        if (!message.guild) return;
        
        // Process activity exp cho mọi message (không phải command)
        if (!message.content.startsWith('!')) {
            await processActivityExp(message, client);
        }
        
        // Get guild settings for prefix
        let prefix = config.defaultSettings.prefix;
        
        try {
            const guildSettings = await client.prisma.guildSettings.findUnique({
                where: { guildId: message.guild.id }
            });
            
            if (guildSettings?.prefix) {
                prefix = guildSettings.prefix;
            }
        } catch (error) {
            logger.error('Error getting guild prefix', error);
            // Inform user about the error if prefix cannot be fetched
            const errorEmbed = embedFactory.error(
                'Lỗi cấu hình!',
                'Không thể lấy tiền tố của bot. Vui lòng thử lại sau hoặc liên hệ quản trị viên.'
            );
            return message.reply({ embeds: [errorEmbed] });
        }
        
        // Check if message starts with prefix
        if (!message.content.startsWith(prefix)) return;
        
        // Parse command and arguments
        const args = message.content.slice(prefix.length).trim().split(/ +/);
        const commandName = args.shift().toLowerCase();
        
        // Get command
        const command = client.commands.get(commandName) || 
                       client.commands.find(cmd => cmd.aliases && cmd.aliases.includes(commandName));
        
        if (!command) return;
        
        try {
            // Check permissions with flexible system
            if (command.permissions) {
                const hasPerms = await hasFlexiblePermission(
                    message.member, 
                    command.name, 
                    command.permissions, 
                    message.guild.id
                );
                
                if (!hasPerms) {
                    const errorEmbed = embedFactory.error(
                        'Không có quyền!',
                        getPermissionErrorMessage(command.permissions, command.name)
                    );
                    
                    return message.reply({ embeds: [errorEmbed] });
                }
            }
            
            // Check if command requires guild only
            if (command.guildOnly && !message.guild) {
                const errorEmbed = embedFactory.error(
                    'Lỗi!',
                    'Lệnh này chỉ có thể sử dụng trong server!'
                );
                
                return message.reply({ embeds: [errorEmbed] });
            }
            
            // Cooldown system
            if (command.cooldown) {
                if (!cooldowns.has(command.name)) {
                    cooldowns.set(command.name, new Collection());
                }

                const now = Date.now();
                const timestamps = cooldowns.get(command.name);
                const cooldownAmount = (command.cooldown || 3) * 1000; // Default 3 seconds

                if (timestamps.has(message.author.id)) {
                    const expirationTime = timestamps.get(message.author.id) + cooldownAmount;

                    if (now < expirationTime) {
                        const timeLeft = (expirationTime - now) / 1000;
                        const embed = embedFactory.warning(
                            'Chờ đã!',
                            `Vui lòng chờ ${timeLeft.toFixed(1)} giây nữa trước khi sử dụng lệnh \`${command.name}\`!`
                        );
                        return message.reply({ embeds: [embed] });
                    }
                }

                timestamps.set(message.author.id, now);
                setTimeout(() => timestamps.delete(message.author.id), cooldownAmount);
            }
            
            // Log command execution
            logger.command(message.author, commandName, message.guild);
            
            // Execute command
            await command.execute(message, args, client);
            
        } catch (error) {
            logger.error(`Error executing command ${commandName}`, error);
            
            const errorEmbed = embedFactory.error(
                'Lỗi hệ thống!',
                'Đã xảy ra lỗi khi thực thi lệnh. Vui lòng thử lại sau.',
                error.message
            );
            
            try {
                await message.reply({ embeds: [errorEmbed] });
            } catch (replyError) {
                logger.error('Cannot send error message', replyError);
            }
        }
    }
};