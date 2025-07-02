const ms = require('ms');

/**
 * Parse thời gian từ string thành milliseconds
 * @param {string} timeString - Chuỗi thời gian (ví dụ: "1h", "30m", "1d")
 * @returns {number|null} - Milliseconds hoặc null nếu không hợp lệ
 */
function parseTime(timeString) {
    if (!timeString) return null;
    
    try {
        const time = ms(timeString);
        return time && time > 0 ? time : null;
    } catch (error) {
        return null;
    }
}

/**
 * Chuyển đổi milliseconds thành chuỗi dễ đọc
 * @param {number} milliseconds - Milliseconds
 * @returns {string} - Chuỗi thời gian dễ đọc
 */
function formatDuration(milliseconds) {
    if (!milliseconds || milliseconds <= 0) return 'Vĩnh viễn';
    
    try {
        return ms(milliseconds, { long: true });
    } catch (error) {
        return 'Không xác định';
    }
}

/**
 * Chuyển đổi milliseconds thành chuỗi tiếng Việt
 * @param {number} milliseconds - Milliseconds
 * @returns {string} - Chuỗi thời gian tiếng Việt
 */
function formatDurationVietnamese(milliseconds) {
    if (!milliseconds || milliseconds <= 0) return 'Vĩnh viễn';
    
    const seconds = Math.floor(milliseconds / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);
    const weeks = Math.floor(days / 7);
    const months = Math.floor(days / 30);
    const years = Math.floor(days / 365);
    
    if (years > 0) {
        return `${years} năm${years > 1 ? '' : ''}`;
    } else if (months > 0) {
        return `${months} tháng${months > 1 ? '' : ''}`;
    } else if (weeks > 0) {
        return `${weeks} tuần${weeks > 1 ? '' : ''}`;
    } else if (days > 0) {
        return `${days} ngày${days > 1 ? '' : ''}`;
    } else if (hours > 0) {
        return `${hours} giờ${hours > 1 ? '' : ''}`;
    } else if (minutes > 0) {
        return `${minutes} phút${minutes > 1 ? '' : ''}`;
    } else {
        return `${seconds} giây${seconds > 1 ? '' : ''}`;
    }
}

/**
 * Kiểm tra xem thời gian có hết hạn chưa
 * @param {Date|string} expirationDate - Ngày hết hạn
 * @returns {boolean}
 */
function isExpired(expirationDate) {
    if (!expirationDate) return false;
    
    const expiration = new Date(expirationDate);
    const now = new Date();
    
    return expiration <= now;
}

/**
 * Lấy thời gian còn lại
 * @param {Date|string} expirationDate - Ngày hết hạn
 * @returns {number} - Milliseconds còn lại
 */
function getTimeRemaining(expirationDate) {
    if (!expirationDate) return 0;
    
    const expiration = new Date(expirationDate);
    const now = new Date();
    
    return Math.max(0, expiration.getTime() - now.getTime());
}

/**
 * Format ngày giờ theo định dạng Việt Nam
 * @param {Date|string} date - Ngày cần format
 * @returns {string}
 */
function formatDate(date) {
    if (!date) return 'Không xác định';
    
    const d = new Date(date);
    return d.toLocaleString('vi-VN', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
    });
}

/**
 * Tạo timestamp Discord
 * @param {Date|string} date - Ngày
 * @param {string} format - Format: t, T, d, D, f, F, R
 * @returns {string}
 */
function createDiscordTimestamp(date, format = 'f') {
    if (!date) return '';
    
    const timestamp = Math.floor(new Date(date).getTime() / 1000);
    return `<t:${timestamp}:${format}>`;
}

/**
 * Validate time string
 * @param {string} timeString - Chuỗi thời gian
 * @returns {boolean}
 */
function isValidTimeString(timeString) {
    if (!timeString) return false;
    
    // Kiểm tra format hợp lệ (số + đơn vị)
    const regex = /^(\d+)([smhdwy])$/i;
    return regex.test(timeString) || parseTime(timeString) !== null;
}

module.exports = {
    parseTime,
    formatDuration,
    formatDurationVietnamese,
    isExpired,
    getTimeRemaining,
    formatDate,
    createDiscordTimestamp,
    isValidTimeString
}; 