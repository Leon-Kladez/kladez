// «Кладезъ»: окно «Копия на флешку» (Kladez.exe --copy-to-usb, ярлык в «Пуске»).
// Записывает на выбранный диск папку «Кладезъ»: установщик, библиотеку и программы маршрутов и ИИ,
// чтобы на другом компьютере всё поставилось без интернета. Прерванную копию можно продолжить:
// файлы, которые уже лежат на флешке целиком, второй раз не пишутся.
// C# 5 (csc из .NET Framework 4.8).
using System;
using System.Collections.Generic;
using System.Diagnostics;
using System.Drawing;
using System.IO;
using System.Net;
using System.Security.Cryptography;
using System.Text;
using System.Threading;
using System.Windows.Forms;
using Microsoft.Win32;

namespace Kladez.Launcher
{
    internal sealed class CopyForm : Form
    {
        private static readonly Color Paper = Color.FromArgb(0xF6, 0xEF, 0xE0);
        private static readonly Color Ink = Color.FromArgb(0x42, 0x44, 0x20);

        private readonly KladezConfig config;
        private readonly string version;
        private readonly ComboBox drives = new ComboBox();
        private readonly Label summary = new Label();
        private readonly Label status = new Label();
        private readonly ProgressBar bar = new ProgressBar();
        private readonly Button start = new Button();
        private readonly Button close = new Button();
        private List<CopyItem> library = new List<CopyItem>();
        private Thread worker;
        private volatile bool cancel;
        private string targetRoot;   // папка «Кладезъ» на флешке — на время записи (поток записи не трогает окно)

        public CopyForm(KladezConfig config)
        {
            this.config = config;
            version = InstalledVersion();
            Text = "Кладезъ — копия на флешку";
            FormBorderStyle = FormBorderStyle.FixedSingle;
            MaximizeBox = false;
            StartPosition = FormStartPosition.CenterScreen;
            ClientSize = new Size(560, 440);
            BackColor = Paper;
            Font = new Font("Segoe UI", 10f);
            ForeColor = Ink;

            var title = new Label
            {
                Text = "Копия «Кладезя» на флешку",
                Font = new Font("Segoe UI", 14f, FontStyle.Bold),
                Location = new Point(20, 16),
                AutoSize = true,
            };
            var intro = new Label
            {
                Text = "На флешку запишется установщик и всё скачанное: книги, карты, поиск, дороги и модели " +
                       "ИИ-помощника. С неё «Кладезъ» ставится на другой компьютер без интернета.",
                Location = new Point(20, 52),
                Size = new Size(520, 64),
            };
            var pick = new Label { Text = "Куда записать:", Location = new Point(20, 126), AutoSize = true };
            drives.DropDownStyle = ComboBoxStyle.DropDownList;
            drives.Location = new Point(20, 150);
            drives.Size = new Size(400, 28);
            drives.SelectedIndexChanged += delegate { UpdateSummary(); };
            var refresh = new Button { Text = "Обновить", Location = new Point(430, 148), Size = new Size(110, 30) };
            refresh.Click += delegate { FillDrives(); };

            summary.Location = new Point(20, 190);
            summary.Size = new Size(520, 130);
            bar.Location = new Point(20, 328);
            bar.Size = new Size(520, 18);
            status.Location = new Point(20, 352);
            status.Size = new Size(520, 40);

            start.Text = "Записать на флешку";
            start.Location = new Point(250, 398);
            start.Size = new Size(170, 32);
            start.BackColor = Ink;
            start.ForeColor = Color.White;
            start.FlatStyle = FlatStyle.Flat;
            start.Click += delegate { Start(); };
            close.Text = "Закрыть";
            close.Location = new Point(430, 398);
            close.Size = new Size(110, 32);
            close.Click += delegate { Close(); };

            Controls.AddRange(new Control[] { title, intro, pick, drives, refresh, summary, bar, status, start, close });
            FormClosing += OnClosing;
            Shown += delegate { Prepare(); };
        }

        // ── Подготовка: что копировать и куда ────────────────────────────────────

