const { PrismaClient } = require('@prisma/client');
const config = require('../config.json');

const prisma = new PrismaClient();

// Constants for Discord permissions
const ADMIN_PERMISSIONS = [
    'Administrator',
    'BanMembers',
    'KickMembers',
    'ModerateMembers',
    'ManageRoles',
    'ManageChannels',
    'ManageGuild',
    'ManageMessages'
];

const HELPER_PERMISSIONS = [
    'ModerateMembers',
    'ManageMessages',
    'ViewAuditLog',
    'KickMembers',
    'MuteMembers'
];

// Mapping command permissions with Discord permissions
const COMMAND_PERMISSIONS = {
    ban: ['BanMembers'],
    unban: ['BanMembers'],
    kick: ['KickMembers'],
    mute: ['ModerateMembers'],
    unmute: ['ModerateMembers'],
    warn: ['ModerateMembers', 'ManageMessages'],
    clear: ['ManageMessages'],
    clearbot: ['ManageMessages'],
    purge: ['ManageMessages'],
    clearwarnings: ['ModerateMembers'],
    lockdown: ['ManageChannels'],
    slowmode: ['ManageChannels'],
    nuke: ['ManageChannels'],
    lockserver: ['ManageGuild'],
    unlockserver: ['ManageGuild'],
    createinvite: ['CreateInstantInvite'],
    invites: ['ManageGuild'],
    vmute: ['MuteMembers'],
    vunmute: ['MuteMembers'],
    deafen: ['DeafenMembers'],
    undeafen: ['DeafenMembers'],
    move: ['MoveMembers'],
    moveall: ['MoveMembers'],
    disconnect: ['MoveMembers'],
    timeout: ['ModerateMembers'],
    tempban: ['BanMembers'],
    softban: ['BanMembers'],
    // Management commands
    addrole: ['ManageRoles'],
    removerole: ['ManageRoles'],
    createrole: ['ManageRoles'],
    deleterole: ['ManageRoles'],
    // Config commands
    prefix: ['ManageGuild'],
    setlog: ['ManageGuild'],
    setmuterole: ['ManageGuild'],
    setwelcome: ['ManageGuild'],
    setleave: ['ManageGuild'],
    joinrole: ['ManageGuild'],
    automod: ['ManageGuild'],
    botrole: ['ManageGuild'],
    // Security commands
    antiraid: ['ManageGuild'],
    antispam: ['ManageGuild'],
    antialt: ['ManageGuild'],
    whitelist: ['ManageGuild'],
    massban: ['BanMembers'],
    // Announcement commands
    announce: ['ManageMessages'],
    embed: ['ManageMessages'],
    dm: ['ManageMessages'],
    broadcast: ['ManageMessages']
};

/**
 * Checks if a user is a bot owner.
 * @param {string} userId - The user's ID.
 * @returns {boolean}
 */
function isBotOwner(userId) {
    const botOwners = process.env.BOT_OWNERS?.split(',') || config.permissions.botOwners;
    return botOwners.includes(userId);
}

/**
 * Checks if a user is the server owner.
 * @param {import('discord.js').GuildMember} member - The guild member.
 * @returns {boolean}
 */
function isServerOwner(member) {
    return member.guild.ownerId === member.id;
}

/**
 * Generic function to check for a role based on Discord permissions and configured roles.
 * @param {import('discord.js').GuildMember} member
 * @param {string} guildId
 * @param {string[]} discordPermissions
 * @param {string} dbField
 * @param {string[]} defaultRoles
 * @returns {Promise<boolean>}
 */
async function hasRole(member, guildId, discordPermissions, dbField, defaultRoles) {
    try {
        // Check for Discord permissions
        if (discordPermissions.some(perm => member.permissions.has(perm))) {
            return true;
        }

        // Fallback to database-configured roles
        const guildSettings = await prisma.guildSettings.findUnique({ where: { guildId } });
        const configuredRoles = guildSettings?.[dbField]?.split(',').map(r => r.trim());

        if (configuredRoles?.length > 0) {
            return member.roles.cache.some(role => configuredRoles.includes(role.name));
        }

        // Fallback to default roles
        return member.roles.cache.some(role => defaultRoles.includes(role.name));
    } catch (error) {
        console.error(`Error checking ${dbField}:`, error);
        return false;
    }
}

