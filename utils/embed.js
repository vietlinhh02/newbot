const { EmbedBuilder } = require('discord.js');
const config = require('../config.json');

/**
 * Tạo embed cơ bản
 * @param {Object} options - Tùy chọn cho embed
 * @returns {EmbedBuilder}
 */
function createEmbed(options = {}) {
    const embed = new EmbedBuilder()
        .setColor(options.color || config.defaultSettings.embedColor)
        .setTimestamp();
    
    if (options.title) embed.setTitle(options.title);
    if (options.description) embed.setDescription(options.description);
    if (options.footer) embed.setFooter({ text: options.footer });
    if (options.author) embed.setAuthor(options.author);
    if (options.thumbnail) embed.setThumbnail(options.thumbnail);
    if (options.image) embed.setImage(options.image);
    if (options.fields) embed.addFields(options.fields);
    
    return embed;
}

/**
 * Tạo embed thành công
 * @param {string} title - Tiêu đề
 * @param {string} description - Mô tả
 * @returns {EmbedBuilder}
 */
function createSuccessEmbed(title, description) {
    return createEmbed({
        title: `✅ ${title}`,
        description,
        color: config.defaultSettings.successColor
    });
}

/**
 * Tạo embed lỗi
 * @param {string} title - Tiêu đề
 * @param {string} description - Mô tả
 * @returns {EmbedBuilder}
 */
function createErrorEmbed(title, description) {
    return createEmbed({
        title: `❌ ${title}`,
        description,
        color: config.defaultSettings.errorColor
    });
}

/**
 * Tạo embed cảnh báo
 * @param {string} title - Tiêu đề
 * @param {string} description - Mô tả
 * @returns {EmbedBuilder}
 */
function createWarningEmbed(title, description) {
    return createEmbed({
        title: `⚠️ ${title}`,
        description,
        color: config.defaultSettings.warningColor
    });
}

/**
 * Tạo embed thông tin
 * @param {string} title - Tiêu đề
 * @param {string} description - Mô tả
 * @returns {EmbedBuilder}
 */
function createInfoEmbed(title, description) {
    return createEmbed({
        title: `ℹ️ ${title}`,
        description,
        color: config.defaultSettings.embedColor
    });
}

/**
 * Tạo embed moderation log
 * @param {Object} options - Tùy chọn
 * @returns {EmbedBuilder}
 */
function createModerationEmbed(options) {
    const embed = createEmbed({
        title: `🛡️ ${options.action}`,
        color: config.defaultSettings.embedColor,
        footer: `ID: ${options.targetUser.id} | ${new Date().toLocaleString('vi-VN')}`
    });
    
    embed.addFields([
        {
            name: '👤 Người dùng',
            value: `${options.targetUser.tag} (${options.targetUser.id})`,
            inline: true
        },
        {
            name: '👮 Người thực hiện',
            value: `${options.moderator.tag} (${options.moderator.id})`,
            inline: true
        }
    ]);
    
    if (options.reason) {
        embed.addFields([{
            name: '📝 Lý do',
            value: options.reason,
            inline: false
        }]);
    }
    
    if (options.duration) {
        embed.addFields([{
            name: '⏰ Thời gian',
            value: options.duration,
            inline: true
        }]);
    }
    
    if (options.channel) {
        embed.addFields([{
            name: '📍 Kênh',
            value: `${options.channel}`,
            inline: true
        }]);
    }
    
    return embed;
}

/**
 * Tạo embed help
 * @param {Object} command - Object lệnh
 * @returns {EmbedBuilder}
 */
function createHelpEmbed(command) {
    const embed = createEmbed({
        title: `📖 Trợ giúp - ${command.name}`,
        description: command.description,
        color: config.defaultSettings.embedColor
    });
    
    if (command.usage) {
        embed.addFields([{
            name: '📝 Cách sử dụng',
            value: `\`${command.usage}\``,
            inline: false
        }]);
    }
    
    if (command.examples) {
        embed.addFields([{
            name: '💡 Ví dụ',
            value: command.examples.map(ex => `\`${ex}\``).join('\n'),
            inline: false
        }]);
    }
    
    if (command.permissions) {
        embed.addFields([{
            name: '🔐 Quyền yêu cầu',
            value: command.permissions,
            inline: true
        }]);
    }
    
    return embed;
}

module.exports = {
    createEmbed,
    createSuccessEmbed,
    createErrorEmbed,
    createWarningEmbed,
    createInfoEmbed,
    createModerationEmbed,
    createHelpEmbed
}; 