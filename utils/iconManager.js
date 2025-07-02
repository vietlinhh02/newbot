const path = require('path');
const fs = require('fs');
const { AttachmentBuilder } = require('discord.js');

class IconManager {
    constructor() {
        this.iconPath = path.join(__dirname, '../icon');
        this.iconCache = new Map();
        this.loadIcons();
    }

    /**
     * Load all icons from the icon directory
     */
    loadIcons() {
        try {
            const files = fs.readdirSync(this.iconPath);
            const iconFiles = files.filter(file => file.endsWith('.png'));
            
            console.log(`📁 Loaded ${iconFiles.length} icons from /icon directory`);
            
            // Map icon names for easy access
            iconFiles.forEach(file => {
                const name = file.replace('.png', '').toLowerCase();
                this.iconCache.set(name, file);
            });
            
        } catch (error) {
            console.error('Error loading icons:', error);
        }
    }

    /**
     * Get icon attachment for Discord
     */
    getIcon(iconName) {
        const fileName = this.iconCache.get(iconName.toLowerCase());
        if (!fileName) {
            console.warn(`Icon "${iconName}" not found`);
            return null;
        }

        try {
            const iconPath = path.join(this.iconPath, fileName);
            return new AttachmentBuilder(iconPath, { name: fileName });
        } catch (error) {
            console.error(`Error loading icon "${iconName}":`, error);
            return null;
        }
    }

    /**
     * Get icon URL for embeds (returns attachment:// URL)
     */
    getIconUrl(iconName) {
        const fileName = this.iconCache.get(iconName.toLowerCase());
        return fileName ? `attachment://${fileName}` : null;
    }

    /**
     * Get available icons list
     */
    getAvailableIcons() {
        return Array.from(this.iconCache.keys());
    }

    /**
     * Check if icon exists
     */
    hasIcon(iconName) {
        return this.iconCache.has(iconName.toLowerCase());
    }
}

// Icon mappings for different categories and actions
const ICON_MAPPINGS = {
    // Status icons
    SUCCESS: 'happysmile02',
    ERROR: 'panik', 
    WARNING: 'hmmp',
    INFO: 'nyaa',

    // Action icons - Moderation
    BAN: 'hellopolice',
    KICK: 'tomioka_angry',
    MUTE: 'shtap',
    UNMUTE: 'tomioka_happy',
    TIMEOUT: 'eh',
    WARN: 'ram_glare',
    CLEAR: 'carefreegojo',
    PURGE: 'gojo_bye',

    // User types
    USER: 'ok',
    ADMIN: 'omoshiroi',
    MODERATOR: 'victorglare',
    BOT: 'sus',
    OWNER: 'takelove',

    // System icons
    SERVER: 'purpleheart',
    CHANNEL: 'cat_sip',
    VOICE: 'ram_sip',
    STATS: 'hehe',
    HELP: 'shinobu_pat_tomioka',
    
    // Reactions
    ONLINE: 'yesser',
    OFFLINE: 'zero_two_idk',
    IDLE: 'phew',
    HAPPY: 'happi_cri',
    SAD: 'baka',
    ANGRY: 'tomioka_little_mad',
    LOVE: 'nosebleed',
    LAUGH: 'dirtylaugh',
    CRY: 'whaaa',
    THINK: 'hmmmnaruhudowakaranai',
    
    // Special
    PREMIUM: 'purplebutterflies',
    MAGIC: 'zt_gun',
    ROCKET: 'tatakae',
    DIAMOND: 'menhara_approve',
    STAR: 'wow',
    
    // Additional useful icons
    TIME: 'zero_two_idk',
    REASON: 'tomiokahi',
    SHIELD: 'victorglare',
    NOTIFICATION: 'nyaa'
};

// Export singleton
const iconManager = new IconManager();

module.exports = {
    iconManager,
    ICON_MAPPINGS,
    
    /**
     * Get icon for embed with attachment
     */
    getEmbedIcon: (iconKey) => {
        const iconName = ICON_MAPPINGS[iconKey] || iconKey;
        return {
            attachment: iconManager.getIcon(iconName),
            url: iconManager.getIconUrl(iconName)
        };
    },

    /**
     * Get just the attachment
     */
    getIconAttachment: (iconKey) => {
        const iconName = ICON_MAPPINGS[iconKey] || iconKey;
        return iconManager.getIcon(iconName);
    },

    /**
     * Get icon URL for embeds
     */
    getIconUrl: (iconKey) => {
        const iconName = ICON_MAPPINGS[iconKey] || iconKey;
        return iconManager.getIconUrl(iconName);
    }
}; 