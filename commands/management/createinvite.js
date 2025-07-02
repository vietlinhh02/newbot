const { PermissionFlagsBits } = require('discord.js');
const { hasFlexiblePermission } = require('../../utils/permissions');
const { parseTime, formatDurationVietnamese } = require('../../utils/time');

module.exports = {
    name: 'createinvite',
    aliases: ['invite', 'newinvite', 'makeinvite'],
    description: 'Tạo invite link mới cho server',
    usage: '!createinvite [channel] [maxAge] [maxUses] [reason]',
    examples: [
        '!createinvite',
        '!createinvite #general',
        '!createinvite #welcome 1d 10',
        '!invite #general 7d 0 Welcome invite',
        '!newinvite #announcements 0 1 Special invite'
    ],
    permissions: 'helper',
    guildOnly: true,
    category: 'management',
    
    async execute(message, args, client) {
        // Initialize embed factory
        embedFactory.setClient(client);
        
        // Check permissions
        if (!await hasFlexiblePermission(message.member, 'createinvite', this.permissions, message.guild.id)) {
            const embed = embedFactory.error('Không đủ quyền', 'Bạn cần quyền **Create Instant Invite** để sử dụng lệnh này!', null, message.author);
            return message.reply({ embeds: [embed] });
        }
        
        // Check bot permissions
        if (!message.guild.members.me.permissions.has(PermissionFlagsBits.CreateInstantInvite)) {
            return message.reply('❌ Bot cần quyền **Create Instant Invite** để thực hiện lệnh này!');
        }
        
        // Parse arguments
        let targetChannel = message.channel;
        let maxAge = 0; // 0 = never expire
        let maxUses = 0; // 0 = unlimited
        let reason = 'Invite được tạo bởi bot';
        let argIndex = 0;
        
        // Parse channel if provided
        if (args[0] && (args[0].startsWith('<#') || /^\d+$/.test(args[0]))) {
            const channelMention = message.mentions.channels.first();
            const channelId = args[0].replace(/[<#>]/g, '');
            
            if (channelMention) {
                targetChannel = channelMention;
            } else {
                try {
                    targetChannel = await message.guild.channels.fetch(channelId);
                } catch (error) {
                    const embed = embedFactory.error('Không tìm thấy kênh', 'Kênh không tồn tại hoặc không hợp lệ!', null, message.author);
            return message.reply({ embeds: [embed] });
                }
            }
            argIndex = 1;
        }
        
        // Check if channel supports invites
        if (!targetChannel.isTextBased() && targetChannel.type !== 2) { // Not text or voice
            const embed = embedFactory.error('Lỗi', 'Chỉ có thể tạo invite cho text hoặc voice channel!', null, message.author);
            return message.reply({ embeds: [embed] });
        }
        
        // Check bot permissions in target channel
        const botPermissions = targetChannel.permissionsFor(message.guild.members.me);
        if (!botPermissions.has(PermissionFlagsBits.CreateInstantInvite)) {
            return message.reply(`❌ Bot không có quyền **Create Instant Invite** trong ${targetChannel}!`);
        }
        
        // Parse maxAge (duration)
        if (args[argIndex]) {
            const duration = parseTime(args[argIndex]);
            if (duration) {
                maxAge = Math.floor(duration / 1000); // Convert to seconds
                argIndex++;
            } else if (!isNaN(args[argIndex])) {
                // If it's a number, treat as seconds
                maxAge = parseInt(args[argIndex]);
                argIndex++;
            }
        }
        
        // Parse maxUses
        if (args[argIndex]) {
            const uses = parseInt(args[argIndex]);
            if (!isNaN(uses) && uses >= 0) {
                maxUses = uses;
                argIndex++;
            }
        }
        
        // Parse reason
        if (args[argIndex]) {
            reason = args.slice(argIndex).join(' ');
        }
        
        // Validate limits
        if (maxAge < 0 || maxAge > 604800) { // Max 7 days
            const embed = embedFactory.error('Thời gian không hợp lệ', 'Thời gian tối đa là 7 ngày (604800 giây)!', null, message.author);
            return message.reply({ embeds: [embed] });
        }
        
        if (maxUses < 0 || maxUses > 100) {
            const embed = embedFactory.error('Số lần sử dụng không hợp lệ', 'Tối đa 100 lần sử dụng!', null, message.author);
            return message.reply({ embeds: [embed] });
        }
        
        try {
            // Create invite
            const invite = await targetChannel.createInvite({
                maxAge: maxAge,
                maxUses: maxUses,
                unique: true,
                reason: `Invite created by ${message.author.tag}: ${reason}`
            });
            
            // Format expiration time
            const expirationText = maxAge === 0 ? 
                'Không bao giờ' : 
                `<t:${Math.floor((Date.now() + (maxAge * 1000)) / 1000)}:F>`;
            
            const usesText = maxUses === 0 ? 'Không giới hạn' : maxUses.toString();
            
            // Success message
            const successMessage = `✅ **Đã tạo invite thành công!**\n` +
                `🔗 **Link:** https://discord.gg/${invite.code}\n` +
                `📺 **Kênh:** ${targetChannel}\n` +
                `⏰ **Hết hạn:** ${expirationText}\n` +
                `🔢 **Max uses:** ${usesText}\n` +
                `📝 **Lý do:** ${reason}`;
            
            await message.reply(successMessage);
            
            // Store invite in database for tracking (optional)
            try {
                await client.prisma.invite.create({
                    data: {
                        code: invite.code,
                        guildId: message.guild.id,
                        inviterId: message.author.id,
                        uses: 0,
                        maxUses: maxUses
                    }
                });
            } catch (dbError) {
                console.error('Error storing invite in database:', dbError);
                // Continue anyway, invite was created successfully
            }
            
            // Log to moderation channel if configured
            try {
                const guildSettings = await client.prisma.guildSettings.findUnique({
                    where: { guildId: message.guild.id }
                });
                
                if (guildSettings?.logChannel) {
                    const logChannel = message.guild.channels.cache.get(guildSettings.logChannel);
                    
                    if (logChannel && logChannel.id !== message.channel.id) {
                        const logMessage = `🔗 **Invite Created**\n` +
                            `**Code:** \`${invite.code}\`\n` +
                            `**Channel:** ${targetChannel}\n` +
                            `**Created by:** ${message.author}\n` +
                            `**Max Age:** ${maxAge === 0 ? 'Never' : `${maxAge}s`}\n` +
                            `**Max Uses:** ${maxUses === 0 ? 'Unlimited' : maxUses}\n` +
                            `**Reason:** ${reason}`;
                        
                        await logChannel.send(logMessage);
                    }
                }
            } catch (logError) {
                console.error('Lỗi khi gửi log:', logError);
            }
            
        } catch (error) {
            console.error('Lỗi khi tạo invite:', error);
            
            let errorMessage = 'Đã xảy ra lỗi khi tạo invite!';
            
            if (error.code === 50013) {
                errorMessage = 'Bot không có đủ quyền để tạo invite!';
            } else if (error.code === 50001) {
                errorMessage = 'Bot không có quyền truy cập kênh này!';
            } else if (error.code === 30016) {
                errorMessage = 'Đã đạt giới hạn số lượng invite cho server này!';
            }
            
            await message.reply(`❌ **Lỗi!** ${errorMessage}`);
        }
    }
}; 