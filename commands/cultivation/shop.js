const { SHOP_ITEMS, SPIRIT_STONES, getItemStorageInfo } = require('../../utils/cultivationData');
const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType } = require('discord.js');

module.exports = {
    name: 'shop',
    aliases: ['thuongthuy', 'thuong_thuy', 'store', 'market'],
    description: 'Thương thành tu tiên - Mua vũ khí, công pháp và nguyên liệu chế tạo',
    usage: '!shop hoặc !shop buy <item>',
    examples: [
        '!shop - Xem tất cả sản phẩm',
        '!shop buy vk1 - Mua vũ khí',
        '!shop buy cp1 - Mua công pháp'
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

        let userCurrency = 0;
        let currencyName = '';
        let currencyIcon = '';
        
        // Handle different currency types
        if (shopItem.currency === 'exp') {
            // Get user's EXP from cultivation data
            const cultivationUser = await client.prisma.cultivationUser.findUnique({
                where: { userId: userId }
            });
            userCurrency = cultivationUser ? cultivationUser.exp : 0;
            currencyName = 'EXP';
            currencyIcon = '⭐';
        } else {
            // Handle linh thạch currencies
            const currencyInfo = getItemStorageInfo(shopItem.currency);
            const currencyKey = `${currencyInfo.category}_${currencyInfo.actualId}`;
            
            const currencyItem = inventory.find(item => 
                `${item.itemType}_${item.itemId}` === currencyKey
            );
            userCurrency = currencyItem ? currencyItem.quantity : 0;
            
            const currencyData = SPIRIT_STONES[shopItem.currency];
            currencyName = currencyData.name;
            currencyIcon = currencyData.icon;
        }

        // Check if user has enough currency
        if (userCurrency < shopItem.price) {
            const errorEmbed = new EmbedBuilder()
                .setTitle('💸 Không đủ tiền!')
                .setDescription(`Không thể mua **${shopItem.icon} ${shopItem.name}**`)
                .setColor(0xff4444)
                .addFields([
                    {
                        name: '💰 Chi phí',
                        value: `${currencyIcon} **${shopItem.price}** ${currencyName}`,
                        inline: true
                    },
                    {
                        name: '🏦 Bạn có',
                        value: `${currencyIcon} **${userCurrency}** ${currencyName}`,
                        inline: true
                    },
                    {
                        name: '❌ Thiếu',
                        value: `${currencyIcon} **${shopItem.price - userCurrency}** ${currencyName}`,
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

        // Process purchase
        try {
            // Remove currency
            if (shopItem.currency === 'exp') {
                await client.prisma.cultivationUser.update({
                    where: { userId: userId },
                    data: { exp: { decrement: shopItem.price } }
                });
            } else {
                const currencyInfo = getItemStorageInfo(shopItem.currency);
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
            }

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
            const successEmbed = new EmbedBuilder()
                .setTitle('🛒 Mua hàng thành công!')
                .setDescription(`**${message.author.username}** đã mua **${shopItem.icon} ${shopItem.name}**`)
                .setColor(0x00ff88)
                .addFields([
                    {
                        name: '🎁 Đã nhận',
                        value: `${shopItem.icon} **${shopItem.name}** x1\n*${shopItem.description}*`,
                        inline: false
                    },
                    {
                        name: '💰 Đã trả',
                        value: `${currencyIcon} **${shopItem.price}** ${currencyName}`,
                        inline: true
                    },
                    {
                        name: '🏦 Còn lại',
                        value: `${currencyIcon} **${userCurrency - shopItem.price}** ${currencyName}`,
                        inline: true
                    }
                ])
                .setTimestamp()
                .setFooter({ 
                    text: message.author.username, 
                    iconURL: message.author.displayAvatarURL() 
                });

            await message.reply({ embeds: [successEmbed] });

        } catch (error) {
            console.error('Error processing purchase:', error);
            await message.reply('❌ Lỗi xử lý giao dịch! Vui lòng thử lại.');
        }
    },

    async showShop(message, category, client) {
        const userId = message.author.id;

        // Get user's currency
        const inventory = await client.prisma.userInventory.findMany({
            where: { userId: userId }
        });

        // Get user's cultivation data for EXP
        const cultivationUser = await client.prisma.cultivationUser.findUnique({
            where: { userId: userId }
        });

        const userCurrency = {};
        ['lt1', 'lt2', 'lt3', 'lt4'].forEach(ltId => {
            const currencyInfo = getItemStorageInfo(ltId);
            const key = `${currencyInfo.category}_${currencyInfo.actualId}`;
            const item = inventory.find(inv => `${inv.itemType}_${inv.itemId}` === key);
            userCurrency[ltId] = item ? item.quantity : 0;
        });
        
        // Add EXP currency
        userCurrency['exp'] = cultivationUser ? cultivationUser.exp : 0;

        // Create shop pages
        const pages = [];

        // Page 1: Overview & Balance
        const overviewEmbed = new EmbedBuilder()
            .setTitle('🏪 Thương Thành Tu Tiên')
            .setDescription('**Mua vũ khí, công pháp và nguyên liệu chế tạo**')
            .setColor(0xffd700)
            .setTimestamp()
            .setFooter({ 
                text: `Trang 1/3 • ${message.author.username}`, 
                iconURL: message.author.displayAvatarURL() 
            })
            .addFields([
                {
                    name: '💰 Số dư của bạn',
                    value: `⭐ **${userCurrency.exp.toLocaleString()}** EXP\n` +
                           Object.entries(userCurrency).filter(([id]) => id !== 'exp').map(([ltId, qty]) => {
                               const ltData = SPIRIT_STONES[ltId];
                               return `${ltData.icon} **${qty.toLocaleString()}** ${ltData.name}`;
                           }).join('\n'),
                    inline: false
                },
                {
                    name: '🛍️ Danh mục sản phẩm',
                    value: '• **Vũ khí** ⚔️�️�🔱 - Tăng sức mạnh chiến đấu (1000 EXP)\n' +
                           '• **Công pháp** 📜📃📋� - Tăng khả năng tu luyện (1000 EXP)\n' +
                           '• **Đan phương & Đan lò** �🏺 - Cần thiết để craft đan dược 🚧\n' +
                           '• **Tụ linh thạch** � - Cần thiết để craft linh thạch cao 🚧\n\n' +
                           '🚧 **Lưu ý:** Một số items craft đang phát triển, chưa có giá',
                    inline: false
                },
                {
                    name: '🎮 Cách sử dụng',
                    value: '• `!shop` - Xem tất cả sản phẩm\n' +
                           '• `!shop buy <id>` - Mua sản phẩm\n' +
                           '\n**Ví dụ mua:**\n' +
                           '• `!shop buy vk1` - Mua vũ khí\n' +
                           '• `!shop buy cp1` - Mua công pháp\n' +
                           '\n💡 **Dùng nút bên dưới để chuyển trang!**',
                    inline: false
                }
            ]);
        pages.push(overviewEmbed);

        // Page 2: Vũ khí và Công pháp
        const combatEmbed = new EmbedBuilder()
            .setTitle('⚔️ Vũ Khí & Công Pháp')
            .setDescription('**Vũ khí và công pháp - mua bằng EXP để test đột phá**')
            .setColor(0xff0000)
            .setTimestamp()
            .setFooter({ 
                text: `Trang 2/3 • ${message.author.username}`, 
                iconURL: message.author.displayAvatarURL() 
            });

        // Add vũ khí và công pháp
        Object.entries(SHOP_ITEMS).filter(([id, item]) => 
            id.startsWith('vk') || id.startsWith('cp')
        ).forEach(([id, item]) => {
            const userHas = userCurrency.exp || 0;
            const canAfford = userHas >= item.price;
            
            combatEmbed.addFields({
                name: `${item.icon} ${item.name} ${canAfford ? '✅' : '❌'}`,
                value: `**Giá:** ⭐ ${item.price.toLocaleString()} EXP\n` +
                       `**Có:** ⭐ ${userHas.toLocaleString()} EXP\n` +
                       `**Mô tả:** ${item.description}\n` +
                       `**Lệnh:** \`!shop buy ${id}\``,
                inline: true
            });
        });
        pages.push(combatEmbed);

        // Page 3: Đan phương, Đan lò, Tụ linh thạch
        const craftingEmbed = new EmbedBuilder()
            .setTitle('🔧 Nguyên Liệu Chế Tạo')
            .setDescription('**Đan phương, đan lò và tụ linh thạch - cần thiết để craft**')
            .setColor(0xff8800)
            .setTimestamp()
            .setFooter({ 
                text: `Trang 3/3 • ${message.author.username}`, 
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