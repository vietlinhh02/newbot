module.exports = {
  apps: [{
    name: 'phong-ung-bang-bot',
    script: 'index.js',
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '1G',
    env: {
      NODE_ENV: 'production'
    },
    env_production: {
      NODE_ENV: 'production'
    },
    // Restart bot if it crashes
    min_uptime: '10s',
    max_restarts: 5,
    // Logging
    log_file: './logs/combined.log',
    out_file: './logs/out.log',
    error_file: './logs/error.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    // Performance
    node_args: '--max-old-space-size=1024',
    // Auto restart schedule (optional)
    cron_restart: '0 4 * * *', // Restart at 4 AM daily
    // Graceful shutdown
    kill_timeout: 5000,
    // Source control integration
    post_update: ['npm install', 'npx prisma generate'],
    // Health monitoring
    health_check_url: 'http://localhost:3000/health',
    health_check_grace_period: 3000,
    // Ignore watching specific files/folders
    ignore_watch: [
      'node_modules',
      'logs',
      '.git',
      'prisma/migrations',
      '*.log'
    ],
    // Environment variables from .env file
    env_file: '.env'
  }]
}; 