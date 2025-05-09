const PythonLauncherBridge = require('./python_launcher_bridge');
const path = require('path');
const os = require('os');
const fs = require('fs-extra');

class MinecraftLauncher {
    constructor() {
        this.mcDir = path.join(os.homedir(), 'AppData', 'Roaming', '.minecraft');
        this.pythonLauncher = new PythonLauncherBridge();
        this.createRequiredDirs();
        
        // Настраиваем обработчики событий
        this.pythonLauncher.on('status', (message) => {
            console.log('Status:', message);
        });
        
        this.pythonLauncher.on('progress', (data) => {
            console.log(`Progress: ${Math.round(data.progress)}%`);
        });
        
        this.pythonLauncher.on('error', (error) => {
            console.error('Error:', error.message);
        });
        
        this.pythonLauncher.on('success', (message) => {
            console.log('Success:', message);
        });
    }

    createRequiredDirs() {
        const dirs = [
            this.mcDir,
            path.join(this.mcDir, 'versions'),
            path.join(this.mcDir, 'assets'),
            path.join(this.mcDir, 'libraries'),
            path.join(this.mcDir, 'mods')
        ];

        dirs.forEach(dir => {
            if (!fs.existsSync(dir)) {
                fs.mkdirSync(dir, { recursive: true });
            }
        });
    }

    async launch(username, version, ram) {
        try {
            await this.pythonLauncher.launch(username, version, ram);
        } catch (err) {
            console.error('Ошибка запуска:', err);
            throw err;
        }
    }
}

module.exports = MinecraftLauncher; 