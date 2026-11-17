// «Кладезъ»: «Копия на флешку» — чистая логика без окон (проверяется LauncherTests.cs).
// На флешке: Кладезъ\Kladez-Setup-<версия>.exe, Кладезъ\библиотека\… (книги, карты, дороги, поиск,
// модели ИИ), Кладезъ\образы\*.tar.zst (программы маршрутов и ИИ — их нет в установщике),
// Кладезъ\библиотека.ini (сколько и чего — для установщика) и «Как установить.txt».
// C# 5 (csc из .NET Framework 4.8): без $"", ?. и прочего из новых версий.
using System;
using System.Collections.Generic;
using System.Globalization;
using System.IO;
using System.Text;

namespace Kladez.Launcher
{
    public sealed class CopyItem
    {
        public string Source;    // полный путь на компьютере
        public string Relative;  // путь внутри папки «Кладезъ» на флешке
        public long Size;
    }

    public static class CopyCore
    {
        public const string RootFolder = "Кладезъ";
        public const string LibraryFolder = "библиотека";
        public const string ImagesFolder = "образы";
        public const string ManifestFile = "библиотека.ini";
        public const string HowToFile = "Как установить.txt";
        public const string TempFolder = ".kladez-copy";
        /// <summary>FAT32 не держит файлы больше 4 ГБ без байта.</summary>
        public const long Fat32MaxFile = 4294967295L;
        public const string ReleaseBase = "https://github.com/Leon-Kladez/kladez/releases/download/installer-v";

        /// <summary>Что из библиотеки переносится: книги, карты с дорогами и поиском, модели ИИ, свои файлы.
        /// Не переносится служебное (журналы, адреса сети, данные программ со «Склада»).</summary>
        public static readonly string[] Roots = { "zim", "maps", "ollama", "kb_uploads", "books", "media" };
        public static readonly string[] TopFiles = { "указания-ИИ.md" };

        /// <summary>Недокачанное и временное не переносим.</summary>
        public static bool IsSkipped(string fileName)
        {
            string n = fileName.ToLowerInvariant();
            return n.EndsWith(".tmp") || n.EndsWith(".part") || n.EndsWith(".partial") ||
                   n.EndsWith(".crdownload") || n.EndsWith(".download") || n.EndsWith(".aria2");
        }

        public static List<CopyItem> PlanLibrary(string libraryDir)
        {
            var items = new List<CopyItem>();
            if (string.IsNullOrEmpty(libraryDir) || !Directory.Exists(libraryDir)) return items;
            foreach (string root in Roots)
            {
                string dir = Path.Combine(libraryDir, root);
                if (!Directory.Exists(dir)) continue;
                foreach (string file in Directory.EnumerateFiles(dir, "*", SearchOption.AllDirectories))
                    Add(items, libraryDir, file);
            }
            foreach (string top in TopFiles)
            {
                string file = Path.Combine(libraryDir, top);
                if (File.Exists(file)) Add(items, libraryDir, file);
            }
            return items;
        }

        private static void Add(List<CopyItem> items, string libraryDir, string file)
        {
            if (IsSkipped(Path.GetFileName(file))) return;
            long size;
            try { size = new FileInfo(file).Length; }
            catch (IOException) { return; }
            catch (UnauthorizedAccessException) { return; }
            string rel = file.Substring(libraryDir.TrimEnd('\\').Length).TrimStart('\\');
            items.Add(new CopyItem { Source = file, Relative = LibraryFolder + "\\" + rel, Size = size });
        }

        /// <summary>Раздел для сводки «что будет записано».</summary>
        public static string Category(string relative)
        {
            string r = relative.Replace('/', '\\').ToLowerInvariant();
            string lib = LibraryFolder + "\\";
            if (!r.StartsWith(lib)) return r.StartsWith(ImagesFolder + "\\") ? "Программы маршрутов и ИИ" : "Установщик";
            r = r.Substring(lib.Length);
            if (r.StartsWith("zim\\") || r.StartsWith("books\\")) return "Книги и справочники";
            if (r.StartsWith("maps\\routes\\")) return "Дороги для маршрутов";
            if (r.StartsWith("maps\\search\\")) return "Поиск по карте";
            if (r.StartsWith("maps\\")) return "Карты";
            if (r.StartsWith("ollama\\")) return "Модели ИИ-помощника";
            return "Ваши файлы";
        }

        public static long TotalSize(IEnumerable<CopyItem> items)
        {
            long total = 0;
            foreach (var i in items) total += i.Size;
            return total;
        }

        public static long LargestFile(IEnumerable<CopyItem> items)
        {
            long max = 0;
            foreach (var i in items) if (i.Size > max) max = i.Size;
            return max;
        }

        /// <summary>Сколько ещё записать: уже лежащие на флешке файлы того же размера пропускаются
        /// (можно продолжить прерванную копию).</summary>
        public static long BytesToWrite(IEnumerable<CopyItem> items, Func<string, long> existingSize)
        {
            long need = 0;
            foreach (var i in items) if (existingSize(i.Relative) != i.Size) need += i.Size;
            return need;
        }

