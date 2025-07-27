/**
 * 语音输出管理器
 * 负责AI回复的语音播放功能
 */
class VoiceOutputManager {
    constructor() {
        this.synthesis = null;
        this.currentUtterance = null;
        this.isSupported = false;
        this.isEnabled = false;
        this.voices = [];
        this.selectedVoice = null;
        this.settings = {
            rate: 1.0,    // 语速 0.1-10
            pitch: 1.0,   // 音调 0-2
            volume: 1.0,  // 音量 0-1
            voice: null,  // 选择的声音
            enabled: false // 是否启用语音输出
        };
        
        this.init();
    }

    init() {
        // 检查浏览器支持
        if ('speechSynthesis' in window) {
            this.synthesis = window.speechSynthesis;
            this.isSupported = true;
            this.loadVoices();
            this.loadSettings();
            console.log('语音输出管理器初始化完成');
        } else {
            console.warn('当前浏览器不支持语音合成');
        }
    }

    loadVoices() {
        if (!this.isSupported) return;

        const updateVoices = () => {
            this.voices = this.synthesis.getVoices();
            
            // 优先选择中文声音
            const chineseVoices = this.voices.filter(voice => 
                voice.lang.startsWith('zh') || voice.lang.startsWith('cmn')
            );
            
            if (chineseVoices.length > 0) {
                this.selectedVoice = chineseVoices[0];
            } else if (this.voices.length > 0) {
                this.selectedVoice = this.voices[0];
            }
        };

        updateVoices();
        
        // 有些浏览器需要异步加载声音
        if (this.voices.length === 0) {
            this.synthesis.onvoiceschanged = updateVoices;
        }
    }

    loadSettings() {
        const saved = StorageManager.get('voice_output_settings', {});
        this.settings = { ...this.settings, ...saved };
        this.isEnabled = this.settings.enabled;
        
        // 恢复选择的声音
        if (this.settings.voice && this.voices.length > 0) {
            const voice = this.voices.find(v => v.name === this.settings.voice);
            if (voice) {
                this.selectedVoice = voice;
            }
        }
    }

    saveSettings() {
        StorageManager.set('voice_output_settings', this.settings);
    }

    // 播放文本
    speak(text, options = {}) {
        if (!this.isSupported || !this.isEnabled || !text.trim()) {
            return false;
        }

        // 停止当前播放
        this.stop();

        try {
            const utterance = new SpeechSynthesisUtterance(text);
            
            // 设置语音参数
            utterance.rate = options.rate || this.settings.rate;
            utterance.pitch = options.pitch || this.settings.pitch;
            utterance.volume = options.volume || this.settings.volume;
            
            if (this.selectedVoice) {
                utterance.voice = this.selectedVoice;
            }

            // 设置事件监听器
            utterance.onstart = () => {
                console.log('语音播放开始');
                this.onSpeakStart && this.onSpeakStart();
            };

            utterance.onend = () => {
                console.log('语音播放结束');
                this.currentUtterance = null;
                this.onSpeakEnd && this.onSpeakEnd();
            };

            utterance.onerror = (event) => {
                console.error('语音播放错误:', event.error);
                this.currentUtterance = null;
                this.onSpeakError && this.onSpeakError(event.error);
            };

            this.currentUtterance = utterance;
            this.synthesis.speak(utterance);
            return true;
        } catch (error) {
            console.error('创建语音播放失败:', error);
            return false;
        }
    }

    // 停止播放
    stop() {
        if (this.synthesis && this.synthesis.speaking) {
            this.synthesis.cancel();
            this.currentUtterance = null;
        }
    }

    // 暂停播放
    pause() {
        if (this.synthesis && this.synthesis.speaking) {
            this.synthesis.pause();
        }
    }

    // 恢复播放
    resume() {
        if (this.synthesis && this.synthesis.paused) {
            this.synthesis.resume();
        }
    }

