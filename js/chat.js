class ChatManager {
    constructor() {
        this.messagesContainer = document.getElementById('messages');
        this.messageInput = document.getElementById('message-input');
        this.sendButton = document.getElementById('send-btn');
        this.apiManager = new APIManager();
        this.currentRole = StorageManager.getCurrentRole();
        this.conversationHistory = [];
        this.isTyping = false;
        this.currentStreamElement = null;
        
        this.setupEventListeners();
        this.loadChatHistory();
    }

    setupEventListeners() {
        this.sendButton.addEventListener('click', () => this.sendMessage());
        
        this.messageInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                this.sendMessage();
            }
        });

        this.messageInput.addEventListener('input', () => {
            this.adjustTextareaHeight();
        });
    }

    adjustTextareaHeight() {
        this.messageInput.style.height = 'auto';
        this.messageInput.style.height = Math.min(this.messageInput.scrollHeight, 120) + 'px';
    }

    async sendMessage() {
        const content = this.messageInput.value.trim();
        if (!content || this.isTyping) return;

        // 添加用户消息
        this.addMessage({
            type: 'user',
            content: content,
            timestamp: Date.now()
        });

        // 清空输入框
        this.messageInput.value = '';
        this.adjustTextareaHeight();

        // 显示AI思考状态
        this.showTypingIndicator();
        if (window.avatarController) {
            window.avatarController.startThinking();
        }

        try {
            await this.getAIResponse(content);
        } catch (error) {
            this.hideTypingIndicator();
            this.addMessage({
                type: 'error',
                content: `错误: ${error.message}`,
                timestamp: Date.now()
            });
            if (window.avatarController) {
                window.avatarController.setEmotion('sad');
            }
        }
    }

    async getAIResponse(userMessage) {
        // 构建对话历史
        const messages = this.buildMessageHistory(userMessage);
        
        this.isTyping = true;
        this.hideTypingIndicator();
        
        // 创建AI消息元素
        const aiMessage = this.addMessage({
            type: 'assistant',
            content: '',
            timestamp: Date.now(),
            streaming: true
        });

        this.currentStreamElement = aiMessage.messageContent;

        try {
            const fullResponse = await this.apiManager.sendMessage(messages, {
                stream: true,
                onStream: (chunk, fullContent) => {
                    this.handleStreamChunk(chunk, fullContent);
                },
                onComplete: (fullContent) => {
                    this.handleStreamComplete(fullContent, aiMessage);
                },
                onError: (error) => {
                    this.handleStreamError(error, aiMessage);
                }
            });

        } catch (error) {
            this.handleStreamError(error, aiMessage);
        }
    }

    buildMessageHistory(userMessage) {
        const messages = [];
        
        // 添加系统角色提示
        if (this.currentRole && this.currentRole.prompt) {
            messages.push({
                role: 'system',
                content: this.currentRole.prompt
            });
        }

        // 添加最近的对话历史（限制数量以避免超出token限制）
        const recentHistory = this.conversationHistory.slice(-10);
        recentHistory.forEach(msg => {
            if (msg.type === 'user') {
                messages.push({
                    role: 'user',
                    content: msg.content
                });
            } else if (msg.type === 'assistant') {
                messages.push({
                    role: 'assistant',
                    content: msg.content
                });
            }
        });

        // 添加当前用户消息
        messages.push({
            role: 'user',
            content: userMessage
        });

        return messages;
    }

    handleStreamChunk(chunk, fullContent) {
        if (this.currentStreamElement) {
            this.currentStreamElement.textContent = fullContent;
            this.currentStreamElement.classList.add('streaming-text');
            
            // 自动滚动到底部
            this.scrollToBottom();
            
            // 头像说话动画
            if (window.avatarController) {
                window.avatarController.startTalking();
            }
        }
    }

    handleStreamComplete(fullContent, messageElement) {
        this.isTyping = false;
        
        if (this.currentStreamElement) {
            this.currentStreamElement.classList.remove('streaming-text');
            this.currentStreamElement.textContent = fullContent;
        }

        // 更新消息内容
        messageElement.message.content = fullContent;
        messageElement.message.streaming = false;
        
        // 保存到历史记录
        StorageManager.saveMessage(messageElement.message);
        this.conversationHistory.push(messageElement.message);

        // 头像停止说话，显示高兴表情
        if (window.avatarController) {
            window.avatarController.stopTalking();
            window.avatarController.reactToMessage(messageElement.message);
        }

        this.currentStreamElement = null;
        this.scrollToBottom();
    }

    handleStreamError(error, messageElement) {
        this.isTyping = false;
        
        if (this.currentStreamElement) {
            this.currentStreamElement.classList.remove('streaming-text');
        }

        // 更新消息为错误状态
        messageElement.message.type = 'error';
        messageElement.message.content = `错误: ${error.message}`;
        messageElement.element.classList.add('error-message');
        
        if (this.currentStreamElement) {
            this.currentStreamElement.textContent = messageElement.message.content;
        }

        // 添加重试按钮
        this.addRetryButton(messageElement.element, () => {
            this.retryLastMessage();
        });

        if (window.avatarController) {
            window.avatarController.stopTalking();
            window.avatarController.setEmotion('sad');
        }

        this.currentStreamElement = null;
    }

    addMessage(message) {
        const messageElement = document.createElement('div');
        messageElement.classList.add('message', message.type);
        
        if (message.streaming) {
            messageElement.classList.add('streaming');
        }

        const avatar = document.createElement('div');
        avatar.classList.add('message-avatar');
        avatar.textContent = this.getMessageAvatar(message.type);

        const content = document.createElement('div');
        content.classList.add('message-content');
        content.textContent = message.content;

        const time = document.createElement('div');
        time.classList.add('message-time');
        time.textContent = this.formatTime(message.timestamp);

        messageElement.appendChild(avatar);
        messageElement.appendChild(content);
        content.appendChild(time);

        this.messagesContainer.appendChild(messageElement);
        this.scrollToBottom();

        // 保存非流式消息到历史记录
        if (!message.streaming && message.type !== 'error') {
            StorageManager.saveMessage(message);
            this.conversationHistory.push(message);
        }

        // 头像反应
        if (window.avatarController) {
            window.avatarController.reactToMessage(message);
        }

        return {
            element: messageElement,
            messageContent: content,
            message: message
        };
    }

    getMessageAvatar(type) {
        switch (type) {
            case 'user':
                return '👤';
            case 'assistant':
                return this.currentRole ? '🤖' : '🤖';
            case 'system':
                return '⚙️';
            case 'error':
                return '❌';
            default:
                return '💬';
        }
    }

    showTypingIndicator() {
        const typingElement = document.createElement('div');
        typingElement.classList.add('message', 'assistant', 'typing-indicator-container');
        typingElement.id = 'typing-indicator';

        const avatar = document.createElement('div');
        avatar.classList.add('message-avatar');
        avatar.textContent = '🤖';

        const typingIndicator = document.createElement('div');
        typingIndicator.classList.add('typing-indicator');
        
        for (let i = 0; i < 3; i++) {
            const dot = document.createElement('div');
            dot.classList.add('typing-dot');
            typingIndicator.appendChild(dot);
        }

        typingElement.appendChild(avatar);
        typingElement.appendChild(typingIndicator);
        this.messagesContainer.appendChild(typingElement);
        this.scrollToBottom();
    }

    hideTypingIndicator() {
        const typingIndicator = document.getElementById('typing-indicator');
        if (typingIndicator) {
            typingIndicator.remove();
        }
    }

    addRetryButton(messageElement, retryCallback) {
        const retryButton = document.createElement('button');
        retryButton.classList.add('retry-btn');
        retryButton.textContent = '重试';
        retryButton.addEventListener('click', retryCallback);
        
        messageElement.appendChild(retryButton);
    }

    retryLastMessage() {
        // 移除最后的错误消息
        const lastMessage = this.messagesContainer.lastElementChild;
        if (lastMessage && lastMessage.classList.contains('error-message')) {
            lastMessage.remove();
        }

        // 重新发送最后的用户消息
        if (this.conversationHistory.length > 0) {
            const lastUserMessage = [...this.conversationHistory].reverse().find(msg => msg.type === 'user');
            if (lastUserMessage) {
                this.getAIResponse(lastUserMessage.content);
            }
        }
    }

    setRole(role) {
        this.currentRole = role;
        StorageManager.saveCurrentRole(role);
        
        // 检查是否需要保留上下文
        const settings = StorageManager.getSettings();
        const shouldPreserveContext = settings.preserveContext;
        
        // 显示角色切换消息
        if (role) {
            this.addMessage({
                type: 'system',
                content: `已切换到角色: ${role.name} - ${role.description}`,
                timestamp: Date.now()
            });
            
            // 如果不保留上下文，清空对话历史
            if (!shouldPreserveContext) {
                this.addMessage({
                    type: 'system',
                    content: '已清空之前的对话上下文，开始新的对话',
                    timestamp: Date.now()
                });
                
                // 清空内存中的对话历史，但保留系统消息
                setTimeout(() => {
                    this.conversationHistory = this.conversationHistory.filter(msg => msg.type === 'system');
                }, 100);
            }
        }
    }

    clearChat() {
        this.messagesContainer.innerHTML = '';
        this.conversationHistory = [];
        StorageManager.clearChatHistory();
    }

    loadChatHistory() {
        const history = StorageManager.getChatHistory();
        history.forEach(message => {
            this.addMessage(message);
        });
        this.conversationHistory = [...history];
    }

    formatTime(timestamp) {
        const date = new Date(timestamp);
        return date.toLocaleTimeString('zh-CN', {
            hour: '2-digit',
            minute: '2-digit'
        });
    }

    scrollToBottom() {
        requestAnimationFrame(() => {
            this.messagesContainer.parentElement.scrollTop = this.messagesContainer.parentElement.scrollHeight;
        });
    }
}

window.ChatManager = ChatManager;