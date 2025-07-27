class FloatingAvatar {
    constructor() {
        this.container = null;
        this.avatar = null;
        this.currentEmotion = 'default';
        this.isAnimating = false;
        this.mediaType = 'cartoon'; // 'cartoon', 'image', 'video'
        this.mediaContent = null;
        
        // 表情状态
        this.emotions = {
            default: { eyes: '◕', mouth: '‿' },
            happy: { eyes: '◕', mouth: '◡' },
            excited: { eyes: '★', mouth: '▽' },
            thinking: { eyes: '◔', mouth: '～' },
            sad: { eyes: '◕', mouth: '︵' },
            surprised: { eyes: '○', mouth: 'o' },
            wink: { eyes: '◕ ̮', mouth: '◡' },
            sleepy: { eyes: '－', mouth: '‿' },
            confused: { eyes: '◔', mouth: '?' },
            love: { eyes: '♥', mouth: '◡' }
        };

        // 动画参数
        this.blinkInterval = null;
        this.talkingInterval = null;
        this.emotionChangeInterval = null;
        
        this.init();
    }

    init() {
        this.createFloatingWindow();
        this.startRandomEmotions();
        this.startBlinking();
    }

    createFloatingWindow() {
        // 创建悬浮窗口容器
        this.container = document.createElement('div');
        this.container.classList.add('floating-avatar-container');
        
        // 创建头部控制栏
        const header = document.createElement('div');
        header.classList.add('floating-avatar-header');
        
        const title = document.createElement('span');
        title.textContent = '表情助手';
        title.classList.add('floating-avatar-title');
        
        // 控制按钮
        const controls = document.createElement('div');
        controls.classList.add('floating-avatar-controls');
        
        // 媒体类型切换按钮
        const typeToggle = document.createElement('button');
        typeToggle.classList.add('floating-avatar-btn', 'type-toggle');
        typeToggle.innerHTML = '🎭';
        typeToggle.title = '切换显示类型';
        typeToggle.addEventListener('click', () => this.toggleMediaType());
        
        // 最小化按钮
        const minimizeBtn = document.createElement('button');
        minimizeBtn.classList.add('floating-avatar-btn', 'minimize-btn');
        minimizeBtn.innerHTML = '−';
        minimizeBtn.title = '最小化';
        minimizeBtn.addEventListener('click', () => this.toggleMinimize());
        
        // 关闭按钮
        const closeBtn = document.createElement('button');
        closeBtn.classList.add('floating-avatar-btn', 'close-btn');
        closeBtn.innerHTML = '×';
        closeBtn.title = '关闭';
        closeBtn.addEventListener('click', () => this.close());
        
        controls.appendChild(typeToggle);
        controls.appendChild(minimizeBtn);
        controls.appendChild(closeBtn);
        
        header.appendChild(title);
        header.appendChild(controls);
        
        // 创建内容区域
        const content = document.createElement('div');
        content.classList.add('floating-avatar-content');
        
        // 创建表情显示区域
        this.avatar = document.createElement('div');
        this.avatar.classList.add('floating-avatar-display');
        this.createCartoonAvatar();
        
        content.appendChild(this.avatar);
        
        // 创建媒体选择器
        const mediaSelector = document.createElement('div');
        mediaSelector.classList.add('floating-avatar-media-selector');
        
        const fileInput = document.createElement('input');
        fileInput.type = 'file';
        fileInput.accept = 'image/*,video/*';
        fileInput.style.display = 'none';
        fileInput.addEventListener('change', (e) => this.handleMediaUpload(e));
        
        const uploadBtn = document.createElement('button');
        uploadBtn.classList.add('floating-avatar-btn', 'upload-btn');
        uploadBtn.innerHTML = '📁';
        uploadBtn.addEventListener('click', () => fileInput.click());
        
        mediaSelector.appendChild(fileInput);
        mediaSelector.appendChild(uploadBtn);
        content.appendChild(mediaSelector);
        
        // 组装窗口
        this.container.appendChild(header);
        this.container.appendChild(content);
        
        // 添加到页面
        document.body.appendChild(this.container);
        
        // 使窗口可拖拽
        this.makeDraggable();
    }

    createCartoonAvatar() {
        this.avatar.innerHTML = '';
        this.avatar.classList.remove('image-avatar', 'video-avatar');
        this.avatar.classList.add('cartoon-avatar');
        
        // 创建脸部容器
        const face = document.createElement('div');
        face.classList.add('avatar-face');
        
        // 创建眼睛
        const eyes = document.createElement('div');
        eyes.classList.add('avatar-eyes');
        
        const leftEye = document.createElement('span');
        leftEye.classList.add('avatar-eye', 'left-eye');
        const rightEye = document.createElement('span');
        rightEye.classList.add('avatar-eye', 'right-eye');
        
        eyes.appendChild(leftEye);
        eyes.appendChild(rightEye);
        
        // 创建嘴巴
        const mouth = document.createElement('div');
        mouth.classList.add('avatar-mouth');
        
        face.appendChild(eyes);
        face.appendChild(mouth);
        this.avatar.appendChild(face);
        
        // 设置默认表情
        this.updateCartoonEmotion('default');
    }

    updateCartoonEmotion(emotion) {
        if (!this.emotions[emotion]) emotion = 'default';
        
        this.currentEmotion = emotion;
        const emotionData = this.emotions[emotion];
        
        const leftEye = this.avatar.querySelector('.left-eye');
        const rightEye = this.avatar.querySelector('.right-eye');
        const mouth = this.avatar.querySelector('.avatar-mouth');
        
        if (leftEye && rightEye && mouth) {
            // 处理眼睛
            if (emotionData.eyes.includes(' ')) {
                const [left, right] = emotionData.eyes.split(' ');
                leftEye.textContent = left;
                rightEye.textContent = right || left;
            } else {
                leftEye.textContent = emotionData.eyes;
                rightEye.textContent = emotionData.eyes;
            }
            
            mouth.textContent = emotionData.mouth;
            
            // 添加表情变化动画
            this.avatar.classList.add('emotion-changing');
            setTimeout(() => {
                this.avatar.classList.remove('emotion-changing');
            }, 300);
        }
    }

    setEmotion(emotion) {
        if (this.mediaType === 'cartoon') {
            this.updateCartoonEmotion(emotion);
        }
    }

    startBlinking() {
        this.blinkInterval = setInterval(() => {
            if (this.mediaType === 'cartoon' && !this.isAnimating) {
                const eyes = this.avatar.querySelectorAll('.avatar-eye');
                eyes.forEach(eye => {
                    eye.style.transform = 'scaleY(0.1)';
                    setTimeout(() => {
                        eye.style.transform = 'scaleY(1)';
                    }, 150);
                });
            }
        }, 3000 + Math.random() * 2000); // 3-5秒随机眨眼
    }

    startTalking() {
        if (this.mediaType !== 'cartoon') return;
        
        this.stopTalking();
        const mouth = this.avatar.querySelector('.avatar-mouth');
        const originalMouth = mouth.textContent;
        const talkingMouths = ['o', '◯', '◦', originalMouth];
        let mouthIndex = 0;
        
        this.talkingInterval = setInterval(() => {
            mouth.textContent = talkingMouths[mouthIndex];
            mouthIndex = (mouthIndex + 1) % talkingMouths.length;
        }, 200);
    }

    stopTalking() {
        if (this.talkingInterval) {
            clearInterval(this.talkingInterval);
            this.talkingInterval = null;
            
            // 恢复原始嘴型
            const mouth = this.avatar.querySelector('.avatar-mouth');
            if (mouth && this.emotions[this.currentEmotion]) {
                mouth.textContent = this.emotions[this.currentEmotion].mouth;
            }
        }
    }

    startRandomEmotions() {
        // 每30秒随机切换一次表情
        this.emotionChangeInterval = setInterval(() => {
            if (!this.isAnimating) {
                const emotions = Object.keys(this.emotions);
                const randomEmotion = emotions[Math.floor(Math.random() * emotions.length)];
                this.setEmotion(randomEmotion);
                
                // 2秒后回到默认表情
                setTimeout(() => {
                    this.setEmotion('default');
                }, 2000);
            }
        }, 30000);
    }

    toggleMediaType() {
        const types = ['cartoon', 'image', 'video'];
        const currentIndex = types.indexOf(this.mediaType);
        const nextIndex = (currentIndex + 1) % types.length;
        
        this.mediaType = types[nextIndex];
        
        switch (this.mediaType) {
            case 'cartoon':
                this.createCartoonAvatar();
                break;
            case 'image':
                this.showImageUpload();
                break;
            case 'video':
                this.showVideoUpload();
                break;
        }
        
        // 更新按钮图标
        const typeToggle = this.container.querySelector('.type-toggle');
        const icons = { cartoon: '🎭', image: '🖼️', video: '🎬' };
        typeToggle.innerHTML = icons[this.mediaType];
    }

    showImageUpload() {
        this.avatar.innerHTML = '';
        this.avatar.classList.remove('cartoon-avatar', 'video-avatar');
        this.avatar.classList.add('image-avatar');
        
        if (this.mediaContent && this.mediaContent.type === 'image') {
            const img = document.createElement('img');
            img.src = this.mediaContent.src;
            img.alt = '用户头像';
            this.avatar.appendChild(img);
        } else {
            const placeholder = document.createElement('div');
            placeholder.classList.add('media-placeholder');
            placeholder.innerHTML = '🖼️<br>点击上传图片';
            placeholder.addEventListener('click', () => {
                this.container.querySelector('input[type="file"]').click();
            });
            this.avatar.appendChild(placeholder);
        }
    }

    showVideoUpload() {
        this.avatar.innerHTML = '';
        this.avatar.classList.remove('cartoon-avatar', 'image-avatar');
        this.avatar.classList.add('video-avatar');
        
        if (this.mediaContent && this.mediaContent.type === 'video') {
            const video = document.createElement('video');
            video.src = this.mediaContent.src;
            video.loop = true;
            video.muted = true;
            video.autoplay = true;
            this.avatar.appendChild(video);
        } else {
            const placeholder = document.createElement('div');
            placeholder.classList.add('media-placeholder');
            placeholder.innerHTML = '🎬<br>点击上传视频';
            placeholder.addEventListener('click', () => {
                this.container.querySelector('input[type="file"]').click();
            });
            this.avatar.appendChild(placeholder);
        }
    }

    handleMediaUpload(event) {
        const file = event.target.files[0];
        if (!file) return;
        
        const url = URL.createObjectURL(file);
        const type = file.type.startsWith('image/') ? 'image' : 'video';
        
        this.mediaContent = { src: url, type: type };
        
        if (type === 'image' && this.mediaType === 'image') {
            this.showImageUpload();
        } else if (type === 'video' && this.mediaType === 'video') {
            this.showVideoUpload();
        } else {
            // 自动切换到对应的媒体类型
            this.mediaType = type;
            if (type === 'image') {
                this.showImageUpload();
            } else {
                this.showVideoUpload();
            }
            
            // 更新按钮图标
            const typeToggle = this.container.querySelector('.type-toggle');
            const icons = { cartoon: '🎭', image: '🖼️', video: '🎬' };
            typeToggle.innerHTML = icons[this.mediaType];
        }
    }

    makeDraggable() {
        const header = this.container.querySelector('.floating-avatar-header');
        let isDragging = false;
        let startX, startY, initialX, initialY;
        
        header.addEventListener('mousedown', (e) => {
            if (e.target.classList.contains('floating-avatar-btn')) return;
            
            isDragging = true;
            startX = e.clientX;
            startY = e.clientY;
            
            const rect = this.container.getBoundingClientRect();
            initialX = rect.left;
            initialY = rect.top;
            
            document.addEventListener('mousemove', onMouseMove);
            document.addEventListener('mouseup', onMouseUp);
            
            e.preventDefault();
        });
        
        const onMouseMove = (e) => {
            if (!isDragging) return;
            
            const deltaX = e.clientX - startX;
            const deltaY = e.clientY - startY;
            
            const newX = Math.max(0, Math.min(window.innerWidth - this.container.offsetWidth, initialX + deltaX));
            const newY = Math.max(0, Math.min(window.innerHeight - this.container.offsetHeight, initialY + deltaY));
            
            this.container.style.left = newX + 'px';
            this.container.style.top = newY + 'px';
        };
        
        const onMouseUp = () => {
            isDragging = false;
            document.removeEventListener('mousemove', onMouseMove);
            document.removeEventListener('mouseup', onMouseUp);
        };
    }

    toggleMinimize() {
        this.container.classList.toggle('minimized');
        const minimizeBtn = this.container.querySelector('.minimize-btn');
        minimizeBtn.innerHTML = this.container.classList.contains('minimized') ? '+' : '−';
    }

    close() {
        if (this.blinkInterval) clearInterval(this.blinkInterval);
        if (this.talkingInterval) clearInterval(this.talkingInterval);
        if (this.emotionChangeInterval) clearInterval(this.emotionChangeInterval);
        
        this.container.remove();
    }

    // 公共方法供外部调用
    show() {
        this.container.style.display = 'block';
    }

    hide() {
        this.container.style.display = 'none';
    }

    // 响应聊天事件
    onUserMessage() {
        this.setEmotion('thinking');
    }

    onAIResponse() {
        this.setEmotion('happy');
        this.startTalking();
        
        // 3秒后停止说话并回到默认表情
        setTimeout(() => {
            this.stopTalking();
            this.setEmotion('default');
        }, 3000);
    }

    onError() {
        this.setEmotion('sad');
        setTimeout(() => {
            this.setEmotion('default');
        }, 2000);
    }
}

// 全局实例
window.FloatingAvatar = FloatingAvatar;