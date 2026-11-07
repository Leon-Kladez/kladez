# Apps from the depot

In the **[App depot](/supply-depot)** you can add extra apps to Kladez. Each one runs on this computer, without internet. When an app has installed, its card shows an **Open** button.

This page briefly covers how to get started with each app: whether you need to log in, the first-time password and where the files live. How to use the app itself is on its own website (links below).

## Managing apps

Every installed app has a **Manage** menu on its card:

- **Docs** — opens this page at the app's section.
- **Edit** — the app's settings: ports, folders, environment variables, memory limits. Rarely needed.
- **Logs** and **Stats** — what the app reports about itself and how much memory it uses. Useful when something is wrong.
- **Update** and **Remove**. If an app fails to start after an update, Kladez rolls back to the previous version automatically.

## Your own app

Experienced users can add their own app (a Docker container) from the App depot. Kladez runs it, but there is no help or support for it — see the app's own documentation.

## Stirling PDF {% #stirling-pdf %}

Everything for PDF files: merge, split, compress, rotate, recognise text in scans, add or remove passwords.

**Login:** none, it opens straight away.

**Files:** you pick a PDF from your own device (“Open from computer”) and download the result back. Nothing is stored on the Kladez computer.

Website: [stirlingpdf.com](https://stirlingpdf.com)

## File Browser {% #file-browser %}

Browse the Kladez files in your browser: upload, download, rename, delete.

**Login:** username `admin`, password `nomad`. **Change the password right away** (Settings → Profile): it is the same for everyone who installs the app, so anyone on your network could log in.

**Careful:** this deletes real files. The internal folders (AI models, search index) are hidden so they cannot be erased by accident.

Website: [filebrowser.org](https://filebrowser.org)

## Calibre-Web {% #calibre-web %}

A home e-book library: read in the browser, search, organise on shelves.

**Login:** username `admin`, password `admin123`. **Change the password** after logging in (click `admin` at the top right → Edit).

**Adding books:** uploading through the web page is off at first. Turn it on: **Admin** (top right) → basic configuration → allow uploads. An Upload button appears.

Website: [github.com/janeczku/calibre-web](https://github.com/janeczku/calibre-web)

## IT Tools {% #it-tools %}

A set of small tools for technical tasks: encoding converters, password generator, QR codes and much more.

**Login:** none. The app stores nothing.

Website: [it-tools.tech](https://it-tools.tech)

## Excalidraw {% #excalidraw %}

A whiteboard for hand-drawn diagrams: plans, sketches, schemes.

**Login:** none. Drawings are stored **in your browser**. To keep a drawing safe, save it to a file (menu → Save).

Website: [excalidraw.com](https://excalidraw.com)

## Homebox {% #homebox %}

An inventory of household items and supplies: what is where, how much is left, expiry dates.

**Login:** on first open click **Register** and create an account (email and a strong password). The first account is the owner.

Website: [homebox.software](https://homebox.software)

## Vaultwarden {% #vaultwarden %}

A password vault compatible with the Bitwarden apps.

**On first open your browser warns about an insecure connection.** That is expected: a password vault needs a secure connection, and Kladez creates one for your home network itself. Click “Advanced” → “Proceed”.

**Login:** click **Create account** and set an email and a master password.

{% callout type="warning" title="The master password cannot be recovered" %}
If you forget it, the vault can never be opened again. Write the password on paper and keep it somewhere safe.
{% /callout %}

Website: [github.com/dani-garcia/vaultwarden](https://github.com/dani-garcia/vaultwarden)

## Jellyfin {% #jellyfin %}

A home cinema: films, music and photos — on the computer and on phones at home.

**First start:** a short wizard — language, administrator account (choose a strong password), media folders.

On a weak computer some videos may stutter: the app has to convert them on the fly.

Website: [jellyfin.org](https://jellyfin.org)

## Meshtastic Web {% #meshtastic-web %}

A control panel for Meshtastic radios — text messaging over kilometres with no internet or mobile network.

**You need the radio itself.** Without one the app shows “no devices connected”.

**How to connect:** click **New Connection** → **HTTP** and enter the radio's address on your Wi-Fi network. Bluetooth and USB do not work here: browsers only allow them on secure pages.

Website: [meshtastic.org](https://meshtastic.org)

## Education platform (Kolibri) {% #kolibri %}

Video lessons, exercises and progress tracking — for school and self-study, without internet.

**First start:** a short wizard — facility type and administrator account (write the password down).

**Adding lessons:** **Device → Channels → Import**. Lessons are downloaded from the internet as channels; take only the ones you need — there are many and they are large.

Website: [learningequality.org/kolibri](https://learningequality.org/kolibri)

## MeshCore Web {% #meshcore-web %}

A control panel for MeshCore radios — another way to message without internet.

**You need the radio itself.** It connects to the computer you are sitting at, over USB or Bluetooth. Works best in Chrome or Edge.

**On first open your browser warns about an insecure connection** — that is expected, click “Advanced” → “Proceed”.

Website: [meshcore.io](https://meshcore.io)

## Translated library {% #offline-translation %}

Translates library articles into another language on this computer, without internet. Open an article and a **Translate this page** bar appears at the top with a button for each language and an **Original** button.

**Languages:** French, Spanish and German by default. To change the list: Manage → Edit → in the `TRANSLATE_LANGS` variable list language codes separated by commas (for example `en,uk,de`) → Save. Each new language needs internet and 45–140 MB of space.

**The translation is machine-made and literal.** It conveys the meaning well, but for medical and safety wording check the original.

Tables, the tab title and search results are not translated.
