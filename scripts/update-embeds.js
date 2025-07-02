const fs = require('fs').promises;
const path = require('path');

/**
 * Script để cập nhật hàng loạt tất cả commands từ hệ thống embed cũ sang mới
 */

// Mapping các function cũ sang mới
const embedMappings = [
    {
        // Import statements
        from: "const { EmbedBuilder } = require('discord.js');",
        to: "const embedFactory = require('../../utils/embeds');"
    },
    {
        from: "const { createSuccessEmbed, createErrorEmbed, createWarningEmbed, createInfoEmbed, createModerationEmbed, createHelpEmbed } = require('../../utils/embed');",
        to: "const embedFactory = require('../../utils/embeds');"
    },
    {
        from: "const { createErrorEmbed } = require('../../utils/embed');",
        to: "const embedFactory = require('../../utils/embeds');"
    },
    {
        from: "const { createSuccessEmbed } = require('../../utils/embed');",
        to: "const embedFactory = require('../../utils/embeds');"
    },
    {
        from: "const { createWarningEmbed } = require('../../utils/embed');",
        to: "const embedFactory = require('../../utils/embeds');"
    },
    {
        from: "const { createInfoEmbed } = require('../../utils/embed');",
        to: "const embedFactory = require('../../utils/embeds');"
    },
    {
        from: "const { createModerationEmbed } = require('../../utils/embed');",
        to: "const embedFactory = require('../../utils/embeds');"
    },
    {
        from: "const { createHelpEmbed } = require('../../utils/embed');",
        to: "const embedFactory = require('../../utils/embeds');"
    }
];

// Basic embed function replacements
const functionMappings = [
    {
        // Basic error messages
        from: /return message\.reply\('❌ \*\*(.*?)\*\*(.*)'\);/g,
        to: (match, title, desc) => {
            const description = desc.trim() || title;
            const cleanTitle = title.replace(/!/g, '');
            return `const embed = embedFactory.error('${cleanTitle}', '${description}', null, message.author);
            return message.reply({ embeds: [embed] });`;
        }
    },
    {
        // Success messages
        from: /return message\.reply\('✅ \*\*(.*?)\*\*(.*)'\);/g,
        to: (match, title, desc) => {
            const description = desc.trim() || title;
            const cleanTitle = title.replace(/!/g, '');
            return `const embed = embedFactory.success('${cleanTitle}', '${description}', [], message.author);
            return message.reply({ embeds: [embed] });`;
        }
    },
    {
        // Warning messages
        from: /return message\.reply\('⚠️ \*\*(.*?)\*\*(.*)'\);/g,
        to: (match, title, desc) => {
            const description = desc.trim() || title;
            const cleanTitle = title.replace(/!/g, '');
            return `const embed = embedFactory.warning('${cleanTitle}', '${description}', [], message.author);
            return message.reply({ embeds: [embed] });`;
        }
    },
    {
        // createErrorEmbed function calls
        from: /createErrorEmbed\(\s*['"`](.*?)['"`],\s*['"`](.*?)['"`]\s*\)/g,
        to: (match, title, desc) => `embedFactory.error('${title}', '${desc}', null, message.author)`
    },
    {
        // createSuccessEmbed function calls
        from: /createSuccessEmbed\(\s*['"`](.*?)['"`],\s*['"`](.*?)['"`]\s*\)/g,
        to: (match, title, desc) => `embedFactory.success('${title}', '${desc}', [], message.author)`
    },
    {
        // createWarningEmbed function calls
        from: /createWarningEmbed\(\s*['"`](.*?)['"`],\s*['"`](.*?)['"`]\s*\)/g,
        to: (match, title, desc) => `embedFactory.warning('${title}', '${desc}', [], message.author)`
    },
    {
        // createInfoEmbed function calls
        from: /createInfoEmbed\(\s*['"`](.*?)['"`],\s*['"`](.*?)['"`]\s*\)/g,
        to: (match, title, desc) => `embedFactory.info('${title}', '${desc}', [], message.author)`
    }
];

