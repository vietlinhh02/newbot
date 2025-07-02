const { EmbedBuilder, version: djsVersion } = require('discord.js');
const embedFactory = require('../../utils/embeds');
const { execSync } = require('child_process');
const os = require('os');

module.exports = {
    name: 'botinfo',
    aliases: ['bot', 'stats', 'about'],
    description: 'Hiển thị thông tin chi tiết về bot',
    usage: '!botinfo',
    examples: ['!botinfo', '!bot', '!stats'],
    permissions: 'member',
    guildOnly: false,
    category: 'management',
    
    async execute(message, args, client) {
        // Initialize embed factory
        embedFactory.setClient(client);
        
        try {
            // Calculate uptime
            const uptime = process.uptime() * 1000;
            const formatUptime = (ms) => {
                const seconds = Math.floor((ms / 1000) % 60);
                const minutes = Math.floor((ms / (1000 * 60)) % 60);
                const hours = Math.floor((ms / (1000 * 60 * 60)) % 24);
                const days = Math.floor(ms / (1000 * 60 * 60 * 24));
                
                if (days > 0) return `${days}d ${hours}h ${minutes}m`;
                if (hours > 0) return `${hours}h ${minutes}m ${seconds}s`;
                if (minutes > 0) return `${minutes}m ${seconds}s`;
                return `${seconds}s`;
            };
            
            // Memory usage
            const memoryUsage = process.memoryUsage();
            const formatBytes = (bytes) => {
                if (bytes === 0) return '0 Bytes';
                const k = 1024;
                const sizes = ['Bytes', 'KB', 'MB', 'GB'];
                const i = Math.floor(Math.log(bytes) / Math.log(k));
                return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
            };
            
            // Bot statistics
            const totalServers = client.guilds.cache.size;
            const totalUsers = client.guilds.cache.reduce((acc, guild) => acc + guild.memberCount, 0);
            const totalChannels = client.channels.cache.size;
            const totalCommands = client.commands.size;
            
            // System info
            const platform = os.platform();
            const arch = os.arch();
            const nodeVersion = process.version;
            const cpuUsage = process.cpuUsage();
            const loadAverage = os.loadavg();
            
            // Try to get commit info (if in git repository)
            let commitInfo = 'Không rõ';
            try {
                const commit = execSync('git rev-parse --short HEAD', { encoding: 'utf8' }).trim();
                const branch = execSync('git rev-parse --abbrev-ref HEAD', { encoding: 'utf8' }).trim();
                commitInfo = `${branch}@${commit}`;
            } catch (error) {
                // Not in git repo or git not available
            }
            
            // Bot owner
            const application = await client.application.fetch();
            const owner = application.owner;
            
            const embed = new EmbedBuilder()
                .setTitle(`🤖 Thông tin Bot: ${client.user.tag}`)
                .setColor('#5865F2')
                .setThumbnail(client.user.displayAvatarURL({ dynamic: true, size: 256 }))
                .addFields([
                    {
                        name: '📊 Thống kê Bot',
                        value: [
                            `**Servers:** ${totalServers.toLocaleString()}`,
                            `**Users:** ${totalUsers.toLocaleString()}`,
                            `**Channels:** ${totalChannels.toLocaleString()}`,
                            `**Commands:** ${totalCommands}`
                        ].join('\n'),
                        inline: true
                    },
                    {
                        name: '⚡ Performance',
                        value: [
                            `**Uptime:** ${formatUptime(uptime)}`,
                            `**Ping:** ${client.ws.ping}ms`,
                            `**RAM:** ${formatBytes(memoryUsage.heapUsed)}`,
                            `**CPU:** ${(loadAverage[0] * 100).toFixed(1)}%`
                        ].join('\n'),
                        inline: true
                    },
                    {
                        name: '🛠️ Phiên bản',
                        value: [
                            `**Node.js:** ${nodeVersion}`,
                            `**Discord.js:** v${djsVersion}`,
                            `**Platform:** ${platform} ${arch}`,
                            `**Version:** ${commitInfo}`
                        ].join('\n'),
                        inline: true
                    }
                ]);
            
            // Add developer info
            if (owner) {
                embed.addFields([{
                    name: '👨‍💻 Developer',
                    value: `**${owner.tag}** (\`${owner.id}\`)`,
                    inline: true
                }]);
            }
            
            // Add detailed memory info
            embed.addFields([{
                name: '💾 Chi tiết Memory',
                value: [
                    `**Heap Used:** ${formatBytes(memoryUsage.heapUsed)}`,
                    `**Heap Total:** ${formatBytes(memoryUsage.heapTotal)}`,
                    `**RSS:** ${formatBytes(memoryUsage.rss)}`,
                    `**External:** ${formatBytes(memoryUsage.external)}`
                ].join('\n'),
                inline: true
            }]);
            
            // Add system info
            embed.addFields([{
                name: '🖥️ System Info',
                value: [
                    `**OS:** ${os.type()} ${os.release()}`,
                    `**Free RAM:** ${formatBytes(os.freemem())}`,
                    `**Total RAM:** ${formatBytes(os.totalmem())}`,
                    `**CPU Cores:** ${os.cpus().length}`
                ].join('\n'),
                inline: true
            }]);
            
            // Add bot creation date
            const botCreated = Math.floor(client.user.createdTimestamp / 1000);
            embed.addFields([{
                name: '📅 Thời gian',
                value: [
                    `**Bot tạo:** <t:${botCreated}:F>`,
                    `**Started:** <t:${Math.floor((Date.now() - uptime) / 1000)}:R>`,
                    `**Last restart:** <t:${Math.floor((Date.now() - uptime) / 1000)}:F>`
                ].join('\n'),
                inline: false
            }]);
            
            // Add some features/capabilities
            embed.addFields([{
                name: '✨ Tính năng',
                value: [
                    '🛡️ Moderation Commands',
                    '⚙️ Server Management', 
                    '🔧 Utility Commands',
                    '📊 Statistics & Info',
                    '🔐 Permission System',
                    '💾 Database Integration'
                ].join('\n'),
                inline: true
            }]);
            
            // Add links/support info
            embed.addFields([{
                name: '🔗 Links',
                value: [
                    '• [Invite Bot](https://discord.com/oauth2/authorize?client_id=' + client.user.id + '&permissions=8&scope=bot)',
                    '• [Support Server](https://discord.gg/example)',
                    '• [Documentation](https://example.com/docs)',
                    '• [GitHub](https://github.com/example/bot)'
                ].join('\n'),
                inline: true
            }]);
            
            embed.setTimestamp()
                .setFooter({ 
                    text: `Bot ID: ${client.user.id} • Made with ❤️`, 
                    iconURL: client.user.displayAvatarURL({ dynamic: true }) 
                });
            
            await message.reply({ embeds: [embed] });
            
        } catch (error) {
            console.error('Lỗi khi lấy thông tin bot:', error);
            await message.reply('❌ **Lỗi!** Không thể lấy thông tin bot!');
        }
    }
}; 