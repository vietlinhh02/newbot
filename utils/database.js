const { PrismaClient } = require('@prisma/client');

class DatabaseManager {
    constructor() {
        this.prisma = new PrismaClient({
            // Connection pooling optimization
            datasources: {
                db: {
                    url: process.env.DATABASE_URL,
                }
            },
            // Logging for performance monitoring
            log: process.env.NODE_ENV === 'development' ? 
                ['query', 'info', 'warn', 'error'] : ['warn', 'error'],
            
            // Performance settings
            errorFormat: 'minimal',
        });

        // Connection pool limits
        this.connectionPool = {
            min: 2,
            max: 20, // Tăng cho 10k servers
            acquireTimeoutMillis: 30000,
            createTimeoutMillis: 30000,
            destroyTimeoutMillis: 5000,
            idleTimeoutMillis: 30000,
            reapIntervalMillis: 1000,
            createRetryIntervalMillis: 200,
        };

        // Cache for frequently accessed data
        this.cache = new Map();
        this.cacheTimeout = 5 * 60 * 1000; // 5 minutes

        this.setupHealthCheck();
    }

    async connect() {
        try {
            await this.prisma.$connect();
            console.log('✅ Database connected successfully');
            
            // Test connection
            await this.prisma.$queryRaw`SELECT 1`;
            console.log('✅ Database health check passed');
            
        } catch (error) {
            console.error('❌ Database connection failed:', error);
            throw error;
        }
    }

    async disconnect() {
        try {
            await this.prisma.$disconnect();
            console.log('✅ Database disconnected successfully');
        } catch (error) {
            console.error('❌ Database disconnect failed:', error);
        }
    }

    // Cached guild settings lookup
    async getGuildSettings(guildId, useCache = true) {
        const cacheKey = `guild_${guildId}`;
        
        if (useCache && this.cache.has(cacheKey)) {
            const cached = this.cache.get(cacheKey);
            if (Date.now() - cached.timestamp < this.cacheTimeout) {
                return cached.data;
            }
        }

        try {
            const settings = await this.prisma.guildSettings.findUnique({
                where: { guildId }
            });

            if (useCache) {
                this.cache.set(cacheKey, {
                    data: settings,
                    timestamp: Date.now()
                });
            }

            return settings;
        } catch (error) {
            console.error(`Error fetching guild settings for ${guildId}:`, error);
            return null;
        }
    }

    // Batch operations for better performance
    async batchUpdateUserInventory(updates) {
        const transaction = await this.prisma.$transaction(
            updates.map(update => 
                this.prisma.userInventory.upsert({
                    where: {
                        userId_itemType_itemId: {
                            userId: update.userId,
                            itemType: update.itemType,
                            itemId: update.itemId
                        }
                    },
                    update: { quantity: update.quantity },
                    create: {
                        userId: update.userId,
                        itemType: update.itemType,
                        itemId: update.itemId,
                        quantity: update.quantity
                    }
                })
            )
        );
        return transaction;
    }

    // Health check endpoint
    setupHealthCheck() {
        setInterval(async () => {
            try {
                await this.prisma.$queryRaw`SELECT 1`;
                console.log('🔄 Database health check: OK');
            } catch (error) {
                console.error('❌ Database health check failed:', error);
            }
        }, 30000); // Every 30 seconds
    }

    // Clear cache periodically
    clearExpiredCache() {
        const now = Date.now();
        for (const [key, value] of this.cache.entries()) {
            if (now - value.timestamp > this.cacheTimeout) {
                this.cache.delete(key);
            }
        }
    }

    // Performance monitoring
    async getPerformanceMetrics() {
        const metrics = await this.prisma.$metrics.json();
        return {
            connectionCount: metrics.counters.find(c => c.key === 'prisma_client_queries_total')?.value || 0,
            queryDuration: metrics.histograms.find(h => h.key === 'prisma_client_query_duration_ms'),
            cacheSize: this.cache.size,
            timestamp: Date.now()
        };
    }
}

// Singleton instance
const databaseManager = new DatabaseManager();

module.exports = databaseManager; 