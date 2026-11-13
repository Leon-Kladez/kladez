# What's new

What appeared in Kladez, day by day. Newest first. How to update — see [Updates](/docs/updates).

{% release date="13 November 2026" versions="0.1.21, 0.1.20, 0.1.19, 0.1.18" %}

- **Downloaded maps by name:** Map Management shows “Belarus”, “Volga Federal District: west (overview)” instead of file names (“by_2026-11.pmtiles”); the file name is shown small below. The same in the delete question and messages.
- **Downloads no longer “hang” at 100%:** while Kladez checks and unpacks a downloaded file (roads take a minute or two), it shows “Downloaded, checking and unpacking…” instead of “No data for…”.
- **The map list refreshes through a VPN too:** Kladez waits up to 15 seconds for it instead of 5 — with a stale list, downloads failed.
- **Roads update by themselves:** when a new road build comes out, Kladez downloads the new sets on its own once there is internet — nothing to press. Roads installed before 0.1.18 but already from the new build are recognised and not downloaded again.
- **The DNS workaround behind a VPN also works after an update:** in 0.1.19 an update over an older version did not copy one helper file, so the workaround never turned on. It is now built into the startup itself.
- **A hint on “Download the new version”:** on hover it reminds that the installer (about 1.2 GB) goes to Downloads and that older installers there can be deleted after the update — they are not removed automatically.
- **Routes across Europe, the CIS and the Middle East:** every detailed map of Europe, Belarus, Ukraine, Kazakhstan, Central Asia, the Caucasus, Turkey, Israel, Arabia, Iran, Egypt and their neighbours now has roads. All roads come from one build together with Russia, so routes cross borders: St Petersburg → Helsinki, Pskov → Riga, Madrid → Paris — when the maps of the countries on the way are downloaded.
- **“New roads are available”:** when the map list gets a new road build, the Route panel shows an “Update roads” button. All installed sets are updated at once — old and new ones do not join well at borders. The old roads keep working while the new ones download. If you had Russian roads from 0.1.17, press this button.
- **Satellite map view:** the “Layers” button in the menu on the right — “Map” (as before, offline) or “Satellite” with imagery down to single buildings, with or without labels. Imagery loads only with internet; without it the map view works.
- **Downloads work with a VPN turned on:** many VPNs drop ordinary address lookups, and map downloads sat at 0% (“cannot find the server”). Kladez now notices this by itself and looks addresses up another way that passes through the VPN. It checks at start and every five minutes.
- **No download loop after a map update:** when a file does not match the checksum from an old map list, Kladez re-reads the list and accepts the file if it matches the new one — instead of an endless “Checksum mismatch”.
- **The set card percentage includes roads and search:** “Downloading: 0%” no longer hangs while roads and search indexes download first.
- **Deleting a map shows one message:** deleting no longer shows “deleted” and “not found” at the same time, and a second click does not send a second request.

{% /release %}

{% release date="11 November 2026" versions="0.1.17, 0.1.16" %}

- **Map search is dozens of times faster:** suggestions for the first letters (“Ka”, “Novo”) in search and in the route fields took seconds, and up to 40 seconds right after the computer started. Now they take a fraction of a second: Kladez reads the indexes ahead in the background and serves them from memory, and suggestions for letters you have already erased no longer hold up the one you need.

- **House numbers on the map** — on every building where they are known, already at medium zoom.
- **Useful places with their own icons:** pharmacies, hospitals, clinics, dentists, police, fire stations, rescue stations, shelters, metro entrances, tram stops, fuel stations, banks and ATMs, places of worship, hotels, kindergartens, markets and malls, parking. Zoomed out, only the most important ones show: hospitals, police, fire stations, metro and fuel.
- **“What's here?” on tap:** tap an icon or a building to see its name, the kind of place (“Pharmacy”), the house number and the nearby street; you can add a marker from there. On a computer the same shows on mouse hover.
- **Map labels in the program's language:** in English, names are shown in English where available.
- **Calmer without internet:** instead of a stack of red “No internet connection” messages — one line “Working without internet — everything already downloaded is available”; a “Loading…” screen instead of a blank one, and “Loading the map…” on the map. Faster to open on a phone: interface files are compressed and cached.
- **The map list updates on slow internet too:** “Refresh list” waits longer and tries right away, without a pause after a previous failure.
- **Detailed maps of the Volga and North-West districts** — in parts (west / centre / east; St Petersburg and west / north). The parts share one search index and one roads file.
- **Route “From” and “To” fields search:** start typing a town and pick the suggestion, then add a comma and the street (“Kazan, Baum”) — only that town’s streets are suggested. A place or coordinates work too; the map flies there.
- **Map sets with a choice:** clicking “Russia”, “Europe” and other sets opens the country and district picker — only what you tick is downloaded. A region counts as downloaded when its detailed or overview map is there: a set no longer pulls overview maps over detailed ones, and “Downloaded” and the size count regions.
- **Find a town by its first letters:** “Kaza” is Kazan even when the map is open on Moscow. Since 0.1.17 towns are no longer lost among hundreds of villages with a similar start.
- **Update check without false alarms:** when there is no newer release, the app says “no updates” instead of “error 404”.
- **Map menu on the right**, like openstreetmap.org: “What is here?” (on by default), “Route”, “Add markers”, “Where am I”, “Coordinates”. A tap on a building or place opens “What is here?” on the left: address, nearby places with distances, district, settlement, region and “Route from / to here”, “Add a marker”.
- **Routes across the whole country:** “Download roads of the whole country” adds roads of regions whose maps you do not have (e.g. the Volga district) so long routes pass through them.
- **Offline routes:** by car, on foot and by bicycle — the line on the map, distance, time and step-by-step directions. Points come from a tap on the map, a marker or a place's hint; routes cross the borders of downloaded districts. Turn them on once with “Enable routes”.
- **Offline map search:** towns and villages, streets and house numbers, kinds of places (“pharmacy”, “hospital”, “fuel”) and their names; the nearest first. The search index downloads together with the map; for maps you already have, use “Download search” in the search box. “What's here?” now shows the exact house address.

