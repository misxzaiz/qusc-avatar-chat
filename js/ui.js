class UIManager {
    constructor() {
        this.speechManager = null;
        this.voiceButton = null;
        this.voiceStatus = null;
        this.messageInput = null;
        
        this.setupModals();
        this.setupSettings();
        this.setupHistory();
        this.setupVoiceInput();
        this.loadSettings();
    }

    setupVoiceInput() {
        this.voiceButton = document.getElementById('voice-btn');
        this.voiceStatus = document.getElementById('voice-status');
        this.messageInput = document.getElementById('message-input');

        if (!this.voiceButton) {
            console.warn('语音按钮未找到');
            return;
        }

        // 初始化语音管理器
        this.speechManager = new SpeechManager();

        // 检查浏览器支持
        if (!this.speechManager.getIsSupported()) {
            this.voiceButton.style.display = 'none';
            return;
        }

        // 设置语音回调
        this.speechManager.setOnStart(() => {
            this.onVoiceStart();
        });

        this.speechManager.setOnResult((result) => {
            this.onVoiceResult(result);
        });

        this.speechManager.setOnEnd(() => {
            this.onVoiceEnd();
        });

        this.speechManager.setOnError((error) => {
            this.onVoiceError(error);
        });

        // 语音按钮点击事件
        this.voiceButton.addEventListener('click', () => {
            this.toggleVoiceRecording();
        });

        console.log('语音输入功能初始化完成');
    }

    toggleVoiceRecording() {
        if (this.speechManager.getIsRecording()) {
            this.speechManager.stop();
        } else {
            this.speechManager.start();
        }
    }

    onVoiceStart() {
        this.voiceButton.classList.add('recording');
        this.voiceButton.textContent = '🔴';
        this.voiceStatus.classList.remove('hidden');
        
        // 头像显示倾听状态
        if (window.avatarController) {
            window.avatarController.startListening();
        }
        
        // 更新状态文本
        const voiceText = this.voiceStatus.querySelector('.voice-text');
        if (voiceText) {
            voiceText.textContent = '正在听...';
        }
    }

    onVoiceResult(result) {
        // 更新输入框内容
        const displayText = result.final + (result.interim ? ` ${result.interim}` : '');
        this.messageInput.value = displayText;
        
        // 更新状态文本
        const voiceText = this.voiceStatus.querySelector('.voice-text');
        if (voiceText) {
            if (result.interim) {
                voiceText.textContent = `识别中: ${result.interim}`;
            } else if (result.final) {
                voiceText.textContent = '识别完成';
            }
        }
        
        // 如果有最终结果，准备发送
        if (result.isFinal && result.final.trim()) {
            setTimeout(() => {
                this.speechManager.stop();
            }, 500);
        }
    }

    onVoiceEnd() {
        this.voiceButton.classList.remove('recording');
        this.voiceButton.textContent = '🎤';
        this.voiceStatus.classList.add('hidden');
        
        // 如果输入框有内容，自动发送
        const inputValue = this.messageInput.value.trim();
        if (inputValue && window.chatManager) {
            // 延迟一点让用户看到识别结果
            setTimeout(() => {
                window.chatManager.sendMessage();
            }, 300);
        }
        
        // 头像恢复中性状态
        if (window.avatarController) {
            window.avatarController.setEmotion('neutral');
        }
    }

    onVoiceError(error) {
        this.voiceButton.classList.remove('recording');
        this.voiceButton.textContent = '🎤';
        this.voiceStatus.classList.add('hidden');
        
        // 显示错误通知
        this.showNotification(error, 'error');
        
        // 头像显示难过表情
        if (window.avatarController) {
            window.avatarController.setEmotion('sad');
        }
    }

    setupModals() {
        // 设置模态框
        const settingsModal = document.getElementById('settings-modal');
        const historyModal = document.getElementById('history-modal');
        const roleModal = document.getElementById('role-modal');
        const settingsBtn = document.getElementById('settings-btn');
        const historyBtn = document.getElementById('history-btn');
        const roleBtn = document.getElementById('role-btn');

        // 打开设置模态框
        settingsBtn.addEventListener('click', () => {
            settingsModal.style.display = 'block';
            this.loadSettingsToModal();
        });

        // 打开历史模态框
        historyBtn.addEventListener('click', () => {
            historyModal.style.display = 'block';
            this.loadHistoryToModal();
        });

        // 打开角色模态框
        roleBtn.addEventListener('click', () => {
            roleModal.style.display = 'block';
            this.loadRoleToModal();
        });

        // 关闭模态框
        document.querySelectorAll('.modal .close').forEach(closeBtn => {
            closeBtn.addEventListener('click', (e) => {
                e.target.closest('.modal').style.display = 'none';
            });
        });

        // 点击模态框外部关闭
        window.addEventListener('click', (e) => {
            if (e.target.classList.contains('modal')) {
                e.target.style.display = 'none';
            }
        });
    }

    setupSettings() {
        const saveSettingsBtn = document.getElementById('save-settings');
        const apiKeyInput = document.getElementById('api-key');

        saveSettingsBtn.addEventListener('click', () => {
            this.saveSettings();
        });

        // Enter键保存设置
        if (apiKeyInput) {
            apiKeyInput.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') {
                    this.saveSettings();
                }
            });
        }
    }

    setupHistory() {
        const clearHistoryBtn = document.getElementById('clear-history');
        
        clearHistoryBtn.addEventListener('click', () => {
            if (confirm('确定要清空所有聊天历史吗？此操作不可撤销。')) {
                this.clearHistory();
            }
        });
    }

    loadSettings() {
        const settings = StorageManager.getSettings();
        
        // 如果有API密钥，则更新API管理器
        if (settings.apiKey && window.chatManager) {
            window.chatManager.apiManager.updateSettings(settings);
        }
    }

    loadSettingsToModal() {
        const settings = StorageManager.getSettings();
        
        // 设置API密钥
        const apiKeyInput = document.getElementById('api-key');
        if (apiKeyInput) {
            apiKeyInput.value = settings.apiKey || '';
        }
        
        // 设置上下文保留选项
        const preserveContextCheckbox = document.getElementById('preserve-context');
        if (preserveContextCheckbox) {
            preserveContextCheckbox.checked = settings.preserveContext || false;
        }
    }

    async saveSettings() {
        const apiKeyInput = document.getElementById('api-key');
        const preserveContextCheckbox = document.getElementById('preserve-context');
        
        const apiKey = apiKeyInput?.value.trim() || '';
        const preserveContext = preserveContextCheckbox?.checked || false;

        if (!apiKey) {
            this.showNotification('请输入DeepSeek API密钥', 'error');
            return;
        }

        const settings = {
            apiKey: apiKey,
            preserveContext: preserveContext
        };

        // 保存设置
        StorageManager.saveSettings(settings);

        // 更新API管理器
        if (window.chatManager) {
            window.chatManager.apiManager.updateSettings(settings);
        }

        // 显示成功消息
        this.showNotification('DeepSeek API设置已保存', 'success');

        // 关闭设置模态框
        document.getElementById('settings-modal').style.display = 'none';
    }

    loadHistoryToModal() {
        const historyList = document.getElementById('history-list');
        const sessions = StorageManager.getConversationSessions();

        if (sessions.length === 0) {
            historyList.innerHTML = '<p class="empty-history">暂无聊天历史</p>';
            return;
        }

        historyList.innerHTML = sessions.map(session => `
            <div class="history-item" data-session-id="${session.id}">
                <div class="history-item-title">${session.title}</div>
                <div class="history-item-time">${this.formatDateTime(session.timestamp)}</div>
                <div class="history-item-count">${session.messages.length} 条消息</div>
            </div>
        `).join('');

        // 添加点击事件
        historyList.addEventListener('click', (e) => {
            const historyItem = e.target.closest('.history-item');
            if (historyItem) {
                const sessionId = historyItem.dataset.sessionId;
                this.loadHistorySession(sessionId);
                document.getElementById('history-modal').style.display = 'none';
            }
        });
    }

    loadHistorySession(sessionId) {
        const sessions = StorageManager.getConversationSessions();
        const session = sessions.find(s => s.id == sessionId);
        
        if (session && window.chatManager) {
            // 清空当前聊天
            window.chatManager.clearChat();
            
            // 加载历史消息
            session.messages.forEach(message => {
                window.chatManager.addMessage(message);
            });
            
            window.chatManager.conversationHistory = [...session.messages];
            this.showNotification('历史对话已加载', 'success');
        }
    }

    clearHistory() {
        StorageManager.clearChatHistory();
        
        if (window.chatManager) {
            window.chatManager.clearChat();
        }

        this.loadHistoryToModal();
        this.showNotification('聊天历史已清空', 'success');
    }

    loadRoleToModal() {
        const currentRole = StorageManager.getCurrentRole();
        const roleDisplay = document.getElementById('current-role-display');
        
        if (currentRole) {
            roleDisplay.innerHTML = `
                <div class="current-role-info">
                    <h3>当前角色: ${currentRole.name}</h3>
                    <p><strong>描述:</strong> ${currentRole.description}</p>
                    <p><strong>性格:</strong> ${currentRole.personality}</p>
                    <details>
                        <summary>查看完整提示词</summary>
                        <div class="role-prompt">${currentRole.prompt}</div>
                    </details>
                    <div class="role-actions">
                        <button class="btn btn-primary" onclick="window.uiManager.editCurrentRole()">编辑角色</button>
                        <button class="btn btn-danger" onclick="window.uiManager.clearCurrentRole()">清除角色</button>
                    </div>
                </div>
            `;
        } else {
            roleDisplay.innerHTML = `
                <div class="no-role-info">
                    <p>当前没有设置角色，请在上方输入关键词生成一个新角色。</p>
                </div>
            `;
        }
    }

    editCurrentRole() {
        const currentRole = StorageManager.getCurrentRole();
        if (!currentRole) return;

        this.showEditRoleModal(currentRole);
    }

    showEditRoleModal(roleData) {
        const modal = document.createElement('div');
        modal.className = 'modal';
        modal.style.display = 'block';
        
        modal.innerHTML = `
            <div class="modal-content">
                <span class="close">&times;</span>
                <h2>编辑角色</h2>
                <div class="edit-role-form">
                    <div class="setting-item">
                        <label for="edit-role-name">角色名称:</label>
                        <input type="text" id="edit-role-name" value="${roleData.name}">
                    </div>
                    <div class="setting-item">
                        <label for="edit-role-description">角色描述:</label>
                        <input type="text" id="edit-role-description" value="${roleData.description}">
                    </div>
                    <div class="setting-item">
                        <label for="edit-role-personality">性格特点:</label>
                        <input type="text" id="edit-role-personality" value="${roleData.personality}">
                    </div>
                    <div class="setting-item">
                        <label for="edit-role-prompt">系统提示词:</label>
                        <textarea id="edit-role-prompt" rows="5">${roleData.prompt}</textarea>
                    </div>
                    <div class="modal-actions">
                        <button class="btn btn-primary" id="save-role-edit">保存</button>
                        <button class="btn btn-secondary" id="cancel-role-edit">取消</button>
                    </div>
                </div>
            </div>
        `;

        document.body.appendChild(modal);

        // 添加事件监听器
        const closeBtn = modal.querySelector('.close');
        const saveBtn = modal.querySelector('#save-role-edit');
        const cancelBtn = modal.querySelector('#cancel-role-edit');

        const closeModal = () => {
            document.body.removeChild(modal);
        };

        closeBtn.addEventListener('click', closeModal);
        cancelBtn.addEventListener('click', closeModal);
        
        saveBtn.addEventListener('click', () => {
            const updatedRole = {
                name: modal.querySelector('#edit-role-name').value.trim(),
                description: modal.querySelector('#edit-role-description').value.trim(),
                personality: modal.querySelector('#edit-role-personality').value.trim(),
                prompt: modal.querySelector('#edit-role-prompt').value.trim()
            };

            if (this.validateRoleData(updatedRole)) {
                this.applyRole(updatedRole);
                closeModal();
                this.loadRoleToModal();
                this.showNotification('角色更新成功！', 'success');
            } else {
                this.showNotification('请填写所有必需字段', 'error');
            }
        });

        // 点击模态框外部关闭
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                closeModal();
            }
        });
    }

    validateRoleData(roleData) {
        return roleData && 
               typeof roleData.name === 'string' && 
               typeof roleData.description === 'string' && 
               typeof roleData.personality === 'string' && 
               typeof roleData.prompt === 'string' &&
               roleData.name.length > 0 &&
               roleData.prompt.length > 0;
    }

    applyRole(roleData) {
        StorageManager.saveCurrentRole(roleData);
        
        if (window.chatManager) {
            window.chatManager.setRole(roleData);
        }

        if (window.avatarController) {
            window.avatarController.showExcitement();
        }
    }

    clearCurrentRole() {
        if (confirm('确定要清除当前角色吗？')) {
            StorageManager.saveCurrentRole(null);
            
            if (window.chatManager) {
                window.chatManager.setRole(null);
            }

            this.loadRoleToModal();
            this.showNotification('角色已清除', 'info');
        }
    }

    showNotification(message, type = 'info', duration = 3000) {
        // 移除现有通知
        const existingNotification = document.querySelector('.notification');
        if (existingNotification) {
            existingNotification.remove();
        }

        // 创建通知元素
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.textContent = message;

        // 添加到页面
        document.body.appendChild(notification);

        // 显示动画
        requestAnimationFrame(() => {
            notification.classList.add('show');
        });

        // 自动隐藏
        setTimeout(() => {
            notification.classList.remove('show');
            setTimeout(() => {
                if (notification.parentElement) {
                    notification.remove();
                }
            }, 300);
        }, duration);
    }

    formatDateTime(timestamp) {
        const date = new Date(timestamp);
        const now = new Date();
        const diffTime = now - date;
        const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

        if (diffDays === 0) {
            return '今天 ' + date.toLocaleTimeString('zh-CN', {
                hour: '2-digit',
                minute: '2-digit'
            });
        } else if (diffDays === 1) {
            return '昨天 ' + date.toLocaleTimeString('zh-CN', {
                hour: '2-digit',
                minute: '2-digit'
            });
        } else if (diffDays < 7) {
            return `${diffDays}天前`;
        } else {
            return date.toLocaleDateString('zh-CN');
        }
    }

    // 响应式处理
    handleResize() {
        const isMobile = window.innerWidth <= 768;
        const app = document.getElementById('app');
        
        if (isMobile) {
            app.classList.add('mobile-view');
        } else {
            app.classList.remove('mobile-view');
        }
    }

    // 键盘快捷键
    setupKeyboardShortcuts() {
        document.addEventListener('keydown', (e) => {
            // Ctrl/Cmd + Enter 发送消息
            if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
                if (window.chatManager) {
                    window.chatManager.sendMessage();
                }
            }
            
            // Ctrl/Cmd + K 清空聊天
            if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
                e.preventDefault();
                if (window.chatManager && confirm('确定要清空当前聊天吗？')) {
                    window.chatManager.clearChat();
                }
            }
            
            // Ctrl/Cmd + , 打开设置
            if ((e.ctrlKey || e.metaKey) && e.key === ',') {
                e.preventDefault();
                document.getElementById('settings-modal').style.display = 'block';
                this.loadSettingsToModal();
            }
        });
    }

    init() {
        this.handleResize();
        this.setupKeyboardShortcuts();
        
        // 监听窗口大小变化
        window.addEventListener('resize', () => {
            this.handleResize();
        });
    }
}

