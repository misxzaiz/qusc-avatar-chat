/**
 * 角色管理系统
 * 负责角色的创建、编辑、分类、收藏、导入导出等功能
 */
class RoleManager {
    constructor() {
        this.roles = [];
        this.categories = [];
        this.currentCategory = 'all';
        this.searchQuery = '';
        this.sortBy = 'name'; // name, created, rating, usage
        this.sortOrder = 'asc'; // asc, desc
        
        this.init();
    }

    init() {
        this.loadRoles();
        this.loadCategories();
        this.initDefaultCategories();
        this.setupEventListeners();
    }

    // 默认分类
    initDefaultCategories() {
        const defaultCategories = [
            { id: 'work', name: '工作助手', icon: '💼', color: '#3b82f6' },
            { id: 'study', name: '学习教育', icon: '📚', color: '#10b981' },
            { id: 'creative', name: '创意写作', icon: '✍️', color: '#8b5cf6' },
            { id: 'entertainment', name: '娱乐休闲', icon: '🎮', color: '#f59e0b' },
            { id: 'life', name: '生活服务', icon: '🏠', color: '#ef4444' },
            { id: 'tech', name: '技术开发', icon: '💻', color: '#06b6d4' },
            { id: 'health', name: '健康医疗', icon: '🏥', color: '#84cc16' },
            { id: 'custom', name: '自定义', icon: '⭐', color: '#6b7280' }
        ];

        const existingCategories = this.getCategories();
        if (existingCategories.length === 0) {
            this.categories = defaultCategories;
            this.saveCategories();
        }
    }

    // 事件监听器设置
    setupEventListeners() {
        // 搜索输入
        const searchInput = document.getElementById('role-search');
        if (searchInput) {
            searchInput.addEventListener('input', (e) => {
                this.searchQuery = e.target.value;
                this.filterAndDisplayRoles();
            });
        }

        // 分类选择
        const categorySelect = document.getElementById('role-category-filter');
        if (categorySelect) {
            categorySelect.addEventListener('change', (e) => {
                this.currentCategory = e.target.value;
                this.filterAndDisplayRoles();
            });
        }

        // 排序选择
        const sortSelect = document.getElementById('role-sort');
        if (sortSelect) {
            sortSelect.addEventListener('change', (e) => {
                const [sortBy, sortOrder] = e.target.value.split('-');
                this.sortBy = sortBy;
                this.sortOrder = sortOrder;
                this.filterAndDisplayRoles();
            });
        }

        // 导入导出按钮
        const importBtn = document.getElementById('import-roles-btn');
        const exportBtn = document.getElementById('export-roles-btn');
        
        if (importBtn) {
            importBtn.addEventListener('click', () => this.showImportDialog());
        }
        
        if (exportBtn) {
            exportBtn.addEventListener('click', () => this.exportRoles());
        }
    }

    // 角色CRUD操作
    saveRole(roleData) {
        const role = {
            id: roleData.id || this.generateId(),
            name: roleData.name,
            description: roleData.description,
            personality: roleData.personality,
            prompt: roleData.prompt,
            category: roleData.category || 'custom',
            tags: roleData.tags || [],
            rating: roleData.rating || 0,
            usage: roleData.usage || 0,
            favorite: roleData.favorite || false,
            created: roleData.created || Date.now(),
            updated: Date.now(),
            author: roleData.author || 'user',
            version: roleData.version || '1.0'
        };

        const existingIndex = this.roles.findIndex(r => r.id === role.id);
        if (existingIndex >= 0) {
            this.roles[existingIndex] = role;
        } else {
            this.roles.push(role);
        }

        this.saveRoles();
        return role;
    }

    deleteRole(roleId) {
        this.roles = this.roles.filter(role => role.id !== roleId);
        this.saveRoles();
    }

