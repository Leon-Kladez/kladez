// «Кладезъ»: tests for LauncherCore (plan Task 8). C# 5 — compiled by the .NET Framework csc.exe.
// Build and run: build-launcher.ps1 -Test. Exit code 0 = all passed.
using System;
using System.Linq;

namespace Kladez.Launcher.Tests
{
    internal static class Program
    {
        private static int failures;

        private static void Check(bool condition, string name)
        {
            Console.WriteLine((condition ? "ok   " : "FAIL ") + name);
            if (!condition) failures++;
        }

        private static int Main()
        {
            // Config parsing: BOM, Cyrillic, defaults.
            var c = KladezConfig.Parse("\uFEFFAdminPort=8180\r\nKiwixPort=8190\r\nLibraryDir=E:\\Мои файлы\\Kladez\\library\r\nSystemDir=E:\\Мои файлы\\Kladez\\system\r\n");
            Check(c.AdminPort == 8180, "ini: AdminPort");
            Check(c.KiwixPort == 8190, "ini: KiwixPort");
            Check(c.LibraryDir == "E:\\Мои файлы\\Kladez\\library", "ini: LibraryDir with BOM and Cyrillic");
            Check(c.SystemDir == "E:\\Мои файлы\\Kladez\\system", "ini: SystemDir");

            var d = KladezConfig.Parse("AdminPort=abc\nKiwixPort=\n# comment\n");
            Check(d.AdminPort == 8080 && d.KiwixPort == 8090, "ini: broken or empty ports fall back to 8080/8090");
            Check(KladezConfig.Parse("").AdminPort == 8080, "ini: empty text → defaults");
            Check(KladezConfig.Parse("AdminPort=70000").AdminPort == 8080, "ini: out-of-range port → default");

            // wsl.exe arguments.
            Check(LauncherCore.WslArgs("keepalive").SequenceEqual(new[] {
                "-d", "Kladez", "-u", "root", "--", "/usr/local/bin/kladez-start", "--keepalive" }), "WslArgs(keepalive)");
            Check(LauncherCore.WslArgs("status").Last() == "--status", "WslArgs(status)");

            // «Не запускать вместе с Windows»: в библиотеке, а без неё — в папке данных.
            Check(LauncherCore.AutostartOffFile(KladezConfig.Parse("LibraryDir=D:\\Kladez\\library"), "C:\\ProgramData")
                == "D:\\Kladez\\library\\.kladez-autostart-off", "AutostartOffFile in the library");
            Check(LauncherCore.AutostartOffFile(KladezConfig.Parse(""), "C:\\ProgramData")
                == "C:\\ProgramData\\Kladez\\autostart-off", "AutostartOffFile without a library");

            // Panel address and health.
            Check(LauncherCore.PanelUrl(KladezConfig.Parse("AdminPort=8180")) == "http://localhost:8180/", "PanelUrl uses AdminPort");
            Check(LauncherCore.HealthUrl(KladezConfig.Parse("")) == "http://localhost:8080/api/health", "HealthUrl");
            Check(LauncherCore.IsHealthy(200), "IsHealthy(200)");
            Check(!LauncherCore.IsHealthy(503), "IsHealthy(503) is false");
            Check(!LauncherCore.IsHealthy(0), "IsHealthy(0) is false");

            // Logs for the help zip: only installer/network/start logs, never library files.
            var logs = LauncherCore.LogFilesToCollect("C:\\ProgramData");
            Check(logs.Length == 3, "LogFilesToCollect: three logs");
            Check(logs.All(p => p.StartsWith("C:\\ProgramData\\Kladez\\logs\\", StringComparison.Ordinal)), "LogFilesToCollect: only Kladez\\logs");
            Check(logs.Contains("C:\\ProgramData\\Kladez\\logs\\setup.log") && logs.Contains("C:\\ProgramData\\Kladez\\logs\\net.log")
                  && logs.Contains("C:\\ProgramData\\Kladez\\logs\\launcher.log"), "LogFilesToCollect: setup, net, launcher");

            // Command line.
            Check(LauncherCore.ParseMode(new string[0]) == LaunchMode.Interactive, "no args → interactive");
            Check(LauncherCore.ParseMode(new[] { "--background" }) == LaunchMode.Background, "--background");
            Check(LauncherCore.ParseMode(new[] { "--stop" }) == LaunchMode.Stop, "--stop");
            Check(LauncherCore.ParseMode(new[] { "--collect-logs" }) == LaunchMode.CollectLogs, "--collect-logs");
            Check(LauncherCore.ParseMode(new[] { "--whatever" }) == LaunchMode.Interactive, "unknown → interactive");

            // Shortcut click while autostart is still starting the program (review I6).
            Check(LauncherCore.PlanInteractive(true, true) == InteractivePlan.OpenNow, "healthy → open browser now");
            Check(LauncherCore.PlanInteractive(false, true) == InteractivePlan.OpenNow, "healthy, autostart running → open now");
            Check(LauncherCore.PlanInteractive(true, false) == InteractivePlan.StartAndWait, "not running → start and wait");
            Check(LauncherCore.PlanInteractive(false, false) == InteractivePlan.WaitOnly, "autostart still starting → wait, do not open a dead page");

            Check(LauncherCore.ParseMode(new[] { "--copy-to-usb" }) == LaunchMode.CopyToUsb, "--copy-to-usb");

            // «Копия на флешку».
            Check(CopyCore.IsSkipped("ru-central_2026-11.pmtiles.part") && CopyCore.IsSkipped("x.TMP"), "copy: partial files skipped");
            Check(!CopyCore.IsSkipped("wikipedia_ru_all_2026-10.zim"), "copy: zim kept");
            Check(CopyCore.Category(@"библиотека\zim\a.zim") == "Книги и справочники", "copy: category books");
            Check(CopyCore.Category(@"библиотека\maps\routes\tiles\2\000\1.gph") == "Дороги для маршрутов", "copy: category routes");
            Check(CopyCore.Category(@"библиотека\maps\search\search-by_2026-11.sqlite") == "Поиск по карте", "copy: category search");
            Check(CopyCore.Category(@"библиотека\maps\pmtiles\by_2026-11.pmtiles") == "Карты", "copy: category maps");
            Check(CopyCore.Category(@"библиотека\ollama\models\blobs\x") == "Модели ИИ-помощника", "copy: category ai");
            Check(CopyCore.Category(@"образы\valhalla.tar.zst") == "Программы маршрутов и ИИ", "copy: category images");
            Check(CopyCore.Category("Kladez-Setup-0.1.26.exe") == "Установщик", "copy: category installer");
            Check(CopyCore.CheckTarget(10, 100L * 1024 * 1024 * 1024, "FAT32", 5L * 1024 * 1024 * 1024).Contains("exFAT"), "copy: FAT32 with a 5 GB file refused");
            Check(CopyCore.CheckTarget(10, 100L * 1024 * 1024 * 1024, "FAT32", 3L * 1024 * 1024 * 1024) == null, "copy: FAT32 with small files ok");
            Check(CopyCore.CheckTarget(60L * 1024 * 1024 * 1024, 50L * 1024 * 1024 * 1024, "exFAT", 1).Contains("не хватает места"), "copy: no space");
            Check(CopyCore.CheckTarget(1L * 1024 * 1024 * 1024, 50L * 1024 * 1024 * 1024, "NTFS", 1) == null, "copy: enough space");
            Check(CopyCore.FormatSize(1610612736L) == "1,5 ГБ", "copy: FormatSize GB");
            Check(CopyCore.InstallerUrl("0.1.26") == "https://github.com/Leon-Kladez/kladez/releases/download/installer-v0.1.26/Kladez-Setup-0.1.26.exe", "copy: installer url");
            string sha = new string('a', 64);
            Check(CopyCore.ShaFor(sha + "  Kladez-Setup-0.1.26.exe\n", "Kladez-Setup-0.1.26.exe") == sha, "copy: sha from SHA256SUMS");
            Check(CopyCore.ShaFor(sha + "  other.exe\n", "Kladez-Setup-0.1.26.exe") == null, "copy: no sha for other file");
            Check(CopyCore.ToWslPath(@"D:\Kladez\library") == "/mnt/d/Kladez/library", "copy: wsl path");
            Check(CopyCore.ManifestText("0.1.26", 3145728L, 7, new DateTime(2026, 11, 17)).Contains("MB=3\r\n"), "copy: manifest MB");
            Check(CopyCore.BytesToWrite(new[] { new CopyItem { Relative = "a", Size = 5 }, new CopyItem { Relative = "b", Size = 7 } },
                r => r == "a" ? 5 : -1) == 7, "copy: files already on the drive are not counted again");

            Console.WriteLine(failures == 0 ? "ALL PASSED" : failures + " FAILED");
            return failures == 0 ? 0 : 1;
        }
    }
}