        private void Prepare()
        {
            if (string.IsNullOrEmpty(version))
            {
                status.Text = "Не нашёл установленный «Кладезъ» — переустановите программу.";
                start.Enabled = false;
                return;
            }
            status.Text = "Считаю, что лежит в библиотеке…";
            Cursor = Cursors.WaitCursor;
            var t = new Thread(delegate ()
            {
                List<CopyItem> items;
                try { items = CopyCore.PlanLibrary(config.LibraryDir); }
                catch (Exception) { items = new List<CopyItem>(); }
                BeginInvoke(new Action(delegate
                {
                    library = items;
                    Cursor = Cursors.Default;
                    status.Text = "";
                    FillDrives();
                }));
            });
            t.IsBackground = true;
            t.Start();
        }

        private sealed class DriveChoice
        {
            public DriveInfo Drive;
            public string Label;
            public override string ToString() { return Label; }
        }

        private void FillDrives()
        {
            drives.Items.Clear();
            string libRoot = string.IsNullOrEmpty(config.LibraryDir) ? "" : Path.GetPathRoot(config.LibraryDir).ToUpperInvariant();
            string sysRoot = Path.GetPathRoot(Environment.SystemDirectory).ToUpperInvariant();
            var list = new List<DriveChoice>();
            foreach (var d in DriveInfo.GetDrives())
            {
                try
                {
                    if (!d.IsReady) continue;
                    if (d.DriveType != DriveType.Removable && d.DriveType != DriveType.Fixed) continue;
                    string root = d.RootDirectory.FullName.ToUpperInvariant();
                    if (root == libRoot || root == sysRoot) continue;
                    string kind = d.DriveType == DriveType.Removable ? "флешка" : "диск";
                    string name = string.IsNullOrEmpty(d.VolumeLabel) ? kind : d.VolumeLabel + ", " + kind;
                    list.Add(new DriveChoice
                    {
                        Drive = d,
                        Label = d.Name.TrimEnd('\\') + " — " + name + ", свободно " + CopyCore.FormatSize(d.AvailableFreeSpace) +
                                " из " + CopyCore.FormatSize(d.TotalSize) + " (" + d.DriveFormat + ")",
                    });
                }
                catch (IOException) { }
                catch (UnauthorizedAccessException) { }
            }
            // Флешки — первыми.
            list.Sort(delegate (DriveChoice a, DriveChoice b)
            {
                int ka = a.Drive.DriveType == DriveType.Removable ? 0 : 1;
                int kb = b.Drive.DriveType == DriveType.Removable ? 0 : 1;
                return ka != kb ? ka - kb : string.CompareOrdinal(a.Drive.Name, b.Drive.Name);
            });
            foreach (var c in list) drives.Items.Add(c);
            if (drives.Items.Count > 0) drives.SelectedIndex = 0;
            else
            {
                summary.Text = "Флешка не найдена. Вставьте флешку или внешний диск и нажмите «Обновить».";
                start.Enabled = false;
            }
        }

        private DriveChoice Selected()
        {
            return drives.SelectedItem as DriveChoice;
        }

        private string TargetRoot()
        {
            var c = Selected();
            return c == null ? null : Path.Combine(c.Drive.RootDirectory.FullName, CopyCore.RootFolder);
        }

        private long ExistingSize(string relative)
        {
            string root = targetRoot ?? TargetRoot();
            if (root == null) return -1;
            var f = new FileInfo(Path.Combine(root, relative));
            return f.Exists ? f.Length : -1;
        }

