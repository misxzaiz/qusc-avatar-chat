// 主应用入口
class App {
    constructor() {
        this.init();
    }

    async init() {
        try {
            // 等待DOM加载完成
            if (document.readyState === 'loading') {
                await new Promise(resolve => {
                    document.addEventListener('DOMContentLoaded', resolve);
                });
            }

            // 初始化各个组件
            this.initializeComponents();
            
            // 设置全局错误处理
            this.setupErrorHandling();
            
            // 显示欢迎消息
            this.showWelcomeMessage();
            
            console.log('AI聊天助手初始化完成');
            
        } catch (error) {
            console.error('应用初始化失败:', error);
            this.showErrorMessage('应用初始化失败，请刷新页面重试');
        }
    }

    initializeComponents() {
        // 初始化头像控制器
        const avatarElement = document.getElementById('avatar');
        if (avatarElement) {
            window.avatarController = new AvatarController(avatarElement);
        }

        // 初始化UI管理器
        window.uiManager = new UIManager();
        window.uiManager.init();

        // 初始化聊天管理器
        window.chatManager = new ChatManager();

        // 初始化角色生成器
        window.roleGenerator = new RoleGenerator();

        // 检查是否有保存的设置
        this.checkInitialSettings();
    }

    checkInitialSettings() {
        const settings = StorageManager.getSettings();
    }

    showWelcomeMessage() {
        const currentRole = StorageManager.getCurrentRole();
        let welcomeMessage = '👋 你好！我是你的AI聊天助手。';
        
        if (currentRole) {
            welcomeMessage = `🤖 你好！我是 ${currentRole.name}，${currentRole.description}。有什么我可以帮助你的吗？`;
        } else {
            welcomeMessage += '你可以通过输入关键词来生成一个专属的AI角色，或者直接开始聊天。';
        }

        // 延迟显示欢迎消息，让用户看到界面加载完成
        setTimeout(() => {
            if (window.chatManager) {
                window.chatManager.addMessage({
                    type: 'assistant',
                    content: welcomeMessage,
                    timestamp: Date.now()
                });
            }
            
            if (window.avatarController) {
                window.avatarController.showHappiness();
            }
        }, 500);
    }

    setupErrorHandling() {
        // 全局错误处理
        window.addEventListener('error', (event) => {
            console.error('全局错误:', event.error);
            this.handleError(event.error);
        });

        // Promise错误处理
        window.addEventListener('unhandledrejection', (event) => {
            console.error('未处理的Promise错误:', event.reason);
            this.handleError(event.reason);
            event.preventDefault();
        });
    }

    handleError(error) {
        const errorMessage = error?.message || '发生了未知错误';
        
        // 显示用户友好的错误信息
        if (window.uiManager) {
            window.uiManager.showNotification(
                `出现错误: ${errorMessage}`, 
                'error'
            );
        }

        // 头像显示伤心表情
        if (window.avatarController) {
            window.avatarController.setEmotion('sad');
        }
    }

    showErrorMessage(message) {
        // 创建错误显示元素
        const errorElement = document.createElement('div');
        errorElement.className = 'app-error';
        errorElement.innerHTML = `
            <div class="error-content">
                <h2>❌ 应用错误</h2>
                <p>${message}</p>
                <button onclick="location.reload()" class="btn btn-primary">刷新页面</button>
            </div>
        `;

        // 添加错误样式
        const errorStyles = `
            .app-error {
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: rgba(0, 0, 0, 0.8);
                display: flex;
                align-items: center;
                justify-content: center;
                z-index: 10000;
                color: white;
            }
            
            .error-content {
                background: var(--danger-color);
                padding: 2rem;
                border-radius: 12px;
                text-align: center;
                max-width: 400px;
                margin: 1rem;
            }
            
            .error-content h2 {
                margin-bottom: 1rem;
            }
            
            .error-content p {
                margin-bottom: 1.5rem;
                line-height: 1.6;
            }
        `;

        const styleSheet = document.createElement('style');
        styleSheet.textContent = errorStyles;
        document.head.appendChild(styleSheet);

        document.body.appendChild(errorElement);
    }

    // 应用生命周期方法
    onBeforeUnload() {
        // 保存当前状态
        if (window.chatManager && window.chatManager.isTyping) {
            window.chatManager.apiManager.cancelRequest();
        }
    }

    // 静态方法：启动应用
    static start() {
        window.app = new App();
        
        // 监听页面卸载
        window.addEventListener('beforeunload', () => {
            if (window.app) {
                window.app.onBeforeUnload();
            }
        });
    }
}

// 应用启动
App.start();

// 导出到全局作用域
window.App = App;

// 开发环境的调试工具
if (typeof window !== 'undefined' && window.location.hostname === 'localhost') {
    window.debug = {
        config: CONFIG,
        storage: StorageManager,
        avatar: () => window.avatarController,
        chat: () => window.chatManager,
        role: () => window.roleGenerator,
        ui: () => window.uiManager,
        clearAll: () => {
            StorageManager.clear();
            location.reload();
        },
        testAvatar: () => {
            const avatar = window.avatarController;
            if (avatar) {
                avatar.showHappiness();
                setTimeout(() => avatar.showSadness(), 2000);
                setTimeout(() => avatar.showExcitement(), 4000);
                setTimeout(() => avatar.setEmotion('neutral'), 6000);
            }
        }
    };
    
    console.log('🐛 调试模式已启用');
    console.log('使用 window.debug 访问调试工具');
}