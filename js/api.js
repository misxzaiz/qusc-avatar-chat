class APIManager {
    constructor() {
        this.settings = StorageManager.getSettings();
        this.controller = null;
    }

    updateSettings(newSettings) {
        this.settings = { ...this.settings, ...newSettings };
        StorageManager.saveSettings(this.settings);
    }

    async sendMessage(messages, options = {}) {
        if (!this.settings.apiKey) {
            throw new Error('请先设置DeepSeek API密钥');
        }

        const {
            stream = true,
            onStream = null,
            onComplete = null,
            onError = null
        } = options;

        this.controller = new AbortController();

        const requestBody = {
            model: CONFIG.API.DEEPSEEK_MODEL,
            messages: messages,
            stream: stream,
            max_tokens: CONFIG.API.MAX_TOKENS,
            temperature: 0.7
        };

        try {
            const response = await fetch(CONFIG.API.DEEPSEEK_URL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.settings.apiKey}`
                },
                body: JSON.stringify(requestBody),
                signal: this.controller.signal
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.error?.message || `HTTP ${response.status}: ${response.statusText}`);
            }

            if (stream) {
                return this.handleStreamResponse(response, onStream, onComplete, onError);
            } else {
                const data = await response.json();
                const content = data.choices[0]?.message?.content || '';
                if (onComplete) onComplete(content);
                return content;
            }
        } catch (error) {
            if (error.name === 'AbortError') {
                console.log('请求已取消');
                return;
            }
            console.error('API请求错误:', error);
            if (onError) onError(error);
            throw error;
        }
    }

    async handleStreamResponse(response, onStream, onComplete, onError) {
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let fullContent = '';

        try {
            while (true) {
                const { done, value } = await reader.read();
                
                if (done) {
                    if (onComplete) onComplete(fullContent);
                    break;
                }

                const chunk = decoder.decode(value, { stream: true });
                const lines = chunk.split('\n').filter(line => line.trim());

                for (const line of lines) {
                    if (line.startsWith('data: ')) {
                        const data = line.slice(6);
                        
                        if (data === '[DONE]') {
                            if (onComplete) onComplete(fullContent);
                            return fullContent;
                        }

                        try {
                            const parsed = JSON.parse(data);
                            const content = parsed.choices[0]?.delta?.content || '';
                            
                            if (content) {
                                fullContent += content;
                                if (onStream) onStream(content, fullContent);
                            }
                        } catch (parseError) {
                            console.warn('解析流数据失败:', parseError);
                        }
                    }
                }
            }
        } catch (error) {
            console.error('流处理错误:', error);
            if (onError) onError(error);
            throw error;
        } finally {
            reader.releaseLock();
        }

        return fullContent;
    }

    async generateRole(keywords) {
        const messages = [
            {
                role: 'system',
                content: CONFIG.ROLE_GENERATION.SYSTEM_PROMPT
            },
            {
                role: 'user',
                content: `关键词：${keywords}`
            }
        ];

        try {
            const response = await this.sendMessage(messages, { stream: false });
            
            // 尝试解析JSON响应
            const jsonMatch = response.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                const roleData = JSON.parse(jsonMatch[0]);
                return roleData;
            } else {
                throw new Error('无法解析角色数据');
            }
        } catch (error) {
            console.error('角色生成失败:', error);
            throw new Error('角色生成失败: ' + error.message);
        }
    }

    cancelRequest() {
        if (this.controller) {
            this.controller.abort();
            this.controller = null;
        }
    }

    async testConnection() {
        try {
            const testMessages = [
                {
                    role: 'user',
                    content: '你好'
                }
            ];

            await this.sendMessage(testMessages, { 
                stream: false,
                onComplete: () => {},
                onError: () => {}
            });
            
            return { success: true, message: '连接成功' };
        } catch (error) {
            return { success: false, message: error.message };
        }
    }
}

window.APIManager = APIManager;