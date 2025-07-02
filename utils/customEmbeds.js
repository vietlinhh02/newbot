const { EmbedBuilder } = require('discord.js');
const { iconManager } = require('./iconManager');

// Custom Emoji Mapping (auto-generated from upload script)
const CUSTOM_EMOJI_MAP = {
    'BAKA': '<:phongungbang_baka:1387763776996245516>',
    'CAREFREE': '<:phongungbang_carefree:1387763784285683734>',
    'CAT_SIP': '<:phongungbang_cat_sip:1387763791436976201>',
    'DIRTY_LAUGH': '<:phongungbang_dirty_laugh:1387763799469068321>',
    'EH': '<:phongungbang_eh:1387763806985388092>',
    'GOJO_BYE': '<:phongungbang_gojo_bye:1387763814497386516>',
    'HAPPI_CRI': '<:phongungbang_happi_cri:1387763821501747220>',
    'HAPPY_SMILE': '<:phongungbang_happy_smile:1387763829110472846>',
    'HEHE': '<:phongungbang_hehe:1387763836773466122>',
    'HELLO_POLICE': '<:phongungbang_hello_police:1387763844088074273>',
    'THINKING_FACE': '<:phongungbang_thinking_face:1387763851675701410>',
    'HMMP': '<:phongungbang_hmmp:1387763858738774077>',
    'HMP': '<:phongungbang_hmp:1387763865814827090>',
    'HUH': '<:phongungbang_huh:1387763873171640370>',
    'JERRY_MEME': '<:phongungbang_jerry_meme:1387763880671051899>',
    'APPROVE': '<:phongungbang_approve:1387763888153694229>',
    'NOSEBLEED': '<:phongungbang_nosebleed:1387763895439196180>',
    'NYAA': '<:phongungbang_nyaa:1387763903735271465>',
    'OK': '<:phongungbang_ok:1387763910714851339>',
    'OMOSHIROI': '<:phongungbang_omoshiroi:1387763918746816543>',
    'PANIK': '<:phongungbang_panik:1387763926342565970>',
    'PHEW': '<:phongungbang_phew:1387763933116502171>',
    'PURPLEBUTTERFLIES': '<:phongungbang_purplebutterflies:1387763940125184163>',
    'PURPLEHEART': '<:phongungbang_purpleheart:1387763947196780614>',
    'RAM_GLARE': '<:phongungbang_ram_glare:1387763953907667025>',
    'RAM_SIP': '<:phongungbang_ram_sip:1387772691108597781>',
    'PAT_HEAD': '<:phongungbang_pat_head:1387772698285052006>',
    'SHTAP': '<:phongungbang_shtap:1387772705155059762>',
    'SUS': '<:phongungbang_sus:1387772712075788371>',
    'TAKELOVE': '<:phongungbang_takelove:1387772719713615893>',
    'TATAKAE': '<:phongungbang_tatakae:1387772726617444362>',
    'TOMIOKAHI': '<:phongungbang_tomiokahi:1387772733668200549>',
    'ANGRY_FACE': '<:phongungbang_angry_face:1387772740584607754>',
    'HAPPY_FACE': '<:phongungbang_happy_face:1387772747685564609>',
    'LITTLE_MAD': '<:phongungbang_little_mad:1387772754844975196>',
    'URNOTALIVE': '<:phongungbang_urnotalive:1387772761723633875>',
    'VICTOR_GLARE': '<:phongungbang_victor_glare:1387772769005080751>',
    'WHAAA': '<:phongungbang_whaaa:1387772775891992698>',
};

// Field icon types
const FIELD_ICONS = {
    INFO: 'INFO',
    SUCCESS: 'OK', 
    WARNING: 'WARN',
    ERROR: 'ERROR',
    USER: 'USER',
    TIME: 'TIME',
    REASON: 'REASON',
    ACTION: 'ACTION',
    STATS: 'STATS',
    DURATION: 'DURATION'
};

