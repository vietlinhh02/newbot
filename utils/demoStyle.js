const { EmbedBuilder, AttachmentBuilder } = require('discord.js');
const { iconManager } = require('./iconManager');
const { getCustomEmoji, CUSTOM_EMOJI_MAP } = require('./customEmbeds');

// Custom emoji mapping for production style - using customEmbeds system
const PRODUCTION_EMOJIS = {
    // Action emojis với custom anime icons từ customEmbeds
    HAMMER: 'BAN',              // 🔨 → BAN custom emoji
    USER: 'USER',               // 👤 → USER custom emoji  
    CHAT: 'CAT_SIP',           // 💬 → CAT_SIP custom emoji
    PAGE: 'THINKING_FACE',      // 📄 → THINKING_FACE custom emoji
    SHIELD: 'HELLO_POLICE',     // 🛡️ → HELLO_POLICE custom emoji
    TIME: 'TIME',              // ⏰ → TIME custom emoji
    CHECK: 'OK',               // ✅ → OK custom emoji
    CROSS: 'ERROR',            // ❌ → ERROR custom emoji
    WARNING: 'WARN',           // ⚠️ → WARN custom emoji
    BELL: 'NYAA',              // 🔔 → NYAA custom emoji
    STAR: 'OMOSHIROI',         // ⭐ → OMOSHIROI custom emoji
    HEART: 'NOSEBLEED',        // ❤️ → NOSEBLEED custom emoji
    
    // Field separators
    SEPARATOR: '┆',             // Production style separator
    
    // Action names  
    ACTIONS: {
        WARN: 'Warn',
        BAN: 'Ban', 
        KICK: 'Kick',
        MUTE: 'Mute',
        TIMEOUT: 'Timeout'
    }
};

/**
 * Get custom emoji from customEmbeds system
 */
function getProductionEmoji(emojiKey) {
    // Use custom emoji system from customEmbeds.js
    return getCustomEmoji(emojiKey, '');
}

/**
 * Create production-style DM embed for moderation actions
 */
function createDMEmbed(action, guildName, moderatorTag, reason) {
    const actionEmoji = getProductionEmoji('BAN');         // Custom BAN emoji
    const userEmoji = getProductionEmoji('USER');          // Custom USER emoji  
    const chatEmoji = getProductionEmoji('REASON');        // Custom REASON emoji
    const sep = PRODUCTION_EMOJIS.SEPARATOR;
    
    const embed = new EmbedBuilder()
        .setColor(0xff6b6b)
        .setTitle(`${actionEmoji}${sep}${PRODUCTION_EMOJIS.ACTIONS[action] || action}`)
        .setDescription(`You've been ${(PRODUCTION_EMOJIS.ACTIONS[action] || action).toLowerCase()} in **${guildName}**`)
        .addFields([
            {
                name: `${userEmoji}${sep}${PRODUCTION_EMOJIS.ACTIONS[action] || action} by`,
                value: moderatorTag,
                inline: true
            },
            {
                name: `${chatEmoji}${sep}Reason`,
                value: reason,
                inline: true
            }
        ])
        .setTimestamp();

    // Add thumbnail with custom icons
    const thumbnailIcon = 'victorglare';
    if (iconManager.hasIcon(thumbnailIcon)) {
        embed.setThumbnail(`attachment://${thumbnailIcon}.png`);
    }
        
    return { embed, attachments: getEmbedAttachments([thumbnailIcon]) };
}

/**
 * Create production-style success embed for moderation actions
 */
function createSuccessEmbed(action, targetUser, moderatorUser, reason, additionalFields = []) {
    const userEmoji = getProductionEmoji('USER');          // Custom USER emoji
    const chatEmoji = getProductionEmoji('REASON');        // Custom REASON emoji
    const checkEmoji = getProductionEmoji('SUCCESS');      // Custom SUCCESS emoji
    const sep = PRODUCTION_EMOJIS.SEPARATOR;
    
    const embed = new EmbedBuilder()
        .setColor(0x00ff00)
        .setTitle(`${checkEmoji} Success`)
        .setDescription(`User has been ${(PRODUCTION_EMOJIS.ACTIONS[action] || action).toLowerCase()}!`)
        .addFields([
            {
                name: `${userEmoji}${sep}${PRODUCTION_EMOJIS.ACTIONS[action] || action} user`,
                value: targetUser.tag || targetUser,
                inline: true
            },
            {
                name: `${userEmoji}${sep}Moderator`,
                value: moderatorUser.tag,
                inline: true
            },
            {
                name: `${chatEmoji}${sep}Reason`,
                value: reason,
                inline: false
            }
        ])
        .setTimestamp();

    // Add thumbnail with custom icons
    const thumbnailIcon = 'menhara_approve';
    if (iconManager.hasIcon(thumbnailIcon)) {
        embed.setThumbnail(`attachment://${thumbnailIcon}.png`);
    }
        
    // Add additional fields với custom emojis
    additionalFields.forEach(field => {
        let fieldEmoji = getProductionEmoji('STATS'); // Default custom emoji
        
        // Map field names to custom emojis từ customEmbeds system
        if (field.name.includes('DM') || field.name.includes('Notification')) {
            fieldEmoji = getProductionEmoji('DM');
        } else if (field.name.includes('Count') || field.name.includes('Warning')) {
            fieldEmoji = getProductionEmoji('WARNING'); 
        } else if (field.name.includes('ID')) {
            fieldEmoji = getProductionEmoji('USER');
        } else if (field.name.includes('Time') || field.name.includes('Age')) {
            fieldEmoji = getProductionEmoji('TIME');
        } else if (field.name.includes('Status') || field.name.includes('Success')) {
            fieldEmoji = getProductionEmoji('SUCCESS');
        }
        
        embed.addFields({
            name: `${fieldEmoji}${sep}${field.name}`,
            value: field.value,
            inline: field.inline !== false
        });
    });

    const attachmentIcons = [thumbnailIcon];
    return { embed, attachments: getEmbedAttachments(attachmentIcons) };
}

