const { EmbedBuilder, Colors } = require('discord.js');

// Modern icon sets - using beautiful Unicode emojis and symbols
const ICONS = {
    // Status and feedback icons
    SUCCESS: '✨', // Beautiful sparkle instead of basic checkmark
    ERROR: '💥', // More dramatic than basic X
    WARNING: '⚠️',
    INFO: '💡', // Light bulb for information
    LOADING: '⏳',
    
    // Action icons
    BAN: '🔨',
    KICK: '👢',
    MUTE: '🔇',
    UNMUTE: '🔊',
    TIMEOUT: '⏰',
    WARN: '📢',
    CLEAR: '🧹',
    LOCK: '🔐',
    UNLOCK: '🔓',
    
    // Management icons
    USER: '👤',
    ADMIN: '👑',
    MODERATOR: '🛡️',
    HELPER: '🤝',
    BOT: '🤖',
    OWNER: '👑',
    
    // Channel and server icons
    SERVER: '🏰',
    CHANNEL: '📝',
    VOICE: '🎤',
    CATEGORY: '📁',
    ROLE: '🎭',
    
    // System icons
    STATS: '📊',
    SETTINGS: '⚙️',
    SECURITY: '🛡️',
    BACKUP: '💾',
    ANALYTICS: '📈',
    
    // Special effects
    STAR: '⭐',
    DIAMOND: '💎',
    FIRE: '🔥',
    ROCKET: '🚀',
    MAGIC: '✨',
    
    // Utility icons
    TIME: '🕐',
    CALENDAR: '📅',
    LOCATION: '📍',
    LINK: '🔗',
    SEARCH: '🔍',
    BOOK: '📖',
    
    // Status indicators
    ONLINE: '🟢',
    OFFLINE: '⚫',
    IDLE: '🟡',
    DND: '🔴',
    
    // Reaction icons
    THUMBS_UP: '👍',
    THUMBS_DOWN: '👎',
    HEART: '❤️',
    LAUGH: '😂',
    
    // Special categories
    TICKET: '🎫',
    ANNOUNCEMENT: '📢',
    VOICE_CHANNEL: '🎵',
    PREMIUM: '💎'
};

// Enhanced color themes with gradients effect
const THEMES = {
    SUCCESS: { 
        color: '#00ff88', // Bright green
        emoji: ICONS.SUCCESS, 
        accent: ICONS.ONLINE,
        description: 'Thành công'
    },
    ERROR: { 
        color: '#ff4757', // Bright red
        emoji: ICONS.ERROR, 
        accent: ICONS.OFFLINE,
        description: 'Lỗi'
    },
    WARNING: { 
        color: '#ffa726', // Orange
        emoji: ICONS.WARNING, 
        accent: ICONS.IDLE,
        description: 'Cảnh báo'
    },
    INFO: { 
        color: '#5dade2', // Light blue
        emoji: ICONS.INFO, 
        accent: ICONS.ONLINE,
        description: 'Thông tin'
    },
    HELP: { 
        color: '#a29bfe', // Purple
        emoji: ICONS.BOOK, 
        accent: ICONS.STAR,
        description: 'Trợ giúp'
    },
    MODERATION: { 
        color: '#ff6b6b', // Red-orange
        emoji: ICONS.MODERATOR, 
        accent: ICONS.FIRE,
        description: 'Kiểm duyệt'
    },
    MANAGEMENT: { 
        color: '#4834d4', // Deep purple
        emoji: ICONS.STATS, 
        accent: ICONS.DIAMOND,
        description: 'Quản lý'
    },
    CONFIG: { 
        color: '#686de0', // Blue-purple
        emoji: ICONS.SETTINGS, 
        accent: ICONS.STAR,
        description: 'Cài đặt'
    },
    VOICE: { 
        color: '#30e3ca', // Aqua
        emoji: ICONS.VOICE, 
        accent: ICONS.MAGIC,
        description: 'Voice'
    },
    SECURITY: { 
        color: '#eb4d4b', // Dark red
        emoji: ICONS.SECURITY, 
        accent: ICONS.FIRE,
        description: 'Bảo mật'
    },
    TICKETS: { 
        color: '#f9ca24', // Gold
        emoji: ICONS.TICKET, 
        accent: ICONS.STAR,
        description: 'Ticket'
    },
    ANNOUNCEMENT: { 
        color: '#e056fd', // Magenta
        emoji: ICONS.ANNOUNCEMENT, 
        accent: ICONS.ROCKET,
        description: 'Thông báo'
    },
    ADVANCED: {
        color: '#00d2d3', // Cyan
        emoji: ICONS.ROCKET,
        accent: ICONS.MAGIC,
        description: 'Nâng cao'
    }
};

