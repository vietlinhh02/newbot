const { PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const productionStyle = require('../../utils/demoStyle');

module.exports = {
    name: 'broadcast',
    aliases: ['globalannounce', 'massannounce'],
    description: 'Gửi thông báo đến tất cả servers (Chỉ Bot Owner)',
    usage: '!broadcast [message]',
    examples: [
        '!broadcast Bot sẽ bảo trì vào 22h hôm nay',
        '!globalannounce Tính năng mới đã được cập nhật!',
        '!massannounce Cảm ơn các bạn đã sử dụng bot!'
    ],
    permissions: 'owner',
    guildOnly: false,
    category: 'announcement',
    
    async execute(message, args, client) {
        // Check if user is bot owner
        const botOwners = process.env.BOT_OWNERS ? process.env.BOT_OWNERS.split(',') : [];
        if (!botOwners.includes(message.author.id)) {
            const result = productionStyle.createErrorEmbed(
                'Permission Denied',
                'Chỉ Bot Owner mới có thể sử dụng lệnh này!'
            );
            return message.reply({ 
                embeds: [result.embed], 
                files: result.attachments 
            });
        }
        
        // Check arguments
        if (!args[0]) {
            const result = productionStyle.createWarningEmbed(
                'Missing Message',
                'Vui lòng cung cấp tin nhắn broadcast!',
                [
                    { name: 'Usage', value: '`!broadcast [message]`' },
                    { name: 'Example', value: '`!broadcast Bot sẽ bảo trì vào 22h hôm nay`' },
                    { name: 'Warning', value: '⚠️ Lệnh này sẽ gửi tin nhắn đến tất cả servers!' }
                ]
            );
            return message.reply({ 
                embeds: [result.embed], 
                files: result.attachments 
            });
        }
        
        const broadcastMessage = args.join(' ');
        
        // Check message length
        if (broadcastMessage.length > 2000) {
            const result = productionStyle.createErrorEmbed(
                'Message Too Long',
                'Discord giới hạn tối đa 2000 ký tự!',
                `Current: ${broadcastMessage.length}/2000 characters`
            );
            return message.reply({ 
                embeds: [result.embed], 
                files: result.attachments 
            });
        }
        
        // Confirmation message
        const result = productionStyle.createWarningEmbed(
            'CẢNH BÁO: BROADCAST TOÀN CẦU',
            'Hành động này sẽ gửi tin nhắn đến tất cả servers!',
            [
                { name: 'Target Servers', value: `${client.guilds.cache.size} servers`, inline: true },
                { name: 'Status', value: 'Không thể hoàn tác', inline: true },
                { name: 'Time', value: 'Vài phút để hoàn thành', inline: true },
                { name: 'Message Content', value: `${broadcastMessage.length > 100 ? broadcastMessage.substring(0, 100) + '...' : broadcastMessage}` },
                { name: 'Confirmation', value: 'React ✅ để xác nhận hoặc ❌ để hủy bỏ\n**Thời gian chờ:** 30 giây' }
            ]
        );
        
        const confirmMessage = await message.reply({ 
            embeds: [result.embed], 
            files: result.attachments 
        });
        
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
                const cancelResult = productionStyle.createWarningEmbed(
                    'BROADCAST CANCELLED',
                    'Đã hủy bỏ broadcast!'
                );
                return await confirmMessage.edit({
                    embeds: [cancelResult.embed],
                    files: cancelResult.attachments
                });
            }
            
            if (reaction.emoji.name === '✅') {
                // Start broadcasting
                const statusResult = productionStyle.createWarningEmbed(
                    'BROADCASTING IN PROGRESS',
                    `Đang broadcast đến ${client.guilds.cache.size} servers...`,
                    [{ name: 'Status', value: 'Processing...', inline: true }]
                );
                
                await confirmMessage.edit({
                    embeds: [statusResult.embed],
                    files: statusResult.attachments
                });
                
                let successCount = 0;
                let failedCount = 0;
                const failedGuilds = [];
                
                // Create broadcast embed with production style
                const broadcastEmbed = new EmbedBuilder()
                    .setColor(0x5865F2)
                    .setTitle('📢 Thông Báo Từ Bot Developer')
                    .setDescription(broadcastMessage)
                    .setFooter({ 
                        text: `Broadcast bởi ${message.author.tag}`,
                        iconURL: message.author.displayAvatarURL({ dynamic: true })
                    })
                    .setTimestamp()
                    .setThumbnail('attachment://thumbnail.png');
                
                // Send to all guilds
                for (const [guildId, guild] of client.guilds.cache) {
                    try {
                        // Find the best channel to send
                        let targetChannel = null;
                        
                        // Try to find system channel first
                        if (guild.systemChannel && guild.systemChannel.permissionsFor(guild.members.me)?.has(['ViewChannel', 'SendMessages', 'EmbedLinks'])) {
                            targetChannel = guild.systemChannel;
                        } else {
                            // Find general or announcements channel
                            const channels = guild.channels.cache.filter(channel => 
                                channel.isTextBased() && 
                                channel.permissionsFor(guild.members.me)?.has(['ViewChannel', 'SendMessages', 'EmbedLinks'])
                            );
                            
                            targetChannel = channels.find(ch => 
                                ch.name.toLowerCase().includes('general') || 
                                ch.name.toLowerCase().includes('announce') ||
                                ch.name.toLowerCase().includes('thông-báo') ||
                                ch.name.toLowerCase().includes('chat')
                            ) || channels.first();
                        }
                        
                        if (targetChannel) {
                            // Get production style result for the attachment
                            const broadcastResult = productionStyle.createSuccessEmbed(
                                'Thông Báo Từ Bot Developer',
                                { tag: 'Global Announcement' },
                                message.author,
                                broadcastMessage
                            );
                            
                            await targetChannel.send({ 
                                embeds: [broadcastEmbed], 
                                files: broadcastResult.attachments 
                            });
                            successCount++;
                        } else {
                            failedGuilds.push(`${guild.name} (Không có kênh phù hợp)`);
                            failedCount++;
                        }
                        
                    } catch (error) {
                        console.error(`Lỗi khi broadcast đến ${guild.name}:`, error);
                        failedGuilds.push(`${guild.name} (${error.message || 'Lỗi hệ thống'})`);
                        failedCount++;
                    }
                    
                    // Small delay to avoid rate limits
                    await new Promise(resolve => setTimeout(resolve, 100));
                }
                
                // Result message với production style
                const finalFields = [
                    { name: 'Success', value: `${successCount} servers`, inline: true },
                    { name: 'Failed', value: `${failedCount} servers`, inline: true },
                    { name: 'Total', value: `${client.guilds.cache.size} servers`, inline: true },
                    { name: 'Message Content', value: broadcastMessage.length > 100 ? broadcastMessage.substring(0, 100) + '...' : broadcastMessage },
                    { name: 'Completed Time', value: `<t:${Math.floor(Date.now() / 1000)}:F>` }
                ];
                
                if (failedGuilds.length > 0 && failedGuilds.length <= 5) {
                    finalFields.push({ 
                        name: 'Failed Servers', 
                        value: failedGuilds.join('\n').substring(0, 1000) 
                    });
                } else if (failedGuilds.length > 5) {
                    finalFields.push({ 
                        name: 'Failed Servers', 
                        value: `${failedGuilds.length} servers could not receive the broadcast` 
                    });
                }
                
                const finalResult = productionStyle.createSuccessEmbed(
                    'BROADCAST COMPLETED',
                    { tag: 'Global Announcement' },
                    message.author,
                    `Successfully broadcasted to ${successCount}/${client.guilds.cache.size} servers`,
                    finalFields
                );
                
                await confirmMessage.edit({
                    embeds: [finalResult.embed],
                    files: finalResult.attachments
                });
                
                // Log broadcast activity
                console.log(`🔔 BROADCAST: ${message.author.tag} broadcasted to ${successCount}/${client.guilds.cache.size} servers`);
                console.log(`📝 Message: ${broadcastMessage}`);
            }
            
        } catch (error) {
            console.error('Lỗi trong quá trình xác nhận broadcast:', error);
            
            const timeoutResult = productionStyle.createErrorEmbed(
                'BROADCAST TIMEOUT',
                'Hết thời gian xác nhận! Đã hủy bỏ broadcast.'
            );
            
            await confirmMessage.edit({
                embeds: [timeoutResult.embed],
                files: timeoutResult.attachments
            });
        }
    }
}; 