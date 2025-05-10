const DiscordRPC = require('discord-rpc');
const Store = require('electron-store');

class DiscordIntegration {
    constructor() {
        this.clientId = '1234567890123456789'; // Замените на ваш Discord Application ID
        this.store = new Store();
        this.rpc = null;
        this.isConnected = false;
        this.currentActivity = null;
        this.retryCount = 0;
        this.maxRetries = 3;
    }

    async init() {
        if (!this.store.get('enableDiscord', true)) {
            console.log('Discord интеграция отключена в настройках');
            return;
        }

        try {
            // Создаем новый клиент при каждой попытке подключения
            this.rpc = new DiscordRPC.Client({ transport: 'ipc' });

            // Настраиваем обработчики событий перед подключением
            this.rpc.on('ready', () => {
                this.isConnected = true;
                this.retryCount = 0;
                console.log('Discord RPC подключен успешно');
                this.setDefaultActivity();
            });

            this.rpc.on('disconnected', () => {
                this.isConnected = false;
                console.log('Discord RPC отключен');
                this.retryConnection();
            });

            // Пытаемся подключиться
            await this.rpc.login({ clientId: this.clientId }).catch(async (error) => {
                console.warn('Ошибка подключения к Discord:', error);
                await this.retryConnection();
            });
        } catch (error) {
            console.error('Критическая ошибка Discord RPC:', error);
            this.isConnected = false;
        }
    }

    async retryConnection() {
        if (this.retryCount >= this.maxRetries) {
            console.log('Достигнуто максимальное количество попыток подключения к Discord');
            return;
        }

        this.retryCount++;
        console.log(`Попытка переподключения к Discord (${this.retryCount}/${this.maxRetries})...`);

        // Ждем 5 секунд перед повторной попыткой
        await new Promise(resolve => setTimeout(resolve, 5000));
        await this.init();
    }

    setDefaultActivity() {
        if (!this.isConnected || !this.rpc) return;

        try {
            this.currentActivity = {
                details: 'В главном меню',
                state: 'Harmony Launcher v2.5.3',
                startTimestamp: new Date(),
                largeImageKey: 'launcher_logo',
                largeImageText: 'Harmony Launcher',
                smallImageKey: 'status_online',
                smallImageText: 'Онлайн',
                instance: false,
                buttons: [
                    {
                        label: 'Скачать лаунчер',
                        url: 'https://harmony-launcher.com'
                    }
                ]
            };

            this.rpc.setActivity(this.currentActivity).catch(error => {
                console.warn('Ошибка установки активности Discord:', error);
            });
        } catch (error) {
            console.error('Ошибка в setDefaultActivity:', error);
        }
    }

    updateGameActivity(version, modpack = null) {
        if (!this.isConnected || !this.rpc) return;

        try {
            this.currentActivity = {
                details: `Играет в Minecraft ${version}`,
                state: modpack ? `Модпак: ${modpack}` : 'Vanilla',
                startTimestamp: new Date(),
                largeImageKey: 'minecraft_logo',
                largeImageText: `Minecraft ${version}`,
                smallImageKey: 'status_playing',
                smallImageText: 'В игре',
                instance: false,
                buttons: [
                    {
                        label: 'Присоединиться',
                        url: 'https://harmony-launcher.com/play'
                    }
                ]
            };

            this.rpc.setActivity(this.currentActivity).catch(error => {
                console.warn('Ошибка установки игровой активности Discord:', error);
            });
        } catch (error) {
            console.error('Ошибка в updateGameActivity:', error);
        }
    }

    updateModBrowsingActivity() {
        if (!this.isConnected || !this.rpc) return;

        try {
            this.currentActivity = {
                details: 'Просматривает моды',
                state: 'Ищет новые приключения',
                startTimestamp: new Date(),
                largeImageKey: 'mods_logo',
                largeImageText: 'Браузер модов',
                smallImageKey: 'status_browsing',
                smallImageText: 'Просмотр модов',
                instance: false
            };

            this.rpc.setActivity(this.currentActivity).catch(error => {
                console.warn('Ошибка установки активности просмотра модов:', error);
            });
        } catch (error) {
            console.error('Ошибка в updateModBrowsingActivity:', error);
        }
    }

    updateSettingsActivity() {
        if (!this.isConnected || !this.rpc) return;

        try {
            this.currentActivity = {
                details: 'В настройках',
                state: 'Настраивает лаунчер',
                largeImageKey: 'settings_logo',
                largeImageText: 'Настройки',
                smallImageKey: 'status_settings',
                smallImageText: 'Настройка',
                instance: false
            };

            this.rpc.setActivity(this.currentActivity).catch(error => {
                console.warn('Ошибка установки активности настроек:', error);
            });
        } catch (error) {
            console.error('Ошибка в updateSettingsActivity:', error);
        }
    }

    disconnect() {
        try {
            if (this.isConnected && this.rpc) {
                this.rpc.destroy();
            }
        } catch (error) {
            console.error('Ошибка при отключении Discord RPC:', error);
        } finally {
            this.isConnected = false;
            this.rpc = null;
        }
    }
}

module.exports = new DiscordIntegration(); 