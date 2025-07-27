class StorageManager {
    static get(key, defaultValue = null) {
        try {
            const item = localStorage.getItem(key);
            return item ? JSON.parse(item) : defaultValue;
        } catch (error) {
            console.error('存储读取错误:', error);
            return defaultValue;
        }
    }

    static set(key, value) {
        try {
            localStorage.setItem(key, JSON.stringify(value));
            return true;
        } catch (error) {
            console.error('存储写入错误:', error);
            return false;
        }
    }

    static remove(key) {
        try {
            localStorage.removeItem(key);
            return true;
        } catch (error) {
            console.error('存储删除错误:', error);
            return false;
        }
    }

    static clear() {
        try {
            localStorage.clear();
            return true;
        } catch (error) {
            console.error('存储清空错误:', error);
            return false;
        }
    }

    static saveMessage(message) {
        const history = this.get(CONFIG.STORAGE.CHAT_HISTORY, []);
        history.push({
            ...message,
            timestamp: Date.now()
        });
        
        // 限制历史记录数量
        if (history.length > 1000) {
            history.splice(0, history.length - 1000);
        }
        
        return this.set(CONFIG.STORAGE.CHAT_HISTORY, history);
    }

    static getChatHistory() {
        return this.get(CONFIG.STORAGE.CHAT_HISTORY, []);
    }

    static clearChatHistory() {
        return this.remove(CONFIG.STORAGE.CHAT_HISTORY);
    }

    static saveSettings(settings) {
        const currentSettings = this.get(CONFIG.STORAGE.SETTINGS, {});
        const newSettings = { ...currentSettings, ...settings };
        return this.set(CONFIG.STORAGE.SETTINGS, newSettings);
    }

    static getSettings() {
        return this.get(CONFIG.STORAGE.SETTINGS, {
            apiKey: '',
            apiUrl: CONFIG.API.DEEPSEEK_URL,
            model: CONFIG.API.DEFAULT_MODEL
        });
    }

    static saveCurrentRole(role) {
        return this.set(CONFIG.STORAGE.CURRENT_ROLE, role);
    }

    static getCurrentRole() {
        return this.get(CONFIG.STORAGE.CURRENT_ROLE, null);
    }

    static getConversationSessions() {
        const history = this.getChatHistory();
        const sessions = [];
        let currentSession = null;
        
        history.forEach(message => {
            if (message.type === 'system' || !currentSession) {
                currentSession = {
                    id: Date.now() + Math.random(),
                    title: this.generateSessionTitle(message),
                    timestamp: message.timestamp,
                    messages: []
                };
                sessions.push(currentSession);
            }
            currentSession.messages.push(message);
        });
        
        return sessions.reverse(); // 最新的在前面
    }

    static generateSessionTitle(firstMessage) {
        if (firstMessage.content && firstMessage.content.length > 30) {
            return firstMessage.content.substring(0, 30) + '...';
        }
        return firstMessage.content || '新对话';
    }
}

window.StorageManager = StorageManager;