class BackgroundManager {
    constructor() {
        this.currentBackground = null;
        this.backgroundType = 'default';
        this.backgroundOpacity = 0.8;
        this.maxFileSize = 10 * 1024 * 1024; // 10MB
        this.supportedImageTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
        this.supportedVideoTypes = ['video/mp4', 'video/webm', 'video/ogg'];
        
        this.init();
    }

    init() {
        // 等待DOM加载完成后再初始化
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => {
                this.setup();
            });
        } else {
            this.setup();
        }
    }

    setup() {
        // 加载保存的背景设置
        this.loadBackgroundSettings();
        
        // 设置事件监听器
        this.setupEventListeners();
        
        // 应用当前背景
        this.applyCurrentBackground();
    }

    setupEventListeners() {
        const backgroundTypeSelect = document.getElementById('background-type');
        const backgroundUpload = document.getElementById('background-upload');
        const backgroundOpacitySlider = document.getElementById('background-opacity');
        const clearBackgroundBtn = document.getElementById('clear-background-btn');
        const testBackgroundBtn = document.getElementById('test-background-btn');
        const backgroundOpacityValue = document.getElementById('background-opacity-value');

        if (backgroundTypeSelect) {
            backgroundTypeSelect.addEventListener('change', (e) => {
                this.handleBackgroundTypeChange(e.target.value);
            });
        }

        if (backgroundUpload) {
            backgroundUpload.addEventListener('change', (e) => {
                this.handleFileUpload(e.target.files[0]);
            });
        }

        if (backgroundOpacitySlider) {
            backgroundOpacitySlider.addEventListener('input', (e) => {
                this.backgroundOpacity = parseFloat(e.target.value);
                if (backgroundOpacityValue) {
                    backgroundOpacityValue.textContent = this.backgroundOpacity.toFixed(1);
                }
                this.applyOpacity();
            });
        }

        if (clearBackgroundBtn) {
            clearBackgroundBtn.addEventListener('click', () => {
                this.clearBackground();
            });
        }

        if (testBackgroundBtn) {
            testBackgroundBtn.addEventListener('click', () => {
                this.setTestBackground();
            });
        }
    }

    handleBackgroundTypeChange(type) {
        this.backgroundType = type;
        this.updateUIVisibility();
        
        if (type === 'default') {
            this.clearBackground();
        }
    }

    updateUIVisibility() {
        const uploadSection = document.getElementById('background-upload-section');
        const opacitySection = document.getElementById('background-opacity-section');
        const previewSection = document.getElementById('background-preview-section');
        const actionsSection = document.getElementById('background-actions');

        if (this.backgroundType === 'default') {
            uploadSection.style.display = 'none';
            opacitySection.style.display = 'none';
            previewSection.style.display = 'none';
            actionsSection.style.display = 'none';
        } else {
            uploadSection.style.display = 'block';
            opacitySection.style.display = 'block';
            previewSection.style.display = 'block';
            actionsSection.style.display = 'block';
        }
    }

    async handleFileUpload(file) {
        if (!file) return;

        // 检查文件大小
        if (file.size > this.maxFileSize) {
            this.showNotification('文件大小超过10MB限制', 'error');
            return;
        }

        // 检查文件类型
        const isImage = this.supportedImageTypes.includes(file.type);
        const isVideo = this.supportedVideoTypes.includes(file.type);

        if (!isImage && !isVideo) {
            this.showNotification('不支持的文件格式', 'error');
            return;
        }

        // 检查背景类型是否匹配
        if (this.backgroundType === 'image' && !isImage) {
            this.showNotification('请选择图片文件', 'error');
            return;
        }

        if (this.backgroundType === 'video' && !isVideo) {
            this.showNotification('请选择视频文件', 'error');
            return;
        }

        try {
            // 读取文件并创建预览
            const fileUrl = await this.createFileUrl(file);
            this.setBackground(fileUrl, isVideo ? 'video' : 'image');
            this.updatePreview(fileUrl, isVideo);
            this.showNotification('背景上传成功', 'success');
        } catch (error) {
            console.error('背景上传失败:', error);
            this.showNotification('背景上传失败', 'error');
        }
    }

    createFileUrl(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result);
            reader.onerror = reject;
            reader.readAsDataURL(file);
        });
    }

    setBackground(url, type) {
        this.currentBackground = {
            url: url,
            type: type,
            opacity: this.backgroundOpacity
        };
        
        this.applyCurrentBackground();
        this.saveBackgroundSettings();
    }

    applyCurrentBackground() {
        const chatContainer = document.getElementById('chat-container');
        if (!chatContainer) {
            console.warn('Chat container not found, retrying in 500ms');
            setTimeout(() => this.applyCurrentBackground(), 500);
            return;
        }

        // 移除现有背景
        this.removeCurrentBackground();

        if (!this.currentBackground || this.backgroundType === 'default') {
            chatContainer.classList.remove('has-background');
            document.body.classList.remove('has-chat-background');
            return;
        }

        // 添加背景容器到body，使其固定在视口
        const backgroundDiv = document.createElement('div');
        backgroundDiv.className = 'chat-background';
        backgroundDiv.id = 'chat-background';

        if (this.currentBackground.type === 'video') {
            const video = document.createElement('video');
            video.src = this.currentBackground.url;
            video.autoplay = true;
            video.loop = true;
            video.muted = true;
            video.playsInline = true; // 移动端支持
            video.style.opacity = this.backgroundOpacity;
            
            // 确保视频加载
            video.addEventListener('loadeddata', () => {
                console.log('Video background loaded successfully');
            });
            
            backgroundDiv.appendChild(video);
        } else {
            const img = document.createElement('img');
            img.src = this.currentBackground.url;
            img.style.opacity = this.backgroundOpacity;
            
            // 确保图片加载
            img.addEventListener('load', () => {
                console.log('Image background loaded successfully');
            });
            
            img.addEventListener('error', (e) => {
                console.error('Failed to load background image:', e);
            });
            
            backgroundDiv.appendChild(img);
        }

        // 将背景添加到body的开头，确保在所有内容下方
        document.body.insertBefore(backgroundDiv, document.body.firstChild);
        chatContainer.classList.add('has-background');
        
        // 给body添加类以便应用全局样式
        document.body.classList.add('has-chat-background');
        
        // 更新遮罩透明度
        this.updateOverlayOpacity();
        
        console.log('Background applied:', this.currentBackground);
    }

    updateOverlayOpacity() {
        const chatContainer = document.getElementById('chat-container');
        if (!chatContainer) return;

        // 计算遮罩透明度 - 让背景更明显
        // 透明度范围从0.1到0.5，背景越不透明，遮罩越透明
        const overlayOpacity = Math.max(0.1, 0.6 - (this.backgroundOpacity * 0.5));
        
        // 更新CSS规则
        const style = document.getElementById('background-overlay-style') || document.createElement('style');
        style.id = 'background-overlay-style';
        style.textContent = `
            .chat-container.has-background::before {
                background: rgba(255, 255, 255, ${overlayOpacity}) !important;
            }
        `;
        if (!style.parentNode) {
            document.head.appendChild(style);
        }
        
        console.log(`Background opacity: ${this.backgroundOpacity}, Overlay opacity: ${overlayOpacity}`);
    }

    applyOpacity() {
        if (!this.currentBackground) return;
        
        this.currentBackground.opacity = this.backgroundOpacity;
        this.applyCurrentBackground();
        this.updatePreviewOpacity();
        this.saveBackgroundSettings();
    }

    updatePreviewOpacity() {
        const preview = document.querySelector('#background-preview img, #background-preview video');
        if (preview) {
            preview.style.opacity = this.backgroundOpacity;
        }
    }

    removeCurrentBackground() {
        const existingBackground = document.getElementById('chat-background');
        if (existingBackground) {
            existingBackground.remove();
        }
    }

    updatePreview(url, isVideo) {
        const preview = document.getElementById('background-preview');
        if (!preview) return;

        preview.innerHTML = '';

        if (isVideo) {
            const video = document.createElement('video');
            video.src = url;
            video.autoplay = true;
            video.loop = true;
            video.muted = true;
            video.style.opacity = this.backgroundOpacity;
            preview.appendChild(video);
        } else {
            const img = document.createElement('img');
            img.src = url;
            img.style.opacity = this.backgroundOpacity;
            preview.appendChild(img);
        }
    }

    clearBackground() {
        this.currentBackground = null;
        this.removeCurrentBackground();
        
        const chatContainer = document.getElementById('chat-container');
        if (chatContainer) {
            chatContainer.classList.remove('has-background');
        }
        
        // 移除body类
        document.body.classList.remove('has-chat-background');

        const preview = document.getElementById('background-preview');
        if (preview) {
            preview.innerHTML = '<div class="preview-placeholder">暂无背景</div>';
        }

        // 重置背景类型选择器
        const backgroundTypeSelect = document.getElementById('background-type');
        if (backgroundTypeSelect) {
            backgroundTypeSelect.value = 'default';
            this.backgroundType = 'default';
        }

        this.updateUIVisibility();
        this.saveBackgroundSettings();
        this.showNotification('背景已清除', 'info');
    }

    saveBackgroundSettings() {
        const settings = {
            backgroundType: this.backgroundType,
            currentBackground: this.currentBackground,
            backgroundOpacity: this.backgroundOpacity
        };
        
        StorageManager.set('background_settings', settings);
    }

    loadBackgroundSettings() {
        const settings = StorageManager.get('background_settings', {
            backgroundType: 'default',
            currentBackground: null,
            backgroundOpacity: 0.8
        });

        this.backgroundType = settings.backgroundType;
        this.currentBackground = settings.currentBackground;
        this.backgroundOpacity = settings.backgroundOpacity;

        // 更新UI
        this.updateUIFromSettings();
    }

    updateUIFromSettings() {
        const backgroundTypeSelect = document.getElementById('background-type');
        const backgroundOpacitySlider = document.getElementById('background-opacity');
        const backgroundOpacityValue = document.getElementById('background-opacity-value');

        if (backgroundTypeSelect) {
            backgroundTypeSelect.value = this.backgroundType;
        }

        if (backgroundOpacitySlider) {
            backgroundOpacitySlider.value = this.backgroundOpacity;
        }

        if (backgroundOpacityValue) {
            backgroundOpacityValue.textContent = this.backgroundOpacity.toFixed(1);
        }

        this.updateUIVisibility();

        // 如果有当前背景，更新预览
        if (this.currentBackground) {
            this.updatePreview(this.currentBackground.url, this.currentBackground.type === 'video');
        }
    }

    showNotification(message, type = 'info') {
        if (window.uiManager) {
            window.uiManager.showNotification(message, type);
        } else {
            console.log(`[${type.toUpperCase()}] ${message}`);
        }
    }

    // 获取当前背景设置（供其他模块使用）
    getCurrentBackground() {
        return {
            type: this.backgroundType,
            background: this.currentBackground,
            opacity: this.backgroundOpacity
        };
    }

    // 设置背景（供其他模块调用）
    setBackgroundFromUrl(url, type = 'image') {
        this.backgroundType = type === 'video' ? 'video' : 'image';
        this.setBackground(url, type);
        this.updateUIFromSettings();
    }

    // 调试功能：设置测试背景
    setTestBackground() {
        // 创建一个测试用的渐变背景
        const canvas = document.createElement('canvas');
        canvas.width = 1200;
        canvas.height = 800;
        const ctx = canvas.getContext('2d');
        
        // 创建径向渐变
        const gradient = ctx.createRadialGradient(600, 400, 0, 600, 400, 600);
        gradient.addColorStop(0, '#FF6B6B');
        gradient.addColorStop(0.3, '#4ECDC4');
        gradient.addColorStop(0.6, '#45B7D1');
        gradient.addColorStop(1, '#96CEB4');
        
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        // 添加一些装饰图案
        ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
        for (let i = 0; i < 20; i++) {
            const x = Math.random() * canvas.width;
            const y = Math.random() * canvas.height;
            const size = Math.random() * 100 + 50;
            ctx.beginPath();
            ctx.arc(x, y, size, 0, Math.PI * 2);
            ctx.fill();
        }
        
        // 添加文字
        ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
        ctx.font = 'bold 64px Arial';
        ctx.textAlign = 'center';
        ctx.shadowColor = 'rgba(0, 0, 0, 0.3)';
        ctx.shadowBlur = 10;
        ctx.fillText('🎨 测试背景', canvas.width / 2, canvas.height / 2);
        
        ctx.font = '32px Arial';
        ctx.fillText('Background Test', canvas.width / 2, canvas.height / 2 + 80);
        
        const testUrl = canvas.toDataURL();
        this.backgroundType = 'image';
        this.setBackground(testUrl, 'image');
        this.updateUIFromSettings();
        this.showNotification('测试背景已设置，检查聊天区域', 'success');
    }
}

// 导出到全局作用域
window.BackgroundManager = BackgroundManager;