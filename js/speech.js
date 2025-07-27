/**
 * 语音输入管理器
 * 负责处理Web Speech API的语音识别功能
 */
class SpeechManager {
    constructor() {
        this.recognition = null;
        this.isRecording = false;
        this.isSupported = false;
        this.finalTranscript = '';
        this.interimTranscript = '';
        this.stopTimeout = null;
        
        this.onResult = null;
        this.onStart = null;
        this.onEnd = null;
        this.onError = null;
        
        this.init();
    }

    init() {
        // 检查浏览器支持
        if ('webkitSpeechRecognition' in window) {
            this.recognition = new webkitSpeechRecognition();
            this.isSupported = true;
        } else if ('SpeechRecognition' in window) {
            this.recognition = new SpeechRecognition();
            this.isSupported = true;
        } else {
            console.warn('当前浏览器不支持语音识别');
            this.isSupported = false;
            return;
        }

        this.setupRecognition();
        console.log('SpeechManager 初始化完成');
    }

    setupRecognition() {
        if (!this.recognition) return;

        // 配置识别参数
        const speechConfig = (CONFIG && CONFIG.SPEECH) || {};
        
        this.recognition.lang = speechConfig.RECOGNITION_LANG || 'zh-CN';
        this.recognition.continuous = speechConfig.CONTINUOUS !== false;
        this.recognition.interimResults = speechConfig.INTERIM_RESULTS !== false;
        this.recognition.maxAlternatives = speechConfig.MAX_ALTERNATIVES || 1;

        // 设置事件监听器
        this.recognition.onstart = () => {
            console.log('语音识别开始');
            this.isRecording = true;
            if (this.onStart) this.onStart();
        };

        this.recognition.onresult = (event) => {
            this.handleResult(event);
        };

        this.recognition.onerror = (event) => {
            console.error('语音识别错误:', event.error);
            this.isRecording = false; // 确保状态同步
            this.handleError(event.error);
        };

        this.recognition.onend = () => {
            console.log('语音识别结束');
            this.isRecording = false; // 确保状态同步
            if (this.onEnd) this.onEnd();
        };
    }

    handleResult(event) {
        this.interimTranscript = '';
        this.finalTranscript = '';

        for (let i = event.resultIndex; i < event.results.length; i++) {
            const transcript = event.results[i][0].transcript;
            if (event.results[i].isFinal) {
                this.finalTranscript += transcript;
            } else {
                this.interimTranscript += transcript;
            }
        }

        // 调用回调函数
        if (this.onResult) {
            this.onResult({
                final: this.finalTranscript,
                interim: this.interimTranscript,
                isFinal: this.finalTranscript.length > 0
            });
        }

        // 如果有最终结果，设置自动停止
        if (this.finalTranscript) {
            this.setAutoStop();
        }
    }

    handleError(error) {
        let errorMessage = '语音识别发生错误';
        
        switch (error) {
            case 'no-speech':
                errorMessage = '没有检测到语音输入';
                break;
            case 'audio-capture':
                errorMessage = '无法捕获音频，请检查麦克风权限';
                break;
            case 'not-allowed':
                errorMessage = '麦克风权限被拒绝';
                break;
            case 'network':
                errorMessage = '网络错误，请检查网络连接';
                break;
            case 'service-not-allowed':
                errorMessage = '语音识别服务不可用';
                break;
            default:
                errorMessage = `语音识别错误: ${error}`;
        }

        if (this.onError) {
            this.onError(errorMessage);
        }
    }

    setAutoStop() {
        // 清除之前的定时器
        if (this.stopTimeout) {
            clearTimeout(this.stopTimeout);
        }

        // 设置自动停止定时器
        const autoStopTimeout = (CONFIG && CONFIG.SPEECH && CONFIG.SPEECH.AUTO_STOP_TIMEOUT) || 3000;
        this.stopTimeout = setTimeout(() => {
            if (this.isRecording) {
                this.stop();
            }
        }, autoStopTimeout);
    }

    start() {
        if (!this.isSupported) {
            if (this.onError) {
                this.onError('当前浏览器不支持语音识别功能');
            }
            return false;
        }

        if (this.isRecording) {
            console.log('语音识别已在进行中');
            return false;
        }

        try {
            this.finalTranscript = '';
            this.interimTranscript = '';
            
            // 先强制停止之前可能残留的识别
            if (this.recognition) {
                try {
                    this.recognition.abort();
                } catch (e) {
                    // 忽略停止时的错误
                }
            }
            
            // 短暂延迟后重新开始
            setTimeout(() => {
                try {
                    this.recognition.start();
                } catch (error) {
                    console.error('延迟启动语音识别失败:', error);
                    this.isRecording = false;
                    if (this.onError) {
                        this.onError('启动语音识别失败，请重试');
                    }
                }
            }, 100);
            
            return true;
        } catch (error) {
            console.error('启动语音识别失败:', error);
            this.isRecording = false;
            if (this.onError) {
                this.onError('启动语音识别失败，请重试');
            }
            return false;
        }
    }

    stop() {
        // 清除自动停止定时器
        if (this.stopTimeout) {
            clearTimeout(this.stopTimeout);
            this.stopTimeout = null;
        }

        if (!this.isRecording && this.recognition) {
            // 即使状态显示未在录音，也尝试停止以确保清理
            try {
                this.recognition.abort();
            } catch (error) {
                console.warn('强制停止语音识别:', error);
            }
            return;
        }

        if (this.recognition) {
            try {
                this.recognition.stop();
            } catch (error) {
                console.error('停止语音识别失败:', error);
                // 如果停止失败，尝试强制中止
                try {
                    this.recognition.abort();
                } catch (abortError) {
                    console.error('强制中止语音识别失败:', abortError);
                }
            }
        }
        
        // 确保状态重置
        this.isRecording = false;
    }

    toggle() {
        if (this.isRecording) {
            this.stop();
        } else {
            this.start();
        }
    }

    // 设置回调函数
    setOnResult(callback) {
        this.onResult = callback;
    }

    setOnStart(callback) {
        this.onStart = callback;
    }

    setOnEnd(callback) {
        this.onEnd = callback;
    }

    setOnError(callback) {
        this.onError = callback;
    }

    // 获取状态
    getIsSupported() {
        return this.isSupported;
    }

    getIsRecording() {
        return this.isRecording;
    }

    // 销毁
    destroy() {
        this.stop();
        if (this.stopTimeout) {
            clearTimeout(this.stopTimeout);
        }
        this.recognition = null;
    }
}

// 导出到全局作用域
window.SpeechManager = SpeechManager;