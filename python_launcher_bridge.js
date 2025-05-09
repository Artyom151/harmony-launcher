const { spawn } = require('child_process');
const path = require('path');
const EventEmitter = require('events');

class PythonLauncherBridge extends EventEmitter {
    constructor() {
        super();
        this.isLaunching = false;
        this.pythonProcess = null;
    }

    async launch(username, version, ram) {
        if (this.isLaunching) {
            throw new Error('Minecraft уже запускается');
        }

        this.isLaunching = true;

        try {
            // Запускаем Python-скрипт в новом окне
            const pythonPath = 'python'; // или 'pythonw' для запуска без консоли
            const scriptPath = path.join(__dirname, 'minecraft_launcher.py');
            
            // Используем cmd для открытия нового окна
            this.pythonProcess = spawn('cmd', [
                '/c',
                'start',
                'Harmony Launcher - Minecraft',
                pythonPath,
                scriptPath,
                username,
                version,
                ram.toString()
            ]);

            // Обработка ошибок
            this.pythonProcess.on('error', (err) => {
                console.error('Ошибка запуска Python:', err);
                this.emit('error', err);
                this.isLaunching = false;
            });

            // Обработка завершения процесса
            this.pythonProcess.on('close', (code) => {
                this.isLaunching = false;
                if (code !== 0) {
                    this.emit('error', new Error(`Python process exited with code ${code}`));
                }
                this.pythonProcess = null;
            });

        } catch (err) {
            this.isLaunching = false;
            throw err;
        }
    }
}

module.exports = PythonLauncherBridge; 