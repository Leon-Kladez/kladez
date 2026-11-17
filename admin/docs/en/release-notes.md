# What's new

What appeared in Kladez, day by day. Newest first. How to update — see [Updates](/docs/updates).

{% release date="18 November 2026" versions="0.1.29" %}

- **Route suggestions are fully visible:** in the “From” and “To” fields the list of cities and streets is no longer cut off by the edge of the Route window; it now appears over the map, under the field.
- **Suggestions appear faster:** while you type, Kladez drops the search for the unfinished word and searches the new one right away. Before, a search for the first letters (“Mi”) ran to the end, and suggestions for “Minsk” waited 5–8 seconds.

{% /release %}

{% release date="17 November 2026" versions="0.1.28" %}

- **A new “Brief” video:** shows what Kladez can do now — world maps with search and routes, maps for the road on your phone, copy to a USB drive. Open it with the “Brief” button at the top right.
- **A new generation of AI models:** Qwen 3.5, Gemma 4, DeepSeek-R1 and other recent models replace Qwen 2.5 and Gemma 3; all answer in Russian and English and work offline. Tested on an ordinary computer without a graphics card: the 4B Qwen 3.5 answers as fast as the old light model but is noticeably smarter and understands photos, so Kladez recommends it for ordinary computers. For computers with 32 GB of memory there are “mixture of experts” models (such as Qwen 3.5 35B-A3B): as smart as big models yet fast even without a graphics card. The full model catalog is still there for those who know what they want.
- **An AI assistant for any computer:** Easy Setup now has three rows of models — for an ordinary computer, for a powerful one (including DeepSeek, which “thinks” before answering) and the best in English. Kladez checks memory, processor and graphics card, marks the recommended model and warns when a model will not fit.
- **A model waits for the AI assistant to install:** when a model is chosen together with the assistant itself, downloads show “waiting for the AI assistant to finish installing” instead of an error with a Retry button. It waits up to 4 hours, enough even on slow internet.
- **“Which model to choose”:** Models and settings now offers 10 hand-picked models each for chatting, for code and for understanding pictures, from light to strong. Each shows whether it fits this computer, will be slow or is too big, and one is marked “Recommended”. The chat’s model list also marks which models will answer slowly.
- **A simpler model catalog:** Models and settings now filters “For chatting”, “For code”, “Understand pictures”; each model shows its main sizes (3b, 7b…), with dozens of technical compression variants behind a button. After Install, download progress with percentages shows right in the row, and when the model is ready a “Go to chat” button appears.
- **Faster chat on an ordinary computer:** the model starts loading as soon as the chat opens, not after the first question; on a weak processor two library passages are used instead of five and the conversation “memory” is smaller — the model writes about a quarter faster and no longer reloads mid-conversation (those were 15–20 second pauses). While the assistant thinks, the seconds are shown, and after 15 seconds a note explains why it takes a while.
- **No model — a hint, not an error:** with no model installed, the chat does not let you send a message and explains what to do instead of “The model returned an error”.
- **Save an answer as Word, Excel or PDF:** every answer has «Word» and «PDF» buttons, plus «Excel» when it contains a table. Headings, lists and tables are kept; in Excel numbers stay numbers and each table gets its own sheet. Everything happens on your computer, offline.
- **The knowledge base reads Excel and CSV:** upload .xlsx workbooks (all sheets, dates as dates) and .csv files and the assistant answers from them. The upload area now lists the supported file types.
- **Downloads survive a network hiccup:** if the internet dropped for a minute (or a VPN was switched on and off), Kladez apps could stay “offline” until a restart — models and maps failed with a server-address error. Kladez now watches this once per computer and never removes the workaround apps are already using.

{% /release %}

{% release date="17 November 2026" versions="0.1.27" %}

