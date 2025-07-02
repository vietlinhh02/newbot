const { hasFlexiblePermission } = require('../../utils/permissions');
const productionStyle = require('../../utils/demoStyle');

module.exports = {
    name: 'checkperms',
    aliases: ['perms', 'permissions'],
    description: 'Kiểm tra quyền của user hoặc bot',
    usage: '!checkperms [@user] [channel]',
    examples: [
        '!checkperms @User',
        '!checkperms @Bot #general',
        '!checkperms (kiểm tra quyền của bạn)',
        '!perms @User #voice-chat'
    ],
    permissions: 'helper',
    guildOnly: true,
    category: 'moderation',
    
    async execute(message, args, client) {
        // Check permissions  
        if (!await hasFlexiblePermission(message.member, 'checkperms', this.permissions, message.guild.id)) {
            const result = productionStyle.createErrorEmbed(
                'Permission Denied',
                'Bạn cần quyền **Moderator** hoặc cao hơn để sử dụng lệnh này!'
            );
            return message.reply({ 
                embeds: [result.embed], 
                files: result.attachments 
            });
        }

        // Parse target user
        let targetMember = message.member;
        if (args[0]) {
            const userMention = message.mentions.members.first();
            const userId = args[0].replace(/[<@!>]/g, '');
            
            if (userMention) {
                targetMember = userMention;
            } else {
                try {
                    targetMember = await message.guild.members.fetch(userId);
                } catch (error) {
                    const result = productionStyle.createErrorEmbed(
                        'User Not Found',
                        'Không tìm thấy user trong server này!',
                        'Please provide a valid user mention or ID'
                    );
                    return message.reply({ 
                        embeds: [result.embed], 
                        files: result.attachments 
                    });
                }
            }
        }

        // Parse target channel
        let targetChannel = message.channel;
        const channelArg = args.find(arg => arg.startsWith('<#') || /^\d{17,19}$/.test(arg));
        
        if (channelArg) {
            const channelMention = message.mentions.channels.first();
            const channelId = channelArg.replace(/[<#>]/g, '');
            
            if (channelMention) {
                targetChannel = channelMention;
            } else {
                const foundChannel = message.guild.channels.cache.get(channelId);
                if (foundChannel) {
                    targetChannel = foundChannel;
                } else {
                    const result = productionStyle.createErrorEmbed(
                        'Channel Not Found',
                        'Không tìm thấy channel trong server này!',
                        'Please provide a valid channel mention or ID'
                    );
                    return message.reply({ 
                        embeds: [result.embed], 
                        files: result.attachments 
                    });
                }
            }
        }

        try {
            // Get permissions for the target channel
            const permissions = targetChannel.permissionsFor(targetMember);
            
            if (!permissions) {
                const result = productionStyle.createErrorEmbed(
                    'Cannot Check Permissions',
                    'Không thể kiểm tra quyền của user trong channel này!',
                    'User may not have access to this channel'
                );
                return message.reply({ 
                    embeds: [result.embed], 
                    files: result.attachments 
                });
            }

            // Define important permissions to check
            const importantPerms = [
                { name: 'Administrator', key: 'Administrator', description: 'Toàn quyền server' },
                { name: 'Manage Server', key: 'ManageGuild', description: 'Quản lý server' },
                { name: 'Manage Roles', key: 'ManageRoles', description: 'Quản lý roles' },
                { name: 'Manage Channels', key: 'ManageChannels', description: 'Quản lý channels' },
                { name: 'Kick Members', key: 'KickMembers', description: 'Kick thành viên' },
                { name: 'Ban Members', key: 'BanMembers', description: 'Ban thành viên' },
                { name: 'Timeout Members', key: 'ModerateMembers', description: 'Timeout thành viên' },
                { name: 'Manage Messages', key: 'ManageMessages', description: 'Quản lý tin nhắn' },
                { name: 'Send Messages', key: 'SendMessages', description: 'Gửi tin nhắn' },
                { name: 'Read Messages', key: 'ViewChannel', description: 'Xem channel' },
                { name: 'Connect Voice', key: 'Connect', description: 'Kết nối voice' },
                { name: 'Speak', key: 'Speak', description: 'Nói trong voice' },
                { name: 'Mute Members', key: 'MuteMembers', description: 'Mute trong voice' },
                { name: 'Deafen Members', key: 'DeafenMembers', description: 'Deafen trong voice' },
                { name: 'Move Members', key: 'MoveMembers', description: 'Di chuyển members' }
            ];

            // Check each permission
            const hasPerms = [];
            const missingPerms = [];

            importantPerms.forEach(perm => {
                if (permissions.has(perm.key)) {
                    hasPerms.push(`✅ ${perm.name} - ${perm.description}`);
                } else {
                    missingPerms.push(`❌ ${perm.name} - ${perm.description}`);
                }
            });

            // Get user's highest role
            const highestRole = targetMember.roles.highest;
            const rolePosition = highestRole.position;
            const totalRoles = targetMember.roles.cache.size - 1; // Exclude @everyone

            // Build permission fields
            const fields = [
                { 
                    name: 'User Information', 
                    value: `**Username:** ${targetMember.user.tag}\n**Display Name:** ${targetMember.displayName}\n**ID:** ${targetMember.id}`, 
                    inline: true 
                },
                { 
                    name: 'Channel Information', 
                    value: `**Channel:** ${targetChannel.name}\n**Type:** ${targetChannel.type === 0 ? 'Text' : targetChannel.type === 2 ? 'Voice' : 'Other'}\n**ID:** ${targetChannel.id}`, 
                    inline: true 
                },
                { 
                    name: 'Role Information', 
                    value: `**Highest Role:** ${highestRole.name}\n**Position:** #${rolePosition}\n**Total Roles:** ${totalRoles}`, 
                    inline: true 
                }
            ];

            // Add permissions granted
            if (hasPerms.length > 0) {
                const permText = hasPerms.slice(0, 8).join('\n'); // Limit to prevent embed overflow
                fields.push({ 
                    name: `Permissions Granted (${hasPerms.length})`, 
                    value: permText + (hasPerms.length > 8 ? `\n... và ${hasPerms.length - 8} quyền khác` : ''), 
                    inline: false 
                });
            }

            // Add missing permissions (only show first few to avoid overflow)
            if (missingPerms.length > 0 && missingPerms.length <= 8) {
                const permText = missingPerms.slice(0, 6).join('\n');
                fields.push({ 
                    name: `Missing Permissions (${missingPerms.length})`, 
                    value: permText + (missingPerms.length > 6 ? `\n... và ${missingPerms.length - 6} quyền khác` : ''), 
                    inline: false 
                });
            }

            // Special status checks
            const statusFields = [];
            if (targetMember.id === message.guild.ownerId) {
                statusFields.push('👑 Server Owner');
            }
            if (targetMember.permissions.has('Administrator')) {
                statusFields.push('⚡ Administrator');
            }
            if (targetMember.user.bot) {
                statusFields.push('🤖 Bot Account');
            }
            if (targetMember.premiumSince) {
                statusFields.push('💎 Server Booster');
            }

            if (statusFields.length > 0) {
                fields.push({ 
                    name: 'Special Status', 
                    value: statusFields.join('\n'), 
                    inline: true 
                });
            }

            // Summary stats
            fields.push({ 
                name: 'Permission Summary', 
                value: `**Total Granted:** ${hasPerms.length}/${importantPerms.length}\n**Coverage:** ${Math.round((hasPerms.length / importantPerms.length) * 100)}%`, 
                inline: true 
            });

            const result = productionStyle.createInfoEmbed(
                'PERMISSION CHECK RESULTS',
                { tag: 'Security Analysis' },
                message.author,
                `Permission analysis for ${targetMember.displayName} in ${targetChannel.name}`,
                fields
            );

            await message.reply({ 
                embeds: [result.embed], 
                files: result.attachments 
            });

        } catch (error) {
            console.error('Lỗi khi kiểm tra quyền:', error);
            
            const result = productionStyle.createErrorEmbed(
                'Permission Check Failed',
                'Không thể kiểm tra quyền!',
                error.message
            );
            await message.reply({ 
                embeds: [result.embed], 
                files: result.attachments 
            });
        }
    }
}; 