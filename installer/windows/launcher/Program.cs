// «Кладезъ»: Kladez.exe — starts the program hidden and opens the browser (spec Б7, plan Task 8).
//   Kladez.exe                 shortcut: start if needed, show progress, open the browser
//   Kladez.exe --background    autostart at logon: same, no windows, no browser
//   Kladez.exe --stop          stop the programs inside Kladez
//   Kladez.exe --collect-logs  save a zip with our logs to the desktop (for asking for help)
using System;
using System.Diagnostics;
using System.Drawing;
using System.IO;
using System.IO.Compression;
using System.Net;
using System.Threading;
using System.Windows.Forms;

namespace Kladez.Launcher
{
    internal static class Program
    {
        private static readonly string ProgramData = Environment.GetFolderPath(Environment.SpecialFolder.CommonApplicationData);
        private static readonly TimeSpan StartTimeout = TimeSpan.FromMinutes(5);

        [STAThread]
        private static int Main(string[] args)
        {
            var mode = LauncherCore.ParseMode(args);
            bool created;
            using (var mutex = new Mutex(true, "Global\\KladezLauncher", out created))
            {
                var config = KladezConfig.Load(Path.Combine(LauncherCore.KladezDataDir(ProgramData), "kladez.ini"));
                switch (mode)
                {
                    case LaunchMode.Stop:
                        RunWsl(LauncherCore.WslArgs("stop"), false);
                        return 0;
                    case LaunchMode.CollectLogs:
                        return CollectLogs();
                    case LaunchMode.Background:
                        if (!created) return 0;
                        return StartAndWait(config) ? 0 : 1;
                    default:
                        Application.EnableVisualStyles();
                        var plan = LauncherCore.PlanInteractive(created, IsRunning(config));
                        if (plan == InteractivePlan.OpenNow)
                        {
                            OpenBrowser(config);
                            return 0;
                        }
                        return Interactive(config, plan == InteractivePlan.StartAndWait);
                }
            }
        }

        private static int Interactive(KladezConfig config, bool startStack)
        {
            bool ok = false;
            using (var form = new ProgressForm())
            {
                var worker = new Thread(() =>
                {
                    ok = startStack ? StartAndWait(config) : WaitHealthy(config);
                    form.BeginInvoke(new Action(form.Close));
                });
                worker.IsBackground = true;
                form.Shown += (s, e) => worker.Start();
                Application.Run(form);
            }
            if (ok)
            {
                OpenBrowser(config);
                return 0;
            }
            var answer = MessageBox.Show(
                "Не удалось запустить «Кладезъ».\n\nПерезагрузите компьютер и попробуйте ещё раз.\n\n" +
                "Если не помогло — нажмите «Да», чтобы собрать сведения для помощи: на рабочем столе появится файл, " +
                "который можно отправить тому, кто помогает вам с компьютером.",
                "Кладезъ", MessageBoxButtons.YesNo, MessageBoxIcon.Warning);
            if (answer == DialogResult.Yes) CollectLogs();
            return 1;
        }

        private static bool StartAndWait(KladezConfig config)
        {
            Log("start");
            // keepalive never returns while the program runs: it keeps the distro alive.
            RunWsl(LauncherCore.WslArgs("keepalive"), true);
            RunHidden("schtasks.exe", new[] { "/run", "/tn", LauncherCore.NetworkTaskName }, false);
            return WaitHealthy(config);
        }

        private static bool WaitHealthy(KladezConfig config)
        {
            var deadline = DateTime.UtcNow + StartTimeout;
            while (DateTime.UtcNow < deadline)
            {
                if (IsHealthy(config)) { Log("healthy"); return true; }
                Thread.Sleep(2000);
            }
            Log("health timeout");
            return false;
        }

        private static bool IsRunning(KladezConfig config)
        {
            return IsHealthy(config);
        }

        private static bool IsHealthy(KladezConfig config)
        {
            try
            {
                var request = (HttpWebRequest)WebRequest.Create(LauncherCore.HealthUrl(config));
                request.Timeout = 3000;
                request.Proxy = null; // never send localhost through a system proxy/VPN
                using (var response = (HttpWebResponse)request.GetResponse())
                    return LauncherCore.IsHealthy((int)response.StatusCode);
            }
            catch (WebException)
            {
                return false;
            }
        }

        private static void RunWsl(string[] args, bool detach)
        {
            RunHidden("wsl.exe", args, detach);
        }

        private static void RunHidden(string file, string[] args, bool detach)
        {
            var psi = new ProcessStartInfo(file, LauncherCore.JoinArgs(args))
            {
                UseShellExecute = false,
                CreateNoWindow = true,
                WindowStyle = ProcessWindowStyle.Hidden,
            };
            try
            {
                var p = Process.Start(psi);
                if (!detach && p != null) p.WaitForExit(60000);
            }
            catch (Exception ex)
            {
                Log(file + " failed: " + ex.Message);
            }
        }

        private static void OpenBrowser(KladezConfig config)
        {
            Process.Start(new ProcessStartInfo(LauncherCore.PanelUrl(config)) { UseShellExecute = true });
        }

        private static int CollectLogs()
        {
            string desktop = Environment.GetFolderPath(Environment.SpecialFolder.DesktopDirectory);
            string zip = Path.Combine(desktop, "Кладезъ-сведения-" + DateTime.Now.ToString("yyyy-MM-dd-HHmm") + ".zip");
            using (var archive = ZipFile.Open(zip, ZipArchiveMode.Create))
            {
                foreach (var file in LauncherCore.LogFilesToCollect(ProgramData))
                    if (File.Exists(file)) archive.CreateEntryFromFile(file, Path.GetFileName(file));
            }
            MessageBox.Show("Сведения сохранены на рабочий стол:\n" + Path.GetFileName(zip), "Кладезъ",
                MessageBoxButtons.OK, MessageBoxIcon.Information);
            return 0;
        }

        private static void Log(string text)
        {
            try
            {
                string dir = Path.Combine(LauncherCore.KladezDataDir(ProgramData), "logs");
                Directory.CreateDirectory(dir);
                File.AppendAllText(Path.Combine(dir, "launcher.log"),
                    "[" + DateTime.Now.ToString("yyyy-MM-dd HH:mm:ss") + "] " + text + "\r\n");
            }
            catch (IOException) { }
            catch (UnauthorizedAccessException) { }
        }
    }

    internal sealed class ProgressForm : Form
    {
        public ProgressForm()
        {
            Text = "Кладезъ";
            FormBorderStyle = FormBorderStyle.FixedDialog;
            MaximizeBox = false;
            MinimizeBox = false;
            StartPosition = FormStartPosition.CenterScreen;
            ClientSize = new Size(420, 120);
            BackColor = Color.FromArgb(0xF6, 0xEF, 0xE0);
            var label = new Label
            {
                Text = "Запускаю «Кладезъ»…\nПервый запуск после включения компьютера занимает до пяти минут.",
                ForeColor = Color.FromArgb(0x5A, 0x3B, 0x12),
                Font = new Font("Segoe UI", 10f),
                Location = new Point(20, 18),
                Size = new Size(380, 48),
            };
            var bar = new ProgressBar { Style = ProgressBarStyle.Marquee, Location = new Point(20, 78), Size = new Size(380, 20) };
            Controls.Add(label);
            Controls.Add(bar);
        }
    }
}
