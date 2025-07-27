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

        // 清除所有现有的快速回答按钮
        this.clearAllQuickReplies();

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
            if (window.avatarController) {
                window.avatarController.setEmotion('sad');
            }
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

        // 生成并显示快速回答按钮
        this.addQuickReplies(messageElement.element, fullContent);

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
        
        // 先添加所有历史消息
        history.forEach((message, index) => {
            this.addMessage(message);
        });
        
        this.conversationHistory = [...history];
        
        // 为最后一条AI消息添加快速回答按钮
        if (history.length > 0) {
            const lastAIMessage = [...history].reverse().find(msg => msg.type === 'assistant');
            if (lastAIMessage) {
                // 查找对应的消息元素
                setTimeout(() => {
                    const assistantMessages = this.messagesContainer.querySelectorAll('.message.assistant');
                    if (assistantMessages.length > 0) {
                        const lastAssistantElement = assistantMessages[assistantMessages.length - 1];
                        this.addQuickReplies(lastAssistantElement, lastAIMessage.content);
                    }
                }, 200);
            }
        }
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

    // 生成快速回答按钮
    generateQuickReplies(aiResponse) {
        // 根据AI回复内容智能生成快速回答选项
        const quickReplies = [];
        
        // 通用的回答选项
        const commonReplies = [
            "继续",
            "详细说明",
            "举个例子",
            "换个思路"
        ];
        
        // 根据AI回复内容添加智能选项
        const response = aiResponse.toLowerCase();
        
        // 问题相关
        if (response.includes('问题') || response.includes('疑问') || response.includes('困惑')) {
            quickReplies.push("我明白了", "还有问题");
        }
        
        // 步骤/教程相关
        if (response.includes('步骤') || response.includes('方法') || response.includes('教程') || response.includes('流程')) {
            quickReplies.push("下一步", "重新开始", "跳过这步");
        }
        
        // 代码相关
        if (response.includes('代码') || response.includes('编程') || response.includes('script') || response.includes('function')) {
            quickReplies.push("解释代码", "优化建议", "完整代码");
        }
        
        // 建议相关
        if (response.includes('建议') || response.includes('推荐') || response.includes('应该')) {
            quickReplies.push("更多建议", "为什么？", "其他选择");
        }
        
        // 错误/问题相关
        if (response.includes('错误') || response.includes('失败') || response.includes('异常')) {
            quickReplies.push("如何解决", "预防措施", "类似问题");
        }
        
        // 技术相关
        if (response.includes('api') || response.includes('接口') || response.includes('服务')) {
            quickReplies.push("API文档", "示例代码", "参数说明");
        }
        
        if (response.includes('数据库') || response.includes('sql') || response.includes('查询')) {
            quickReplies.push("查询优化", "数据结构", "性能提升");
        }
        
        // 学习相关
        if (response.includes('学习') || response.includes('教') || response.includes('了解') || response.includes('掌握')) {
            quickReplies.push("学习资源", "练习题目", "进阶内容");
        }
        
        // 解释相关
        if (response.includes('解释') || response.includes('说明') || response.includes('原理')) {
            quickReplies.push("更深入", "应用场景", "对比分析");
        }
        
        // 工具/软件相关
        if (response.includes('工具') || response.includes('软件') || response.includes('应用')) {
            quickReplies.push("推荐工具", "使用技巧", "替代方案");
        }
        
        // 设计相关
        if (response.includes('设计') || response.includes('界面') || response.includes('ui') || response.includes('ux')) {
            quickReplies.push("设计原则", "改进建议", "案例分析");
        }
        
        // 合并通用回复和智能回复，去重并限制数量
        const allReplies = [...new Set([...quickReplies, ...commonReplies])];
        
        // 智能选择回复选项：如果有特定的智能回复，优先选择，否则使用通用回复
        let selectedReplies;
        if (quickReplies.length > 0) {
            // 有智能回复时，混合使用智能回复和部分通用回复
            const intelligentReplies = quickReplies.slice(0, 3);
            const generalReplies = commonReplies.slice(0, 2);
            selectedReplies = [...intelligentReplies, ...generalReplies];
        } else {
            // 没有智能回复时，使用通用回复
            selectedReplies = commonReplies;
        }
        
        // 随机打乱并限制数量
        return this.shuffleArray(selectedReplies).slice(0, Math.min(4, selectedReplies.length));
    }
    
    // 数组洗牌算法
    shuffleArray(array) {
        const shuffled = [...array];
        for (let i = shuffled.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
        }
        return shuffled;
    }
    
    // 添加快速回答按钮到消息元素
    addQuickReplies(messageElement, aiResponse) {
        // 只为assistant消息添加快速回答
        if (!messageElement.classList.contains('assistant')) {
            return;
        }
        
        // 检查是否已经有快速回答按钮
        const existingQuickReplies = messageElement.querySelector('.quick-replies');
        if (existingQuickReplies) {
            existingQuickReplies.remove();
        }
        
        // 生成快速回答选项
        const quickReplies = this.generateQuickReplies(aiResponse);
        
        if (quickReplies.length === 0) {
            return;
        }
        
        // 创建快速回答容器
        const quickRepliesContainer = document.createElement('div');
        quickRepliesContainer.classList.add('quick-replies');
        
        // 创建快速回答按钮
        quickReplies.forEach(replyText => {
            const quickReplyBtn = document.createElement('button');
            quickReplyBtn.classList.add('quick-reply-btn');
            quickReplyBtn.textContent = replyText;
            
            // 添加点击事件
            quickReplyBtn.addEventListener('click', () => {
                this.handleQuickReply(replyText);
            });
            
            quickRepliesContainer.appendChild(quickReplyBtn);
        });
        
        // 将快速回答容器添加到消息内容区域
        const messageContent = messageElement.querySelector('.message-content');
        if (messageContent) {
            messageContent.appendChild(quickRepliesContainer);
        }
        
        // 滚动到底部以确保新按钮可见
        setTimeout(() => {
            this.scrollToBottom();
        }, 100);
    }
    
    // 处理快速回答点击
    handleQuickReply(replyText) {
        // 直接发送快速回答消息
        if (this.isTyping) return; // 如果正在输入中，不允许发送
        
        // 清除输入框内容（如果有的话）
        this.messageInput.value = '';
        this.adjustTextareaHeight();
        
        // 添加用户消息
        this.addMessage({
            type: 'user',
            content: replyText,
            timestamp: Date.now()
        });

        // 清除所有现有的快速回答按钮
        this.clearAllQuickReplies();

        // 显示AI思考状态
        this.showTypingIndicator();
        if (window.avatarController) {
            window.avatarController.startThinking();
        }
        if (window.avatarController) {
            window.avatarController.startThinking();
        }

        // 发送消息到AI
        this.getAIResponse(replyText).catch(error => {
            this.hideTypingIndicator();
            this.addMessage({
                type: 'error',
                content: `错误: ${error.message}`,
                timestamp: Date.now()
            });
            if (window.avatarController) {
                window.avatarController.setEmotion('sad');
            }
        });
    }
    
    // 清除所有快速回答按钮
    clearAllQuickReplies() {
        const quickRepliesElements = this.messagesContainer.querySelectorAll('.quick-replies');
        quickRepliesElements.forEach(element => {
            element.remove();
        });
    }
}

window.ChatManager = ChatManager;