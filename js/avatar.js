/**
 * AI卡通头像控制器
 * 负责管理头像的情感状态、动画和交互
 */
class AvatarController {
    constructor(avatarElement) {
        this.avatar = avatarElement;
        
        // 检查CONFIG是否已定义
        if (typeof CONFIG === 'undefined') {
            console.error('CONFIG未定义，请确保config.js已正确加载');
            return;
        }
        
        this.currentEmotion = CONFIG.AVATAR.EMOTIONS.NEUTRAL;
        this.emotionQueue = [];
        this.isAnimating = false;
        this.emotionTimeout = null;
        this.isMouseFollowing = false;
        
        // 情感优先级定义
        this.emotionPriority = {
            [CONFIG.AVATAR.EMOTIONS.NEUTRAL]: 1,
            [CONFIG.AVATAR.EMOTIONS.LISTENING]: 2,
            [CONFIG.AVATAR.EMOTIONS.THINKING]: 3,
            [CONFIG.AVATAR.EMOTIONS.TALKING]: 3,
            [CONFIG.AVATAR.EMOTIONS.HAPPY]: 4,
            [CONFIG.AVATAR.EMOTIONS.SAD]: 5,
            [CONFIG.AVATAR.EMOTIONS.EXCITED]: 5,
            [CONFIG.AVATAR.EMOTIONS.SURPRISED]: 6
        };
        
        this.init();
    }

    init() {
        // 再次检查CONFIG
        if (typeof CONFIG === 'undefined' || !CONFIG.AVATAR) {
            console.error('CONFIG.AVATAR未定义，头像功能无法初始化');
            return;
        }
        
        // 初始化为中性状态
        this.setEmotion(CONFIG.AVATAR.EMOTIONS.NEUTRAL);
        
        // 设置鼠标跟随（可选）
        this.setupMouseFollowing();
        
        // 设置随机眨眼
        this.setupRandomBlink();
        
        console.log('AvatarController 初始化完成');
    }

    /**
     * 设置情感状态
     * @param {string} emotion - 情感类型
     * @param {number} duration - 持续时间（毫秒），0为永久
     * @param {number} priority - 优先级（可选，默认使用预设值）
     * @param {boolean} force - 是否强制执行
     */
    setEmotion(emotion, duration = null, priority = null, force = false) {
        // 检查CONFIG
        if (typeof CONFIG === 'undefined' || !CONFIG.AVATAR) {
            console.warn('CONFIG.AVATAR未定义，无法设置情感');
            return;
        }
        
        // 使用默认持续时间
        if (duration === null) {
            duration = CONFIG.AVATAR.EMOTION_DURATION || 3000;
        }
        
        // 验证情感类型
        if (!Object.values(CONFIG.AVATAR.EMOTIONS).includes(emotion)) {
            console.warn(`无效的情感类型: ${emotion}`);
            return;
        }

        const emotionPriority = priority || this.emotionPriority[emotion];
        
        // 检查优先级（除非强制执行）
        if (!force && emotionPriority < this.emotionPriority[this.currentEmotion]) {
            console.log(`情感 ${emotion} 优先级不足，当前: ${this.currentEmotion}`);
            return;
        }

        // 清除之前的情感状态
        this.clearEmotionClasses();
        
        // 添加过渡效果
        this.avatar.classList.add('transitioning');
        
        // 设置新情感
        setTimeout(() => {
            this.currentEmotion = emotion;
            this.avatar.classList.remove('transitioning');
            this.avatar.classList.add(emotion);
            
            console.log(`设置情感: ${emotion}, 持续时间: ${duration}ms`);
            
            // 处理自动恢复
            this.handleEmotionDuration(emotion, duration);
        }, 50);
    }

