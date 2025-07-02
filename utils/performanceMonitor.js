const fs = require('fs').promises;
const path = require('path');

class PerformanceMonitor {
    constructor() {
        this.metrics = {
            commandsExecuted: 0,
            errors: 0,
            responseTime: [],
            memoryUsage: [],
            guildsCount: 0,
            usersCount: 0,
            startTime: Date.now()
        };

        this.thresholds = {
            responseTime: 3000, // 3 seconds
            memoryUsage: 512 * 1024 * 1024, // 512MB
            errorRate: 0.05 // 5%
        };

        // Collect metrics every 30 seconds
        setInterval(() => this.collectMetrics(), 30000);

        // Save metrics every 5 minutes
        setInterval(() => this.saveMetrics(), 5 * 60 * 1000);
    }

    // Record command execution
    recordCommand(commandName, responseTime, success = true) {
        this.metrics.commandsExecuted++;
        this.metrics.responseTime.push({
            command: commandName,
            time: responseTime,
            timestamp: Date.now()
        });

        if (!success) {
            this.metrics.errors++;
        }

        // Keep only last 1000 response times
        if (this.metrics.responseTime.length > 1000) {
            this.metrics.responseTime = this.metrics.responseTime.slice(-1000);
        }

        // Alert if response time too high
        if (responseTime > this.thresholds.responseTime) {
            console.warn(`⚠️  Slow command: ${commandName} took ${responseTime}ms`);
        }
    }

    // Collect system metrics
    collectMetrics() {
        const memUsage = process.memoryUsage();
        this.metrics.memoryUsage.push({
            rss: memUsage.rss,
            heapUsed: memUsage.heapUsed,
            heapTotal: memUsage.heapTotal,
            external: memUsage.external,
            timestamp: Date.now()
        });

        // Keep only last 100 memory snapshots
        if (this.metrics.memoryUsage.length > 100) {
            this.metrics.memoryUsage = this.metrics.memoryUsage.slice(-100);
        }

        // Alert if memory usage too high
        if (memUsage.heapUsed > this.thresholds.memoryUsage) {
            console.warn(`⚠️  High memory usage: ${(memUsage.heapUsed / 1024 / 1024).toFixed(2)}MB`);
        }

        // Alert if error rate too high
        const errorRate = this.metrics.errors / this.metrics.commandsExecuted;
        if (errorRate > this.thresholds.errorRate) {
            console.warn(`⚠️  High error rate: ${(errorRate * 100).toFixed(2)}%`);
        }
    }

    // Update guild/user counts
    updateCounts(guildsCount, usersCount) {
        this.metrics.guildsCount = guildsCount;
        this.metrics.usersCount = usersCount;
    }

    // Get current performance stats
    getStats() {
        const now = Date.now();
        const uptime = now - this.metrics.startTime;
        
        // Calculate average response time
        const recentResponses = this.metrics.responseTime.filter(
            r => now - r.timestamp < 5 * 60 * 1000 // Last 5 minutes
        );
        const avgResponseTime = recentResponses.length > 0 
            ? recentResponses.reduce((sum, r) => sum + r.time, 0) / recentResponses.length 
            : 0;

        // Calculate error rate
        const errorRate = this.metrics.commandsExecuted > 0 
            ? this.metrics.errors / this.metrics.commandsExecuted 
            : 0;

        // Latest memory usage
        const latestMemory = this.metrics.memoryUsage[this.metrics.memoryUsage.length - 1];

        return {
            uptime: uptime,
            guilds: this.metrics.guildsCount,
            users: this.metrics.usersCount,
            commandsExecuted: this.metrics.commandsExecuted,
            errors: this.metrics.errors,
            errorRate: errorRate,
            avgResponseTime: Math.round(avgResponseTime),
            memoryUsage: latestMemory ? {
                heapUsed: Math.round(latestMemory.heapUsed / 1024 / 1024), // MB
                heapTotal: Math.round(latestMemory.heapTotal / 1024 / 1024), // MB
                rss: Math.round(latestMemory.rss / 1024 / 1024) // MB
            } : null,
            timestamp: now
        };
    }

    // Get performance warnings
    getWarnings() {
        const warnings = [];
        const stats = this.getStats();

        if (stats.avgResponseTime > this.thresholds.responseTime) {
            warnings.push(`High response time: ${stats.avgResponseTime}ms`);
        }

        if (stats.memoryUsage && stats.memoryUsage.heapUsed * 1024 * 1024 > this.thresholds.memoryUsage) {
            warnings.push(`High memory usage: ${stats.memoryUsage.heapUsed}MB`);
        }

        if (stats.errorRate > this.thresholds.errorRate) {
            warnings.push(`High error rate: ${(stats.errorRate * 100).toFixed(2)}%`);
        }

        return warnings;
    }

    // Save metrics to file for analysis
    async saveMetrics() {
        try {
            const stats = this.getStats();
            const logData = {
                timestamp: new Date().toISOString(),
                ...stats,
                warnings: this.getWarnings()
            };

            const logPath = path.join(__dirname, '..', 'logs', 'performance.log');
            await fs.appendFile(logPath, JSON.stringify(logData) + '\n');
        } catch (error) {
            console.error('Failed to save performance metrics:', error);
        }
    }

    // Performance tips based on current metrics
    getOptimizationTips() {
        const stats = this.getStats();
        const tips = [];

        if (stats.avgResponseTime > 1000) {
            tips.push('Consider implementing caching for frequently accessed data');
        }

        if (stats.memoryUsage && stats.memoryUsage.heapUsed > 256) {
            tips.push('Memory usage is high - consider implementing data cleanup');
        }

        if (stats.guilds > 5000) {
            tips.push('Consider implementing bot sharding for better performance');
        }

        if (stats.errorRate > 0.02) {
            tips.push('Error rate is elevated - check logs for recurring issues');
        }

        return tips;
    }

    // Reset metrics (useful for debugging)
    reset() {
        this.metrics = {
            commandsExecuted: 0,
            errors: 0,
            responseTime: [],
            memoryUsage: [],
            guildsCount: 0,
            usersCount: 0,
            startTime: Date.now()
        };
    }
}

module.exports = new PerformanceMonitor(); 