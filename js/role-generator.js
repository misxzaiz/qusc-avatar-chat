class RoleGenerator {
    constructor() {
        this.keywordsInput = document.getElementById('role-keywords');
        this.generateButton = document.getElementById('generate-role-btn');
        this.statusElement = document.getElementById('role-generation-status');
        this.apiManager = new APIManager();
        
        this.setupEventListeners();
    }

    setupEventListeners() {
        this.generateButton.addEventListener('click', () => this.generateRole());
        
        this.keywordsInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                this.generateRole();
            }
        });
    }

    async generateRole() {
        const keywords = this.keywordsInput.value.trim();
        if (!keywords) {
            this.showStatus('请输入关键词', 'error');
            return;
        }

        // 禁用输入和按钮
        this.setLoading(true);
        
        try {
            // 显示生成中的状态
            this.showStatus('正在生成角色...', 'info');
            
            if (window.avatarController) {
                window.avatarController.startThinking();
            }

            const roleData = await this.apiManager.generateRole(keywords);
            
            // 验证生成的角色数据
            if (!this.validateRoleData(roleData)) {
                throw new Error('生成的角色数据格式不正确');
            }

            // 应用新角色
            this.applyRole(roleData);
            
            // 清空输入框
            this.keywordsInput.value = '';
            
            // 更新UI显示
            if (window.uiManager) {
                window.uiManager.loadRoleToModal();
            }
            
            if (window.avatarController) {
                window.avatarController.showExcitement();
            }

            this.showStatus(`角色 "${roleData.name}" 生成成功！`, 'success');

        } catch (error) {
            console.error('角色生成失败:', error);
            this.showStatus(`角色生成失败: ${error.message}`, 'error');
            
            if (window.avatarController) {
                window.avatarController.setEmotion('sad');
            }
        } finally {
            this.setLoading(false);
        }
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
        // 获取临时上下文设置
        const clearContextCheckbox = document.getElementById('clear-context-on-role-change');
        const shouldClearContext = clearContextCheckbox && clearContextCheckbox.checked;
        
        // 如果勾选了临时清空选项，临时修改设置
        let originalPreserveSetting = null;
        if (shouldClearContext) {
            const settings = StorageManager.getSettings();
            originalPreserveSetting = settings.preserveContext;
            StorageManager.saveSettings({ preserveContext: false });
        }
        
        // 保存角色数据
        StorageManager.saveCurrentRole(roleData);
        
        // 更新聊天管理器的角色
        if (window.chatManager) {
            window.chatManager.setRole(roleData);
        }
        
        // 恢复原始设置
        if (originalPreserveSetting !== null) {
            setTimeout(() => {
                StorageManager.saveSettings({ preserveContext: originalPreserveSetting });
            }, 200);
        }
        
        // 重置复选框
        if (clearContextCheckbox) {
            clearContextCheckbox.checked = false;
        }
    }

    setLoading(loading) {
        this.generateButton.disabled = loading;
        this.keywordsInput.disabled = loading;
        
        if (loading) {
            this.generateButton.textContent = '生成中...';
            this.generateButton.classList.add('loading');
        } else {
            this.generateButton.textContent = '生成角色';
            this.generateButton.classList.remove('loading');
        }
    }

    showStatus(message, type = 'info') {
        if (!this.statusElement) return;
        
        this.statusElement.textContent = message;
        this.statusElement.className = `role-status ${type}`;

        // 3秒后清除状态
        setTimeout(() => {
            if (this.statusElement) {
                this.statusElement.textContent = '';
                this.statusElement.className = 'role-status';
            }
        }, 3000);
    }
}

// 添加角色模态框的CSS样式
const roleModalStyles = `
    .role-status {
        margin-top: 0.5rem;
        padding: 0.5rem;
        border-radius: 6px;
        font-size: 0.9rem;
        text-align: center;
    }

    .role-status.success {
        background: var(--success-color);
        color: white;
    }

    .role-status.error {
        background: var(--danger-color);
        color: white;
    }

    .role-status.info {
        background: var(--info-color);
        color: white;
    }

    .current-role-info {
        background: linear-gradient(135deg, #f8f9fa, #e9ecef);
        padding: 1.5rem;
        border-radius: 12px;
        border: 1px solid var(--border-color);
        margin-top: 1rem;
    }

    .current-role-info h3 {
        color: var(--primary-color);
        margin-bottom: 1rem;
    }

    .current-role-info p {
        margin-bottom: 0.75rem;
        line-height: 1.5;
    }

    .current-role-info details {
        margin-top: 1rem;
    }

    .current-role-info summary {
        cursor: pointer;
        font-weight: 500;
        color: var(--primary-color);
        margin-bottom: 0.5rem;
    }

    .role-prompt {
        background: white;
        padding: 1rem;
        border-radius: 8px;
        border-left: 4px solid var(--primary-color);
        font-size: 0.9rem;
        line-height: 1.5;
        margin-top: 0.5rem;
        max-height: 200px;
        overflow-y: auto;
    }

    .role-actions {
        margin-top: 1.5rem;
        display: flex;
        gap: 0.75rem;
        flex-wrap: wrap;
    }

    .no-role-info {
        text-align: center;
        padding: 2rem 1rem;
        color: var(--secondary-color);
        font-style: italic;
        background: var(--light-color);
        border-radius: 8px;
        margin-top: 1rem;
    }

    .edit-role-form textarea {
        width: 100%;
        min-height: 120px;
        resize: vertical;
        font-family: inherit;
    }

    .modal-actions {
        margin-top: 1.5rem;
        display: flex;
        gap: 0.75rem;
        justify-content: flex-end;
        flex-wrap: wrap;
    }

    @media (max-width: 768px) {
        .role-actions,
        .modal-actions {
            flex-direction: column;
        }
        
        .role-actions .btn,
        .modal-actions .btn {
            width: 100%;
        }
    }
`;

// 注入角色模态框样式
const roleStyleSheet = document.createElement('style');
roleStyleSheet.textContent = roleModalStyles;
document.head.appendChild(roleStyleSheet);

window.RoleGenerator = RoleGenerator;