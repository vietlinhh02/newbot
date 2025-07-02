const embedFactory = require('../../utils/embeds');

module.exports = {
    name: 'emojis',
    aliases: ['emojilist', 'emojiid'],
    description: 'Hiển thị emoji trong server hoặc tìm ID emoji cụ thể',
    usage: '!emojis [search] hoặc !emojis z1-z4',
    examples: [
        '!emojis',
        '!emojis z1',
        '!emojis thuoc',
        '!emojis z1-z4'
    ],
    permissions: 'member',
    guildOnly: true,
    category: 'management',
    
    async execute(message, args, client) {
        // Initialize embed factory
        embedFactory.setClient(client);
        
        try {
            const guild = message.guild;
            const emojis = guild.emojis.cache;
            
            if (emojis.size === 0) {
                const embed = embedFactory.warning(
                    'Không có emoji!',
                    'Server này chưa có emoji tùy chỉnh.',
                    [],
                    message.author
                );
                return message.reply({ embeds: [embed] });
            }

            // Nếu có args, tìm kiếm emoji cụ thể
            if (args.length > 0) {
                const searchTerm = args[0].toLowerCase();
                
                // Nếu tìm kiếm z1-z4 (emoji thuốc)
                if (searchTerm === 'z1-z4' || searchTerm === 'thuoc' || searchTerm === 'medicine') {
                    return this.findMedicineEmojis(message, emojis, embedFactory);
                }
                
                // Tìm emoji theo tên
                return this.searchEmoji(message, emojis, searchTerm, embedFactory);
            }
            
            // Hiển thị tất cả emoji
            return this.showAllEmojis(message, emojis, embedFactory);
            
        } catch (error) {
            console.error('Lỗi emoji:', error);
            await message.reply('❌ Không thể lấy emoji!');
        }
    },

    // Tìm emoji thuốc z1-z4
    async findMedicineEmojis(message, emojis, embedFactory) {
        const medicineEmojis = [];
        
        // Tìm emoji z1, z2, z3, z4
        ['z1', 'z2', 'z3', 'z4'].forEach(medicineName => {
            const foundEmoji = emojis.find(emoji => 
                emoji.name.toLowerCase().includes(medicineName) ||
                emoji.name.toLowerCase().includes(`thuoc${medicineName.charAt(1)}`) ||
                emoji.name.toLowerCase().includes(`medicine${medicineName.charAt(1)}`)
            );
            
            if (foundEmoji) {
                medicineEmojis.push({
                    name: medicineName.toUpperCase(),
                    emoji: foundEmoji,
                    id: foundEmoji.id,
                    format: `<:${foundEmoji.name}:${foundEmoji.id}>`
                });
            }
        });

        if (medicineEmojis.length === 0) {
            const embed = embedFactory.warning(
                'Không tìm thấy emoji thuốc!',
                'Không tìm thấy emoji z1, z2, z3, z4 trong server.\n' +
                'Hãy đảm bảo emoji đã được upload với tên chứa z1, z2, z3, z4.',
                [],
                message.author
            );
            return message.reply({ embeds: [embed] });
        }

        // Tạo embed hiển thị kết quả
        let description = '**🧪 Emoji Thuốc - ID và Format:**\n\n';
        
        medicineEmojis.forEach(med => {
            description += `**${med.name}:** ${med.emoji}\n`;
            description += `├ **ID:** \`${med.id}\`\n`;
            description += `└ **Format:** \`${med.format}\`\n\n`;
        });

        description += '💡 **Cách sử dụng:**\n';
        description += '• Copy ID để dùng trong code\n';
        description += '• Copy Format để dùng trong message\n';
        description += '• Dùng `!emojis <tên>` để tìm emoji khác';

        const embed = embedFactory.info(
            `🧪 Medicine Emojis (${medicineEmojis.length}/4)`,
            description,
            [],
            message.author
        );

        await message.reply({ embeds: [embed] });
    },

    // Tìm kiếm emoji theo tên
    async searchEmoji(message, emojis, searchTerm, embedFactory) {
        const foundEmojis = emojis.filter(emoji => 
            emoji.name.toLowerCase().includes(searchTerm)
        );

        if (foundEmojis.size === 0) {
            const embed = embedFactory.warning(
                'Không tìm thấy!',
                `Không tìm thấy emoji nào chứa "${searchTerm}".`,
                [],
                message.author
            );
            return message.reply({ embeds: [embed] });
        }

        let description = `**🔍 Kết quả tìm kiếm cho "${searchTerm}":**\n\n`;
        
        // Giới hạn 10 emoji đầu tiên
        Array.from(foundEmojis.values()).slice(0, 10).forEach(emoji => {
            description += `**${emoji.name}:** ${emoji}\n`;
            description += `├ **ID:** \`${emoji.id}\`\n`;
            description += `└ **Format:** \`<:${emoji.name}:${emoji.id}>\`\n\n`;
        });

        if (foundEmojis.size > 10) {
            description += `*Hiển thị 10/${foundEmojis.size} emoji đầu tiên*`;
        }

        const embed = embedFactory.info(
            `🔍 Search Results (${foundEmojis.size})`,
            description,
            [],
            message.author
        );

        await message.reply({ embeds: [embed] });
    },

    // Hiển thị tất cả emoji
    async showAllEmojis(message, emojis, embedFactory) {
        // Giới hạn 15 emoji để tránh lag
        const emojiList = Array.from(emojis.values()).slice(0, 15);
        
        let description = '**📋 Danh sách Emoji Server:**\n\n';
        
        emojiList.forEach(emoji => {
            description += `${emoji} \`${emoji.name}\` - ID: \`${emoji.id}\`\n`;
        });

        if (emojis.size > 15) {
            description += `\n*Hiển thị 15/${emojis.size} emoji đầu tiên*\n`;
            description += `Dùng \`!emojis <tên>\` để tìm emoji cụ thể`;
        }

        description += '\n\n💡 **Lệnh hữu ích:**\n';
        description += '• `!emojis z1-z4` - Xem emoji thuốc\n';
        description += '• `!emojis <tên>` - Tìm kiếm emoji';

        const embed = embedFactory.info(
            `📋 Server Emojis (${emojis.size})`,
            description,
            [],
            message.author
        );

        await message.reply({ embeds: [embed] });
    }
}; 