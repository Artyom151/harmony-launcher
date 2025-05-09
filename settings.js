const path = require('path');
const os = require('os');

// Настройки по умолчанию
const defaultSettings = {
    memory: {
        min: "2G",
        max: "4G"
    },
    javaPath: "",
    gameDir: path.join(os.homedir(), 'AppData', 'Roaming', '.minecraft'),
    launch: {
        autoClose: false,
        minimizeOnLaunch: true
    }
};

class Settings {
    constructor() {
        this.settings = this.loadSettings();
    }

    loadSettings() {
        try {
            const savedSettings = localStorage.getItem('launcher-settings');
            if (savedSettings) {
                return { ...defaultSettings, ...JSON.parse(savedSettings) };
            }
        } catch (err) {
            console.error('Ошибка загрузки настроек:', err);
        }
        return { ...defaultSettings };
    }

    saveSettings() {
        try {
            localStorage.setItem('launcher-settings', JSON.stringify(this.settings));
            return true;
        } catch (err) {
            console.error('Ошибка сохранения настроек:', err);
            return false;
        }
    }

    get(key) {
        return this.settings[key];
    }

    set(key, value) {
        this.settings[key] = value;
        this.saveSettings();
    }

    setMemory(min, max) {
        this.settings.memory = { min, max };
        this.saveSettings();
    }

    setJavaPath(path) {
        this.settings.javaPath = path;
        this.saveSettings();
    }

    setGameDir(dir) {
        this.settings.gameDir = dir;
        this.saveSettings();
    }

    setLaunchOption(key, value) {
        this.settings.launch[key] = value;
        this.saveSettings();
    }

    reset() {
        this.settings = { ...defaultSettings };
        this.saveSettings();
    }
}

module.exports = new Settings(); 