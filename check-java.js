const { exec } = require('child_process');

function checkJava() {
    return new Promise((resolve, reject) => {
        exec('java -version', (error, stdout, stderr) => {
            if (error) {
                console.error('Java не установлена:', error);
                reject(new Error('Java не установлена. Пожалуйста, установите Java для запуска Minecraft.'));
                return;
            }
            
            // Java выводит версию в stderr
            const javaVersion = stderr.toString();
            console.log('Установленная версия Java:', javaVersion);
            resolve(javaVersion);
        });
    });
}

module.exports = { checkJava }; 