const { exec } = require('child_process');
const { EmbedBuilder } = require('discord.js');

module.exports = {
    name: 'update',
    aliases: ['pull', 'git-update'],
    description: 'Cập nhật bot từ GitHub repository (chỉ owner)',
    usage: '!update [force]',
    examples: [
        '!update',
        '!update force'
    ],
    permissions: 'owner',
    guildOnly: false,
    category: 'management',

    async execute(message, args, client) {
        try {
            // Check if user is bot owner
            const ownerId = process.env.OWNER_ID || '463640391776894977'; // Default owner ID
            if (message.author.id !== ownerId) {
                return message.reply('❌ Chỉ owner bot mới có thể sử dụng lệnh này!');
            }

            const isForce = args[0] === 'force';
            
            // Send initial message
            const updateEmbed = new EmbedBuilder()
                .setTitle('🔄 Đang cập nhật bot...')
                .setDescription('Pulling code từ GitHub repository...')
                .setColor(0xffaa00)
                .addFields({
                    name: '📋 Các bước thực hiện',
                    value: '• Kiểm tra Git status\n• Pull code mới\n• Install dependencies\n• Restart bot',
                    inline: false
                })
                .setTimestamp();

            const msg = await message.reply({ embeds: [updateEmbed] });

            // Update process
            const updateSteps = [];

            // Step 1: Check git status
            updateSteps.push(new Promise((resolve) => {
                exec('git status --porcelain', (error, stdout, stderr) => {
                    if (error) {
                        resolve({ step: 'Git Status', success: false, output: stderr });
                    } else {
                        const hasChanges = stdout.trim().length > 0;
                        resolve({ 
                            step: 'Git Status', 
                            success: true, 
                            output: hasChanges ? 'Có thay đổi local' : 'Clean working tree',
                            hasChanges 
                        });
                    }
                });
            }));

            // Step 2: Stash changes if needed
            updateSteps.push(new Promise((resolve) => {
                if (isForce) {
                    exec('git stash', (error, stdout, stderr) => {
                        resolve({ 
                            step: 'Git Stash', 
                            success: !error, 
                            output: error ? stderr : 'Changes stashed' 
                        });
                    });
                } else {
                    resolve({ step: 'Git Stash', success: true, output: 'Skipped (no force)' });
                }
            }));

            // Step 3: Pull from GitHub
            updateSteps.push(new Promise((resolve) => {
                exec('git pull origin main', (error, stdout, stderr) => {
                    if (error) {
                        resolve({ step: 'Git Pull', success: false, output: stderr });
                    } else {
                        resolve({ 
                            step: 'Git Pull', 
                            success: true, 
                            output: stdout.includes('Already up to date') ? 'Đã up to date' : 'Pulled changes' 
                        });
                    }
                });
            }));

            // Step 4: Install dependencies
            updateSteps.push(new Promise((resolve) => {
                exec('npm install', (error, stdout, stderr) => {
                    if (error) {
                        resolve({ step: 'NPM Install', success: false, output: stderr });
                    } else {
                        resolve({ step: 'NPM Install', success: true, output: 'Dependencies updated' });
                    }
                });
            }));

            // Execute steps sequentially
            const results = [];
            for (const stepPromise of updateSteps) {
                const result = await stepPromise;
                results.push(result);
                
                // Update embed with progress
                const progressEmbed = new EmbedBuilder()
                    .setTitle('🔄 Update Progress')
                    .setColor(result.success ? 0x00ff00 : 0xff0000)
                    .setDescription(`**${result.step}:** ${result.success ? '✅' : '❌'} ${result.output}`)
                    .addFields({
                        name: '📊 Progress',
                        value: `${results.length}/${updateSteps.length} steps completed`,
                        inline: true
                    })
                    .setTimestamp();

                await msg.edit({ embeds: [progressEmbed] });

                // If step failed and not force, stop
                if (!result.success && !isForce) {
                    const errorEmbed = new EmbedBuilder()
                        .setTitle('❌ Update Failed')
                        .setDescription(`Update dừng tại bước: **${result.step}**`)
                        .addFields({
                            name: '💡 Giải pháp',
                            value: `• Dùng \`!update force\` để force update\n• Check logs và fix thủ công\n• Liên hệ developer`,
                            inline: false
                        })
                        .setColor(0xff0000)
                        .setTimestamp();
                    
                    return msg.edit({ embeds: [errorEmbed] });
                }
            }

            // All steps completed
            const allSuccess = results.every(r => r.success);
            
            const finalEmbed = new EmbedBuilder()
                .setTitle(allSuccess ? '✅ Update thành công!' : '⚠️ Update hoàn thành với warnings')
                .setDescription(allSuccess ? 
                    'Bot đã được cập nhật thành công từ GitHub!' : 
                    'Update hoàn thành nhưng có một số lỗi. Bot vẫn có thể hoạt động.')
                .setColor(allSuccess ? 0x00ff00 : 0xffaa00)
                .addFields({
                    name: '📋 Kết quả chi tiết',
                    value: results.map(r => `${r.success ? '✅' : '❌'} **${r.step}:** ${r.output}`).join('\n'),
                    inline: false
                })
                .setTimestamp();

            if (allSuccess) {
                finalEmbed.addFields({
                    name: '🔄 Restart Bot',
                    value: 'Bot sẽ tự động restart sau 5 giây...',
                    inline: false
                });

                await msg.edit({ embeds: [finalEmbed] });

                // Auto restart if using PM2
                setTimeout(() => {
                    exec('pm2 restart newbot', (error) => {
                        if (error) {
                            // Fallback restart
                            console.log('🔄 Restarting bot...');
                            process.exit(0);
                        }
                    });
                }, 5000);
            } else {
                await msg.edit({ embeds: [finalEmbed] });
            }

        } catch (error) {
            console.error('Error in update command:', error);
            
            const errorEmbed = new EmbedBuilder()
                .setTitle('❌ Update Error')
                .setDescription(`Lỗi trong quá trình update: ${error.message}`)
                .setColor(0xff0000)
                .setTimestamp();
                
            await message.reply({ embeds: [errorEmbed] });
        }
    }
}; 