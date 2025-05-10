const { app, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs-extra');
const Store = require('electron-store');
const { EventEmitter } = require('events');
const { BrowserWindow } = require('electron');
const { ipcRenderer } = require('electron');
const os = require('os');

class AchievementSystem extends EventEmitter {
    constructor() {
        super();
        this.store = new Store();
        this.achievements = {
            // Базовые достижения
            firstLaunch: {
                id: 'firstLaunch',
                title: 'Первый запуск',
                description: 'Добро пожаловать в Harmony Launcher!',
                icon: 'rocket',
                reward: 'Тема "Неоновая"',
                rarity: 'common'
            },
            tenGames: {
                id: 'tenGames',
                title: 'Заядлый игрок',
                description: 'Запустите игру 10 раз',
                icon: 'gamepad',
                reward: 'Тема "Киберпанк"',
                rarity: 'common'
            },
            hundredGames: {
                id: 'hundredGames',
                title: 'Ветеран',
                description: 'Запустите игру 100 раз',
                icon: 'trophy',
                reward: 'Тема "Золотая"',
                rarity: 'rare'
            },
            
            // Достижения для модов
            customTheme: {
                id: 'customTheme',
                title: 'Дизайнер',
                description: 'Создайте свою тему оформления',
                icon: 'palette',
                reward: 'Все темы разблокированы',
                rarity: 'uncommon'
            },
            modMaster: {
                id: 'modMaster',
                title: 'Мастер модов',
                description: 'Установите 50 различных модов',
                icon: 'puzzle-piece',
                reward: 'Ускоренная загрузка модов',
                rarity: 'epic'
            },
            modPack: {
                id: 'modPack',
                title: 'Создатель сборки',
                description: 'Создайте и сохраните свою сборку модов',
                icon: 'box',
                reward: 'Возможность делиться сборками',
                rarity: 'rare'
            },
            
            // Серверные достижения
            serverExplorer: {
                id: 'serverExplorer',
                title: 'Исследователь серверов',
                description: 'Добавьте 10 серверов в избранное',
                icon: 'server',
                reward: 'Статус VIP',
                rarity: 'uncommon'
            },
            serverVeteran: {
                id: 'serverVeteran',
                title: 'Ветеран серверов',
                description: 'Проведите 100 часов на серверах',
                icon: 'clock',
                reward: 'Особый значок профиля',
                rarity: 'epic'
            },
            
            // Социальные достижения
            socialButterfly: {
                id: 'socialButterfly',
                title: 'Социальная бабочка',
                description: 'Добавьте 5 друзей',
                icon: 'users',
                reward: 'Социальные функции',
                rarity: 'uncommon'
            },
            
            // Достижения производительности
            performanceTuner: {
                id: 'performanceTuner',
                title: 'Настройщик',
                description: 'Оптимизируйте настройки для максимальной производительности',
                icon: 'sliders',
                reward: 'Продвинутые настройки',
                rarity: 'rare'
            }
        };

        // Инициализация обработчиков событий
        this.initEventHandlers();

        this.achievementsCache = new Map();
        this.soundsCache = new Map();
        this.cacheDir = path.join(os.homedir(), '.minecraft', 'launcher_cache');
        this.achievementsPath = path.join(this.cacheDir, 'achievements.json');
        this.soundsPath = path.join(__dirname, 'assets', 'sounds');
        
        this.initializeCache().then(() => {
            this.checkFirstLaunch();
        });
    }

    initEventHandlers() {
        ipcMain.on('achievement:check', (event, data) => {
            this.checkAchievements();
        });

        ipcMain.on('achievement:get', (event) => {
            event.reply('achievement:data', this.getAchievements());
        });

        // Добавляем обработчик для сброса достижений
        ipcMain.on('achievements:reset', () => {
            this.resetProgress();
            // Отправляем обновленные данные в рендерер
            const mainWindow = BrowserWindow.getAllWindows()[0];
            if (mainWindow) {
                mainWindow.webContents.send('achievement:data', this.getAchievements());
            }
        });
    }

    init() {
        if (!this.store.has('achievements')) {
            this.store.set('achievements', {
                unlocked: {},
                stats: {
                    gamesLaunched: 0,
                    modsInstalled: 0,
                    serversAdded: 0,
                    themesCreated: 0,
                    totalPlayTime: 0,
                    friendsAdded: 0,
                    serverTime: 0,
                    performanceOptimized: false
                },
                notifications: []
            });
        }

        // Проверяем достижение первого запуска
        this.unlockAchievement('firstLaunch');
    }

    getAchievements() {
        return {
            all: this.achievements,
            unlocked: this.store.get('achievements.unlocked'),
            stats: this.store.get('achievements.stats'),
            notifications: this.store.get('achievements.notifications')
        };
    }

    updateStats(stat, value) {
        const currentStats = this.store.get('achievements.stats');
        currentStats[stat] = value;
        this.store.set('achievements.stats', currentStats);
        this.checkAchievements();
    }

    unlockAchievement(achievementId) {
        const achievement = this.achievements[achievementId];
        if (!achievement) return false;

        const unlockedAchievements = this.store.get('achievements.unlocked');
        if (unlockedAchievements[achievementId]) return false;

        unlockedAchievements[achievementId] = {
            timestamp: Date.now(),
            rewarded: false,
            rarity: achievement.rarity
        };

        // Добавляем уведомление
        const notifications = this.store.get('achievements.notifications');
        notifications.push({
            type: 'achievement',
            id: achievementId,
            title: achievement.title,
            description: achievement.description,
            reward: achievement.reward,
            timestamp: Date.now(),
            read: false
        });

        this.store.set('achievements.unlocked', unlockedAchievements);
        this.store.set('achievements.notifications', notifications);

        // Отправляем событие в рендерер
        this.emit('achievement:unlocked', {
            achievement,
            timestamp: Date.now()
        });

        return true;
    }

    checkAchievements() {
        const stats = this.store.get('achievements.stats');
        
        // Проверка игровых достижений
        if (stats.gamesLaunched >= 10) {
            this.unlockAchievement('tenGames');
        }
        if (stats.gamesLaunched >= 100) {
            this.unlockAchievement('hundredGames');
        }
        
        // Проверка достижений модов
        if (stats.modsInstalled >= 50) {
            this.unlockAchievement('modMaster');
        }
        if (stats.themesCreated >= 1) {
            this.unlockAchievement('customTheme');
        }
        
        // Проверка серверных достижений
        if (stats.serversAdded >= 10) {
            this.unlockAchievement('serverExplorer');
        }
        if (stats.serverTime >= 100) {
            this.unlockAchievement('serverVeteran');
        }
        
        // Проверка социальных достижений
        if (stats.friendsAdded >= 5) {
            this.unlockAchievement('socialButterfly');
        }
        
        // Проверка достижений производительности
        if (stats.performanceOptimized) {
            this.unlockAchievement('performanceTuner');
        }
    }

    getProgress(achievementId) {
        const stats = this.store.get('achievements.stats');
        const achievement = this.achievements[achievementId];
        
        if (!achievement) return 0;

        switch (achievementId) {
            case 'tenGames':
                return Math.min(100, (stats.gamesLaunched / 10) * 100);
            case 'hundredGames':
                return Math.min(100, (stats.gamesLaunched / 100) * 100);
            case 'modMaster':
                return Math.min(100, (stats.modsInstalled / 50) * 100);
            case 'serverExplorer':
                return Math.min(100, (stats.serversAdded / 10) * 100);
            case 'serverVeteran':
                return Math.min(100, (stats.serverTime / 100) * 100);
            case 'socialButterfly':
                return Math.min(100, (stats.friendsAdded / 5) * 100);
            case 'customTheme':
                return stats.themesCreated > 0 ? 100 : 0;
            case 'performanceTuner':
                return stats.performanceOptimized ? 100 : 0;
            default:
                return 0;
        }
    }

    clearNotifications() {
        this.store.set('achievements.notifications', []);
    }

    markNotificationAsRead(notificationId) {
        const notifications = this.store.get('achievements.notifications');
        const notification = notifications.find(n => n.id === notificationId);
        if (notification) {
            notification.read = true;
            this.store.set('achievements.notifications', notifications);
        }
    }

    getStats() {
        return this.store.get('achievements.stats');
    }

    resetProgress() {
        this.store.set('achievements', {
            unlocked: {},
            stats: {
                gamesLaunched: 0,
                modsInstalled: 0,
                serversAdded: 0,
                themesCreated: 0,
                totalPlayTime: 0,
                friendsAdded: 0,
                serverTime: 0,
                performanceOptimized: false
            },
            notifications: []
        });
    }

    async initializeCache() {
        try {
            await fs.ensureDir(this.cacheDir);
            
            // Проверяем существование файла достижений
            if (!await fs.pathExists(this.achievementsPath)) {
                await fs.writeJson(this.achievementsPath, {
                    unlocked: {},
                    stats: {
                        gamesLaunched: 0,
                        modsInstalled: 0,
                        serversAdded: 0,
                        themesCreated: 0,
                        totalPlayTime: 0,
                        friendsAdded: 0,
                        serverTime: 0,
                        performanceOptimized: false
                    }
                });
            }

            // Загружаем достижения
            const data = await fs.readJson(this.achievementsPath);
            this.achievementsCache = new Map(Object.entries(data));

            // Инициализируем звуки
            await this.initializeSounds();
        } catch (error) {
            console.error('Ошибка инициализации кэша:', error);
        }
    }

    async initializeSounds() {
        try {
            // Проверяем наличие папки sounds
            const soundsPath = path.join(__dirname, 'assets', 'sounds');
            await fs.ensureDir(soundsPath);

            const soundFiles = {
                common: 'achievement.mp3',
                uncommon: 'achievement.mp3',
                rare: 'achievement_rare.mp3',
                epic: 'achievement_epic.mp3'
            };

            // Проверяем наличие звуковых файлов
            for (const [rarity, filename] of Object.entries(soundFiles)) {
                const soundPath = path.join(soundsPath, filename);
                if (!await fs.pathExists(soundPath)) {
                    console.warn(`Звуковой файл ${filename} не найден`);
                    continue;
                }

                const audio = new Audio();
                audio.src = soundPath;
                this.soundsCache.set(rarity, audio);
                
                // Предзагрузка звука
                try {
                    await audio.load();
                } catch (error) {
                    console.warn(`Ошибка загрузки звука ${filename}:`, error);
                }
            }
        } catch (error) {
            console.error('Ошибка инициализации звуков:', error);
        }
    }

    async playAchievementSound(rarity = 'common') {
        try {
            const audio = this.soundsCache.get(rarity);
            if (audio) {
                // Проверяем, что звук не отключен в настройках
                const soundEnabled = localStorage.getItem('soundEnabled') !== 'false';
                const volume = (localStorage.getItem('soundVolume') || 50) / 100;

                if (soundEnabled) {
                    audio.volume = volume;
                    audio.currentTime = 0;
                    await audio.play();
                }
            }
        } catch (error) {
            console.warn('Ошибка воспроизведения звука:', error);
        }
    }

    async saveAchievement(achievementId, data) {
        try {
            this.achievementsCache.set(achievementId, data);
            
            // Сохраняем в файл
            await fs.writeJson(
                this.achievementsPath,
                Object.fromEntries(this.achievementsCache),
                { spaces: 2 }
            );

            // Определяем тип достижения и проигрываем соответствующий звук
            const achievementType = data.rarity || 'normal';
            await this.playAchievementSound(achievementType);
        } catch (error) {
            console.error('Ошибка сохранения достижения:', error);
        }
    }

    async loadAchievements() {
        try {
            if (this.achievementsCache.size > 0) {
                return Object.fromEntries(this.achievementsCache);
            }

            if (await fs.pathExists(this.achievementsPath)) {
                const data = await fs.readJson(this.achievementsPath);
                this.achievementsCache = new Map(Object.entries(data));
                return data;
            }

            return {};
        } catch (error) {
            console.error('Ошибка загрузки достижений:', error);
            return {};
        }
    }

    async resetAchievements() {
        try {
            const emptyData = {
                unlocked: {},
                stats: {
                    gamesLaunched: 0,
                    modsInstalled: 0,
                    serversAdded: 0,
                    themesCreated: 0,
                    totalPlayTime: 0,
                    friendsAdded: 0,
                    serverTime: 0,
                    performanceOptimized: false
                }
            };

            await fs.writeJson(this.achievementsPath, emptyData);
            this.achievementsCache = new Map(Object.entries(emptyData));

            // Показываем уведомление о сбросе
            const notification = {
                title: 'Достижения сброшены',
                description: 'Все достижения были успешно сброшены',
                icon: 'trash',
                rarity: 'common'
            };
            await this.showAchievementNotification(notification);

            // Проверяем первый запуск после сброса
            await this.checkFirstLaunch();

            return true;
        } catch (error) {
            console.error('Ошибка сброса достижений:', error);
            return false;
        }
    }

    async checkFirstLaunch() {
        try {
            const data = await this.loadAchievements();
            // Проверяем, есть ли вообще разблокированные достижения
            if (!data.unlocked || Object.keys(data.unlocked).length === 0) {
                // Это первый запуск или достижения были сброшены
                await this.unlockAchievement('firstLaunch');
            }
        } catch (error) {
            console.error('Ошибка проверки первого запуска:', error);
        }
    }

    async updateAchievementProgress(achievementId, progress) {
        try {
            const achievement = this.achievementsCache.get(achievementId);
            
            if (achievement) {
                achievement.progress = progress;
                await this.saveAchievement(achievementId, achievement);
                
                // Если достижение выполнено, проигрываем звук
                if (progress >= 100) {
                    await this.playAchievementSound(achievement.rarity);
                }
            }
        } catch (error) {
            console.error('Ошибка обновления прогресса:', error);
        }
    }
}

module.exports = new AchievementSystem(); 