// Get custom emoji with fallback
function getCustomEmoji(iconType, fallback = '') {
    // Try to get from custom emoji map first
    if (CUSTOM_EMOJI_MAP[iconType]) {
        return CUSTOM_EMOJI_MAP[iconType];
    }
    
    // Map field icon types to available custom emoji
    const fieldIconMapping = {
        'INFO': 'THINKING_FACE',     // ℹ️ → thinking face
        'WARNING': 'HELLO_POLICE',   // ⚠️ → police
        'WARN': 'HELLO_POLICE',      // ⚠️ → police
        'ERROR': 'PANIK',            // ❌ → panic face
        'SUCCESS': 'OK',             // ✅ → OK emoji
        'USER': 'APPROVE',           // 👤 → approve face
        'TIME': 'RAM_SIP',           // ⏰ → ram sip (mới)
        'REASON': 'TOMIOKAHI',       // 📝 → tomiokahi (mới)
        'ACTION': 'TATAKAE',         // ⚡ → tatakae (mới)
        'STATS': 'OMOSHIROI',        // 📊 → interesting
        'DURATION': 'RAM_SIP',       // ⏱️ → ram sip (mới)
        'CHANNEL': 'NYAA',           // # → nyaa
        'SERVER': 'PURPLEHEART',     // 🏠 → purple heart
        'MODERATOR': 'VICTOR_GLARE', // 🛡️ → victor glare (mới)
        'ADMIN': 'TAKELOVE',         // 👑 → takelove (mới)
        'DM': 'PAT_HEAD',            // 💌 → pat head (mới)
        'COUNT': 'ANGRY_FACE',       // 🔢 → angry face (mới)
        'BAN': 'ANGRY_FACE',         // 🔨 → angry face (mới)
        'KICK': 'LITTLE_MAD',        // 👢 → little mad (mới)
        'MUTE': 'SHTAP',             // 🔇 → shtap (mới)
        'TIMEOUT': 'EH',             // ⏳ → eh
        'CLEAR': 'HAPPY_FACE'        // 🧹 → happy face (mới)
    };
    
    // Try field icon mapping
    const mappedIcon = fieldIconMapping[iconType];
    if (mappedIcon && CUSTOM_EMOJI_MAP[mappedIcon]) {
        return CUSTOM_EMOJI_MAP[mappedIcon];
    }
    
    // Fallback mapping for common icons (Unicode emoji)
    const fallbackMap = {
        'INFO': 'ℹ️',
        'OK': '✅', 
        'WARN': '⚠️',
        'ERROR': '❌',
        'USER': '👤',
        'TIME': '⏰',
        'REASON': '📝',
        'ACTION': '⚡',
        'STATS': '📊',
        'DURATION': '⏱️'
    };
    
    return fallbackMap[iconType] || fallback;
}

// Modern color themes
const THEMES = {
    SUCCESS: { color: '#00ff88', emoji: 'SUCCESS', thumbnail: 'HAPPY' },
    ERROR: { color: '#ff4757', emoji: 'ERROR', thumbnail: 'ANGRY' },
    WARNING: { color: '#ffa726', emoji: 'WARNING', thumbnail: 'THINK' },
    INFO: { color: '#3742fa', emoji: 'INFO', thumbnail: 'STAR' },
    MODERATION: { color: '#ff6b6b', emoji: 'BAN', thumbnail: 'MODERATOR' },
    MANAGEMENT: { color: '#4834d4', emoji: 'STATS', thumbnail: 'ADMIN' },
    CONFIG: { color: '#686de0', emoji: 'SERVER', thumbnail: 'DIAMOND' },
    HELP: { color: '#00d2d3', emoji: 'HELP', thumbnail: 'ROCKET' }
};

