const productionStyle = require('../../utils/demoStyle');

module.exports = {
    name: 'userinfo',
    aliases: ['user', 'whois', 'ui'],
    description: 'Hiển thị thông tin chi tiết về người dùng',
    usage: '!userinfo [@user]',
    examples: [
        '!userinfo',
        '!userinfo @John',
        '!whois 123456789',
        '!ui @member'
    ],
    permissions: 'member',
    guildOnly: true,
    category: 'management',
    
    async execute(message, args, client) {
        try {
            // Get target user
            let targetUser = message.author;
            let targetMember = message.member;
            
            if (args[0]) {
                // Try to get mentioned user
                const mention = message.mentions.users.first();
                if (mention) {
                    targetUser = mention;
                    targetMember = await message.guild.members.fetch(mention.id);
                } else {
                    // Try to get by ID
                    const userId = args[0].replace(/[<@!>]/g, '');
                    try {
                        targetUser = await client.users.fetch(userId);
                        targetMember = await message.guild.members.fetch(userId);
                    } catch (error) {
                        const result = productionStyle.createErrorEmbed(
                            'User Not Found',
                            'Vui lòng mention hoặc cung cấp ID hợp lệ!'
                        );
                        return message.reply({ 
                            embeds: [result.embed], 
                            files: result.attachments 
                        });
                    }
                }
            }
            
            // Prepare comprehensive user info fields
            const fields = [];
            
            // User creation date
            const userCreated = Math.floor(targetUser.createdTimestamp / 1000);
            
            // Basic user info
            fields.push({
                name: 'Basic Information',
                value: [
                    `Username: ${targetUser.username}`,
                    `Display Name: ${targetUser.displayName || 'None'}`,
                    `User ID: \`${targetUser.id}\``,
                    `Account Created: <t:${userCreated}:F>`,
                    `Bot Account: ${targetUser.bot ? 'Yes' : 'No'}`
                ].join('\n'),
                inline: false
            });
            
            // Server specific info if member exists
            if (targetMember) {
                const memberJoined = Math.floor(targetMember.joinedTimestamp / 1000);
                
                // User status and activity
                const presence = targetMember?.presence;
                const status = presence?.status || 'offline';
                const statusEmoji = {
                    'online': 'Online',
                    'idle': 'Idle', 
                    'dnd': 'Do Not Disturb',
                    'offline': 'Offline'
                };
                
                // Count user roles (exclude @everyone)
                const roleCount = targetMember.roles.cache.size - 1;
                const highestRole = targetMember?.roles.highest;
                
                fields.push({
                    name: 'Server Information',
                    value: [
                        `Nickname: ${targetMember.nickname || 'None'}`,
                        `Joined Server: <t:${memberJoined}:F>`,
                        `Status: ${statusEmoji[status]}`,
                        `Role Count: \`${roleCount}\``,
                        `Highest Role: ${highestRole.name !== '@everyone' ? highestRole : 'None'}`
                    ].join('\n'),
                    inline: true
                });
                
                // Check if user is boosting
                const boosting = targetMember?.premiumSince;
                if (boosting) {
                    const boostingSince = Math.floor(boosting.getTime() / 1000);
                    fields.push({
                        name: 'Nitro Boost',
                        value: `Boosting Since: <t:${boostingSince}:F>`,
                        inline: true
                    });
                }
                
                // Add activity if present
                if (presence?.activities && presence.activities.length > 0) {
                    const activity = presence.activities[0];
                    let activityText = activity.name;
                    
                    if (activity.type === 0) activityText = `Playing ${activityText}`;
                    else if (activity.type === 1) activityText = `Streaming ${activityText}`;
                    else if (activity.type === 2) activityText = `Listening ${activityText}`;
                    else if (activity.type === 3) activityText = `Watching ${activityText}`;
                    
                    fields.push({
                        name: 'Current Activity',
                        value: activityText,
                        inline: true
                    });
                }
            }
            
            // User flags (badges)
            const flags = targetUser.flags?.toArray() || [];
            const badges = [];
            
            const flagEmojis = {
                'Staff': 'Discord Staff',
                'Partner': 'Discord Partner',
                'Hypesquad': 'HypeSquad Events',
                'BugHunterLevel1': 'Bug Hunter',
                'BugHunterLevel2': 'Bug Hunter Gold',
                'HypeSquadOnlineHouse1': 'HypeSquad Bravery',
                'HypeSquadOnlineHouse2': 'HypeSquad Brilliance',
                'HypeSquadOnlineHouse3': 'HypeSquad Balance',
                'PremiumEarlySupporter': 'Early Nitro Supporter',
                'VerifiedDeveloper': 'Verified Bot Developer',
                'CertifiedModerator': 'Discord Certified Moderator',
                'ActiveDeveloper': 'Active Developer'
            };
            
            flags.forEach(flag => {
                if (flagEmojis[flag]) {
                    badges.push(flagEmojis[flag]);
                }
            });
            
            if (badges.length > 0) {
                fields.push({
                    name: 'Discord Badges',
                    value: badges.join('\n'),
                    inline: false
                });
            }
            
            // Add permissions if member has special perms
            if (targetMember) {
                const permissions = targetMember.permissions.toArray();
                const specialPerms = permissions.filter(perm => 
                    ['Administrator', 'ManageGuild', 'ManageChannels', 'ManageRoles', 'BanMembers', 'KickMembers'].includes(perm)
                );
                
                if (specialPerms.length > 0) {
                    const permNames = {
                        'Administrator': 'Administrator',
                        'ManageGuild': 'Manage Server',
                        'ManageChannels': 'Manage Channels',
                        'ManageRoles': 'Manage Roles',
                        'BanMembers': 'Ban Members',
                        'KickMembers': 'Kick Members'
                    };
                    
                    fields.push({
                        name: 'Special Permissions',
                        value: specialPerms.map(perm => permNames[perm] || perm).join('\n'),
                        inline: false
                    });
                }
            }
            
            const result = productionStyle.createSuccessEmbed(
                'USER INFO',
                targetUser,
                message.author,
                `Detailed information for ${targetUser.tag}`,
                fields
            );
            
            await message.reply({ 
                embeds: [result.embed], 
                files: result.attachments 
            });
            
        } catch (error) {
            console.error('Lỗi khi lấy thông tin user:', error);
            
            const result = productionStyle.createErrorEmbed(
                'User Info Error',
                'Không thể lấy thông tin người dùng!',
                error.message
            );
            
            await message.reply({ 
                embeds: [result.embed], 
                files: result.attachments 
            });
        }
    }
}; 