{% /release %}

{% release date="9 November 2026" versions="0.1.15, 0.1.14, 0.1.13, 0.1.12, 0.1.11, 0.1.10" %}

- **Kladez is open to everyone.** Download it from the project page on GitHub; “Star on GitHub”, “Report a problem” and “Share” with a link now work.
- **Updates:** the program detects a new version by itself, and “Download the new version” opens its installer.
- **Legal information:** a “Music and video” section — the installer melody and the Brief music were made by the author with Eleven Music.
- **Honest map messages:** “Refresh sets” says so when the list could not be downloaded (no connection or a VPN in the way), and “Estimate size” shows a clear reason instead of “error 500”.
- **“What's new” by day** — this page: a band with the date and versions, and what appeared below it.
- **Maps can be downloaded.** Ready maps are published: Russia by federal district, CIS, Europe, the Middle East, North America. Open Map Management and press “Refresh sets”. The map list now updates by itself; maps are rebuilt fresh every quarter.
- **A lighter program.** The main part takes 0.4 GB instead of 3.2 GB; the installer is 1.2 GB instead of 1.5 GB.
- **Updates clean up after themselves.** The previous version is removed automatically, so the program does not grow with every update.
- **“Delete” in My books** — even in simple mode (on the computer itself only, with a confirmation).
- **Where the files are:** My materials and Map Management show the folder path step by step, with a warning not to move files by hand.
- **“AI instructions”** in the chat.
- **How to help Kladez:** star it on GitHub, share it with friends, thank the author.
- **Settings menu:** a large logo leads home; the API page is localized and has no third-party buttons.
- **File Browser login:** `admin` / `kladez`.

{% /release %}

{% release date="8 November 2026" versions="0.1.9, 0.1.8, 0.1.7" %}

- **The “Brief” video** — a short introduction, for computer and phone.
- **Download percentages** right on set and topic cards; “Downloaded” when done; a clear reason when it fails (no connection, VPN).
- **“Say thanks”** with a QR code and a bank link.
- **“Share” works** — the system share menu on phones, copy to clipboard on computers.
- **Real computer data:** installed memory, disks and real folders.
- **The phone QR code** appears right after the computer starts.
- **Broken buttons fixed:** the logs item is gone, the chat without an AI assistant leads to help, the update check says honestly when it could not check.
- **Ready-made sets** no longer show someone else's download because of shared books.

{% /release %}

{% release date="7 November 2026" versions="0.1.6, 0.1.5, 0.1.4, 0.1.3, 0.1.2" %}

- **Phones at home:** a QR code and address to open Kladez over Wi-Fi; phones are view-only by default.
- **Simple and Advanced modes.**
- **One Library:** My books with “Read”, Add books by topic, article search across all books.
- **Medical Wikipedia** is built in and available right after installation.
- **Help pages in Russian and English.**
- **Installer:** continues after a restart, folder choice, design and music, tested on clean Windows 10 and 11; no empty folders left after removal.

{% /release %}

{% release date="6 November 2026" versions="0.1.1" %}

- **Language switch** “Русский / English”.
- **Offline**, the catalog opens at once.
- **Maps with Russian labels.**
- **The memory check** no longer scares owners of 8 GB computers.

{% /release %}

{% release date="5 November 2026" versions="0.1.0" %}

The first version of Kladez for Windows.

- **The whole interface in Russian.**
- **Installer for Windows 10 and 11.** Nothing is downloaded during installation.
- **Ready-made sets:** First Aid Kit, Library, Everything.
- **A Russian content catalog** that works offline from a saved copy.
- **Maps of any country**, Russia by federal district.
- **Resumable downloads.**
- **AI assistant** on the computer itself.
- **Nothing is sent** to the authors or anyone else.

{% /release %}