    duplicateRole(roleId) {
        const original = this.roles.find(role => role.id === roleId);
        if (original) {
            const duplicate = {
                ...original,
                id: this.generateId(),
                name: original.name + ' (副本)',
                created: Date.now(),
                updated: Date.now(),
                usage: 0,
                rating: 0
            };
            this.roles.push(duplicate);
            this.saveRoles();
            return duplicate;
        }
        return null;
    }

    // 角色使用和评分
    incrementUsage(roleId) {
        const role = this.roles.find(r => r.id === roleId);
        if (role) {
            role.usage = (role.usage || 0) + 1;
            role.updated = Date.now();
            this.saveRoles();
        }
    }

    setRating(roleId, rating) {
        const role = this.roles.find(r => r.id === roleId);
        if (role) {
            role.rating = Math.max(0, Math.min(5, rating));
            role.updated = Date.now();
            this.saveRoles();
        }
    }

    toggleFavorite(roleId) {
        const role = this.roles.find(r => r.id === roleId);
        if (role) {
            role.favorite = !role.favorite;
            role.updated = Date.now();
            this.saveRoles();
            return role.favorite;
        }
        return false;
    }

    // 搜索和过滤
    filterAndDisplayRoles() {
        let filteredRoles = [...this.roles];

        // 分类过滤
        if (this.currentCategory !== 'all') {
            if (this.currentCategory === 'favorites') {
                filteredRoles = filteredRoles.filter(role => role.favorite);
            } else {
                filteredRoles = filteredRoles.filter(role => role.category === this.currentCategory);
            }
        }

        // 搜索过滤
        if (this.searchQuery) {
            const query = this.searchQuery.toLowerCase();
            filteredRoles = filteredRoles.filter(role => 
                role.name.toLowerCase().includes(query) ||
                role.description.toLowerCase().includes(query) ||
                role.tags.some(tag => tag.toLowerCase().includes(query))
            );
        }

        // 排序
        filteredRoles.sort((a, b) => {
            let aVal = a[this.sortBy];
            let bVal = b[this.sortBy];

            if (this.sortBy === 'rating' || this.sortBy === 'usage') {
                aVal = aVal || 0;
                bVal = bVal || 0;
            }

            if (this.sortOrder === 'desc') {
                return bVal > aVal ? 1 : -1;
            } else {
                return aVal > bVal ? 1 : -1;
            }
        });

        this.displayRoles(filteredRoles);
    }

    // 显示角色列表
    displayRoles(roles) {
        const container = document.getElementById('roles-grid');
        if (!container) return;

        if (roles.length === 0) {
            container.innerHTML = `
                <div class="no-roles">
                    <div class="no-roles-icon">🤖</div>
                    <h3>暂无角色</h3>
                    <p>创建您的第一个AI角色吧！</p>
                </div>
            `;
            return;
        }

        container.innerHTML = roles.map(role => this.createRoleCard(role)).join('');
    }

    // 创建角色卡片
    createRoleCard(role) {
        const category = this.categories.find(c => c.id === role.category) || 
                        { name: '未分类', icon: '❓', color: '#6b7280' };
        
        return `
            <div class="role-card" data-role-id="${role.id}">
                <div class="role-card-header">
                    <div class="role-category" style="background-color: ${category.color}20; color: ${category.color}">
                        ${category.icon} ${category.name}
                    </div>
                    <div class="role-actions">
                        <button class="role-action-btn favorite-btn ${role.favorite ? 'active' : ''}" 
                                onclick="window.uiManager.roleManager.toggleFavorite('${role.id}')" title="收藏">
                            ${role.favorite ? '❤️' : '🤍'}
                        </button>
                        <button class="role-action-btn" onclick="window.uiManager.roleManager.showRoleMenu('${role.id}')" title="更多">
                            ⋯
                        </button>
                    </div>
                </div>
                
                <div class="role-card-content">
                    <h3 class="role-name">${role.name}</h3>
                    <p class="role-description">${role.description}</p>
                    
                    <div class="role-tags">
                        ${role.tags.map(tag => `<span class="role-tag">${tag}</span>`).join('')}
                    </div>
                    
                    <div class="role-stats">
                        <div class="role-rating">
                            ${this.renderStars(role.rating || 0)}
                        </div>
                        <div class="role-usage">
                            使用次数: ${role.usage || 0}
                        </div>
                    </div>
                </div>
                
                <div class="role-card-footer">
                    <button class="btn btn-primary role-use-btn" onclick="window.uiManager.roleManager.useRole('${role.id}')">${role.isActive ? '✓ 当前使用' : '使用角色'}</button>
                    <button class="btn btn-secondary role-edit-btn" onclick="window.uiManager.roleManager.editRole('${role.id}')">
                        编辑
                    </button>
                </div>
            </div>
        `;
    }

