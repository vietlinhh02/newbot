const chalk = require('chalk');
const figlet = require('figlet');
const gradient = require('gradient-string');

class Logger {
    constructor() {
        this.prefix = chalk.gray(`[${new Date().toLocaleTimeString()}]`);
    }

    // Update prefix with current time
    updatePrefix() {
        this.prefix = chalk.gray(`[${new Date().toLocaleTimeString()}]`);
    }

    // Success message
    success(message, details = null) {
        this.updatePrefix();
        console.log(`${this.prefix} ${chalk.green('✅ SUCCESS')} ${chalk.white(message)}`);
        if (details) {
            console.log(`${' '.repeat(12)} ${chalk.gray('└─')} ${chalk.gray(details)}`);
        }
    }

    // Error message
    error(message, error = null) {
        this.updatePrefix();
        console.log(`${this.prefix} ${chalk.red('❌ ERROR')} ${chalk.white(message)}`);
        if (error) {
            console.log(`${' '.repeat(12)} ${chalk.gray('└─')} ${chalk.red(error.message || error)}`);
        }
    }

    // Warning message
    warn(message, details = null) {
        this.updatePrefix();
        console.log(`${this.prefix} ${chalk.yellow('⚠️  WARN')} ${chalk.white(message)}`);
        if (details) {
            console.log(`${' '.repeat(12)} ${chalk.gray('└─')} ${chalk.yellow(details)}`);
        }
    }

    // Info message
    info(message, details = null) {
        this.updatePrefix();
        console.log(`${this.prefix} ${chalk.blue('ℹ️  INFO')} ${chalk.white(message)}`);
        if (details) {
            console.log(`${' '.repeat(12)} ${chalk.gray('└─')} ${chalk.cyan(details)}`);
        }
    }

    // Debug message
    debug(message, data = null) {
        this.updatePrefix();
        console.log(`${this.prefix} ${chalk.magenta('🔍 DEBUG')} ${chalk.white(message)}`);
        if (data) {
            console.log(`${' '.repeat(12)} ${chalk.gray('└─')} ${chalk.gray(JSON.stringify(data, null, 2))}`);
        }
    }

    // Command execution log
    command(user, command, guild) {
        this.updatePrefix();
        console.log(`${this.prefix} ${chalk.cyan('📝 CMD')} ${chalk.white(user.tag)} used ${chalk.yellow(`!${command}`)} in ${chalk.green(guild.name)}`);
    }

    // Bot ready message with ASCII art
    ready(client) {
        console.clear();
        
        // ASCII art header
        const title = figlet.textSync('PeanHelp', {
            font: 'ANSI Shadow',
            horizontalLayout: 'default',
            verticalLayout: 'default'
        });
        
        console.log(gradient.rainbow(title));
        console.log();
        
        // Bot info
        console.log(chalk.cyan('═'.repeat(80)));
        console.log(`${chalk.green('🤖 Bot:')} ${chalk.white(client.user.tag)}`);
        console.log(`${chalk.blue('🌐 Servers:')} ${chalk.white(client.guilds.cache.size)}`);
        console.log(`${chalk.magenta('👥 Users:')} ${chalk.white(client.guilds.cache.reduce((acc, guild) => acc + guild.memberCount, 0).toLocaleString())}`);
        console.log(`${chalk.yellow('📝 Commands:')} ${chalk.white(client.commands?.size || 0)}`);
        console.log(`${chalk.red('💾 Memory:')} ${chalk.white((process.memoryUsage().heapUsed / 1024 / 1024).toFixed(1))}MB`);
        console.log(`${chalk.green('🚀 Ready at:')} ${chalk.white(new Date().toLocaleString())}`);
        console.log(chalk.cyan('═'.repeat(80)));
        console.log();
        
        this.success('Bot is online and ready!', `Serving ${client.guilds.cache.size} servers`);
    }

    // Database connection
    database(status, details = null) {
        this.updatePrefix();
        const icon = status === 'connected' ? '🟢' : status === 'error' ? '🔴' : '🟡';
        const color = status === 'connected' ? chalk.green : status === 'error' ? chalk.red : chalk.yellow;
        
        console.log(`${this.prefix} ${icon} ${color('DATABASE')} ${chalk.white(details || status)}`);
    }

    // API calls
    api(method, endpoint, status) {
        this.updatePrefix();
        const statusColor = status >= 200 && status < 300 ? chalk.green : status >= 400 ? chalk.red : chalk.yellow;
        console.log(`${this.prefix} ${chalk.blue('🌐 API')} ${chalk.white(method)} ${chalk.cyan(endpoint)} ${statusColor(status)}`);
    }

    // Performance metrics
    performance(metric, value, unit = '') {
        this.updatePrefix();
        const color = metric === 'ping' ? (value < 100 ? chalk.green : value < 300 ? chalk.yellow : chalk.red) : chalk.blue;
        console.log(`${this.prefix} ${chalk.magenta('⚡ PERF')} ${chalk.white(metric)}: ${color(value)}${unit}`);
    }

    // Security alerts
    security(event, details, severity = 'medium') {
        this.updatePrefix();
        const colors = {
            low: chalk.yellow,
            medium: chalk.yellow,
            high: chalk.red,
            critical: chalk.bgRed.white
        };
        const icons = {
            low: '🟡',
            medium: '🟠',
            high: '🔴',
            critical: '🚨'
        };
        
        console.log(`${this.prefix} ${icons[severity]} ${colors[severity]('SECURITY')} ${chalk.white(event)}`);
        console.log(`${' '.repeat(12)} ${chalk.gray('└─')} ${chalk.white(details)}`);
    }

    // Separator line
    separator() {
        console.log(chalk.gray('─'.repeat(80)));
    }

    // Table for structured data
    table(data, headers) {
        this.updatePrefix();
        console.log(`${this.prefix} ${chalk.blue('📊 TABLE')}`);
        
        // Simple table implementation
        if (headers) {
            console.log(chalk.cyan(headers.join(' | ')));
            console.log(chalk.gray('-'.repeat(headers.join(' | ').length)));
        }
        
        data.forEach(row => {
            console.log(chalk.white(row.join(' | ')));
        });
    }

    // Progress bar (simple implementation)
    progress(current, total, label = '') {
        const percentage = Math.round((current / total) * 100);
        const barLength = 20;
        const filledLength = Math.round((barLength * current) / total);
        const bar = '█'.repeat(filledLength) + '░'.repeat(barLength - filledLength);
        
        this.updatePrefix();
        console.log(`${this.prefix} ${chalk.blue('📈 PROGRESS')} ${label} [${chalk.green(bar)}] ${percentage}% (${current}/${total})`);
    }
}

// Export singleton instance
module.exports = new Logger(); 