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
    if (['1.21.5', '1.20.6', '1.19.4', '1.18.2', '1.16.5', '1.12.2', '1.8.9', '1.7.10'].includes(version)) {
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
        
        if (!process) {
            throw new Error('Не удалось создать процесс Minecraft');
        }

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
    const containerId = 'notification-container';
    let container = document.getElementById(containerId);
    if (!container) {
        container = document.createElement('div');
        container.id = containerId;
        container.className = 'notification-container';
        document.body.appendChild(container);
    }

    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    const icon = document.createElement('i');
    icon.className = `fas ${getNotificationIcon(type)} notification-icon`;
    const text = document.createElement('span');
    text.innerHTML = message.replace(/\n/g, '<br>'); // Allow newlines in notifications

    notification.appendChild(icon);
    notification.appendChild(text);
    container.appendChild(notification);

    requestAnimationFrame(() => notification.classList.add('show'));

    setTimeout(() => {
        notification.classList.remove('show');
        notification.addEventListener('transitionend', () => notification.remove(), { once: true });
    }, type === 'error' ? 8000 : 4000); // Show errors longer
}

function getNotificationIcon(type) {
    switch (type) {
        case 'success': return 'fa-check-circle';
        case 'error': return 'fa-exclamation-circle';
        case 'warning': return 'fa-exclamation-triangle';
        default: return 'fa-info-circle';
    }
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
    if (enableNotifications) {
        originalShowNotification(message, type);
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