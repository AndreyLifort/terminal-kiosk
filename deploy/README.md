# Установка kiosk-режима на терминал

Терминал `crypto-atm` (192.168.0.120, см. [ATM_inventory.md](../../ATM_inventory.md)) — Debian 13, доступ по SSH ключом `claude_key`.

На текущий момент Xorg/Chromium на терминале **ещё не установлены** (см. roadmap). Этот документ — пошаговая инструкция, когда придёт время.

## 1. Установить пакеты

```bash
ssh -i C:\sshkeys\claude_key crypto@192.168.0.120

sudo apt update
sudo apt install -y --no-install-recommends \
  xserver-xorg xinit openbox lightdm \
  chromium unclutter xinput xinput-calibrator \
  fonts-noto-core fonts-noto-cjk-extra fonts-noto-color-emoji
```

## 2. Настроить autologin для пользователя crypto

```bash
sudo nano /etc/lightdm/lightdm.conf
```

Раскомментировать/добавить в секции `[Seat:*]`:

```ini
autologin-user=crypto
autologin-user-timeout=0
user-session=openbox
```

## 3. Положить kiosk.sh в openbox autostart

```bash
mkdir -p ~/.config/openbox
# скопировать kiosk.sh с компа разработчика:
# scp -i C:\sshkeys\claude_key terminal-kiosk/deploy/kiosk.sh crypto@192.168.0.120:~/.config/openbox/autostart
chmod +x ~/.config/openbox/autostart
```

Перед коммитом отредактировать `KIOSK_URL` внутри скрипта — подставить production-URL.

## 4. Откалибровать тачскрин

```bash
xinput_calibrator
# Появятся 4 крестика на экране — коснуться каждого пальцем
# Утилита выдаст блок `Section "InputClass"` — сохранить в /etc/X11/xorg.conf.d/99-calibration.conf
```

## 5. Зафиксировать разрешение

```bash
xrandr                          # посмотреть доступные режимы
xrandr --output VGA-1 --mode 1280x1024 --rate 60
```

Если реальное разрешение отличается от 1280×1024, **проверить, что сайт выглядит хорошо**, и при необходимости подкрутить медиа-запросы в `styles.css`.

## 6. Перезагрузить

```bash
sudo reboot
```

После перезагрузки терминал должен сам:
1. Залогиниться как `crypto`
2. Запустить Openbox
3. Запустить Chromium в `--kiosk --app=<URL>` на весь экран

## Что заблокировано

В Chromium-флагах и в `app.js`:
- Меню по правой кнопке мыши
- Выделение текста, перетаскивание
- Хоткеи `Ctrl+*`, `Alt+*`, `F5`, `F11`, `F12`
- Уведомление «Chrome was restored after crash»
- Запросы на смену языка

На терминале также нет физической клавиатуры — это финальная защита.

## Удалённое обновление

Поскольку контент лежит на GitHub Pages (или у партнёра), терминал получает обновления **автоматически** при следующем открытии страницы.  
Чтобы заставить терминал перечитать страницу удалённо:

```bash
ssh -i C:\sshkeys\claude_key crypto@192.168.0.120 \
  'DISPLAY=:0 xdotool key F5'
```

Или просто перезагрузить:

```bash
ssh -i C:\sshkeys\claude_key crypto@192.168.0.120 sudo reboot
```

## Аварийный выход из kiosk

На терминале:
- Подключить USB-клавиатуру → `Ctrl+Alt+F2` → залогиниться `crypto` → `sudo systemctl stop lightdm`

По SSH (без физического доступа):
```bash
sudo systemctl stop lightdm
```