    /**
     * 处理情感持续时间
     */
    handleEmotionDuration(emotion, duration) {
        // 清除之前的定时器
        if (this.emotionTimeout) {
            clearTimeout(this.emotionTimeout);
            this.emotionTimeout = null;
        }
        
        // 如果不是永久状态且不是中性状态，设置自动恢复
        if (duration > 0 && emotion !== (CONFIG.AVATAR.EMOTIONS.NEUTRAL || 'neutral')) {
            this.emotionTimeout = setTimeout(() => {
                this.setEmotion(CONFIG.AVATAR.EMOTIONS.NEUTRAL || 'neutral', 0, null, true);
            }, duration);
        }
    }

    /**
     * 清除所有情感类名
     */
    clearEmotionClasses() {
        if (typeof CONFIG !== 'undefined' && CONFIG.AVATAR && CONFIG.AVATAR.EMOTIONS) {
            Object.values(CONFIG.AVATAR.EMOTIONS).forEach(emotion => {
                this.avatar.classList.remove(emotion);
            });
        } else {
            // 后备清理方案
            ['neutral', 'happy', 'sad', 'talking', 'listening', 'thinking', 'excited', 'surprised'].forEach(emotion => {
                this.avatar.classList.remove(emotion);
            });
        }
    }

    /**
     * 开始说话状态
     */
    startTalking() {
        const talkingEmotion = (CONFIG && CONFIG.AVATAR && CONFIG.AVATAR.EMOTIONS && CONFIG.AVATAR.EMOTIONS.TALKING) || 'talking';
        this.setEmotion(talkingEmotion, 0);
    }

    /**
     * 停止说话，恢复中性
     */
    stopTalking() {
        const talkingEmotion = (CONFIG && CONFIG.AVATAR && CONFIG.AVATAR.EMOTIONS && CONFIG.AVATAR.EMOTIONS.TALKING) || 'talking';
        const neutralEmotion = (CONFIG && CONFIG.AVATAR && CONFIG.AVATAR.EMOTIONS && CONFIG.AVATAR.EMOTIONS.NEUTRAL) || 'neutral';
        if (this.currentEmotion === talkingEmotion) {
            this.setEmotion(neutralEmotion);
        }
    }

    /**
     * 开始倾听状态
     */
    startListening() {
        const listeningEmotion = (CONFIG && CONFIG.AVATAR && CONFIG.AVATAR.EMOTIONS && CONFIG.AVATAR.EMOTIONS.LISTENING) || 'listening';
        this.setEmotion(listeningEmotion);
    }

    /**
     * 开始思考状态
     */
    startThinking() {
        const thinkingEmotion = (CONFIG && CONFIG.AVATAR && CONFIG.AVATAR.EMOTIONS && CONFIG.AVATAR.EMOTIONS.THINKING) || 'thinking';
        this.setEmotion(thinkingEmotion, 0);
    }

    /**
     * 显示开心表情
     */
    showHappiness() {
        const happyEmotion = (CONFIG && CONFIG.AVATAR && CONFIG.AVATAR.EMOTIONS && CONFIG.AVATAR.EMOTIONS.HAPPY) || 'happy';
        this.setEmotion(happyEmotion);
    }

    /**
     * 显示难过表情
     */
    showSadness() {
        const sadEmotion = (CONFIG && CONFIG.AVATAR && CONFIG.AVATAR.EMOTIONS && CONFIG.AVATAR.EMOTIONS.SAD) || 'sad';
        this.setEmotion(sadEmotion);
    }

    /**
     * 显示兴奋表情
     */
    showExcitement() {
        const excitedEmotion = (CONFIG && CONFIG.AVATAR && CONFIG.AVATAR.EMOTIONS && CONFIG.AVATAR.EMOTIONS.EXCITED) || 'excited';
        this.setEmotion(excitedEmotion);
    }

    /**
     * 显示惊讶表情
     */
    showSurprise() {
        const surprisedEmotion = (CONFIG && CONFIG.AVATAR && CONFIG.AVATAR.EMOTIONS && CONFIG.AVATAR.EMOTIONS.SURPRISED) || 'surprised';
        this.setEmotion(surprisedEmotion);
    }

