const { ActivityType } = require('discord.js');
const logger = require('../utils/logger');
const embedFactory = require('../utils/embeds');

module.exports = {
    name: 'ready',
    once: true,
    async execute(client) {
        // Initialize embed factory with client
        embedFactory.setClient(client);
        
        // Beautiful ready message with ASCII art
        logger.ready(client);
        
        // Set bot activity
        client.user.setActivity('!help | Advanced Discord Management', { 
            type: ActivityType.Watching 
        });
        
        logger.info('Activity status set', 'Watching for commands and managing servers');
        
        // Start temp role manager
        if (client.tempRoleManager) {
            client.tempRoleManager.start();
            logger.info('TempRole Manager started', 'Background task for managing temporary roles');
        }
        
        logger.performance('Startup time', `${Date.now() - process.uptime() * 1000}`, 'ms');
    }
}; 