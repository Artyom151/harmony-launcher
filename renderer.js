const { ipcRenderer, shell } = require('electron');
const MinecraftLauncher = require('./minecraft-launcher');
const path = require('path');
const fs = require('fs-extra');
const os = require('os');
const { exec } = require('child_process');
const { version } = require('./package.json');

// DOM Elements
const minimizeBtn = document.getElementById('minimize-btn');
const maximizeBtn = document.getElementById('maximize-btn');
const closeBtn = document.getElementById('close-btn');
const usernameInput = document.querySelector('.username-input');
const profileAvatar = document.querySelector('.profile-avatar');
const versionBtn = document.querySelector('.version-btn');
const versionBtnText = versionBtn.querySelector('span');
const versionsContainer = document.querySelector('.versions');
const ramButtons = document.querySelectorAll('.ram-btn');
const playBtn = document.querySelector('.play-btn');
const playBtnText = playBtn.querySelector('span');
const playBtnIcon = playBtn.querySelector('i');
const progressContainer = document.querySelector('.progress-container');
const progressBar = document.querySelector('.progress-bar');
const progressText = document.querySelector('.progress-text');

// State Variables
let currentUsername = localStorage.getItem('minecraft-username') || '';
let selectedVersion = localStorage.getItem('minecraft-version') || '1.20.4';
let selectedRam = localStorage.getItem('minecraft-ram') || '4';
let isLaunching = false;

// Инициализация лаунчера
const launcher = new MinecraftLauncher();

// Добавляем версию в заголовок
const logoText = document.querySelector('.logo-text');
logoText.textContent = `HARMONY LAUNCHER v${version}`;

// Window Controls
minimizeBtn.addEventListener('click', () => ipcRenderer.send('minimize-window'));
maximizeBtn.addEventListener('click', () => ipcRenderer.send('maximize-window'));
closeBtn.addEventListener('click', () => ipcRenderer.send('close-window'));

// Username and Avatar
usernameInput.value = currentUsername;
updateAvatar(currentUsername);
usernameInput.addEventListener('input', (e) => {
    currentUsername = e.target.value;
    localStorage.setItem('minecraft-username', currentUsername);
    updateAvatar(currentUsername);
});

function updateAvatar(username) {
    profileAvatar.src = username ? `https://mc-heads.net/avatar/${username}` : 'https://mc-heads.net/avatar/steve';
}

// --- Version Selection --- START ---
const ALL_MINECRAFT_VERSIONS = [
    '1.21.5', '1.21.4', '1.21.3', '1.21.2', '1.21.1', '1.21',
    '1.20.6', '1.20.5', '1.20.4', '1.20.3', '1.20.2', '1.20.1', '1.20',
    '1.19.4', '1.19.3', '1.19.2', '1.19.1', '1.19',
    '1.18.2', '1.18.1', '1.18',
    '1.17.1', '1.17',
    '1.16.5', '1.16.4', '1.16.3', '1.16.2', '1.16.1', '1.16',
    '1.15.2', '1.15.1', '1.15',
    '1.14.4', '1.14.3', '1.14.2', '1.14.1', '1.14',
    '1.13.2', '1.13.1', '1.13',
    '1.12.2', '1.12.1', '1.12',
    '1.11.2', '1.11.1', '1.11',
    '1.10.2', '1.10.1', '1.10',
    '1.9.4', '1.9.3', '1.9.2', '1.9.1', '1.9',
    '1.8.9', '1.8.8', '1.8.7', '1.8.6', '1.8.5', '1.8.4', '1.8.3', '1.8.2', '1.8.1', '1.8',
    '1.7.10', '1.7.9', '1.7.8', '1.7.7', '1.7.6', '1.7.5', '1.7.4', '1.7.2',
    '1.6.4', '1.6.2', '1.6.1',
    '1.5.2', '1.5.1', '1.5',
    '1.4.7', '1.4.6', '1.4.5', '1.4.4', '1.4.2',
    '1.3.2', '1.3.1',
    '1.2.5', '1.2.4', '1.2.3', '1.2.2', '1.2.1',
    '1.1',
    '1.0'

];

// Функция для создания элемента версии
function createVersionElement(version) {
    const button = document.createElement('button');
    button.classList.add('version-item');
    button.dataset.version = version;
    
    // Добавляем звездочку для популярных версий
    if (['1.21.5', '1.20.6', '1.19.4', '1.18.2', '1.17.1', '1.16.5','1.15.2','1.14.4', '1.13.2', '1.12.2', '1.8.9', '1.7.10'].includes(version)) {
        const icon = document.createElement('i');
        icon.className = 'fas fa-star';
        button.appendChild(icon);
    }
    
    const span = document.createElement('span');
    span.textContent = version;
    button.appendChild(span);
    
    // Подсвечиваем выбранную версию
    if (version === selectedVersion) {
        button.classList.add('selected');
    }
    
    // Обработчик клика по версии
    button.addEventListener('click', () => {
        const oldSelected = versionsContainer.querySelector('.version-item.selected');
        if (oldSelected) {
            oldSelected.classList.remove('selected');
        }
        button.classList.add('selected');
        selectedVersion = version;
        versionBtnText.textContent = version;
        localStorage.setItem('minecraft-version', version);
        versionsContainer.style.display = 'none';
    });
    
    return button;
}

// Заполняем список версий
function populateVersionsList() {
    versionsContainer.innerHTML = '';
    ALL_MINECRAFT_VERSIONS.forEach(version => {
        versionsContainer.appendChild(createVersionElement(version));
    });
}

// Инициализируем список версий
populateVersionsList();

// Обработчик клика по кнопке выбора версии
versionBtn.addEventListener('click', (e) => {
    e.stopPropagation(); // Предотвращаем всплытие события
    const isVisible = versionsContainer.style.display === 'block';
    versionsContainer.style.display = isVisible ? 'none' : 'block';
});

// Закрываем список версий при клике вне его
document.addEventListener('click', (e) => {
    if (!e.target.closest('.version-selector')) {
        versionsContainer.style.display = 'none';
    }
});

// Предотвращаем закрытие при клике внутри списка
versionsContainer.addEventListener('click', (e) => {
    e.stopPropagation();
});
// --- Version Selection --- END ---

// RAM Selection
ramButtons.forEach(button => {
    if (button.dataset.ram === selectedRam) button.classList.add('active');
    else button.classList.remove('active');
    button.addEventListener('click', () => {
        ramButtons.forEach(btn => btn.classList.remove('active'));
        button.classList.add('active');
        selectedRam = button.dataset.ram;
        localStorage.setItem('minecraft-ram', selectedRam);
    });
});

// Launch Game
playBtn.addEventListener('click', async () => {
    if (isLaunching) return;

    if (!selectedVersion) {
        showNotification('Пожалуйста, выберите версию игры!', 'error');
        return;
    }
    if (!currentUsername) {
        showNotification('Пожалуйста, введите никнейм!', 'error');
        return;
    }

    try {
        isLaunching = true;
        updateLaunchUI(true, 'Запуск...');
        showProgress(true);

        const process = await launcher.launch(currentUsername, selectedVersion, selectedRam);
        
        if (!process) {}

        showNotification('Minecraft успешно запущен!', 'success');
        updateLaunchUI(false, 'Запущено');

        process.on('error', (err) => {
            console.error('Ошибка процесса:', err);
            showNotification('Ошибка: ' + err.message, 'error');
            resetLaunchUI();
        });

        process.on('close', (code) => {
            console.log('Minecraft завершил работу с кодом:', code);
            showNotification(`Minecraft завершил работу ${code === 0 ? 'успешно' : 'с ошибкой'}`, code === 0 ? 'success' : 'warning');
            resetLaunchUI();
        });

    } catch (err) {
        console.error('Ошибка запуска:', err);
        showNotification('Ошибка запуска: ' + err.message, 'error');
        resetLaunchUI();
    }
});

// UI Updates
function updateLaunchUI(launching, text) {
    playBtn.disabled = launching;
    playBtnText.textContent = text;
    playBtnIcon.className = launching ? 'fas fa-spinner fa-spin' : 'fas fa-play';
}

function resetLaunchUI() {
    isLaunching = false;
    updateLaunchUI(false, 'Играть');
    showProgress(false);
}

function showProgress(show = true) {
    progressContainer.style.display = show ? 'flex' : 'none';
    if (!show) {
        progressBar.style.width = '0%';
        progressText.textContent = '';
    }
}

// Server Connection Placeholder
document.querySelectorAll('.connect-btn').forEach(button => {
    button.addEventListener('click', (e) => {
        const serverIp = e.target.closest('.server-card').querySelector('.ip').textContent;
        showNotification(`Попытка подключения к серверу: ${serverIp}`, 'info');
    });
});

// Notification System (improved)
function showNotification(message, type = 'info') {
    if (!message) return; // Проверка на пустое сообщение
    
    const containerId = 'notification-container';
    let container = document.getElementById(containerId);
    
    if (!container) {
        container = document.createElement('div');
        container.id = containerId;
        container.className = 'notification-container';
        document.body.appendChild(container);
    }

    try {
        const notification = document.createElement('div');
        notification.className = `notification ${type || 'info'}`;
        
        const icon = document.createElement('i');
        icon.className = `fas ${getNotificationIcon(type)} notification-icon`;
        
        const text = document.createElement('span');
        text.innerHTML = message.toString().replace(/\n/g, '<br>');
        
        notification.appendChild(icon);
        notification.appendChild(text);
        container.appendChild(notification);
        
        // Используем setTimeout для гарантированного добавления класса
        setTimeout(() => {
            notification.classList.add('show');
        }, 10);
        
        setTimeout(() => {
            if (notification && notification.classList) {
                notification.classList.remove('show');
                notification.addEventListener('transitionend', () => {
                    if (notification && notification.parentNode) {
                        notification.remove();
                    }
                }, { once: true });
            }
        }, 5000);
    } catch (err) {
        console.warn('Error showing notification:', err);
    }
}

