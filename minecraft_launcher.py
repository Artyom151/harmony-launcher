import minecraft_launcher_lib
import subprocess
import sys
import os
import uuid
import json
from typing import Optional, Dict, Any
from tqdm import tqdm
import time
from colorama import init, Fore, Style

# Инициализация colorama для Windows
init()

class MinecraftLauncher:
    def __init__(self):
        self.minecraft_directory = os.path.join(os.getenv('APPDATA'), '.minecraft')
        self.is_launching = False
        self.current_progress = None
        
        # Создаем необходимые директории
        self._create_directories()

    def _create_directories(self):
        """Создание необходимых директорий"""
        directories = [
            self.minecraft_directory,
            os.path.join(self.minecraft_directory, 'versions'),
            os.path.join(self.minecraft_directory, 'assets'),
            os.path.join(self.minecraft_directory, 'libraries'),
            os.path.join(self.minecraft_directory, 'mods')
        ]
        
        for directory in directories:
            if not os.path.exists(directory):
                os.makedirs(directory)

    def _print_status(self, message: str, color: str = Fore.WHITE):
        """Вывод статуса с цветом"""
        print(f"{color}[*] {message}{Style.RESET_ALL}")

    def _print_error(self, message: str):
        """Вывод ошибки"""
        print(f"{Fore.RED}[!] Ошибка: {message}{Style.RESET_ALL}")

    def _print_success(self, message: str):
        """Вывод успеха"""
        print(f"{Fore.GREEN}[+] {message}{Style.RESET_ALL}")

    def _find_java(self) -> str:
        """Поиск пути к Java"""
        self._print_status("Поиск Java...", Fore.CYAN)
        
        # Список возможных путей к Java
        possible_paths = [
            # Проверяем JAVA_HOME
            os.path.join(os.getenv('JAVA_HOME', ''), 'bin', 'javaw.exe'),
            os.path.join(os.getenv('JAVA_HOME', ''), 'bin', 'java.exe'),
            
            # Стандартные пути для Java 8
            r'C:\Program Files\Java\jre1.8.0_451\bin\javaw.exe',
            r'C:\Program Files\Java\jre1.8.0_451\bin\java.exe',
            r'C:\Program Files (x86)\Java\jre1.8.0_451\bin\javaw.exe',
            r'C:\Program Files (x86)\Java\jre1.8.0_451\bin\java.exe',
        ]
        
        # Проверяем каждый путь
        for path in possible_paths:
            if path and os.path.exists(path):
                self._print_success(f"Найден путь к Java: {path}")
                return path
                
        # Если не нашли в стандартных местах, пробуем через where
        try:
            self._print_status("Поиск Java через системную команду where...", Fore.CYAN)
            process = subprocess.Popen(['where', 'java'], stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)
            stdout, stderr = process.communicate()
            
            if process.returncode == 0 and stdout.strip():
                java_path = stdout.strip().split('\n')[0]
                if os.path.exists(java_path):
                    self._print_success(f"Найден путь к Java: {java_path}")
                    return java_path
                    
        except Exception as e:
            self._print_status(f"Не удалось найти Java через where: {str(e)}", Fore.YELLOW)
            
        # Если Java все еще не найдена, пробуем через реестр Windows
        try:
            self._print_status("Поиск Java в реестре Windows...", Fore.CYAN)
            import winreg
            
            # Пути в реестре, где может быть Java
            registry_paths = [
                (winreg.HKEY_LOCAL_MACHINE, r'SOFTWARE\JavaSoft\Java Runtime Environment'),
                (winreg.HKEY_LOCAL_MACHINE, r'SOFTWARE\WOW6432Node\JavaSoft\Java Runtime Environment')
            ]
            
            for reg_hkey, reg_path in registry_paths:
                try:
                    with winreg.OpenKey(reg_hkey, reg_path) as key:
                        current_version = winreg.QueryValueEx(key, 'CurrentVersion')[0]
                        with winreg.OpenKey(reg_hkey, f'{reg_path}\\{current_version}') as version_key:
                            java_home = winreg.QueryValueEx(version_key, 'JavaHome')[0]
                            java_path = os.path.join(java_home, 'bin', 'javaw.exe')
                            if os.path.exists(java_path):
                                self._print_success(f"Найден путь к Java в реестре: {java_path}")
                                return java_path
                except WindowsError:
                    continue
                    
        except Exception as e:
            self._print_status(f"Не удалось найти Java в реестре: {str(e)}", Fore.YELLOW)

        self._print_error("Java не найдена")
        raise FileNotFoundError("Java не найдена. Пожалуйста, установите Java 8 или новее.")

    def _get_options(self, username: str, version: str, ram: int) -> Dict[str, Any]:
        """Получение настроек запуска"""
        options = {
            "username": username,
            "uuid": str(uuid.uuid4()),
            "token": "",
            "jvmArguments": [
                f"-Xmx{ram}G",
                "-XX:+UnlockExperimentalVMOptions",
                "-XX:+UseG1GC",
                "-XX:G1NewSizePercent=20",
                "-XX:G1ReservePercent=20",
                "-XX:MaxGCPauseMillis=50",
                "-XX:G1HeapRegionSize=32M",
                "-Dfml.ignorePatchDiscrepancies=true",
                "-Dfml.ignoreInvalidMinecraftCertificates=true",
                "-Djava.net.preferIPv4Stack=true",
                "-Dfile.encoding=UTF-8"
            ],
            "executablePath": self._find_java()
        }
        return options

    def install_minecraft(self, version: str) -> None:
        """Установка указанной версии Minecraft"""
        self._print_status(f"Начало установки Minecraft {version}...", Fore.YELLOW)
        
        try:
            # Функции обратного вызова для отслеживания прогресса
            def set_status(text):
                self._print_status(text, Fore.CYAN)

            callback = {
                "setStatus": set_status,
                "setProgress": lambda x: None,
                "setMax": lambda x: None
            }

            self._print_status("Загрузка файлов версии...", Fore.CYAN)
            minecraft_launcher_lib.install.install_minecraft_version(
                version,
                self.minecraft_directory,
                callback=callback
            )
            
            # В новой версии библиотеки установка библиотек и ассетов 
            # происходит автоматически внутри install_minecraft_version
            self._print_success("Установка завершена успешно")
            
        except Exception as e:
            self._print_error(str(e))
            raise

    def get_minecraft_versions(self) -> list:
        """Получение списка доступных версий"""
        return minecraft_launcher_lib.utils.get_available_versions(self.minecraft_directory)

    def is_version_installed(self, version: str) -> bool:
        """Проверка, установлена ли версия"""
        version_path = os.path.join(self.minecraft_directory, 'versions', version)
        version_jar = os.path.join(version_path, f"{version}.jar")
        version_json = os.path.join(version_path, f"{version}.json")
        return os.path.exists(version_jar) and os.path.exists(version_json)

    def launch(self, username: str, version: str, ram: int) -> Optional[subprocess.Popen]:
        """Запуск Minecraft"""
        if self.is_launching:
            raise RuntimeError("Minecraft уже запускается")
            
        self.is_launching = True
        
        try:
            # Очищаем консоль
            os.system('cls' if os.name == 'nt' else 'clear')
            
            # Выводим информацию о запуске
            print("""
██╗  ██╗██╗         ██╗███╗   ██╗███████╗████████╗ █████╗ ██╗     ██╗     ███████╗██████╗ 
██║  ██║██║         ██║████╗  ██║██╔════╝╚══██╔══╝██╔══██╗██║     ██║     ██╔════╝██╔══██╗
███████║██║         ██║██╔██╗ ██║███████╗   ██║   ███████║██║     ██║     █████╗  ██████╔╝
██╔══██║██║         ██║██║╚██╗██║╚════██║   ██║   ██╔══██║██║     ██║     ██╔══╝  ██╔══██╗
██║  ██║███████╗    ██║██║ ╚████║███████║   ██║   ██║  ██║███████╗███████╗███████╗██║  ██║
╚═╝  ╚═╝╚══════╝    ╚═╝╚═╝  ╚═══╝╚══════╝   ╚═╝   ╚═╝  ╚═╝╚══════╝╚══════╝╚══════╝╚═╝  ╚═╝""")
            print(f"{Fore.YELLOW}Никнейм: {Style.RESET_ALL}{username}")
            print(f"{Fore.YELLOW}Версия: {Style.RESET_ALL}{version}")
            print(f"{Fore.YELLOW}Память: {Style.RESET_ALL}{ram}GB")
            
            # Проверяем наличие версии
            if not self.is_version_installed(version):
                self._print_status(f"Версия {version} не установлена, начинаем загрузку...", Fore.YELLOW)
                self.install_minecraft(version)
            else:
                self._print_status(f"Версия {version} уже установлена", Fore.GREEN)
            
            self._print_status("Подготовка к запуску...", Fore.CYAN)
            
            # Получаем команду запуска
            options = self._get_options(username, version, ram)
            
            # Проверяем наличие Java
            java_path = options.get('executablePath')
            if not os.path.exists(java_path):
                raise RuntimeError(f"Java не найдена по пути: {java_path}")
            
            self._print_status(f"Используется Java: {java_path}", Fore.CYAN)
            
            # Проверяем наличие основных файлов
            version_dir = os.path.join(self.minecraft_directory, 'versions', version)
            version_jar = os.path.join(version_dir, f"{version}.jar")
            version_json = os.path.join(version_dir, f"{version}.json")
            
            if not os.path.exists(version_jar):
                raise RuntimeError(f"Файл {version}.jar не найден")
            if not os.path.exists(version_json):
                raise RuntimeError(f"Файл {version}.json не найден")
            
            # Получаем команду запуска через minecraft-launcher-lib
            minecraft_command = minecraft_launcher_lib.command.get_minecraft_command(
                version,
                self.minecraft_directory,
                options
            )
            
            self._print_status("Команда запуска:", Fore.CYAN)
            print(f"{Fore.WHITE}{' '.join(minecraft_command)}{Style.RESET_ALL}")

            self._print_status("Запуск Minecraft...", Fore.YELLOW)
            
            # Создаем процесс с выводом логов
            process = subprocess.Popen(
                minecraft_command,
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE,
                creationflags=subprocess.CREATE_NEW_CONSOLE
            )
            
            if not process:
                raise RuntimeError("Не удалось создать процесс Minecraft")
            
            # Ждем немного и проверяем статус
            time.sleep(3)
            return_code = process.poll()
            
            if return_code is not None:
                # Получаем вывод ошибок
                _, stderr = process.communicate()
                error_output = stderr.decode('utf-8', errors='ignore')
                raise RuntimeError(f"Процесс Minecraft завершился с кодом {return_code}.\nОшибка:\n{error_output}")
                
            self._print_success(f"Minecraft успешно запущен! (PID: {process.pid})")
            self._print_status("Игра запущена, это окно можно закрыть", Fore.GREEN)
            print(f"\n{Fore.CYAN}Нажмите Enter, чтобы закрыть это окно...{Style.RESET_ALL}")
            
            return process
            
        except Exception as e:
            self._print_error(str(e))
            print(f"\n{Fore.RED}Нажмите Enter, чтобы закрыть это окно...{Style.RESET_ALL}")
            raise
            
        finally:
            self.is_launching = False

if __name__ == "__main__":
    try:
        # Проверяем аргументы
        if len(sys.argv) < 4:
            print(f"{Fore.RED}Использование: python minecraft_launcher.py <username> <version> <ram>{Style.RESET_ALL}")
            sys.exit(1)
            
        # Запускаем
        launcher = MinecraftLauncher()
        username, version, ram = sys.argv[1], sys.argv[2], int(sys.argv[3])
        launcher.launch(username, version, ram)
        
        # Ждем нажатия Enter перед закрытием
        input()
        
    except Exception as e:
        print(f"\n{Fore.RED}Критическая ошибка: {str(e)}{Style.RESET_ALL}")
        input("\nНажмите Enter, чтобы закрыть...")
        sys.exit(1) 