const { PermissionFlagsBits, ChannelType } = require('discord.js');
const { hasFlexiblePermission } = require('../../utils/permissions');
const productionStyle = require('../../utils/demoStyle');

module.exports = {
    name: 'moveall',
    aliases: ['vmoveall', 'massvoicemove'],
    description: 'Di chuyển tất cả người dùng từ voice channel này sang voice channel khác',
    usage: '!moveall [#from_channel] [#to_channel] [reason]',
    examples: [
        '!moveall #general-voice #meeting',
        '!moveall "Music Room" "General Voice" Emergency meeting',
        '!vmoveall 123456789 987654321 Moving everyone'
    ],
    permissions: 'admin',
    guildOnly: true,
    category: 'voice',
    
    async execute(message, args, client) {
        // Check permissions
        if (!await hasFlexiblePermission(message.member, 'moveall', this.permissions, message.guild.id)) {
            const result = productionStyle.createErrorEmbed(
                'Permission Denied',
                'Bạn cần quyền **Administrator** để di chuyển hàng loạt!'
            );
            return message.reply({ 
                embeds: [result.embed], 
                files: result.attachments 
            });
        }
        
        // Check bot permissions
        if (!message.guild.members.me.permissions.has(PermissionFlagsBits.MoveMembers)) {
            const result = productionStyle.createErrorEmbed(
                'Bot Missing Permissions',
                'Bot cần quyền **Move Members** để thực hiện lệnh này!'
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
                'Vui lòng cung cấp kênh nguồn và kênh đích!',
                [
                    { name: 'Usage', value: '`!moveall [#from_channel] [#to_channel] [reason]`' },
                    { name: 'Example', value: '`!moveall #general-voice #meeting`' }
                ]
            );
            return message.reply({ 
                embeds: [result.embed], 
                files: result.attachments 
            });
        }
        
        // Parse source channel
        let sourceChannel = null;
        const fromChannelMention = message.mentions.channels.first();
        const fromChannelQuery = args[0].toLowerCase().replace(/[<#>]/g, '');
        
        if (fromChannelMention && (fromChannelMention.type === ChannelType.GuildVoice || fromChannelMention.type === ChannelType.GuildStageVoice)) {
            sourceChannel = fromChannelMention;
        } else {
            sourceChannel = message.guild.channels.cache.find(channel => 
                (channel.type === ChannelType.GuildVoice || channel.type === ChannelType.GuildStageVoice) &&
                (channel.name.toLowerCase().includes(fromChannelQuery) ||
                 channel.name.toLowerCase() === fromChannelQuery ||
                 channel.id === fromChannelQuery)
            );
        }
        
        if (!sourceChannel) {
            const result = productionStyle.createErrorEmbed(
                'Source Channel Not Found',
                'Vui lòng cung cấp voice channel hợp lệ!'
            );
            return message.reply({ 
                embeds: [result.embed], 
                files: result.attachments 
            });
        }
        
        // Parse target channel
        let targetChannel = null;
        const toChannelMention = message.mentions.channels.filter(ch => ch.id !== sourceChannel.id).first();
        const toChannelQuery = args[1].toLowerCase().replace(/[<#>]/g, '');
        
        if (toChannelMention && (toChannelMention.type === ChannelType.GuildVoice || toChannelMention.type === ChannelType.GuildStageVoice)) {
            targetChannel = toChannelMention;
        } else {
            targetChannel = message.guild.channels.cache.find(channel => 
                (channel.type === ChannelType.GuildVoice || channel.type === ChannelType.GuildStageVoice) &&
                channel.id !== sourceChannel.id &&
                (channel.name.toLowerCase().includes(toChannelQuery) ||
                 channel.name.toLowerCase() === toChannelQuery ||
                 channel.id === toChannelQuery)
            );
        }
        
        if (!targetChannel) {
            const result = productionStyle.createErrorEmbed(
                'Target Channel Not Found',
                'Vui lòng cung cấp voice channel hợp lệ!'
            );
            return message.reply({ 
                embeds: [result.embed], 
                files: result.attachments 
            });
        }
        
        // Check if source and target are the same
        if (sourceChannel.id === targetChannel.id) {
            const result = productionStyle.createErrorEmbed(
                'Same Channel Error',
                'Kênh nguồn và kênh đích phải khác nhau!'
            );
            return message.reply({ 
                embeds: [result.embed], 
                files: result.attachments 
            });
        }
        
        // Get members in source channel
        const membersToMove = sourceChannel.members;
        
        if (membersToMove.size === 0) {
            const result = productionStyle.createWarningEmbed(
                'Empty Channel',
                `Không có ai trong ${sourceChannel.name}!`
            );
            return message.reply({ 
                embeds: [result.embed], 
                files: result.attachments 
            });
        }
        
        // Check bot permissions in target channel
        const botPermissions = targetChannel.permissionsFor(message.guild.members.me);
        if (!botPermissions.has(PermissionFlagsBits.Connect)) {
            const result = productionStyle.createErrorEmbed(
                'Bot Missing Channel Permissions',
                `Bot không có quyền **Connect** trong ${targetChannel}!`
            );
            return message.reply({ 
                embeds: [result.embed], 
                files: result.attachments 
            });
        }
        
        // Get reason
        const reason = args.slice(2).join(' ') || 'Mass voice move';
        
        // Confirmation message
        const confirmMessage = await message.reply(
            `⚠️ **Xác nhận di chuyển hàng loạt:**\n` +
            `📍 **Từ:** ${sourceChannel.name} (${membersToMove.size} người)\n` +
            `📍 **Đến:** ${targetChannel.name}\n` +
            `📝 **Lý do:** ${reason}\n\n` +
            `React ✅ để xác nhận hoặc ❌ để hủy bỏ`
        );
        
        try {
            await confirmMessage.react('✅');
            await confirmMessage.react('❌');
            
            // Wait for reaction
            const filter = (reaction, user) => {
                return ['✅', '❌'].includes(reaction.emoji.name) && user.id === message.author.id;
            };
            
            const collected = await confirmMessage.awaitReactions({
                filter,
                max: 1,
                time: 30000,
                errors: ['time']
            });
            
            const reaction = collected.first();
            
            if (reaction.emoji.name === '❌') {
                return await confirmMessage.edit({
                    content: '❌ **Đã hủy bỏ di chuyển hàng loạt!**',
                    components: []
                });
            }
            
            if (reaction.emoji.name === '✅') {
                // Start moving members
                const statusMessage = await confirmMessage.edit({
                    content: `🔄 **Đang di chuyển ${membersToMove.size} thành viên...**`,
                    components: []
                });
                
                let successCount = 0;
                let failedCount = 0;
                const failedMembers = [];
                
                // Move all members
                for (const [memberId, member] of membersToMove) {
                    try {
                        // Check if member still in source channel
                        if (member.voice.channel?.id === sourceChannel.id) {
                            // Check user permissions in target channel
                            const userPermissions = targetChannel.permissionsFor(member);
                            if (!userPermissions.has(PermissionFlagsBits.Connect)) {
                                failedMembers.push(`${member.user.tag} (Không có quyền Connect)`);
                                failedCount++;
                                continue;
                            }
                            
                            await member.voice.setChannel(targetChannel, `Mass move by ${message.author.tag}: ${reason}`);
                            successCount++;
                        }
                    } catch (error) {
                        console.error(`Lỗi khi di chuyển ${member.user.tag}:`, error);
                        failedMembers.push(`${member.user.tag} (Lỗi hệ thống)`);
                        failedCount++;
                    }
                    
                    // Small delay to avoid rate limits
                    await new Promise(resolve => setTimeout(resolve, 100));
                }
                
                // Result message với production style
                const result = productionStyle.createSuccessEmbed(
                    'MASS VOICE MOVE',
                    { tag: `${successCount}/${successCount + failedCount} users` },
                    message.author,
                    reason,
                    [
                        { name: 'From Channel', value: sourceChannel.name, inline: true },
                        { name: 'To Channel', value: targetChannel.name, inline: true },
                        { name: 'Success Count', value: `${successCount} người`, inline: true },
                        { name: 'Failed Count', value: `${failedCount} người`, inline: true },
                        { name: 'Failed Users', value: failedMembers.length > 0 ? (failedMembers.length <= 10 ? failedMembers.join('\n') : `${failedMembers.length} users (too many to display)`) : 'None', inline: false }
                    ]
                );
                
                await statusMessage.edit({ 
                    content: null,
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
                                'MASS VOICE MOVE',
                                { tag: `${successCount}/${successCount + failedCount} users` },
                                message.author,
                                reason,
                                [
                                    { name: 'From Channel', value: sourceChannel.name, inline: true },
                                    { name: 'To Channel', value: targetChannel.name, inline: true },
                                    { name: 'Success Count', value: `${successCount}`, inline: true },
                                    { name: 'Failed Count', value: `${failedCount}`, inline: true },
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
            }
            
        } catch (error) {
            console.error('Lỗi trong quá trình xác nhận:', error);
            await confirmMessage.edit({
                content: '⏰ **Hết thời gian xác nhận!** Đã hủy bỏ di chuyển hàng loạt.',
                components: []
            });
        }
    }
}; 