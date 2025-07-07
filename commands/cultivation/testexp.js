const { EmbedBuilder } = require('discord.js');

module.exports = {
    name: 'testexp',
    aliases: ['addexp', 'giveexp'],
    description: 'Thêm EXP để test (chỉ dành cho admin)',
    usage: '!testexp [amount]',
    examples: [
        '!testexp 9999 - Thêm 9999 EXP',
        '!testexp - Thêm 9999 EXP (mặc định)'
    ],
    permissions: 'admin',
    guildOnly: true,
    category: 'cultivation',

    async execute(message, args, client) {
        try {
            // Check if user is admin (you can modify this check as needed)
            if (!message.member.permissions.has('Administrator')) {
                return message.reply('❌ Chỉ có admin mới có thể sử dụng lệnh này!');
            }

            const userId = message.author.id;
            const expAmount = args[0] ? parseInt(args[0]) : 9999;

            if (isNaN(expAmount) || expAmount <= 0) {
                return message.reply('❌ Số EXP phải là một số dương!');
            }

            // Get or create user cultivation data
            let cultivationUser = await client.prisma.cultivationUser.findUnique({
                where: { userId: userId }
            });

            if (!cultivationUser) {
                cultivationUser = await client.prisma.cultivationUser.create({
                    data: {
                        userId: userId,
                        exp: 0,
                        currentLevel: 'Phàm Nhân',
                        messageCount: 0,
                        voiceTime: 0
                    }
                });
            }

            // Add EXP
            const newExp = cultivationUser.exp + expAmount;
            
            await client.prisma.cultivationUser.update({
                where: { userId: userId },
                data: { exp: newExp }
            });

            const embed = new EmbedBuilder()
                .setTitle('⚡ Test EXP - Thành công!')
                .setDescription(`**${message.author.username}** đã nhận được **${expAmount.toLocaleString()} EXP** để test!`)
                .setColor(0x00ff00)
                .addFields([
                    {
                        name: '📊 Thông tin EXP',
                        value: `• **EXP trước:** ${cultivationUser.exp.toLocaleString()}\n• **EXP thêm:** +${expAmount.toLocaleString()}\n• **EXP sau:** ${newExp.toLocaleString()}`,
                        inline: false
                    },
                    {
                        name: '🎯 Level hiện tại',
                        value: cultivationUser.currentLevel,
                        inline: true
                    },
                    {
                        name: '💡 Hướng dẫn',
                        value: 'Sử dụng `!breakthrough` để thử đột phá lên level cao hơn!',
                        inline: false
                    }
                ])
                .setTimestamp()
                .setFooter({ 
                    text: `Test Command • ${message.author.username}`, 
                    iconURL: message.author.displayAvatarURL() 
                });

            await message.reply({ embeds: [embed] });

        } catch (error) {
            console.error('Error in testexp command:', error);
            await message.reply(`❌ Lỗi khi thêm EXP: ${error.message}`);
        }
    }
};