    // 渲染星级评分
    renderStars(rating) {
        const stars = [];
        for (let i = 1; i <= 5; i++) {
            stars.push(`
                <span class="star ${i <= rating ? 'filled' : ''}" 
                      onclick="window.uiManager.roleManager.setRating('${this.currentRoleId}', ${i})">
                    ${i <= rating ? '⭐' : '☆'}
                </span>
            `);
        }
        return stars.join('');
    }

    // 使用角色
    useRole(roleId) {
        const role = this.roles.find(r => r.id === roleId);
        if (role) {
            this.incrementUsage(roleId);
            
            // 应用角色
            if (window.uiManager) {
                window.uiManager.applyRole(role);
            }
            
            // 关闭角色管理模态框
            const modal = document.getElementById('role-manager-modal');
            if (modal) {
                modal.style.display = 'none';
            }
            
            // 显示成功通知
            if (window.uiManager) {
                window.uiManager.showNotification(`已切换到角色：${role.name}`, 'success');
            }
        }
    }

    // 编辑角色
    editRole(roleId) {
        const role = this.roles.find(r => r.id === roleId);
        if (role && window.uiManager) {
            window.uiManager.showEditRoleModal(role);
        }
    }

    // 导入导出功能
    exportRoles() {
        const data = {
            roles: this.roles,
            categories: this.categories,
            exportDate: new Date().toISOString(),
            version: '1.0'
        };

        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `ai-roles-${new Date().toISOString().split('T')[0]}.json`;
        a.click();
        URL.revokeObjectURL(url);
    }

    showImportDialog() {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.json';
        input.onchange = (e) => this.importRoles(e.target.files[0]);
        input.click();
    }

    async importRoles(file) {
        try {
            const text = await file.text();
            const data = JSON.parse(text);
            
            if (data.roles && Array.isArray(data.roles)) {
                // 合并角色，避免ID冲突
                data.roles.forEach(role => {
                    role.id = this.generateId();
                    role.imported = true;
                    role.created = Date.now();
                });
                
                this.roles.push(...data.roles);
                this.saveRoles();
                
                // 合并分类
                if (data.categories && Array.isArray(data.categories)) {
                    data.categories.forEach(category => {
                        if (!this.categories.find(c => c.id === category.id)) {
                            this.categories.push(category);
                        }
                    });
                    this.saveCategories();
                }
                
                this.filterAndDisplayRoles();
                
                if (window.uiManager) {
                    window.uiManager.showNotification(`成功导入 ${data.roles.length} 个角色`, 'success');
                }
            }
        } catch (error) {
            console.error('导入角色失败:', error);
            if (window.uiManager) {
                window.uiManager.showNotification('导入失败，请检查文件格式', 'error');
            }
        }
    }

    // 存储管理
    saveRoles() {
        StorageManager.set('ai_roles', this.roles);
    }

    loadRoles() {
        this.roles = StorageManager.get('ai_roles', []);
    }

    saveCategories() {
        StorageManager.set('role_categories', this.categories);
    }

    loadCategories() {
        this.categories = StorageManager.get('role_categories', []);
    }

