/**
 * 优化的输入模式管理器
 * 使用单按钮切换文字/语音模式，节省空间
 */
class CompactInputModeManager {
    constructor() {
        this.currentMode = 'text'; // 'text' 或 'voice'
        this.speechManager = null;
        this.isRecording = false;
        this.settings = {
            autoSend: false,           // 语音识别后自动发送
            interruptEnabled: true     // 支持语音打断
        };
        
        this.init();
    }

    init() {
        this.loadSettings();
        this.setupUI();
        this.setupEventListeners();
        this.updateModeDisplay();
    }

    loadSettings() {
        const saved = StorageManager.get('compact_input_mode_settings', {});
        this.settings = { ...this.settings, ...saved };
    }

    saveSettings() {
        StorageManager.set('compact_input_mode_settings', this.settings);
    }

    setupUI() {
        // 设置语音设置面板的初始状态
        const autoSendToggle = document.getElementById('auto-send-toggle');
        const interruptToggle = document.getElementById('interrupt-toggle');
        
        if (autoSendToggle) {
            autoSendToggle.checked = this.settings.autoSend;
        }
        
        if (interruptToggle) {
            interruptToggle.checked = this.settings.interruptEnabled;
        }
    }

    setupEventListeners() {
        // 模式切换按钮
        const modeToggleBtn = document.getElementById('input-mode-toggle');
        if (modeToggleBtn) {
            modeToggleBtn.addEventListener('click', () => {
                this.toggleMode();
            });
        }

        // 语音录音按钮
        const voiceRecordBtn = document.getElementById('voice-record-btn');
        if (voiceRecordBtn) {
            voiceRecordBtn.addEventListener('click', () => {
                this.toggleVoiceRecording();
            });
        }

        // 语音设置
        const autoSendToggle = document.getElementById('auto-send-toggle');
        const interruptToggle = document.getElementById('interrupt-toggle');
        
        if (autoSendToggle) {
            autoSendToggle.addEventListener('change', (e) => {
                this.settings.autoSend = e.target.checked;
                this.saveSettings();
            });
        }
        
        if (interruptToggle) {
            interruptToggle.addEventListener('change', (e) => {
                this.settings.interruptEnabled = e.target.checked;
                this.saveSettings();
            });
        }
    }

    toggleMode() {
        this.currentMode = this.currentMode === 'text' ? 'voice' : 'text';
        this.updateModeDisplay();
        
        // 停止当前的语音识别
        if (this.speechManager && this.speechManager.getIsRecording()) {
            this.speechManager.stop();
        }

        // 通知其他组件模式已切换
        if (window.uiManager && window.uiManager.onInputModeChanged) {
            window.uiManager.onInputModeChanged(this.currentMode);
        }
    }

    updateModeDisplay() {
        const modeToggleBtn = document.getElementById('input-mode-toggle');
        const messageInput = document.getElementById('message-input');
        const voiceRecordBtn = document.getElementById('voice-record-btn');
        const voiceSettingsPanel = document.querySelector('.voice-settings-panel');
        const voiceStatus = document.getElementById('voice-status');

        if (!modeToggleBtn || !messageInput || !voiceRecordBtn) return;

        if (this.currentMode === 'text') {
            // 文字模式
            modeToggleBtn.textContent = '💬';
            modeToggleBtn.title = '切换到语音模式';
            messageInput.style.display = 'block';
            messageInput.placeholder = '输入消息...';
            voiceRecordBtn.classList.add('hidden');
            
            if (voiceSettingsPanel) {
                voiceSettingsPanel.classList.add('hidden');
            }
            if (voiceStatus) {
                voiceStatus.classList.add('hidden');
            }
        } else {
            // 语音模式
            modeToggleBtn.textContent = '🎤';
            modeToggleBtn.title = '切换到文字模式';
            messageInput.style.display = 'none';
            voiceRecordBtn.classList.remove('hidden');
            
            if (voiceSettingsPanel) {
                voiceSettingsPanel.classList.remove('hidden');
            }

            // 初始化语音管理器（如果还没有）
            if (!this.speechManager) {
                this.initializeSpeechManager();
            }
        }
    }

    initializeSpeechManager() {
        if (!window.SpeechManager) {
            console.warn('SpeechManager 未加载');
            return;
        }

        this.speechManager = new SpeechManager();
        
        if (!this.speechManager.getIsSupported()) {
            if (window.uiManager) {
                window.uiManager.showNotification('当前浏览器不支持语音识别', 'error');
            }
            this.currentMode = 'text';
            this.updateModeDisplay();
            return;
        }

        this.setupSpeechCallbacks();
    }

    setupSpeechCallbacks() {
        if (!this.speechManager) return;

        this.speechManager.setOnStart(() => {
            this.updateVoiceRecordingUI(true);
            
            // 如果启用了打断功能，停止当前播放
            if (this.settings.interruptEnabled && window.uiManager && window.uiManager.voiceOutputManager) {
                window.uiManager.voiceOutputManager.stop();
            }
            
            if (window.avatarController) {
                window.avatarController.startListening();
            }
        });

        this.speechManager.setOnResult((result) => {
            this.handleVoiceResult(result);
        });

        this.speechManager.setOnEnd(() => {
            this.updateVoiceRecordingUI(false);
            this.isRecording = false;
            
            if (window.avatarController) {
                window.avatarController.setEmotion('neutral');
            }
        });

        this.speechManager.setOnError((error) => {
            this.updateVoiceRecordingUI(false);
            this.isRecording = false;
            
            if (window.uiManager) {
                window.uiManager.showNotification(error, 'error');
            }
            
            if (window.avatarController) {
                window.avatarController.setEmotion('sad');
            }
        });
    }

    toggleVoiceRecording() {
        if (!this.speechManager) {
            this.initializeSpeechManager();
            if (!this.speechManager) return;
        }

        if (this.speechManager.getIsRecording()) {
            this.speechManager.stop();
        } else {
            if (this.speechManager.start()) {
                this.isRecording = true;
            }
        }
    }

    updateVoiceRecordingUI(recording) {
        const voiceRecordBtn = document.getElementById('voice-record-btn');
        const voiceStatus = document.getElementById('voice-status');

        if (voiceRecordBtn) {
            if (recording) {
                voiceRecordBtn.textContent = '🔴';
                voiceRecordBtn.title = '停止录音';
                voiceRecordBtn.classList.add('recording');
            } else {
                voiceRecordBtn.textContent = '🎤';
                voiceRecordBtn.title = '点击录音';
                voiceRecordBtn.classList.remove('recording');
            }
        }

        if (voiceStatus) {
            voiceStatus.classList.toggle('hidden', !recording);
        }
    }

    handleVoiceResult(result) {
        const messageInput = document.getElementById('message-input');
        const voiceStatus = document.getElementById('voice-status');
        
        // 更新隐藏的输入框内容（用于发送）
        if (messageInput) {
            const displayText = result.final + (result.interim ? ` ${result.interim}` : '');
            messageInput.value = displayText;
        }

        // 更新状态显示
        if (voiceStatus) {
            const voiceText = voiceStatus.querySelector('.voice-text');
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
    }

    sendVoiceMessage(text) {
        if (window.chatManager && text.trim()) {
            // 设置消息到输入框
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

    // 强制切换到文字模式（用于错误处理）
    forceTextMode() {
        this.currentMode = 'text';
        this.updateModeDisplay();
    }

    // 获取语音识别状态
    isVoiceRecording() {
        return this.isRecording;
    }
}

// 导出到全局作用域
window.CompactInputModeManager = CompactInputModeManager;