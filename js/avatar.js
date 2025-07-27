class AvatarController {
    constructor(avatarElement) {
        this.avatar = avatarElement;
        this.currentEmotion = CONFIG.AVATAR.EMOTIONS.NEUTRAL;
        this.emotionTimeout = null;
        this.isFollowingMouse = true;
        this.setupMouseFollowing();
    }

    setEmotion(emotion, duration = CONFIG.AVATAR.EMOTION_DURATION) {
        // 清除之前的情绪状态
        this.clearEmotionClasses();
        
        // 设置新的情绪
        this.currentEmotion = emotion;
        this.avatar.classList.add(emotion);
        
        // 自动恢复到中性状态
        if (this.emotionTimeout) {
            clearTimeout(this.emotionTimeout);
        }
        
        if (emotion !== CONFIG.AVATAR.EMOTIONS.NEUTRAL && duration > 0) {
            this.emotionTimeout = setTimeout(() => {
                this.setEmotion(CONFIG.AVATAR.EMOTIONS.NEUTRAL, 0);
            }, duration);
        }
    }

    clearEmotionClasses() {
        Object.values(CONFIG.AVATAR.EMOTIONS).forEach(emotion => {
            this.avatar.classList.remove(emotion);
        });
        
        // 清除其他状态类
        this.avatar.classList.remove('following-mouse', 'emotion-happy', 'emotion-sad', 
                                   'emotion-angry', 'emotion-surprised', 'emotion-neutral');
    }

    startTalking() {
        this.setEmotion(CONFIG.AVATAR.EMOTIONS.TALKING, 0);
    }

    stopTalking() {
        this.setEmotion(CONFIG.AVATAR.EMOTIONS.NEUTRAL);
    }

    startListening() {
        this.setEmotion(CONFIG.AVATAR.EMOTIONS.LISTENING);
    }

    startThinking() {
        this.setEmotion(CONFIG.AVATAR.EMOTIONS.THINKING, 0);
    }

    showHappiness() {
        this.setEmotion(CONFIG.AVATAR.EMOTIONS.HAPPY);
        this.avatar.classList.add('emotion-happy');
        setTimeout(() => {
            this.avatar.classList.remove('emotion-happy');
        }, CONFIG.AVATAR.EMOTION_DURATION);
    }

    showSadness() {
        this.setEmotion(CONFIG.AVATAR.EMOTIONS.SAD);
        this.avatar.classList.add('emotion-sad');
        setTimeout(() => {
            this.avatar.classList.remove('emotion-sad');
        }, CONFIG.AVATAR.EMOTION_DURATION);
    }

    showExcitement() {
        this.setEmotion(CONFIG.AVATAR.EMOTIONS.EXCITED);
    }

    setupMouseFollowing() {
        if (!this.isFollowingMouse) return;
        
        this.avatar.classList.add('following-mouse');
        
        document.addEventListener('mousemove', (e) => {
            this.followMouse(e.clientX, e.clientY);
        });
    }

    followMouse(mouseX, mouseY) {
        const pupils = this.avatar.querySelectorAll('.pupil');
        const avatarRect = this.avatar.getBoundingClientRect();
        const avatarCenterX = avatarRect.left + avatarRect.width / 2;
        const avatarCenterY = avatarRect.top + avatarRect.height / 2;

        pupils.forEach(pupil => {
            const eye = pupil.parentElement;
            const eyeRect = eye.getBoundingClientRect();
            const eyeCenterX = eyeRect.left + eyeRect.width / 2;
            const eyeCenterY = eyeRect.top + eyeRect.height / 2;

            const deltaX = mouseX - eyeCenterX;
            const deltaY = mouseY - eyeCenterY;
            const angle = Math.atan2(deltaY, deltaX);
            
            // 限制瞳孔移动范围
            const maxDistance = Math.min(eyeRect.width, eyeRect.height) / 4;
            const distance = Math.min(maxDistance, Math.sqrt(deltaX * deltaX + deltaY * deltaY) / 10);
            
            const offsetX = Math.cos(angle) * distance;
            const offsetY = Math.sin(angle) * distance;
            
            pupil.style.transform = `translate(calc(-50% + ${offsetX}px), calc(-50% + ${offsetY}px))`;
        });
    }

    reactToMessage(message) {
        const content = message.content.toLowerCase();
        
        // 根据消息内容分析情绪
        if (this.containsHappyWords(content)) {
            this.showHappiness();
        } else if (this.containsSadWords(content)) {
            this.showSadness();
        } else if (this.containsExcitedWords(content)) {
            this.showExcitement();
        } else if (message.type === 'user') {
            this.startListening();
        }
    }

    containsHappyWords(content) {
        const happyWords = ['开心', '高兴', '快乐', '哈哈', '笑', '好棒', '太好了', '棒极了', '👍', '😊', '😄', '🎉'];
        return happyWords.some(word => content.includes(word));
    }

    containsSadWords(content) {
        const sadWords = ['难过', '伤心', '哭', '失落', '痛苦', '悲伤', '😢', '😭', '💔'];
        return sadWords.some(word => content.includes(word));
    }

    containsExcitedWords(content) {
        const excitedWords = ['太棒了', 'amazing', '惊人', '不可思议', '哇', '🎉', '🎊', '✨'];
        return excitedWords.some(word => content.includes(word));
    }

    simulateTyping(text, onCharacter) {
        this.startTalking();
        
        let index = 0;
        const typeInterval = setInterval(() => {
            if (index < text.length) {
                if (onCharacter) {
                    onCharacter(text[index]);
                }
                index++;
                
                // 随机眨眼
                if (Math.random() < 0.1) {
                    this.blink();
                }
            } else {
                clearInterval(typeInterval);
                this.stopTalking();
            }
        }, 50 + Math.random() * 50); // 随机打字速度
        
        return typeInterval;
    }

    blink() {
        const eyes = this.avatar.querySelectorAll('.eye');
        eyes.forEach(eye => {
            eye.style.height = '2px';
            setTimeout(() => {
                eye.style.height = '';
            }, 150);
        });
    }
}

window.AvatarController = AvatarController;