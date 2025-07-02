class RateLimiter {
    constructor() {
        this.userLimits = new Map(); // userId -> { count, resetTime }
        this.guildLimits = new Map(); // guildId -> { count, resetTime }
        this.globalLimits = new Map(); // command -> { count, resetTime }
        
        // Rate limit configurations
        this.limits = {
            user: {
                commands: 10, // 10 commands per minute per user
                window: 60 * 1000, // 1 minute
            },
            guild: {
                commands: 100, // 100 commands per minute per guild
                window: 60 * 1000, // 1 minute
            },
            global: {
                database: 1000, // 1000 DB queries per minute globally
                window: 60 * 1000,
            }
        };

        // Cleanup expired entries every 5 minutes
        setInterval(() => this.cleanup(), 5 * 60 * 1000);
    }

    // Check if user can execute command
    checkUserLimit(userId) {
        const now = Date.now();
        const userKey = `user_${userId}`;
        
        if (!this.userLimits.has(userKey)) {
            this.userLimits.set(userKey, {
                count: 1,
                resetTime: now + this.limits.user.window
            });
            return true;
        }

        const userLimit = this.userLimits.get(userKey);
        
        if (now > userLimit.resetTime) {
            // Reset window
            userLimit.count = 1;
            userLimit.resetTime = now + this.limits.user.window;
            return true;
        }

        if (userLimit.count >= this.limits.user.commands) {
            return false; // Rate limited
        }

        userLimit.count++;
        return true;
    }

    // Check if guild can execute command
    checkGuildLimit(guildId) {
        const now = Date.now();
        const guildKey = `guild_${guildId}`;
        
        if (!this.guildLimits.has(guildKey)) {
            this.guildLimits.set(guildKey, {
                count: 1,
                resetTime: now + this.limits.guild.window
            });
            return true;
        }

        const guildLimit = this.guildLimits.get(guildKey);
        
        if (now > guildLimit.resetTime) {
            guildLimit.count = 1;
            guildLimit.resetTime = now + this.limits.guild.window;
            return true;
        }

        if (guildLimit.count >= this.limits.guild.commands) {
            return false;
        }

        guildLimit.count++;
        return true;
    }

    // Check global rate limits
    checkGlobalLimit(type = 'database') {
        const now = Date.now();
        const globalKey = `global_${type}`;
        
        if (!this.globalLimits.has(globalKey)) {
            this.globalLimits.set(globalKey, {
                count: 1,
                resetTime: now + this.limits.global.window
            });
            return true;
        }

        const globalLimit = this.globalLimits.get(globalKey);
        
        if (now > globalLimit.resetTime) {
            globalLimit.count = 1;
            globalLimit.resetTime = now + this.limits.global.window;
            return true;
        }

        if (globalLimit.count >= this.limits.global.database) {
            return false;
        }

        globalLimit.count++;
        return true;
    }

    // Get remaining requests for user
    getRemainingRequests(userId) {
        const userKey = `user_${userId}`;
        const userLimit = this.userLimits.get(userKey);
        
        if (!userLimit || Date.now() > userLimit.resetTime) {
            return this.limits.user.commands;
        }
        
        return Math.max(0, this.limits.user.commands - userLimit.count);
    }

    // Get time until reset
    getResetTime(userId) {
        const userKey = `user_${userId}`;
        const userLimit = this.userLimits.get(userKey);
        
        if (!userLimit || Date.now() > userLimit.resetTime) {
            return 0;
        }
        
        return Math.max(0, userLimit.resetTime - Date.now());
    }

    // Cleanup expired entries
    cleanup() {
        const now = Date.now();
        
        for (const [key, limit] of this.userLimits.entries()) {
            if (now > limit.resetTime) {
                this.userLimits.delete(key);
            }
        }
        
        for (const [key, limit] of this.guildLimits.entries()) {
            if (now > limit.resetTime) {
                this.guildLimits.delete(key);
            }
        }
        
        for (const [key, limit] of this.globalLimits.entries()) {
            if (now > limit.resetTime) {
                this.globalLimits.delete(key);
            }
        }
    }

    // Get statistics
    getStats() {
        return {
            activeUsers: this.userLimits.size,
            activeGuilds: this.guildLimits.size,
            globalLimits: this.globalLimits.size,
            memoryUsage: process.memoryUsage()
        };
    }
}

module.exports = new RateLimiter(); 