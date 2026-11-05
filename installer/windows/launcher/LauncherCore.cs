// «Кладезъ»: pure helpers of the launcher (plan Task 8). No WinForms here — tested by LauncherTests.cs.
// C# 5: compiled by csc.exe of .NET Framework 4.8, which every Windows 10 1903+ and 11 already has.
using System;
using System.IO;

namespace Kladez.Launcher
{
    public enum LaunchMode { Interactive, Background, Stop, CollectLogs }

    public enum InteractivePlan { OpenNow, StartAndWait, WaitOnly }

    public sealed class KladezConfig
    {
        public const int DefaultAdminPort = 8080;
        public const int DefaultKiwixPort = 8090;

        public int AdminPort { get; private set; }
        public int KiwixPort { get; private set; }
        public string LibraryDir { get; private set; }
        public string SystemDir { get; private set; }

        private KladezConfig()
        {
            AdminPort = DefaultAdminPort;
            KiwixPort = DefaultKiwixPort;
            LibraryDir = "";
            SystemDir = "";
        }

        /// <summary>kladez.ini written by the installer: Key=Value lines, UTF-8, maybe with BOM.</summary>
        public static KladezConfig Parse(string iniText)
        {
            var config = new KladezConfig();
            if (string.IsNullOrEmpty(iniText)) return config;
            foreach (var raw in iniText.TrimStart('﻿').Split('\n'))
            {
                var line = raw.Trim();
                if (line.Length == 0 || line[0] == '#' || line[0] == ';') continue;
                int eq = line.IndexOf('=');
                if (eq <= 0) continue;
                string key = line.Substring(0, eq).Trim();
                string value = line.Substring(eq + 1).Trim();
                switch (key)
                {
                    case "AdminPort": config.AdminPort = ParsePort(value, DefaultAdminPort); break;
                    case "KiwixPort": config.KiwixPort = ParsePort(value, DefaultKiwixPort); break;
                    case "LibraryDir": config.LibraryDir = value; break;
                    case "SystemDir": config.SystemDir = value; break;
                }
            }
            return config;
        }

        public static KladezConfig Load(string path)
        {
            return File.Exists(path) ? Parse(File.ReadAllText(path)) : Parse("");
        }

        private static int ParsePort(string value, int fallback)
        {
            int port;
            return int.TryParse(value, out port) && port > 0 && port < 65536 ? port : fallback;
        }
    }

    public static class LauncherCore
    {
        public const string DistroName = "Kladez";
        public const string NetworkTaskName = "Кладезъ — сеть";

        public static string[] WslArgs(string mode)
        {
            return new[] { "-d", DistroName, "-u", "root", "--", "/usr/local/bin/kladez-start", "--" + mode };
        }

        public static string PanelUrl(KladezConfig config)
        {
            return "http://localhost:" + config.AdminPort + "/";
        }

        public static string HealthUrl(KladezConfig config)
        {
            return "http://localhost:" + config.AdminPort + "/api/health";
        }

        public static bool IsHealthy(int httpStatus)
        {
            return httpStatus == 200;
        }

        public static string KladezDataDir(string programData)
        {
            return Path.Combine(programData, "Kladez");
        }

        /// <summary>Only our own logs go into the help zip — never anything from the library.</summary>
        public static string[] LogFilesToCollect(string programData)
        {
            string logs = Path.Combine(KladezDataDir(programData), "logs");
            return new[] { Path.Combine(logs, "setup.log"), Path.Combine(logs, "net.log"), Path.Combine(logs, "launcher.log") };
        }

        /// <summary>
        /// Shortcut click. ownsMutex = no other Kladez.exe (e.g. autostart) is running.
        /// If autostart is still starting the program, wait with it instead of opening a dead page.
        /// </summary>
        public static InteractivePlan PlanInteractive(bool ownsMutex, bool healthy)
        {
            if (healthy) return InteractivePlan.OpenNow;
            return ownsMutex ? InteractivePlan.StartAndWait : InteractivePlan.WaitOnly;
        }

        public static LaunchMode ParseMode(string[] args)
        {
            if (args == null || args.Length == 0) return LaunchMode.Interactive;
            switch (args[0])
            {
                case "--background": return LaunchMode.Background;
                case "--stop": return LaunchMode.Stop;
                case "--collect-logs": return LaunchMode.CollectLogs;
                default: return LaunchMode.Interactive;
            }
        }

        /// <summary>Windows command-line quoting for one argument (same rules as Kladez.Wsl.psm1).</summary>
        public static string Quote(string arg)
        {
            if (arg.Length > 0 && arg.IndexOfAny(new[] { ' ', '\t', '"' }) < 0) return arg;
            var sb = new System.Text.StringBuilder("\"");
            int backslashes = 0;
            foreach (char ch in arg)
            {
                if (ch == '\\') { backslashes++; continue; }
                if (ch == '"') sb.Append('\\', backslashes * 2 + 1);
                else sb.Append('\\', backslashes);
                backslashes = 0;
                sb.Append(ch);
            }
            sb.Append('\\', backslashes * 2).Append('"');
            return sb.ToString();
        }

        public static string JoinArgs(string[] args)
        {
            var parts = new string[args.Length];
            for (int i = 0; i < args.Length; i++) parts[i] = Quote(args[i]);
            return string.Join(" ", parts);
        }
    }
}
