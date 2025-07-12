const { SHOP_ITEMS, SPIRIT_STONES, getItemStorageInfo } = require('../../utils/cultivationData');
const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType } = require('discord.js');

module.exports = {
    name: 'shop',
    aliases: ['thuongthuy', 'thuong_thuy', 'store', 'market'],
    description: 'Thương thành tu tiên - Mua nguyên liệu chế tạo bằng linh thạch',
    usage: '!shop hoặc !shop buy <item>',
    examples: [
        '!shop - Xem tất cả nguyên liệu',
        '!shop buy dp1 - Mua đan phương',
        '!shop buy dl - Mua đan lò', 
        '!shop buy tlt - Mua tụ linh thạch'
    ],
    permissions: 'everyone',
    guildOnly: true,
    category: 'cultivation',

    async execute(message, args, client) {
        try {
            const userId = message.author.id;

            // Check if user exists
            const cultivationUser = await client.prisma.cultivationUser.findUnique({
                where: { userId: userId }
            });

            if (!cultivationUser) {
                return message.reply(`❌ **${message.author.username}** chưa bắt đầu tu luyện! Gửi tin nhắn trong server để bắt đầu nhận EXP.`);
            }

            // Handle buy command
            if (args[0] === 'buy' && args[1]) {
                return await this.handlePurchase(message, args[1], client);
            }

            // Show shop interface
            return await this.showShop(message, args[0], client);

        } catch (error) {
            console.error('Error in shop command:', error);
            await message.reply(`❌ Lỗi shop: ${error.message}`);
        }
    },

    async handlePurchase(message, itemId, client) {
        const userId = message.author.id;
        itemId = itemId.toLowerCase();

        // Validate item exists
        const shopItem = SHOP_ITEMS[itemId];
        if (!shopItem) {
            return message.reply(`❌ Không tìm thấy item "${itemId}" trong shop! Dùng \`!shop\` để xem danh sách.`);
        }

        // Check if item has price (for items without price yet)
        if (!shopItem.price || !shopItem.currency) {
            return message.reply(`💰 **${shopItem.icon} ${shopItem.name}** hiện tại chưa có giá! Vui lòng quay lại sau.`);
        }

        // Get user inventory
        const inventory = await client.prisma.userInventory.findMany({
            where: { userId: userId }
        });

        // Get currency item info
        const currencyInfo = getItemStorageInfo(shopItem.currency);
        const currencyKey = `${currencyInfo.category}_${currencyInfo.actualId}`;
        
        // Find user's currency amount
        const currencyItem = inventory.find(item => 
            `${item.itemType}_${item.itemId}` === currencyKey
        );
        const userCurrency = currencyItem ? currencyItem.quantity : 0;

        // Check if user has enough currency
        if (userCurrency < shopItem.price) {
            const currencyData = SPIRIT_STONES[shopItem.currency];
            const errorEmbed = new EmbedBuilder()
                .setTitle('💸 Không đủ tiền!')
                .setDescription(`Không thể mua **${shopItem.icon} ${shopItem.name}**`)
                .setColor(0xff4444)
                .addFields([
                    {
                        name: '💰 Chi phí',
                        value: `${currencyData.icon} **${shopItem.price}** ${currencyData.name}`,
                        inline: true
                    },
                    {
                        name: '🏦 Bạn có',
                        value: `${currencyData.icon} **${userCurrency}** ${currencyData.name}`,
                        inline: true
                    },
                    {
                        name: '❌ Thiếu',
                        value: `${currencyData.icon} **${shopItem.price - userCurrency}** ${currencyData.name}`,
                        inline: true
                    }
                ])
                .setTimestamp()
                .setFooter({ 
                    text: message.author.username, 
                    iconURL: message.author.displayAvatarURL() 
                });

            return message.reply({ embeds: [errorEmbed] });
        }

        // Show purchase confirmation
        const currencyData = SPIRIT_STONES[shopItem.currency];
        const confirmEmbed = new EmbedBuilder()
            .setTitle('🛒 Xác nhận mua hàng')
            .setDescription(`Bạn có chắc chắn muốn mua **${shopItem.icon} ${shopItem.name}**?`)
            .setColor(0x00ff88)
            .addFields([
                {
                    name: '🎁 Sản phẩm',
                    value: `${shopItem.icon} **${shopItem.name}**\n*${shopItem.description}*`,
                    inline: false
                },
                {
                    name: '💰 Chi phí',
                    value: `${currencyData.icon} **${shopItem.price.toLocaleString()}** ${currencyData.name}`,
                    inline: true
                },
                {
                    name: '🏦 Số dư hiện tại',
                    value: `${currencyData.icon} **${userCurrency.toLocaleString()}** ${currencyData.name}`,
                    inline: true
                },
                {
                    name: '💳 Số dư sau mua',
                    value: `${currencyData.icon} **${(userCurrency - shopItem.price).toLocaleString()}** ${currencyData.name}`,
                    inline: true
                }
            ])
            .setTimestamp()
            .setFooter({ 
                text: `Shop • ${message.author.username}`, 
                iconURL: message.author.displayAvatarURL() 
            });

        const confirmButtons = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('shop_buy_confirm')
                    .setLabel('💳 Xác nhận mua')
                    .setStyle(ButtonStyle.Success),
                new ButtonBuilder()
                    .setCustomId('shop_buy_cancel')
                    .setLabel('❌ Hủy bỏ')
                    .setStyle(ButtonStyle.Secondary)
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
            if (interaction.customId === 'shop_buy_confirm') {
                await this.processPurchase(interaction, client, userId, itemId, shopItem, currencyInfo, userCurrency);
            } else if (interaction.customId === 'shop_buy_cancel') {
                const cancelEmbed = new EmbedBuilder()
                    .setTitle('❌ Đã hủy mua hàng')
                    .setDescription('Giao dịch mua hàng đã bị hủy.')
                    .setColor(0xff4444)
                    .setTimestamp()
                    .setFooter({ 
                        text: `Shop • ${message.author.username}`, 
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
                        .setCustomId('shop_buy_confirm')
                        .setLabel('💳 Xác nhận mua')
                        .setStyle(ButtonStyle.Success)
                        .setDisabled(true),
                    new ButtonBuilder()
                        .setCustomId('shop_buy_cancel')
                        .setLabel('❌ Hủy bỏ')
                        .setStyle(ButtonStyle.Secondary)
                        .setDisabled(true)
                );
            
            reply.edit({ components: [disabledButtons] }).catch(() => {});
        });

        return; // Exit early since we're handling the purchase in the collector
    },

    async processPurchase(interaction, client, userId, itemId, shopItem, currencyInfo, userCurrency) {
        try {
            // Remove currency
            await client.prisma.userInventory.update({
                where: {
                    userId_itemType_itemId: {
                        userId: userId,
                        itemType: currencyInfo.category,
                        itemId: currencyInfo.actualId
                    }
                },
                data: {
                    quantity: { decrement: shopItem.price }
                }
            });

            // Add purchased item
            const itemStorageInfo = getItemStorageInfo(itemId);
            await client.prisma.userInventory.upsert({
                where: {
                    userId_itemType_itemId: {
                        userId: userId,
                        itemType: itemStorageInfo.category,
                        itemId: itemStorageInfo.actualId
                    }
                },
                update: {
                    quantity: { increment: 1 }
                },
                create: {
                    userId: userId,
                    itemType: itemStorageInfo.category,
                    itemId: itemStorageInfo.actualId,
                    quantity: 1
                }
            });

            // Success message
            const currencyData = SPIRIT_STONES[shopItem.currency];
            const successEmbed = new EmbedBuilder()
                .setTitle('🛒 Mua hàng thành công!')
                .setDescription(`**${interaction.user.username}** đã mua **${shopItem.icon} ${shopItem.name}**`)
                .setColor(0x00ff88)
                .addFields([
                    {
                        name: '🎁 Đã nhận',
                        value: `${shopItem.icon} **${shopItem.name}** x1\n*${shopItem.description}*`,
                        inline: false
                    },
                    {
                        name: '💰 Đã trả',
                        value: `${currencyData.icon} **${shopItem.price.toLocaleString()}** ${currencyData.name}`,
                        inline: true
                    },
                    {
                        name: '🏦 Còn lại',
                        value: `${currencyData.icon} **${(userCurrency - shopItem.price).toLocaleString()}** ${currencyData.name}`,
                        inline: true
                    }
                ])
                .setTimestamp()
                .setFooter({ 
                    text: `Shop • ${interaction.user.username}`, 
                    iconURL: interaction.user.displayAvatarURL() 
                });

            await interaction.update({ 
                embeds: [successEmbed], 
                components: [] 
            });

        } catch (error) {
            console.error('Error processing purchase:', error);
            await interaction.update({ 
                content: '❌ Lỗi xử lý giao dịch! Vui lòng thử lại.',
                embeds: [],
                components: [] 
            });
        }
    },

    async showShop(message, category, client) {
        const userId = message.author.id;

        // Get user's currency
        const inventory = await client.prisma.userInventory.findMany({
            where: { userId: userId }
        });

        const userCurrency = {};
        ['lt1', 'lt2', 'lt3', 'lt4'].forEach(ltId => {
            const currencyInfo = getItemStorageInfo(ltId);
            const key = `${currencyInfo.category}_${currencyInfo.actualId}`;
            const item = inventory.find(inv => `${inv.itemType}_${inv.itemId}` === key);
            userCurrency[ltId] = item ? item.quantity : 0;
        });

        // Create shop pages
        const pages = [];

        // Page 1: Overview & Balance
        const overviewEmbed = new EmbedBuilder()
            .setTitle('🏪 Thương Thành Tu Tiên')
            .setDescription('**Mua nguyên liệu chế tạo bằng linh thạch**')
            .setColor(0xffd700)
            .setTimestamp()
            .setFooter({ 
                text: `Trang 1/2 • ${message.author.username}`, 
                iconURL: message.author.displayAvatarURL() 
            })
            .addFields([
                {
                    name: '💰 Số dư linh thạch của bạn',
                    value: Object.entries(userCurrency).map(([ltId, qty]) => {
                        const ltData = SPIRIT_STONES[ltId];
                        return `${ltData.icon} **${qty.toLocaleString()}** ${ltData.name}`;
                    }).join('\n'),
                    inline: false
                },
                {
                    name: '🛍️ Danh mục sản phẩm',
                    value: '• **Đan phương & Đan lò** 📜🏺 - Cần thiết để craft đan dược 🚧\n' +
                           '• **Tụ linh thạch** 💫 - Cần thiết để craft linh thạch cao 🚧\n' +
                           '• **Phối đan phương** 📈 - Craft đan phương cao cấp 🚧\n' +
                           '🚧 **Lưu ý:** Một số items đang phát triển, chưa có giá',
                    inline: false
                },
                {
                    name: '🎮 Cách sử dụng',
                    value: '• `!shop` - Xem tất cả nguyên liệu\n' +
                           '• `!shop buy <id>` - Mua nguyên liệu (chỉ items có giá)\n' +
                           '\n**Ví dụ mua:**\n' +
                           '• `!shop buy dp1` - Mua đan phương\n' +
                           '• `!shop buy dl` - Mua đan lò\n' +
                           '• `!shop buy tlt` - Mua tụ linh thạch',

                    inline: false
                }
            ]);
        pages.push(overviewEmbed);

        // Page 2: Đan phương, Đan lò, Tụ linh thạch
        const craftingEmbed = new EmbedBuilder()
            .setTitle('🔧 Nguyên Liệu Chế Tạo')
            .setDescription('**Đan phương, đan lò và tụ linh thạch - cần thiết để craft**')
            .setColor(0xff8800)
            .setTimestamp()
            .setFooter({ 
                text: `Trang 2/2 • ${message.author.username}`, 
                iconURL: message.author.displayAvatarURL() 
            });

        // Add đan phương, đan lò, tụ linh thạch
        Object.entries(SHOP_ITEMS).filter(([id, item]) => 
            id.startsWith('dp') || id === 'pdp' || id === 'dl' || id === 'tlt'
        ).forEach(([id, item]) => {
            // Handle items without price
            if (!item.price || !item.currency) {
                craftingEmbed.addFields({
                    name: `${item.icon} ${item.name} 🚧`,
                    value: `**Giá:** Chưa có giá (sắp ra mắt)\n` +
                           `**Mô tả:** ${item.description}\n` +
                           `**Trạng thái:** Đang phát triển`,
                    inline: true
                });
                return;
            }

            const currencyData = SPIRIT_STONES[item.currency];
            const userHas = userCurrency[item.currency] || 0;
            const canAfford = userHas >= item.price;
            
            craftingEmbed.addFields({
                name: `${item.icon} ${item.name} ${canAfford ? '✅' : '❌'}`,
                value: `**Giá:** ${currencyData.icon} ${item.price.toLocaleString()} ${currencyData.name}\n` +
                       `**Có:** ${currencyData.icon} ${userHas.toLocaleString()}\n` +
                       `**Mô tả:** ${item.description}\n` +
                       `**Lệnh:** \`!shop buy ${id}\``,
                inline: true
            });
        });
        pages.push(craftingEmbed);



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
            
            if (currentPage !== 0) {
                buttons.push(
                    new ButtonBuilder()
                        .setCustomId('shop_home')
                        .setLabel('🏠 Tổng quan')
                        .setStyle(ButtonStyle.Success)
                );
            }
            
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
            } else if (interaction.customId === 'shop_home') {
                currentPage = 0;
            }

            await interaction.update({
                embeds: [pages[currentPage]],
                components: [createButtons(currentPage, pages.length)]
            });
        });

        collector.on('end', () => {
            const disabledButtons = createButtons(currentPage, pages.length);
            disabledButtons.components.forEach(button => {
                if (!button.data.disabled) button.setDisabled(true);
            });
            
            reply.edit({ 
                embeds: [pages[currentPage]], 
                components: [disabledButtons] 
            }).catch(() => {});
        });
    }
}; 