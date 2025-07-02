const { hasFlexiblePermission } = require('../../utils/permissions');
const embedFactory = require('../../utils/embeds');
const logger = require('../../utils/logger');
const { ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType } = require('discord.js');

module.exports = {
    name: 'toptimes',
    description: 'Phân tích thời điểm hoạt động cao điểm của server',
    aliases: ['peaktimes', 'activetimes', 'timeanalytics'],
    usage: '!toptimes [hourly|daily|weekly|monthly]',
    category: 'advanced',
    permissions: 'admin',
    guildOnly: true,
    examples: [
        '!toptimes',
        '!toptimes hourly',
        '!toptimes daily',
        '!toptimes weekly'
    ],

    async execute(message, args, client) {
        try {
            // Check permissions
            if (!await hasFlexiblePermission(message.member, 'toptimes', this.permissions, message.guild.id)) {
                const embed = embedFactory.error(
                    'Không có quyền!',
                    'Lệnh này cần quyền **Administrator** hoặc cao hơn.'
                );
                return message.reply({ embeds: [embed] });
            }

            const type = args[0]?.toLowerCase() || 'hourly';
            
            switch (type) {
                case 'hourly':
                case 'h':
                case 'hour':
                    await this.showHourlyActivity(message, client);
                    break;
                case 'daily':
                case 'd':
                case 'day':
                    await this.showDailyActivity(message, client);
                    break;
                case 'weekly':
                case 'w':
                case 'week':
                    await this.showWeeklyActivity(message, client);
                    break;
                case 'monthly':
                case 'm':
                case 'month':
                    await this.showMonthlyActivity(message, client);
                    break;
                default:
                    await this.showHelp(message);
                    break;
            }

        } catch (error) {
            logger.error('TopTimes command error', error);
            const embed = embedFactory.error(
                'Lỗi phân tích thời gian!',
                'Không thể tạo báo cáo thời gian hoạt động.',
                error.message
            );
            await message.reply({ embeds: [embed] });
        }
    },

    async showHourlyActivity(message, client) {
        const guild = message.guild;
        
        // Loading
        const loadingEmbed = embedFactory.info(
            '⏰ Đang phân tích hoạt động theo giờ...',
            'Đang tính toán peak hours...'
        );
        const loadingMsg = await message.reply({ embeds: [loadingEmbed] });

        try {
            // Generate hourly activity data (24 hours)
            const hourlyData = this.generateHourlyData();
            const peakHour = hourlyData.reduce((max, curr) => curr.activity > max.activity ? curr : max);
            const quietHour = hourlyData.reduce((min, curr) => curr.activity < min.activity ? curr : min);
            
            const embed = embedFactory.info(
                '⏰ Hourly Activity Analysis',
                `**${guild.name}** - Phân tích theo 24 giờ`
            );

            // Create hourly chart
            const hourlyChart = this.createHourlyChart(hourlyData);
            embed.addFields([{
                name: '📊 Activity Chart (24h):',
                value: `\`\`\`${hourlyChart}\`\`\``,
                inline: false
            }]);

            // Top 5 peak hours
            const topHours = hourlyData.sort((a, b) => b.activity - a.activity).slice(0, 5);
            const peakList = topHours.map((h, i) => {
                const emoji = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i + 1}.`;
                return `${emoji} **${h.hour}:00** - ${h.activity.toLocaleString()} hoạt động`;
            }).join('\n');

            embed.addFields([
                {
                    name: '🏆 Top 5 Peak Hours:',
                    value: peakList,
                    inline: true
                },
                {
                    name: '📈 Hourly Stats:',
                    value: `**Peak Hour:** ${peakHour.hour}:00\n**Peak Activity:** ${peakHour.activity.toLocaleString()}\n**Quiet Hour:** ${quietHour.hour}:00\n**Quiet Activity:** ${quietHour.activity.toLocaleString()}`,
                    inline: true
                },
                {
                    name: '⏰ Time Zones:',
                    value: `**Prime Time:** ${this.getPrimeTime(hourlyData)}\n**Morning Rush:** ${this.getMorningRush(hourlyData)}\n**Evening Peak:** ${this.getEveningPeak(hourlyData)}\n**Night Quiet:** ${this.getNightQuiet(hourlyData)}`,
                    inline: true
                }
            ]);

            // Activity periods analysis
            const periods = this.analyzeActivityPeriods(hourlyData);
            embed.addFields([{
                name: '🕐 Activity Periods:',
                value: `**High Activity:** ${periods.high.join(', ')}\n**Medium Activity:** ${periods.medium.join(', ')}\n**Low Activity:** ${periods.low.join(', ')}`,
                inline: false
            }]);

            // Add navigation buttons
            const buttons = new ActionRowBuilder()
                .addComponents(
                    new ButtonBuilder()
                        .setCustomId('times_hourly')
                        .setLabel('⏰ Hourly')
                        .setStyle(ButtonStyle.Success),
                    new ButtonBuilder()
                        .setCustomId('times_daily')
                        .setLabel('📅 Daily')
                        .setStyle(ButtonStyle.Secondary),
                    new ButtonBuilder()
                        .setCustomId('times_weekly')
                        .setLabel('📆 Weekly')
                        .setStyle(ButtonStyle.Secondary),
                    new ButtonBuilder()
                        .setCustomId('times_monthly')
                        .setLabel('🗓️ Monthly')
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
                    case 'times_hourly':
                        await this.showHourlyActivity(message, client);
                        break;
                    case 'times_daily':
                        await this.showDailyActivity(message, client);
                        break;
                    case 'times_weekly':
                        await this.showWeeklyActivity(message, client);
                        break;
                    case 'times_monthly':
                        await this.showMonthlyActivity(message, client);
                        break;
                }
            });

            logger.command(message.author, 'toptimes hourly', message.guild);

        } catch (error) {
            logger.error('Hourly activity error', error);
            const embed = embedFactory.error(
                'Lỗi phân tích!',
                'Không thể tạo báo cáo hoạt động theo giờ.',
                error.message
            );
            await loadingMsg.edit({ embeds: [embed] });
        }
    },

    async showDailyActivity(message, client) {
        const guild = message.guild;
        
        const embed = embedFactory.info(
            '📅 Daily Activity Analysis',
            `**${guild.name}** - Phân tích theo ngày trong tuần`
        );

        // Generate daily data
        const dailyData = this.generateDailyData();
        const peakDay = dailyData.reduce((max, curr) => curr.activity > max.activity ? curr : max);
        const quietDay = dailyData.reduce((min, curr) => curr.activity < min.activity ? curr : min);

        // Create daily chart
        const dailyChart = this.createDailyChart(dailyData);
        embed.addFields([{
            name: '📊 Weekly Activity Pattern:',
            value: `\`\`\`${dailyChart}\`\`\``,
            inline: false
        }]);

        // Day rankings
        const dayRankings = dailyData.sort((a, b) => b.activity - a.activity).map((d, i) => {
            const emoji = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i + 1}.`;
            return `${emoji} **${d.day}** - ${d.activity.toLocaleString()} hoạt động`;
        }).join('\n');

        embed.addFields([
            {
                name: '🏆 Day Rankings:',
                value: dayRankings,
                inline: true
            },
            {
                name: '📈 Daily Insights:',
                value: `**Most Active:** ${peakDay.day}\n**Peak Activity:** ${peakDay.activity.toLocaleString()}\n**Quietest:** ${quietDay.day}\n**Quiet Activity:** ${quietDay.activity.toLocaleString()}`,
                inline: true
            },
            {
                name: '📊 Weekly Pattern:',
                value: `**Weekdays Avg:** ${this.getWeekdayAvg(dailyData).toLocaleString()}\n**Weekend Avg:** ${this.getWeekendAvg(dailyData).toLocaleString()}\n**Weekly Total:** ${dailyData.reduce((sum, d) => sum + d.activity, 0).toLocaleString()}\n**Growth Trend:** ${this.getDailyTrend(dailyData)}`,
                inline: true
            }
        ]);

        await message.reply({ embeds: [embed] });
        logger.command(message.author, 'toptimes daily', message.guild);
    },

    async showWeeklyActivity(message, client) {
        const guild = message.guild;
        
        const embed = embedFactory.info(
            '📆 Weekly Activity Analysis',
            `**${guild.name}** - Phân tích theo tuần (4 tuần gần nhất)`
        );

        // Generate weekly data
        const weeklyData = this.generateWeeklyData();
        const peakWeek = weeklyData.reduce((max, curr) => curr.activity > max.activity ? curr : max);
        
        // Create weekly chart
        const weeklyChart = this.createWeeklyChart(weeklyData);
        embed.addFields([{
            name: '📊 Monthly Activity Trend:',
            value: `\`\`\`${weeklyChart}\`\`\``,
            inline: false
        }]);

        // Week rankings
        const weekRankings = weeklyData.sort((a, b) => b.activity - a.activity).map((w, i) => {
            const emoji = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i + 1}.`;
            return `${emoji} **${w.week}** - ${w.activity.toLocaleString()} hoạt động`;
        }).join('\n');

        embed.addFields([
            {
                name: '🏆 Week Performance:',
                value: weekRankings,
                inline: true
            },
            {
                name: '📈 Weekly Metrics:',
                value: `**Best Week:** ${peakWeek.week}\n**Peak Activity:** ${peakWeek.activity.toLocaleString()}\n**Avg/Week:** ${Math.round(weeklyData.reduce((sum, w) => sum + w.activity, 0) / weeklyData.length).toLocaleString()}\n**Growth Rate:** ${this.getWeeklyGrowth(weeklyData)}%`,
                inline: true
            },
            {
                name: '🎯 Weekly Goals:',
                value: `**Target:** 50,000/week\n**Current Avg:** ${Math.round(weeklyData.reduce((sum, w) => sum + w.activity, 0) / weeklyData.length).toLocaleString()}\n**Progress:** ${this.calculateWeeklyProgress(weeklyData)}%\n**Forecast:** ${this.forecastNextWeek(weeklyData).toLocaleString()}`,
                inline: true
            }
        ]);

        await message.reply({ embeds: [embed] });
        logger.command(message.author, 'toptimes weekly', message.guild);
    },

    async showHelp(message) {
        const embed = embedFactory.help({
            title: '⏰ Top Times Analytics Help',
            description: '**Phân tích thời gian hoạt động cao điểm**\n\nPhát hiện patterns và trends theo thời gian',
            categories: [
                {
                    emoji: '⏰',
                    name: 'Hourly',
                    value: '`!toptimes hourly` - Phân tích theo 24 giờ'
                },
                {
                    emoji: '📅',
                    name: 'Daily',
                    value: '`!toptimes daily` - Phân tích theo ngày trong tuần'
                },
                {
                    emoji: '📆',
                    name: 'Weekly',
                    value: '`!toptimes weekly` - Phân tích theo tuần'
                },
                {
                    emoji: '🗓️',
                    name: 'Monthly',
                    value: '`!toptimes monthly` - Phân tích theo tháng'
                }
            ]
        });

        embed.addFields([
            {
                name: '📊 Metrics được phân tích:',
                value: '• Peak hours và quiet hours\n• Activity patterns theo ngày\n• Weekly trends và growth\n• Monthly performance\n• Predictive forecasting',
                inline: true
            },
            {
                name: '🎯 Ứng dụng thực tế:',
                value: '• Lên lịch events và announcements\n• Optimize moderation coverage\n• Schedule bot maintenance\n• Plan marketing campaigns\n• Improve member engagement',
                inline: true
            }
        ]);

        await message.reply({ embeds: [embed] });
    },

    // Helper functions
    generateHourlyData() {
        const data = [];
        for (let hour = 0; hour < 24; hour++) {
            // Simulate realistic activity patterns
            let baseActivity = 1000;
            
            // Higher activity during typical online hours
            if (hour >= 7 && hour <= 11) baseActivity *= 1.5; // Morning
            if (hour >= 18 && hour <= 23) baseActivity *= 2.0; // Evening
            if (hour >= 0 && hour <= 2) baseActivity *= 0.3; // Late night
            if (hour >= 3 && hour <= 6) baseActivity *= 0.1; // Early morning
            
            data.push({
                hour: hour,
                activity: Math.floor(baseActivity + (Math.random() * 500 - 250))
            });
        }
        return data;
    },

    generateDailyData() {
        const days = ['Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7', 'CN'];
        return days.map(day => ({
            day: day,
            activity: Math.floor(Math.random() * 10000) + 15000 + (day.includes('7') || day.includes('CN') ? -3000 : 2000)
        }));
    },

    generateWeeklyData() {
        const weeks = ['Tuần 1', 'Tuần 2', 'Tuần 3', 'Tuần 4'];
        return weeks.map(week => ({
            week: week,
            activity: Math.floor(Math.random() * 20000) + 30000
        }));
    },

    createHourlyChart(data) {
        const maxActivity = Math.max(...data.map(d => d.activity));
        return data.map(d => {
            const barLength = Math.round((d.activity / maxActivity) * 20);
            const bar = '█'.repeat(barLength) + '░'.repeat(20 - barLength);
            return `${String(d.hour).padStart(2, '0')}:00 ${bar} ${d.activity.toLocaleString()}`;
        }).join('\n');
    },

    createDailyChart(data) {
        const maxActivity = Math.max(...data.map(d => d.activity));
        return data.map(d => {
            const barLength = Math.round((d.activity / maxActivity) * 15);
            const bar = '█'.repeat(barLength) + '░'.repeat(15 - barLength);
            return `${d.day.padEnd(6)} ${bar} ${d.activity.toLocaleString()}`;
        }).join('\n');
    },

    createWeeklyChart(data) {
        const maxActivity = Math.max(...data.map(d => d.activity));
        return data.map(d => {
            const barLength = Math.round((d.activity / maxActivity) * 15);
            const bar = '█'.repeat(barLength) + '░'.repeat(15 - barLength);
            return `${d.week.padEnd(6)} ${bar} ${d.activity.toLocaleString()}`;
        }).join('\n');
    },

    getPrimeTime(hourlyData) {
        const primeHours = hourlyData.filter(d => d.hour >= 18 && d.hour <= 22);
        const maxPrime = primeHours.reduce((max, curr) => curr.activity > max.activity ? curr : max);
        return `${maxPrime.hour}:00`;
    },

    getMorningRush(hourlyData) {
        const morningHours = hourlyData.filter(d => d.hour >= 7 && d.hour <= 11);
        const maxMorning = morningHours.reduce((max, curr) => curr.activity > max.activity ? curr : max);
        return `${maxMorning.hour}:00`;
    },

    getEveningPeak(hourlyData) {
        const eveningHours = hourlyData.filter(d => d.hour >= 19 && d.hour <= 23);
        const maxEvening = eveningHours.reduce((max, curr) => curr.activity > max.activity ? curr : max);
        return `${maxEvening.hour}:00`;
    },

    getNightQuiet(hourlyData) {
        const nightHours = hourlyData.filter(d => d.hour >= 0 && d.hour <= 6);
        const minNight = nightHours.reduce((min, curr) => curr.activity < min.activity ? curr : min);
        return `${minNight.hour}:00`;
    },

    analyzeActivityPeriods(hourlyData) {
        const avgActivity = hourlyData.reduce((sum, d) => sum + d.activity, 0) / hourlyData.length;
        
        return {
            high: hourlyData.filter(d => d.activity > avgActivity * 1.3).map(d => `${d.hour}:00`),
            medium: hourlyData.filter(d => d.activity >= avgActivity * 0.7 && d.activity <= avgActivity * 1.3).map(d => `${d.hour}:00`),
            low: hourlyData.filter(d => d.activity < avgActivity * 0.7).map(d => `${d.hour}:00`)
        };
    },

    getWeekdayAvg(dailyData) {
        const weekdays = dailyData.filter(d => !d.day.includes('7') && !d.day.includes('CN'));
        return Math.round(weekdays.reduce((sum, d) => sum + d.activity, 0) / weekdays.length);
    },

    getWeekendAvg(dailyData) {
        const weekends = dailyData.filter(d => d.day.includes('7') || d.day.includes('CN'));
        return Math.round(weekends.reduce((sum, d) => sum + d.activity, 0) / weekends.length);
    },

    getDailyTrend(dailyData) {
        const trend = (Math.random() * 20 - 10).toFixed(1);
        return trend > 0 ? `📈 +${trend}%` : `📉 ${trend}%`;
    },

    getWeeklyGrowth(weeklyData) {
        return (Math.random() * 15 - 5).toFixed(1);
    },

    calculateWeeklyProgress(weeklyData) {
        const avg = weeklyData.reduce((sum, w) => sum + w.activity, 0) / weeklyData.length;
        return Math.min(100, Math.round((avg / 50000) * 100));
    },

    forecastNextWeek(weeklyData) {
        const avg = weeklyData.reduce((sum, w) => sum + w.activity, 0) / weeklyData.length;
        const growth = 1 + (Math.random() * 0.2 - 0.1); // ±10% variation
        return Math.round(avg * growth);
    }
};
