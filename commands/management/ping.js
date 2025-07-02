const { EmbedBuilder } = require('discord.js');
const PingOptimizer = require('../../utils/pingOptimizer');

module.exports = {
    name: 'ping',
    aliases: ['latency', 'ms'],
    description: 'Kiểm tra ping và latency của bot với optimization tips',
    usage: '!ping [detailed]',
    examples: [
        '!ping',
        '!ping detailed',
        '!ping recommendations'
    ],
    permissions: 'everyone',
    guildOnly: false,
    category: 'management',

    async execute(message, args, client) {
        try {
            const startTime = Date.now();
            
            // Initialize ping optimizer if not exists
            if (!client.pingOptimizer) {
                client.pingOptimizer = new PingOptimizer(client);
            }

            const mode = args[0]?.toLowerCase();

            if (mode === 'detailed' || mode === 'detail') {
                return this.showDetailedPing(message, client);
            }

            if (mode === 'recommendations' || mode === 'tips') {
                return this.showOptimizationTips(message, client);
            }

            if (mode === 'regional' || mode === 'regions') {
                return this.showRegionalPing(message, client);
            }

            // Quick ping response
            const msg = await message.reply('🏓 Đang đo ping...');
            const endTime = Date.now();
            
            const messagePing = endTime - startTime;
            const apiPing = client.ws.ping;
            const editTime = Date.now();
            
            // Determine ping quality
            let quality = '🟢 Excellent';
            let color = 0x00ff00;
            
            if (apiPing > 100) {
                quality = '🟡 Good';
                color = 0xffff00;
            }
            if (apiPing > 200) {
                quality = '🟠 Fair';
                color = 0xffa500;
            }
            if (apiPing > 300) {
                quality = '🔴 Poor';
                color = 0xff0000;
            }

            const embed = new EmbedBuilder()
                .setTitle('🏓 Bot Ping')
                .setColor(color)
                .addFields(
                    {
                        name: '📡 API Latency',
                        value: `\`${apiPing}ms\` ${quality}`,
                        inline: true
                    },
                    {
                        name: '💬 Message Latency', 
                        value: `\`${messagePing}ms\``,
                        inline: true
                    },
                    {
                        name: '✏️ Edit Latency',
                        value: `\`${Date.now() - editTime}ms\``,
                        inline: true
                    }
                )
                .setFooter({ 
                    text: `Sử dụng !ping detailed để xem thông tin chi tiết • ${message.author.username}`,
                    iconURL: message.author.displayAvatarURL()
                })
                .setTimestamp();

            // Add optimization tip if ping is high
            if (apiPing > 200) {
                embed.addFields({
                    name: '💡 Quick Tip',
                    value: 'Ping cao! Dùng `!ping recommendations` để xem cách tối ưu',
                    inline: false
                });
            }

            await msg.edit({ content: null, embeds: [embed] });

        } catch (error) {
            console.error('Error in ping command:', error);
            await message.reply(`❌ Lỗi khi đo ping: ${error.message}`);
        }
    },

    async showDetailedPing(message, client) {
        const embed = client.pingOptimizer.getPingEmbed();
        
        embed.addFields({
            name: '📋 Available Commands',
            value: '• `!ping` - Quick ping check\n' +
                   '• `!ping detailed` - Detailed stats\n' +
                   '• `!ping recommendations` - Optimization tips\n' +
                   '• `!ping regional` - Test regional latency',
            inline: false
        });

        await message.reply({ embeds: [embed] });
    },

    async showOptimizationTips(message, client) {
        const recommendations = client.pingOptimizer.getPingRecommendations();
        const tips = client.pingOptimizer.getOptimizationTips();
        const currentPing = client.ws.ping;

        let color = 0x00ff00;
        if (currentPing > 100) color = 0xffff00;
        if (currentPing > 200) color = 0xffa500;
        if (currentPing > 300) color = 0xff0000;

        const embed = new EmbedBuilder()
            .setTitle('⚡ Ping Optimization Guide')
            .setColor(color)
            .setDescription(`**Current Ping:** \`${currentPing}ms\`\n\nDưới đây là các cách để giảm ping bot:`)
            .addFields(
                {
                    name: '🎯 Recommendations for Your Bot',
                    value: recommendations.join('\n'),
                    inline: false
                },
                {
                    name: '💡 General Optimization Tips',
                    value: tips.join('\n'),
                    inline: false
                },
                {
                    name: '🌍 Best Hosting Locations',
                    value: '• **US-East (Virginia)**: Lowest ping to Discord\n' +
                           '• **Singapore**: Best for Asia region\n' +
                           '• **London**: Good for Europe\n' +
                           '• **Sydney**: For Australia/Oceania',
                    inline: false
                },
                {
                    name: '🏆 Recommended Services',
                    value: '• **Railway**: Auto-deploy, good ping\n' +
                           '• **DigitalOcean**: Multiple regions\n' +
                           '• **AWS EC2**: Global infrastructure\n' +
                           '• **Google Cloud**: Fast networking',
                    inline: false
                }
            )
            .setFooter({ text: 'Tip: Host ở Virginia (US-East) cho ping thấp nhất!' })
            .setTimestamp();

        await message.reply({ embeds: [embed] });
    },

    async showRegionalPing(message, client) {
        const msg = await message.reply('🌍 Đang test ping đến các region...');
        
        try {
            const results = await client.pingOptimizer.testRegionalPing();
            
            const embed = new EmbedBuilder()
                .setTitle('🌍 Regional Ping Test')
                .setColor(0x0099ff)
                .setDescription('Test latency đến các Discord regions:')
                .setFooter({ text: 'Ping thấp nhất = hosting location tốt nhất' })
                .setTimestamp();

            results.forEach(result => {
                const pingValue = typeof result.ping === 'number' ? `${result.ping}ms` : result.ping;
                let icon = '🟢';
                
                if (typeof result.ping === 'number') {
                    if (result.ping > 100) icon = '🟡';
                    if (result.ping > 200) icon = '🟠';
                    if (result.ping > 300) icon = '🔴';
                }

                embed.addFields({
                    name: `${icon} ${result.region}`,
                    value: `\`${pingValue}\``,
                    inline: true
                });
            });

            // Find best region
            const validResults = results.filter(r => typeof r.ping === 'number');
            if (validResults.length > 0) {
                const bestRegion = validResults.reduce((prev, current) => 
                    prev.ping < current.ping ? prev : current
                );
                
                embed.addFields({
                    name: '🏆 Best Region',
                    value: `**${bestRegion.region}** với \`${bestRegion.ping}ms\`\n` +
                           `Đây là nơi nên host bot để có ping thấp nhất!`,
                    inline: false
                });
            }

            await msg.edit({ content: null, embeds: [embed] });
            
        } catch (error) {
            await msg.edit('❌ Không thể test regional ping. Thử lại sau!');
        }
    }
}; 