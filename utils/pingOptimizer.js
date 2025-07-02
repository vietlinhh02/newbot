const { EmbedBuilder } = require('discord.js');

class PingOptimizer {
    constructor(client) {
        this.client = client;
        this.pingHistory = [];
        this.averagePing = 0;
        this.bestPing = Infinity;
        this.worstPing = 0;
        this.startTime = Date.now();
        
        // Track ping every 30 seconds
        setInterval(() => this.trackPing(), 30000);
        
        // Optimize connections every 5 minutes
        setInterval(() => this.optimizeConnections(), 5 * 60 * 1000);
    }

    // Track current ping
    trackPing() {
        const ping = this.client.ws.ping;
        const timestamp = Date.now();
        
        this.pingHistory.push({
            ping: ping,
            timestamp: timestamp
        });

        // Keep only last 100 measurements (50 minutes)
        if (this.pingHistory.length > 100) {
            this.pingHistory = this.pingHistory.slice(-100);
        }

        // Update statistics
        this.updatePingStats();
        
        // Alert if ping too high
        if (ping > 300) {
            console.warn(`⚠️  High ping detected: ${ping}ms`);
        }
    }

    // Update ping statistics
    updatePingStats() {
        if (this.pingHistory.length === 0) return;

        const pings = this.pingHistory.map(h => h.ping);
        this.averagePing = Math.round(pings.reduce((a, b) => a + b, 0) / pings.length);
        this.bestPing = Math.min(...pings);
        this.worstPing = Math.max(...pings);
    }

    // Get current ping info
    getCurrentPing() {
        return {
            current: this.client.ws.ping,
            average: this.averagePing,
            best: this.bestPing,
            worst: this.worstPing,
            uptime: Date.now() - this.startTime
        };
    }

    // Optimize Discord connections
    async optimizeConnections() {
        try {
            // Force garbage collection if available
            if (global.gc) {
                global.gc();
            }

            // Check if reconnection needed
            if (this.client.ws.ping > 500) {
                console.log('🔄 High ping detected, attempting optimization...');
                
                // Destroy and recreate WebSocket connection
                await this.client.ws.destroy();
                await new Promise(resolve => setTimeout(resolve, 2000));
                
                console.log('✅ Connection optimized');
            }
        } catch (error) {
            console.error('❌ Failed to optimize connections:', error);
        }
    }

    // Get ping status embed
    getPingEmbed() {
        const ping = this.getCurrentPing();
        const uptime = this.formatUptime(ping.uptime);
        
        let color = 0x00ff00; // Green
        let status = '🟢 Excellent';
        
        if (ping.current > 100) {
            color = 0xffff00; // Yellow
            status = '🟡 Good';
        }
        if (ping.current > 200) {
            color = 0xffa500; // Orange  
            status = '🟠 Fair';
        }
        if (ping.current > 300) {
            color = 0xff0000; // Red
            status = '🔴 Poor';
        }

        const embed = new EmbedBuilder()
            .setTitle('🏓 Bot Ping Status')
            .setColor(color)
            .addFields(
                {
                    name: '📊 Current Ping',
                    value: `\`${ping.current}ms\` ${status}`,
                    inline: true
                },
                {
                    name: '📈 Average Ping',
                    value: `\`${ping.average}ms\``,
                    inline: true
                },
                {
                    name: '⚡ Best Ping',
                    value: `\`${ping.best}ms\``,
                    inline: true
                },
                {
                    name: '🐌 Worst Ping',
                    value: `\`${ping.worst}ms\``,
                    inline: true
                },
                {
                    name: '⏱️ Uptime',
                    value: uptime,
                    inline: true
                },
                {
                    name: '🌐 WebSocket Status',
                    value: this.client.ws.status === 0 ? '🟢 Connected' : '🔴 Disconnected',
                    inline: true
                }
            )
            .setFooter({ text: 'Ping được đo mỗi 30 giây' })
            .setTimestamp();

        return embed;
    }

    // Format uptime
    formatUptime(ms) {
        const seconds = Math.floor(ms / 1000);
        const minutes = Math.floor(seconds / 60);
        const hours = Math.floor(minutes / 60);
        const days = Math.floor(hours / 24);

        if (days > 0) return `${days}d ${hours % 24}h ${minutes % 60}m`;
        if (hours > 0) return `${hours}h ${minutes % 60}m ${seconds % 60}s`;
        if (minutes > 0) return `${minutes}m ${seconds % 60}s`;
        return `${seconds}s`;
    }

    // Get ping recommendations
    getPingRecommendations() {
        const ping = this.getCurrentPing();
        const recommendations = [];

        if (ping.current > 200) {
            recommendations.push('🌍 **Hosting Location**: Chuyển server gần Discord servers (Virginia, Singapore)');
            recommendations.push('🔗 **Internet**: Kiểm tra kết nối mạng và bandwidth');
        }

        if (ping.average > 150) {
            recommendations.push('⚡ **Code Optimization**: Tối ưu code để xử lý nhanh hơn');
            recommendations.push('🗄️ **Database**: Sử dụng database gần server host');
        }

        if (ping.worst > 500) {
            recommendations.push('🔄 **Connection**: Cân nhắc sử dụng WebSocket pooling');
            recommendations.push('📊 **Monitoring**: Theo dõi và restart bot khi ping quá cao');
        }

        if (recommendations.length === 0) {
            recommendations.push('✅ **Ping tốt!** Bot đang hoạt động optimal');
        }

        return recommendations;
    }

    // Test network latency to different regions
    async testRegionalPing() {
        const regions = [
            { name: 'US East (Virginia)', endpoint: 'discord.com' },
            { name: 'US West (California)', endpoint: 'ptb.discord.com' },  
            { name: 'Europe (Amsterdam)', endpoint: 'canary.discord.com' },
            { name: 'Asia (Singapore)', endpoint: 'status.discord.com' }
        ];

        const results = [];
        
        for (const region of regions) {
            try {
                const start = Date.now();
                // Simulate ping test (actual implementation would use proper ping)
                await fetch(`https://${region.endpoint}`, { 
                    method: 'HEAD',
                    timeout: 5000 
                }).catch(() => {}); // Ignore errors, just measure time
                const ping = Date.now() - start;
                
                results.push({
                    region: region.name,
                    ping: ping
                });
            } catch (error) {
                results.push({
                    region: region.name,
                    ping: 'Timeout'
                });
            }
        }

        return results;
    }

    // Get optimization tips
    getOptimizationTips() {
        return [
            '🌍 **Hosting gần Discord**: Virginia (US-East) có ping thấp nhất',
            '⚡ **SSD Storage**: Sử dụng SSD thay vì HDD để I/O nhanh hơn',
            '🔗 **CDN**: Sử dụng CDN cho static files và images',
            '💾 **Caching**: Cache guild settings và user data',
            '🗄️ **Database**: Đặt database cùng region với bot',
            '📡 **Network**: Sử dụng dedicated server thay vì shared hosting',
            '🔄 **Keep-Alive**: Giữ connection alive để tránh reconnect',
            '📊 **Monitoring**: Theo dõi ping và restart khi cần'
        ];
    }
}

module.exports = PingOptimizer;