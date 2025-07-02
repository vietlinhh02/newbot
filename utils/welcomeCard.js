const { createCanvas, loadImage, registerFont } = require('canvas');
const { AttachmentBuilder } = require('discord.js');

class WelcomeCardGenerator {
    constructor() {
        this.width = 800;
        this.height = 400;
        this.avatarSize = 150;
        
        // Try to register fonts if available
        try {
            // You can add custom fonts here if needed
            // registerFont('./assets/fonts/font.ttf', { family: 'CustomFont' });
        } catch (error) {
            // Use default fonts if custom fonts not available
        }
    }

    async createWelcomeCard(user, guild, options = {}) {
        const {
            backgroundUrl = null,
            welcomeText = `Welcome to ${guild.name}!`,
            subtitle = `You are member #${guild.memberCount}`,
            textColor = '#ffffff',
            accentColor = '#5865f2'
        } = options;

        // Create canvas
        const canvas = createCanvas(this.width, this.height);
        const ctx = canvas.getContext('2d');

        try {
            // Draw background
            await this.drawBackground(ctx, backgroundUrl);
            
            // Draw overlay for better text readability
            this.drawOverlay(ctx);
            
            // Draw avatar in center
            await this.drawAvatar(ctx, user.displayAvatarURL({ extension: 'png', size: 256 }));
            
            // Draw welcome text
            this.drawWelcomeText(ctx, welcomeText, subtitle, textColor, accentColor, user.username);
            
            // Draw decorative elements
            this.drawDecorations(ctx, accentColor);
            
            // Return as Discord attachment
            const buffer = canvas.toBuffer('image/png');
            return new AttachmentBuilder(buffer, { name: 'welcome.png' });
            
        } catch (error) {
            console.error('Error creating welcome card:', error);
            return null;
        }
    }

    async drawBackground(ctx, backgroundUrl) {
        if (backgroundUrl) {
            try {
                const background = await loadImage(backgroundUrl);
                
                // Calculate scaling to fit canvas while maintaining aspect ratio
                const scale = Math.max(this.width / background.width, this.height / background.height);
                const scaledWidth = background.width * scale;
                const scaledHeight = background.height * scale;
                
                // Center the image
                const x = (this.width - scaledWidth) / 2;
                const y = (this.height - scaledHeight) / 2;
                
                ctx.drawImage(background, x, y, scaledWidth, scaledHeight);
            } catch (error) {
                console.error('Error loading background image:', error);
                // Fallback to gradient background
                this.drawGradientBackground(ctx);
            }
        } else {
            // Default gradient background
            this.drawGradientBackground(ctx);
        }
    }

    drawGradientBackground(ctx) {
        // Create beautiful gradient background
        const gradient = ctx.createLinearGradient(0, 0, this.width, this.height);
        gradient.addColorStop(0, '#667eea');
        gradient.addColorStop(0.5, '#764ba2');
        gradient.addColorStop(1, '#f093fb');
        
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, this.width, this.height);
        
        // Add some texture/pattern
        ctx.globalAlpha = 0.1;
        for (let i = 0; i < 50; i++) {
            ctx.beginPath();
            ctx.arc(
                Math.random() * this.width,
                Math.random() * this.height,
                Math.random() * 3 + 1,
                0,
                Math.PI * 2
            );
            ctx.fillStyle = '#ffffff';
            ctx.fill();
        }
        ctx.globalAlpha = 1;
    }

    drawOverlay(ctx) {
        // Semi-transparent overlay for better text readability
        const gradient = ctx.createRadialGradient(
            this.width / 2, this.height / 2, 0,
            this.width / 2, this.height / 2, this.width / 2
        );
        gradient.addColorStop(0, 'rgba(0, 0, 0, 0.1)');
        gradient.addColorStop(1, 'rgba(0, 0, 0, 0.6)');
        
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, this.width, this.height);
    }

    async drawAvatar(ctx, avatarUrl) {
        try {
            const avatar = await loadImage(avatarUrl);
            
            // Draw avatar circle
            const centerX = this.width / 2;
            const centerY = this.height / 2 - 30; // Slightly above center
            const radius = this.avatarSize / 2;
            
            // Draw avatar border
            ctx.beginPath();
            ctx.arc(centerX, centerY, radius + 8, 0, Math.PI * 2);
            ctx.fillStyle = '#ffffff';
            ctx.fill();
            
            // Clip to circle for avatar
            ctx.beginPath();
            ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
            ctx.clip();
            
            // Draw avatar
            ctx.drawImage(
                avatar,
                centerX - radius,
                centerY - radius,
                this.avatarSize,
                this.avatarSize
            );
            
            // Reset clipping
            ctx.restore();
            ctx.save();
            
        } catch (error) {
            console.error('Error loading avatar:', error);
            // Draw default avatar placeholder
            this.drawDefaultAvatar(ctx);
        }
    }

    drawDefaultAvatar(ctx) {
        const centerX = this.width / 2;
        const centerY = this.height / 2 - 30;
        const radius = this.avatarSize / 2;
        
        // Draw circle background
        ctx.beginPath();
        ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
        ctx.fillStyle = '#5865f2';
        ctx.fill();
        
        // Draw default user icon
        ctx.fillStyle = '#ffffff';
        ctx.font = `${this.avatarSize / 2}px Arial`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('👤', centerX, centerY);
    }

    drawWelcomeText(ctx, welcomeText, subtitle, textColor, accentColor, username) {
        ctx.fillStyle = textColor;
        ctx.textAlign = 'center';
        ctx.shadowColor = 'rgba(0, 0, 0, 0.8)';
        ctx.shadowBlur = 4;
        ctx.shadowOffsetX = 2;
        ctx.shadowOffsetY = 2;
        
        // Main welcome text
        ctx.font = 'bold 36px Arial';
        ctx.fillText(welcomeText, this.width / 2, 80);
        
        // Username with accent color
        ctx.font = 'bold 28px Arial';
        ctx.fillStyle = accentColor;
        ctx.fillText(username, this.width / 2, this.height / 2 + 100);
        
        // Subtitle
        ctx.font = '20px Arial';
        ctx.fillStyle = textColor;
        ctx.fillText(subtitle, this.width / 2, this.height / 2 + 140);
        
        // Reset shadow
        ctx.shadowColor = 'transparent';
        ctx.shadowBlur = 0;
        ctx.shadowOffsetX = 0;
        ctx.shadowOffsetY = 0;
    }

    drawDecorations(ctx, accentColor) {
        // Draw decorative lines
        ctx.strokeStyle = accentColor;
        ctx.lineWidth = 3;
        
        // Top line
        ctx.beginPath();
        ctx.moveTo(this.width / 2 - 100, 50);
        ctx.lineTo(this.width / 2 + 100, 50);
        ctx.stroke();
        
        // Bottom line
        ctx.beginPath();
        ctx.moveTo(this.width / 2 - 150, this.height - 30);
        ctx.lineTo(this.width / 2 + 150, this.height - 30);
        ctx.stroke();
        
        // Decorative dots
        for (let i = 0; i < 5; i++) {
            ctx.beginPath();
            ctx.arc(this.width / 2 - 60 + i * 30, this.height - 30, 3, 0, Math.PI * 2);
            ctx.fillStyle = accentColor;
            ctx.fill();
        }
    }

    // Template processing
    formatText(template, user, guild) {
        return template
            .replace(/{user}/g, user.username)
            .replace(/{mention}/g, `@${user.username}`)
            .replace(/{server}/g, guild.name)
            .replace(/{membercount}/g, guild.memberCount.toLocaleString());
    }
}

module.exports = new WelcomeCardGenerator(); 