/**
 * Create production-style error embed  
 */
function createErrorEmbed(title, description, details = null) {
    const crossEmoji = getProductionEmoji('ERROR');        // Custom ERROR emoji
    
    const embed = new EmbedBuilder()
        .setColor(0xff0000)
        .setTitle(`${crossEmoji} Error`)
        .setDescription(description)
        .setTimestamp();
        
    if (details) {
        embed.addFields({
            name: 'Details',
            value: details,
            inline: false
        });
    }

    // Add thumbnail with custom icons
    const thumbnailIcon = 'panik';
    if (iconManager.hasIcon(thumbnailIcon)) {
        embed.setThumbnail(`attachment://${thumbnailIcon}.png`);
    }
        
    return { embed, attachments: getEmbedAttachments([thumbnailIcon]) };
}

/**
 * Create production-style warning embed
 */
function createWarningEmbed(title, description, fields = []) {
    const warningEmoji = getProductionEmoji('WARNING');     // Custom WARNING emoji
    const sep = PRODUCTION_EMOJIS.SEPARATOR;
    
    const embed = new EmbedBuilder()
        .setColor(0xffaa00)
        .setTitle(`${warningEmoji} Warning`)
        .setDescription(description)
        .setTimestamp();
        
    fields.forEach(field => {
        const fieldEmoji = getProductionEmoji('INFO');      // Custom INFO emoji
        embed.addFields({
            name: `${fieldEmoji}${sep}${field.name}`,
            value: field.value,
            inline: field.inline !== false
        });
    });

    // Add thumbnail with custom icons
    const thumbnailIcon = 'ram_glare';
    if (iconManager.hasIcon(thumbnailIcon)) {
        embed.setThumbnail(`attachment://${thumbnailIcon}.png`);
    }
        
    return { embed, attachments: getEmbedAttachments([thumbnailIcon]) };
}

/**
 * Get attachments for icons from iconManager
 */
function getEmbedAttachments(iconNames = []) {
    const attachments = [];
    
    iconNames.forEach(iconName => {
        if (iconName && iconManager.hasIcon(iconName)) {
            const iconAttachment = iconManager.getIcon(iconName);
            if (iconAttachment) {
                // Ensure proper filename with .png extension
                iconAttachment.name = `${iconName}.png`;
                attachments.push(iconAttachment);
            }
        }
    });
    
    return attachments;
}


/**
 * Create production-style info embed
 */
function createInfoEmbed(title, footerData, author, description, fields = []) {
    const infoEmoji = getProductionEmoji('STAR');
    const sep = PRODUCTION_EMOJIS.SEPARATOR;

    const embed = new EmbedBuilder()
        .setColor(0x3498db) // Blue color for info
        .setTitle(title)
        .setDescription(description)
        .setTimestamp();

    if (author) {
        const userDisplay = author.tag || 'Unknown User';
        const avatarUrl = author.displayAvatarURL ? author.displayAvatarURL() : undefined;
        embed.setAuthor({ name: userDisplay, iconURL: avatarUrl });
    }
    
    if (footerData && footerData.tag) {
        embed.setFooter({ text: footerData.tag });
    }

    if (fields && fields.length > 0) {
        embed.addFields(fields.map(field => ({
            name: field.name || '\u200b', // Default to zero-width space if name is missing
            value: field.value || '\u200b', // Default to zero-width space if value is missing
            inline: field.inline || false,
        })));
    }

    const thumbnailIcon = 'ok';
    if (iconManager.hasIcon(thumbnailIcon)) {
        embed.setThumbnail(`attachment://${thumbnailIcon}.png`);
    }
        
    return { embed, attachments: getEmbedAttachments([thumbnailIcon]) };
}

module.exports = {
    createDMEmbed,
    createSuccessEmbed,
    createErrorEmbed,
    createWarningEmbed,
    createInfoEmbed,
    getCustomEmoji: getProductionEmoji,
    PRODUCTION_EMOJIS,
    CUSTOM_EMOJI_MAP // Export for reference
}; 