- **A clear choice of AI assistant:** Easy Setup now offers four hand-picked models that understand Russian, from “Fastest” to “Smartest”, instead of three random catalog models (two too heavy for an ordinary computer, the third not for chatting at all). Kladez checks the computer’s memory and processor, marks the recommended model and warns when a model will be slow or will not fit.
- **The question about preparing materials for the AI, in plain words:** what it is, why, and how long it takes.
- **Percentages during installation:** “Extracting files…” no longer stays at 0% while the bar moves.
- **Tidier Easy Setup:** the country list no longer shows the same “Ready-made maps” badge on every country — only countries without a ready-made map are marked; country names start with a capital; “Size: 3.4 GB” instead of “3.4 GB - 3.4 GB”.

{% /release %}

{% release date="17 November 2026" versions="0.1.26" %}

- **Maps for the road on your phone:** **Settings → Phones** now offers the Organic Maps navigator for Android. The computer downloads it once, and phones in your home install it by QR code straight from the computer, with no app store. Download countries to the phone and it guides you by GPS without internet — by car, on foot or by bike. Details: [Maps on your phone for the road](/docs/travel-maps).
- **Copy to a USB drive:** the Start menu has a new item, **Кладезъ → Копия на флешку**. It writes the installer and everything you downloaded — books, maps, search, roads and AI assistant models — to a USB drive, and the installer on that drive moves the library to another computer by itself, without internet. Routes and the AI assistant switch on there by themselves. Details: [Without internet](/docs/offline).
- **How much space maps take:** Map Management shows how much each map takes together with its search and roads, and the total below the list.
- **Clearer when a page loads slowly:** if Kladez has just started or updated, the “Loading…” screen shows a moving bar and, after a few seconds, a note that it can take up to a minute.
- **No extra folder in the Start menu:** the empty “Kladez” folder Windows creates no longer appears next to “Кладезъ”.

{% /release %}

{% release date="17 November 2026" versions="0.1.25, 0.1.24" %}

- **Maps of the whole world:** Maps now has “Latin America” (Mexico, Central and South America, the Caribbean), “Africa” and “Australia and Oceania”, and Greenland in “North America”. 317 country and region maps in total, large countries in parts (“Brazil: São Paulo”, “Australia: Queensland”). No program update is needed for them — the map list arrives by itself.
- **Search and routes for every map:** all 317 maps have address and place search and car, walking and cycling routes. Roads are built as two large sets — the Old World (Europe, Asia, Africa, Oceania) and the Americas — so routes cross borders: Khartoum → Cairo, Tijuana → San Diego, Buenos Aires → Santiago, if the maps of the countries on the way are downloaded.
- **Roads update by themselves:** downloaded roads were rebuilt together with the whole world — Kladez downloads the new sets when there is internet. The old ones work meanwhile.
- **The installer window can be minimized:** the installer now has a Minimize button — you can do other things while it installs.
- **“What's new” opens again:** in 0.1.24 this help page showed “Server error”.
- **The phone QR code no longer disappears:** if Wi-Fi dropped for a minute while Kladez was starting (reconnecting, VPN), the home page no longer says “Could not find this computer's address” — the address found earlier stays.

{% /release %}

{% release date="13 November 2026" versions="0.1.23, 0.1.22, 0.1.21, 0.1.20, 0.1.19, 0.1.18" %}

- **Search countries and regions by name:** “Belarus”, “China”, “Siberian” in the map search show the downloaded map of the country or region first; clicking it shows the whole of it. Villages with the same name follow below.
- **“Roads of the whole country” means your country only:** with the Belarus map, Kladez no longer offers the roads of Ukraine, Kazakhstan and the whole “CIS and neighbours” set — only regions of the same country.
- **The installer shows it is working right away:** from the first second, a “Kladez is preparing the installation…” window with a moving bar and the music, while the computer is checked; before, nothing was visible for several seconds.
- **The country in every map name:** Russian districts are named “Russia: Central Federal District” in Downloaded maps and in downloads.
- **A downloaded map cannot be chosen again:** in “Choose a region” a map already downloaded in this form cannot be ticked and is not offered for download; an overview map can still be replaced by the detailed one and vice versa.
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
