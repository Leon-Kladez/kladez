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

            Console.WriteLine(failures == 0 ? "ALL PASSED" : failures + " FAILED");
            return failures == 0 ? 0 : 1;
        }
    }
}
