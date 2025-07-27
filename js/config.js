const CONFIG = {
    API: {
        DEEPSEEK_URL: 'https://api.deepseek.com/v1/chat/completions',
        DEFAULT_MODEL: 'deepseek-chat',
        TIMEOUT: 30000,
        MAX_TOKENS: 2048
    },
    STORAGE: {
        API_KEY: 'deepseek_api_key',
        CHAT_HISTORY: 'chat_history',
        SETTINGS: 'app_settings',
        CURRENT_ROLE: 'current_role'
    },
    AVATAR: {
        EMOTIONS: {
            NEUTRAL: 'neutral',
            HAPPY: 'happy',
            SAD: 'sad',
            TALKING: 'talking',
            LISTENING: 'listening',
            THINKING: 'thinking',
            EXCITED: 'excited',
            SURPRISED: 'surprised'
        },
        EMOTION_DURATION: 3000,
        MOUSE_FOLLOW: true,
        ANIMATION_ENABLED: true,
        RANDOM_BLINK: true
    },
    ROLE_GENERATION: {
        SYSTEM_PROMPT: `你是一个角色生成助手。根据用户提供的关键词，生成一个有趣的AI角色人设。

要求：
1. 返回JSON格式：{"name": "角色名称", "description": "角色描述", "personality": "性格特点", "prompt": "完整的系统提示词"}
2. 系统提示词要详细描述角色的背景、性格、说话风格等
3. 角色要有趣、有个性，符合关键词描述
4. 提示词长度在200-500字之间

示例关键词：猫咪、程序员
返回示例：
{
  "name": "程序猫小码",
  "description": "一只热爱编程的橘色小猫咪",
  "personality": "聪明、幽默、有点强迫症",
  "prompt": "你是程序猫小码，一只精通各种编程语言的橘色小猫咪。你有着程序员的严谨和猫咪的可爱。说话时偶尔会用'喵'结尾，喜欢用代码比喻解释问题。你对代码有强迫症，追求完美和优雅。性格幽默风趣，但在技术问题上非常认真。"
}`
    }
};

window.CONFIG = CONFIG;