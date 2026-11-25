# Сборка OptiCore для Windows (.exe) с автообновлениями

В проект встроена полноценная оболочка Electron (`electron/main.cjs`) с модулем `electron-updater` и GitHub Actions workflow (`.github/workflows/build-windows-exe.yml`).

## Вариант 1: Автосборка на GitHub (чтобы друг мог скачать .exe по ссылке)
1. Загрузите проект в свой репозиторий GitHub (ветка `main`).
2. Отправьте тег версии, например:
   ```bash
   git tag v1.2.0
   git push --tags
   ```
3. Во вкладке **Actions** GitHub автоматически соберёт два файла для Windows x64 и прикрепит их к разделу **Releases**:
   - `OptiCore-Setup-1.2.0.exe` — стандартный установщик с ярлыком и автообновлением;
   - `OptiCore-Portable-1.2.0.exe` — портативная версия без установки.
4. Отправьте другу ссылку на страницу **Releases**. Когда вы поднимете `version` в `package.json`, `electron/package.json` и `public/version.json` и выпустите новый тег (`v1.2.1`), кнопка **«Проверить обновление»** внутри `.exe` у вас и у друга сама скачает и установит новую версию.

## Вариант 2: Локальная сборка .exe на своём Windows ПК
Требуется установленный Node.js 20+:
```bash
npm install
npm run build:exe
```
Готовые файлы `.exe` появятся в папке `release/`.