class EmbedFactory {
    constructor() {
        this.defaultFooter = {
            text: '✨ PeanHelp Bot • Modern Discord Management',
            iconURL: null
        };
        this.brandColor = '#5865f2'; // Discord brand color
    }

    /**
     * Set bot client for default footer icon
     */
    setClient(client) {
        if (client?.user?.displayAvatarURL) {
            this.defaultFooter.iconURL = client.user.displayAvatarURL();
        }
    }

    /**
     * Create enhanced base embed with modern styling
     */
    createBase(theme = 'INFO', author = null) {
        const themeConfig = THEMES[theme] || THEMES.INFO;
        
        const embed = new EmbedBuilder()
            .setColor(themeConfig.color)
            .setTimestamp()
            .setFooter({
                text: this.defaultFooter.text,
                iconURL: this.defaultFooter.iconURL
            });

        if (author) {
            embed.setAuthor({ 
                name: `${author.tag}`,
                iconURL: author.displayAvatarURL({ dynamic: true }),
                url: null
            });
        }
        
        return embed;
    }

    /**
     * Enhanced success embed with beautiful styling
     */
    success(title, description, fields = [], author = null) {
        const embed = this.createBase('SUCCESS', author)
            .setTitle(`${THEMES.SUCCESS.emoji} ${title}`)
            .setDescription(`${ICONS.ONLINE} **${description}**`);
        
        if (fields.length > 0) {
            embed.addFields(fields);
        }
        
        return embed;
    }

    /**
     * Enhanced error embed
     */
    error(title, description, details = null, author = null) {
        const embed = this.createBase('ERROR', author)
            .setTitle(`${THEMES.ERROR.emoji} ${title}`)
            .setDescription(`${ICONS.OFFLINE} **${description}**`);
        
        if (details) {
            embed.addFields([{
                name: `${ICONS.SEARCH} Chi tiết lỗi:`,
                value: `\`\`\`js\n${details}\`\`\``,
                inline: false
            }]);
        }
        
        return embed;
    }

    /**
     * Enhanced warning embed
     */
    warning(title, description, fields = [], author = null) {
        const embed = this.createBase('WARNING', author)
            .setTitle(`${THEMES.WARNING.emoji} ${title}`)
            .setDescription(`${ICONS.IDLE} **${description}**`);
        
        if (fields.length > 0) {
            embed.addFields(fields);
        }
        
        return embed;
    }

    /**
     * Enhanced info embed
     */
    info(title, description, fields = [], author = null) {
        const embed = this.createBase('INFO', author)
            .setTitle(`${THEMES.INFO.emoji} ${title}`)
            .setDescription(`${ICONS.STAR} **${description}**`);
        
        if (fields.length > 0) {
            embed.addFields(fields);
        }
        
        return embed;
    }

    /**
     * Modern help embed with enhanced styling
     */
    help(data, author = null) {
        const { title, description, categories = [], stats = {}, footer = null } = data;
        
        const embed = this.createBase('HELP', author)
            .setTitle(`${THEMES.HELP.emoji} ${title}`)
            .setDescription(`${ICONS.ROCKET} ${description}`);
        
        // Add categories with beautiful icons
        categories.forEach(category => {
            embed.addFields([{
                name: `${category.emoji || ICONS.STAR} ${category.name}`,
                value: `${ICONS.DIAMOND} ${category.value}`,
                inline: category.inline || false
            }]);
        });
        
        // Enhanced statistics section
        if (Object.keys(stats).length > 0) {
            const statsText = Object.entries(stats)
                .map(([key, value]) => `${ICONS.STAR} **${key}:** \`${value}\``)
                .join('\n');
            
            embed.addFields([{
                name: `${ICONS.STATS} System Statistics:`,
                value: statsText,
                inline: true
            }]);
        }
        
        if (footer) {
            embed.setFooter(footer);
        }
        
        return embed;
    }