function getNotificationIcon(type) {
    const icons = {
        'success': 'fa-check-circle',
        'error': 'fa-exclamation-circle',
        'warning': 'fa-exclamation-triangle',
        'info': 'fa-info-circle'
    };
    return icons[type] || icons.info;
}

if (!document.getElementById('notification-styles')) {
    const style = document.createElement('style');
    style.id = 'notification-styles';
    style.textContent = `
    .notification-container {
        position: fixed;
        top: 20px;
        right: 20px;
        z-index: 9999;
        display: flex;
        flex-direction: column;
        gap: 10px;
        width: 340px; /* Slightly wider for more text */
    }
    .notification {
        display: flex;
        align-items: flex-start; /* Align icon to top with multi-line text */
        gap: 12px;
        background: var(--surface-extra-light);
        color: var(--text);
        padding: 14px 20px;
        border-radius: var(--border-radius-md);
        box-shadow: var(--shadow-lg);
        transform: translateX(110%);
        opacity: 0;
        transition: transform 0.35s cubic-bezier(0.25, 0.8, 0.25, 1), opacity 0.35s cubic-bezier(0.25, 0.8, 0.25, 1);
        font-weight: 500;
        border-left: 4px solid transparent;
        cursor: default;
        line-height: 1.4;
    }
    .notification span {
        flex: 1;
    }
    .notification:hover {
        transform: translateX(0) scale(1.02);
        opacity: 1;
    }
    .notification.show {
        transform: translateX(0);
        opacity: 1;
    }
    .notification.success { border-left-color: var(--success); }
    .notification.success .notification-icon { color: var(--success); margin-top: 2px; }
    .notification.error { border-left-color: var(--error); }
    .notification.error .notification-icon { color: var(--error); margin-top: 2px; }
    .notification.warning { border-left-color: var(--warning); }
    .notification.warning .notification-icon { color: var(--warning); margin-top: 2px; }
    .notification.info { border-left-color: var(--primary-light); }
    .notification.info .notification-icon { color: var(--primary-light); margin-top: 2px; }
    .notification-icon { font-size: 20px; }
    `;
    document.head.appendChild(style);
}

// Добавляем слушатель для логов Minecraft
ipcRenderer.on('minecraft-log', (event, log) => {
    console.log('Minecraft:', log);
    // Здесь можно добавить вывод логов в интерфейс
});

// Функция проверки обновлений
async function checkForUpdates() {
    try {
        const response = await fetch('https://api.github.com/repos/Artyom151/harmony-launcher/releases/latest');
        const data = await response.json();
        
        if (data.tag_name) {
            const latestVersion = data.tag_name.replace('v', '');
            const currentVersion = version;
            
            if (latestVersion !== currentVersion) {
                showNotification(
                    `Доступна новая версия Harmony Launcher: ${latestVersion}\nТекущая версия: ${currentVersion}`,
                    'info'
                );
            }
        }
    } catch (error) {
        console.error('Ошибка проверки обновлений:', error);
    }
}

// Проверяем обновления при запуске
checkForUpdates();

// Проверяем обновления каждый час
setInterval(checkForUpdates, 3600000);

// Settings
const settingsBtn = document.querySelector('.settings-btn');
const settingsModal = document.getElementById('settingsModal');
const closeSettingsBtn = document.querySelector('.close-settings');
const themeButtons = document.querySelectorAll('.theme-btn');
const enableAnimationsToggle = document.getElementById('enableAnimations');
const enableNotificationsToggle = document.getElementById('enableNotifications');

// Load saved settings
let currentTheme = localStorage.getItem('theme') || 'amethyst';
let enableAnimations = localStorage.getItem('enableAnimations') !== 'false';
let enableNotifications = localStorage.getItem('enableNotifications') !== 'false';

// Apply saved settings
document.documentElement.setAttribute('data-theme', currentTheme);
enableAnimationsToggle.checked = enableAnimations;
enableNotificationsToggle.checked = enableNotifications;

// Update active theme button
function updateActiveTheme() {
    themeButtons.forEach(btn => {
        btn.classList.toggle('active', btn.dataset.theme === currentTheme);
    });
}
updateActiveTheme();

// Settings Modal Controls
settingsBtn.addEventListener('click', () => {
    settingsModal.style.display = 'block';
    // Trigger reflow
    settingsModal.offsetHeight;
    settingsModal.classList.add('show');
});

function closeSettingsModal() {
    settingsModal.classList.remove('show');
    setTimeout(() => {
        settingsModal.style.display = 'none';
        // Reset animations for next open
        const sections = settingsModal.querySelectorAll('.settings-section');
        sections.forEach(section => {
            section.style.animation = 'none';
            section.offsetHeight; // Trigger reflow
            section.style.animation = '';
        });
    }, 300); // Match transition duration
}

closeSettingsBtn.addEventListener('click', closeSettingsModal);

settingsModal.addEventListener('click', (e) => {
    if (e.target === settingsModal) {
        closeSettingsModal();
    }
});

// Prevent closing when clicking inside settings content
settingsModal.querySelector('.settings-content').addEventListener('click', (e) => {
    e.stopPropagation();
});

// Theme Selection with smooth transition
themeButtons.forEach(btn => {
    btn.addEventListener('click', () => {
        const theme = btn.dataset.theme;
        if (currentTheme === theme) return;

        // Add transition class to body for smooth theme change
        document.body.classList.add('theme-transition');
        
        // Очищаем стили пользовательской темы
        if (window.themeConstructor && typeof window.themeConstructor.clearCustomThemeStyles === 'function') {
            window.themeConstructor.clearCustomThemeStyles();
        } else {
            // Резервный метод, если конструктор недоступен
            document.documentElement.removeAttribute('style');
        }
        
        // Update theme
        currentTheme = theme;
        document.documentElement.setAttribute('data-theme', theme);
        localStorage.setItem('theme', theme);
        updateActiveTheme();

        // Remove transition class after animation
        setTimeout(() => {
            document.body.classList.remove('theme-transition');
        }, 300);
    });
});

// Animation Toggle
enableAnimationsToggle.addEventListener('change', () => {
    enableAnimations = enableAnimationsToggle.checked;
    localStorage.setItem('enableAnimations', enableAnimations);
    
    if (!enableAnimations) {
        document.body.classList.add('disable-animations');
    } else {
        document.body.classList.remove('disable-animations');
    }
});

// Notifications Toggle
enableNotificationsToggle.addEventListener('change', () => {
    enableNotifications = enableNotificationsToggle.checked;
    localStorage.setItem('enableNotifications', enableNotifications);
});

// Override showNotification function to respect settings
const originalShowNotification = showNotification;
window.showNotification = function(message, type = 'info') {
    try {
        if (typeof enableNotifications !== 'undefined' && enableNotifications) {
            originalShowNotification(message, type);
        }
    } catch (err) {
        console.warn('Error in notification system:', err);
    }
};

// Добавляем классы для отключения анимаций, но не трогаем DOM-структуру
if (!enableAnimations) {
    document.body.classList.add('disable-animations');
}

// Social Links
const socialButtons = document.querySelectorAll('.social-sidebar a');
socialButtons.forEach(button => {
    button.addEventListener('click', (e) => {
        e.preventDefault();
        const url = button.getAttribute('href');
        if (url) {
            // Используем Electron shell для открытия ссылки в браузере по умолчанию
            shell.openExternal(url);
            
            // Показываем уведомление
            const socialName = button.getAttribute('data-tooltip');
            showNotification(`Переход на ${socialName}`, 'info');
        }
    });
});

// Ссылки в новостях
const newsLinks = document.querySelectorAll('.news-excerpt a');
newsLinks.forEach(link => {
    link.addEventListener('click', (e) => {
        e.preventDefault();
        const url = link.getAttribute('href');
        if (url) {
            // Используем Electron shell для открытия ссылки в браузере по умолчанию
            shell.openExternal(url);
            
            // Показываем уведомление
            showNotification(`Открываю ссылку в браузере: ${url}`, 'info');
        }
    });
});

// Система достижений
class AchievementsUI {
    constructor() {
        this.achievementsContainer = document.getElementById('achievements-container');
        this.notificationsContainer = document.getElementById('notifications-container');
        
        // Инициализация звука
        this.achievementSound = new Audio();
        this.achievementSound.src = './assets/sounds/achievement.mp3';
        this.achievementSound.volume = 0.5; // Устанавливаем громкость на 50%
        
        this.initEventListeners();
        this.loadAchievements();
    }

    initEventListeners() {
        // Слушаем события достижений
        ipcRenderer.on('achievement:data', (event, data) => {
            this.renderAchievements(data);
        });

        // Слушаем новые достижения
        ipcRenderer.on('achievement:unlocked', (event, data) => {
            this.showAchievementNotification(data.achievement);
            this.loadAchievements(); // Обновляем список
        });
    }

    loadAchievements() {
        ipcRenderer.send('achievement:get');
    }

    renderAchievements(data) {
        if (!this.achievementsContainer) return;

        const { all, unlocked, stats } = data;
        let html = '<div class="achievements-grid">';

        Object.values(all).forEach(achievement => {
            const isUnlocked = unlocked[achievement.id];
            const progress = this.calculateProgress(achievement.id, stats);
            
            html += `
                <div class="achievement-card ${isUnlocked ? 'unlocked' : ''} ${achievement.rarity}">
                    <div class="achievement-icon">
                        <i class="fas fa-${achievement.icon}"></i>
                    </div>
                    <div class="achievement-info">
                        <h3>${achievement.title}</h3>
                        <p>${achievement.description}</p>
                        <div class="achievement-progress">
                            <div class="progress-bar" style="width: ${progress}%"></div>
                            <span>${progress}%</span>
                        </div>
                        ${isUnlocked ? `
                            <div class="achievement-reward">
                                <i class="fas fa-gift"></i> ${achievement.reward}
                            </div>
                        ` : ''}
                    </div>
                    <div class="achievement-rarity ${achievement.rarity}">
                        ${achievement.rarity.toUpperCase()}
                    </div>
                </div>
            `;
        });

        html += '</div>';
        this.achievementsContainer.innerHTML = html;
    }