    /**
     * 根据消息内容分析并反应情感
     * @param {Object} message - 消息对象
     */
    reactToMessage(message) {
        if (!message || !message.content) return;
        
        const content = message.content.toLowerCase();
        const emotion = this.analyzeMessageEmotion(content, message.type);
        
        if (emotion && emotion !== this.currentEmotion) {
            this.setEmotion(emotion);
        }
    }

    /**
     * 分析消息情感
     * @param {string} content - 消息内容
     * @param {string} type - 消息类型
     * @returns {string|null} 情感类型
     */
    analyzeMessageEmotion(content, type) {
        // 获取情感常量，使用后备值
        const emotions = (CONFIG && CONFIG.AVATAR && CONFIG.AVATAR.EMOTIONS) || {
            LISTENING: 'listening',
            SAD: 'sad',
            EXCITED: 'excited',
            SURPRISED: 'surprised',
            HAPPY: 'happy'
        };
        
        // 用户消息触发倾听
        if (type === 'user') {
            return emotions.LISTENING;
        }

        // 错误消息触发难过
        if (type === 'error') {
            return emotions.SAD;
        }

        // AI消息内容分析
        if (type === 'assistant') {
            // 积极情感关键词
            const happyWords = [
                '开心', '高兴', '快乐', '哈哈', '笑', '好棒', '太好了', '棒极了',
                '成功', '完成', '解决', '正确', '很好', '不错', '棒',
                '👍', '😊', '😄', '🎉', '✨'
            ];
            
            // 消极情感关键词
            const sadWords = [
                '难过', '伤心', '哭', '失落', '痛苦', '悲伤', '错误', '失败',
                '抱歉', '不好意思', '对不起', '遗憾', '可惜',
                '😢', '😭', '💔', '❌'
            ];
            
            // 兴奋情感关键词
            const excitedWords = [
                '太棒了', 'amazing', '惊人', '不可思议', '哇', '厉害', '牛',
                '超级', '非常棒', '完美', '杰出', '优秀',
                '🎉', '🎊', '✨', '🚀', '💯'
            ];
            
            // 惊讶情感关键词
            const surprisedWords = [
                '什么', '真的吗', '不会吧', '怎么可能', '天哪', '我的天',
                '震惊', '意外', '没想到', '竟然',
                '😲', '😮', '🤯'
            ];

            // 检查情感
            if (this.containsWords(content, excitedWords)) {
                return emotions.EXCITED;
            }
            if (this.containsWords(content, surprisedWords)) {
                return emotions.SURPRISED;
            }
            if (this.containsWords(content, happyWords)) {
                return emotions.HAPPY;
            }
            if (this.containsWords(content, sadWords)) {
                return emotions.SAD;
            }
        }

        return null;
    }

    /**
     * 检查内容是否包含指定词汇
     */
    containsWords(content, words) {
        return words.some(word => content.includes(word));
    }

    /**
     * 设置鼠标跟随效果
     */
    setupMouseFollowing() {
        const mouseFollowEnabled = (CONFIG && CONFIG.AVATAR && CONFIG.AVATAR.MOUSE_FOLLOW) !== false;
        if (!mouseFollowEnabled) return;
        
        this.isMouseFollowing = true;
        this.avatar.classList.add('mouse-follow');
        
        document.addEventListener('mousemove', (e) => {
            this.handleMouseMove(e.clientX, e.clientY);
        });
    }

