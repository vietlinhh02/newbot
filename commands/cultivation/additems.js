const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType } = require('discord.js');

module.exports = {
    name: 'additems',
    aliases: ['additem', 'giveitem', 'testitem'],
    description: 'Thêm vật phẩm vào inventory để test (chỉ dành cho admin)',
    usage: '!additems [all] hoặc !additems [itemId] [quantity]',
    examples: [
        '!additems all - Thêm tất cả vật phẩm cần thiết để test',
        '!additems d1 10 - Thêm 10 đan dược cấp 1',
        '!additems lt1 50 - Thêm 50 linh thạch cấp 1'
    ],
    permissions: 'admin',
    guildOnly: true,
    category: 'cultivation',

    async execute(message, args, client) {
        try {
            // Check if user is admin
            if (!message.member.permissions.has('Administrator')) {
                return message.reply('❌ Chỉ có admin mới có thể sử dụng lệnh này!');
            }

            const userId = message.author.id;

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

            // If no args or "all", add all testing items
            if (!args[0] || args[0].toLowerCase() === 'all') {
                return this.addAllTestItems(message, client, userId);
            }

            // Add specific item
            const itemId = args[0];
            const quantity = parseInt(args[1]) || 1;

            // Validate item ID
            if (!this.isValidItemId(itemId)) {
                return message.reply('❌ ID vật phẩm không hợp lệ! Sử dụng:\n• **d1-d20** cho đan dược\n• **lt1-lt20** cho linh thạch');
            }

            // Determine item type
            let itemType = 'material';
            let itemName = 'Vật phẩm không xác định';
            
            if (itemId.startsWith('d')) {
                itemType = 'medicine';
                const level = itemId.substring(1);
                itemName = `Đan Dược Cấp ${level}`;
            } else if (itemId.startsWith('lt')) {
                itemType = 'material';
                const level = itemId.substring(2);
                itemName = `Linh Thạch Cấp ${level}`;
            }

            // Add item to inventory
            await client.prisma.userInventory.upsert({
                where: {
                    userId_itemType_itemId: {
                        userId: userId,
                        itemType: itemType,
                        itemId: itemId
                    }
                },
                update: {
                    quantity: {
                        increment: quantity
                    }
                },
                create: {
                    userId: userId,
                    itemType: itemType,
                    itemId: itemId,
                    quantity: quantity
                }
            });

            // Success message
            const successEmbed = new EmbedBuilder()
                .setTitle('✅ Thêm Vật Phẩm Thành Công!')
                .setDescription(`**${message.author.username}** đã nhận được vật phẩm test!`)
                .setColor(0x00ff00)
                .addFields([
                    {
                        name: '📦 Vật phẩm đã thêm',
                        value: `• **${itemName}** x${quantity.toLocaleString()}`,
                        inline: false
                    },
                                            {
                            name: '💡 Hướng dẫn tiếp theo',
                            value: '• Sử dụng `!tudo` để xem túi đồ\n• Sử dụng `!dotpha` để test đột phá\n• Sử dụng `!additems all` để thêm tất cả vật phẩm test',
                            inline: false
                        }
                ])
                .setTimestamp()
                .setFooter({ 
                    text: `Admin Command • ${message.author.username}`, 
                    iconURL: message.author.displayAvatarURL() 
                });

            await message.reply({ embeds: [successEmbed] });

        } catch (error) {
            console.error('Error in additems command:', error);
            await message.reply(`❌ Lỗi thêm vật phẩm: ${error.message}`);
        }
    },

    async addAllTestItems(message, client, userId) {
        const testItems = [
            // Đan dược từ cấp 1 đến 20
            { itemId: 'd1', itemType: 'medicine', quantity: 100, name: 'Đan Dược Cấp 1' },
            { itemId: 'd2', itemType: 'medicine', quantity: 100, name: 'Đan Dược Cấp 2' },
            { itemId: 'd3', itemType: 'medicine', quantity: 100, name: 'Đan Dược Cấp 3' },
            { itemId: 'd4', itemType: 'medicine', quantity: 100, name: 'Đan Dược Cấp 4' },
            { itemId: 'd5', itemType: 'medicine', quantity: 100, name: 'Đan Dược Cấp 5' },
            { itemId: 'd6', itemType: 'medicine', quantity: 100, name: 'Đan Dược Cấp 6' },
            { itemId: 'd7', itemType: 'medicine', quantity: 100, name: 'Đan Dược Cấp 7' },
            { itemId: 'd8', itemType: 'medicine', quantity: 100, name: 'Đan Dược Cấp 8' },
            { itemId: 'd9', itemType: 'medicine', quantity: 100, name: 'Đan Dược Cấp 9' },
            { itemId: 'd10', itemType: 'medicine', quantity: 100, name: 'Đan Dược Cấp 10' },
            { itemId: 'd11', itemType: 'medicine', quantity: 100, name: 'Đan Dược Cấp 11' },
            { itemId: 'd12', itemType: 'medicine', quantity: 100, name: 'Đan Dược Cấp 12' },
            { itemId: 'd13', itemType: 'medicine', quantity: 100, name: 'Đan Dược Cấp 13' },
            { itemId: 'd14', itemType: 'medicine', quantity: 100, name: 'Đan Dược Cấp 14' },
            { itemId: 'd15', itemType: 'medicine', quantity: 100, name: 'Đan Dược Cấp 15' },
            { itemId: 'd16', itemType: 'medicine', quantity: 100, name: 'Đan Dược Cấp 16' },
            { itemId: 'd17', itemType: 'medicine', quantity: 100, name: 'Đan Dược Cấp 17' },
            { itemId: 'd18', itemType: 'medicine', quantity: 100, name: 'Đan Dược Cấp 18' },
            { itemId: 'd19', itemType: 'medicine', quantity: 100, name: 'Đan Dược Cấp 19' },
            { itemId: 'd20', itemType: 'medicine', quantity: 100, name: 'Đan Dược Cấp 20' },
            
            // Linh thạch từ cấp 1 đến 20
            { itemId: 'lt1', itemType: 'material', quantity: 100, name: 'Linh Thạch Cấp 1' },
            { itemId: 'lt2', itemType: 'material', quantity: 100, name: 'Linh Thạch Cấp 2' },
            { itemId: 'lt3', itemType: 'material', quantity: 100, name: 'Linh Thạch Cấp 3' },
            { itemId: 'lt4', itemType: 'material', quantity: 100, name: 'Linh Thạch Cấp 4' },
            { itemId: 'lt5', itemType: 'material', quantity: 100, name: 'Linh Thạch Cấp 5' },
            { itemId: 'lt6', itemType: 'material', quantity: 100, name: 'Linh Thạch Cấp 6' },
            { itemId: 'lt7', itemType: 'material', quantity: 100, name: 'Linh Thạch Cấp 7' },
            { itemId: 'lt8', itemType: 'material', quantity: 100, name: 'Linh Thạch Cấp 8' },
            { itemId: 'lt9', itemType: 'material', quantity: 100, name: 'Linh Thạch Cấp 9' },
            { itemId: 'lt10', itemType: 'material', quantity: 100, name: 'Linh Thạch Cấp 10' },
            { itemId: 'lt11', itemType: 'material', quantity: 100, name: 'Linh Thạch Cấp 11' },
            { itemId: 'lt12', itemType: 'material', quantity: 100, name: 'Linh Thạch Cấp 12' },
            { itemId: 'lt13', itemType: 'material', quantity: 100, name: 'Linh Thạch Cấp 13' },
            { itemId: 'lt14', itemType: 'material', quantity: 100, name: 'Linh Thạch Cấp 14' },
            { itemId: 'lt15', itemType: 'material', quantity: 100, name: 'Linh Thạch Cấp 15' },
            { itemId: 'lt16', itemType: 'material', quantity: 100, name: 'Linh Thạch Cấp 16' },
            { itemId: 'lt17', itemType: 'material', quantity: 100, name: 'Linh Thạch Cấp 17' },
            { itemId: 'lt18', itemType: 'material', quantity: 100, name: 'Linh Thạch Cấp 18' },
            { itemId: 'lt19', itemType: 'material', quantity: 100, name: 'Linh Thạch Cấp 19' },
            { itemId: 'lt20', itemType: 'material', quantity: 100, name: 'Linh Thạch Cấp 20' }
        ];

        const confirmEmbed = new EmbedBuilder()
            .setTitle('📦 Thêm Tất Cả Vật Phẩm Test - Xác Nhận')
            .setDescription('Bạn có chắc chắn muốn thêm **tất cả** vật phẩm test vào inventory?')
            .setColor(0xffd700)
            .addFields([
                {
                    name: '📊 Danh sách vật phẩm sẽ thêm',
                    value: '• **Đan Dược Cấp 1-20** (mỗi loại 100 cái)\n• **Linh Thạch Cấp 1-20** (mỗi loại 100 cái)\n• **Tổng cộng:** 40 loại vật phẩm, 4000 cái',
                    inline: false
                },
                {
                    name: '⚠️ Lưu ý',
                    value: '• Đây là chức năng test dành cho admin\n• Vật phẩm sẽ được thêm vào inventory hiện tại\n• Có thể sử dụng để test tất cả các level đột phá',
                    inline: false
                }
            ])
            .setTimestamp()
            .setFooter({ 
                text: `Admin Command • ${message.author.username}`, 
                iconURL: message.author.displayAvatarURL() 
            });

        const confirmButtons = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('add_all_items_confirm')
                    .setLabel('✅ Xác nhận thêm tất cả')
                    .setStyle(ButtonStyle.Success),
                new ButtonBuilder()
                    .setCustomId('add_all_items_cancel')
                    .setLabel('❌ Hủy bỏ')
                    .setStyle(ButtonStyle.Danger)
            );

        const reply = await message.reply({ 
            embeds: [confirmEmbed], 
            components: [confirmButtons] 
        });

        // Handle button interactions
        const collector = reply.createMessageComponentCollector({
            componentType: ComponentType.Button,
            time: 60000, // 1 minute
            filter: i => i.user.id === message.author.id
        });

        collector.on('collect', async interaction => {
            if (interaction.customId === 'add_all_items_confirm') {
                // Add all test items
                const addedItems = [];
                
                for (const item of testItems) {
                    await client.prisma.userInventory.upsert({
                        where: {
                            userId_itemType_itemId: {
                                userId: userId,
                                itemType: item.itemType,
                                itemId: item.itemId
                            }
                        },
                        update: {
                            quantity: {
                                increment: item.quantity
                            }
                        },
                        create: {
                            userId: userId,
                            itemType: item.itemType,
                            itemId: item.itemId,
                            quantity: item.quantity
                        }
                    });
                    
                    addedItems.push(`• **${item.name}** x${item.quantity}`);
                }

                const successEmbed = new EmbedBuilder()
                    .setTitle('🌟 Thêm Tất Cả Vật Phẩm Test Thành Công!')
                    .setDescription(`**${message.author.username}** đã nhận được tất cả vật phẩm test!`)
                    .setColor(0x00ff00)
                    .addFields([
                        {
                            name: '📦 Vật phẩm đã thêm',
                            value: `**Đan Dược:** Cấp 1-20 (mỗi loại 100 cái)\n**Linh Thạch:** Cấp 1-20 (mỗi loại 100 cái)\n**Tổng cộng:** 40 loại, 4000 cái`,
                            inline: false
                        },
                        {
                            name: '💡 Hướng dẫn tiếp theo',
                            value: '• Sử dụng `!tudo` để xem túi đồ\n• Sử dụng `!dotpha` để test đột phá\n• Sử dụng `!adminbreakthrough` để đột phá nhanh\n• Sử dụng `!tuvi` để kiểm tra tu vi hiện tại',
                            inline: false
                        }
                    ])
                    .setTimestamp()
                    .setFooter({ 
                        text: `Admin Command • ${message.author.username}`, 
                        iconURL: message.author.displayAvatarURL() 
                    });

                await interaction.update({ 
                    embeds: [successEmbed], 
                    components: [] 
                });
            } else if (interaction.customId === 'add_all_items_cancel') {
                const cancelEmbed = new EmbedBuilder()
                    .setTitle('❌ Đã Hủy Thêm Vật Phẩm')
                    .setDescription('Đã hủy việc thêm tất cả vật phẩm test.')
                    .setColor(0xff4444)
                    .setTimestamp()
                    .setFooter({ 
                        text: `Admin Command • ${message.author.username}`, 
                        iconURL: message.author.displayAvatarURL() 
                    });

                await interaction.update({ 
                    embeds: [cancelEmbed], 
                    components: [] 
                });
            }
        });

        collector.on('end', () => {
            // Disable buttons when expired
            const disabledButtons = new ActionRowBuilder()
                .addComponents(
                    new ButtonBuilder()
                        .setCustomId('add_all_items_confirm')
                        .setLabel('✅ Xác nhận thêm tất cả')
                        .setStyle(ButtonStyle.Success)
                        .setDisabled(true),
                    new ButtonBuilder()
                        .setCustomId('add_all_items_cancel')
                        .setLabel('❌ Hủy bỏ')
                        .setStyle(ButtonStyle.Danger)
                        .setDisabled(true)
                );
            
            reply.edit({ components: [disabledButtons] }).catch(() => {});
        });
    },

    isValidItemId(itemId) {
        // Check if it's a valid medicine ID (d1-d20)
        if (itemId.startsWith('d')) {
            const level = parseInt(itemId.substring(1));
            return level >= 1 && level <= 20;
        }
        
        // Check if it's a valid material ID (lt1-lt20)
        if (itemId.startsWith('lt')) {
            const level = parseInt(itemId.substring(2));
            return level >= 1 && level <= 20;
        }
        
        return false;
    }
}; 