    calculateProgress(achievementId, stats) {
        // Логика расчета прогресса достижения
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

    showAchievementNotification(achievement) {
        // Воспроизводим звук
        try {
            this.achievementSound.currentTime = 0; // Сбрасываем время воспроизведения
            this.achievementSound.play().catch(err => console.warn('Ошибка воспроизведения звука:', err));
        } catch (err) {
            console.warn('Ошибка при работе со звуком:', err);
        }

        const notification = document.createElement('div');
        notification.className = `achievement-notification ${achievement.rarity}`;
        notification.innerHTML = `
            <div class="notification-icon">
                <i class="fas fa-${achievement.icon}"></i>
            </div>
            <div class="notification-content">
                <h4>Новое достижение!</h4>
                <p>${achievement.title}</p>
                <span>${achievement.description}</span>
            </div>
        `;

        this.notificationsContainer.appendChild(notification);

        // Добавляем анимацию появления
        requestAnimationFrame(() => {
            notification.classList.add('show');
        });

        // Удаляем уведомление через 5 секунд
        setTimeout(() => {
            notification.classList.add('fade-out');
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.parentNode.removeChild(notification);
                }
            }, 500);
        }, 5000);
    }
}

// Инициализация системы достижений
const achievementsUI = new AchievementsUI();

// Добавляем новые элементы в настройки
const resetAchievementsBtn = document.createElement('button');
resetAchievementsBtn.className = 'reset-achievements-btn';
resetAchievementsBtn.innerHTML = `
    <i class="fas fa-trash"></i>
    <span>Сбросить достижения</span>
`;

const customThemeBtn = document.createElement('button');
customThemeBtn.className = 'custom-theme-btn';
customThemeBtn.innerHTML = `
    <i class="fas fa-paint-brush"></i>
    <span>Создать свою тему</span>
`;

// Добавляем новую секцию в настройки
const achievementsSection = document.createElement('div');
achievementsSection.className = 'settings-section';
achievementsSection.innerHTML = `
    <h3>Достижения</h3>
    <div class="achievements-controls">
        <p class="settings-description">Управление прогрессом достижений</p>
        <div class="achievements-buttons">
            ${resetAchievementsBtn.outerHTML}
        </div>
    </div>
`;

const customThemeSection = document.createElement('div');
customThemeSection.className = 'settings-section';
customThemeSection.innerHTML = `
    <h3>Пользовательские темы</h3>
    <div class="custom-theme-controls">
        <p class="settings-description">Создайте свою уникальную тему оформления</p>
        <div class="custom-theme-buttons">
            ${customThemeBtn.outerHTML}
        </div>
    </div>
`;

// Добавляем секции в настройки
document.querySelector('.settings-body').appendChild(achievementsSection);
document.querySelector('.settings-body').appendChild(customThemeSection);

// Обработчик для сброса достижений
document.querySelector('.reset-achievements-btn').addEventListener('click', async () => {
    // Создаем модальное окно подтверждения
    const confirmDialog = document.createElement('div');
    confirmDialog.className = 'confirm-dialog';
    confirmDialog.innerHTML = `
        <div class="confirm-dialog-content">
            <h3><i class="fas fa-exclamation-triangle"></i> Подтверждение сброса</h3>
            <p>Вы уверены, что хотите сбросить все достижения?</p>
            <p class="warning-text">Это действие нельзя отменить!</p>
            <div class="confirm-dialog-buttons">
                <button class="cancel-btn">Отмена</button>
                <button class="confirm-btn">Сбросить</button>
            </div>
        </div>
    `;

    document.body.appendChild(confirmDialog);

    // Добавляем стили для диалога
    const style = document.createElement('style');
    style.textContent = `
        .confirm-dialog {
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(0, 0, 0, 0.5);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 9999;
            opacity: 0;
            transition: opacity 0.3s ease;
        }
        
        .confirm-dialog.show {
            opacity: 1;
        }
        
        .confirm-dialog-content {
            background: var(--surface);
            padding: 24px;
            border-radius: var(--border-radius-md);
            max-width: 400px;
            width: 90%;
            transform: translateY(-20px);
            transition: transform 0.3s ease;
        }
        
        .confirm-dialog.show .confirm-dialog-content {
            transform: translateY(0);
        }
        
        .confirm-dialog h3 {
            margin: 0 0 16px 0;
            display: flex;
            align-items: center;
            gap: 8px;
            color: var(--error);
        }
        
        .confirm-dialog p {
            margin: 0 0 16px 0;
            color: var(--text);
        }
        
        .warning-text {
            color: var(--error) !important;
            font-weight: 500;
        }
        
        .confirm-dialog-buttons {
            display: flex;
            gap: 12px;
            justify-content: flex-end;
        }
        
        .confirm-dialog button {
            padding: 8px 16px;
            border: none;
            border-radius: var(--border-radius-md);
            cursor: pointer;
            font-weight: 500;
            transition: all 0.3s ease;
        }
        
        .cancel-btn {
            background: var(--surface-light);
            color: var(--text);
        }
        
        .confirm-btn {
            background: var(--error);
            color: white;
        }
        
        .cancel-btn:hover {
            background: var(--surface-extra-light);
        }
        
        .confirm-btn:hover {
            background: var(--error-dark);
        }
    `;
    document.head.appendChild(style);

    // Показываем диалог
    requestAnimationFrame(() => {
        confirmDialog.classList.add('show');
    });

    // Обработчики кнопок
    return new Promise((resolve) => {
        const closeDialog = (result) => {
            confirmDialog.classList.remove('show');
            setTimeout(() => {
                document.body.removeChild(confirmDialog);
                resolve(result);
            }, 300);
        };

        confirmDialog.querySelector('.cancel-btn').addEventListener('click', () => {
            closeDialog(false);
        });

        confirmDialog.querySelector('.confirm-btn').addEventListener('click', async () => {
            closeDialog(true);
            // Отправляем запрос на сброс достижений
            await ipcRenderer.send('achievements:reset');
            showNotification('Достижения успешно сброшены', 'success');
        });

        // Закрытие по клику вне диалога
        confirmDialog.addEventListener('click', (e) => {
            if (e.target === confirmDialog) {
                closeDialog(false);
            }
        });
    });
});

// Добавляем HTML модального окна конструктора тем
const themeConstructorHTML = `
<div id="themeConstructorModal" class="theme-constructor-modal">
    <div class="theme-constructor-content">
        <div class="theme-constructor-header">
            <h2><i class="fas fa-paint-brush"></i> Конструктор тем</h2>
            <button class="close-constructor"><i class="fas fa-times"></i></button>
        </div>
        <div class="theme-constructor-body">
            <div class="theme-preview-area">
                <div class="theme-preview-window">
                    <div class="preview-titlebar"></div>
                    <div class="preview-content">
                        <div class="preview-sidebar"></div>
                        <div class="preview-main"></div>
                    </div>
                </div>
            </div>
            <div class="theme-controls">
                <div class="color-section">
                    <h3>Основные цвета</h3>
                    <div class="color-control">
                        <label>Основной цвет</label>
                        <input type="color" data-var="--primary" value="#3b82f6">
                    </div>
                    <div class="color-control">
                        <label>Акцентный цвет</label>
                        <input type="color" data-var="--accent" value="#818cf8">
                    </div>
                    <div class="color-control">
                        <label>Фон</label>
                        <input type="color" data-var="--background" value="#0f172a">
                    </div>
                    <div class="color-control">
                        <label>Поверхность</label>
                        <input type="color" data-var="--surface" value="#1e293b">
                    </div>
                    <div class="color-control">
                        <label>Текст</label>
                        <input type="color" data-var="--text" value="#e2e8f0">
                    </div>
                </div>
                <div class="theme-options">
                    <h3>Настройки</h3>
                    <div class="option-control">
                        <label>Название темы</label>
                        <input type="text" id="themeName" placeholder="Моя тема">
                    </div>
                    <div class="option-control">
                        <label>Скругление углов (px)</label>
                        <input type="range" id="borderRadius" min="0" max="20" value="8">
                    </div>
                    <div class="option-control">
                        <label>Прозрачность (%)</label>
                        <input type="range" id="transparency" min="0" max="100" value="95">
                    </div>
                </div>
                <div class="theme-actions">
                    <button class="save-theme-btn">
                        <i class="fas fa-save"></i>
                        Сохранить тему
                    </button>
                    <button class="export-theme-btn">
                        <i class="fas fa-file-export"></i>
                        Экспортировать
                    </button>
                    <button class="import-theme-btn">
                        <i class="fas fa-file-import"></i>
                        Импортировать
                    </button>
                </div>
            </div>
        </div>
    </div>
</div>`;

// Добавляем HTML в документ
document.body.insertAdjacentHTML('beforeend', themeConstructorHTML);

