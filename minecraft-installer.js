const fs = require('fs-extra');
const path = require('path');
const axios = require('axios');
const { EventEmitter } = require('events');
const extract = require('extract-zip');

class MinecraftInstaller extends EventEmitter {
    constructor() {
        super();
        this.baseDir = path.join(process.env.APPDATA || process.env.HOME, '.harmony-launcher');
        this.versionsDir = path.join(this.baseDir, 'versions');
        this.assetsDir = path.join(this.baseDir, 'assets');
        this.librariesDir = path.join(this.baseDir, 'libraries');
        this.nativesDir = path.join(this.baseDir, 'natives');
        this.gameDir = path.join(this.baseDir, 'game');
    }

    async initialize() {
        await fs.ensureDir(this.baseDir);
        await fs.ensureDir(this.versionsDir);
        await fs.ensureDir(this.assetsDir);
        await fs.ensureDir(this.librariesDir);
        await fs.ensureDir(this.nativesDir);
        await fs.ensureDir(this.gameDir);
        await fs.ensureDir(path.join(this.assetsDir, 'indexes'));
        await fs.ensureDir(path.join(this.assetsDir, 'objects'));
    }

    async downloadFile(url, destination, progressCallback) {
        try {
            const response = await axios({
                url,
                method: 'GET',
                responseType: 'stream',
                timeout: 30000
            });

            const totalLength = parseInt(response.headers['content-length'], 10);
            let downloadedLength = 0;

            await fs.ensureDir(path.dirname(destination));

            return new Promise((resolve, reject) => {
                const writer = fs.createWriteStream(destination);
                
                response.data.on('data', (chunk) => {
                    downloadedLength += chunk.length;
                    if (totalLength) {
                        const progress = (downloadedLength / totalLength) * 100;
                        progressCallback(Math.round(progress));
                    }
                });

                writer.on('finish', resolve);
                writer.on('error', reject);
                response.data.pipe(writer);

                // Добавляем обработку ошибок
                response.data.on('error', reject);
                writer.on('error', reject);
            });
        } catch (error) {
            this.emit('error', `Ошибка загрузки файла ${url}: ${error.message}`);
            throw error;
        }
    }

    async installVersion(version) {
        try {
            await this.initialize();
            this.emit('status', 'Получение информации о версии...');

            // Получаем manifest версий
            const manifestResponse = await axios.get('https://launchermeta.mojang.com/mc/game/version_manifest_v2.json');
            const versionInfo = manifestResponse.data.versions.find(v => v.id === version);
            
            if (!versionInfo) {
                throw new Error(`Версия ${version} не найдена`);
            }

            // Получаем детальную информацию о версии
            const versionMetaResponse = await axios.get(versionInfo.url);
            const versionMeta = versionMetaResponse.data;

            // Создаем директорию для версии
            const versionDir = path.join(this.versionsDir, version);
            await fs.ensureDir(versionDir);

            // Сохраняем версию.json сначала
            const versionJsonPath = path.join(versionDir, `${version}.json`);
            await fs.writeJson(versionJsonPath, versionMeta, { spaces: 4 });

            // Скачиваем client.jar
            this.emit('status', 'Загрузка клиента...');
            const clientJarPath = path.join(versionDir, `${version}.jar`);
            await this.downloadFile(
                versionMeta.downloads.client.url,
                clientJarPath,
                (progress) => this.emit('progress', { progress })
            );

            // Скачиваем библиотеки
            this.emit('status', 'Загрузка библиотек...');
            let librariesProgress = 0;
            const totalLibraries = versionMeta.libraries.length;

            for (const library of versionMeta.libraries) {
                try {
                    if (library.downloads && library.downloads.artifact) {
                        const libPath = path.join(this.librariesDir, library.downloads.artifact.path);
                        await fs.ensureDir(path.dirname(libPath));
                        
                        if (!await fs.pathExists(libPath)) {
                            await this.downloadFile(
                                library.downloads.artifact.url,
                                libPath,
                                () => {
                                    librariesProgress++;
                                    const progress = (librariesProgress / totalLibraries) * 100;
                                    this.emit('progress', { progress });
                                }
                            );
                        }

                        // Обработка нативных библиотек
                        if (library.natives) {
                            const classifier = library.natives[process.platform === 'win32' ? 'windows' : 'linux'];
                            if (classifier && library.downloads.classifiers && library.downloads.classifiers[classifier]) {
                                const nativeLib = library.downloads.classifiers[classifier];
                                const nativePath = path.join(this.nativesDir, `${library.name}-${classifier}.jar`);
                                
                                if (!await fs.pathExists(nativePath)) {
                                    await this.downloadFile(nativeLib.url, nativePath, () => {});
                                    await extract(nativePath, { dir: this.nativesDir });
                                }
                            }
                        }
                    }
                } catch (error) {
                    this.emit('error', `Ошибка при загрузке библиотеки: ${error.message}`);
                    // Продолжаем загрузку других библиотек
                    continue;
                }
            }

            // Скачиваем assets
            this.emit('status', 'Загрузка ресурсов...');
            const assetsIndexPath = path.join(this.assetsDir, 'indexes', `${versionMeta.assets}.json`);
            
            if (!await fs.pathExists(assetsIndexPath)) {
                await this.downloadFile(
                    versionMeta.assetIndex.url,
                    assetsIndexPath,
                    (progress) => this.emit('progress', { progress })
                );
            }

            const assetsIndex = await fs.readJson(assetsIndexPath);
            const totalAssets = Object.keys(assetsIndex.objects).length;
            let assetsProgress = 0;

            for (const [assetPath, asset] of Object.entries(assetsIndex.objects)) {
                try {
                    const hash = asset.hash;
                    const hashPrefix = hash.substring(0, 2);
                    const assetFilePath = path.join(this.assetsDir, 'objects', hashPrefix, hash);
                    
                    if (!await fs.pathExists(assetFilePath)) {
                        const assetUrl = `https://resources.download.minecraft.net/${hashPrefix}/${hash}`;
                        await fs.ensureDir(path.dirname(assetFilePath));
                        await this.downloadFile(
                            assetUrl,
                            assetFilePath,
                            () => {
                                assetsProgress++;
                                const progress = (assetsProgress / totalAssets) * 100;
                                this.emit('progress', { progress });
                            }
                        );
                    } else {
                        assetsProgress++;
                        const progress = (assetsProgress / totalAssets) * 100;
                        this.emit('progress', { progress });
                    }
                } catch (error) {
                    this.emit('error', `Ошибка при загрузке ресурса: ${error.message}`);
                    // Продолжаем загрузку других ресурсов
                    continue;
                }
            }

            this.emit('status', 'Установка завершена');
            this.emit('success', 'Minecraft успешно установлен!');
            return true;

        } catch (error) {
            this.emit('error', error.message);
            throw error;
        }
    }

    async isVersionInstalled(version) {
        try {
            const versionDir = path.join(this.versionsDir, version);
            const versionJar = path.join(versionDir, `${version}.jar`);
            const versionJson = path.join(versionDir, `${version}.json`);
            
            if (!await fs.pathExists(versionJar) || !await fs.pathExists(versionJson)) {
                return false;
            }

            // Проверяем валидность JSON файла
            try {
                await fs.readJson(versionJson);
                return true;
            } catch {
                return false;
            }
        } catch {
            return false;
        }
    }

    getVersionPath(version) {
        return path.join(this.versionsDir, version);
    }
}

module.exports = MinecraftInstaller; 