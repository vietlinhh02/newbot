const embedFactory = require('../../utils/embeds');
const os = require('os');

module.exports = {
    name: 'uptime',
    aliases: ['status', 'up'],
    description: 'Hiển thị thời gian hoạt động của bot và Discord',
    usage: '!uptime',
    examples: ['!uptime', '!status', '!up'],
    permissions: 'member',
    guildOnly: false,
    category: 'management',
    
    async execute(message, args, client) {
        // Initialize embed factory
        embedFactory.setClient(client);
        
        try {
            // Bot uptime
            const botUptime = process.uptime() * 1000;
            
            // System uptime
            const systemUptime = os.uptime() * 1000;
            
            // Format uptime function
            const formatUptime = (ms) => {
                const seconds = Math.floor((ms / 1000) % 60);
                const minutes = Math.floor((ms / (1000 * 60)) % 60);
                const hours = Math.floor((ms / (1000 * 60 * 60)) % 24);
                const days = Math.floor(ms / (1000 * 60 * 60 * 24));
                
                if (days > 0) return `${days}d ${hours}h ${minutes}m ${seconds}s`;
                if (hours > 0) return `${hours}h ${minutes}m ${seconds}s`;
                if (minutes > 0) return `${minutes}m ${seconds}s`;
                return `${seconds}s`;
            };
            
            // Calculate start times
            const botStartTime = Math.floor((Date.now() - botUptime) / 1000);
            const systemStartTime = Math.floor((Date.now() - systemUptime) / 1000);
            
            // Memory usage
            const memoryUsage = process.memoryUsage();
            const totalMemory = os.totalmem();
            const freeMemory = os.freemem();
            const usedMemory = totalMemory - freeMemory;
            
            const formatBytes = (bytes) => {
                if (bytes === 0) return '0 Bytes';
                const k = 1024;
                const sizes = ['Bytes', 'KB', 'MB', 'GB'];
                const i = Math.floor(Math.log(bytes) / Math.log(k));
                return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
            };
            
            // Discord API status
            const wsStatus = client.ws.status;
            const statusEmojis = {
                0: '🟢 Ready',
                1: '🟡 Connecting',
                2: '🟠 Reconnecting',
                3: '🟡 Idle',
                4: '🟠 Nearly',
                5: '🔴 Disconnected',
                6: '🟡 Waiting for Guilds',
                7: '🟡 Identifying',
                8: '🟡 Resuming'
            };
            
            // CPU load
            const loadAverage = os.loadavg();
            const cpuCount = os.cpus().length;
            
            const embed = new EmbedBuilder()
                .setTitle('⏰ Bot Uptime & Status')
                .setColor('#5865F2')
                .setThumbnail(client.user.displayAvatarURL({ dynamic: true }))
                .addFields([
                    {
                        name: '🤖 Bot Status',
                        value: [
                            `**Uptime:** ${formatUptime(botUptime)}`,
                            `**Started:** <t:${botStartTime}:F>`,
                            `**Since:** <t:${botStartTime}:R>`,
                            `**Status:** ${statusEmojis[wsStatus] || 'Unknown'}`
                        ].join('\n'),
                        inline: true
                    },
                    {
                        name: '🖥️ System Status',
                        value: [
                            `**OS Uptime:** ${formatUptime(systemUptime)}`,
                            `**System Start:** <t:${systemStartTime}:R>`,
                            `**Platform:** ${os.platform()} ${os.arch()}`,
                            `**Node.js:** ${process.version}`
                        ].join('\n'),
                        inline: true
                    },
                    {
                        name: '💾 Memory Usage',
                        value: [
                            `**Bot RAM:** ${formatBytes(memoryUsage.heapUsed)}`,
                            `**System Used:** ${formatBytes(usedMemory)}`,
                            `**System Free:** ${formatBytes(freeMemory)}`,
                            `**System Total:** ${formatBytes(totalMemory)}`
                        ].join('\n'),
                        inline: true
                    },
                    {
                        name: '📊 Performance',
                        value: [
                            `**WebSocket Ping:** ${client.ws.ping}ms`,
                            `**CPU Cores:** ${cpuCount}`,
                            `**Load Average:** ${loadAverage[0].toFixed(2)}`,
                            `**Memory Heap:** ${formatBytes(memoryUsage.heapTotal)}`
                        ].join('\n'),
                        inline: true
                    },
                    {
                        name: '🌐 Discord Gateway',
                        value: [
                            `**Shard:** ${message.guild ? client.ws.shards.get(0)?.id || 0 : 'N/A'}`,
                            `**Guilds:** ${client.guilds.cache.size}`,
                            `**Users:** ${client.guilds.cache.reduce((acc, guild) => acc + guild.memberCount, 0)}`,
                            `**Channels:** ${client.channels.cache.size}`
                        ].join('\n'),
                        inline: true
                    }
                ]);
            
            // Add restart information if available
            const restarts = await getRestartInfo();
            if (restarts) {
                embed.addFields([{
                    name: '🔄 Restart History',
                    value: restarts,
                    inline: false
                }]);
            }
            
            // Add health indicators
            const healthIndicators = [];
            
            // Memory health
            const memoryUsagePercent = (memoryUsage.heapUsed / memoryUsage.heapTotal) * 100;
            if (memoryUsagePercent < 70) {
                healthIndicators.push('🟢 Memory OK');
            } else if (memoryUsagePercent < 90) {
                healthIndicators.push('🟡 Memory High');
            } else {
                healthIndicators.push('🔴 Memory Critical');
            }
            
            // Ping health
            if (client.ws.ping < 100) {
                healthIndicators.push('🟢 Ping Good');
            } else if (client.ws.ping < 300) {
                healthIndicators.push('🟡 Ping OK');
            } else {
                healthIndicators.push('🔴 Ping Poor');
            }
            
            // CPU health
            if (loadAverage[0] < cpuCount * 0.7) {
                healthIndicators.push('🟢 CPU OK');
            } else if (loadAverage[0] < cpuCount * 1.0) {
                healthIndicators.push('🟡 CPU High');
            } else {
                healthIndicators.push('🔴 CPU Overload');
            }
            
            embed.addFields([{
                name: '🏥 Health Status',
                value: healthIndicators.join('\n'),
                inline: true
            }]);
            
            embed.setTimestamp()
                .setFooter({ 
                    text: `Last updated`, 
                    iconURL: client.user.displayAvatarURL({ dynamic: true }) 
                });
            
            await message.reply({ embeds: [embed] });
            
        } catch (error) {
            console.error('Lỗi khi lấy uptime:', error);
            await message.reply('❌ **Lỗi!** Không thể lấy thông tin uptime!');
        }
    }
};

// Helper function to get restart information
async function getRestartInfo() {
    try {
        // This would typically read from a log file or database
        // For now, we'll return a simple message
        const uptimeHours = Math.floor(process.uptime() / 3600);
        
        if (uptimeHours < 1) {
            return '🆕 Bot vừa khởi động gần đây';
        } else if (uptimeHours < 24) {
            return `⚡ Bot đã hoạt động ${uptimeHours} giờ liên tục`;
        } else {
            const days = Math.floor(uptimeHours / 24);
            return `🏆 Bot đã hoạt động ${days} ngày liên tục!`;
        }
    } catch (error) {
        return null;
    }
} 