// Обновляем класс ThemeConstructor
class ThemeConstructor {
    constructor() {
        this.modal = document.getElementById('themeConstructorModal');
        this.themesPath = path.join(os.homedir(), '.minecraft', 'launcher_themes.json');
        this.themesBackupPath = path.join(os.homedir(), '.minecraft', 'launcher_themes_backup');
        
        // Инициализируем директории и файлы
        this.initializeThemeStorage();
        
        // Добавляем предустановленные цветовые схемы
        this.presetColors = {
            'dark': [
                {
                    name: 'Тёмный синий',
                    primary: '#3b82f6',
                    accent: '#818cf8',
                    background: '#0f172a',
                    surface: '#1e293b',
                    text: '#e2e8f0'
                },
                {
                    name: 'Тёмный фиолетовый',
                    primary: '#8b5cf6',
                    accent: '#a78bfa',
                    background: '#121828',
                    surface: '#1f2937',
                    text: '#e2e8f0'
                },
                {
                    name: 'Тёмный зелёный',
                    primary: '#10b981',
                    accent: '#34d399',
                    background: '#0f172a',
                    surface: '#1e293b',
                    text: '#e2e8f0'
                },
                {
                    name: 'Тёмный красный',
                    primary: '#ef4444',
                    accent: '#f87171',
                    background: '#0f172a',
                    surface: '#1e293b',
                    text: '#e2e8f0'
                }
            ],
            'light': [
                {
                    name: 'Светлый синий',
                    primary: '#3b82f6',
                    accent: '#60a5fa',
                    background: '#f1f5f9',
                    surface: '#e2e8f0',
                    text: '#1e293b'
                },
                {
                    name: 'Светлый фиолетовый',
                    primary: '#8b5cf6',
                    accent: '#a78bfa',
                    background: '#f8fafc',
                    surface: '#f1f5f9',
                    text: '#1e293b'
                },
                {
                    name: 'Светлый зелёный',
                    primary: '#10b981',
                    accent: '#34d399',
                    background: '#f1f5f9',
                    surface: '#e2e8f0',
                    text: '#1e293b'
                }
            ],
            'vibrant': [
                {
                    name: 'Неоновый',
                    primary: '#ff00ff',
                    accent: '#00ffff',
                    background: '#000000',
                    surface: '#0f0f0f',
                    text: '#ffffff'
                },
                {
                    name: 'Киберпанк',
                    primary: '#f9cb28',
                    accent: '#ff003c',
                    background: '#170b33',
                    surface: '#250c47',
                    text: '#ffffff'
                },
                {
                    name: 'Ретро',
                    primary: '#ff8a00',
                    accent: '#e53935',
                    background: '#2c2c54',
                    surface: '#474787',
                    text: '#f7f1e3'
                }
            ]
        };
        
        this.initializeConstructor();
        this.setupBackupSystem();
    }

    // Новый метод для инициализации хранилища тем
    initializeThemeStorage() {
        // Создаем директорию .minecraft, если она не существует
        const minecraftDir = path.join(os.homedir(), '.minecraft');
        if (!fs.existsSync(minecraftDir)) {
            try {
                fs.mkdirSync(minecraftDir, { recursive: true });
                console.log('Создана директория .minecraft');
            } catch (err) {
                console.error('Ошибка создания директории .minecraft:', err);
            }
        }

        // Создаем файл тем, если он не существует
        if (!fs.existsSync(this.themesPath)) {
            try {
                fs.writeFileSync(this.themesPath, JSON.stringify([], null, 2));
                console.log('Создан файл тем');
            } catch (err) {
                console.error('Ошибка создания файла тем:', err);
            }
        }
        
        // Создаем директорию для бэкапов
        if (!fs.existsSync(this.themesBackupPath)) {
            try {
                fs.mkdirSync(this.themesBackupPath, { recursive: true });
                console.log('Создана директория для бэкапов тем');
            } catch (err) {
                console.error('Ошибка создания директории для бэкапов:', err);
            }
        }
    }

    show() {
        if (!this.modal) return;
        this.modal.style.display = 'block';
        requestAnimationFrame(() => {
            this.modal.classList.add('show');
        });
        this.loadCurrentTheme();
        
        // Инициализируем категорию стандартных тем по умолчанию
        this.initPresetColors('standard');
        
        // Активируем кнопку категории "Стандартные темы"
        const categoryBtns = this.modal.querySelectorAll('.preset-category-btn');
        categoryBtns.forEach(btn => {
            btn.classList.toggle('active', btn.dataset.category === 'standard');
        });
    }

    hide() {
        if (!this.modal) return;
        this.modal.classList.remove('show');
        setTimeout(() => {
            this.modal.style.display = 'none';
        }, 300);
    }

    setupBackupSystem() {
        // Теперь этот метод просто вызывает инициализацию хранилища
        this.initializeThemeStorage();
    }