    // 设置语音参数
    setVoiceSettings(settings) {
        this.settings = { ...this.settings, ...settings };
        
        // 更新选择的声音
        if (settings.voice && this.voices.length > 0) {
            const voice = this.voices.find(v => v.name === settings.voice);
            if (voice) {
                this.selectedVoice = voice;
            }
        }
        
        this.saveSettings();
    }

    // 启用/禁用语音输出
    setEnabled(enabled) {
        this.isEnabled = enabled;
        this.settings.enabled = enabled;
        this.saveSettings();
        
        if (!enabled) {
            this.stop();
        }
    }

    // 获取可用声音列表
    getVoices() {
        return this.voices.map(voice => ({
            name: voice.name,
            lang: voice.lang,
            localService: voice.localService,
            default: voice.default
        }));
    }

    // 获取状态
    isPlaying() {
        return this.synthesis && this.synthesis.speaking;
    }

    isPaused() {
        return this.synthesis && this.synthesis.paused;
    }

    getSettings() {
        return { ...this.settings };
    }

    isVoiceEnabled() {
        return this.isEnabled;
    }

    // 设置事件回调
    setOnSpeakStart(callback) {
        this.onSpeakStart = callback;
    }

    setOnSpeakEnd(callback) {
        this.onSpeakEnd = callback;
    }

    setOnSpeakError(callback) {
        this.onSpeakError = callback;
    }