// Enhanced Embed Themes with thumbnail support (FIXED ICON NAMES)
const EMBED_THEMES = {
    SUCCESS: {
        color: 0x00ff00,
        authorIcon: 'tomioka_happy',      // ✅ Fixed: tomioka_happy.png → tomioka_happy
        thumbnail: 'menhara_approve'      // ✅ Fixed: Menhara_approve.png → menhara_approve
    },
    ERROR: {
        color: 0xff0000,
        authorIcon: 'tomioka_angry',      // ✅ Fixed: tomioka_angry.png → tomioka_angry
        thumbnail: 'victorglare'          // ✅ Fixed: VictorGlare.png → victorglare
    },
    WARNING: {
        color: 0xffaa00,
        authorIcon: 'tomioka_little_mad', // ✅ Fixed: tomioka_little_mad.png → tomioka_little_mad
        thumbnail: 'hellopolice'          // ✅ Fixed: HelloPolice.png → hellopolice
    },
    INFO: {
        color: 0x0099ff,
        authorIcon: 'hmmmnaruhudowakaranai', // ✅ Fixed: hmmmNaruhudoWakaranai.png → hmmmnaruhudowakaranai
        thumbnail: 'cat_sip'              // ✅ Fixed: cat_sip.png → cat_sip
    },
    MODERATION: {
        color: 0xff6b6b,
        authorIcon: 'hellopolice',        // ✅ Fixed: HelloPolice.png → hellopolice
        thumbnail: 'victorglare'          // ✅ Fixed: VictorGlare.png → victorglare
    },
    PUNISHMENT: {
        color: 0x8b0000,
        authorIcon: 'tomioka_angry',      // ✅ Fixed: tomioka_angry.png → tomioka_angry
        thumbnail: 'zt_gun'               // ✅ Fixed: zt_gun.png → zt_gun
    }
};