    initializeConstructor() {
        if (!this.modal) return;

        // Загружаем сохраненные темы при инициализации
        this.loadThemes();

        const colorInputs = this.modal.querySelectorAll('input[type="color"]');
        const rangeInputs = this.modal.querySelectorAll('input[type="range"]');
        const closeBtn = this.modal.querySelector('.close-constructor');
        const saveBtn = this.modal.querySelector('.save-theme-btn');
        const exportBtn = this.modal.querySelector('.export-theme-btn');
        const importBtn = this.modal.querySelector('.import-theme-btn');

        // Добавляем кнопку удаления темы
        const themeActions = this.modal.querySelector('.theme-actions');
        if (themeActions) {
            // Проверяем, нет ли уже кнопки удаления
            if (!this.modal.querySelector('.delete-theme-btn')) {
                const deleteBtn = document.createElement('button');
                deleteBtn.className = 'delete-theme-btn';
                deleteBtn.innerHTML = `
                    <i class="fas fa-trash"></i>
                    Удалить тему
                `;
                themeActions.appendChild(deleteBtn);
                
                // Добавляем обработчик события
                deleteBtn.addEventListener('click', () => {
                    const themeName = this.modal.querySelector('#themeName').value;
                    if (!themeName) {
                        showNotification('Введите название темы для удаления', 'warning');
                        return;
                    }
                    
                    // Запрашиваем подтверждение удаления
                    if (confirm(`Вы уверены, что хотите удалить тему "${themeName}"?`)) {
                        this.deleteTheme(themeName).then(success => {
                            if (success) {
                                // Закрываем конструктор после удаления
                                setTimeout(() => {
                                    this.hide();
                                }, 1000);
                            }
                        });
                    }
                });
            }
        }

        // Добавляем переключатели категорий
        const categoriesContainer = document.createElement('div');
        categoriesContainer.className = 'preset-categories';
        categoriesContainer.innerHTML = `
            <h3>Готовые цветовые схемы</h3>
            <div class="category-buttons">
                <button class="preset-category-btn active" data-category="standard">Стандартные темы</button>
                <button class="preset-category-btn" data-category="dark">Тёмные</button>
                <button class="preset-category-btn" data-category="light">Светлые</button>
                <button class="preset-category-btn" data-category="vibrant">Яркие</button>
            </div>
            <div class="preset-colors"></div>
        `;
        
        // Вставляем категории перед настройками
        const themeControls = this.modal.querySelector('.theme-controls');
        themeControls.insertBefore(categoriesContainer, themeControls.firstChild);

        // Обработчики для категорий
        this.modal.querySelectorAll('.preset-category-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                // Убираем активный класс со всех кнопок
                this.modal.querySelectorAll('.preset-category-btn').forEach(b => {
                    b.classList.remove('active');
                });
                // Добавляем активный класс текущей кнопке
                btn.classList.add('active');
                // Инициализируем пресеты для выбранной категории
                this.initPresetColors(btn.dataset.category);
            });
        });

        // Обработчики для цветов
        colorInputs.forEach(input => {
            input.addEventListener('input', () => this.updatePreview());
        });

        // Обработчики для ползунков и обновление значений
        const borderRadiusValue = this.modal.querySelector('#borderRadiusValue');
        const transparencyValue = this.modal.querySelector('#transparencyValue');
        
        rangeInputs.forEach(input => {
            const valueSpan = input.id === 'borderRadius' ? borderRadiusValue : transparencyValue;
            
            // Устанавливаем начальное значение
            valueSpan.textContent = input.value;
            
            // Обновляем значение при изменении
            input.addEventListener('input', () => {
                valueSpan.textContent = input.value;
                this.updatePreview();
            });
        });

        // Закрытие конструктора
        closeBtn.addEventListener('click', () => this.hide());

        // Сохранение темы
        saveBtn.addEventListener('click', () => this.saveTheme());

        // Экспорт темы
        exportBtn.addEventListener('click', () => this.exportTheme());

        // Импорт темы
        importBtn.addEventListener('click', () => this.importTheme());

        // Закрытие по клику вне окна
        this.modal.addEventListener('click', (e) => {
            if (e.target === this.modal) {
                this.hide();
            }
        });
    }

    validateThemeData(themeData) {
        const requiredFields = ['name', 'colors', 'options'];
        const requiredColors = ['--primary', '--accent', '--background', '--surface', '--text'];
        
        try {
            // Проверка обязательных полей
            for (const field of requiredFields) {
                if (!themeData[field]) {
                    throw new Error(`Отсутствует обязательное поле: ${field}`);
                }
            }
            
            // Проверка цветов
            for (const color of requiredColors) {
                if (!themeData.colors[color] || !/^#[0-9A-F]{6}$/i.test(themeData.colors[color])) {
                    throw new Error(`Некорректный цвет: ${color}`);
                }
            }
            
            return true;
        } catch (error) {
            console.error('Ошибка валидации темы:', error);
            showNotification(`Ошибка валидации темы: ${error.message}`, 'error');
            return false;
        }
    }

    async saveTheme() {
        try {
            const themeData = this.getCurrentThemeData();
            
            if (!this.validateThemeData(themeData)) {
                return;
            }

            // Создаем резервную копию
            const backupFileName = `${themeData.name}_${Date.now()}.json`;
            await fs.writeFile(
                path.join(this.themesBackupPath, backupFileName),
                JSON.stringify(themeData, null, 2)
            );

            // Сохраняем тему
            const themes = this.loadThemes();
            const existingThemeIndex = themes.findIndex(t => t.name === themeData.name);
            
            if (existingThemeIndex !== -1) {
                themes[existingThemeIndex] = themeData;
            } else {
                themes.push(themeData);
            }

            await fs.writeFile(
                this.themesPath,
                JSON.stringify(themes, null, 2)
            );

            // Немедленно добавляем тему в селектор и применяем её
            this.addThemeToSelector(themeData);
            
            // Активируем новую тему в селекторе
            document.querySelectorAll('.theme-btn').forEach(btn => {
                btn.classList.remove('active');
            });
            
            const themeBtn = document.querySelector(`.theme-btn[data-theme="${themeData.name.toLowerCase()}"]`);
            if (themeBtn) {
                themeBtn.classList.add('active');
                // Применяем тему
                this.applyTheme(themeData);
                // Сохраняем выбор в localStorage
                localStorage.setItem('theme', themeData.name.toLowerCase());
            }
            
            showNotification('Тема успешно сохранена и применена!', 'success');
            
            // Закрываем конструктор тем после сохранения
            setTimeout(() => {
                this.hide();
            }, 1000);
        } catch (error) {
            console.error('Ошибка сохранения темы:', error);
            showNotification('Ошибка сохранения темы', 'error');
        }
    }

    async importTheme() {
        try {
            const result = await ipcRenderer.invoke('open-file-dialog', {
                filters: [{ name: 'JSON', extensions: ['json'] }]
            });

            if (!result.canceled && result.filePaths.length > 0) {
                const themeData = JSON.parse(await fs.readFile(result.filePaths[0], 'utf8'));
                
                if (!this.validateThemeData(themeData)) {
                    return;
                }

                // Создаем резервную копию перед импортом
                const backupFileName = `imported_${themeData.name}_${Date.now()}.json`;
                await fs.writeFile(
                    path.join(this.themesBackupPath, backupFileName),
                    JSON.stringify(themeData, null, 2)
                );

                // Добавляем тему в список тем и сохраняем
                const themes = this.loadThemes();
                const existingThemeIndex = themes.findIndex(t => t.name === themeData.name);
                
                if (existingThemeIndex !== -1) {
                    // Если тема с таким именем уже существует, добавляем суффикс
                    const originalName = themeData.name;
                    themeData.name = `${originalName} (Импорт ${new Date().toLocaleDateString()})`;
                    showNotification(`Тема с именем "${originalName}" уже существует. Импортируемая тема переименована.`, 'info');
                }
                
                // Добавляем тему в список и сохраняем
                themes.push(themeData);
                await fs.writeFile(
                    this.themesPath,
                    JSON.stringify(themes, null, 2)
                );

                // Загружаем данные темы в конструктор
                this.loadThemeData(themeData);
                
                // Добавляем тему в селектор
                this.addThemeToSelector(themeData);
                
                showNotification('Тема успешно импортирована и сохранена!', 'success');
            }
        } catch (error) {
            console.error('Ошибка импорта темы:', error);
            showNotification('Ошибка импорта темы: ' + error.message, 'error');
        }
    }

    initPresetColors(category) {
        const presetContainer = this.modal.querySelector('.preset-colors');
        presetContainer.innerHTML = '';

        // Если категория - стандартные темы
        if (category === 'standard' && this.standardThemes) {
            // Получаем вычисленные стили для каждой темы
            this.standardThemes.forEach(theme => {
                // Создаем временный элемент
                const tempEl = document.createElement('div');
                document.body.appendChild(tempEl);
                tempEl.setAttribute('data-theme', theme.name);
                
                // Получаем вычисленные стили
                const style = getComputedStyle(tempEl);
                
                // Получаем цвета темы
                const colors = {
                    primary: style.getPropertyValue('--primary').trim(),
                    accent: style.getPropertyValue('--accent').trim(),
                    background: style.getPropertyValue('--background').trim(),
                    surface: style.getPropertyValue('--surface').trim(),
                    text: style.getPropertyValue('--text').trim(),
                    name: theme.displayName,
                    themeId: theme.name // Сохраняем ID темы для применения
                };
                
                // Удаляем временный элемент
                document.body.removeChild(tempEl);
                
                // Создаем кнопку пресета
                const presetBtn = document.createElement('button');
                presetBtn.className = 'preset-color-btn';
                presetBtn.innerHTML = `
                    <div class="preset-preview" style="
                        background: ${colors.background};
                        border: 1px solid ${colors.surface};
                    ">
                        <div class="preset-primary" style="background: ${colors.primary}"></div>
                        <div class="preset-accent" style="background: ${colors.accent}"></div>
                    </div>
                    <span>${theme.displayName}</span>
                `;

                presetBtn.addEventListener('click', () => {
                    // Применяем цвета к конструктору
                    this.applyPreset(colors);
                    
                    // Применяем тему к лаунчеру
                    this.applyStandardTheme(theme.name);
                });

                presetContainer.appendChild(presetBtn);
            });
            
            return;
        }

        // Для остальных категорий используем предустановленные цвета
        this.presetColors[category].forEach(preset => {
            const presetBtn = document.createElement('button');
            presetBtn.className = 'preset-color-btn';
            presetBtn.innerHTML = `
                <div class="preset-preview" style="
                    background: ${preset.background};
                    border: 1px solid ${preset.surface};
                ">
                    <div class="preset-primary" style="background: ${preset.primary}"></div>
                    <div class="preset-accent" style="background: ${preset.accent}"></div>
                </div>
                <span>${preset.name}</span>
            `;

            presetBtn.addEventListener('click', () => {
                this.applyPreset(preset);
            });

            presetContainer.appendChild(presetBtn);
        });
    }
    
    // Метод для применения стандартной темы
    applyStandardTheme(themeName) {
        // Находим кнопку темы
        const themeBtn = document.querySelector(`.theme-btn[data-theme="${themeName}"]`);
        if (!themeBtn) return;
        
        // Получаем отображаемое имя темы
        const displayName = themeBtn.querySelector('span')?.textContent || themeName;
        
        // Убираем активный класс со всех кнопок
        document.querySelectorAll('.theme-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        
        // Добавляем активный класс выбранной кнопке
        themeBtn.classList.add('active');
        
        // Создаем анимацию перехода темы
        const transitionEffect = document.createElement('div');
        transitionEffect.className = 'theme-transition-effect';
        document.body.appendChild(transitionEffect);
        
        // Удаляем элемент после завершения анимации
        setTimeout(() => {
            if (transitionEffect && transitionEffect.parentNode) {
                transitionEffect.parentNode.removeChild(transitionEffect);
            }
        }, 500);
        
        // Очищаем стили пользовательской темы
        this.clearCustomThemeStyles();
        
        // Удаляем признак использования пользовательской темы
        document.documentElement.removeAttribute('data-using-custom-theme');
        
        // Применяем тему через атрибут data-theme
        document.documentElement.setAttribute('data-theme', themeName);
        
        // Сохраняем выбор в localStorage и сбрасываем флаг пользовательской темы
        localStorage.setItem('theme', themeName);
        localStorage.removeItem('isCustomTheme');
        
        // Показываем уведомление
        showNotification(`Тема "${displayName}" применена!`, 'success');
    }

    applyPreset(preset) {
        // Применяем цвета из пресета
        const colorInputs = this.modal.querySelectorAll('input[type="color"]');
        colorInputs.forEach(input => {
            const varName = input.dataset.var.replace('--', '');
            if (preset[varName]) {
                input.value = preset[varName];
            }
        });
        
        // Устанавливаем имя темы, если оно не было задано
        const themeName = this.modal.querySelector('#themeName');
        if (!themeName.value.trim() && preset.name) {
            themeName.value = `Моя ${preset.name}`;
        }
        
        this.updatePreview();
    }

    updatePreview() {
        const preview = this.modal.querySelector('.theme-preview-window');
        const colors = {};
        
        this.modal.querySelectorAll('input[type="color"]').forEach(input => {
            colors[input.dataset.var] = input.value;
        });

        const borderRadius = this.modal.querySelector('#borderRadius').value;
        const transparency = this.modal.querySelector('#transparency').value;

        const style = `
            --preview-primary: ${colors['--primary']};
            --preview-accent: ${colors['--accent']};
            --preview-background: ${colors['--background']};
            --preview-surface: ${colors['--surface']};
            --preview-text: ${colors['--text']};
            --preview-border-radius: ${borderRadius}px;
            --preview-transparency: ${transparency}%;
        `;

        preview.setAttribute('style', style);
    }

    loadCurrentTheme() {
        const currentTheme = document.documentElement.getAttribute('data-theme');
        const computedStyle = getComputedStyle(document.documentElement);

        this.modal.querySelectorAll('input[type="color"]').forEach(input => {
            const varName = input.dataset.var;
            const color = computedStyle.getPropertyValue(varName).trim();
            input.value = this.rgbToHex(color);
        });

        // Загружаем дополнительные настройки
        const savedTheme = JSON.parse(localStorage.getItem('currentTheme') || '{}');
        if (savedTheme.options) {
            const borderRadius = this.modal.querySelector('#borderRadius');
            const transparency = this.modal.querySelector('#transparency');
            if (borderRadius) borderRadius.value = savedTheme.options.borderRadius || 8;
            if (transparency) transparency.value = savedTheme.options.transparency || 95;
        }

        this.updatePreview();
    }

    getCurrentThemeData() {
        const themeName = this.modal.querySelector('#themeName').value || 'Моя тема';
        
        const themeData = {
            name: themeName,
            category: 'custom',
            version: '1.0',
            colors: {},
            options: {
                borderRadius: parseInt(this.modal.querySelector('#borderRadius').value),
                transparency: parseInt(this.modal.querySelector('#transparency').value)
            }
        };

        this.modal.querySelectorAll('input[type="color"]').forEach(input => {
            themeData.colors[input.dataset.var] = input.value;
        });

        return themeData;
    }

    rgbToHex(rgb) {
        // Конвертация RGB в HEX
        const rgbValues = rgb.match(/\d+/g);
        if (!rgbValues) return '#000000';
        
        const r = parseInt(rgbValues[0]);
        const g = parseInt(rgbValues[1]);
        const b = parseInt(rgbValues[2]);
        
        return '#' + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
    }

    addThemeToSelector(themeData) {
        // Проверяем, существует ли уже такая тема в селекторе
        const existingBtn = document.querySelector(`.theme-btn[data-theme="${themeData.name.toLowerCase()}"]`);
        
        if (existingBtn) {
            // Обновляем существующую кнопку
            const themePreview = existingBtn.querySelector('.theme-preview');
            themePreview.style.background = `linear-gradient(135deg, ${themeData.colors['--primary']}, ${themeData.colors['--accent']})`;
            return;
        }
        
        // Создаем новую кнопку для темы
        const themeBtn = document.createElement('button');
        themeBtn.className = 'theme-btn';
        themeBtn.dataset.theme = themeData.name.toLowerCase();
        themeBtn.dataset.type = 'custom'; // Помечаем как пользовательскую тему
        
        // Создаем превью темы
        const preview = document.createElement('div');
        preview.className = 'theme-preview';
        preview.style.background = `linear-gradient(135deg, ${themeData.colors['--primary']}, ${themeData.colors['--accent']})`;
        
        // Добавляем название и иконку
        const icon = document.createElement('i');
        icon.className = 'fas fa-paint-brush';
        
        const name = document.createElement('span');
        name.textContent = themeData.name;
        
        // Собираем все вместе
        themeBtn.appendChild(preview);
        themeBtn.appendChild(icon);
        themeBtn.appendChild(name);
        
        // Добавляем обработчик события
        themeBtn.addEventListener('click', () => {
            // Убираем активную тему
            document.querySelectorAll('.theme-btn').forEach(btn => {
                btn.classList.remove('active');
            });
            
            // Устанавливаем новую активную тему
            themeBtn.classList.add('active');
            
            // Применяем тему
            this.applyTheme(themeData);
            
            // Сохраняем выбор в localStorage
            localStorage.setItem('theme', themeData.name.toLowerCase());
        });
        
        // Добавляем кнопку в селектор тем
        const themeSelector = document.querySelector('.theme-selector');
        if (themeSelector) {
            themeSelector.appendChild(themeBtn);
        }
    }

    applyTheme(themeData) {
        try {
            // Обновляем все CSS переменные
            const root = document.documentElement;
            
            // Запоминаем текущую тему перед изменением для возможности отката
            const previousTheme = root.getAttribute('data-theme');
            
            // Основные цвета
            root.style.setProperty('--primary', themeData.colors['--primary']);
            root.style.setProperty('--primary-dark', this.adjustColor(themeData.colors['--primary'], -20));
            root.style.setProperty('--primary-light', this.adjustColor(themeData.colors['--primary'], 20));
            root.style.setProperty('--accent', themeData.colors['--accent']);
            root.style.setProperty('--background', themeData.colors['--background']);
            root.style.setProperty('--surface', themeData.colors['--surface']);
            root.style.setProperty('--surface-light', this.adjustColor(themeData.colors['--surface'], 20));
            root.style.setProperty('--surface-extra-light', this.adjustColor(themeData.colors['--surface'], 40));
            root.style.setProperty('--text', themeData.colors['--text']);
            
            // RGB значения для эффектов
            const primaryRGB = this.hexToRGB(themeData.colors['--primary']);
            const accentRGB = this.hexToRGB(themeData.colors['--accent']);
            root.style.setProperty('--primary-rgb', primaryRGB);
            root.style.setProperty('--accent-rgb', accentRGB);
            
            // Градиенты
            root.style.setProperty('--gradient', `linear-gradient(135deg, ${themeData.colors['--primary']}, ${themeData.colors['--accent']})`);
            root.style.setProperty('--background-gradient', `
                radial-gradient(circle at top left, rgba(${primaryRGB}, 0.08), transparent 40%),
                radial-gradient(circle at bottom right, rgba(${accentRGB}, 0.08), transparent 40%)
            `);
            
            // Дополнительные настройки
            if (themeData.options) {
                root.style.setProperty('--border-radius-md', `${themeData.options.borderRadius}px`);
                root.style.setProperty('--surface-opacity', `${themeData.options.transparency}%`);
            }

            // Обновляем все элементы UI для согласованности внешнего вида
            this.updateUIElements(themeData);

            // Создаем анимацию перехода темы
            const transitionEffect = document.createElement('div');
            transitionEffect.className = 'theme-transition-effect';
            document.body.appendChild(transitionEffect);
            
            // Удаляем элемент после завершения анимации
            setTimeout(() => {
                if (transitionEffect && transitionEffect.parentNode) {
                    transitionEffect.parentNode.removeChild(transitionEffect);
                }
            }, 500);

            // Помечаем документ как использующий пользовательскую тему
            root.setAttribute('data-using-custom-theme', 'true');

            // Если это пользовательская тема, то сохраняем ее как текущую и меняем активные кнопки
            if (themeData.name) {
                // Сохраняем полные данные темы для восстановления при перезагрузке
                localStorage.setItem('currentCustomTheme', JSON.stringify(themeData));
                
                // Найдем и активируем кнопку пользовательской темы, если она есть
                const customThemeBtn = document.querySelector(`.theme-btn[data-theme="${themeData.name.toLowerCase()}"]`);
                if (customThemeBtn) {
                    document.querySelectorAll('.theme-btn').forEach(btn => {
                        btn.classList.remove('active');
                    });
                    customThemeBtn.classList.add('active');
                }
                
                // Сохраняем выбор в localStorage с пометкой, что это пользовательская тема
                localStorage.setItem('theme', themeData.name.toLowerCase());
                localStorage.setItem('isCustomTheme', 'true');
                
                // Обновляем тему в файле, если это пользовательская тема
                if (themeData.category === 'custom') {
                    // Асинхронно обновляем файл, не блокируя основной поток
                    (async () => {
                        try {
                            const themes = this.loadThemes();
                            const existingThemeIndex = themes.findIndex(t => t.name === themeData.name);
                            
                            if (existingThemeIndex !== -1) {
                                themes[existingThemeIndex] = themeData;
                                await this.syncThemesToFile(themes);
                            }
                        } catch (error) {
                            console.error('Ошибка обновления темы в файле:', error);
                        }
                    })();
                }
                
                // Показываем уведомление
                showNotification(`Тема "${themeData.name}" применена!`, 'success');
            }
            
            return true;
        } catch (error) {
            console.error('Ошибка применения темы:', error);
            showNotification('Ошибка применения темы. Проверьте консоль для деталей.', 'error');
            return false;
        }
    }

    adjustColor(hex, percent) {
        // Функция для осветления/затемнения цвета
        let R = parseInt(hex.substring(1,3), 16);
        let G = parseInt(hex.substring(3,5), 16);
        let B = parseInt(hex.substring(5,7), 16);

        R = parseInt(R * (100 + percent) / 100);
        G = parseInt(G * (100 + percent) / 100);
        B = parseInt(B * (100 + percent) / 100);

        R = (R < 255) ? R : 255;
        G = (G < 255) ? G : 255;
        B = (B < 255) ? B : 255;

        const RR = ((R.toString(16).length === 1) ? "0" + R.toString(16) : R.toString(16));
        const GG = ((G.toString(16).length === 1) ? "0" + G.toString(16) : G.toString(16));
        const BB = ((B.toString(16).length === 1) ? "0" + B.toString(16) : B.toString(16));

        return "#" + RR + GG + BB;
    }

    hexToRGB(hex) {
        const r = parseInt(hex.slice(1, 3), 16);
        const g = parseInt(hex.slice(3, 5), 16);
        const b = parseInt(hex.slice(5, 7), 16);
        return `${r}, ${g}, ${b}`;
    }

    loadThemes() {
        try {
            if (fs.existsSync(this.themesPath)) {
                const data = fs.readFileSync(this.themesPath, 'utf8');
                return JSON.parse(data);
            } else {
                // Создаем пустой файл тем, если он не существует
                fs.writeFileSync(this.themesPath, JSON.stringify([], null, 2));
                return [];
            }
        } catch (err) {
            console.error('Ошибка загрузки тем:', err);
            this.initializeThemeStorage(); // Пытаемся инициализировать хранилище
        }
        return [];
    }

    exportTheme() {
        try {
            const themeData = this.getCurrentThemeData();
            
            if (!this.validateThemeData(themeData)) {
                return;
            }
            
            const dataStr = JSON.stringify(themeData, null, 2);
            const dataUri = 'data:application/json;charset=utf-8,' + encodeURIComponent(dataStr);
            
            const exportLink = document.createElement('a');
            exportLink.setAttribute('href', dataUri);
            
            // Форматируем дату для имени файла
            const now = new Date();
            const dateStr = `${now.getFullYear()}-${(now.getMonth()+1).toString().padStart(2, '0')}-${now.getDate().toString().padStart(2, '0')}`;
            
            // Формируем безопасное имя файла
            const safeThemeName = themeData.name.replace(/[^\w\s-]/gi, '_');
            exportLink.setAttribute('download', `${safeThemeName}_${dateStr}.json`);
            exportLink.click();
            
            showNotification('Тема успешно экспортирована', 'success');
        } catch (error) {
            console.error('Ошибка экспорта темы:', error);
            showNotification('Ошибка экспорта темы: ' + error.message, 'error');
        }
    }

    loadThemeData(themeData) {
        this.modal.querySelector('#themeName').value = themeData.name;
        
        Object.entries(themeData.colors).forEach(([variable, value]) => {
            const input = this.modal.querySelector(`input[data-var="${variable}"]`);
            if (input) input.value = value;
        });

        if (themeData.options) {
            const { borderRadius, transparency } = themeData.options;
            if (borderRadius) this.modal.querySelector('#borderRadius').value = borderRadius;
            if (transparency) this.modal.querySelector('#transparency').value = transparency;
        }

        this.updatePreview();
    }

    // Добавляем метод для синхронизации тем с файлом
    async syncThemesToFile(themes) {
        try {
            // Убеждаемся, что директории существуют
            await this.initializeThemeStorage();
            
            // Сохраняем темы в файл
            await fs.writeFile(
                this.themesPath,
                JSON.stringify(themes || [], null, 2)
            );
            
            return true;
        } catch (error) {
            console.error('Ошибка синхронизации тем с файлом:', error);
            showNotification('Ошибка сохранения тем', 'error');
            return false;
        }
    }

    // Добавляем метод для удаления темы
    async deleteTheme(themeName) {
        try {
            if (!themeName) return false;
            
            // Загружаем существующие темы
            const themes = this.loadThemes();
            const themeIndex = themes.findIndex(t => t.name.toLowerCase() === themeName.toLowerCase());
            
            if (themeIndex === -1) {
                showNotification(`Тема "${themeName}" не найдена`, 'error');
                return false;
            }
            
            // Делаем резервную копию перед удалением
            const themeToDelete = themes[themeIndex];
            const backupFileName = `deleted_${themeToDelete.name}_${Date.now()}.json`;
            await fs.writeFile(
                path.join(this.themesBackupPath, backupFileName),
                JSON.stringify(themeToDelete, null, 2)
            );
            
            // Удаляем тему из массива
            themes.splice(themeIndex, 1);
            
            // Сохраняем обновленный массив тем
            const result = await this.syncThemesToFile(themes);
            
            if (result) {
                // Удаляем кнопку темы из селектора
                const themeBtn = document.querySelector(`.theme-btn[data-theme="${themeName.toLowerCase()}"]`);
                if (themeBtn) {
                    themeBtn.remove();
                }
                
                // Если была активна удаленная тема, переключаемся на дефолтную
                const currentTheme = localStorage.getItem('theme');
                if (currentTheme && currentTheme.toLowerCase() === themeName.toLowerCase()) {
                    // Переключаемся на дефолтную тему
                    localStorage.setItem('theme', 'amethyst');
                    document.documentElement.setAttribute('data-theme', 'amethyst');
                    
                    // Активируем кнопку дефолтной темы
                    const defaultThemeBtn = document.querySelector('.theme-btn[data-theme="amethyst"]');
                    if (defaultThemeBtn) {
                        document.querySelectorAll('.theme-btn').forEach(btn => {
                            btn.classList.remove('active');
                        });
                        defaultThemeBtn.classList.add('active');
                    }
                }
                
                showNotification(`Тема "${themeName}" удалена`, 'success');
                return true;
            }
            
            return false;
        } catch (error) {
            console.error('Ошибка удаления темы:', error);
            showNotification('Ошибка удаления темы', 'error');
            return false;
        }
    }

    // Метод для очистки стилей пользовательской темы
    clearCustomThemeStyles() {
        // Удаляем все инлайн-стили, которые могли быть добавлены пользовательской темой
        document.documentElement.removeAttribute('style');
        
        // Убираем потенциальные классы пользовательской темы
        document.documentElement.classList.remove('custom-theme');
        
        // Очищаем стили для элементов интерфейса
        const elementsToReset = [
            '.notification', 
            '.news-card', 
            '.server-card', 
            '.news-overlay',
            '.news-date',
            '.toggle-slider',
            '.settings-content',
            '.theme-constructor-content',
            '.news-excerpt a'
        ];
        
        elementsToReset.forEach(selector => {
            const elements = document.querySelectorAll(selector);
            elements.forEach(element => {
                element.removeAttribute('style');
                
                // Удаляем обработчики событий для ссылок, клонируя и заменяя элемент
                if (selector === '.news-excerpt a') {
                    const clone = element.cloneNode(true);
                    
                    // Добавляем обработчик только для открытия ссылки в браузере
                    clone.addEventListener('click', (e) => {
                        e.preventDefault();
                        const url = clone.getAttribute('href');
                        if (url) {
                            shell.openExternal(url);
                            showNotification(`Открываю ссылку в браузере: ${url}`, 'info');
                        }
                    });
                    
                    element.parentNode.replaceChild(clone, element);
                }
            });
        });
        
        // Удаляем все динамически добавленные стили для ползунков и ссылок
        const dynamicStyles = document.querySelectorAll('style');
        dynamicStyles.forEach(style => {
            if (style.textContent.includes('input[type="range"]::-webkit-slider-thumb') ||
                style.textContent.includes('.news-excerpt a::after')) {
                style.remove();
            }
        });
        
        console.log('Очищены стили пользовательской темы и элементов интерфейса');
    }
    
    // Проверка, является ли тема стандартной
    isStandardTheme(themeName) {
        if (!themeName || !this.standardThemes) return false;
        
        return this.standardThemes.some(theme => 
            theme.name.toLowerCase() === themeName.toLowerCase()
        );
    }

    // Метод для обновления всех элементов UI при применении пользовательской темы
    updateUIElements(themeData) {
        // Обновляем цвета уведомлений
        const notifications = document.querySelectorAll('.notification');
        const newsCards = document.querySelectorAll('.news-card');
        const serverCards = document.querySelectorAll('.server-card');
        const newsOverlays = document.querySelectorAll('.news-overlay');
        const settingsModals = document.querySelectorAll('.settings-modal, .theme-constructor-modal');
        const soundToggles = document.querySelectorAll('.toggle-slider');
        const links = document.querySelectorAll('.news-excerpt a');
        
        // Цвета из темы
        const primary = themeData.colors['--primary'];
        const accent = themeData.colors['--accent'];
        const background = themeData.colors['--background'];
        const surface = themeData.colors['--surface'];
        
        // Обновляем цвета для новостей
        newsCards.forEach(card => {
            card.style.borderColor = primary;
            const overlay = card.querySelector('.news-overlay');
            if (overlay) {
                overlay.style.background = `linear-gradient(to top, ${background}ee 20%, ${background}aa 60%, transparent 100%)`;
            }
            const date = card.querySelector('.news-date');
            if (date) {
                date.style.color = primary;
            }
        });
        
        // Обновляем цвета для ссылок
        links.forEach(link => {
            link.style.color = primary;
           
            // Добавляем обработчики для анимации при наведении
            link.addEventListener('mouseenter', () => {
                link.style.color = accent;
                link.style.textDecoration = 'underline';
            });
            
            link.addEventListener('mouseleave', () => {
                link.style.color = primary;
                link.style.textDecoration = 'none';
            });
            
            // Добавляем обработчик клика для открытия ссылки в браузере
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const url = link.getAttribute('href');
                if (url) {
                    shell.openExternal(url);
                    showNotification(`Открываю ссылку в браузере: ${url}`, 'info');
                }
            });
            
            // Добавляем стили для подчеркивания
            const style = document.createElement('style');
            style.textContent = `
                .news-excerpt a::after {
                    background: ${primary} !important;
                }
                .news-excerpt a:hover::after {
                    background: ${accent} !important;
                }
            `;
            document.head.appendChild(style);
        });
        
        // Обновляем цвета для серверов
        serverCards.forEach(card => {
            card.style.borderColor = primary;
        });
        
        // Обновляем цвета для модальных окон
        settingsModals.forEach(modal => {
            if (modal.querySelector('.settings-content, .theme-constructor-content')) {
                const content = modal.querySelector('.settings-content, .theme-constructor-content');
                content.style.borderColor = primary;
            }
        });
        
        // Обновляем цвета для переключателей
        soundToggles.forEach(toggle => {
            toggle.style.backgroundColor = surface;
        });
        
        // Если есть элементы громкости, обновляем их
        const volumeSliders = document.querySelectorAll('input[type="range"]');
        volumeSliders.forEach(slider => {
            // Стилизуем бегунок (thumb)
            const style = document.createElement('style');
            style.textContent = `
                input[type="range"]::-webkit-slider-thumb {
                    background: ${primary} !important;
                    border: 2px solid ${accent} !important;
                }
            `;
            document.head.appendChild(style);
        });
        
        console.log('UI элементы обновлены в соответствии с пользовательской темой');
    }
}

