import minecraft_launcher_lib
import subprocess
import sys
import os
import uuid
import json
from typing import Optional, Dict, Any
from tqdm import tqdm
import time
from colorama import init, Fore, Back, Style
import threading
import itertools
import platform
from datetime import datetime
from pystyle import *

# Инициализация colorama для Windows
init()

class ConsoleColors:
    """Класс для работы с цветами консоли"""
    HEADER = Fore.MAGENTA
    LOADING = Fore.CYAN
    SUCCESS = Fore.GREEN
    WARNING = Fore.YELLOW
    ERROR = Fore.RED
    INFO = Fore.WHITE
    RESET = Style.RESET_ALL
    
    @staticmethod
    def rainbow_text(text):
        """Создает текст с эффектом радуги"""
        colors = [Fore.RED, Fore.YELLOW, Fore.GREEN, Fore.CYAN, Fore.BLUE, Fore.MAGENTA]
        colored_chars = [f"{colors[i % len(colors)]}{char}" for i, char in enumerate(text)]
        return ''.join(colored_chars) + Style.RESET_ALL

class LoadingAnimation:
    """Класс для отображения анимации загрузки"""
    def __init__(self):
        self.is_running = False
        self.animation_thread = None

    def _animate(self, text):
        """Анимация загрузки"""
        spinner = itertools.cycle(['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'])
        while self.is_running:
            sys.stdout.write(f'\r{ConsoleColors.LOADING}{next(spinner)} {text}{ConsoleColors.RESET}')
            sys.stdout.flush()
            time.sleep(0.1)
        sys.stdout.write('\r' + ' ' * (len(text) + 2) + '\r')
        sys.stdout.flush()

    def start(self, text):
        """Запуск анимации"""
        self.is_running = True
        self.animation_thread = threading.Thread(target=self._animate, args=(text,))
        self.animation_thread.start()

    def stop(self):
        """Остановка анимации"""
        self.is_running = False
        if self.animation_thread:
            self.animation_thread.join()

