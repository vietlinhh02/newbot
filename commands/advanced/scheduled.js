const { hasFlexiblePermission } = require('../../utils/permissions');
const embedFactory = require('../../utils/embeds');
const logger = require('../../utils/logger');
const { ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType } = require('discord.js');

module.exports = {
    name: 'scheduled',
    description: 'Lên lịch chạy commands tự động theo thời gian',
    aliases: ['schedule', 'cron', 'timer'],
    usage: '!scheduled <add|remove|list|toggle> [time] [command]',
    category: 'advanced',
    permissions: 'admin',
    guildOnly: true,
    examples: [
        '!scheduled add "2024-12-25 12:00" "announce Merry Christmas!"',
        '!scheduled add daily_18:00 "membercount"',
        '!scheduled add weekly_monday_09:00 "backup create"',
        '!scheduled list',
        '!scheduled toggle'
    ],

    // In-memory storage for scheduled tasks
    scheduledData: new Map(),
    activeTimers: new Map(),

    async execute(message, args, client) {
        try {
            // Check permissions
            if (!await hasFlexiblePermission(message.member, 'scheduled', this.permissions, message.guild.id)) {
                const embed = embedFactory.error(
                    'Không có quyền!',
                    'Lệnh này cần quyền **Administrator** hoặc cao hơn.'
                );
                return message.reply({ embeds: [embed] });
            }

            // Initialize guild data
            if (!this.scheduledData.has(message.guild.id)) {
                this.scheduledData.set(message.guild.id, {
                    enabled: false,
                    tasks: [],
                    stats: { executed: 0, failed: 0 }
                });
            }

            if (!args[0]) {
                return this.showStatus(message);
            }

            const action = args[0].toLowerCase();
            
            switch (action) {
                case 'add':
                case 'a':
                case 'create':
                    if (!args[1] || !args[2]) {
                        return this.showTimeFormats(message);
                    }
                    await this.addTask(message, args[1], args.slice(2).join(' '));
                    break;
                case 'remove':
                case 'r':
                case 'delete':
                    if (!args[1]) {
                        const embed = embedFactory.error(
                            'Thiếu task ID!',
                            'Sử dụng: `!scheduled remove <task_id>`\n\nXem danh sách: `!scheduled list`'
                        );
                        return message.reply({ embeds: [embed] });
                    }
                    await this.removeTask(message, args[1]);
                    break;
                case 'list':
                case 'l':
                    await this.listTasks(message);
                    break;
                case 'toggle':
                case 't':
                    await this.toggleSystem(message);
                    break;
                case 'test':
                    if (!args[1]) {
                        const embed = embedFactory.error(
                            'Thiếu task ID!',
                            'Sử dụng: `!scheduled test <task_id>`'
                        );
                        return message.reply({ embeds: [embed] });
                    }
                    await this.testTask(message, args[1]);
                    break;
                default:
                    await this.showHelp(message);
                    break;
            }

        } catch (error) {
            logger.error('Scheduled command error', error);
            const embed = embedFactory.error(
                'Lỗi scheduled!',
                'Đã xảy ra lỗi khi thực thi lệnh scheduled.',
                error.message
            );
            await message.reply({ embeds: [embed] });
        }
    },

    async addTask(message, timeInput, command) {
        const guildData = this.scheduledData.get(message.guild.id);
        
        // Parse time input
        const parsedTime = this.parseTimeInput(timeInput);
        if (!parsedTime.valid) {
            const embed = embedFactory.error(
                'Format thời gian không hợp lệ!',
                `Không thể hiểu time input: \`${timeInput}\`\n\nXem formats: \`!scheduled add\``
            );
            return message.reply({ embeds: [embed] });
        }

        // Validate command
        if (!command.startsWith('!')) {
            command = '!' + command; // Add prefix if missing
        }

        const task = {
            id: Date.now(),
            timeInput: timeInput,
            parsedTime: parsedTime,
            command: command,
            channelId: message.channel.id,
            authorId: message.author.id,
            addedAt: new Date().toISOString(),
            lastRun: null,
            nextRun: parsedTime.nextRun,
            runCount: 0,
            enabled: true
        };

        guildData.tasks.push(task);

        // Schedule the task
        this.scheduleTask(message.guild.id, task);

        const embed = embedFactory.success(
            '⏰ Đã thêm Scheduled Task!',
            `**Time:** \`${timeInput}\`\n**Command:** \`${command}\`\n**Channel:** ${message.channel}`
        );

        embed.addFields([
            {
                name: '📅 Schedule Info:',
                value: `**Type:** ${parsedTime.type}\n**Next Run:** ${new Date(parsedTime.nextRun).toLocaleString('vi-VN')}\n**Repeating:** ${parsedTime.recurring ? 'Yes' : 'No'}`,
                inline: true
            },
            {
                name: '⚙️ Task Details:',
                value: `**Task ID:** ${task.id}\n**Added by:** ${message.author.tag}\n**Status:** Enabled`,
                inline: true
            }
        ]);

        await message.reply({ embeds: [embed] });
        logger.command(message.author, `scheduled add "${timeInput}" "${command}"`, message.guild);
    },

    async removeTask(message, taskId) {
        const guildData = this.scheduledData.get(message.guild.id);
        const taskIndex = guildData.tasks.findIndex(t => t.id.toString() === taskId);
        
        if (taskIndex === -1) {
            const embed = embedFactory.error(
                'Task không tồn tại!',
                `Task với ID \`${taskId}\` không tìm thấy.\n\nXem danh sách: \`!scheduled list\``
            );
            return message.reply({ embeds: [embed] });
        }

        const removedTask = guildData.tasks[taskIndex];
        guildData.tasks.splice(taskIndex, 1);

        // Cancel the timer
        this.cancelTask(message.guild.id, removedTask.id);

        const embed = embedFactory.success(
            '✅ Đã xóa Scheduled Task!',
            `**Task ID:** ${removedTask.id}\n**Command:** \`${removedTask.command}\`\n**Đã chạy:** ${removedTask.runCount} lần`
        );

        await message.reply({ embeds: [embed] });
        logger.command(message.author, `scheduled remove ${taskId}`, message.guild);
    },

    async listTasks(message) {
        const guildData = this.scheduledData.get(message.guild.id);

        if (guildData.tasks.length === 0) {
            const embed = embedFactory.warning(
                'Không có Scheduled Tasks!',
                'Chưa có task nào được lên lịch.\n\nThêm task: `!scheduled add <time> <command>`\nXem formats: `!scheduled add`'
            );
            return message.reply({ embeds: [embed] });
        }

        const embed = embedFactory.info(
            '⏰ Scheduled Tasks',
            `**Server:** ${message.guild.name}\n**Trạng thái:** ${guildData.enabled ? '🟢 Hoạt động' : '🔴 Tắt'}\n**Tổng tasks:** ${guildData.tasks.length}`
        );

        const tasksList = guildData.tasks.map((task, index) => {
            const channel = message.guild.channels.cache.get(task.channelId);
            const channelName = channel ? `#${channel.name}` : 'Deleted Channel';
            const nextRun = new Date(task.nextRun).toLocaleString('vi-VN');
            const status = task.enabled ? '🟢' : '🔴';
            
            return `${status} **${index + 1}.** \`${task.timeInput}\`\n` +
                   `├ Command: \`${task.command}\`\n` +
                   `├ Channel: ${channelName}\n` +
                   `├ Next Run: ${nextRun}\n` +
                   `├ Run Count: ${task.runCount}\n` +
                   `└ ID: ${task.id}`;
        }).join('\n\n');

        embed.addFields([{
            name: '📝 Danh sách Tasks:',
            value: tasksList.length > 1000 ? tasksList.substring(0, 1000) + '...' : tasksList,
            inline: false
        }]);

        // Add control buttons
        const buttons = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('scheduled_toggle')
                    .setLabel(guildData.enabled ? '🔴 Tắt Scheduler' : '🟢 Bật Scheduler')
                    .setStyle(guildData.enabled ? ButtonStyle.Danger : ButtonStyle.Success),
                new ButtonBuilder()
                    .setCustomId('scheduled_stats')
                    .setLabel('📊 Statistics')
                    .setStyle(ButtonStyle.Secondary),
                new ButtonBuilder()
                    .setCustomId('scheduled_refresh')
                    .setLabel('🔄 Refresh')
                    .setStyle(ButtonStyle.Secondary)
            );

        const msg = await message.reply({ embeds: [embed], components: [buttons] });

        // Handle button interactions
        const collector = msg.createMessageComponentCollector({
            componentType: ComponentType.Button,
            time: 300000
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
                case 'scheduled_toggle':
                    await this.toggleSystem(message, true);
                    break;
                case 'scheduled_stats':
                    await this.showStats(message);
                    break;
                case 'scheduled_refresh':
                    await this.listTasks(message);
                    break;
            }
        });
    },

    async toggleSystem(message, isButton = false) {
        const guildData = this.scheduledData.get(message.guild.id);
        guildData.enabled = !guildData.enabled;

        if (guildData.enabled) {
            // Re-schedule all tasks
            guildData.tasks.forEach(task => {
                if (task.enabled) {
                    this.scheduleTask(message.guild.id, task);
                }
            });
        } else {
            // Cancel all timers
            this.cancelAllTasks(message.guild.id);
        }

        const embed = embedFactory.success(
            `${guildData.enabled ? '🟢' : '🔴'} Scheduler ${guildData.enabled ? 'Đã BẬT' : 'Đã TẮT'}!`,
            `Hệ thống Scheduled Tasks đã được **${guildData.enabled ? 'kích hoạt' : 'vô hiệu hóa'}**.`
        );

        if (guildData.enabled && guildData.tasks.length === 0) {
            embed.addFields([{
                name: '⚠️ Lưu ý:',
                value: 'Scheduler đã bật nhưng chưa có task nào.\nThêm task: `!scheduled add <time> <command>`',
                inline: false
            }]);
        }

        if (!isButton) {
            await message.reply({ embeds: [embed] });
        }

        logger.command(message.author, `scheduled ${guildData.enabled ? 'enable' : 'disable'}`, message.guild);
    },

    async showStatus(message) {
        const guildData = this.scheduledData.get(message.guild.id);

        const embed = embedFactory.info(
            '⏰ Scheduled Tasks Status',
            `**Server:** ${message.guild.name}`
        );

        const activeTasks = guildData.tasks.filter(t => t.enabled).length;
        const nextTask = guildData.tasks
            .filter(t => t.enabled && t.nextRun > Date.now())
            .sort((a, b) => a.nextRun - b.nextRun)[0];

        embed.addFields([
            {
                name: '⚙️ Trạng thái hệ thống:',
                value: `**Status:** ${guildData.enabled ? '🟢 Hoạt động' : '🔴 Tắt'}\n**Total Tasks:** ${guildData.tasks.length}\n**Active Tasks:** ${activeTasks}\n**Executed:** ${guildData.stats.executed}`,
                inline: true
            },
            {
                name: '📅 Schedule Types:',
                value: '• One-time tasks\n• Daily recurring\n• Weekly recurring\n• Custom cron expressions',
                inline: true
            },
            {
                name: '🎯 Use Cases:',
                value: '• Automated announcements\n• Regular backups\n• Scheduled events\n• Maintenance tasks',
                inline: true
            }
        ]);

        if (nextTask) {
            const nextRunTime = new Date(nextTask.nextRun).toLocaleString('vi-VN');
            embed.addFields([{
                name: '⏰ Next Task:',
                value: `**Time:** ${nextRunTime}\n**Command:** \`${nextTask.command}\`\n**Type:** ${nextTask.parsedTime.type}`,
                inline: false
            }]);
        }

        await message.reply({ embeds: [embed] });
    },

    async showTimeFormats(message) {
        const embed = embedFactory.help({
            title: '⏰ Time Format Guide',
            description: '**Cách định dạng thời gian cho Scheduled Tasks**\n\nHỗ trợ nhiều format linh hoạt',
            categories: [
                {
                    emoji: '📅',
                    name: 'Specific Date/Time',
                    value: '`"2024-12-25 12:00"` - Ngày giờ cụ thể\n`"25/12/2024 18:30"` - Format VN'
                },
                {
                    emoji: '🔄',
                    name: 'Daily Recurring',
                    value: '`daily_14:30` - Mỗi ngày 14:30\n`everyday_09:00` - Mỗi ngày 09:00'
                },
                {
                    emoji: '📆',
                    name: 'Weekly Recurring',
                    value: '`weekly_monday_09:00` - Thứ 2 hàng tuần\n`weekly_friday_17:00` - Thứ 6 hàng tuần'
                },
                {
                    emoji: '⏱️',
                    name: 'Relative Time',
                    value: '`in_30m` - Sau 30 phút\n`in_2h` - Sau 2 giờ\n`in_1d` - Sau 1 ngày'
                }
            ]
        });

        embed.addFields([
            {
                name: '📝 Ví dụ commands:',
                value: '`!scheduled add "2024-12-25 12:00" "announce Merry Christmas!"`\n`!scheduled add daily_18:00 "membercount"`\n`!scheduled add weekly_monday_09:00 "backup create"`\n`!scheduled add in_1h "ping"`',
                inline: false
            },
            {
                name: '⚠️ Lưu ý:',
                value: '• Thời gian theo múi giờ server\n• Commands tự động thêm prefix `!`\n• Recurring tasks chạy vô hạn\n• One-time tasks tự xóa sau khi chạy',
                inline: false
            }
        ]);

        await message.reply({ embeds: [embed] });
    },

    async showHelp(message) {
        const embed = embedFactory.help({
            title: '⏰ Scheduled Tasks Help',
            description: '**Hệ thống lên lịch chạy commands tự động**\n\nAutomation và scheduling cho Discord bot',
            categories: [
                {
                    emoji: '➕',
                    name: 'Add Task',
                    value: '`!scheduled add <time> <command>` - Lên lịch command'
                },
                {
                    emoji: '➖',
                    name: 'Remove Task',
                    value: '`!scheduled remove <task_id>` - Xóa task'
                },
                {
                    emoji: '📋',
                    name: 'List Tasks',
                    value: '`!scheduled list` - Xem tất cả tasks'
                },
                {
                    emoji: '🔄',
                    name: 'Toggle System',
                    value: '`!scheduled toggle` - Bật/tắt Scheduler'
                },
                {
                    emoji: '🧪',
                    name: 'Test Task',
                    value: '`!scheduled test <task_id>` - Test chạy task'
                }
            ]
        });

        embed.addFields([
            {
                name: '🎯 Use Cases:',
                value: '• Daily announcements\n• Weekly events reminder\n• Regular server maintenance\n• Automated backups\n• Birthday celebrations\n• Meeting notifications',
                inline: true
            },
            {
                name: '✅ Best Practices:',
                value: '• Test commands trước khi schedule\n• Sử dụng recurring cho tasks định kỳ\n• Monitor execution logs\n• Backup scheduler config\n• Set reasonable intervals',
                inline: true
            }
        ]);

        await message.reply({ embeds: [embed] });
    },

    // Helper functions
    parseTimeInput(input) {
        try {
            // Specific date/time: "2024-12-25 12:00" or "25/12/2024 18:30"
            if (input.includes('-') || input.includes('/')) {
                const date = new Date(input);
                if (!isNaN(date.getTime()) && date > new Date()) {
                    return {
                        valid: true,
                        type: 'One-time',
                        nextRun: date.getTime(),
                        recurring: false
                    };
                }
            }

            // Daily recurring: daily_14:30
            if (input.startsWith('daily_') || input.startsWith('everyday_')) {
                const timeStr = input.split('_')[1];
                const [hours, minutes] = timeStr.split(':').map(Number);
                
                const nextRun = new Date();
                nextRun.setHours(hours, minutes, 0, 0);
                if (nextRun <= new Date()) {
                    nextRun.setDate(nextRun.getDate() + 1);
                }

                return {
                    valid: true,
                    type: 'Daily',
                    nextRun: nextRun.getTime(),
                    recurring: true,
                    interval: 24 * 60 * 60 * 1000 // 1 day
                };
            }

            // Weekly recurring: weekly_monday_09:00
            if (input.startsWith('weekly_')) {
                const parts = input.split('_');
                const dayName = parts[1];
                const timeStr = parts[2];
                
                const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
                const targetDay = days.indexOf(dayName.toLowerCase());
                
                if (targetDay === -1) return { valid: false };
                
                const [hours, minutes] = timeStr.split(':').map(Number);
                const nextRun = new Date();
                const currentDay = nextRun.getDay();
                const daysUntilTarget = (targetDay - currentDay + 7) % 7;
                
                nextRun.setDate(nextRun.getDate() + (daysUntilTarget || 7));
                nextRun.setHours(hours, minutes, 0, 0);

                return {
                    valid: true,
                    type: 'Weekly',
                    nextRun: nextRun.getTime(),
                    recurring: true,
                    interval: 7 * 24 * 60 * 60 * 1000 // 1 week
                };
            }

            // Relative time: in_30m, in_2h, in_1d
            if (input.startsWith('in_')) {
                const timeStr = input.substring(3);
                const match = timeStr.match(/^(\d+)([mhd])$/);
                
                if (match) {
                    const value = parseInt(match[1]);
                    const unit = match[2];
                    
                    let milliseconds = 0;
                    switch (unit) {
                        case 'm': milliseconds = value * 60 * 1000; break;
                        case 'h': milliseconds = value * 60 * 60 * 1000; break;
                        case 'd': milliseconds = value * 24 * 60 * 60 * 1000; break;
                    }

                    return {
                        valid: true,
                        type: 'Relative',
                        nextRun: Date.now() + milliseconds,
                        recurring: false
                    };
                }
            }

            return { valid: false };
        } catch (error) {
            return { valid: false };
        }
    },

    scheduleTask(guildId, task) {
        const delay = task.nextRun - Date.now();
        
        if (delay <= 0) {
            // Task should run immediately
            this.executeTask(guildId, task);
            return;
        }

        const timerId = setTimeout(() => {
            this.executeTask(guildId, task);
        }, Math.min(delay, 2147483647)); // Max timeout value

        // Store timer ID
        if (!this.activeTimers.has(guildId)) {
            this.activeTimers.set(guildId, new Map());
        }
        this.activeTimers.get(guildId).set(task.id, timerId);
    },

    async executeTask(guildId, task) {
        try {
            // Get guild and channel
            const guild = client.guilds.cache.get(guildId);
            if (!guild) return;

            const channel = guild.channels.cache.get(task.channelId);
            if (!channel) return;

            // Execute the command (simplified - in real implementation, parse and execute properly)
            await channel.send(`Scheduled task executed: ${task.command}`);

            // Update task stats
            task.runCount++;
            task.lastRun = Date.now();

            const guildData = this.scheduledData.get(guildId);
            guildData.stats.executed++;

            // Reschedule if recurring
            if (task.parsedTime.recurring) {
                task.nextRun = Date.now() + task.parsedTime.interval;
                this.scheduleTask(guildId, task);
            } else {
                // Remove one-time task
                const taskIndex = guildData.tasks.findIndex(t => t.id === task.id);
                if (taskIndex !== -1) {
                    guildData.tasks.splice(taskIndex, 1);
                }
            }

        } catch (error) {
            logger.error('Task execution error', error);
            const guildData = this.scheduledData.get(guildId);
            guildData.stats.failed++;
        }
    },

    cancelTask(guildId, taskId) {
        const guildTimers = this.activeTimers.get(guildId);
        if (guildTimers && guildTimers.has(taskId)) {
            clearTimeout(guildTimers.get(taskId));
            guildTimers.delete(taskId);
        }
    },

    cancelAllTasks(guildId) {
        const guildTimers = this.activeTimers.get(guildId);
        if (guildTimers) {
            guildTimers.forEach(timerId => clearTimeout(timerId));
            guildTimers.clear();
        }
    }
};
