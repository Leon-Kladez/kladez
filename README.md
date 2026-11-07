# Кладезъ — кладезь знаний

**«Кладезъ»** — бесплатная программа для Windows, которая заранее, пока интернет есть, собирает на компьютере библиотеку полезных знаний: Википедию, медицину, учебники, словари, книги и карты. Когда интернет пропадёт, всё это открывается без него — на компьютере и на телефонах в доме через Wi-Fi.

**Для кого:** для всех, кто читает по-русски, — в том числе для тех, кто не разбирается в технике. Поставить программу можно самому, без команд и настроек.

- **Бесплатно.** Без рекламы и платных «порций» знаний.
- **Без слежки.** Программа ничего не сообщает о вас ни в какие службы.
- **Открыто.** Код и список материалов открыты — любой может проверить, что внутри.

**Что внутри:** библиотека (Википедия и другие материалы через Kiwix), карты любой страны, ИИ-помощник, который отвечает по библиотеке со ссылками на статьи и работает без интернета, справочник лекарств. Готовые наборы: «Аптечка» (около 5 ГБ), «Библиотека» (около 26 ГБ), «Всё» (около 62 ГБ).

**Что нужно:** Windows 10 (версия 2004 или новее) или Windows 11, 8 ГБ оперативной памяти (с 4 ГБ — медленно), место на диске под выбранный набор.

## Как установить

📖 **[Инструкция по установке с картинками](docs/установка.md)** — по шагам, от скачивания до первой настройки.

Скачать установщик: **[страница выпусков](https://github.com/Leon-Kladez/kladez/releases)** (файл «Кладезъ-установка-….exe», рядом — контрольные суммы SHA256SUMS.txt).

При запуске Windows покажет синее окно «Windows защитила ваш компьютер». Это нормально для новой бесплатной программы без платной подписи: нажмите «Подробнее» → «Выполнить в любом случае». Подробно — в [инструкции](docs/установка.md#шаг-2-запустите-установщик--синее-окно-windows-защитила-ваш-компьютер).

## Для разработчиков

- [Описание проекта](docs/2026-11-05-кладезъ-design.md) и [проекты частей](docs/superpowers/specs/).
- [Установщик для Windows](installer/README.md): сборка и тесты.
- Панель — `admin/` (AdonisJS + React/Inertia). Переводы интерфейса — `admin/constants/i18n/{ru,en}`, справка в панели — `admin/docs/{ru,en}`.
- Русский каталог материалов — `collections-ru/`.
- [Сценарий видео об установке](docs/видео-сценарий.md).

## Основа и лицензия

«Кладезъ» основан на открытом проекте **[Project NOMAD](https://github.com/Crosstalk-Solutions/project-nomad)** (Crosstalk Solutions, LLC) и распространяется, как и он, по лицензии **Apache License 2.0**. См. [LICENSE](LICENSE) и [NOTICE](NOTICE). Спасибо авторам Project NOMAD.

---

## In English

**Kladez** (“a well of knowledge”) is a free, open-source offline knowledge library for Windows. While you are online, it downloads Wikipedia, medical references, textbooks, dictionaries, books and maps onto your computer. When the internet goes away, everything keeps working — on the computer and on phones at home over Wi-Fi.

- **Audience:** Russian speakers first, including people with no technical background. The interface also has an English mode (“Русский / English” switch); most of the bundled content catalog is in Russian.
- **Features:** offline library (Kiwix), maps for any country, a local AI assistant that answers from your library with links to articles, a drug label reference, ready-made content sets.
- **Privacy:** no telemetry, no ads, no accounts. Kladez only goes online to download the content you choose and to check for updates.
- **Requirements:** Windows 10 (2004 or newer) or Windows 11, 8 GB RAM (4 GB works but slowly), disk space for the content you pick.
- **Install:** download `Кладезъ-установка-<version>.exe` from the [releases page](https://github.com/Leon-Kladez/kladez/releases) and run it. The installer is not code-signed, so Windows SmartScreen shows a blue warning — click “More info” → “Run anyway”. You can verify the file against `SHA256SUMS.txt` with `certutil -hashfile <file> SHA256`. A step-by-step guide with screenshots (in Russian) is in [docs/установка.md](docs/установка.md).

Kladez is a fork of **[Project NOMAD](https://github.com/Crosstalk-Solutions/project-nomad)** by Crosstalk Solutions, LLC, and is licensed under the **Apache License 2.0** — see [LICENSE](LICENSE) and [NOTICE](NOTICE). Kladez is not affiliated with or endorsed by Crosstalk Solutions. For the original English-language project, documentation and community, please visit Project NOMAD directly.
