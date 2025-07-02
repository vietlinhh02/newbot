const { Client, GatewayIntentBits } = require('discord.js');
const fs = require('fs');
const path = require('path');
const readline = require('readline');
require('dotenv').config();

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildEmojisAndStickers
    ]
});

const ICON_DIR = path.join(__dirname, '../icon');

// Mapping tên file thành tên emoji dễ đọc
const EMOJI_NAMES = {
    'HappySmile02.png': 'happy_smile',
    'HelloPolice.png': 'hello_police', 
    'hmmmNaruhudoWakaranai.png': 'thinking_face',
    'DirtyLaugh.png': 'dirty_laugh',
    'Menhara_approve.png': 'approve',
    'VictorGlare.png': 'victor_glare',
    'zt_sip_boba.png': 'sip_boba',
    'zt_gun.png': 'gun_point',
    'tomioka_angry.png': 'angry_face',
    'tomioka_happy.png': 'happy_face',
    'tomioka_little_mad.png': 'little_mad',
    'carefreegojo.png': 'carefree',
    'shinobu_pat_tomioka.png': 'pat_head'
    // Auto-generate cho các file khác
};

function createReadlineInterface() {
    return readline.createInterface({
        input: process.stdin,
        output: process.stdout
    });
}

async function selectGuild(guilds) {
    console.log('\n📋 Available servers:');
    const guildArray = Array.from(guilds.values());
    
    guildArray.forEach((guild, index) => {
        console.log(`${index + 1}. ${guild.name} (ID: ${guild.id}) - ${guild.memberCount} members`);
    });

    // Auto-select PeanHelp server if available
    const peanHelpGuild = guildArray.find(guild => guild.name.toLowerCase().includes('peanhelp'));
    if (peanHelpGuild) {
        console.log(`\n🎯 Found PeanHelp server: ${peanHelpGuild.name}`);
        console.log('🤖 Auto-selecting PeanHelp server for bot setup...');
        return peanHelpGuild;
    }

    // If no PeanHelp server, let user choose
    const rl = createReadlineInterface();
    
    return new Promise((resolve) => {
        rl.question('\n❓ Chọn server (nhập số 1-' + guildArray.length + '): ', (answer) => {
            rl.close();
            
            const choice = parseInt(answer) - 1;
            if (choice >= 0 && choice < guildArray.length) {
                const selectedGuild = guildArray[choice];
                console.log(`✅ Selected: ${selectedGuild.name}`);
                resolve(selectedGuild);
            } else {
                console.log('❌ Invalid choice, using first server...');
                resolve(guildArray[0]);
            }
        });
    });
}

async function checkBotPermissions(guild) {
    try {
        const botMember = await guild.members.fetch(client.user.id);
        const hasPermission = botMember.permissions.has('ManageEmojisAndStickers');
        
        console.log(`🔑 Bot permissions in ${guild.name}:`);
        console.log(`   Manage Emojis: ${hasPermission ? '✅' : '❌'}`);
        console.log(`   Admin: ${botMember.permissions.has('Administrator') ? '✅' : '❌'}`);
        
        return hasPermission;
    } catch (error) {
        console.error('❌ Cannot check bot permissions:', error.message);
        return false;
    }
}

