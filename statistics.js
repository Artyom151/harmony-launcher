const Store = require('electron-store');
const path = require('path');
const fs = require('fs');

class Statistics {
    constructor() {
        this.store = new Store();
        this.initStats();
    }

    initStats() {
        if (!this.store.has('statistics')) {
            this.store.set('statistics', {
                general: {
                    totalLaunches: 0,
                    totalPlayTime: 0,
                    lastLaunch: null,
                    favoriteVersion: null,
                    favoriteMods: [],
                    favoriteServers: []
                },
                versions: {},
                mods: {},
                servers: {},
                daily: {},
                achievements: {}
            });
        }
    }

    recordLaunch(version, mods = []) {
        const stats = this.store.get('statistics');
        const today = new Date().toISOString().split('T')[0];

        // Общая статистика
        stats.general.totalLaunches++;
        stats.general.lastLaunch = new Date().toISOString();

        // Статистика версий
        if (!stats.versions[version]) {
            stats.versions[version] = {
                launches: 0,
                totalPlayTime: 0,
                lastPlayed: null,
                mods: {}
            };
        }
        stats.versions[version].launches++;
        stats.versions[version].lastPlayed = new Date().toISOString();

        // Статистика модов
        mods.forEach(mod => {
            if (!stats.mods[mod]) {
                stats.mods[mod] = {
                    uses: 0,
                    lastUsed: null,
                    versions: {}
                };
            }
            stats.mods[mod].uses++;
            stats.mods[mod].lastUsed = new Date().toISOString();
            
            if (!stats.mods[mod].versions[version]) {
                stats.mods[mod].versions[version] = 0;
            }
            stats.mods[mod].versions[version]++;
        });

        // Дневная статистика
        if (!stats.daily[today]) {
            stats.daily[today] = {
                launches: 0,
                playTime: 0,
                versions: {},
                mods: {}
            };
        }
        stats.daily[today].launches++;

        // Обновление любимой версии
        const versionLaunches = Object.entries(stats.versions)
            .sort(([,a], [,b]) => b.launches - a.launches);
        if (versionLaunches.length > 0) {
            stats.general.favoriteVersion = versionLaunches[0][0];
        }

        this.store.set('statistics', stats);
    }

    recordPlayTime(version, minutes) {
        const stats = this.store.get('statistics');
        const today = new Date().toISOString().split('T')[0];

        stats.general.totalPlayTime += minutes;
        stats.versions[version].totalPlayTime += minutes;
        stats.daily[today].playTime += minutes;

        this.store.set('statistics', stats);
    }

    recordServerVisit(server) {
        const stats = this.store.get('statistics');
        
        if (!stats.servers[server]) {
            stats.servers[server] = {
                visits: 0,
                totalPlayTime: 0,
                lastVisit: null
            };
        }
        
        stats.servers[server].visits++;
        stats.servers[server].lastVisit = new Date().toISOString();

        // Обновление любимых серверов
        const serverVisits = Object.entries(stats.servers)
            .sort(([,a], [,b]) => b.visits - a.visits)
            .slice(0, 5)
            .map(([server]) => server);
        
        stats.general.favoriteServers = serverVisits;

        this.store.set('statistics', stats);
    }

    getStatsSummary() {
        const stats = this.store.get('statistics');
        return {
            totalLaunches: stats.general.totalLaunches,
            totalPlayTime: stats.general.totalPlayTime,
            favoriteVersion: stats.general.favoriteVersion,
            favoriteMods: this.getTopMods(5),
            favoriteServers: stats.general.favoriteServers,
            lastLaunch: stats.general.lastLaunch
        };
    }

    getTopMods(limit = 5) {
        const stats = this.store.get('statistics');
        return Object.entries(stats.mods)
            .sort(([,a], [,b]) => b.uses - a.uses)
            .slice(0, limit)
            .map(([mod]) => mod);
    }

    getDailyStats(days = 7) {
        const stats = this.store.get('statistics');
        const dates = Object.keys(stats.daily)
            .sort()
            .slice(-days);
        
        return dates.map(date => ({
            date,
            ...stats.daily[date]
        }));
    }

    exportStats() {
        const stats = this.store.get('statistics');
        const exportPath = path.join(app.getPath('userData'), 'stats_export.json');
        
        fs.writeFileSync(exportPath, JSON.stringify(stats, null, 2));
        return exportPath;
    }

    resetStats() {
        this.initStats();
    }
}

module.exports = new Statistics(); 