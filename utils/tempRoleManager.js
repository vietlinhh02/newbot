const { EmbedBuilder } = require('discord.js');

class TempRoleManager {
    constructor(client) {
        this.client = client;
        this.checkInterval = 5 * 60 * 1000; // Check every 5 minutes
        this.isRunning = false;
        this.lastCheckTime = null;
        this.startTime = null;
        this.checksPerformed = 0;
    }

    // Start the background task
    start() {
        if (this.isRunning) {
            console.log('⚠️ TempRole Manager is already running');
            return;
        }
        
        this.isRunning = true;
        this.startTime = new Date();
        this.lastCheckTime = null;
        this.checksPerformed = 0;
        
        console.log(`🏷️ TempRole Manager started at ${this.startTime.toISOString()}`);
        console.log(`🔄 Check interval: ${this.checkInterval / 1000 / 60} minutes`);
        
        // Initial check
        this.checkExpiredRoles();
        
        // Set interval for checking
        this.intervalId = setInterval(() => {
            this.checkExpiredRoles();
        }, this.checkInterval);
    }

    // Stop the background task
    stop() {
        if (!this.isRunning) return;
        
        this.isRunning = false;
        if (this.intervalId) {
            clearInterval(this.intervalId);
        }
        console.log('🏷️ TempRole Manager stopped');
    }

    // Check and remove expired roles
    async checkExpiredRoles() {
        try {
            const now = new Date();
            const startTime = Date.now();
            this.lastCheckTime = now;
            this.checksPerformed++;
            
            // Count total active temp roles
            const totalActiveRoles = await this.client.prisma.tempRole.count({
                where: { active: true }
            });
            
            // Find expired temp roles with safety margin (5 seconds buffer)
            const safetyBuffer = 5000; // 5 seconds
            const expiredRoles = await this.client.prisma.tempRole.findMany({
                where: {
                    active: true,
                    expiresAt: {
                        lte: new Date(now.getTime() - safetyBuffer) // Must be expired for at least 5 seconds
                    }
                }
            });

            console.log(`🏷️ [${now.toISOString()}] Check #${this.checksPerformed}: ${expiredRoles.length} expired, ${totalActiveRoles} total active (no reminders)`);

            // Log details of expired roles for debugging
            if (expiredRoles.length > 0) {
                console.log('📋 Expired roles details:');
                for (const role of expiredRoles) {
                    const timeExpired = now.getTime() - role.expiresAt.getTime();
                    console.log(`  • Role ID: ${role.roleId}, User: ${role.userId}, Expired ${Math.floor(timeExpired/1000)}s ago`);
                }
            }

            for (const tempRole of expiredRoles) {
                await this.removeExpiredRole(tempRole);
            }

            // Reminder system disabled - only send notifications when role is granted/removed

            const endTime = Date.now();
            const duration = endTime - startTime;
            console.log(`🏷️ [${new Date().toISOString()}] Expired roles check completed in ${duration}ms`);

        } catch (error) {
            console.error(`🏷️ [${new Date().toISOString()}] Error checking expired roles:`, error);
        }
    }

    // Remove a specific expired role
    async removeExpiredRole(tempRole) {
        try {
            // Double-check if role is actually expired (safety check)
            const now = new Date();
            const timeUntilExpiry = tempRole.expiresAt.getTime() - now.getTime();
            
            if (timeUntilExpiry > 0) {
                console.warn(`⚠️ SAFETY CHECK: Role ${tempRole.id} is NOT expired yet! Time left: ${Math.floor(timeUntilExpiry/1000)}s`);
                return; // Do not remove role that hasn't expired
            }

            const timeExpired = now.getTime() - tempRole.expiresAt.getTime();
            console.log(`🗑️ Removing role ${tempRole.roleId} (expired ${Math.floor(timeExpired/1000)}s ago)`);

            const guild = this.client.guilds.cache.get(tempRole.guildId);
            if (!guild) {
                console.log(`Guild ${tempRole.guildId} not found, marking role as inactive`);
                await this.deactivateTempRole(tempRole.id);
                return;
            }

            const member = await guild.members.fetch(tempRole.userId).catch(() => null);
            if (!member) {
                console.log(`Member ${tempRole.userId} not found in guild ${guild.name}`);
                await this.deactivateTempRole(tempRole.id);
                return;
            }

            const role = guild.roles.cache.get(tempRole.roleId);
            if (!role) {
                console.log(`Role ${tempRole.roleId} not found in guild ${guild.name}`);
                await this.deactivateTempRole(tempRole.id);
                return;
            }

            // Remove role from member
            if (member.roles.cache.has(role.id)) {
                await member.roles.remove(role);
                console.log(`✅ Removed expired role "${role.name}" from ${member.user.username} (expired ${Math.floor(timeExpired/1000)}s ago)`);
            } else {
                console.log(`ℹ️ User ${member.user.username} no longer has role "${role.name}", marking as inactive`);
            }

            // Mark as inactive in database
            await this.deactivateTempRole(tempRole.id);

            // Send notification to user
            try {
                const embed = new EmbedBuilder()
                    .setTitle('⏰ Role tạm thời đã hết hạn')
                    .setDescription(`Role **${role.name}** của bạn trong server **${guild.name}** đã hết hạn và được tự động gỡ bỏ.`)
                    .addFields({
                        name: '📅 Hết hạn lúc',
                        value: `<t:${Math.floor(tempRole.expiresAt.getTime() / 1000)}:F>`,
                        inline: false
                    })
                    .setColor(0xff4757)
                    .setFooter({ text: 'Chỉ thông báo khi nhận/mất role - không có reminder' })
                    .setTimestamp();

                await member.send({ embeds: [embed] });
                console.log(`📨 Sent expiry notification to ${member.user.username} for role "${role.name}"`);
            } catch (error) {
                console.log(`❌ Could not DM user ${member.user.username} about expired role:`, error.message);
            }

            // Log to guild if log channel exists
            await this.logRoleExpiry(guild, member, role, tempRole);

        } catch (error) {
            console.error(`Error removing expired role ${tempRole.id}:`, error);
        }
    }