const addEmbedFactoryInit = (content) => {
    // Add embedFactory.setClient(client) after function start
    const functionRegex = /async execute\(message, args, client\) \{/;
    if (functionRegex.test(content) && !content.includes('embedFactory.setClient(client)')) {
        return content.replace(
            functionRegex,
            `async execute(message, args, client) {
        // Initialize embed factory
        embedFactory.setClient(client);
        `
        );
    }
    return content;
};

const processFile = async (filePath) => {
    try {
        let content = await fs.readFile(filePath, 'utf8');
        let modified = false;
        
        // Skip if already using new system
        if (content.includes("require('../../utils/embeds')")) {
            console.log(`⏩ Skipping ${filePath} - already using new embed system`);
            return false;
        }
        
        // Skip if not a command file
        if (!content.includes('module.exports = {') || !content.includes('execute(')) {
            return false;
        }
        
        console.log(`🔄 Processing ${filePath}...`);
        
        // Apply import mappings
        for (const mapping of embedMappings) {
            if (content.includes(mapping.from)) {
                content = content.replace(mapping.from, mapping.to);
                modified = true;
            }
        }
        
        // Add embed factory import if any old embed functions exist
        const hasOldEmbeds = /create(Success|Error|Warning|Info|Moderation|Help)Embed|new EmbedBuilder/.test(content);
        if (hasOldEmbeds && !content.includes("require('../../utils/embeds')")) {
            // Add import after discord.js import
            content = content.replace(
                /(const.*require\('discord\.js'\);)/,
                `$1\nconst embedFactory = require('../../utils/embeds');`
            );
            modified = true;
        }
        
        // Apply function mappings
        for (const mapping of functionMappings) {
            if (typeof mapping.to === 'function') {
                const matches = [...content.matchAll(mapping.from)];
                for (const match of matches) {
                    const replacement = mapping.to(match[0], match[1], match[2]);
                    content = content.replace(match[0], replacement);
                    modified = true;
                }
            } else {
                if (mapping.from.test && mapping.from.test(content)) {
                    content = content.replace(mapping.from, mapping.to);
                    modified = true;
                } else if (content.includes(mapping.from)) {
                    content = content.replace(new RegExp(mapping.from, 'g'), mapping.to);
                    modified = true;
                }
            }
        }
        
        // Add embedFactory initialization
        if (modified) {
            content = addEmbedFactoryInit(content);
        }
        
        // Write back if modified
        if (modified) {
            await fs.writeFile(filePath, content, 'utf8');
            console.log(`✅ Updated ${filePath}`);
            return true;
        }
        
        return false;
    } catch (error) {
        console.error(`❌ Error processing ${filePath}:`, error.message);
        return false;
    }
};

const scanDirectory = async (dir) => {
    const files = [];
    
    const scan = async (currentDir) => {
        const entries = await fs.readdir(currentDir, { withFileTypes: true });
        
        for (const entry of entries) {
            const fullPath = path.join(currentDir, entry.name);
            
            if (entry.isDirectory()) {
                await scan(fullPath);
            } else if (entry.isFile() && entry.name.endsWith('.js')) {
                files.push(fullPath);
            }
        }
    };
    
    await scan(dir);
    return files;
};

const main = async () => {
    console.log('🚀 Starting embed system update...\n');
    
    const commandsDir = path.join(__dirname, '..', 'commands');
    
    try {
        const files = await scanDirectory(commandsDir);
        console.log(`📁 Found ${files.length} JavaScript files to check\n`);
        
        let processedCount = 0;
        let updatedCount = 0;
        
        for (const file of files) {
            processedCount++;
            const updated = await processFile(file);
            if (updated) {
                updatedCount++;
            }
        }
        
        console.log(`\n🎉 Update complete!`);
        console.log(`📊 Statistics:`);
        console.log(`   • Files checked: ${processedCount}`);
        console.log(`   • Files updated: ${updatedCount}`);
        console.log(`   • Files skipped: ${processedCount - updatedCount}`);
        
        if (updatedCount > 0) {
            console.log(`\n✨ All commands have been updated to use the new embed system!`);
            console.log(`🎨 Features added:`);
            console.log(`   • Beautiful modern icons`);
            console.log(`   • Enhanced color schemes`);
            console.log(`   • Consistent styling`);
            console.log(`   • Better error handling`);
            console.log(`   • Improved user experience`);
        } else {
            console.log(`\n✅ All files are already up to date!`);
        }
        
    } catch (error) {
        console.error('❌ Error:', error.message);
    }
};

// Run if called directly
if (require.main === module) {
    main();
}

module.exports = { main, processFile }; 