        private void UpdateSummary()
        {
            var c = Selected();
            if (c == null) return;
            var byCategory = new SortedDictionary<string, long>();
            foreach (var i in library)
            {
                string cat = CopyCore.Category(i.Relative);
                long have;
                byCategory.TryGetValue(cat, out have);
                byCategory[cat] = have + i.Size;
            }
            var sb = new StringBuilder("Будет записано:\n");
            if (byCategory.Count == 0) sb.Append("  в библиотеке пока ничего не скачано — запишется только установщик\n");
            foreach (var kv in byCategory) sb.Append("  ").Append(kv.Key).Append(" — ").Append(CopyCore.FormatSize(kv.Value)).Append('\n');
            sb.Append("  Установщик «Кладезъ» ").Append(version).Append(" — около 1,2 ГБ\n");
            sb.Append("  Программы маршрутов и ИИ, если они стоят, — до 4 ГБ");
            summary.Text = sb.ToString();

            long need = CopyCore.BytesToWrite(library, ExistingSize) + 1300L * 1024 * 1024;
            string problem;
            try { problem = CopyCore.CheckTarget(need, c.Drive.AvailableFreeSpace, c.Drive.DriveFormat, CopyCore.LargestFile(library)); }
            catch (IOException) { problem = "Флешка недоступна — вставьте её снова и нажмите «Обновить»."; }
            status.Text = problem ?? "";
            status.ForeColor = problem == null ? Ink : Color.FromArgb(0xA0, 0x2C, 0x1E);
            start.Enabled = problem == null;
        }

        // ── Запись ──────────────────────────────────────────────────────────────

        private void Start()
        {
            string root = TargetRoot();
            if (root == null) return;
            targetRoot = root;
            cancel = false;
            start.Enabled = false;
            drives.Enabled = false;
            close.Text = "Остановить";
            bar.Value = 0;
            worker = new Thread(delegate () { Run(root); });
            worker.IsBackground = true;
            worker.Start();
        }

        private void OnClosing(object sender, FormClosingEventArgs e)
        {
            if (worker == null || !worker.IsAlive) return;
            var answer = MessageBox.Show(this,
                "Остановить запись? Уже записанное останется на флешке — потом можно продолжить с того же места.",
                "Кладезъ", MessageBoxButtons.YesNo, MessageBoxIcon.Question);
            if (answer != DialogResult.Yes) { e.Cancel = true; return; }
            cancel = true;
            worker.Join(15000);
        }

        private void Ui(Action a)
        {
            try { if (IsHandleCreated && !IsDisposed) BeginInvoke(a); }
            catch (InvalidOperationException) { }
        }

        private void Say(string text)
        {
            Ui(delegate { status.ForeColor = Ink; status.Text = text; });
        }

        private void Run(string root)
        {
            string tempDir = Path.Combine(config.LibraryDir, CopyCore.TempFolder);
            try
            {
                Directory.CreateDirectory(root);
                // 1. Установщик.
                string installer = Path.Combine(root, CopyCore.InstallerFileName(version));
                if (!File.Exists(installer)) GetInstaller(installer);
                if (cancel) return;

                // 2. Программы маршрутов и ИИ: их образов нет в установщике, без интернета их не поставить.
                var images = SaveImages(tempDir);
                if (cancel) return;

                // 3. Библиотека и образы — с ходом записи.
                var items = new List<CopyItem>(library);
                items.AddRange(images);
                long total = CopyCore.BytesToWrite(items, ExistingSize);
                long done = 0;
                int n = 0;
                foreach (var item in items)
                {
                    if (cancel) return;
                    n++;
                    string dest = Path.Combine(root, item.Relative);
                    if (ExistingSize(item.Relative) == item.Size) continue;
                    string label = "Записываю " + CopyCore.Category(item.Relative).ToLowerInvariant() + " (" + n + " из " + items.Count + ")";
                    long before = done;
                    CopyFile(item.Source, dest, delegate (long copied)
                    {
                        long now = before + copied;
                        int pct = total > 0 ? (int)Math.Min(100, now * 100 / total) : 100;
                        Ui(delegate
                        {
                            bar.Value = pct;
                            status.ForeColor = Ink;
                            status.Text = label + " — " + pct + " %, записано " + CopyCore.FormatSize(now) + " из " + CopyCore.FormatSize(total);
                        });
                    });
                    done += item.Size;
                }

                // 4. Сведения для установщика на другом компьютере и памятка.
                File.WriteAllText(Path.Combine(root, CopyCore.ManifestFile),
                    CopyCore.ManifestText(version, CopyCore.TotalSize(library), library.Count, DateTime.Now), Encoding.Unicode);
                File.WriteAllText(Path.Combine(root, CopyCore.HowToFile), CopyCore.HowToText(version), Encoding.UTF8);
                Ui(delegate
                {
                    bar.Value = 100;
                    status.ForeColor = Ink;
                    status.Text = "Готово! На флешке папка «Кладезъ». На другом компьютере запустите в ней " +
                                  CopyCore.InstallerFileName(version) + ".";
                    close.Text = "Закрыть";
                    drives.Enabled = true;
                });
            }
            catch (Exception ex)
            {
                Ui(delegate
                {
                    status.ForeColor = Color.FromArgb(0xA0, 0x2C, 0x1E);
                    status.Text = "Запись остановилась: " + ex.Message + " Нажмите «Записать на флешку» ещё раз — продолжу с того же места.";
                    close.Text = "Закрыть";
                    drives.Enabled = true;
                    start.Enabled = true;
                });
            }
            finally
            {
                targetRoot = null;
                try { if (Directory.Exists(tempDir)) Directory.Delete(tempDir, true); } catch (IOException) { } catch (UnauthorizedAccessException) { }
                if (cancel) Ui(delegate { close.Text = "Закрыть"; });
            }
        }