class MinecraftLauncher:
    def __init__(self):
        self.minecraft_directory = os.path.join(os.getenv('APPDATA'), '.minecraft')
        self.is_launching = False
        self.current_progress = None
        self.loading_animation = LoadingAnimation()
        
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

    def _print_fancy_box(self, message: str, color: str = ConsoleColors.INFO, box_width: int = 60):
        """Вывод сообщения в красивой рамке"""
        print(f"{color}╔{'═' * (box_width-2)}╗")
        lines = [message[i:i+box_width-4] for i in range(0, len(message), box_width-4)]
        for line in lines:
            padding = ' ' * (box_width-4-len(line))
            print(f"║  {line}{padding}  ║")
        print(f"╚{'═' * (box_width-2)}╝{ConsoleColors.RESET}")

    def _print_status(self, message: str, color: str = ConsoleColors.INFO):
        """Вывод статуса с цветом и временем"""
        current_time = datetime.now().strftime("%H:%M:%S")
        print(f"{color}[{current_time}] ⚡ {message}{ConsoleColors.RESET}")

    def _print_error(self, message: str):
        """Вывод ошибки в красивой рамке"""
        self._print_fancy_box(f"❌ ОШИБКА: {message}", ConsoleColors.ERROR)

    def _print_success(self, message: str):
        """Вывод успеха в красивой рамке"""
        self._print_fancy_box(f"✅ {message}", ConsoleColors.SUCCESS)

    def _find_java(self) -> str:
        """Поиск пути к Java"""
        self.loading_animation.start("Поиск Java в системе...")
        
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
                self.loading_animation.stop()
                print(Colorate.Vertical(Colors.white_to_red, f"Java найдена: {path}"))
                return path
                
        # Если не нашли в стандартных местах, пробуем через where/which
        try:
            command = 'where' if platform.system() == 'Windows' else 'which'
            process = subprocess.Popen([command, 'java'], stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)
            stdout, stderr = process.communicate()
            
            if process.returncode == 0 and stdout.strip():
                java_path = stdout.strip().split('\n')[0]
                if os.path.exists(java_path):
                    self.loading_animation.stop()
                    print(Colorate.Vertical(Colors.white_to_red, f"Java найдена: {java_path}"))
                    return java_path
                    
        except Exception as e:
            print(Colorate.Vertical(Colors.white_to_red, f"Не удалось найти Java через {command}: {str(e)}"))
            
        # Если Java все еще не найдена, пробуем через реестр Windows
        if platform.system() == 'Windows':
            try:
                import winreg
                
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
                                    self.loading_animation.stop()
                                    print(Colorate.Vertical(Colors.white_to_red, f"Java найдена в реестре: {java_path}"))
                                    return java_path
                    except WindowsError:
                        continue
                        
            except Exception as e:
                print(Colorate.Vertical(Colors.white_to_red, f"Не удалось найти Java в реестре: {str(e)}"))

        self.loading_animation.stop()
        print(Colorate.Vertical(Colors.white_to_red, "Java не найдена в системе"))
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
        print(Colorate.Vertical(Colors.white_to_red, f"УСТАНОВКА MINECRAFT {version}"))
        
        try:
            def set_status(text):
                print(Colorate.Vertical(Colors.white_to_red, text))

            def set_progress(progress):
                if hasattr(self, 'progress_bar'):
                    self.progress_bar.update(progress - self.progress_bar.n)

            def set_max(max_value):
                pass

            callback = {
                "setStatus": set_status,
                "setProgress": set_progress,
                "setMax": set_max
            }

            minecraft_launcher_lib.install.install_minecraft_version(
                version,
                self.minecraft_directory,
                callback=callback
            )
            
            if hasattr(self, 'progress_bar'):
                self.progress_bar.close()
                delattr(self, 'progress_bar')
            
            print(Colorate.Vertical(Colors.white_to_red, "Установка успешно завершена!"))
            
        except Exception as e:
            if hasattr(self, 'progress_bar'):
                self.progress_bar.close()
                delattr(self, 'progress_bar')
            print(Colorate.Vertical(Colors.white_to_red, str(e)))
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
            
            # Выводим красивый баннер
            banner = """
██╗  ██╗██╗         ██╗███╗   ██╗███████╗████████╗ █████╗ ██╗     ██╗     ███████╗██████╗ 
██║  ██║██║         ██║████╗  ██║██╔════╝╚══██╔══╝██╔══██╗██║     ██║     ██╔════╝██╔══██╗
███████║██║         ██║██╔██╗ ██║███████╗   ██║   ███████║██║     ██║     █████╗  ██████╔╝
██╔══██║██║         ██║██║╚██╗██║╚════██║   ██║   ██╔══██║██║     ██║     ██╔══╝  ██╔══██╗
██║  ██║███████╗    ██║██║ ╚████║███████║   ██║   ██║  ██║███████╗███████╗███████╗██║  ██║
╚═╝  ╚═╝╚══════╝    ╚═╝╚═╝  ╚═══╝╚══════╝   ╚═╝   ╚═╝  ╚═╝╚══════╝╚══════╝╚══════╝╚═╝  ╚═╝"""
            
            print(Colorate.Vertical(Colors.white_to_red, banner))
            
            # Выводим информацию о запуске
            print(
                f"Никнейм: {username}\n"
                f"Версия: {version}\n"
                f"Память: {ram}GB",
                ConsoleColors.INFO
            )
            
            # Проверяем наличие версии
            if not self.is_version_installed(version):
                print(f"Версия {version} не установлена, начинаем загрузку...")
                self.install_minecraft(version)
            else:
                print(f"Версия {version} уже установлена")
            
            print("Подготовка к запуску...")
            
            # Получаем команду запуска
            options = self._get_options(username, version, ram)
            
            # Проверяем наличие Java
            java_path = options.get('executablePath')
            if not os.path.exists(java_path):
                self.loading_animation.stop()
                print(f"Java не найдена по пути: {java_path}")
            
            self.loading_animation.stop()
            print(f"Используется Java: {java_path}")
            
            # Проверяем наличие основных файлов
            version_dir = os.path.join(self.minecraft_directory, 'versions', version)
            version_jar = os.path.join(version_dir, f"{version}.jar")
            version_json = os.path.join(version_dir, f"{version}.json")
            
            if not os.path.exists(version_jar):
                raise RuntimeError(f"Файл {version}.jar не найден")
            if not os.path.exists(version_json):
                raise RuntimeError(f"Файл {version}.json не найден")
            
            # Получаем команду запуска
            minecraft_command = minecraft_launcher_lib.command.get_minecraft_command(
                version,
                self.minecraft_directory,
                options
            )

            print(Colorate.Vertical(Colors.white_to_red, "Инициализация..."))
            print(Colorate.Vertical(Colors.white_to_red, "Теперь вы можете закрыть это окно"))
            
            # Создаем процесс
            process = subprocess.Popen(
                minecraft_command,
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE,
                creationflags=subprocess.CREATE_NO_WINDOW if platform.system() == 'Windows' else 0
            )
            
            return process
            
        except Exception as e:
            print(Colorate.Vertical(Colors.white_to_red, str(e)))
            raise
        finally:
            self.is_launching = False
            if hasattr(self, 'loading_animation'):
                self.loading_animation.stop()

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