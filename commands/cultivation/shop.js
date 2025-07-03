const { SHOP_ITEMS, SPIRIT_STONES, getItemStorageInfo } = require('../../utils/cultivationData');
const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType } = require('discord.js');

module.exports = {
    name: 'shop',
    aliases: ['thuongthuy', 'thuong_thuy', 'store', 'market'],
    description: 'Thương thành tu tiên - Mua linh đan, linh dược và sách bằng linh thạch',
    usage: '!shop [category] hoặc !shop buy <item>',
    examples: [
        '!shop - Xem tất cả',
        '!shop pills - Xem linh đan',
        '!shop medicine - Xem linh dược', 
        '!shop books - Xem sách',
        '!shop buy ld1 - Mua linh đan'
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

        // Process purchase
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
                        value: `${currencyData.icon} **${shopItem.price}** ${currencyData.name}`,
                        inline: true
                    },
                    {
                        name: '🏦 Còn lại',
                        value: `${currencyData.icon} **${userCurrency - shopItem.price}** ${currencyData.name}`,
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
            .setDescription('**Mua linh đan, linh dược và sách bằng linh thạch**')
            .setColor(0xffd700)
            .setTimestamp()
            .setFooter({ 
                text: `Trang 1/5 • ${message.author.username}`, 
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
                    value: '• **Linh đan** 🟢🔵🟣🟡 - Tăng EXP và đột phá\n' +
                           '• **Linh dược** 💚💙💜💛 - Hồi phục và tăng sức mạnh\n' +
                           '• **Sách kỹ thuật** 📗📘📙📕📓 - Học võ công và bí kíp\n' +
                           '• **Bảo điển** 📜📋 - Kinh sách thần thoại cực hiếm',
                    inline: false
                },
                {
                    name: '🎮 Cách sử dụng',
                    value: '• `!shop` - Xem tất cả sản phẩm\n' +
                           '• `!shop pills` - Chỉ xem linh đan\n' +
                           '• `!shop medicine` - Chỉ xem linh dược\n' +
                           '• `!shop books` - Chỉ xem sách\n' +
                           '• `!shop buy <id>` - Mua sản phẩm\n' +
                           '\n💡 **Dùng nút bên dưới để chuyển trang!**',
                    inline: false
                }
            ]);
        pages.push(overviewEmbed);

        // Page 2: Linh đan
        const pillsEmbed = new EmbedBuilder()
            .setTitle('🟢 Linh Đan - Tăng EXP & Đột Phá')
            .setDescription('**Linh đan giúp tăng EXP tu luyện và tỉ lệ đột phá**')
            .setColor(0x44ff44)
            .setTimestamp()
            .setFooter({ 
                text: `Trang 2/5 • ${message.author.username}`, 
                iconURL: message.author.displayAvatarURL() 
            });

        Object.entries(SHOP_ITEMS).filter(([id, item]) => id.startsWith('ld')).forEach(([id, item]) => {
            const currencyData = SPIRIT_STONES[item.currency];
            const userHas = userCurrency[item.currency];
            const canAfford = userHas >= item.price;
            
            pillsEmbed.addFields({
                name: `${item.icon} ${item.name} ${canAfford ? '✅' : '❌'}`,
                value: `**Giá:** ${currencyData.icon} ${item.price.toLocaleString()} ${currencyData.name}\n` +
                       `**Có:** ${currencyData.icon} ${userHas.toLocaleString()}\n` +
                       `**Mô tả:** ${item.description}\n` +
                       `**Lệnh:** \`!shop buy ${id}\``,
                inline: true
            });
        });
        pages.push(pillsEmbed);

        // Page 3: Linh dược
        const medicineEmbed = new EmbedBuilder()
            .setTitle('💚 Linh Dược - Hồi Phục & Tăng Sức Mạnh')
            .setDescription('**Linh dược hồi phục sức khỏe và tăng sức mạnh tu luyện**')
            .setColor(0x44ddff)
            .setTimestamp()
            .setFooter({ 
                text: `Trang 3/5 • ${message.author.username}`, 
                iconURL: message.author.displayAvatarURL() 
            });

        Object.entries(SHOP_ITEMS).filter(([id, item]) => id.startsWith('ly')).forEach(([id, item]) => {
            const currencyData = SPIRIT_STONES[item.currency];
            const userHas = userCurrency[item.currency];
            const canAfford = userHas >= item.price;
            
            medicineEmbed.addFields({
                name: `${item.icon} ${item.name} ${canAfford ? '✅' : '❌'}`,
                value: `**Giá:** ${currencyData.icon} ${item.price.toLocaleString()} ${currencyData.name}\n` +
                       `**Có:** ${currencyData.icon} ${userHas.toLocaleString()}\n` +
                       `**Mô tả:** ${item.description}\n` +
                       `**Lệnh:** \`!shop buy ${id}\``,
                inline: true
            });
        });
        pages.push(medicineEmbed);

        // Page 4: Sách
        const booksEmbed = new EmbedBuilder()
            .setTitle('📚 Sách Kỹ Thuật - Võ Công & Bí Kíp')
            .setDescription('**Sách dạy võ công, kỹ thuật và bí kíp tu tiên**')
            .setColor(0xaa44ff)
            .setTimestamp()
            .setFooter({ 
                text: `Trang 4/5 • ${message.author.username}`, 
                iconURL: message.author.displayAvatarURL() 
            });

        Object.entries(SHOP_ITEMS).filter(([id, item]) => id.startsWith('book')).forEach(([id, item]) => {
            const currencyData = SPIRIT_STONES[item.currency];
            const userHas = userCurrency[item.currency];
            const canAfford = userHas >= item.price;
            
            booksEmbed.addFields({
                name: `${item.icon} ${item.name} ${canAfford ? '✅' : '❌'}`,
                value: `**Giá:** ${currencyData.icon} ${item.price.toLocaleString()} ${currencyData.name}\n` +
                       `**Có:** ${currencyData.icon} ${userHas.toLocaleString()}\n` +
                       `**Mô tả:** ${item.description}\n` +
                       `**Lệnh:** \`!shop buy ${id}\``,
                inline: true
            });
        });
        pages.push(booksEmbed);

        // Page 5: Bảo điển
        const scrollsEmbed = new EmbedBuilder()
            .setTitle('📜 Bảo Điển - Kinh Sách Thần Thoại')
            .setDescription('**Những bảo điển huyền thoại với sức mạnh khủng khiếp**')
            .setColor(0xff6600)
            .setTimestamp()
            .setFooter({ 
                text: `Trang 5/5 • ${message.author.username}`, 
                iconURL: message.author.displayAvatarURL() 
            });

        Object.entries(SHOP_ITEMS).filter(([id, item]) => id.startsWith('scroll')).forEach(([id, item]) => {
            const currencyData = SPIRIT_STONES[item.currency];
            const userHas = userCurrency[item.currency];
            const canAfford = userHas >= item.price;
            
            scrollsEmbed.addFields({
                name: `${item.icon} ${item.name} ${canAfford ? '✅' : '❌'}`,
                value: `**Giá:** ${currencyData.icon} ${item.price.toLocaleString()} ${currencyData.name}\n` +
                       `**Có:** ${currencyData.icon} ${userHas.toLocaleString()}\n` +
                       `**Mô tả:** ${item.description}\n` +
                       `**Lệnh:** \`!shop buy ${id}\``,
                inline: false
            });
        });

        scrollsEmbed.addFields({
            name: '⚠️ Lưu ý về Bảo Điển',
            value: '• **Cực kỳ đắt đỏ** - Chỉ dành cho cao thủ\n' +
                   '• **Sức mạnh khủng khiếp** - Có thể thay đổi vận mệnh\n' +
                   '• **Hiếm có khó tìm** - Cơ hội duy nhất trong đời\n' +
                   '• **Yêu cầu cao** - Cần rất nhiều linh thạch cấp cao',
            inline: false
        });
        pages.push(scrollsEmbed);

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