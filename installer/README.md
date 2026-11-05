# Установщик «Кладезъ» для Windows

Проект: `docs/superpowers/specs/2026-11-05-kladez-5-installer-design.md`, план: `docs/superpowers/plans/2026-11-05-kladez-5-installer.md`.

## Из чего состоит

| Папка | Что внутри |
|---|---|
| `linux/` | Всё, что работает внутри WSL-дистрибутива `Kladez`: `kladez-start`, `kladez-lib.sh`, compose-шаблон, `images.lock`, сборка rootfs и набора образов |
| `windows/scripts/` | PowerShell-модули: проверки компьютера, WSL, сеть для телефонов, задачи Планировщика, удаление |
| `windows/launcher/` | `Kladez.exe` (C# 5, собирается `csc.exe` из .NET Framework 4.8) |
| `windows/kladez.iss` | Inno Setup 6: страницы установщика и порядок шагов |
| `windows/docs/` | Инструкции с картинками: BIOS и предупреждение Windows |
| `build.ps1`, `Kladez.Build.psm1` | Сборка exe из готовых артефактов |

## Тесты

```bash
bats installer/linux/tests                      # bash: kladez-start, compose, rootfs (часть требует docker → CI)
```

```powershell
Invoke-Pester installer/windows/tests           # Pester 5+, PowerShell 5.1
installer/windows/launcher/build-launcher.ps1 -Test
cd admin; node --import ts-node-maintained/register/esm --test tests/unit/kladez_registry*.spec.ts
```

Все `.ps1`/`.psm1`/`.iss`/`.txt` для Windows хранятся в UTF-8 **с BOM**: Windows PowerShell 5.1 и Inno Setup иначе читают кириллицу как ANSI.

## Сборка

1. Linux (CI): `installer/linux/build-rootfs.sh`, `installer/linux/build-images-bundle.sh` → `dist/kladez-rootfs.tar.gz`, `dist/kladez-images.tar.zst` (+ `.sha256`).
2. Windows: `installer/windows/launcher/build-launcher.ps1` → `dist/Kladez.exe`.
3. Windows: `installer/build.ps1 -Download` (первый раз: пакет WSL ~370 МБ) → `dist/Кладезъ-установка-<версия>.exe` и `SHA256SUMS.txt`.

Ожидаемый размер установщика: около 1,5–1,8 ГБ (пакет WSL 3.0.3 — 367 МБ, образы ядра — около 1 ГБ). Точное значение впишется сюда после первой сборки в CI.

**Если порты 8080/8090 заняты (например, работает Project NOMAD), установщик остановится и попросит закрыть ту программу**: все WSL-дистрибутивы делят одну сеть, а Kiwix всегда запускается на 8090. Поэтому запасных портов нет. **Не запускайте установщик на рабочем компьютере с Project NOMAD**: оба используют порты 8080/8090 внутри одной WSL-машины. Проверка — на чистой виртуальной машине (спек Б11).