    /**
     * Enhanced command help embed
     */
    commandHelp(command, author = null) {
        const categoryIcon = this.getCommandIcon(command.category);
        const permissionIcon = this.getPermissionIcon(command.permissions);
        
        const embed = this.createBase('HELP', author)
            .setTitle(`${categoryIcon} \`${command.name}\``)
            .setDescription(`${ICONS.INFO} ${command.description || 'Không có mô tả'}`);
        
        // Enhanced usage field
        embed.addFields([{
            name: `${ICONS.BOOK} Cú pháp:`,
            value: `\`\`\`css\n${command.usage || `!${command.name}`}\`\`\``,
            inline: false
        }]);
        
        // Beautiful technical details
        const technicalDetails = [];
        
        if (command.aliases?.length) {
            technicalDetails.push(`${ICONS.LINK} **Aliases:** \`${command.aliases.join('`, `')}\``);
        }
        
        technicalDetails.push(`${permissionIcon} **Quyền:** \`${command.permissions || 'member'}\``);
        technicalDetails.push(`${categoryIcon} **Danh mục:** \`${command.category || 'utility'}\``);
        technicalDetails.push(`${ICONS.SERVER} **Guild Only:** \`${command.guildOnly ? 'Có' : 'Không'}\``);
        
        embed.addFields([{
            name: `${ICONS.SETTINGS} Thông số kỹ thuật:`,
            value: technicalDetails.join('\n'),
            inline: true
        }]);
        
        // Enhanced examples
        if (command.examples?.length) {
            const exampleText = command.examples
                .map((ex, i) => `${ICONS.STAR} **${i + 1}.** \`${ex}\``)
                .join('\n');
            
            embed.addFields([{
                name: `${ICONS.MAGIC} Ví dụ:`,
                value: exampleText,
                inline: false
            }]);
        }
        
        return embed;
    }

    /**
     * Enhanced category help for pagination
     */
    categoryHelp(category, commands, pageInfo, author = null) {
        const themeKey = category.name.toUpperCase().replace(/\s+/g, '_');
        const theme = THEMES[themeKey] || 'INFO';
        
        const embed = this.createBase(themeKey, author)
            .setTitle(`${category.emoji} ${category.name}`)
            .setDescription(`${ICONS.DIAMOND} ${category.description}\n\n${ICONS.STATS} **Commands:** \`${commands.length}\` | ${ICONS.BOOK} **Trang:** \`${pageInfo.current}/${pageInfo.total}\``);
        
        // Enhanced command listing
        const commandChunks = this.chunkArray(commands, 8);
        
        commandChunks.forEach((chunk, index) => {
            const fieldName = index === 0 ? `${ICONS.ROCKET} Lệnh có sẵn:` : `${ICONS.ROCKET} Lệnh (tiếp):`;
            const commandList = chunk.map(cmd => {
                const icon = this.getPermissionIcon(cmd.permissions);
                const aliases = cmd.aliases?.length ? ` (\`${cmd.aliases[0]}\`)` : '';
                const status = ICONS.ONLINE;
                return `${status} ${icon} **\`!${cmd.name}\`**${aliases}\n${ICONS.STAR} ${this.truncateText(cmd.description, 65)}`;
            }).join('\n\n');
            
            embed.addFields([{
                name: fieldName,
                value: commandList || 'Không có lệnh',
                inline: false
            }]);
        });
        
        return embed;
    }

