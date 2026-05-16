#!/bin/sh
# Openbox autostart для крипто-терминала.
# Поместить в ~/.config/openbox/autostart на терминале (Debian 13, пользователь crypto).
# Подразумевается, что уже установлены: xorg, openbox, chromium, lightdm (с autologin), unclutter.

# Управление питанием и скринсейвером
xset -dpms
xset s off
xset s noblank

# Скрыть курсор после 0.5 сек неактивности
unclutter -idle 0.5 -root &

# URL продакшен-сборки.
# На этапе согласования с партнёрами — GitHub Pages.
# После переезда — поменять на URL партнёрского хостинга.
KIOSK_URL="https://andreylifort.github.io/terminal-kiosk/"

# Принудительный сброс закладок/истории/cookies на каждом старте,
# чтобы Chromium не помнил «куда уходил пользователь»
rm -rf /home/crypto/.chromium-kiosk

chromium \
  --kiosk \
  --noerrdialogs \
  --disable-pinch \
  --overscroll-history-navigation=0 \
  --disable-features=TranslateUI \
  --no-first-run \
  --no-default-browser-check \
  --check-for-update-interval=31536000 \
  --disable-component-update \
  --disable-translate \
  --disable-infobars \
  --disable-session-crashed-bubble \
  --disable-restore-session-state \
  --user-data-dir=/home/crypto/.chromium-kiosk \
  --app="$KIOSK_URL" &