    getCategories() {
        return this.categories;
    }

    getRoles() {
        return this.roles;
    }

    // 显示角色菜单
    showRoleMenu(roleId) {
        // 移除已存在的菜单
        const existingMenu = document.querySelector('.role-menu');
        if (existingMenu) {
            existingMenu.remove();
        }

        const roleCard = document.querySelector(`[data-role-id="${roleId}"]`);
        if (!roleCard) return;

        const menu = document.createElement('div');
        menu.className = 'role-menu';
        menu.innerHTML = `
            <button class="role-menu-item" onclick="window.uiManager.roleManager.editRole('${roleId}')">
                ✏️ 编辑角色
            </button>
            <button class="role-menu-item" onclick="window.uiManager.roleManager.duplicateRole('${roleId}')">
                📋 复制角色
            </button>
            <button class="role-menu-item" onclick="window.uiManager.roleManager.shareRole('${roleId}')">
                📤 分享角色
            </button>
            <button class="role-menu-item danger" onclick="window.uiManager.roleManager.confirmDeleteRole('${roleId}')">
                🗑️ 删除角色
            </button>
        `;

        // 定位菜单
        const rect = roleCard.getBoundingClientRect();
        menu.style.position = 'fixed';
        menu.style.top = `${rect.top + 10}px`;
        menu.style.right = `${window.innerWidth - rect.right + 10}px`;

        document.body.appendChild(menu);

        // 点击其他地方关闭菜单
        const closeMenu = (e) => {
            if (!menu.contains(e.target)) {
                menu.remove();
                document.removeEventListener('click', closeMenu);
            }
        };
        setTimeout(() => document.addEventListener('click', closeMenu), 100);
    }

    // 确认删除角色
    confirmDeleteRole(roleId) {
        const role = this.roles.find(r => r.id === roleId);
        if (role && confirm(`确定要删除角色 "${role.name}" 吗？此操作不可撤销。`)) {
            this.deleteRole(roleId);
            this.filterAndDisplayRoles();
            
            if (window.uiManager) {
                window.uiManager.showNotification('角色已删除', 'success');
                window.uiManager.updateRoleStats();
            }
        }
    }

    // 分享角色
    shareRole(roleId) {
        const role = this.roles.find(r => r.id === roleId);
        if (role) {
            const shareData = {
                name: role.name,
                description: role.description,
                personality: role.personality,
                prompt: role.prompt,
                category: role.category,
                tags: role.tags,
                version: role.version || '1.0',
                author: role.author || 'anonymous'
            };

            const blob = new Blob([JSON.stringify(shareData, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `${role.name.replace(/[^a-zA-Z0-9]/g, '_')}_role.json`;
            a.click();
            URL.revokeObjectURL(url);

            if (window.uiManager) {
                window.uiManager.showNotification('角色已导出', 'success');
            }
        }
    }

    // 工具方法
    generateId() {
        return 'role_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    }

    // 预设角色库
    getPresetRoles() {
        return [
            {
                name: '生活顾问',
                description: '贴心的生活建议和问题解决助手',
                personality: '贴心、实用、细致入微',
                prompt: '你是一个贴心的生活顾问，擅长提供实用的生活建议和问题解决方案。请从实际角度出发，给出具体可行的建议。',
                category: 'life',
                tags: ['生活', '建议', '实用', '解决方案'],
                author: 'system'
            }
        ];
    }

    // 批量添加预设角色
    addPresetRoles() {
        const presets = this.getPresetRoles();
        presets.forEach(preset => {
            const role = {
                ...preset,
                id: this.generateId(),
                rating: 5,
                usage: 0,
                favorite: false,
                created: Date.now(),
                updated: Date.now(),
                version: '1.0'
            };
            this.roles.push(role);
        });
        this.saveRoles();
        this.filterAndDisplayRoles();
    }
}

// 导出到全局作用域
window.RoleManager = RoleManager;