    /**
     * Enhanced moderation action embed
     */
    moderation(data, author = null) {
        const { action, targetUser, moderator, reason, channel, duration, fields = [] } = data;
        
        // Get appropriate action icon
        const actionIcon = this.getModerationIcon(action);
        
        const embed = this.createBase('MODERATION', author)
            .setTitle(`${actionIcon} ${action}`)
            .setDescription([
                `${ICONS.USER} **Đối tượng:** ${targetUser ? `${targetUser.tag} (\`${targetUser.id}\`)` : 'N/A'}`,
                `${ICONS.MODERATOR} **Người thực hiện:** ${moderator.tag} (\`${moderator.id}\`)`,
                `${ICONS.BOOK} **Lý do:** ${reason}`
            ].join('\n'));
        
        // Enhanced context section
        embed.addFields([{
            name: `${ICONS.LOCATION} Bối cảnh:`,
            value: [
                `${ICONS.CHANNEL} **Kênh:** ${channel}`,
                `${ICONS.TIME} **Thời gian:** <t:${Math.floor(Date.now() / 1000)}:F>`
            ].join('\n'),
                    inline: true
        }]);
        
        if (duration) {
            embed.addFields([{
                name: `${ICONS.CALENDAR} Thời hạn:`,
                value: `${ICONS.TIME} ${duration}`,
                inline: true
            }]);
        }
        
        if (fields.length > 0) {
            embed.addFields(fields);
        }
        
        return embed;
    }

    /**
     * Get moderation action icon
     */
    getModerationIcon(action) {
        const actionIcons = {
            'BAN': ICONS.BAN,
            'KICK': ICONS.KICK,
            'MUTE': ICONS.MUTE,
            'UNMUTE': ICONS.UNMUTE,
            'TIMEOUT': ICONS.TIMEOUT,
            'WARN': ICONS.WARN,
            'CLEAR': ICONS.CLEAR,
            'LOCK': ICONS.LOCK,
            'UNLOCK': ICONS.UNLOCK
        };
        return actionIcons[action.toUpperCase()] || ICONS.MODERATOR;
    }

    /**
     * Enhanced command icon mapping
     */
    getCommandIcon(category) {
        const icons = {
            'moderation': ICONS.MODERATOR,
            'management': ICONS.STATS,
            'config': ICONS.SETTINGS,
            'voice': ICONS.VOICE,
            'security': ICONS.SECURITY,
            'tickets': ICONS.TICKET,
            'announcement': ICONS.ANNOUNCEMENT,
            'advanced': ICONS.ROCKET,
            'utility': ICONS.STAR
        };
        return icons[category] || ICONS.STAR;
    }

    /**
     * Enhanced permission icon mapping
     */
    getPermissionIcon(permission) {
        const icons = {
            'owner': ICONS.OWNER,
            'admin': ICONS.ADMIN,
            'helper': ICONS.HELPER,
            'member': ICONS.USER,
            'moderator': ICONS.MODERATOR
        };
        return icons[permission] || ICONS.USER;
    }

    /**
     * Enhanced text truncation
     */
    truncateText(text, maxLength) {
        if (!text) return 'Không có mô tả';
        return text.length > maxLength ? text.substring(0, maxLength) + '...' : text;
    }

    /**
     * Utility function to chunk arrays
     */
    chunkArray(array, chunkSize) {
        const chunks = [];
        for (let i = 0; i < array.length; i += chunkSize) {
            chunks.push(array.slice(i, i + chunkSize));
        }
        return chunks;
    }

    /**
     * Enhanced system info embed
     */
    systemInfo(client, stats = {}, author = null) {
        const embed = this.createBase('INFO', author)
            .setTitle(`${ICONS.SERVER} System Information`)
            .setThumbnail(client.user.displayAvatarURL({ dynamic: true }))
            .setDescription(`${ICONS.ROCKET} **${client.user.tag}** - Advanced Discord Management Bot`);
        
        // Enhanced basic stats
        embed.addFields([
            {
                name: `${ICONS.STATS} Thống kê:`,
                value: [
                    `${ICONS.SERVER} **Servers:** \`${client.guilds.cache.size}\``,
                    `${ICONS.USER} **Users:** \`${client.guilds.cache.reduce((acc, guild) => acc + guild.memberCount, 0).toLocaleString()}\``,
                    `${ICONS.BOOK} **Commands:** \`${client.commands?.size || 0}\``
                ].join('\n'),
                inline: true
            },
            {
                name: `${ICONS.ROCKET} Hiệu suất:`,
                value: [
                    `${ICONS.MAGIC} **Ping:** \`${client.ws.ping}ms\``,
                    `${ICONS.TIME} **Uptime:** <t:${Math.floor((Date.now() - client.uptime) / 1000)}:R>`,
                    `${ICONS.STATS} **Memory:** \`${(process.memoryUsage().heapUsed / 1024 / 1024).toFixed(1)}MB\``
                ].join('\n'),
                inline: true
            },
            {
                name: `${ICONS.SETTINGS} Kỹ thuật:`,
                value: [
                    `${ICONS.STAR} **Node.js:** \`${process.version}\``,
                    `${ICONS.DIAMOND} **Discord.js:** \`${require('discord.js').version}\``,
                    `${ICONS.SERVER} **Platform:** \`${process.platform}\``
                ].join('\n'),
                inline: true
            }
        ]);
        
        return embed;
    }

    /**
     * Create server info embed with beautiful design
     */
    serverInfo(guild, author = null) {
        const embed = this.createBase('MANAGEMENT', author)
            .setTitle(`${ICONS.SERVER} ${guild.name}`)
            .setThumbnail(guild.iconURL({ dynamic: true, size: 256 }))
            .setDescription(`${ICONS.DIAMOND} **Server Information Dashboard**`);

        // Enhanced server stats
        const totalMembers = guild.memberCount;
        const bots = guild.members.cache.filter(m => m.user.bot).size;
        const humans = totalMembers - bots;
        
        embed.addFields([
            {
                name: `${ICONS.STATS} Thông tin chung`,
                value: [
                    `${ICONS.STAR} **Tên:** ${guild.name}`,
                    `${ICONS.SEARCH} **ID:** \`${guild.id}\``,
                    `${ICONS.OWNER} **Chủ sở hữu:** <@${guild.ownerId}>`,
                    `${ICONS.CALENDAR} **Tạo lúc:** <t:${Math.floor(guild.createdTimestamp / 1000)}:F>`
                ].join('\n'),
                inline: false
            },
            {
                name: `${ICONS.USER} Thành viên`,
                value: [
                    `${ICONS.STATS} **Tổng:** \`${totalMembers.toLocaleString()}\``,
                    `${ICONS.USER} **Người:** \`${humans.toLocaleString()}\``,
                    `${ICONS.BOT} **Bot:** \`${bots.toLocaleString()}\``,
                    `${ICONS.ONLINE} **Online:** \`${guild.members.cache.filter(m => m.presence?.status !== 'offline').size}\``
                ].join('\n'),
                inline: true
            },
            {
                name: `${ICONS.CHANNEL} Kênh`,
                value: [
                    `${ICONS.STATS} **Tổng:** \`${guild.channels.cache.size}\``,
                    `${ICONS.CHANNEL} **Text:** \`${guild.channels.cache.filter(c => c.type === 0).size}\``,
                    `${ICONS.VOICE} **Voice:** \`${guild.channels.cache.filter(c => c.type === 2).size}\``,
                    `${ICONS.CATEGORY} **Category:** \`${guild.channels.cache.filter(c => c.type === 4).size}\``
                ].join('\n'),
                inline: true
            }
        ]);

        // Add boost info if available
        if (guild.premiumSubscriptionCount > 0) {
            embed.addFields([{
                name: `${ICONS.PREMIUM} Nitro Boost`,
                value: [
                    `${ICONS.STAR} **Level:** \`${guild.premiumTier}\``,
                    `${ICONS.ROCKET} **Boost:** \`${guild.premiumSubscriptionCount}\``,
                    `${ICONS.DIAMOND} **Booster:** \`${guild.members.cache.filter(m => m.premiumSince).size}\``
                ].join('\n'),
                inline: true
            }]);
        }

        // Add banner if exists
        if (guild.bannerURL()) {
            embed.setImage(guild.bannerURL({ dynamic: true, size: 1024 }));
        }

        return embed;
    }

    /**
     * Enhanced welcome embed for new members
     */
    welcome(data, author = null) {
        const { user, guild, memberCount, joinedAt, message = null } = data;
        
        const embed = this.createBase('SUCCESS', author)
            .setTitle(`${ICONS.STAR} Welcome to ${guild.name}!`)
            .setThumbnail(user.displayAvatarURL({ dynamic: true, size: 256 }));
            
        if (message) {
            embed.setDescription(`${ICONS.ROCKET} ${message}`);
        } else {
            embed.setDescription(`${ICONS.ROCKET} **Chào mừng ${user.username} đến với server!**`);
        }

        // Enhanced member info
        embed.addFields([
            {
                name: `${ICONS.USER} Thông tin thành viên`,
                value: [
                    `${ICONS.STAR} **Tên:** ${user.tag}`,
                    `${ICONS.SEARCH} **ID:** \`${user.id}\``,
                    `${ICONS.CALENDAR} **Tài khoản tạo:** <t:${Math.floor(user.createdTimestamp / 1000)}:R>`,
                    `${ICONS.TIME} **Gia nhập:** <t:${Math.floor(joinedAt / 1000)}:F>`
                ].join('\n'),
                inline: true
            },
            {
                name: `${ICONS.STATS} Server Statistics`,
                value: [
                    `${ICONS.SERVER} **Server:** ${guild.name}`,
                    `${ICONS.USER} **Thành viên thứ:** \`#${memberCount.toLocaleString()}\``,
                    `${ICONS.ONLINE} **Tổng thành viên:** \`${memberCount.toLocaleString()}\``,
                    `${ICONS.STAR} **Chào mừng!** 🎉`
                ].join('\n'),
                inline: true
            }
        ]);

        // Add server icon if available
        if (guild.iconURL()) {
            embed.setFooter({
                text: `${this.defaultFooter.text} • Welcome to ${guild.name}`,
                iconURL: guild.iconURL({ dynamic: true })
            });
        }
        
        return embed;
    }
}

// Export singleton instance
module.exports = new EmbedFactory(); 