async function uploadCustomEmojis() {
    try {
        console.log('🚀 Starting PeanHelp custom emoji upload process...');
        
        // Auto-detect guild
        const guilds = client.guilds.cache;
        if (guilds.size === 0) {
            console.error('❌ Bot is not in any servers!');
            return;
        }

        const guild = await selectGuild(guilds);
        await guild.fetch(); // Get full guild data

        console.log(`\n📍 Selected guild: ${guild.name} (${guild.memberCount} members)`);
        
        // Check bot permissions
        const hasPermission = await checkBotPermissions(guild);
        if (!hasPermission) {
            console.error('\n❌ Bot lacks "Manage Emojis and Stickers" permission!');
            console.error('📝 To fix this:');
            console.error('   1. Go to Server Settings → Roles');
            console.error('   2. Find bot\'s role');
            console.error('   3. Enable "Manage Emojis and Stickers"');
            console.error('   4. Run script again');
            return;
        }

        // Get current emojis
        await guild.emojis.fetch();
        const currentEmojis = guild.emojis.cache;
        const peanHelpEmojis = currentEmojis.filter(emoji => emoji.name.startsWith('peanhelp_'));
        
        console.log(`\n📊 Current emojis: ${currentEmojis.size}/${guild.maximumEmojis || 50}`);
        console.log(`📊 PeanHelp emojis: ${peanHelpEmojis.size}`);

        // Read icon directory
        const iconFiles = fs.readdirSync(ICON_DIR).filter(file => file.endsWith('.png'));
        console.log(`📁 Found ${iconFiles.length} PNG files in /icon directory`);

        // Check if we have space
        const availableSlots = (guild.maximumEmojis || 50) - currentEmojis.size;
        const newEmojisNeeded = iconFiles.length - peanHelpEmojis.size;
        
        if (newEmojisNeeded > availableSlots) {
            console.warn(`⚠️  Need ${newEmojisNeeded} slots but only ${availableSlots} available!`);
            console.log('📝 Consider removing some existing emojis first.');
        }

        let uploadCount = 0;
        let skipCount = 0;
        let errorCount = 0;

        console.log('\n📤 Starting upload process...');

        for (const file of iconFiles) {
            try {
                // Generate emoji name
                const baseName = file.replace('.png', '').toLowerCase();
                const emojiName = EMOJI_NAMES[file] || baseName.replace(/[^a-z0-9_]/g, '_');
                const fullEmojiName = `peanhelp_${emojiName}`;
                
                // Check if emoji already exists
                const existingEmoji = currentEmojis.find(emoji => emoji.name === fullEmojiName);
                
                if (existingEmoji) {
                    console.log(`⏭️  ${file} → :${existingEmoji.name}: (exists)`);
                    skipCount++;
                    continue;
                }

                // Check guild emoji limit
                if (currentEmojis.size + uploadCount >= (guild.maximumEmojis || 50)) {
                    console.warn(`⚠️  Reached emoji limit (${guild.maximumEmojis || 50}), stopping upload`);
                    break;
                }

                // Upload emoji
                const iconPath = path.join(ICON_DIR, file);
                const imageBuffer = fs.readFileSync(iconPath);
                
                console.log(`📤 ${file} → :${fullEmojiName}:`);
                
                const emoji = await guild.emojis.create({
                    attachment: imageBuffer,
                    name: fullEmojiName,
                    reason: 'PeanHelp Bot custom icons upload'
                });

                console.log(`✅ Uploaded :${emoji.name}: (ID: ${emoji.id})`);
                uploadCount++;

                // Rate limit delay
                await new Promise(resolve => setTimeout(resolve, 1200));
                
            } catch (error) {
                console.error(`❌ Failed to upload ${file}:`, error.message);
                errorCount++;
            }
        }

        console.log('\n📊 Upload Summary:');
        console.log(`✅ Uploaded: ${uploadCount} new emojis`);
        console.log(`⏭️  Skipped: ${skipCount} existing emojis`);
        console.log(`❌ Errors: ${errorCount} failed uploads`);
        console.log(`📋 Total: ${uploadCount + skipCount + errorCount}/${iconFiles.length} processed`);

        // Generate emoji mapping for customEmbeds.js
        if (uploadCount > 0 || peanHelpEmojis.size > 0) {
            console.log('\n🔧 Generated Custom Emoji Mapping (copy this to customEmbeds.js):');
            console.log('```javascript');
            console.log('const CUSTOM_EMOJI_MAP = {');
            
            const updatedEmojis = await guild.emojis.fetch();
            const allPeanHelpEmojis = updatedEmojis.filter(emoji => emoji.name.startsWith('peanhelp_'));
            
            allPeanHelpEmojis.forEach(emoji => {
                const key = emoji.name.replace('peanhelp_', '').toUpperCase();
                console.log(`    '${key}': '<:${emoji.name}:${emoji.id}>',`);
            });
            console.log('};');
            console.log('```');

            console.log(`\n🎉 Successfully set up ${allPeanHelpEmojis.size} custom emojis for PeanHelp Bot!`);
        } else {
            console.log('\n📝 No new emojis uploaded. All icons already exist as custom emojis.');
        }

    } catch (error) {
        console.error('💥 Error in upload process:', error);
    }
}

client.once('ready', async () => {
    console.log(`🤖 Bot logged in as ${client.user.tag}`);
    console.log(`📊 Connected to ${client.guilds.cache.size} server(s)`);
    
    await uploadCustomEmojis();
    
    console.log('\n🏁 Upload process completed!');
    console.log('📝 Next step: Copy the emoji mapping to customEmbeds.js');
    process.exit(0);
});

client.login(process.env.TOKEN); 