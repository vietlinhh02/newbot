require('dotenv').config();
const { Client, GatewayIntentBits, Collection } = require('discord.js');
const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');
const logger = require('./utils/logger'); // Import logger

// Initialize Prisma Client
const prisma = new PrismaClient();

// Create Discord Client with necessary intents
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildBans,
        GatewayIntentBits.GuildVoiceStates,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMessageReactions,
        GatewayIntentBits.GuildInvites
    ]
});

// Initialize command collection
client.commands = new Collection();
client.prisma = prisma;

// Initialize performance utilities
const PingOptimizer = require('./utils/pingOptimizer');
client.pingOptimizer = new PingOptimizer(client);

// Initialize temp role manager
const TempRoleManager = require('./utils/tempRoleManager');
client.tempRoleManager = new TempRoleManager(client);

// Load commands from directories
function loadCommands() {
    const commandsBaseDir = path.join(__dirname, 'commands');
    if (!fs.existsSync(commandsBaseDir)) {
        logger.warn('Thư mục commands không tồn tại, tạo thư mục...');
        fs.mkdirSync(commandsBaseDir, { recursive: true });
        return;
    }

    const commandFolders = fs.readdirSync(commandsBaseDir).filter(folder => {
        const folderPath = path.join(commandsBaseDir, folder);
        return fs.statSync(folderPath).isDirectory();
    });
    
    for (const folder of commandFolders) {
        const commandsPath = path.join(commandsBaseDir, folder);
        const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));
        
        for (const file of commandFiles) {
            const filePath = path.join(commandsPath, file);
            try {
                const command = require(filePath);
                
                if ('name' in command && 'execute' in command) {
                    client.commands.set(command.name, command);
                    logger.info(`Loaded command: ${command.name}`, `Category: ${folder}`);
                } else {
                    logger.warn(`Command ${file} thiếu thuộc tính 'name' hoặc 'execute'`, `File: ${filePath}`);
                }
            } catch (error) {
                logger.error(`Lỗi khi load command ${file}`, error);
            }
        }
    }
}

// Load events
function loadEvents() {
    const eventsPath = path.join(__dirname, 'events');
    
    if (!fs.existsSync(eventsPath)) {
        logger.warn('Thư mục events không tồn tại, tạo thư mục...');
        fs.mkdirSync(eventsPath, { recursive: true });
        return;
    }
    
    const eventFiles = fs.readdirSync(eventsPath).filter(file => file.endsWith('.js'));
    
    for (const file of eventFiles) {
        const filePath = path.join(eventsPath, file);
        try {
            const event = require(filePath);
            
            if (event.once) {
                client.once(event.name, (...args) => event.execute(...args, client));
            } else {
                client.on(event.name, (...args) => event.execute(...args, client));
            }
            
            logger.info(`Loaded event: ${event.name}`);
        } catch (error) {
            logger.error(`Lỗi khi load event ${file}`, error);
        }
    }
}

// Initialize bot
async function initializeBot() {
    try {
        logger.info('Khởi động Discord Bot...');
        
        // Load commands and events
        loadCommands();
        loadEvents();
        
        // Connect to database
        await prisma.$connect();
        logger.info('Kết nối database thành công!');
        
        // Login to Discord
        await client.login(process.env.TOKEN);
        
    } catch (error) {
        logger.error('Lỗi khi khởi động bot', error);
        process.exit(1);
    }
}

// Handle process termination
process.on('SIGINT', async () => {
    logger.info('Đang tắt bot...');
    
    try {
        // Stop temp role manager
        if (client.tempRoleManager) {
            client.tempRoleManager.stop();
            logger.info('TempRole Manager stopped');
        }
        
        await prisma.$disconnect();
        logger.info('Ngắt kết nối database thành công!');
        
        client.destroy();
        logger.info('Ngắt kết nối Discord thành công!');
        
        process.exit(0);
    } catch (error) {
        logger.error('Lỗi khi tắt bot', error);
        process.exit(1);
    }
});

// Handle unhandled rejections
process.on('unhandledRejection', error => {
    logger.error('Unhandled promise rejection', error);
});

process.on('uncaughtException', error => {
    logger.error('Uncaught exception', error);
    process.exit(1);
});

// Start the bot
initializeBot();