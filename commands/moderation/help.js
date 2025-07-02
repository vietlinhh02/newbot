const { ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType } = require('discord.js');
const productionStyle = require('../../utils/demoStyle');
const logger = require('../../utils/logger');

module.exports = {
    name: 'help',
    description: 'Hiển thị danh sách lệnh hoặc thông tin chi tiết về một lệnh cụ thể',
    aliases: ['h', 'cmd', 'commands'],
    usage: '!help [tên_lệnh | category]',
    category: 'moderation',
    permissions: 'member',
    guildOnly: false,
    examples: [
        '!help',
        '!help ban',
        '!help moderation',
        '!help management'
    ],

    async execute(message, args, client) {
        try {
            // If specific command requested
            if (args.length > 0) {
                const commandName = args[0].toLowerCase();
                
                // Check if it's a category first
                const categories = this.getCategories();
                const category = categories.find(cat => 
                    cat.name.toLowerCase() === commandName || 
                    cat.aliases.includes(commandName)
                );
                
                if (category) {
                    return await this.showCategoryHelp(message, category, client);
                }
                
                // Check if it's a specific command
                const command = client.commands.get(commandName) || 
                    client.commands.find(cmd => cmd.aliases && cmd.aliases.includes(commandName));
                
                if (command) {
                    return await this.showCommandHelp(message, command);
                } else {
                    const result = productionStyle.createErrorEmbed(
                        'Command Not Found',
                        `Không tìm thấy lệnh hoặc category **${commandName}**!`,
                        'Use `!help` to see all available commands'
                    );
                    return message.reply({ 
                        embeds: [result.embed], 
                        files: result.attachments 
                    });
                }
            }
            
            // Show main help menu
            await this.showMainHelp(message, client);
            
        } catch (error) {
            logger.error('Help command error', error);
            
            const result = productionStyle.createErrorEmbed(
                'Help System Error',
                'Đã xảy ra lỗi khi hiển thị help!',
                error.message
            );
            await message.reply({ 
                embeds: [result.embed], 
                files: result.attachments 
            });
        }
    },

    async showMainHelp(message, client) {
        const categories = this.getCategories();
        const stats = {
            'Total Commands': client.commands.size,
            'Categories': categories.length,
            'Bot Ping': `${client.ws.ping}ms`,
            'Uptime': this.formatUptime(client.uptime),
            'Version': 'v2.6.0',
            'Node.js': process.version
        };

        const categoryFields = categories.map(cat => ({
            name: `${cat.emoji} ${cat.name} (${cat.commandCount})`,
            value: `${cat.description}\n\`!help ${cat.name.toLowerCase()}\``,
            inline: true
        }));

        const statsFields = Object.entries(stats).map(([key, value]) => ({
            name: key,
            value: value.toString(),
            inline: true
        }));

        const result = productionStyle.createInfoEmbed(
            'PEANHELP BOT - COMMAND CENTER',
            { tag: 'Advanced Discord Management' },
            message.author,
            '🚀 **Advanced Discord Management System**\n\n💡 **Navigation:** Use buttons below to browse categories\n🔍 **Specific Help:** `!help <command>` for detailed info\n📋 **Category Help:** `!help <category>`',
            [
                ...categoryFields,
                { name: '📊 Bot Statistics', value: '\u200b', inline: false },
                ...statsFields
            ]
        );

        // Create navigation buttons
        const buttons = this.createCategoryButtons();
        const components = [new ActionRowBuilder().addComponents(buttons.slice(0, 5))];
        
        if (buttons.length > 5) {
            components.push(new ActionRowBuilder().addComponents(buttons.slice(5, 10)));
        }

        const reply = await message.reply({ 
            embeds: [result.embed], 
            files: result.attachments,
            components 
        });

        // Handle button interactions
        this.handleNavigation(reply, message, client);
    },

    async showCategoryHelp(message, category, client) {
        const commands = Array.from(client.commands.filter(cmd => 
            cmd.category === category.name.toLowerCase()
        ).values());

        if (commands.length === 0) {
            const result = productionStyle.createWarningEmbed(
                'Empty Category',
                `Category **${category.name}** không có lệnh nào.`,
                [
                    { name: 'Available Categories', value: 'Use `!help` to see all categories' }
                ]
            );
            return message.reply({ 
                embeds: [result.embed], 
                files: result.attachments 
            });
        }

        // Pagination setup
        const commandsPerPage = 8;
        const totalPages = Math.ceil(commands.length / commandsPerPage);
        let currentPage = 0;

        const generateEmbed = (page) => {
            const start = page * commandsPerPage;
            const pageCommands = commands.slice(start, start + commandsPerPage);
            
            const commandFields = pageCommands.map(cmd => ({
                name: `!${cmd.name} ${cmd.aliases ? `(${cmd.aliases.join(', ')})` : ''}`,
                value: `${cmd.description}\n\`${cmd.usage || `!${cmd.name}`}\``,
                inline: false
            }));

            return productionStyle.createInfoEmbed(
                `${category.emoji} ${category.name.toUpperCase()} COMMANDS`,
                { tag: `Page ${page + 1}/${totalPages}` },
                message.author,
                category.description,
                [
                    ...commandFields,
                    { 
                        name: 'Navigation', 
                        value: `**Total Commands:** ${commands.length}\n**Current Page:** ${page + 1}/${totalPages}\n**Need Help?** Use \`!help <command>\` for details`, 
                        inline: false 
                    }
                ]
            );
        };

        const embed = generateEmbed(currentPage);
        const components = this.createPaginationButtons(currentPage, totalPages);

        const reply = await message.reply({ 
            embeds: [embed.embed], 
            files: embed.attachments,
            components: totalPages > 1 ? components : [] 
        });

        if (totalPages > 1) {
            this.handlePagination(reply, message, generateEmbed, totalPages);
        }
    },

    async showCommandHelp(message, command) {
        const fields = [
            { name: 'Description', value: command.description || 'No description provided', inline: false },
            { name: 'Usage', value: `\`${command.usage || `!${command.name}`}\``, inline: true },
            { name: 'Category', value: command.category ? command.category.charAt(0).toUpperCase() + command.category.slice(1) : 'Unknown', inline: true },
            { name: 'Permissions', value: command.permissions ? command.permissions.charAt(0).toUpperCase() + command.permissions.slice(1) : 'Member', inline: true }
        ];

        if (command.aliases && command.aliases.length > 0) {
            fields.push({ 
                name: 'Aliases', 
                value: command.aliases.map(alias => `\`!${alias}\``).join(', '), 
                inline: true 
            });
        }

        if (command.examples && command.examples.length > 0) {
            fields.push({ 
                name: 'Examples', 
                value: command.examples.map(ex => `\`${ex}\``).join('\n'), 
                inline: false 
            });
        }

        // Add additional technical info
        const additionalInfo = [];
        
        if (command.cooldown) {
            additionalInfo.push(`**Cooldown:** \`${command.cooldown}s\``);
        }
        
        if (command.args) {
            additionalInfo.push(`**Required Args:** \`${command.args}\``);
        }

        if (command.guildOnly) {
            additionalInfo.push(`**Server Only:** Yes`);
        }
        
        if (additionalInfo.length > 0) {
            fields.push({
                name: 'Additional Info',
                value: additionalInfo.join('\n'),
                inline: true
            });
        }

        // Related commands - giới hạn hiển thị để tránh embed quá lớn
        const relatedCommands = this.getRelatedCommands(command);
        if (relatedCommands.length > 0) {
            const displayCommands = relatedCommands.slice(0, 8); // Giới hạn 8 lệnh
            const moreText = relatedCommands.length > 8 ? ` *+${relatedCommands.length - 8} khác*` : '';
            
            fields.push({
                name: 'Related Commands',
                value: displayCommands.map(cmd => `\`!${cmd}\``).join(', ') + moreText,
                inline: false
            });
        }

        const result = productionStyle.createInfoEmbed(
            `COMMAND: ${command.name.toUpperCase()}`,
            { tag: 'Command Help' },
            message.author,
            `Detailed information for **!${command.name}**`,
            fields
        );

        await message.reply({ 
            embeds: [result.embed], 
            files: result.attachments 
        });
    },

    getCategories() {
        return [
            {
                name: 'Moderation',
                description: 'Commands for server moderation and user management',
                emoji: '🛡️',
                commandCount: 18,
                aliases: ['mod', 'moderate']
            },
            {
                name: 'Management',
                description: 'Server information and management tools',
                emoji: '📊',
                commandCount: 18,
                aliases: ['manage', 'info']
            },
            {
                name: 'Config',
                description: 'Bot configuration and server settings',
                emoji: '⚙️',
                commandCount: 9,
                aliases: ['configuration', 'settings']
            },
            {
                name: 'Voice',
                description: 'Voice channel management commands',
                emoji: '🎵',
                commandCount: 7,
                aliases: ['vc', 'voice']
            },
            {
                name: 'Security',
                description: 'Advanced security and anti-raid features',
                emoji: '🔒',
                commandCount: 8,
                aliases: ['sec', 'protection']
            },
            {
                name: 'Tickets',
                description: 'Support ticket system with role-based permissions',
                emoji: '🎫',
                commandCount: 1,
                aliases: ['ticket', 'support']
            },
            {
                name: 'Announcement',
                description: 'Message broadcasting and announcement tools',
                emoji: '📢',
                commandCount: 4,
                aliases: ['announce', 'broadcast']
            },
            {
                name: 'Advanced',
                description: 'Advanced analytics, automation and bot features',
                emoji: '🚀',
                commandCount: 10,
                aliases: ['adv', 'automation', 'analytics']
            },
            {
                name: 'Cultivation',
                description: 'Tu luyện RPG system - farm, craft, breakthrough và leaderboard',
                emoji: '⚔️',
                commandCount: 7,
                aliases: ['farm', 'tl', 'rpg', 'cultivation']
            }
        ];
    },

    createCategoryButtons() {
        const categories = this.getCategories();
        return categories.slice(0, 10).map(cat => 
            new ButtonBuilder()
                .setCustomId(`help_${cat.name.toLowerCase()}`)
                .setLabel(`${cat.emoji} ${cat.name}`)
                .setStyle(ButtonStyle.Secondary)
        );
    },

    createPaginationButtons(currentPage, totalPages) {
        const buttons = [];
        
        if (currentPage > 0) {
            buttons.push(
                new ButtonBuilder()
                    .setCustomId('help_prev')
                    .setLabel('◀ Previous')
                    .setStyle(ButtonStyle.Primary)
            );
        }
        
        buttons.push(
            new ButtonBuilder()
                .setCustomId('help_page')
                .setLabel(`${currentPage + 1}/${totalPages}`)
                .setStyle(ButtonStyle.Secondary)
                .setDisabled(true)
        );
        
        if (currentPage < totalPages - 1) {
            buttons.push(
                new ButtonBuilder()
                    .setCustomId('help_next')
                    .setLabel('Next ▶')
                    .setStyle(ButtonStyle.Primary)
            );
        }
        
        return [new ActionRowBuilder().addComponents(buttons)];
    },

    async handleNavigation(reply, message, client) {
        const collector = reply.createMessageComponentCollector({
            componentType: ComponentType.Button,
            time: 300000, // 5 minutes
            filter: i => i.user.id === message.author.id
        });

        collector.on('collect', async interaction => {
            const customId = interaction.customId;
            
            if (customId.startsWith('help_')) {
                const categoryName = customId.replace('help_', '');
                const category = this.getCategories().find(cat => 
                    cat.name.toLowerCase() === categoryName
                );
                
                if (category) {
                    await interaction.deferUpdate();
                    await this.showCategoryHelp(message, category, client);
                }
            }
        });

        collector.on('end', () => {
            reply.edit({ components: [] }).catch(() => {});
        });
    },

    async handlePagination(reply, message, generateEmbed, totalPages) {
        let currentPage = 0;
        
        const collector = reply.createMessageComponentCollector({
            componentType: ComponentType.Button,
            time: 300000,
            filter: i => i.user.id === message.author.id
        });

        collector.on('collect', async interaction => {
            if (interaction.customId === 'help_prev' && currentPage > 0) {
                currentPage--;
            } else if (interaction.customId === 'help_next' && currentPage < totalPages - 1) {
                currentPage++;
            } else {
                return;
            }

            const newEmbed = generateEmbed(currentPage);
            const newComponents = this.createPaginationButtons(currentPage, totalPages);
            
            await interaction.update({
                embeds: [newEmbed.embed],
                files: newEmbed.attachments,
                components: newComponents
            });
        });

        collector.on('end', () => {
            reply.edit({ components: [] }).catch(() => {});
        });
    },

    getRelatedCommands(command) {
        const related = {
            // Moderation commands
            'ban': ['tempban', 'unban', 'kick', 'softban', 'massban'],
            'kick': ['ban', 'warn', 'timeout', 'autokick'],
            'mute': ['unmute', 'timeout', 'vmute'],
            'unmute': ['mute', 'vunmute'],
            'warn': ['warnings', 'clearwarnings', 'ban'],
            'warnings': ['warn', 'clearwarnings'],
            'clearwarnings': ['warn', 'warnings'],
            'lockdown': ['slowmode', 'lockserver'],
            'softban': ['ban', 'unban', 'kick'],
            'tempban': ['ban', 'unban'],
            'unban': ['ban', 'tempban', 'softban'],
            'timeout': ['mute', 'warn', 'kick'],
            'purge': ['clear', 'clearbot'],
            'clear': ['purge', 'clearbot'],
            'clearbot': ['clear', 'purge'],
            'slowmode': ['lockdown', 'lockserver'],
            'checkperms': ['userinfo', 'roleinfo'],
            
            // Management commands  
            'serverinfo': ['userinfo', 'roleinfo', 'channelinfo', 'channellist', 'membercount', 'botinfo'],
            'userinfo': ['serverinfo', 'avatar', 'ping', 'roleinfo'],
            'channellist': ['channelinfo', 'serverinfo'],
            'channelinfo': ['channellist', 'serverinfo'],
            'createrole': ['deleterole', 'addrole', 'roleinfo', 'roles'],
            'deleterole': ['createrole', 'removerole', 'roles'],
            'addrole': ['removerole', 'createrole', 'roleinfo', 'autorole'],
            'removerole': ['addrole', 'roleinfo', 'roles'],
            'roleinfo': ['roles', 'createrole', 'addrole', 'userinfo'],
            'roles': ['roleinfo', 'createrole', 'deleterole'],
            'avatar': ['userinfo'],
            'membercount': ['serverinfo', 'uptime', 'analytics'],
            'uptime': ['botinfo', 'ping', 'membercount'],
            'botinfo': ['uptime', 'ping', 'serverinfo'],
            'ping': ['botinfo', 'uptime'],
            'invites': ['createinvite'],
            'createinvite': ['invites'],
            'emojis': ['serverinfo'],
            
            // Config commands
            'setup': ['setlog', 'setwelcome', 'setleave', 'setmuterole'],
            'setwelcome': ['setleave', 'joinrole', 'botrole'],
            'setleave': ['setwelcome', 'joinrole'],
            'joinrole': ['setwelcome', 'botrole', 'autorole'],
            'botrole': ['joinrole', 'setwelcome'],
            'setlog': ['automod', 'prefix', 'setup'],
            'prefix': ['setlog', 'setup'],
            'automod': ['setlog', 'antispam', 'antiraid'],
            'setmuterole': ['mute', 'unmute', 'setup'],
            
            // Security commands
            'antiraid': ['antispam', 'antialt', 'whitelist', 'lockserver'],
            'antispam': ['antiraid', 'whitelist', 'automod'],
            'antialt': ['whitelist', 'antiraid', 'antispam'],
            'whitelist': ['antialt', 'antiraid', 'antispam'],
            'massban': ['ban', 'antiraid', 'whitelist', 'autoban'],
            'lockserver': ['unlockserver', 'antiraid', 'lockdown'],
            'unlockserver': ['lockserver', 'antiraid'],
            'nuke': ['lockserver', 'antiraid'],
            
            // Voice commands
            'vmute': ['vunmute', 'mute'],
            'vunmute': ['vmute', 'unmute'],
            'deafen': ['undeafen'],
            'undeafen': ['deafen'],
            'move': ['moveall', 'disconnect'],
            'moveall': ['move', 'disconnect'],
            'disconnect': ['move', 'moveall'],
            
            // Announcement commands
            'announce': ['broadcast', 'embed', 'dm'],
            'broadcast': ['announce', 'embed', 'dm'],
            'embed': ['announce', 'broadcast'],
            'dm': ['announce', 'broadcast'],
            
            // Advanced commands
            'analytics': ['engagement', 'growth', 'topchannels', 'toptimes', 'membercount'],
            'engagement': ['analytics', 'growth', 'topchannels'],
            'growth': ['analytics', 'engagement', 'membercount'],
            'topchannels': ['analytics', 'toptimes', 'channellist'],
            'toptimes': ['analytics', 'topchannels'],
            'autorole': ['autoban', 'autokick', 'joinrole', 'addrole'],
            'autoban': ['autorole', 'ban', 'massban'],
            'autokick': ['autorole', 'kick'],
            'scheduled': ['backup', 'analytics'],
            'backup': ['scheduled'],
            
            // Ticket commands
            'ticket': ['setup'],
            
            // Cultivation commands
            'farm': ['inv', 'level', 'leaderboard'],
            'inventory': ['farm', 'craft', 'level'],
            'craft': ['farm', 'inv'],
            'level': ['farm', 'breakthrough', 'leaderboard'],
            'breakthrough': ['level', 'farm', 'inv'],
            'leaderboard': ['level', 'farm']
        };
        
        return related[command.name] || [];
    },

    formatUptime(uptime) {
        const seconds = Math.floor(uptime / 1000);
        const days = Math.floor(seconds / 86400);
        const hours = Math.floor((seconds % 86400) / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        
        if (days > 0) return `${days}d ${hours}h ${minutes}m`;
        if (hours > 0) return `${hours}h ${minutes}m`;
        return `${minutes}m`;
    }
}; 