        /// <summary>Установщик: из «Загрузок» (туда его кладёт «Скачать новую версию»), иначе — с GitHub.</summary>
        private void GetInstaller(string dest)
        {
            string downloads = Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.UserProfile), "Downloads");
            foreach (string name in CopyCore.InstallerCandidates(version))
            {
                string local = Path.Combine(downloads, name);
                if (!File.Exists(local)) continue;
                Say("Записываю установщик из папки «Загрузки»…");
                CopyFile(local, dest, delegate (long c) { });
                return;
            }
            Say("Скачиваю установщик «Кладезъ» " + version + " (около 1,2 ГБ)…");
            ServicePointManager.SecurityProtocol = SecurityProtocolType.Tls12;
            string sums;
            using (var wc = new WebClient()) sums = wc.DownloadString(CopyCore.SumsUrl(version));
            string want = CopyCore.ShaFor(sums, CopyCore.InstallerFileName(version));
            if (want == null) throw new IOException("на GitHub нет установщика версии " + version + ".");
            string part = dest + ".part";
            var request = (HttpWebRequest)WebRequest.Create(CopyCore.InstallerUrl(version));
            request.Timeout = 30000;
            using (var response = request.GetResponse())
            using (var input = response.GetResponseStream())
            using (var output = new FileStream(part, FileMode.Create, FileAccess.Write))
            {
                long length = response.ContentLength;
                var buffer = new byte[1 << 20];
                long got = 0;
                int read;
                while ((read = input.Read(buffer, 0, buffer.Length)) > 0)
                {
                    if (cancel) return;
                    output.Write(buffer, 0, read);
                    got += read;
                    if (length > 0)
                    {
                        int pct = (int)(got * 100 / length);
                        long g = got;
                        Ui(delegate { bar.Value = pct; status.Text = "Скачиваю установщик: " + pct + " %, " + CopyCore.FormatSize(g); });
                    }
                }
            }
            Say("Проверяю скачанный установщик…");
            if (Sha256(part) != want)
            {
                File.Delete(part);
                throw new IOException("установщик скачался с ошибкой.");
            }
            if (File.Exists(dest)) File.Delete(dest);
            File.Move(part, dest);
        }

        /// <summary>Образы программ маршрутов и ИИ из Docker внутри «Кладезя» — во временную папку библиотеки.</summary>
        private List<CopyItem> SaveImages(string tempDir)
        {
            var result = new List<CopyItem>();
            string wslTemp = CopyCore.ToWslPath(tempDir);
            if (wslTemp == null) return result;
            Directory.CreateDirectory(tempDir);
            var wanted = new[] { new[] { "nomad_valhalla", "valhalla", "программу маршрутов" }, new[] { "nomad_ollama", "ollama", "программу ИИ-помощника" } };
            foreach (var w in wanted)
            {
                if (cancel) break;
                string file = Path.Combine(tempDir, w[1] + ".tar.zst");
                string target = Path.Combine(targetRoot, CopyCore.ImagesFolder, w[1] + ".tar.zst");
                Say("Готовлю " + w[2] + " — это несколько минут…");
                string script = "IMG=$(docker inspect -f '{{.Config.Image}}' " + w[0] + " 2>/dev/null) || exit 3; " +
                                "docker save ${IMG:?} | zstd -T0 -3 -q -f -o '" + wslTemp + "/" + w[1] + ".tar.zst'";
                // Уже есть на флешке (продолжение прерванной копии) — не готовим заново.
                if (File.Exists(target) && new FileInfo(target).Length > 0)
                {
                    result.Add(new CopyItem { Source = target, Relative = CopyCore.ImagesFolder + "\\" + w[1] + ".tar.zst", Size = new FileInfo(target).Length });
                    continue;
                }
                int code = RunWsl(new[] { "-d", LauncherCore.DistroName, "-u", "root", "--", "sh", "-c", script });
                if (code == 0 && File.Exists(file) && new FileInfo(file).Length > 0)
                    result.Add(new CopyItem { Source = file, Relative = CopyCore.ImagesFolder + "\\" + w[1] + ".tar.zst", Size = new FileInfo(file).Length });
            }
            return result;
        }

        private static int RunWsl(string[] args)
        {
            var psi = new ProcessStartInfo("wsl.exe", LauncherCore.JoinArgs(args))
            {
                UseShellExecute = false,
                CreateNoWindow = true,
                WindowStyle = ProcessWindowStyle.Hidden,
            };
            try
            {
                using (var p = Process.Start(psi))
                {
                    if (p == null) return -1;
                    p.WaitForExit(60 * 60 * 1000);
                    return p.HasExited ? p.ExitCode : -1;
                }
            }
            catch (Exception) { return -1; }
        }

        /// <summary>Копия файла кусками по 4 МБ — с ходом записи; сначала в .part, потом переименование.</summary>
        private void CopyFile(string source, string dest, Action<long> progress)
        {
            if (source == dest) return;
            Directory.CreateDirectory(Path.GetDirectoryName(dest));
            string part = dest + ".part";
            var buffer = new byte[4 << 20];
            using (var input = new FileStream(source, FileMode.Open, FileAccess.Read, FileShare.ReadWrite, 1 << 16))
            using (var output = new FileStream(part, FileMode.Create, FileAccess.Write, FileShare.None, 1 << 16))
            {
                long copied = 0;
                int read;
                var tick = Environment.TickCount;
                while ((read = input.Read(buffer, 0, buffer.Length)) > 0)
                {
                    if (cancel) break;
                    output.Write(buffer, 0, read);
                    copied += read;
                    if (Environment.TickCount - tick > 300) { progress(copied); tick = Environment.TickCount; }
                }
                progress(copied);
            }
            if (cancel) { try { File.Delete(part); } catch (IOException) { } return; }
            if (File.Exists(dest)) File.Delete(dest);
            File.Move(part, dest);
        }

        private static string Sha256(string path)
        {
            using (var sha = SHA256.Create())
            using (var f = File.OpenRead(path))
            {
                var sb = new StringBuilder();
                foreach (byte b in sha.ComputeHash(f)) sb.Append(b.ToString("x2"));
                return sb.ToString();
            }
        }

        /// <summary>Версия установленного «Кладезя» — из записи Windows об установленных программах.</summary>
        private static string InstalledVersion()
        {
            const string key = @"SOFTWARE\Microsoft\Windows\CurrentVersion\Uninstall\{4144DCC6-736C-4B79-B6A7-D0992AF26718}_is1";
            foreach (var view in new[] { RegistryView.Registry64, RegistryView.Registry32 })
            {
                try
                {
                    using (var hklm = RegistryKey.OpenBaseKey(RegistryHive.LocalMachine, view))
                    using (var k = hklm.OpenSubKey(key))
                    {
                        var v = k == null ? null : k.GetValue("DisplayVersion") as string;
                        if (!string.IsNullOrEmpty(v)) return v.Trim();
                    }
                }
                catch (Exception) { }
            }
            return null;
        }
    }
}