    // 处理AI回复的语音播放
    speakAIResponse(message) {
        if (!this.isEnabled) return;

        // 清理文本，移除markdown和特殊字符
        let cleanText = message
            .replace(/[#*`~_\[\]]/g, '') // 移除markdown符号
            .replace(/https?:\/\/[^\s]+/g, '链接') // 替换链接
            .replace(/\n+/g, '。') // 换行替换为句号
            .trim();

        if (cleanText) {
            this.speak(cleanText);
        }
    }
}

/**
 * 输入模式管理器
 * 负责语音模式和文字模式的切换
 */
class InputModeManager {
    constructor() {
        this.currentMode = 'text'; // 'text' 或 'voice'
        this.speechManager = null;
        this.isRecording = false;
        this.settings = {
            autoSend: true,           // 语音识别后自动发送
            interruptEnabled: true,   // 支持语音打断
            voiceTimeout: 3000        // 语音超时时间
        };
        
        this.init();
    }

    init() {
        this.loadSettings();
        this.setupUI();
        this.setupEventListeners();
    }

    loadSettings() {
        const saved = StorageManager.get('input_mode_settings', {});
        this.settings = { ...this.settings, ...saved };
    }

    saveSettings() {
        StorageManager.set('input_mode_settings', this.settings);
    }

    setupUI() {
        const inputSection = document.querySelector('.input-section');
        if (!inputSection) return;

        // 创建模式切换按钮
        const modeToggle = document.createElement('div');
        modeToggle.className = 'input-mode-toggle';
        modeToggle.innerHTML = `
            <button id="text-mode-btn" class="mode-btn ${this.currentMode === 'text' ? 'active' : ''}">
                💬 文字模式
            </button>
            <button id="voice-mode-btn" class="mode-btn ${this.currentMode === 'voice' ? 'active' : ''}">
                🎤 语音模式
            </button>
        `;

        // 插入到输入区域前面
        inputSection.insertBefore(modeToggle, inputSection.firstChild);

        // 根据当前模式显示对应的输入界面
        this.updateInputUI();
    }

    setupEventListeners() {
        // 模式切换按钮
        document.addEventListener('click', (e) => {
            if (e.target.id === 'text-mode-btn') {
                this.switchMode('text');
            } else if (e.target.id === 'voice-mode-btn') {
                this.switchMode('voice');
            }
        });
    }

    switchMode(mode) {
        if (this.currentMode === mode) return;

        this.currentMode = mode;
        this.updateInputUI();
        this.updateModeButtons();

        // 停止当前的语音识别
        if (this.speechManager && this.speechManager.getIsRecording()) {
            this.speechManager.stop();
        }

        // 通知其他组件模式已切换
        if (window.uiManager) {
            window.uiManager.onInputModeChanged(mode);
        }
    }

    updateModeButtons() {
        const textBtn = document.getElementById('text-mode-btn');
        const voiceBtn = document.getElementById('voice-mode-btn');

        if (textBtn && voiceBtn) {
            textBtn.classList.toggle('active', this.currentMode === 'text');
            voiceBtn.classList.toggle('active', this.currentMode === 'voice');
        }
    }

    updateInputUI() {
        const chatInput = document.querySelector('.chat-input');
        const messageInput = document.getElementById('message-input');
        const sendBtn = document.getElementById('send-btn');
        const voiceBtn = document.getElementById('voice-btn');
        const voiceStatus = document.getElementById('voice-status');

        if (!chatInput) return;

        if (this.currentMode === 'text') {
            // 文字模式：显示输入框和发送按钮，隐藏语音按钮
            if (messageInput) messageInput.style.display = 'block';
            if (sendBtn) sendBtn.style.display = 'block';
            if (voiceBtn) voiceBtn.style.display = 'none';
            if (voiceStatus) voiceStatus.style.display = 'none';
            
            chatInput.classList.remove('voice-mode');
            chatInput.classList.add('text-mode');
        } else {
            // 语音模式：隐藏输入框，显示语音按钮和状态
            if (messageInput) messageInput.style.display = 'none';
            if (sendBtn) sendBtn.style.display = 'none';
            if (voiceBtn) voiceBtn.style.display = 'block';
            
            chatInput.classList.remove('text-mode');
            chatInput.classList.add('voice-mode');
            
            // 创建语音模式界面
            this.createVoiceModeUI();
        }
    }

    createVoiceModeUI() {
        const chatInput = document.querySelector('.chat-input');
        let voiceModeContainer = document.querySelector('.voice-mode-container');
        
        if (!voiceModeContainer) {
            voiceModeContainer = document.createElement('div');
            voiceModeContainer.className = 'voice-mode-container';
            voiceModeContainer.innerHTML = `
                <div class="voice-controls">
                    <button id="voice-record-btn" class="voice-record-btn">
                        <span class="voice-icon">🎤</span>
                        <span class="voice-text">点击说话</span>
                    </button>
                    <button id="voice-interrupt-btn" class="voice-interrupt-btn" style="display: none;">
                        ⏹️ 停止
                    </button>
                </div>
                <div id="voice-status-display" class="voice-status-display hidden">
                    <div class="voice-indicator">
                        <div class="voice-wave"></div>
                        <div class="voice-wave"></div>
                        <div class="voice-wave"></div>
                    </div>
                    <span class="voice-text">正在听...</span>
                </div>
                <div class="voice-settings">
                    <label class="voice-setting-item">
                        <input type="checkbox" id="auto-send-checkbox" ${this.settings.autoSend ? 'checked' : ''}>
                        <span>自动发送</span>
                    </label>
                    <label class="voice-setting-item">
                        <input type="checkbox" id="interrupt-enabled-checkbox" ${this.settings.interruptEnabled ? 'checked' : ''}>
                        <span>支持打断</span>
                    </label>
                </div>
            `;
            chatInput.appendChild(voiceModeContainer);
            
            // 设置语音模式事件监听器
            this.setupVoiceModeListeners();
        }
    }

    setupVoiceModeListeners() {
        const recordBtn = document.getElementById('voice-record-btn');
        const interruptBtn = document.getElementById('voice-interrupt-btn');
        const autoSendCheckbox = document.getElementById('auto-send-checkbox');
        const interruptCheckbox = document.getElementById('interrupt-enabled-checkbox');

        if (recordBtn) {
            recordBtn.addEventListener('click', () => this.toggleVoiceRecording());
        }

        if (interruptBtn) {
            interruptBtn.addEventListener('click', () => this.stopVoiceRecording());
        }

        if (autoSendCheckbox) {
            autoSendCheckbox.addEventListener('change', (e) => {
                this.settings.autoSend = e.target.checked;
                this.saveSettings();
            });
        }

        if (interruptCheckbox) {
            interruptCheckbox.addEventListener('change', (e) => {
                this.settings.interruptEnabled = e.target.checked;
                this.saveSettings();
            });
        }
    }

    toggleVoiceRecording() {
        if (!this.speechManager) {
            this.speechManager = new SpeechManager();
            this.setupSpeechManagerCallbacks();
        }

        if (this.speechManager.getIsRecording()) {
            this.stopVoiceRecording();
        } else {
            this.startVoiceRecording();
        }
    }

    startVoiceRecording() {
        if (this.speechManager && this.speechManager.start()) {
            this.isRecording = true;
            this.updateVoiceUI(true);
            
            // 如果启用了打断功能，停止当前播放
            if (this.settings.interruptEnabled && window.voiceOutputManager) {
                window.voiceOutputManager.stop();
            }
        }
    }

    stopVoiceRecording() {
        if (this.speechManager) {
            this.speechManager.stop();
            this.isRecording = false;
            this.updateVoiceUI(false);
        }
    }

    updateVoiceUI(recording) {
        const recordBtn = document.getElementById('voice-record-btn');
        const interruptBtn = document.getElementById('voice-interrupt-btn');
        const statusDisplay = document.getElementById('voice-status-display');

        if (recordBtn) {
            const icon = recordBtn.querySelector('.voice-icon');
            const text = recordBtn.querySelector('.voice-text');
            
            if (recording) {
                recordBtn.classList.add('recording');
                if (icon) icon.textContent = '🔴';
                if (text) text.textContent = '正在录音...';
            } else {
                recordBtn.classList.remove('recording');
                if (icon) icon.textContent = '🎤';
                if (text) text.textContent = '点击说话';
            }
        }

        if (interruptBtn) {
            interruptBtn.style.display = recording ? 'block' : 'none';
        }

        if (statusDisplay) {
            statusDisplay.classList.toggle('hidden', !recording);
        }
    }

    setupSpeechManagerCallbacks() {
        if (!this.speechManager) return;

        this.speechManager.setOnStart(() => {
            this.updateVoiceUI(true);
            if (window.avatarController) {
                window.avatarController.startListening();
            }
        });

        this.speechManager.setOnResult((result) => {
            const statusDisplay = document.getElementById('voice-status-display');
            if (statusDisplay) {
                const voiceText = statusDisplay.querySelector('.voice-text');
                if (voiceText) {
                    if (result.interim) {
                        voiceText.textContent = `识别中: ${result.interim}`;
                    } else if (result.final) {
                        voiceText.textContent = '识别完成';
                    }
                }
            }

            // 如果有最终结果且启用自动发送
            if (result.isFinal && result.final.trim() && this.settings.autoSend) {
                setTimeout(() => {
                    this.sendVoiceMessage(result.final);
                }, 500);
            }
        });

        this.speechManager.setOnEnd(() => {
            this.isRecording = false;
            this.updateVoiceUI(false);
            
            if (window.avatarController) {
                window.avatarController.setEmotion('neutral');
            }
        });

        this.speechManager.setOnError((error) => {
            this.isRecording = false;
            this.updateVoiceUI(false);
            
            if (window.uiManager) {
                window.uiManager.showNotification(error, 'error');
            }
            
            if (window.avatarController) {
                window.avatarController.setEmotion('sad');
            }
        });
    }

    sendVoiceMessage(text) {
        if (window.chatManager && text.trim()) {
            // 设置消息到输入框（即使隐藏）以保持兼容性
            const messageInput = document.getElementById('message-input');
            if (messageInput) {
                messageInput.value = text;
            }
            
            // 发送消息
            window.chatManager.sendMessage();
        }
    }

    getCurrentMode() {
        return this.currentMode;
    }

    getSettings() {
        return { ...this.settings };
    }
}

// 导出到全局作用域
window.VoiceOutputManager = VoiceOutputManager;
window.InputModeManager = InputModeManager;