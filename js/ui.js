class UIManager {
    constructor() {
        this.speechManager = null;
        this.voiceButton = null;
        this.voiceStatus = null;
        this.messageInput = null;
        this.roleManager = null;
        this.voiceOutputManager = null;
        this.inputModeManager = null;
        
        // 延迟初始化以确保DOM完全加载
        setTimeout(() => {
            this.initialize();
        }, 100);
    }

    initialize() {
        this.setupModals();
        this.setupSettings();
        this.setupHistory();
        this.setupVoiceInput();
        this.setupRoleManager();
        this.setupVoiceOutput();
        this.setupInputModes();
        this.loadSettings();
    }

    setupVoiceInput() {
        this.voiceButton = document.getElementById('voice-btn');
        this.voiceRecordBtn = document.getElementById('voice-record-btn');
        this.messageInput = document.getElementById('message-input');

        // 初始化语音管理器
        this.speechManager = new SpeechManager();

        // 检查浏览器支持
        if (!this.speechManager.getIsSupported()) {
            console.warn('当前浏览器不支持语音识别');
            if (this.voiceButton) {
                this.voiceButton.style.display = 'none';
            }
            if (this.voiceRecordBtn) {
                this.voiceRecordBtn.style.display = 'none';
            }
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

        // 设置语音录音按钮点击事件
        if (this.voiceRecordBtn) {
            this.voiceRecordBtn.addEventListener('click', () => {
                this.toggleVoiceRecording();
            });
        }

        // 兼容旧的语音按钮
        if (this.voiceButton) {
            this.voiceButton.addEventListener('click', () => {
                this.toggleVoiceRecording();
            });
        }

        console.log('语音输入功能初始化完成');
    }

    setupRoleManager() {
        // 初始化角色管理器
        this.roleManager = new RoleManager();
        
        // 设置Tab切换功能
        this.setupRoleTabs();
        
        // 设置预设角色按钮
        const presetRolesBtn = document.getElementById('preset-roles-btn');
        if (presetRolesBtn) {
            presetRolesBtn.addEventListener('click', () => {
                this.roleManager.addPresetRoles();
                this.showNotification('预设角色已添加', 'success');
            });
        }

        // 设置新建角色按钮
        const createRoleBtn = document.getElementById('create-role-btn');
        if (createRoleBtn) {
            createRoleBtn.addEventListener('click', () => {
                this.showCreateRoleModal();
            });
        }
    }

    setupRoleTabs() {
        const managementTab = document.getElementById('role-management-tab');
        const generationTab = document.getElementById('role-generation-tab');
        const managementContent = document.getElementById('role-management-content');
        const generationContent = document.getElementById('role-generation-content');

        if (!managementTab || !generationTab || !managementContent || !generationContent) {
            return;
        }

        // Tab切换事件
        managementTab.addEventListener('click', () => {
            this.switchRoleTab('management');
        });

        generationTab.addEventListener('click', () => {
            this.switchRoleTab('generation');
        });
    }

    switchRoleTab(activeTab) {
        const tabs = {
            management: {
                btn: document.getElementById('role-management-tab'),
                content: document.getElementById('role-management-content')
            },
            generation: {
                btn: document.getElementById('role-generation-tab'),
                content: document.getElementById('role-generation-content')
            }
        };

        // 重置所有tab状态
        Object.values(tabs).forEach(tab => {
            if (tab.btn && tab.content) {
                tab.btn.classList.remove('active');
                tab.content.classList.remove('active');
            }
        });

        // 激活选中的tab
        if (tabs[activeTab]) {
            tabs[activeTab].btn.classList.add('active');
            tabs[activeTab].content.classList.add('active');
            
            // 根据tab类型加载对应内容
            if (activeTab === 'management') {
                this.loadRoleManagementContent();
            } else if (activeTab === 'generation') {
                this.loadRoleGenerationContent();
            }
        }
    }

    loadRoleManagementContent() {
        if (this.roleManager) {
            // 更新统计信息
            this.updateRoleStats();
            // 加载并显示角色
            this.roleManager.filterAndDisplayRoles();
        }
    }

    loadRoleGenerationContent() {
        // 显示当前角色信息
        this.loadRoleToModal();
    }

    setupVoiceOutput() {
        // 初始化语音输出管理器
        this.voiceOutputManager = new VoiceOutputManager();
        
        // 设置语音输出按钮 - 使用header中的按钮
        const voiceOutputBtn = document.getElementById('voice-output-btn');

        if (voiceOutputBtn) {
            voiceOutputBtn.addEventListener('click', () => {
                this.toggleVoiceOutput();
            });
        }
        
        // 设置语音输出回调
        this.voiceOutputManager.setOnSpeakStart(() => {
            if (voiceOutputBtn) {
                voiceOutputBtn.classList.add('playing');
            }
        });
        
        this.voiceOutputManager.setOnSpeakEnd(() => {
            if (voiceOutputBtn) {
                voiceOutputBtn.classList.remove('playing');
            }
        });
    }

    setupInputModes() {
        // 紧凑输入模式管理器已移除，保留此方法以防止错误
        console.log('输入模式管理已简化');
    }

    toggleVoiceRecording() {
        if (this.speechManager.getIsRecording()) {
            this.speechManager.stop();
        } else {
            this.speechManager.start();
        }
    }

    onVoiceStart() {
        // 更新所有语音按钮状态
        if (this.voiceButton) {
            this.voiceButton.classList.add('recording');
            this.voiceButton.textContent = '🔴';
        }
        if (this.voiceRecordBtn) {
            this.voiceRecordBtn.classList.add('recording');
            this.voiceRecordBtn.textContent = '⏹️';
            this.voiceRecordBtn.title = '停止录音';
        }
    }

    onVoiceResult(result) {
        // 更新输入框内容
        const displayText = result.final + (result.interim ? ` ${result.interim}` : '');
        this.messageInput.value = displayText;
        
        // 如果有最终结果，检查是否自动发送
        if (result.isFinal && result.final.trim()) {
            const autoSend = document.getElementById('auto-send-toggle')?.checked || false;
            if (autoSend) {
                setTimeout(() => {
                    this.speechManager.stop();
                }, 500);
            }
        }
    }

    onVoiceEnd() {
        // 恢复所有语音按钮状态
        if (this.voiceButton) {
            this.voiceButton.classList.remove('recording');
            this.voiceButton.textContent = '🎤';
        }
        if (this.voiceRecordBtn) {
            this.voiceRecordBtn.classList.remove('recording');
            this.voiceRecordBtn.textContent = '🎤';
            this.voiceRecordBtn.title = '点击录音';
        }
        
        // 如果输入框有内容且启用了自动发送
        const inputValue = this.messageInput.value.trim();
        const autoSend = document.getElementById('auto-send-toggle')?.checked || false;
        
        if (inputValue && autoSend && window.chatManager) {
            // 延迟一点让用户看到识别结果
            setTimeout(() => {
                window.chatManager.sendMessage();
            }, 300);
        }
    }

    onVoiceError(error) {
        // 恢复所有语音按钮状态
        if (this.voiceButton) {
            this.voiceButton.classList.remove('recording');
            this.voiceButton.textContent = '🎤';
        }
        if (this.voiceRecordBtn) {
            this.voiceRecordBtn.classList.remove('recording');
            this.voiceRecordBtn.textContent = '🎤';
            this.voiceRecordBtn.title = '点击录音';
        }
        
        // 显示错误通知
        this.showNotification(error, 'error');
    }

    setupModals() {
        // 设置模态框
        const settingsModal = document.getElementById('settings-modal');
        const historyModal = document.getElementById('history-modal');
        const roleModal = document.getElementById('role-modal');
        const settingsBtn = document.getElementById('settings-btn');
        const historyBtn = document.getElementById('history-btn');
        const roleBtn = document.getElementById('role-btn');
        const avatarBtn = document.getElementById('avatar-btn');

        // 打开设置模态框
        settingsBtn.addEventListener('click', () => {
            this.openModal(settingsModal);
            this.loadSettingsToModal();
        });

        // 打开历史模态框
        historyBtn.addEventListener('click', () => {
            this.openModal(historyModal);
            this.loadHistoryToModal();
        });

        // 打开角色模态框
        roleBtn.addEventListener('click', () => {
            this.openModal(roleModal);
            this.loadRoleManagerToModal();
        });

        // 切换悬浮表情窗口
        if (avatarBtn) {
            avatarBtn.addEventListener('click', () => {
                if (window.chatManager) {
                    window.chatManager.toggleFloatingAvatar();
                }
            });
        }

        // 关闭模态框
        document.querySelectorAll('.modal .close').forEach(closeBtn => {
            closeBtn.addEventListener('click', (e) => {
                const modal = e.target.closest('.modal');
                this.closeModal(modal);
            });
        });

        // 点击模态框外部关闭
        window.addEventListener('click', (e) => {
            if (e.target.classList.contains('modal')) {
                this.closeModal(e.target);
            }
        });
    }

    openModal(modal) {
        modal.style.display = 'block';
        // 防止移动端背景滚动
        if (window.innerWidth <= 768) {
            document.body.classList.add('modal-open');
        }
    }

    closeModal(modal) {
        modal.style.display = 'none';
        // 恢复背景滚动
        document.body.classList.remove('modal-open');
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

        // 延迟初始化背景管理器，确保DOM完全加载
        setTimeout(() => {
            this.backgroundManager = new BackgroundManager();
        }, 200);
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
        
        
        // 加载语音输出设置
        this.loadVoiceSettingsToModal();
    }

    loadVoiceSettingsToModal() {
        if (!this.voiceOutputManager) return;
        
        const voiceSettings = this.voiceOutputManager.getSettings();
        
        // 语音输出开关
        const voiceOutputEnabledCheckbox = document.getElementById('voice-output-enabled');
        if (voiceOutputEnabledCheckbox) {
            voiceOutputEnabledCheckbox.checked = voiceSettings.enabled || false;
        }
        
        // 语音选择
        const voiceSelect = document.getElementById('voice-select');
        if (voiceSelect) {
            // 清空现有选项
            voiceSelect.innerHTML = '<option value="">默认语音</option>';
            
            // 添加可用语音
            const voices = this.voiceOutputManager.getVoices();
            voices.forEach(voice => {
                const option = document.createElement('option');
                option.value = voice.name;
                option.textContent = `${voice.name} (${voice.lang})`;
                if (voice.name === voiceSettings.voice) {
                    option.selected = true;
                }
                voiceSelect.appendChild(option);
            });
        }
        
        // 语速
        const voiceRateSlider = document.getElementById('voice-rate');
        const voiceRateValue = document.getElementById('voice-rate-value');
        if (voiceRateSlider && voiceRateValue) {
            voiceRateSlider.value = voiceSettings.rate || 1.0;
            voiceRateValue.textContent = (voiceSettings.rate || 1.0).toFixed(1);
            
            voiceRateSlider.addEventListener('input', (e) => {
                voiceRateValue.textContent = parseFloat(e.target.value).toFixed(1);
            });
        }
        
        // 音调
        const voicePitchSlider = document.getElementById('voice-pitch');
        const voicePitchValue = document.getElementById('voice-pitch-value');
        if (voicePitchSlider && voicePitchValue) {
            voicePitchSlider.value = voiceSettings.pitch || 1.0;
            voicePitchValue.textContent = (voiceSettings.pitch || 1.0).toFixed(1);
            
            voicePitchSlider.addEventListener('input', (e) => {
                voicePitchValue.textContent = parseFloat(e.target.value).toFixed(1);
            });
        }
        
        // 音量
        const voiceVolumeSlider = document.getElementById('voice-volume');
        const voiceVolumeValue = document.getElementById('voice-volume-value');
        if (voiceVolumeSlider && voiceVolumeValue) {
            voiceVolumeSlider.value = voiceSettings.volume || 1.0;
            voiceVolumeValue.textContent = (voiceSettings.volume || 1.0).toFixed(1);
            
            voiceVolumeSlider.addEventListener('input', (e) => {
                voiceVolumeValue.textContent = parseFloat(e.target.value).toFixed(1);
            });
        }
        
        // 测试语音按钮
        const voiceTestBtn = document.getElementById('voice-test-btn');
        if (voiceTestBtn) {
            voiceTestBtn.addEventListener('click', () => {
                this.testVoiceOutput();
            });
        }
        
        // 加载语音输入设置
        this.loadVoiceInputSettings();

        // 加载背景设置到模态框
        this.loadBackgroundSettingsToModal();
    }
    
    loadVoiceInputSettings() {
        // 加载语音输入设置
        const inputSettings = StorageManager.get('voice_input_settings', {
            autoSend: false,
            interruptEnabled: true
        });
        
        const autoSendToggle = document.getElementById('auto-send-toggle');
        if (autoSendToggle) {
            autoSendToggle.checked = inputSettings.autoSend;
        }
        
        const interruptToggle = document.getElementById('interrupt-toggle');
        if (interruptToggle) {
            interruptToggle.checked = inputSettings.interruptEnabled;
        }
    }

    loadBackgroundSettingsToModal() {
        // 确保背景管理器已初始化
        if (this.backgroundManager) {
            this.backgroundManager.updateUIFromSettings();
        }
    }

    toggleVoiceOutput() {
        const isEnabled = this.voiceOutputManager.isVoiceEnabled();
        this.voiceOutputManager.setEnabled(!isEnabled);
        
        const voiceOutputBtn = document.getElementById('voice-output-btn');
        if (voiceOutputBtn) {
            voiceOutputBtn.classList.toggle('active', !isEnabled);
            voiceOutputBtn.title = !isEnabled ? '关闭语音输出' : '开启语音输出';
        }
        
        this.showNotification(!isEnabled ? '语音输出已开启' : '语音输出已关闭', 'info');
    }

    showVoiceSettings() {
        // 在设置模态框中切换到语音设置
        const settingsModal = document.getElementById('settings-modal');
        if (settingsModal) {
            this.openModal(settingsModal);
            this.loadSettingsToModal();
            
            // 滚动到语音设置部分
            setTimeout(() => {
                const voiceSettings = settingsModal.querySelector('.setting-group:nth-child(3)');
                if (voiceSettings) {
                    voiceSettings.scrollIntoView({ behavior: 'smooth', block: 'start' });
                }
            }, 100);
        }
    }

    testVoiceOutput() {
        const testText = '这是语音输出测试，您好！';
        
        // 获取当前设置
        const rate = parseFloat(document.getElementById('voice-rate')?.value || 1.0);
        const pitch = parseFloat(document.getElementById('voice-pitch')?.value || 1.0);
        const volume = parseFloat(document.getElementById('voice-volume')?.value || 1.0);
        
        this.voiceOutputManager.speak(testText, { rate, pitch, volume });
    }

    // 为聊天管理器提供语音输出接口
    speakAIResponse(message) {
        if (this.voiceOutputManager && this.voiceOutputManager.isVoiceEnabled()) {
            this.voiceOutputManager.speakAIResponse(message);
        }
    }

    async saveSettings() {
        const apiKeyInput = document.getElementById('api-key');
        const preserveContextCheckbox = document.getElementById('preserve-context');
        const voiceOutputEnabledCheckbox = document.getElementById('voice-output-enabled');
        
        const apiKey = apiKeyInput?.value.trim() || '';
        const preserveContext = preserveContextCheckbox?.checked || false;
        const voiceOutputEnabled = voiceOutputEnabledCheckbox?.checked || false;

        if (!apiKey) {
            this.showNotification('请输入DeepSeek API密钥', 'error');
            return;
        }

        const settings = {
            apiKey: apiKey,
            preserveContext: preserveContext,
            voiceOutputEnabled: voiceOutputEnabled
        };

        // 保存设置
        StorageManager.saveSettings(settings);

        // 更新API管理器
        if (window.chatManager) {
            window.chatManager.apiManager.updateSettings(settings);
        }

        // 保存语音输出设置
        if (this.voiceOutputManager) {
            const voiceSettings = {
                enabled: voiceOutputEnabled,
                provider: document.getElementById('voice-provider')?.value || 'browser',
                voice: document.getElementById('voice-select')?.value || '',
                iflytekVoice: document.getElementById('iflytek-voice-select')?.value || 'xiaoyan',
                rate: parseFloat(document.getElementById('voice-rate')?.value || 1.0),
                pitch: parseFloat(document.getElementById('voice-pitch')?.value || 1.0),
                volume: parseFloat(document.getElementById('voice-volume')?.value || 1.0)
            };
            
            this.voiceOutputManager.setVoiceSettings(voiceSettings);
            
            // 更新语音输出按钮状态
            const voiceOutputBtn = document.getElementById('voice-output-btn');
            if (voiceOutputBtn) {
                voiceOutputBtn.classList.toggle('active', voiceOutputEnabled);
            }
        }

        // 保存语音输入设置
        const voiceInputSettings = {
            autoSend: document.getElementById('auto-send-toggle')?.checked || false,
            interruptEnabled: document.getElementById('interrupt-toggle')?.checked || true
        };
        StorageManager.set('voice_input_settings', voiceInputSettings);


        // 显示成功消息
        this.showNotification('设置已保存', 'success');

        // 关闭设置模态框
        this.closeModal(document.getElementById('settings-modal'));
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
                this.closeModal(document.getElementById('history-modal'));
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

    loadRoleManagerToModal() {
        if (this.roleManager) {
            // 默认切换到角色管理tab
            this.switchRoleTab('management');
        }
    }

    updateRoleStats() {
        const roles = this.roleManager.getRoles();
        const categories = this.roleManager.getCategories();
        const favoriteCount = roles.filter(role => role.favorite).length;

        const totalElement = document.getElementById('total-roles-count');
        const favoriteElement = document.getElementById('favorite-roles-count');
        const categoriesElement = document.getElementById('categories-count');

        if (totalElement) totalElement.textContent = roles.length;
        if (favoriteElement) favoriteElement.textContent = favoriteCount;
        if (categoriesElement) categoriesElement.textContent = categories.length;
    }

    showCreateRoleModal() {
        const emptyRole = {
            name: '',
            description: '',
            personality: '',
            prompt: '',
            category: 'custom',
            tags: []
        };
        this.showEditRoleModal(emptyRole, true);
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

    showEditRoleModal(roleData, isNew = false) {
        const modal = document.createElement('div');
        modal.className = 'modal';
        modal.style.display = 'block';
        
        const categories = this.roleManager.getCategories();
        const categoryOptions = categories.map(cat => 
            `<option value="${cat.id}" ${roleData.category === cat.id ? 'selected' : ''}>${cat.name}</option>`
        ).join('');
        
        modal.innerHTML = `
            <div class="modal-content">
                <span class="close">&times;</span>
                <h2>${isNew ? '新建角色' : '编辑角色'}</h2>
                <div class="edit-role-form">
                    <div class="setting-item">
                        <label for="edit-role-name">角色名称:</label>
                        <input type="text" id="edit-role-name" value="${roleData.name || ''}" placeholder="输入角色名称">
                    </div>
                    <div class="setting-item">
                        <label for="edit-role-description">角色描述:</label>
                        <input type="text" id="edit-role-description" value="${roleData.description || ''}" placeholder="简短描述角色特点">
                    </div>
                    <div class="setting-item">
                        <label for="edit-role-personality">性格特点:</label>
                        <input type="text" id="edit-role-personality" value="${roleData.personality || ''}" placeholder="描述角色性格">
                    </div>
                    <div class="setting-item">
                        <label for="edit-role-category">角色分类:</label>
                        <select id="edit-role-category">${categoryOptions}</select>
                    </div>
                    <div class="setting-item">
                        <label for="edit-role-tags">标签 (用逗号分隔):</label>
                        <input type="text" id="edit-role-tags" value="${(roleData.tags || []).join(', ')}" placeholder="编程, 技术, 助手">
                    </div>
                    <div class="setting-item">
                        <label for="edit-role-prompt">系统提示词:</label>
                        <textarea id="edit-role-prompt" rows="8" placeholder="详细描述角色的行为和回答风格">${roleData.prompt || ''}</textarea>
                    </div>
                    <div class="modal-actions">
                        <button class="btn btn-primary" id="save-role-edit">${isNew ? '创建角色' : '保存修改'}</button>
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
                id: roleData.id,
                name: modal.querySelector('#edit-role-name').value.trim(),
                description: modal.querySelector('#edit-role-description').value.trim(),
                personality: modal.querySelector('#edit-role-personality').value.trim(),
                prompt: modal.querySelector('#edit-role-prompt').value.trim(),
                category: modal.querySelector('#edit-role-category').value,
                tags: modal.querySelector('#edit-role-tags').value.split(',').map(tag => tag.trim()).filter(tag => tag)
            };

            if (this.validateRoleData(updatedRole)) {
                const savedRole = this.roleManager.saveRole(updatedRole);
                closeModal();
                this.loadRoleManagerToModal();
                this.showNotification(`角色${isNew ? '创建' : '更新'}成功！`, 'success');
                
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
                this.openModal(document.getElementById('settings-modal'));
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