// 添加通知样式
const notificationStyles = `
    .notification {
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 1rem 1.5rem;
        border-radius: 8px;
        color: white;
        font-weight: 500;
        z-index: 10000;
        transform: translateX(100%);
        transition: transform 0.3s ease, opacity 0.3s ease;
        opacity: 0;
        max-width: 400px;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
    }

    .notification.show {
        transform: translateX(0);
        opacity: 1;
    }

    .notification-success {
        background: linear-gradient(135deg, var(--success-color), #20c997);
    }

    .notification-error {
        background: linear-gradient(135deg, var(--danger-color), #c82333);
    }

    .notification-warning {
        background: linear-gradient(135deg, var(--warning-color), #fd7e14);
        color: var(--dark-color);
    }

    .notification-info {
        background: linear-gradient(135deg, var(--info-color), #20c997);
    }

    .empty-history {
        text-align: center;
        color: var(--secondary-color);
        padding: 2rem;
        font-style: italic;
    }

    .history-item-count {
        font-size: 0.8rem;
        color: var(--secondary-color);
        margin-top: 0.25rem;
    }

    @media (max-width: 768px) {
        .notification {
            right: 10px;
            left: 10px;
            max-width: none;
            transform: translateY(-100%);
        }
        
        .notification.show {
            transform: translateY(0);
        }
    }
`;

// 注入通知样式
const notificationStyleSheet = document.createElement('style');
notificationStyleSheet.textContent = notificationStyles;
document.head.appendChild(notificationStyleSheet);

window.UIManager = UIManager;