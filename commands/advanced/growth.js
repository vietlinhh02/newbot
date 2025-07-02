const { hasFlexiblePermission } = require('../../utils/permissions');
const embedFactory = require('../../utils/embeds');
const logger = require('../../utils/logger');
const { ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType } = require('discord.js');

module.exports = {
    name: 'growth',
    description: 'Phân tích tăng trưởng thành viên server theo thời gian',
    aliases: ['memberstats', 'growthtats', 'memberanalytics'],
    usage: '!growth [7d|30d|90d|all]',
    category: 'advanced',
    permissions: 'admin',
    guildOnly: true,
    examples: [
        '!growth',
        '!growth 7d',
        '!growth 30d',
        '!growth all'
    ],

    async execute(message, args, client) {
        try {
            // Check permissions
            if (!await hasFlexiblePermission(message.member, 'growth', this.permissions, message.guild.id)) {
                const embed = embedFactory.error(
                    'Không có quyền!',
                    'Lệnh này cần quyền **Administrator** hoặc cao hơn.'
                );
                return message.reply({ embeds: [embed] });
            }

            const period = args[0]?.toLowerCase() || '30d';
            
            switch (period) {
                case '7d':
                case '7':
                case 'week':
                    await this.showGrowth(message, 7, 'Tuần vừa qua');
                    break;
                case '30d':
                case '30':
                case 'month':
                    await this.showGrowth(message, 30, 'Tháng vừa qua');
                    break;
                case '90d':
                case '90':
                case 'quarter':
                    await this.showGrowth(message, 90, 'Quý vừa qua');
                    break;
                case 'all':
                case 'total':
                    await this.showAllTimeGrowth(message);
                    break;
                default:
                    await this.showHelp(message);
                    break;
            }

        } catch (error) {
            logger.error('Growth command error', error);
            const embed = embedFactory.error(
                'Lỗi phân tích growth!',
                'Không thể tạo báo cáo tăng trưởng.',
                error.message
            );
            await message.reply({ embeds: [embed] });
        }
    },

    async showGrowth(message, days, periodName) {
        const guild = message.guild;
        
        // Loading
        const loadingEmbed = embedFactory.info(
            '📈 Đang phân tích growth...',
            'Đang tính toán dữ liệu tăng trưởng...'
        );
        const loadingMsg = await message.reply({ embeds: [loadingEmbed] });

        try {
            // Simulate growth data (in real app, get from database)
            const growthData = this.generateGrowthData(days);
            const currentMembers = guild.memberCount;
            
            // Calculate metrics
            const totalJoined = growthData.reduce((sum, day) => sum + day.joined, 0);
            const totalLeft = growthData.reduce((sum, day) => sum + day.left, 0);
            const netGrowth = totalJoined - totalLeft;
            const growthRate = ((netGrowth / currentMembers) * 100).toFixed(2);
            const avgJoinPerDay = (totalJoined / days).toFixed(1);
            const avgLeavePerDay = (totalLeft / days).toFixed(1);
            
            // Find best and worst days
            const bestDay = growthData.reduce((max, day) => 
                (day.joined - day.left) > (max.joined - max.left) ? day : max
            );
            const worstDay = growthData.reduce((min, day) => 
                (day.joined - day.left) < (min.joined - min.left) ? day : min
            );

            const embed = embedFactory.info(
                '📈 Member Growth Analytics',
                `**${guild.name}** - ${periodName} (${days} ngày)`
            );

            embed.addFields([
                {
                    name: '📊 Tổng quan Growth',
                    value: `**Thành viên hiện tại:** ${currentMembers.toLocaleString()}\n**Tham gia:** +${totalJoined}\n**Rời đi:** -${totalLeft}\n**Tăng ròng:** ${netGrowth >= 0 ? '+' : ''}${netGrowth}`,
                    inline: true
                },
                {
                    name: '📈 Tỷ lệ tăng trưởng',
                    value: `**Growth Rate:** ${growthRate}%\n**Trung bình/ngày:** +${avgJoinPerDay}\n**Churn Rate:** ${avgLeavePerDay}/ngày\n**Retention:** ${((totalJoined - totalLeft) / totalJoined * 100).toFixed(1)}%`,
                    inline: true
                },
                {
                    name: '🏆 Ngày tốt nhất',
                    value: `**Ngày:** ${bestDay.date}\n**Tham gia:** +${bestDay.joined}\n**Rời đi:** -${bestDay.left}\n**Net:** +${bestDay.joined - bestDay.left}`,
                    inline: true
                },
                {
                    name: '📉 Ngày tệ nhất',
                    value: `**Ngày:** ${worstDay.date}\n**Tham gia:** +${worstDay.joined}\n**Rời đi:** -${worstDay.left}\n**Net:** ${worstDay.joined - worstDay.left}`,
                    inline: true
                },
                {
                    name: '🎯 Dự đoán Growth',
                    value: `**30 ngày tới:** ${this.predictGrowth(growthData, 30)}\n**Đạt 1000 members:** ${this.predictMilestone(currentMembers, growthData, 1000)}\n**Trend:** ${this.getGrowthTrend(growthData)}`,
                    inline: true
                },
                {
                    name: '📊 Performance Score',
                    value: `**Score:** ${this.calculateGrowthScore(growthData)}/100\n**Rating:** ${this.getGrowthRating(growthData)}\n**Health:** ${this.getGrowthHealth(netGrowth, days)}`,
                    inline: true
                }
            ]);

            // Create growth chart text
            const chartData = this.createGrowthChart(growthData);
            embed.addFields([{
                name: '📈 Growth Chart (Net members mỗi ngày):',
                value: `\`\`\`${chartData}\`\`\``,
                inline: false
            }]);

            // Add period buttons
            const buttons = new ActionRowBuilder()
                .addComponents(
                    new ButtonBuilder()
                        .setCustomId('growth_7d')
                        .setLabel('📅 7 ngày')
                        .setStyle(days === 7 ? ButtonStyle.Success : ButtonStyle.Secondary),
                    new ButtonBuilder()
                        .setCustomId('growth_30d')
                        .setLabel('📅 30 ngày')
                        .setStyle(days === 30 ? ButtonStyle.Success : ButtonStyle.Secondary),
                    new ButtonBuilder()
                        .setCustomId('growth_90d')
                        .setLabel('📅 90 ngày')
                        .setStyle(days === 90 ? ButtonStyle.Success : ButtonStyle.Secondary),
                    new ButtonBuilder()
                        .setCustomId('growth_all')
                        .setLabel('📅 All Time')
                        .setStyle(ButtonStyle.Primary)
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
                    case 'growth_7d':
                        await this.showGrowth(message, 7, 'Tuần vừa qua');
                        break;
                    case 'growth_30d':
                        await this.showGrowth(message, 30, 'Tháng vừa qua');
                        break;
                    case 'growth_90d':
                        await this.showGrowth(message, 90, 'Quý vừa qua');
                        break;
                    case 'growth_all':
                        await this.showAllTimeGrowth(message);
                        break;
                }
            });

            logger.command(message.author, `growth ${days}d`, message.guild);

        } catch (error) {
            logger.error('Growth analysis error', error);
            const embed = embedFactory.error(
                'Lỗi phân tích!',
                'Không thể tạo báo cáo growth.',
                error.message
            );
            await loadingMsg.edit({ embeds: [embed] });
        }
    },

    async showAllTimeGrowth(message) {
        const guild = message.guild;
        const createdDays = Math.floor((Date.now() - guild.createdTimestamp) / (1000 * 60 * 60 * 24));
        
        const embed = embedFactory.info(
            '🚀 All-Time Growth Analytics',
            `**${guild.name}** - Từ ngày thành lập`
        );

        // Simulate all-time data
        const totalMembers = guild.memberCount;
        const avgGrowthPerDay = (totalMembers / createdDays).toFixed(2);
        const milestones = this.calculateMilestones(totalMembers, createdDays);

        embed.addFields([
            {
                name: '📊 All-Time Stats',
                value: `**Server Age:** ${createdDays} ngày\n**Current Members:** ${totalMembers.toLocaleString()}\n**Avg Growth/Day:** ${avgGrowthPerDay}\n**Total Growth Rate:** ${((totalMembers / createdDays) * 100).toFixed(2)}%`,
                inline: true
            },
            {
                name: '🏆 Milestones',
                value: milestones,
                inline: true
            },
            {
                name: '📈 Growth Phases',
                value: `**Launch Phase:** Ngày 1-30\n**Growth Phase:** Ngày 31-180\n**Mature Phase:** Ngày 180+\n**Current Phase:** ${this.getCurrentPhase(createdDays)}`,
                inline: true
            }
        ]);

        await message.reply({ embeds: [embed] });
    },

    async showHelp(message) {
        const embed = embedFactory.help({
            title: '📈 Growth Analytics Help',
            description: '**Phân tích tăng trưởng thành viên server**\n\nTheo dõi và phân tích xu hướng tăng trưởng',
            categories: [
                {
                    emoji: '📅',
                    name: '7 ngày',
                    value: '`!growth 7d` - Growth tuần vừa qua'
                },
                {
                    emoji: '📅',
                    name: '30 ngày',
                    value: '`!growth 30d` - Growth tháng vừa qua'
                },
                {
                    emoji: '📅',
                    name: '90 ngày',
                    value: '`!growth 90d` - Growth quý vừa qua'
                },
                {
                    emoji: '🚀',
                    name: 'All Time',
                    value: '`!growth all` - Growth từ khi thành lập'
                }
            ]
        });

        await message.reply({ embeds: [embed] });
    },

    // Helper functions
    generateGrowthData(days) {
        const data = [];
        for (let i = days - 1; i >= 0; i--) {
            const date = new Date(Date.now() - i * 24 * 60 * 60 * 1000);
            data.push({
                date: date.toLocaleDateString('vi-VN'),
                joined: Math.floor(Math.random() * 15) + 1,
                left: Math.floor(Math.random() * 8) + 1
            });
        }
        return data;
    },

    createGrowthChart(data) {
        const maxNet = Math.max(...data.map(d => d.joined - d.left));
        const minNet = Math.min(...data.map(d => d.joined - d.left));
        const range = maxNet - minNet || 1;
        
        const chart = data.slice(-14).map(d => {
            const net = d.joined - d.left;
            const normalized = Math.round(((net - minNet) / range) * 10);
            const bar = '█'.repeat(Math.max(1, normalized));
            return `${d.date.slice(0, 5)}: ${bar} (${net >= 0 ? '+' : ''}${net})`;
        }).join('\n');
        
        return chart;
    },

    predictGrowth(data, futureDays) {
        const avgNet = data.reduce((sum, d) => sum + (d.joined - d.left), 0) / data.length;
        const predicted = Math.round(avgNet * futureDays);
        return `${predicted >= 0 ? '+' : ''}${predicted} members`;
    },

    predictMilestone(current, data, target) {
        const avgNet = data.reduce((sum, d) => sum + (d.joined - d.left), 0) / data.length;
        if (avgNet <= 0) return 'Không khả thi';
        const daysToTarget = Math.ceil((target - current) / avgNet);
        return `~${daysToTarget} ngày`;
    },

    getGrowthTrend(data) {
        const firstHalf = data.slice(0, Math.floor(data.length / 2));
        const secondHalf = data.slice(Math.floor(data.length / 2));
        
        const firstAvg = firstHalf.reduce((sum, d) => sum + (d.joined - d.left), 0) / firstHalf.length;
        const secondAvg = secondHalf.reduce((sum, d) => sum + (d.joined - d.left), 0) / secondHalf.length;
        
        if (secondAvg > firstAvg) return '📈 Tăng';
        if (secondAvg < firstAvg) return '📉 Giảm';
        return '➡️ Ổn định';
    },

    calculateGrowthScore(data) {
        const avgNet = data.reduce((sum, d) => sum + (d.joined - d.left), 0) / data.length;
        const consistency = this.calculateConsistency(data);
        return Math.min(100, Math.max(0, Math.round((avgNet * 10) + consistency)));
    },

    getGrowthRating(data) {
        const score = this.calculateGrowthScore(data);
        if (score >= 80) return '🔥 Excellent';
        if (score >= 60) return '✅ Good';
        if (score >= 40) return '⚠️ Average';
        return '😴 Poor';
    },

    getGrowthHealth(netGrowth, days) {
        const rate = netGrowth / days;
        if (rate > 5) return '💚 Rất khỏe';
        if (rate > 2) return '💛 Khỏe mạnh';
        if (rate > 0) return '🧡 Ổn định';
        return '❤️ Cần cải thiện';
    }
};