    // Log role expiry to guild
    async logRoleExpiry(guild, member, role, tempRole) {
        try {
            // Get guild settings for log channel
            const guildSettings = await this.client.prisma.guildSettings.findUnique({
                where: { guildId: guild.id }
            });

            if (!guildSettings?.logChannel) return;

            const logChannel = guild.channels.cache.get(guildSettings.logChannel);
            if (!logChannel) return;

            const embed = new EmbedBuilder()
                .setTitle('📋 Temp Role Expired')
                .addFields(
                    {
                        name: '👤 User',
                        value: `${member} (${member.user.username})`,
                        inline: true
                    },
                    {
                        name: '🏷️ Role',
                        value: `${role}`,
                        inline: true
                    },
                    {
                        name: '📅 Expired',
                        value: `<t:${Math.floor(tempRole.expiresAt.getTime() / 1000)}:F>`,
                        inline: false
                    },
                    {
                        name: '👮 Originally granted by',
                        value: `<@${tempRole.grantedBy}>`,
                        inline: true
                    },
                    {
                        name: '📝 Reason',
                        value: tempRole.reason || 'Không có lý do',
                        inline: true
                    }
                )
                .setColor(0xff6b6b)
                .setTimestamp();

            await logChannel.send({ embeds: [embed] });

        } catch (error) {
            console.log('Could not log role expiry:', error);
        }
    }

    // Deactivate temp role in database
    async deactivateTempRole(tempRoleId) {
        try {
            await this.client.prisma.tempRole.update({
                where: { id: tempRoleId },
                data: { active: false }
            });
        } catch (error) {
            console.error(`Error deactivating temp role ${tempRoleId}:`, error);
        }
    }

    // Format duration in human readable format
    formatDuration(milliseconds) {
        const seconds = Math.floor(milliseconds / 1000);
        const minutes = Math.floor(seconds / 60);
        const hours = Math.floor(minutes / 60);
        const days = Math.floor(hours / 24);

        if (days > 0) {
            return `${days} ngày ${hours % 24} giờ`;
        } else if (hours > 0) {
            return `${hours} giờ ${minutes % 60} phút`;
        } else if (minutes > 0) {
            return `${minutes} phút`;
        } else {
            return `${seconds} giây`;
        }
    }

    // Get active temp roles for a user
    async getUserTempRoles(userId, guildId) {
        return await this.client.prisma.tempRole.findMany({
            where: {
                userId: userId,
                guildId: guildId,
                active: true
            },
            orderBy: {
                expiresAt: 'asc'
            }
        });
    }

    // Get all active temp roles for a guild
    async getGuildTempRoles(guildId) {
        return await this.client.prisma.tempRole.findMany({
            where: {
                guildId: guildId,
                active: true
            },
            orderBy: {
                expiresAt: 'asc'
            }
        });
    }

    // Manually remove a temp role
    async removeTempRole(tempRoleId) {
        try {
            const tempRole = await this.client.prisma.tempRole.findUnique({
                where: { id: tempRoleId }
            });

            if (!tempRole || !tempRole.active) {
                throw new Error('Temp role not found or already inactive');
            }

            await this.removeExpiredRole(tempRole);
            return true;
        } catch (error) {
            console.error('Error manually removing temp role:', error);
            throw error;
        }
    }

    // Extend temp role duration
    async extendTempRole(tempRoleId, additionalDuration) {
        try {
            const tempRole = await this.client.prisma.tempRole.findUnique({
                where: { id: tempRoleId }
            });

            if (!tempRole || !tempRole.active) {
                throw new Error('Temp role not found or already inactive');
            }

            const newExpiryDate = new Date(tempRole.expiresAt.getTime() + additionalDuration);

            await this.client.prisma.tempRole.update({
                where: { id: tempRoleId },
                data: { expiresAt: newExpiryDate }
            });

            return newExpiryDate;
        } catch (error) {
            console.error('Error extending temp role:', error);
            throw error;
        }
    }

    // Get manager status
    getStatus() {
        const now = new Date();
        const uptime = this.startTime ? now.getTime() - this.startTime.getTime() : 0;
        const nextCheck = this.lastCheckTime ? new Date(this.lastCheckTime.getTime() + this.checkInterval) : null;
        
        return {
            isRunning: this.isRunning,
            startTime: this.startTime,
            lastCheckTime: this.lastCheckTime,
            checksPerformed: this.checksPerformed,
            uptime: uptime,
            nextCheck: nextCheck,
            checkInterval: this.checkInterval,
            intervalId: this.intervalId || null
        };
    }

    // Force immediate check (for debugging)
    async forceCheck() {
        console.log('🔄 Forcing immediate expired roles check...');
        await this.checkExpiredRoles();
        return this.getStatus();
    }
}

module.exports = TempRoleManager; 