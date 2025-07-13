const { SPIRIT_STONES, SHOP_ITEMS } = require('../../utils/cultivationData');
const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType } = require('discord.js');

module.exports = {
    name: 'muahang',
    aliases: ['shop', 'mua', 'muahang'],
    description: 'Mua vật phẩm từ cửa hàng bằng linh thạch',
    usage: '!muahang [item] [quantity]',
    examples: [
        '!muahang - Xem cửa hàng',
        '!muahang dp1 5 - Mua 5 đan phương hạ phẩm',
        '!shop dl 1 - Mua 1 đan lò'
    ],
    permissions: 'everyone',
    guildOnly: true,
    category: 'cultivation',

    async execute(message, args, client) {
        try {
            const userId = message.author.id;
            const guildId = message.guild.id;

            // If no args, show shop
            if (!args[0]) {
                return this.showShop(message, client);
            }

            const itemId = args[0].toLowerCase();
            const quantity = parseInt(args[1]) || 1;

            if (quantity <= 0 || quantity > 100) {
                return message.reply('❌ Số lượng phải từ 1-100!');
            }

            // Check if item exists in shop
            const shopItem = SHOP_ITEMS[itemId];
            if (!shopItem) {
                return message.reply(`❌ Không tìm thấy item "${itemId}" trong cửa hàng! Sử dụng \`!muahang\` để xem danh sách.`);
            }

            // Get user data
            const cultivationUser = await client.prisma.cultivationUser.findUnique({
                where: {
                    userId: userId
                }
            });

            if (!cultivationUser) {
                return message.reply(`❌ **${message.author.username}** chưa bắt đầu tu luyện! Gửi tin nhắn trong server để bắt đầu nhận EXP.`);
            }

            // Calculate price (base price * quantity)
            const basePrice = this.getItemPrice(itemId);
            const totalPrice = basePrice * quantity;

            // Check if user has enough linh thạch
            const userLinhThach = await this.getUserLinhThach(client, userId);
            
            if (userLinhThach < totalPrice) {
                const missing = totalPrice - userLinhThach;
                return message.reply(`❌ **${message.author.username}** không đủ linh thạch!\n💎 Cần: **${totalPrice}** linh thạch\n💎 Có: **${userLinhThach}** linh thạch\n💎 Thiếu: **${missing}** linh thạch`);
            }

            // Show confirmation
            const confirmEmbed = new EmbedBuilder()
                .setTitle('�️ Xác nhận mua hàng')
                .setDescription(`**${message.author.username}** muốn mua **${shopItem.name}**`)
                .setColor(0x00ff88)
                .addFields([
                    {
                        name: '📦 Thông tin mua hàng',
                        value: `• **Vật phẩm:** ${shopItem.icon} ${shopItem.name}\n• **Số lượng:** ${quantity}\n• **Giá:** ${basePrice} linh thạch/cái\n• **Tổng tiền:** ${totalPrice} linh thạch`,
                        inline: false
                    },
                    {
                        name: '💰 Thông tin tài khoản',
                        value: `• **Linh thạch hiện tại:** ${userLinhThach}\n• **Linh thạch sau mua:** ${userLinhThach - totalPrice}`,
                        inline: false
                    }
                ])
                .setTimestamp()
                .setFooter({ 
                    text: `Mua Hàng • ${message.author.username}`, 
                    iconURL: message.author.displayAvatarURL() 
                });

            const confirmButtons = new ActionRowBuilder()
                .addComponents(
                    new ButtonBuilder()
                        .setCustomId('shop_confirm')
                        .setLabel('✅ Xác nhận mua')
                        .setStyle(ButtonStyle.Success),
                    new ButtonBuilder()
                        .setCustomId('shop_cancel')
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
                if (interaction.customId === 'shop_confirm') {
                    await this.performPurchase(interaction, client, userId, itemId, quantity, totalPrice, shopItem);
                } else if (interaction.customId === 'shop_cancel') {
                    const cancelEmbed = new EmbedBuilder()
                        .setTitle('❌ Đã hủy mua hàng')
                        .setDescription('Giao dịch mua hàng đã bị hủy.')
                        .setColor(0xff4444)
                        .setTimestamp()
                        .setFooter({ 
                            text: `Mua Hàng • ${message.author.username}`, 
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
                            .setCustomId('shop_confirm')
                            .setLabel('✅ Xác nhận mua')
                            .setStyle(ButtonStyle.Success)
                            .setDisabled(true),
                        new ButtonBuilder()
                            .setCustomId('shop_cancel')
                            .setLabel('❌ Hủy bỏ')
                            .setStyle(ButtonStyle.Danger)
                            .setDisabled(true)
                    );
                
                reply.edit({ components: [disabledButtons] }).catch(() => {});
            });

        } catch (error) {
            console.error('Error in muahang command:', error);
            await message.reply(`❌ Lỗi mua hàng: ${error.message}`);
        }
    },

    async performPurchase(interaction, client, userId, itemId, quantity, totalPrice, shopItem) {
        try {
            // Check again if user has enough linh thạch
            const userLinhThach = await this.getUserLinhThach(client, userId);
            
            if (userLinhThach < totalPrice) {
                const missing = totalPrice - userLinhThach;
                const errorEmbed = new EmbedBuilder()
                    .setTitle('❌ Không đủ linh thạch!')
                    .setDescription(`**${interaction.user.username}** không đủ linh thạch để mua hàng!`)
                    .setColor(0xff4444)
                    .addFields({
                        name: '💰 Thông tin tài khoản',
                        value: `• **Cần:** ${totalPrice} linh thạch\n• **Có:** ${userLinhThach} linh thạch\n• **Thiếu:** ${missing} linh thạch`,
                        inline: false
                    })
                    .setTimestamp()
                    .setFooter({ 
                        text: `Mua Hàng • ${interaction.user.username}`, 
                        iconURL: interaction.user.displayAvatarURL() 
                    });

                return await interaction.update({ 
                    embeds: [errorEmbed], 
                    components: [] 
                });
            }

            // Deduct linh thạch
            await client.prisma.userInventory.update({
                where: {
                    userId_itemType_itemId: {
                        userId: userId,
                        itemType: 'material',
                        itemId: 'lt1'
                    }
                },
                data: {
                    quantity: {
                        decrement: totalPrice
                    }
                }
            });

            // Add purchased item
            await client.prisma.userInventory.upsert({
                where: {
                    userId_itemType_itemId: {
                        userId: userId,
                        itemType: shopItem.category,
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
                    itemType: shopItem.category,
                    itemId: itemId,
                    quantity: quantity
                }
            });

            // Success embed
            const successEmbed = new EmbedBuilder()
                .setTitle('🎉 Mua Hàng Thành Công!')
                .setDescription(`**${interaction.user.username}** đã mua hàng thành công!`)
                .setColor(0x00ff00)
                .addFields([
                    {
                        name: '📦 Vật phẩm đã mua',
                        value: `• **${shopItem.icon} ${shopItem.name}** x${quantity}`,
                        inline: false
                    },
                    {
                        name: '💰 Chi phí',
                        value: `• **Đã trả:** ${totalPrice} linh thạch\n• **Còn lại:** ${userLinhThach - totalPrice} linh thạch`,
                        inline: false
                    }
                ])
                .setTimestamp()
                .setFooter({ 
                    text: `Mua Hàng • ${interaction.user.username}`, 
                    iconURL: interaction.user.displayAvatarURL() 
                });

            await interaction.update({ 
                embeds: [successEmbed], 
                components: [] 
            });

        } catch (error) {
            console.error('Error in performPurchase:', error);
            await interaction.update({ 
                content: `❌ Lỗi mua hàng: ${error.message}`,
                embeds: [],
                components: [] 
            });
        }
    },

    async showShop(message, client) {
        try {
            const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType } = require('discord.js');

            // Create shop pages
            const pages = [];
            
            // Page 1: Đan phương và đan lò
            const medicineEmbed = new EmbedBuilder()
                .setTitle('🏪 Cửa Hàng - Đan Phương & Đan Lò')
                .setDescription('**Danh sách đan phương và đan lò có thể mua:**')
                .setColor(0x00ff88)
                .setTimestamp()
                .setFooter({ 
                    text: `Trang 1/2 • Mua Hàng • ${message.author.username}`, 
                    iconURL: message.author.displayAvatarURL() 
                });

            const medicineItems = [
                {
                    id: 'dp1',
                    name: `${SHOP_ITEMS['dp1'].icon || SHOP_ITEMS['dp1'].fallbackIcon || '📜'} Hạ phẩm đan phương (dp1)`,
                    price: '100 linh thạch',
                    description: 'Đan phương cấp thấp, dùng để chế tạo đan dược'
                },
                {
                    id: 'dp2',
                    name: `${SHOP_ITEMS['dp2'].icon || SHOP_ITEMS['dp2'].fallbackIcon || '📃'} Trung phẩm đan phương (dp2)`,
                    price: '500 linh thạch',
                    description: 'Đan phương trung bình, dùng để chế tạo đan dược'
                },
                {
                    id: 'dp3',
                    name: `${SHOP_ITEMS['dp3'].icon || SHOP_ITEMS['dp3'].fallbackIcon || '📋'} Thượng phẩm đan phương (dp3)`,
                    price: '1000 linh thạch',
                    description: 'Đan phương cao cấp, dùng để chế tạo đan dược'
                },
                {
                    id: 'dp4',
                    name: `${SHOP_ITEMS['dp4'].icon || SHOP_ITEMS['dp4'].fallbackIcon || '📊'} Tiên phẩm đan phương (dp4)`,
                    price: '2000 linh thạch',
                    description: 'Đan phương tiên phẩm, dùng để chế tạo đan dược'
                },
                {
                    id: 'pdp',
                    name: `${SHOP_ITEMS['pdp'].icon || SHOP_ITEMS['pdp'].fallbackIcon || '📈'} Phối đan phương (pdp)`,
                    price: '5000 linh thạch',
                    description: 'Phối đan phương, dùng để chế tạo đan phương cao cấp'
                },
                {
                    id: 'dl',
                    name: `${SHOP_ITEMS['dl'].icon || SHOP_ITEMS['dl'].fallbackIcon || '🏺'} Đan lò (dl)`,
                    price: '1000 linh thạch',
                    description: 'Đan lò, dùng để chế tạo đan dược'
                }
            ];

            let medicineText = '';
            medicineItems.forEach(item => {
                medicineText += `**${item.name}**\n`;
                medicineText += `💰 Giá: ${item.price}\n`;
                medicineText += `📝 Mô tả: ${item.description}\n\n`;
            });

            medicineEmbed.addFields({
                name: '🧪 Đan Phương & Đan Lò',
                value: medicineText,
                inline: false
            });

            pages.push(medicineEmbed);

            // Page 2: Tụ linh thạch
            const materialEmbed = new EmbedBuilder()
                .setTitle('🏪 Cửa Hàng - Tụ Linh Thạch')
                .setDescription('**Danh sách tụ linh thạch có thể mua:**')
                .setColor(0x00ff88)
                .setTimestamp()
                .setFooter({ 
                    text: `Trang 2/2 • Mua Hàng • ${message.author.username}`, 
                    iconURL: message.author.displayAvatarURL() 
                });

            const materialItems = [
                {
                    id: 'tlt',
                    name: `${SHOP_ITEMS['tlt'].icon || SHOP_ITEMS['tlt'].fallbackIcon || '💫'} Tụ linh thạch (tlt)`,
                    price: '10000 linh thạch',
                    description: 'Tụ linh thạch, dùng để chế tạo linh thạch cao cấp'
                }
            ];

            let materialText = '';
            materialItems.forEach(item => {
                materialText += `**${item.name}**\n`;
                materialText += `💰 Giá: ${item.price}\n`;
                materialText += `📝 Mô tả: ${item.description}\n\n`;
            });

            materialEmbed.addFields({
                name: '💎 Tụ Linh Thạch',
                value: materialText,
                inline: false
            });

            pages.push(materialEmbed);

            // Create navigation buttons
            const createButtons = (currentPage, totalPages) => {
                const buttons = [];
                
                buttons.push(
                    new ButtonBuilder()
                        .setCustomId('shop_prev')
                        .setLabel('◀ Trước')
                        .setStyle(ButtonStyle.Secondary)
                        .setDisabled(currentPage === 0)
                );
                
                buttons.push(
                    new ButtonBuilder()
                        .setCustomId('shop_page')
                        .setLabel(`${currentPage + 1}/${totalPages}`)
                        .setStyle(ButtonStyle.Primary)
                        .setDisabled(true)
                );
                
                buttons.push(
                    new ButtonBuilder()
                        .setCustomId('shop_next')
                        .setLabel('Sau ▶')
                        .setStyle(ButtonStyle.Secondary)
                        .setDisabled(currentPage === totalPages - 1)
                );
                
                return new ActionRowBuilder().addComponents(buttons);
            };

            // Send initial message
            let currentPage = 0;
            const reply = await message.reply({ 
                embeds: [pages[currentPage]], 
                components: [createButtons(currentPage, pages.length)]
            });

            // Handle pagination
            const collector = reply.createMessageComponentCollector({
                componentType: ComponentType.Button,
                time: 300000, // 5 minutes
                filter: i => i.user.id === message.author.id
            });

            collector.on('collect', async interaction => {
                if (interaction.customId === 'shop_prev' && currentPage > 0) {
                    currentPage--;
                } else if (interaction.customId === 'shop_next' && currentPage < pages.length - 1) {
                    currentPage++;
                }

                await interaction.update({
                    embeds: [pages[currentPage]],
                    components: [createButtons(currentPage, pages.length)]
                });
            });

            collector.on('end', () => {
                // Disable all buttons when expired
                const disabledButtons = createButtons(currentPage, pages.length);
                disabledButtons.components.forEach(button => {
                    if (!button.data.disabled) button.setDisabled(true);
                });
                
                reply.edit({ 
                    embeds: [pages[currentPage]], 
                    components: [disabledButtons] 
                }).catch(() => {});
            });

        } catch (error) {
            console.error('Error in showShop:', error);
            await message.reply(`❌ Lỗi hiển thị cửa hàng: ${error.message}`);
        }
    },

    getItemPrice(itemId) {
        const prices = {
            'dp1': 100,   // Hạ phẩm đan phương
            'dp2': 500,   // Trung phẩm đan phương
            'dp3': 1000,  // Thượng phẩm đan phương
            'dp4': 2000,  // Tiên phẩm đan phương
            'pdp': 5000,  // Phối đan phương
            'dl': 1000,   // Đan lò
            'tlt': 10000  // Tụ linh thạch
        };
        
        return prices[itemId] || 0;
    },

    async getUserLinhThach(client, userId) {
        try {
            const linhThach = await client.prisma.userInventory.findUnique({
                where: {
                    userId_itemType_itemId: {
                        userId: userId,
                        itemType: 'material',
                        itemId: 'lt1'
                    }
                }
            });
            
            return linhThach ? linhThach.quantity : 0;
        } catch (error) {
            console.error('Error getting user linh thạch:', error);
            return 0;
        }
    }
}; 