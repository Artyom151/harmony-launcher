const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const Store = require('electron-store');
const fs = require('fs-extra');
const { Client } = require('minecraft-launcher-core');
const store = new Store();
const launcher = new Client();

let mainWindow;

// Попытка отключить аппаратное ускорение, если есть проблемы с GPU
// app.disableHardwareAcceleration(); // Вариант 1: Глобальное отключение (можно раскомментировать для теста)

function createWindow() {
    mainWindow = new BrowserWindow({
        width: 1280,
        height: 720,
        minWidth: 1024,
        minHeight: 600,
        frame: false,
        backgroundColor: '#0b1120',
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false,
            enableRemoteModule: true,
            webSecurity: false,
            additionalArguments: ['--allow-file-access-from-files']
        },
        icon: path.join(__dirname, 'assets/images/icon_og.jpg'),
        title: 'Harmony Launcher - Майнкрафт лаунчер нового поколения'
    });

    mainWindow.loadFile('index.html');
    
    // Обработка ошибок рендера
    mainWindow.webContents.on('render-process-gone', (event, details) => {
        console.error('Renderer process gone:', details);
        if (details.reason !== 'clean-exit') {
            createWindow();
        }
    });

    // Открываем инструменты разработчика в процессе разработки
    // mainWindow.webContents.openDevTools();

    // Обработка закрытия окна
    mainWindow.on('closed', function () {
        mainWindow = null;
    });
}

// Отключаем предупреждения безопасности для разработки
process.env.ELECTRON_DISABLE_SECURITY_WARNINGS = 'true';

// Настройка оптимальных параметров запуска
app.allowRendererProcessReuse = false;
app.commandLine.appendSwitch('disable-gpu');
app.commandLine.appendSwitch('disable-software-rasterizer');
app.commandLine.appendSwitch('no-sandbox');
app.commandLine.appendSwitch('ignore-certificate-errors');
app.commandLine.appendSwitch('allow-file-access-from-files');
app.commandLine.appendSwitch('disable-web-security');

// Инициализация при запуске
app.on('ready', async () => {
    try {
        // Создаем директорию для файлов Minecraft если её нет
        const mcPath = path.join(app.getPath('userData'), '.iceberg-minecraft');
        await fs.ensureDir(mcPath);
        process.env.MINECRAFT_ROOT = mcPath;
        
        console.log('Minecraft path:', mcPath);
        createWindow();
    } catch (error) {
        console.error('Error during initialization:', error);
    }
});

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});

app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
        createWindow();
    }
});

// Обработчики IPC для взаимодействия с окном
ipcMain.on('minimize-window', () => {
    if (mainWindow) mainWindow.minimize();
});

ipcMain.on('maximize-window', () => {
    if (mainWindow) {
        if (mainWindow.isMaximized()) {
            mainWindow.unmaximize();
        } else {
            mainWindow.maximize();
        }
    }
});

ipcMain.on('close-window', () => {
    if (mainWindow) mainWindow.close();
}); 