class CustomEmbedFactory {
    constructor() {
        this.defaultFooter = {
            text: 'Phong Ưng Bang Bot • Modern Discord Management',
            iconURL: null
        };
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
     * Add custom icon to field name (USE CUSTOM EMOJI NOW!)
     */
    addFieldIcon(fieldName, iconKey) {
        if (!iconKey) return fieldName;
        
        // Use custom emoji instead of text labels
        const icon = getCustomEmoji(iconKey);
        return icon ? `${icon} ${fieldName}` : fieldName;
    }

    /**
     * Create rich embed with multiple icons
     */
    createRichEmbed(options = {}) {
        const {
            theme = 'INFO',
            title,
            description,
            authorIcon = null,
            thumbnailIcon = null,
            fields = [],
            author = null
        } = options;

        const themeConfig = EMBED_THEMES[theme] || EMBED_THEMES.INFO;
        
        const embed = new EmbedBuilder()
            .setColor(themeConfig.color)
            .setTitle(title)
            .setTimestamp()
            .setFooter({
                text: this.defaultFooter.text,
                iconURL: this.defaultFooter.iconURL
            });

        // Add author with custom icon  
        if (themeConfig.authorIcon) {
            embed.setAuthor({
                name: options.authorName || 'Phong Ưng Bang Moderation System',
                icon_url: `attachment://${themeConfig.authorIcon}`
            });
        }

        // Add description
        if (description) {
            embed.setDescription(description);
        }

        // ALWAYS add thumbnail for visual appeal with correct URL format
        if (themeConfig.thumbnail && iconManager.hasIcon(themeConfig.thumbnail)) {
            const thumbnailIcon = iconManager.getIcon(themeConfig.thumbnail);
            if (thumbnailIcon) {
                embed.setThumbnail(`attachment://${thumbnailIcon.name}`);
            }
        }

        // Add fields with custom emoji icons
        if (fields.length > 0) {
            const processedFields = fields.map(field => ({
                name: this.addFieldIcon(field.name, field.icon),
                value: field.value,
                inline: field.inline || false
            }));
            embed.addFields(processedFields);
        }

        return embed;
    }

    /**
     * Modern success embed with clean design
     */
    success(title, description, fields = [], author = null) {
        // Clean modern description
        const enhancedDescription = description ? [
            '```diff',
            '+ SUCCESS: Operation completed successfully',
            '```',
            '',
            `**✨ ${description}**`,
            '',
            '**━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━**'
        ].join('\n') : null;

        const embed = this.createRichEmbed({
            theme: 'SUCCESS',
            title: `✅ ${title}`,
            description: enhancedDescription,
            fields: fields.map(field => ({
                name: field.name,
                value: field.value.includes('▸') || field.value.includes('`') ? 
                    field.value : 
                    `**▸ ${field.value}**`,
                inline: field.inline !== false,
                icon: field.icon || 'SUCCESS'
            })),
            author,
            authorName: 'Success • Phong Ung Bang System'
        });
        
        const attachments = this.getEmbedAttachments('SUCCESS');
        
        return {
            embeds: [embed],
            files: attachments
        };
    }

    /**
     * Modern error embed with diagnostic info
     */
    error(title, description, details = null, author = null) {
        // Enhanced error description
        const enhancedDescription = [
            '```diff',
            '- ERROR: Operation failed',
            '```',
            '',
            `**💥 ${description}**`,
            '',
            '**━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━**'
        ].join('\n');

        const fields = [];
        
        if (details) {
            fields.push({
                name: '🔍 Technical Details',
                value: [
                    '```javascript',
                    details,
                    '```'
                ].join('\n'),
                inline: false,
                icon: 'ERROR'
            });
        }

        // Troubleshooting guide
        fields.push({
            name: '🛠️ Quick Fix Guide',
            value: [
                '**▸ Step 1:** Check bot permissions',
                '**▸ Step 2:** Retry in a few seconds',
                '**▸ Step 3:** Contact admin if persists'
            ].join('\n'),
            inline: false,
            icon: 'INFO'
        });

        const embed = this.createRichEmbed({
            theme: 'ERROR',
            title: `❌ ${title}`,
            description: enhancedDescription,
            fields,
            author,
            authorName: 'Error • Phong Ung Bang System'
        });
        
        const attachments = this.getEmbedAttachments('ERROR');
        
        return {
            embeds: [embed],
            files: attachments
        };
    }

    /**
     * Modern warning embed with clean styling
     */
    warning(title, description, fields = [], author = null) {
        // Enhanced warning description
        const enhancedDescription = description ? [
            '```yaml',
            'WARNING: Attention required',
            '```',
            '',
            `**⚠️ ${description}**`,
            '',
            '**━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━**'
        ].join('\n') : null;

        const embed = this.createRichEmbed({
            theme: 'WARNING',
            title: `🚨 ${title}`,
            description: enhancedDescription,
            fields: fields.map(field => ({
                name: field.name,
                value: field.value.includes('▸') || field.value.includes('`') ? 
                    field.value : 
                    `**▸ ${field.value}**`,
                inline: field.inline !== false,
                icon: field.icon || 'WARNING'
            })),
            author,
            authorName: 'Warning • Phong Ung Bang System'
        });
        
        const attachments = this.getEmbedAttachments('WARNING');
        
        return {
            embeds: [embed],
            files: attachments
        };
    }

    /**
     * Enhanced info embed with multiple icons
     */
    info(title, description, fields = [], author = null) {
        const embed = this.createRichEmbed({
            theme: 'INFO',
            title,
            description,
            fields,
            author
        });
        
        const attachments = this.getEmbedAttachments('INFO');
        
        return {
            embeds: [embed],
            files: attachments
        };
    }

    /**
     * Enhanced moderation action embed with modern visual design
     */
    moderation(data, author = null) {
        const { action, targetUser, moderator, reason, channel, duration, fields = [] } = data;
        
        // Modern description with clean visual hierarchy
        const description = [
            '```yaml',
            `Action: ${action}`,
            `Target: ${targetUser ? targetUser.tag : 'N/A'}`,
            `Moderator: ${moderator.tag}`,
            '```',
            '',
            '**📋 Chi tiết hành động:**',
            `> ${reason}`,
            '',
            '**━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━**'
        ].join('\n');

        // Enhanced context with modern formatting
        const contextField = {
            name: '📍 Context & Location',
            value: [
                `**▸ Kênh:** ${channel}`,
                `**▸ Thời gian:** <t:${Math.floor(Date.now() / 1000)}:R>`,
                `**▸ Timestamp:** <t:${Math.floor(Date.now() / 1000)}:f>`
            ].join('\n'),
            inline: true,
            icon: 'INFO'
        };

        // Enhanced user profile
        const userField = {
            name: '👤 User Profile',
            value: [
                `**▸ User ID:** \`${targetUser?.id || 'N/A'}\``,
                `**▸ Account:** <t:${Math.floor((targetUser?.createdTimestamp || Date.now()) / 1000)}:R>`,
                `**▸ Status:** ${targetUser ? 'Active' : 'Unknown'}`
            ].join('\n'),
            inline: true,
            icon: 'USER'
        };

        // Moderator info
        const modField = {
            name: '👮 Moderator Info',
            value: [
                `**▸ Staff:** ${moderator.tag}`,
                `**▸ ID:** \`${moderator.id}\``,
                `**▸ Action:** Verified`
            ].join('\n'),
            inline: true,
            icon: 'MODERATOR'
        };

        const enhancedFields = [contextField, userField, modField];

        // Duration with visual styling
        if (duration) {
            enhancedFields.push({
                name: '⏳ Duration & Expiry',
                value: [
                    `**▸ Duration:** \`${duration}\``,
                    `**▸ Type:** Temporary`,
                    `**▸ Status:** Active`
                ].join('\n'),
                inline: true,
                icon: 'DURATION'
            });
        }

        // Process custom fields with enhanced styling
        fields.forEach((field, index) => {
            const enhancedField = {
                name: field.name,
                value: field.value.includes('▸') || field.value.includes('`') ? 
                    field.value : 
                    `**▸ ${field.value}**`,
                inline: field.inline !== false,
                icon: field.icon || 'STATS'
            };
            enhancedFields.push(enhancedField);
        });

        // System footer with branding
        enhancedFields.push({
            name: '🤖 System Information',
            value: [
                '```css',
                'PeanHelp Moderation System v2.0',
                'Enhanced Layout Engine',
                'Custom Emoji Integration: Active',
                '```'
            ].join('\n'),
            inline: false,
            icon: 'STATS'
        });

        const embed = this.createRichEmbed({
            theme: 'MODERATION',
            title: `🚨 ${action} • Moderation Action`,
            description,
            fields: enhancedFields,
            author,
            authorName: `${action} performed by ${moderator.username || moderator.tag}`
        });
        
        const attachments = this.getEmbedAttachments('MODERATION');
        
        return {
            embeds: [embed],
            files: attachments
        };
    }

    /**
     * Get attachments for embed (icons and thumbnails)
     */
    getEmbedAttachments(theme, options = {}) {
        const themeConfig = EMBED_THEMES[theme] || EMBED_THEMES.INFO;
        const attachments = [];

        // Add author icon if available
        if (themeConfig.authorIcon && iconManager.hasIcon(themeConfig.authorIcon)) {
            const authorAttachment = iconManager.getIcon(themeConfig.authorIcon);
            if (authorAttachment) {
                attachments.push(authorAttachment);
            }
        }

        // Add thumbnail - always include for visual appeal
        if (themeConfig.thumbnail && iconManager.hasIcon(themeConfig.thumbnail)) {
            const thumbnailAttachment = iconManager.getIcon(themeConfig.thumbnail);
            if (thumbnailAttachment) {
                attachments.push(thumbnailAttachment);
            }
        }

        // Add footer icon (default)
        if (iconManager.hasIcon('carefreegojo')) {
            const footerAttachment = iconManager.getIcon('carefreegojo');
            if (footerAttachment) {
                // Rename for footer
                footerAttachment.name = 'footer_icon.png';
                attachments.push(footerAttachment);
            }
        }

        return attachments;
    }
}

// Export singleton instance with additional functions
const embedFactory = new CustomEmbedFactory();

module.exports = embedFactory;
module.exports.getCustomEmoji = getCustomEmoji;
module.exports.CUSTOM_EMOJI_MAP = CUSTOM_EMOJI_MAP;
module.exports.FIELD_ICONS = FIELD_ICONS;
module.exports.EMBED_THEMES = EMBED_THEMES;
module.exports.createRichEmbed = embedFactory.createRichEmbed;
module.exports.createCompleteEmbed = embedFactory.createCompleteEmbed;
module.exports.addFieldIcon = embedFactory.addFieldIcon;
module.exports.getEmbedAttachments = embedFactory.getEmbedAttachments; 