    /**
     * 处理鼠标移动
     */
    handleMouseMove(mouseX, mouseY) {
        if (!this.isMouseFollowing) return;
        
        const pupils = this.avatar.querySelectorAll('.pupil');
        const avatarRect = this.avatar.getBoundingClientRect();
        
        pupils.forEach(pupil => {
            const eye = pupil.parentElement;
            const eyeRect = eye.getBoundingClientRect();
            const eyeCenterX = eyeRect.left + eyeRect.width / 2;
            const eyeCenterY = eyeRect.top + eyeRect.height / 2;

            const deltaX = mouseX - eyeCenterX;
            const deltaY = mouseY - eyeCenterY;
            const angle = Math.atan2(deltaY, deltaX);
            
            // 限制瞳孔移动范围
            const maxDistance = Math.min(eyeRect.width, eyeRect.height) / 6;
            const distance = Math.min(maxDistance, Math.sqrt(deltaX * deltaX + deltaY * deltaY) / 15);
            
            const offsetX = Math.cos(angle) * distance;
            const offsetY = Math.sin(angle) * distance;
            
            pupil.style.transform = `translate(calc(-50% + ${offsetX}px), calc(-50% + ${offsetY}px))`;
        });
    }

    /**
     * 设置随机眨眼
     */
    setupRandomBlink() {
        const blink = () => {
            const neutralEmotion = (CONFIG && CONFIG.AVATAR && CONFIG.AVATAR.EMOTIONS && CONFIG.AVATAR.EMOTIONS.NEUTRAL) || 'neutral';
            if (this.currentEmotion === neutralEmotion && !this.isAnimating) {
                this.performBlink();
            }
            
            // 3-6秒后再次眨眼
            const nextBlinkTime = 3000 + Math.random() * 3000;
            setTimeout(blink, nextBlinkTime);
        };
        
        // 初始延迟2秒开始眨眼
        setTimeout(blink, 2000);
    }

    /**
     * 执行眨眼动画
     */
    performBlink() {
        const eyes = this.avatar.querySelectorAll('.eye');
        eyes.forEach(eye => {
            eye.style.height = '4px';
            setTimeout(() => {
                eye.style.height = '';
            }, 150);
        });
    }

    /**
     * 模拟打字效果（与语音同步）
     */
    simulateTyping(text, onCharacter, onComplete) {
        this.startTalking();
        
        let index = 0;
        const typeInterval = setInterval(() => {
            if (index < text.length) {
                if (onCharacter) {
                    onCharacter(text[index]);
                }
                index++;
                
                // 随机眨眼
                if (Math.random() < 0.08) {
                    this.performBlink();
                }
            } else {
                clearInterval(typeInterval);
                this.stopTalking();
                if (onComplete) {
                    onComplete();
                }
            }
        }, 50 + Math.random() * 50);
        
        return typeInterval;
    }

    /**
     * 启用/禁用鼠标跟随
     */
    toggleMouseFollow(enabled) {
        this.isMouseFollowing = enabled;
        if (enabled) {
            this.avatar.classList.add('mouse-follow');
        } else {
            this.avatar.classList.remove('mouse-follow');
            // 重置瞳孔位置
            const pupils = this.avatar.querySelectorAll('.pupil');
            pupils.forEach(pupil => {
                pupil.style.transform = 'translate(-50%, -50%)';
            });
        }
    }

    /**
     * 获取当前情感状态
     */
    getCurrentEmotion() {
        return this.currentEmotion;
    }

    /**
     * 重置头像状态
     */
    reset() {
        this.clearEmotionClasses();
        const neutralEmotion = (CONFIG && CONFIG.AVATAR && CONFIG.AVATAR.EMOTIONS && CONFIG.AVATAR.EMOTIONS.NEUTRAL) || 'neutral';
        this.setEmotion(neutralEmotion);
        if (this.emotionTimeout) {
            clearTimeout(this.emotionTimeout);
            this.emotionTimeout = null;
        }
    }

    /**
     * 销毁控制器
     */
    destroy() {
        if (this.emotionTimeout) {
            clearTimeout(this.emotionTimeout);
        }
        this.avatar.className = 'avatar';
    }
}

// 导出到全局作用域
window.AvatarController = AvatarController;