/**
 * Checks if a user has admin-level permissions.
 * @param {import('discord.js').GuildMember} member
 * @param {string} guildId
 * @returns {Promise<boolean>}
 */
async function hasAdminRole(member, guildId) {
    if (member.permissions.has('Administrator')) return true;
    return hasRole(member, guildId, ADMIN_PERMISSIONS, 'adminRoles', config.permissions.defaultAdminRoles);
}

/**
 * Checks if a user has helper-level permissions.
 * @param {import('discord.js').GuildMember} member
 * @param {string} guildId
 * @returns {Promise<boolean>}
 */
async function hasHelperRole(member, guildId) {
    return hasRole(member, guildId, HELPER_PERMISSIONS, 'helperRoles', config.permissions.defaultHelperRoles);
}

/**
 * Checks if a user has a specific command permission.
 * @param {import('discord.js').GuildMember} member
 * @param {string} commandName
 * @returns {boolean}
 */
function hasSpecificCommandPermission(member, commandName) {
    const requiredPerms = COMMAND_PERMISSIONS[commandName];
    if (!requiredPerms) return true; // Default to true if no permissions are defined
    return requiredPerms.some(perm => member.permissions.has(perm));
}

/**
 * Flexible permission check: prioritizes Discord permissions, falls back to role-based checks.
 * @param {import('discord.js').GuildMember} member
 * @param {string} commandName
 * @param {string} requiredLevel - 'admin', 'helper', 'member', 'botOwner', 'serverOwner'
 * @param {string} guildId
 * @returns {Promise<boolean>}
 */
async function hasFlexiblePermission(member, commandName, requiredLevel, guildId) {
    if (isBotOwner(member.id)) return true;
    if (requiredLevel === 'botOwner') return false;

    if (isServerOwner(member)) return true;
    if (requiredLevel === 'serverOwner') return false;

    // Check for specific Discord permissions first
    if (hasSpecificCommandPermission(member, commandName)) {
        return true;
    }

    // Fallback to role-based checks
    switch (requiredLevel) {
        case 'admin':
            return await hasAdminRole(member, guildId);
        case 'helper':
            return await hasAdminRole(member, guildId) || await hasHelperRole(member, guildId);
        case 'member':
        default:
            return true;
    }
}

/**
 * Gets a user-friendly permission error message.
 * @param {string} requiredPermission
 * @param {string} commandName
 * @returns {string}
 */
function getPermissionErrorMessage(requiredPermission, commandName = '') {
    const requiredPerms = COMMAND_PERMISSIONS[commandName];

    if (requiredPerms?.length > 0) {
        const permText = requiredPerms.map(p => `**${p}**`).join(' or ');
        return `You need the following Discord permission(s) to use this command: ${permText}!`;
    }

    const messages = {
        botOwner: 'Only the bot owner can use this command!',
        serverOwner: 'Only the server owner can use this command!',
        admin: 'You need Admin permissions (or equivalent Discord permissions) to use this command!',
        helper: 'You need at least Helper permissions (or equivalent Discord permissions) to use this command!',
        member: 'You do not have permission to use this command!'
    };

    return messages[requiredPermission] || messages.member;
}

/**
 * Gets a user's permission information for debugging.
 * @param {import('discord.js').GuildMember} member
 * @returns {Object}
 */
function getUserPermissionInfo(member) {
    const discordPerms = [...new Set([...ADMIN_PERMISSIONS, ...HELPER_PERMISSIONS])]
        .filter(perm => member.permissions.has(perm));

    return {
        userId: member.id,
        tag: member.user.tag,
        isServerOwner: isServerOwner(member),
        isBotOwner: isBotOwner(member.id),
        discordPermissions: discordPerms,
        roles: member.roles.cache.map(role => role.name),
        highestRole: member.roles.highest.name
    };
}

module.exports = {
    isBotOwner,
    isServerOwner,
    hasAdminRole,
    hasHelperRole,
    hasSpecificCommandPermission,
    hasFlexiblePermission,
    getPermissionErrorMessage,
    getUserPermissionInfo,
    ADMIN_PERMISSIONS,
    HELPER_PERMISSIONS,
    COMMAND_PERMISSIONS
};