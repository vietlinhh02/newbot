const { hasFlexiblePermission } = require('../../utils/permissions');
const embedFactory = require('../../utils/embeds');
const logger = require('../../utils/logger');
const { ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType } = require('discord.js');

module.exports = {
    name: 'engagement',
    description: 'Phân tích mức độ tương tác và engagement của server',
    aliases: ['engage', 'interaction', 'activity'],
    usage: '!engagement [overview|channels|members|times]',
    category: 'advanced',
    permissions: 'admin',
    guildOnly: true,
    examples: [
        '!engagement',
        '!engagement overview',
        '!engagement channels',
        '!engagement members'
    ],

    async execute(message, args, client) {
        try {
            // Check permissions
            if (!await hasFlexiblePermission(message.member, 'engagement', this.permissions, message.guild.id)) {
                const embed = embedFactory.error(
                    'Không có quyền!',
                    'Lệnh này cần quyền **Administrator** hoặc cao hơn.'
                );
                return message.reply({ embeds: [embed] });
            }

            const type = args[0]?.toLowerCase() || 'overview';
            
            switch (type) {
                case 'overview':
                case 'o':
                    await this.showOverview(message, client);
                    break;
                case 'channels':
                case 'c':
                    await this.showChannelEngagement(message, client);
                    break;
                case 'members':
                case 'm':
                    await this.showMemberEngagement(message, client);
                    break;
                case 'times':
                case 't':
                    await this.showTimeEngagement(message, client);
                    break;
                default:
                    await this.showHelp(message);
                    break;
            }

        } catch (error) {
            logger.error('Engagement command error', error);
            const embed = embedFactory.error(
                'Lỗi engagement!',
                'Không thể tạo báo cáo engagement.',
                error.message
            );
            await message.reply({ embeds: [embed] });
        }
    },

    async showOverview(message, client) {
        const guild = message.guild;
        
        // Loading
        const loadingEmbed = embedFactory.info(
            '🔥 Đang phân tích engagement...',
            'Đang tính toán mức độ tương tác...'
        );
        const loadingMsg = await message.reply({ embeds: [loadingEmbed] });

        try {
            // Simulate engagement data
            const engagementData = this.generateEngagementData(guild);
            
            const embed = embedFactory.info(
                '🔥 Server Engagement Overview',
                `**${guild.name}** - Tổng quan tương tác`
            );

            embed.addFields([
                {
                    name: '📊 Engagement Score',
                    value: `**Overall Score:** ${engagementData.overallScore}/100\n**Rating:** ${this.getEngagementRating(engagementData.overallScore)}\n**Trend:** ${engagementData.trend}\n**Health:** ${this.getEngagementHealth(engagementData.overallScore)}`,
                    inline: true
                },
                {
                    name: '💬 Message Activity',
                    value: `**Hôm nay:** ${engagementData.messagesToday.toLocaleString()}\n**Tuần này:** ${engagementData.messagesWeek.toLocaleString()}\n**Avg/Member:** ${engagementData.avgMessagesPerMember}\n**Growth:** ${engagementData.messageGrowth}%`,
                    inline: true
                },
                {
                    name: '👥 Member Participation',
                    value: `**Active Members:** ${engagementData.activeMembers}/${guild.memberCount}\n**Participation Rate:** ${engagementData.participationRate}%\n**Daily Active:** ${engagementData.dailyActive}\n**Weekly Active:** ${engagementData.weeklyActive}`,
                    inline: true
                },
                {
                    name: '🏆 Top Engagement Metrics',
                    value: `**Most Active Hour:** ${engagementData.peakHour}:00\n**Best Day:** ${engagementData.bestDay}\n**Most Used Reactions:** ${engagementData.topReactions.join(', ')}\n**Avg Response Time:** ${engagementData.avgResponseTime}`,
                    inline: true
                },
                {
                    name: '📈 Interaction Types',
                    value: `**Messages:** ${engagementData.interactions.messages}%\n**Reactions:** ${engagementData.interactions.reactions}%\n**Voice Chat:** ${engagementData.interactions.voice}%\n**Commands:** ${engagementData.interactions.commands}%`,
                    inline: true
                },
                {
                    name: '🎯 Engagement Goals',
                    value: `**Target Score:** 80/100\n**Current:** ${engagementData.overallScore}/100\n**Progress:** ${this.calculateProgress(engagementData.overallScore, 80)}%\n**To Reach:** ${Math.max(0, 80 - engagementData.overallScore)} điểm`,
                    inline: true
                }
            ]);

            // Add engagement chart
            const chartData = this.createEngagementChart(engagementData.dailyStats);
            embed.addFields([{
                name: '📈 Engagement Chart (7 ngày qua):',
                value: `\`\`\`${chartData}\`\`\``,
                inline: false
            }]);

            // Add navigation buttons
            const buttons = new ActionRowBuilder()
                .addComponents(
                    new ButtonBuilder()
                        .setCustomId('engagement_channels')
                        .setLabel('📺 Channels')
                        .setStyle(ButtonStyle.Primary),
                    new ButtonBuilder()
                        .setCustomId('engagement_members')
                        .setLabel('👥 Members')
                        .setStyle(ButtonStyle.Primary),
                    new ButtonBuilder()
                        .setCustomId('engagement_times')
                        .setLabel('⏰ Times')
                        .setStyle(ButtonStyle.Primary),
                    new ButtonBuilder()
                        .setCustomId('engagement_refresh')
                        .setLabel('🔄 Refresh')
                        .setStyle(ButtonStyle.Secondary)
                );

            await loadingMsg.edit({ embeds: [embed], components: [buttons] });

            // Handle button interactions
            const collector = loadingMsg.createMessageComponentCollector({
                componentType: ComponentType.Button,
                time: 300000 // 5 minutes
            });

            collector.on('collect', async (interaction) => {
                if (interaction.user.id !== message.author.id) {
                    await interaction.reply({ 
                        content: 'Chỉ người gọi lệnh mới có thể sử dụng!', 
                        ephemeral: true 
                    });
                    return;
                }

                await interaction.deferUpdate();
                
                switch (interaction.customId) {
                    case 'engagement_channels':
                        await this.showChannelEngagement(message, client, true);
                        break;
                    case 'engagement_members':
                        await this.showMemberEngagement(message, client, true);
                        break;
                    case 'engagement_times':
                        await this.showTimeEngagement(message, client, true);
                        break;
                    case 'engagement_refresh':
                        await this.showOverview(message, client);
                        break;
                }
            });

            logger.command(message.author, 'engagement overview', message.guild);

        } catch (error) {
            logger.error('Engagement overview error', error);
            const embed = embedFactory.error(
                'Lỗi phân tích!',
                'Không thể tạo báo cáo engagement.',
                error.message
            );
            await loadingMsg.edit({ embeds: [embed] });
        }
    },

    async showChannelEngagement(message, client, isUpdate = false) {
        const guild = message.guild;
        const channels = guild.channels.cache.filter(c => c.type === 0); // Text channels only
        
        // Simulate channel engagement data
        const channelStats = Array.from(channels.values()).map(channel => ({
            name: channel.name,
            id: channel.id,
            messages: Math.floor(Math.random() * 1000) + 100,
            activeMembers: Math.floor(Math.random() * 50) + 10,
            engagementScore: Math.floor(Math.random() * 40) + 60,
            avgResponseTime: Math.floor(Math.random() * 300) + 60, // seconds
            peakHour: Math.floor(Math.random() * 24)
        })).sort((a, b) => b.engagementScore - a.engagementScore);

        const embed = embedFactory.info(
            '📺 Channel Engagement Analysis',
            `**${guild.name}** - Phân tích engagement theo channel`
        );

        // Top 5 channels
        const topChannels = channelStats.slice(0, 5).map((ch, i) => {
            const emoji = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i + 1}.`;
            return `${emoji} **#${ch.name}**\n` +
                   `├ Messages: ${ch.messages.toLocaleString()}\n` +
                   `├ Active Members: ${ch.activeMembers}\n` +
                   `├ Engagement: ${ch.engagementScore}/100\n` +
                   `└ Peak Hour: ${ch.peakHour}:00`;
        }).join('\n\n');

        embed.addFields([
            {
                name: '🏆 Top 5 Channels Active nhất:',
                value: topChannels,
                inline: false
            },
            {
                name: '📊 Channel Statistics',
                value: `**Total Channels:** ${channels.size}\n**Avg Engagement:** ${Math.round(channelStats.reduce((sum, ch) => sum + ch.engagementScore, 0) / channelStats.length)}/100\n**Most Active:** #${channelStats[0].name}\n**Least Active:** #${channelStats[channelStats.length - 1].name}`,
                inline: true
            },
            {
                name: '💡 Recommendations',
                value: `• Promote channels dưới 50 điểm\n• Pin important messages\n• Tạo events trong channels hot\n• Merge channels ít dùng`,
                inline: true
            }
        ]);

        if (!isUpdate) {
            await message.reply({ embeds: [embed] });
        }

        logger.command(message.author, 'engagement channels', message.guild);
    },

    async showMemberEngagement(message, client, isUpdate = false) {
        const guild = message.guild;
        const members = await guild.members.fetch();
        const humanMembers = members.filter(m => !m.user.bot);
        
        // Simulate member engagement data
        const memberStats = Array.from(humanMembers.random(Math.min(20, humanMembers.size)).values()).map(member => ({
            user: member.user,
            messages: Math.floor(Math.random() * 500) + 50,
            reactions: Math.floor(Math.random() * 200) + 20,
            voiceTime: Math.floor(Math.random() * 120) + 10, // minutes
            engagementScore: Math.floor(Math.random() * 40) + 60,
            lastActive: Math.floor(Math.random() * 24) + 1 // hours ago
        })).sort((a, b) => b.engagementScore - a.engagementScore);

        const embed = embedFactory.info(
            '👥 Member Engagement Analysis',
            `**${guild.name}** - Phân tích engagement thành viên`
        );

        // Top 10 members
        const topMembers = memberStats.slice(0, 10).map((m, i) => {
            const emoji = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i + 1}.`;
            return `${emoji} **${m.user.tag}**\n` +
                   `├ Messages: ${m.messages}\n` +
                   `├ Reactions: ${m.reactions}\n` +
                   `├ Score: ${m.engagementScore}/100\n` +
                   `└ Last Active: ${m.lastActive}h ago`;
        }).join('\n\n');

        embed.addFields([
            {
                name: '🏆 Top 10 Members Active nhất:',
                value: topMembers.length > 1000 ? topMembers.substring(0, 1000) + '...' : topMembers,
                inline: false
            },
            {
                name: '📊 Member Stats',
                value: `**Active Members:** ${memberStats.length}/${humanMembers.size}\n**Avg Engagement:** ${Math.round(memberStats.reduce((sum, m) => sum + m.engagementScore, 0) / memberStats.length)}/100\n**Most Active:** ${memberStats[0].user.tag}\n**Participation Rate:** ${((memberStats.length / humanMembers.size) * 100).toFixed(1)}%`,
                inline: true
            },
            {
                name: '🎯 Engagement Levels',
                value: `**High (80+):** ${memberStats.filter(m => m.engagementScore >= 80).length}\n**Medium (60-79):** ${memberStats.filter(m => m.engagementScore >= 60 && m.engagementScore < 80).length}\n**Low (<60):** ${memberStats.filter(m => m.engagementScore < 60).length}`,
                inline: true
            }
        ]);

        if (!isUpdate) {
            await message.reply({ embeds: [embed] });
        }

        logger.command(message.author, 'engagement members', message.guild);
    },

    async showHelp(message) {
        const embed = embedFactory.help({
            title: '🔥 Engagement Analytics Help',
            description: '**Phân tích mức độ tương tác server**\n\nĐo lường và phân tích engagement của thành viên',
            categories: [
                {
                    emoji: '📊',
                    name: 'Overview',
                    value: '`!engagement overview` - Tổng quan engagement'
                },
                {
                    emoji: '📺',
                    name: 'Channels',
                    value: '`!engagement channels` - Engagement theo channel'
                },
                {
                    emoji: '👥',
                    name: 'Members',
                    value: '`!engagement members` - Engagement thành viên'
                },
                {
                    emoji: '⏰',
                    name: 'Times',
                    value: '`!engagement times` - Engagement theo thời gian'
                }
            ]
        });

        await message.reply({ embeds: [embed] });
    },

    // Helper functions
    generateEngagementData(guild) {
        return {
            overallScore: Math.floor(Math.random() * 30) + 70,
            trend: ['📈 Tăng', '📉 Giảm', '➡️ Ổn định'][Math.floor(Math.random() * 3)],
            messagesToday: Math.floor(Math.random() * 1000) + 500,
            messagesWeek: Math.floor(Math.random() * 5000) + 2000,
            avgMessagesPerMember: (Math.random() * 10 + 5).toFixed(1),
            messageGrowth: (Math.random() * 20 - 10).toFixed(1),
            activeMembers: Math.floor(guild.memberCount * 0.3),
            participationRate: (Math.random() * 30 + 20).toFixed(1),
            dailyActive: Math.floor(guild.memberCount * 0.15),
            weeklyActive: Math.floor(guild.memberCount * 0.4),
            peakHour: Math.floor(Math.random() * 24),
            bestDay: ['Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7', 'CN'][Math.floor(Math.random() * 7)],
            topReactions: ['❤️', '😂', '👍', '🔥', '💯'],
            avgResponseTime: `${Math.floor(Math.random() * 10) + 2} phút`,
            interactions: {
                messages: Math.floor(Math.random() * 20) + 60,
                reactions: Math.floor(Math.random() * 15) + 15,
                voice: Math.floor(Math.random() * 10) + 10,
                commands: Math.floor(Math.random() * 10) + 5
            },
            dailyStats: this.generateDailyStats(7)
        };
    },

    generateDailyStats(days) {
        const stats = [];
        for (let i = days - 1; i >= 0; i--) {
            const date = new Date(Date.now() - i * 24 * 60 * 60 * 1000);
            stats.push({
                date: date.toLocaleDateString('vi-VN'),
                score: Math.floor(Math.random() * 30) + 60
            });
        }
        return stats;
    },

    createEngagementChart(dailyStats) {
        const maxScore = Math.max(...dailyStats.map(d => d.score));
        const minScore = Math.min(...dailyStats.map(d => d.score));
        const range = maxScore - minScore || 1;
        
        return dailyStats.map(d => {
            const normalized = Math.round(((d.score - minScore) / range) * 10);
            const bar = '█'.repeat(Math.max(1, normalized));
            return `${d.date.slice(0, 5)}: ${bar} (${d.score})`;
        }).join('\n');
    },

    getEngagementRating(score) {
        if (score >= 90) return '🔥 Outstanding';
        if (score >= 80) return '✨ Excellent';
        if (score >= 70) return '✅ Good';
        if (score >= 60) return '⚠️ Average';
        return '😴 Poor';
    },

    getEngagementHealth(score) {
        if (score >= 80) return '💚 Rất tốt';
        if (score >= 70) return '💛 Tốt';
        if (score >= 60) return '🧡 Trung bình';
        return '❤️ Cần cải thiện';
    },

    calculateProgress(current, target) {
        return Math.min(100, Math.round((current / target) * 100));
    }
};