// Инициализация конструктора тем
const themeConstructor = new ThemeConstructor();

// Привязываем кнопку открытия конструктора
document.querySelector('.custom-theme-btn').addEventListener('click', () => {
    themeConstructor.show();
});

// Добавляем настройку звука в настройки
const soundSection = document.createElement('div');
soundSection.className = 'settings-section';
soundSection.innerHTML = `
    <h3>Звуковые эффекты</h3>
    <div class="sound-controls">
        <div class="toggle-setting">
            <label class="toggle">
                <input type="checkbox" id="enableSounds" checked>
                <span class="toggle-slider"></span>
            </label>
            <span>Звуки уведомлений</span>
        </div>
        <div class="volume-control">
            <label>Громкость</label>
            <input type="range" id="soundVolume" min="0" max="100" value="50">
        </div>
    </div>
`;

// Добавляем секцию звука в настройки
document.querySelector('.settings-body').insertBefore(soundSection, document.querySelector('.settings-body').firstChild);

// Обработчики настроек звука
const enableSoundsToggle = document.getElementById('enableSounds');
const soundVolumeSlider = document.getElementById('soundVolume');

// Загружаем сохраненные настройки звука
const soundEnabled = localStorage.getItem('soundEnabled') !== 'false';
const soundVolume = localStorage.getItem('soundVolume') || 50;