        /// <summary>null — можно писать; иначе — что сказать человеку.</summary>
        public static string CheckTarget(long needBytes, long freeBytes, string fileSystem, long largestFile)
        {
            if (string.Equals(fileSystem, "FAT32", StringComparison.OrdinalIgnoreCase) && largestFile > Fat32MaxFile)
                return "Флешка размечена в FAT32, а такие флешки не принимают файлы больше 4 ГБ — а у вас есть файл на " +
                       FormatSize(largestFile) + ".\n\nОтформатируйте флешку в exFAT (правой кнопкой по флешке в «Этот " +
                       "компьютер» → «Форматировать…» → файловая система exFAT). Всё, что на ней лежит, при этом сотрётся.";
            // Запас 200 МБ: служебные файлы файловой системы, «Как установить.txt».
            const long reserve = 200L * 1024 * 1024;
            if (needBytes + reserve > freeBytes)
                return "На флешке не хватает места: нужно ещё " + FormatSize(needBytes + reserve) +
                       ", свободно " + FormatSize(freeBytes) + ".\n\nВозьмите флешку побольше или освободите место.";
            return null;
        }

        public static string FormatSize(long bytes)
        {
            var ru = CultureInfo.GetCultureInfo("ru-RU");
            if (bytes >= 1024L * 1024 * 1024) return (bytes / 1073741824.0).ToString("0.0", ru) + " ГБ";
            if (bytes >= 1024L * 1024) return (bytes / 1048576.0).ToString("0", ru) + " МБ";
            return Math.Max(1, bytes / 1024).ToString(ru) + " КБ";
        }

        public static string InstallerFileName(string version)
        {
            return "Kladez-Setup-" + version + ".exe";
        }

        /// <summary>Как установщик называется у тех, кто собрал его сам или скачал раньше.</summary>
        public static string[] InstallerCandidates(string version)
        {
            return new[] { InstallerFileName(version), "Кладезъ-установка-" + version + ".exe" };
        }

        public static string InstallerUrl(string version)
        {
            return ReleaseBase + version + "/" + InstallerFileName(version);
        }

        public static string SumsUrl(string version)
        {
            return ReleaseBase + version + "/SHA256SUMS.txt";
        }

        /// <summary>Отпечаток файла из SHA256SUMS.txt («&lt;sha&gt;  &lt;имя&gt;»), null — нет такой строки.</summary>
        public static string ShaFor(string sumsText, string fileName)
        {
            if (sumsText == null) return null;
            foreach (string raw in sumsText.Split('\n'))
            {
                string line = raw.Trim();
                int sp = line.IndexOf(' ');
                if (sp != 64) continue;
                string name = line.Substring(sp).Trim().TrimStart('*');
                if (name == fileName) return line.Substring(0, 64).ToLowerInvariant();
            }
            return null;
        }

        /// <summary>D:\Kladez\library → /mnt/d/Kladez/library (так диски видны внутри Кладезя).</summary>
        public static string ToWslPath(string windowsPath)
        {
            if (string.IsNullOrEmpty(windowsPath) || windowsPath.Length < 2 || windowsPath[1] != ':') return null;
            string rest = windowsPath.Substring(2).Replace('\\', '/').TrimEnd('/');
            return "/mnt/" + char.ToLowerInvariant(windowsPath[0]) + rest;
        }

        /// <summary>Сведения для установщика на другом компьютере (ini — его читает Inno Setup).</summary>
        public static string ManifestText(string version, long libraryBytes, int libraryFiles, DateTime when)
        {
            var sb = new StringBuilder();
            sb.Append("[Library]\r\n");
            sb.Append("Version=").Append(version).Append("\r\n");
            sb.Append("Bytes=").Append(libraryBytes.ToString(CultureInfo.InvariantCulture)).Append("\r\n");
            sb.Append("MB=").Append((libraryBytes / 1048576L).ToString(CultureInfo.InvariantCulture)).Append("\r\n");
            sb.Append("Files=").Append(libraryFiles.ToString(CultureInfo.InvariantCulture)).Append("\r\n");
            sb.Append("Date=").Append(when.ToString("yyyy-MM-dd", CultureInfo.InvariantCulture)).Append("\r\n");
            return sb.ToString();
        }

        public static string HowToText(string version)
        {
            return
                "Как поставить «Кладезъ» с этой флешки на другой компьютер — интернет не нужен\r\n" +
                "\r\n" +
                "1. Вставьте флешку в другой компьютер (Windows 10 или 11).\r\n" +
                "2. Откройте флешку, папку «Кладезъ», и запустите " + InstallerFileName(version) + ".\r\n" +
                "3. Установщик сам заметит библиотеку на флешке и предложит перенести её: книги, карты,\r\n" +
                "   поиск, дороги для маршрутов и модели ИИ-помощника. Оставьте галочку — и всё скопируется.\r\n" +
                "4. Не вынимайте флешку, пока установка не закончится.\r\n" +
                "\r\n" +
                "Справочник лекарств на новом компьютере скачивается заново, когда появится интернет.\r\n" +
                "\r\n" +
                "Если Windows покажет синее окно «Windows защитила ваш компьютер» — нажмите «Подробнее»,\r\n" +
                "затем «Выполнить в любом случае». Это обычное предупреждение для бесплатных программ.\r\n";
        }
    }
}
