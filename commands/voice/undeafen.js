const { PermissionFlagsBits } = require('discord.js');
const { hasFlexiblePermission } = require('../../utils/permissions');
const productionStyle = require('../../utils/demoStyle');

module.exports = {
    name: 'undeafen',
    aliases: ['undeaf', 'vundeaf'],
    description: 'Bỏ câm tai người dùng trong voice channel',
    usage: '!undeafen [@user] [reason]',
    examples: [
        '!undeafen @John',
        '!undeaf @user Behavior improved',
        '!vundeaf 123456789 Warning period over'
    ],
    permissions: 'helper',
    guildOnly: true,
    category: 'voice',
    
    async execute(message, args, client) {
        // Check permissions
        if (!await hasFlexiblePermission(message.member, 'undeafen', this.permissions, message.guild.id)) {
            const result = productionStyle.createErrorEmbed(
                'Permission Denied',
                'Bạn cần quyền **Deafen Members** để undeafen!'
            );
            return message.reply({ 
                embeds: [result.embed], 
                files: result.attachments 
            });
        }
        
        // Check bot permissions
        if (!message.guild.members.me.permissions.has(PermissionFlagsBits.DeafenMembers)) {
            const result = productionStyle.createErrorEmbed(
                'Bot Missing Permissions',
                'Bot cần quyền **Deafen Members** để thực hiện lệnh này!'
            );
            return message.reply({ 
                embeds: [result.embed], 
                files: result.attachments 
            });
        }
        
        // Check arguments
        if (!args[0]) {
            const result = productionStyle.createWarningEmbed(
                'Missing Information',
                'Vui lòng cung cấp người dùng cần undeafen!',
                [
                    { name: 'Usage', value: '`!undeafen [@user] [reason]`' },
                    { name: 'Example', value: '`!undeafen @John`' }
                ]
            );
            return message.reply({ 
                embeds: [result.embed], 
                files: result.attachments 
            });
        }
        
        // Parse user
        let targetUser = null;
        let targetMember = null;
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
                    'Vui lòng mention hoặc cung cấp ID hợp lệ!'
                );
                return message.reply({ 
                    embeds: [result.embed], 
                    files: result.attachments 
                });
            }
        }
        
        // Get member object
        try {
            targetMember = await message.guild.members.fetch(targetUser.id);
        } catch (error) {
            const result = productionStyle.createErrorEmbed(
                'Member Not Found',
                'Người dùng không ở trong server này!'
            );
            return message.reply({ 
                embeds: [result.embed], 
                files: result.attachments 
            });
        }
        
        // Check if user is in voice channel
        if (!targetMember.voice.channel) {
            const result = productionStyle.createWarningEmbed(
                'Not in Voice Channel',
                `${targetUser.tag} không ở trong voice channel nào!`
            );
            return message.reply({ 
                embeds: [result.embed], 
                files: result.attachments 
            });
        }
        
        // Check if user is deafened
        if (!targetMember.voice.deaf) {
            const result = productionStyle.createWarningEmbed(
                'Not Deafened',
                `${targetUser.tag} không bị deafen!`
            );
            return message.reply({ 
                embeds: [result.embed], 
                files: result.attachments 
            });
        }
        
        // Get reason
        const reason = args.slice(1).join(' ') || 'Không có lý do được cung cấp';
        
        try {
            // Undeafen user
            await targetMember.voice.setDeaf(false, `Undeafened by ${message.author.tag}: ${reason}`);
            
            // Success message với production style
            const result = productionStyle.createSuccessEmbed(
                'VOICE UNDEAFEN',
                targetUser,
                message.author,
                reason,
                [
                    { name: 'Voice Channel', value: targetMember.voice.channel.name, inline: true },
                    { name: 'Status', value: 'Undeafened', inline: true },
                    { name: 'Effect', value: 'Can hear audio again', inline: true }
                ]
            );
            
            await message.reply({ 
                embeds: [result.embed], 
                files: result.attachments 
            });
            
            // Log to moderation channel if configured
            try {
                const guildSettings = await client.prisma.guildSettings.findUnique({
                    where: { guildId: message.guild.id }
                });
                
                if (guildSettings?.logChannel) {
                    const logChannel = message.guild.channels.cache.get(guildSettings.logChannel);
                    
                    if (logChannel) {
                        const logResult = productionStyle.createSuccessEmbed(
                            'VOICE UNDEAFEN',
                            targetUser,
                            message.author,
                            reason,
                            [
                                { name: 'Voice Channel', value: targetMember.voice.channel.name, inline: true },
                                { name: 'Command Channel', value: message.channel.toString(), inline: true },
                                { name: 'Time', value: `<t:${Math.floor(Date.now() / 1000)}:F>`, inline: true }
                            ]
                        );
                        
                        await logChannel.send({ 
                            embeds: [logResult.embed], 
                            files: logResult.attachments 
                        });
                    }
                }
            } catch (logError) {
                console.error('Lỗi khi gửi log:', logError);
            }
            
        } catch (error) {
            console.error('Lỗi khi undeafen user:', error);
            
            let errorMessage = 'Đã xảy ra lỗi khi undeafen người dùng!';
            
            if (error.code === 50013) {
                errorMessage = 'Bot không có đủ quyền để undeafen người dùng này!';
            }
            
            const result = productionStyle.createErrorEmbed(
                'Voice Undeafen Failed',
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