enableSoundsToggle.checked = soundEnabled;
soundVolumeSlider.value = soundVolume;

// Обновляем настройки звука при изменении
enableSoundsToggle.addEventListener('change', () => {
    const enabled = enableSoundsToggle.checked;
    localStorage.setItem('soundEnabled', enabled);
    achievementsUI.achievementSound.muted = !enabled;
});

soundVolumeSlider.addEventListener('input', () => {
    const volume = soundVolumeSlider.value / 100;
    localStorage.setItem('soundVolume', soundVolumeSlider.value);
    achievementsUI.achievementSound.volume = volume;
});

// Применяем начальные настройки звука
achievementsUI.achievementSound.muted = !soundEnabled;
achievementsUI.achievementSound.volume = soundVolume / 100;

// Инициализация при загрузке приложения
document.addEventListener('DOMContentLoaded', () => {    
    // Загружаем и инициализируем пользовательские темы
    initializeThemes(window.themeConstructor);
    
    // Обработчик для кнопки открытия конструктора тем
    document.querySelector('.open-theme-constructor')?.addEventListener('click', () => {
        window.themeConstructor.show();
    });
    
    // Инициализируем обработку звуковых настроек
    initSoundControls();
    
    // Показываем прелоадер
    const preloader = document.querySelector('.preloader');
    if (preloader) {
        setTimeout(() => {
            preloader.classList.add('fade-out');
            setTimeout(() => {
                preloader.style.display = 'none';
                document.body.classList.add('loaded');
                
                // Показываем уведомление о первом запуске, если это первый запуск
                if (!localStorage.getItem('firstLaunch')) {
                    showNotification('Добро пожаловать в Harmony Launcher!', 'success', 5000);
                    localStorage.setItem('firstLaunch', 'true');
                    
                    // Добавляем достижение за первый запуск
                    addAchievement('first_launch', 'Первый запуск', 'Вы запустили лаунчер впервые', 'common');
                }
            }, 300);
        }, 1000);
    }

    // Кнопка сброса достижений
    document.querySelector('.reset-achievements')?.addEventListener('click', () => {
        // Показываем модальное окно подтверждения
        const modal = document.getElementById('confirmationModal');
        const confirmText = document.getElementById('confirmationText');
        
        if (modal && confirmText) {
            confirmText.textContent = 'Вы уверены, что хотите сбросить все достижения? Это действие нельзя отменить.';
            modal.setAttribute('data-action', 'reset-achievements');
            modal.classList.add('show');
        }
    });
    
    // Обработчик подтверждения действий
    document.getElementById('confirmAction')?.addEventListener('click', () => {
        const modal = document.getElementById('confirmationModal');
        const action = modal.getAttribute('data-action');
        
        if (action === 'reset-achievements') {
            // Удаляем все достижения из localStorage
            localStorage.removeItem('achievements');
            // Скрываем модальное окно
            modal.classList.remove('show');
            // Показываем уведомление
            showNotification('Все достижения сброшены!', 'success');
            
            // Сбрасываем флаг первого запуска, чтобы показать уведомление о первом запуске
            localStorage.removeItem('firstLaunch');
            
            // Показываем уведомление о первом запуске
            setTimeout(() => {
                showNotification('Добро пожаловать в Harmony Launcher!', 'success', 5000);
                localStorage.setItem('firstLaunch', 'true');
                
                // Добавляем достижение за первый запуск
                addAchievement('first_launch', 'Первый запуск', 'Вы запустили лаунчер впервые', 'common');
            }, 1500);
            
            // Обновляем список достижений в UI
            updateAchievementsUI();
        }
    });
    
    // Обработчик отмены действия
    document.getElementById('cancelAction')?.addEventListener('click', () => {
        // Скрываем модальное окно
        document.getElementById('confirmationModal').classList.remove('show');
    });
    
    // Инициализируем достижения
    initializeAchievements();
    
    // Если применена пользовательская тема, обновляем элементы управления звуком
    if (localStorage.getItem('isCustomTheme') === 'true') {
        updateSoundControlsForCustomTheme();
    }
});

