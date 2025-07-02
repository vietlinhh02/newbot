const { PermissionFlagsBits } = require('discord.js');
const { hasFlexiblePermission } = require('../../utils/permissions');
const productionStyle = require('../../utils/demoStyle');
const { parseTime, formatDurationVietnamese } = require('../../utils/time');

module.exports = {
    name: 'tempban',
    aliases: ['tban', 'temporaryban'],
    description: 'Ban tạm thời người dùng với thời gian tự động unban',
    usage: '!tempban [@user|user_id] [duration] [reason]',
    examples: [
        '!tempban @John 1h spam',
        '!tempban 123456789 30m toxic behavior',
        '!tban @member 1d rule violation',
        '!temporaryban @user 12h harassment'
    ],
    permissions: 'admin',
    guildOnly: true,
    category: 'moderation',
    
    async execute(message, args, client) {
        // Check permissions
        if (!await hasFlexiblePermission(message.member, 'tempban', this.permissions, message.guild.id)) {
            const result = productionStyle.createErrorEmbed(
                'Permission Denied',
                'Bạn cần quyền **Ban Members** để sử dụng lệnh này!'
            );
            return message.reply({ 
                embeds: [result.embed], 
                files: result.attachments 
            });
        }
        
        // Check bot permissions
        if (!message.guild.members.me.permissions.has(PermissionFlagsBits.BanMembers)) {
            const result = productionStyle.createErrorEmbed(
                'Bot Missing Permissions',
                'Bot cần quyền **Ban Members** để thực hiện lệnh này!',
                'Grant the Ban Members permission to the bot'
            );
            return message.reply({ 
                embeds: [result.embed], 
                files: result.attachments 
            });
        }
        
        // Check arguments
        if (!args[0] || !args[1]) {
            const result = productionStyle.createWarningEmbed(
                'Missing Information',
                'Vui lòng cung cấp người dùng và thời gian!',
                [
                    { name: 'Usage', value: '`!tempban [@user|user_id] [duration] [reason]`' },
                    { name: 'Examples', value: '`!tempban @John 1h spam`\n`!tempban 123456789 30m toxic behavior`' },
                    { name: 'Duration Format', value: '`5m` = 5 minutes\n`2h` = 2 hours\n`1d` = 1 day' }
                ]
            );
            return message.reply({ 
                embeds: [result.embed], 
                files: result.attachments 
            });
        }
        
        // Parse user
        let targetUser = null;
        const userMention = message.mentions.users.first();
        const userId = args[0].replace(/[<@!>]/g, '');
        
        if (userMention) {
            targetUser = userMention;
        } else {
            try {
                targetUser = await client.users.fetch(userId);
            } catch (error) {
                const result = productionStyle.createErrorEmbed(
                    'User Not Found',
                    'Không tìm thấy người dùng!',
                    'Please provide a valid user mention or ID'
                );
                return message.reply({ 
                    embeds: [result.embed], 
                    files: result.attachments 
                });
            }
        }
        
        // Parse duration
        const duration = parseTime(args[1]);
        if (!duration) {
            const result = productionStyle.createErrorEmbed(
                'Invalid Duration',
                'Định dạng thời gian không hợp lệ!',
                'Examples: 30m, 2h, 1d, 7d'
            );
            return message.reply({ 
                embeds: [result.embed], 
                files: result.attachments 
            });
        }
        
        // Check duration limits (max 28 days)
        const maxDuration = 28 * 24 * 60 * 60 * 1000; // 28 days in ms
        if (duration > maxDuration) {
            const result = productionStyle.createErrorEmbed(
                'Duration Too Long',
                'Thời gian ban tối đa là 28 ngày!',
                'Please use a shorter duration'
            );
            return message.reply({ 
                embeds: [result.embed], 
                files: result.attachments 
            });
        }
        
        // Parse reason
        const reason = args.slice(2).join(' ') || 'Không có lý do được cung cấp';
        
        // Get target member if in guild
        let targetMember = null;
        try {
            targetMember = await message.guild.members.fetch(targetUser.id);
        } catch (error) {
            // User not in guild, can still ban by ID
        }
        
        // Permission checks for members in guild
        if (targetMember) {
            if (targetMember.id === message.author.id) {
                const result = productionStyle.createErrorEmbed(
                    'Invalid Target',
                    'Bạn không thể ban chính mình!'
                );
                return message.reply({ 
                    embeds: [result.embed], 
                    files: result.attachments 
                });
            }
            
            if (targetMember.id === message.guild.ownerId) {
                const result = productionStyle.createErrorEmbed(
                    'Invalid Target',
                    'Không thể ban chủ server!'
                );
                return message.reply({ 
                    embeds: [result.embed], 
                    files: result.attachments 
                });
            }
            
            if (targetMember.roles.highest.position >= message.member.roles.highest.position && message.author.id !== message.guild.ownerId) {
                const result = productionStyle.createErrorEmbed(
                    'Role Hierarchy Error',
                    'Bạn không thể ban người có role cao hơn hoặc bằng bạn!'
                );
                return message.reply({ 
                    embeds: [result.embed], 
                    files: result.attachments 
                });
            }
            
            if (!targetMember.bannable) {
                const result = productionStyle.createErrorEmbed(
                    'Cannot Ban User',
                    'Bot không thể ban người dùng này (role quá cao)!'
                );
                return message.reply({ 
                    embeds: [result.embed], 
                    files: result.attachments 
                });
            }
        }
        
        try {
            // Check if user is already banned
            const existingBan = await message.guild.bans.fetch(targetUser.id).catch(() => null);
            if (existingBan) {
                const result = productionStyle.createWarningEmbed(
                    'User Already Banned',
                    `${targetUser.tag} đã bị ban trước đó!`,
                    [
                        { name: 'Current Ban Reason', value: existingBan.reason || 'No reason provided' },
                        { name: 'Action', value: 'Use `!unban` first if you want to reban with different duration' }
                    ]
                );
                return message.reply({ 
                    embeds: [result.embed], 
                    files: result.attachments 
                });
            }
            
            // Send DM before banning
            let dmSent = false;
            try {
                const dmResult = productionStyle.createWarningEmbed(
                    'You Have Been Temporarily Banned',
                    { tag: message.guild.name },
                    message.author,
                    `Bạn đã bị ban tạm thời khỏi **${message.guild.name}**`,
                    [
                        { name: 'Duration', value: formatDurationVietnamese(duration), inline: true },
                        { name: 'Reason', value: reason, inline: true },
                        { name: 'Banned By', value: message.author.tag, inline: true },
                        { name: 'Unban Time', value: `<t:${Math.floor((Date.now() + duration) / 1000)}:F>`, inline: false },
                        { name: 'Appeal', value: 'Contact server moderators if you believe this was a mistake' }
                    ]
                );
                
                await targetUser.send({ 
                    embeds: [dmResult.embed], 
                    files: dmResult.attachments 
                });
                dmSent = true;
            } catch (error) {
                console.log(`Không thể gửi DM cho ${targetUser.tag}:`, error.message);
            }
            
            // Ban the user
            await message.guild.members.ban(targetUser, {
                reason: `[TEMPBAN] ${reason} | Duration: ${formatDurationVietnamese(duration)} | By: ${message.author.tag}`,
                deleteMessageDays: 1
            });
            
            // Schedule unban
            const unbanTime = Date.now() + duration;
            await client.prisma.tempBan.create({
                data: {
                    userId: targetUser.id,
                    guildId: message.guild.id,
                    unbanAt: new Date(unbanTime),
                    reason: reason,
                    moderatorId: message.author.id
                }
            });
            
            // Success message
            const result = productionStyle.createSuccessEmbed(
                'USER TEMPORARILY BANNED',
                { tag: 'Moderation Action' },
                message.author,
                `${targetUser.tag} đã bị ban tạm thời thành công!`,
                [
                    { name: 'Target User', value: `${targetUser.tag}\n(${targetUser.id})`, inline: true },
                    { name: 'Duration', value: formatDurationVietnamese(duration), inline: true },
                    { name: 'DM Sent', value: dmSent ? '✅ Success' : '❌ Failed', inline: true },
                    { name: 'Unban Time', value: `<t:${Math.floor(unbanTime / 1000)}:F>`, inline: true },
                    { name: 'Messages Deleted', value: '1 day', inline: true },
                    { name: 'Auto Unban', value: '✅ Scheduled', inline: true },
                    { name: 'Reason', value: reason, inline: false }
                ]
            );
            
            await message.reply({ 
                embeds: [result.embed], 
                files: result.attachments 
            });
            
            // Log to moderation channel
            const logChannel = await getLogChannel(client, message.guild.id);
            if (logChannel) {
                const logResult = productionStyle.createWarningEmbed(
                    'TEMPBAN LOG',
                    { tag: 'Moderation Log' },
                    message.author,
                    `${targetUser.tag} temporarily banned`,
                    [
                        { name: 'Target User', value: `${targetUser.tag} (${targetUser.id})`, inline: true },
                        { name: 'Duration', value: formatDurationVietnamese(duration), inline: true },
                        { name: 'Moderator', value: `${message.author.tag} (${message.author.id})`, inline: true },
                        { name: 'Channel', value: message.channel.toString(), inline: true },
                        { name: 'Unban Time', value: `<t:${Math.floor(unbanTime / 1000)}:F>`, inline: true },
                        { name: 'DM Status', value: dmSent ? 'Sent' : 'Failed', inline: true },
                        { name: 'Reason', value: reason, inline: false }
                    ]
                );
                
                await logChannel.send({ 
                    embeds: [logResult.embed], 
                    files: logResult.attachments 
                });
            }
            
        } catch (error) {
            console.error('Lỗi khi tempban:', error);
            
            let errorMessage = 'Không thể ban người dùng!';
            if (error.code === 10013) {
                errorMessage = 'Người dùng không tồn tại!';
            } else if (error.code === 10007) {
                errorMessage = 'Người dùng không tồn tại!';
            } else if (error.code === 50013) {
                errorMessage = 'Bot không có quyền ban người dùng này!';
            }
            
            const result = productionStyle.createErrorEmbed(
                'Tempban Failed',
                errorMessage,
                error.message
            );
            await message.reply({ 
                embeds: [result.embed], 
                files: result.attachments 
            });
        }
    }
};

// Helper function to get log channel
async function getLogChannel(client, guildId) {
    try {
        const guildSettings = await client.prisma.guildSettings.findUnique({
            where: { guildId: guildId }
        });
        
        if (guildSettings?.logChannel) {
            const guild = client.guilds.cache.get(guildId);
            return guild?.channels.cache.get(guildSettings.logChannel);
        }
    } catch (error) {
        console.error('Error getting log channel:', error);
    }
    return null;
} 