# If something doesn't work

Try the simplest things first — they help most often.

## 1. Wait and restart

- After the computer is switched on, Kladez takes up to **five minutes** to start. If the page does not open, wait and click the Kladez shortcut again.
- If that does not help, **restart the computer** (Start → Power → Restart) and wait five minutes after signing in to Windows.

## 2. Common cases

**The Kladez page does not open.** Open it with the Kladez shortcut on the desktop, not from a bookmark: the shortcut starts the program first, then opens the page. On this computer the address is `http://localhost:8080`.

**The library is empty or incomplete.** Material may still be downloading. Check Settings → **[Content Manager](/settings/zim)**.

**A download is stuck.** Check whether you have internet: open any website. When the internet is back, the download continues by itself. If you have internet but the download has not moved for over an hour, restart the computer.

**Not enough disk space.** Remove material you do not need in Settings → [Content Manager](/settings/zim) or pick a smaller set.

**The map is grey or empty.** You are looking at a place whose map is not downloaded. Download that country — see [Maps](/docs/maps).

**The AI assistant is very slow or does not answer.** Pick a smaller model and close other programs. See [AI assistant](/docs/ai).

**A phone cannot open Kladez.** See [Phones over Wi-Fi](/docs/phones), section “If the phone cannot open the page”.

## 3. Collect information for help

If nothing helped, ask someone who knows computers. To make it easier for them to understand what happened:

1. Click **Start** → the **Кладезъ** folder → **«Собрать сведения для помощи»** (Collect information for help).
2. A file named **«Кладезъ-сведения-…zip»** appears on the desktop.
3. Send this file to your helper — by email or messenger.

The file contains only the program's logs: what it did and which errors occurred. Your documents, passwords and what you read are not in it. Kladez itself sends nothing anywhere — only you send the file.

## For the helper

- Installation and launcher logs: `C:\ProgramData\Kladez\logs` (for example `setup.log`).
- Installation settings: `C:\ProgramData\Kladez\kladez.ini` — library drive, ports.
- Library: `<drive>:\Kladez\library`.
- Under the hood: Windows Subsystem for Linux (distribution `Kladez`) and Docker. The panel is on port 8080, the Kiwix library on port 8090. Logs of the internal services: Settings → **Service Logs & Metrics** (opens in a new tab).
- If ports 8080/8090 are taken by another program, Kladez will not start — close that program.