// Функция для инициализации звуковых настроек
function initSoundControls() {
    const enableSoundsToggle = document.getElementById('enableSounds');
    const soundVolumeSlider = document.getElementById('soundVolume');
    
    if (!enableSoundsToggle || !soundVolumeSlider) return;
    
    // Загружаем сохраненные настройки звука
    const soundEnabled = localStorage.getItem('soundEnabled') !== 'false';
    const soundVolume = localStorage.getItem('soundVolume') || 50;

    enableSoundsToggle.checked = soundEnabled;
    soundVolumeSlider.value = soundVolume;

    // Обновляем настройки звука при изменении
    enableSoundsToggle.addEventListener('change', () => {
        const enabled = enableSoundsToggle.checked;
        localStorage.setItem('soundEnabled', enabled);
        achievementsUI.achievementSound.muted = !enabled;
    });

    soundVolumeSlider.addEventListener('input', () => {
        const volume = soundVolumeSlider.value / 100;
        localStorage.setItem('soundVolume', soundVolumeSlider.value);
        achievementsUI.achievementSound.volume = volume;
    });

    // Применяем начальные настройки звука
    achievementsUI.achievementSound.muted = !soundEnabled;
    achievementsUI.achievementSound.volume = soundVolume / 100;
}

// Функция для обновления элементов управления звуком при применении пользовательской темы
function updateSoundControlsForCustomTheme() {
    const savedCustomThemeData = localStorage.getItem('currentCustomTheme');
    if (!savedCustomThemeData) return;
    
    try {
        const customThemeData = JSON.parse(savedCustomThemeData);
        
        // Применяем стили к элементам управления звуком
        window.themeConstructor.updateUIElements(customThemeData);
    } catch (error) {
        console.error('Ошибка применения пользовательской темы к элементам управления звуком:', error);
    }
}

// Функция для инициализации тем из localStorage и файла
function initializeThemes(themeConstructor) {
    // Загружаем темы из файла
    const themes = themeConstructor.loadThemes();
    const themeSelector = document.querySelector('.theme-selector');
    
    if (!themeSelector) return;
    
    // Используем существующие темы из HTML вместо удаления и пересоздания
    // Создаем список стандартных тем для доступа из конструктора
    const standardThemes = [];
    
    // Собираем данные о стандартных темах из существующих кнопок
    themeSelector.querySelectorAll('.theme-btn').forEach(btn => {
        const theme = {
            name: btn.dataset.theme,
            displayName: btn.querySelector('span').textContent,
            buttonElement: btn
        };
        standardThemes.push(theme);
        
        // Обновляем обработчик события для стандартных тем
        btn.addEventListener('click', () => {
            // Убираем активную тему со всех кнопок
            document.querySelectorAll('.theme-btn').forEach(b => {
                b.classList.remove('active');
            });
            
            // Устанавливаем новую активную тему
            btn.classList.add('active');
            
            // Очищаем стили пользовательской темы
            themeConstructor.clearCustomThemeStyles();
            
            // Применяем тему через атрибут
            document.documentElement.setAttribute('data-theme', theme.name);
            
            // Сохраняем выбор в localStorage
            localStorage.setItem('theme', theme.name);
            localStorage.removeItem('isCustomTheme');
        });
    });
    
    // Если в localStorage есть выбранная тема, применяем её
    let savedTheme = localStorage.getItem('theme');
    const isCustomTheme = localStorage.getItem('isCustomTheme') === 'true';
    const savedCustomThemeData = localStorage.getItem('currentCustomTheme');

    // Если нет сохраненной темы, устанавливаем по умолчанию
    if (!savedTheme) {
        savedTheme = 'amethyst'; // Или любая другая тема по умолчанию
        localStorage.setItem('theme', savedTheme);
    }
    
    // Если была сохранена пользовательская тема, восстанавливаем её
    if (isCustomTheme && savedCustomThemeData) {
        try {
            const customThemeData = JSON.parse(savedCustomThemeData);
            console.log('Восстанавливаем пользовательскую тему:', customThemeData.name);
            
            // Добавляем тему в селектор, если её там ещё нет
            themeConstructor.addThemeToSelector(customThemeData);
            
            // Применяем сохраненную пользовательскую тему
            themeConstructor.applyTheme(customThemeData);
            
            // Устанавливаем активную кнопку
            const customThemeBtn = themeSelector.querySelector(`.theme-btn[data-theme="${customThemeData.name.toLowerCase()}"]`);
            if (customThemeBtn) {
                themeSelector.querySelectorAll('.theme-btn').forEach(btn => {
                    btn.classList.remove('active');
                });
                customThemeBtn.classList.add('active');
            }
        } catch (error) {
            console.error('Ошибка восстановления пользовательской темы:', error);
            
            // В случае ошибки применяем стандартную тему
            savedTheme = 'amethyst';
            localStorage.setItem('theme', savedTheme);
            document.documentElement.setAttribute('data-theme', savedTheme);
        }
    } else if (savedTheme) {
        // Проверяем, является ли тема стандартной
        const isStandardTheme = standardThemes.some(t => t.name === savedTheme);
        
        // Находим кнопку темы
        const themeBtn = themeSelector.querySelector(`.theme-btn[data-theme="${savedTheme}"]`);
        
        if (themeBtn && !themeBtn.classList.contains('active')) {
            // Убираем активную тему со всех кнопок
            themeSelector.querySelectorAll('.theme-btn').forEach(btn => {
                btn.classList.remove('active');
            });
            
            // Устанавливаем новую активную тему
            themeBtn.classList.add('active');
            
            // Если это стандартная тема, очищаем стили пользовательской темы
            if (isStandardTheme) {
                themeConstructor.clearCustomThemeStyles();
            }
            
            // Применяем тему
            document.documentElement.setAttribute('data-theme', savedTheme);
        }
    }
    
    // Добавляем пользовательские темы из файла в селектор
    if (themes && themes.length > 0) {
        themes.forEach(theme => {
            if (theme && theme.name) {
                // Если тема не является текущей пользовательской темой
                if (!isCustomTheme || theme.name.toLowerCase() !== savedTheme.toLowerCase()) {
                    themeConstructor.addThemeToSelector(theme);
                }
            }
        });
        console.log(`Загружено ${themes.length} пользовательских тем`);
    } else {
        console.log('Пользовательские темы не найдены');
    }
    
    // Сохраняем список стандартных тем в конструкторе для использования
    themeConstructor.standardThemes = standardThemes;
}

// Применяем начальные настройки звука
achievementsUI.achievementSound.muted = !soundEnabled;
achievementsUI.achievementSound.volume = soundVolume / 100; 

// Инициализация конструктора тем
window.themeConstructor = new ThemeConstructor();

// Привязываем кнопку открытия конструктора
document.querySelector('.custom-theme-btn').addEventListener('click', () => {
    window.themeConstructor.show();
});