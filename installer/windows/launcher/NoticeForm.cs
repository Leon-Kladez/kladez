// «Кладезъ»: окошко в правом нижнем углу после автозапуска при входе в Windows.
// Кладезъ запускается вместе с Windows, чтобы открываться сразу, но держит в памяти около 2 ГБ.
// Окошко говорит об этом и даёт переключатель: выключить — Кладезъ останавливается, память
// освобождается и выбор запоминается (при следующем входе в Windows он сам не запустится).
// Крестик не закрывает, а прячет окошко в значок возле часов: нажали на значок — окошко снова
// здесь; правой кнопкой — меню «Открыть Кладезъ», «Выключить / включить», «Убрать значок».
// C# 5 — собирается csc.exe из .NET Framework 4.8.
using System;
using System.Drawing;
using System.Drawing.Drawing2D;
using System.Runtime.InteropServices;
using System.Threading;
using System.Windows.Forms;

namespace Kladez.Launcher
{
    /// <summary>Переключатель «вкл/выкл», как в настройках Кладезя.</summary>
    internal sealed class ToggleSwitch : Control
    {
        private bool on;
        public event EventHandler Toggled;

        public ToggleSwitch()
        {
            SetStyle(ControlStyles.AllPaintingInWmPaint | ControlStyles.OptimizedDoubleBuffer |
                     ControlStyles.UserPaint | ControlStyles.ResizeRedraw | ControlStyles.Selectable, true);
            Size = new Size(48, 26);
            Cursor = Cursors.Hand;
            TabStop = true;
        }

        public bool On
        {
            get { return on; }
            set { if (on != value) { on = value; Invalidate(); } }
        }

        protected override void OnClick(EventArgs e)
        {
            base.OnClick(e);
            if (!Enabled) return;
            On = !On;
            if (Toggled != null) Toggled(this, EventArgs.Empty);
        }

        protected override void OnKeyDown(KeyEventArgs e)
        {
            base.OnKeyDown(e);
            // Только пробел и только когда сюда перешли клавишей Tab: окошко не должно ловить чужой ввод.
            if (e.KeyCode == Keys.Space) OnClick(EventArgs.Empty);
        }

        protected override void OnPaint(PaintEventArgs e)
        {
            var g = e.Graphics;
            g.SmoothingMode = SmoothingMode.AntiAlias;
            g.Clear(Parent != null ? Parent.BackColor : BackColor);
            var track = new Rectangle(0, 0, Width - 1, Height - 1);
            Color trackColor = !Enabled ? Color.FromArgb(0xC9, 0xC2, 0xB3)
                : on ? Color.FromArgb(0x42, 0x45, 0x20) : Color.FromArgb(0xB8, 0xB0, 0xA0);
            using (var path = Rounded(track, Height / 2))
            using (var brush = new SolidBrush(trackColor))
                g.FillPath(brush, path);
            int d = Height - 6;
            int x = on ? Width - d - 3 : 3;
            using (var knob = new SolidBrush(Color.White))
                g.FillEllipse(knob, x, 3, d, d);
            if (Focused)
                using (var pen = new Pen(Color.FromArgb(0x5A, 0x3B, 0x12), 1) { DashStyle = DashStyle.Dot })
                    g.DrawRectangle(pen, 0, 0, Width - 1, Height - 1);
        }

        protected override void OnGotFocus(EventArgs e) { base.OnGotFocus(e); Invalidate(); }
        protected override void OnLostFocus(EventArgs e) { base.OnLostFocus(e); Invalidate(); }

        private static GraphicsPath Rounded(Rectangle r, int radius)
        {
            var p = new GraphicsPath();
            int d = radius * 2;
            p.AddArc(r.X, r.Y, d, d, 90, 180);
            p.AddArc(r.Right - d, r.Y, d, d, 270, 180);
            p.CloseFigure();
            return p;
        }
    }

    internal sealed class NoticeForm : Form
    {
        private static readonly Color Paper = Color.FromArgb(0xF6, 0xEF, 0xE0);
        private static readonly Color Ink = Color.FromArgb(0x3A, 0x2A, 0x10);
        private static readonly Color Muted = Color.FromArgb(0x6B, 0x5B, 0x40);

        private readonly Label title;
        private readonly Label text;
        private readonly Label state;
        private readonly ToggleSwitch toggle;
        private readonly Func<bool> start;
        private readonly Action stop;
        private readonly Action open;
        private readonly NotifyIcon tray;
        private readonly ToolStripMenuItem trayToggle;
        private bool busy;
        private bool exiting;
        private bool hintShown;

        /// <param name="start">Включить Кладезъ и дождаться, пока он ответит (в фоновом потоке).</param>
        /// <param name="stop">Остановить Кладезъ и освободить память (в фоновом потоке).</param>
        /// <param name="open">Открыть Кладезъ в браузере (сам запустит, если выключен). Может быть null.</param>
        public NoticeForm(Func<bool> start, Action stop, Action open = null)
        {
            this.start = start;
            this.stop = stop;
            this.open = open;

            Text = "Кладезъ";
            FormBorderStyle = FormBorderStyle.FixedToolWindow;
            ShowInTaskbar = false;
            StartPosition = FormStartPosition.Manual;
            BackColor = Paper;
            Font = new Font("Segoe UI", 9.5f);
            ClientSize = new Size(384, 196);

            title = new Label
            {
                Text = "Кладезъ готов к работе без интернета",
                Font = new Font("Segoe UI Semibold", 11f),
                ForeColor = Ink,
                Location = new Point(16, 12),
                Size = new Size(354, 24),
            };
            text = new Label
            {
                ForeColor = Muted,
                Location = new Point(16, 40),
                Size = new Size(354, 100),
            };
            toggle = new ToggleSwitch { Location = new Point(16, 152), On = true, TabStop = false };
            state = new Label
            {
                ForeColor = Ink,
                Font = new Font("Segoe UI Semibold", 10f),
                Location = new Point(74, 155),
                Size = new Size(296, 22),
                Cursor = Cursors.Hand,
            };
            state.Click += (s, e) => ClickToggle();
            toggle.Toggled += (s, e) => Apply(toggle.On);

            Controls.Add(title);
            Controls.Add(text);
            Controls.Add(toggle);
            Controls.Add(state);

            // Значок возле часов.
            var menu = new ContextMenuStrip();
            if (open != null) menu.Items.Add("Открыть Кладезъ", null, (s, e) => open());
            menu.Items.Add("Показать окошко", null, (s, e) => Reveal());
            trayToggle = new ToolStripMenuItem("Выключить Кладезъ", null, (s, e) => ClickToggle());
            menu.Items.Add(trayToggle);
            menu.Items.Add(new ToolStripSeparator());
            menu.Items.Add("Убрать значок", null, (s, e) => ExitTray());
            Icon appIcon = null;
            try { appIcon = Icon.ExtractAssociatedIcon(Application.ExecutablePath); } catch (Exception) { }
            if (appIcon != null) Icon = appIcon;
            tray = new NotifyIcon
            {
                Icon = appIcon ?? SystemIcons.Application,
                Text = "Кладезъ",
                ContextMenuStrip = menu,
                Visible = true,
            };
            tray.MouseClick += (s, e) => { if (e.Button == MouseButtons.Left) Reveal(); };
            ShowOn();
        }

        /// <summary>Крестик — спрятать в значок возле часов, а не закрыть.</summary>
        protected override void OnFormClosing(FormClosingEventArgs e)
        {
            if (!exiting && e.CloseReason != CloseReason.WindowsShutDown && e.CloseReason != CloseReason.TaskManagerClosing)
            {
                e.Cancel = true;
                Hide();
                if (!hintShown)
                {
                    hintShown = true;
                    tray.ShowBalloonTip(5000, "Кладезъ здесь, возле часов",
                        "Нажмите на значок, чтобы снова открыть окошко с переключателем.", ToolTipIcon.Info);
                }
                return;
            }
            base.OnFormClosing(e);
        }

        protected override void Dispose(bool disposing)
        {
            if (disposing && tray != null)
            {
                tray.Visible = false;
                tray.Dispose();
            }
            base.Dispose(disposing);
        }

        private void Reveal()
        {
            Show();
            if (WindowState != FormWindowState.Normal) WindowState = FormWindowState.Normal;
            PlaceInCorner();
            Activate();
        }

        private void ExitTray()
        {
            exiting = true;
            tray.Visible = false;
            Close();
        }

        protected override bool ShowWithoutActivation { get { return true; } }

        protected override void OnLoad(EventArgs e)
        {
            base.OnLoad(e);
            PlaceInCorner();
        }

        // Планировщик при входе в Windows запускает Kladez.exe «скрыто», и Windows сворачивает первое
        // окно программы в полоску в левом нижнем углу. Разворачиваем и ставим в правый нижний угол.
        // Всё — без активации: окошко не забирает клавиатуру у того, что человек сейчас делает
        // (иначе пробел или Enter, набранные в другом окне, нажимали переключатель).
        protected override void OnShown(EventArgs e)
        {
            base.OnShown(e);
            ActiveControl = null;
            ShowWindow(Handle, SW_SHOWNOACTIVATE);
            var area = Screen.PrimaryScreen.WorkingArea;
            SetWindowPos(Handle, HWND_TOPMOST, area.Right - Width - 12, area.Bottom - Height - 12, 0, 0,
                SWP_NOSIZE | SWP_NOACTIVATE | SWP_SHOWWINDOW);
        }

        protected override CreateParams CreateParams
        {
            get
            {
                var cp = base.CreateParams;
                cp.ExStyle |= WS_EX_TOPMOST;
                return cp;
            }
        }

        private const int SW_SHOWNOACTIVATE = 4;
        private const int WS_EX_TOPMOST = 0x00000008;
        private const uint SWP_NOSIZE = 0x0001, SWP_NOACTIVATE = 0x0010, SWP_SHOWWINDOW = 0x0040;
        private static readonly IntPtr HWND_TOPMOST = new IntPtr(-1);

        [DllImport("user32.dll")]
        private static extern bool ShowWindow(IntPtr hWnd, int nCmdShow);

        [DllImport("user32.dll")]
        private static extern bool SetWindowPos(IntPtr hWnd, IntPtr after, int x, int y, int cx, int cy, uint flags);

        private void PlaceInCorner()
        {
            var area = Screen.PrimaryScreen.WorkingArea;
            Location = new Point(area.Right - Width - 12, area.Bottom - Height - 12);
        }

        private void ClickToggle()
        {
            if (!toggle.Enabled || busy) return;
            toggle.On = !toggle.On;
            Apply(toggle.On);
        }

        private void ShowOn()
        {
            title.Text = "Кладезъ готов к работе без интернета";
            text.Text = "Он запускается вместе с Windows, чтобы открываться сразу, и занимает около 2 ГБ памяти. " +
                        "Не нужен сейчас — выключите: память освободится, а открыть Кладезъ можно ярлыком на рабочем столе.";
            state.Text = "Кладезъ включён";
            toggle.On = true;
            if (trayToggle != null) trayToggle.Text = "Выключить Кладезъ";
            if (tray != null) tray.Text = "Кладезъ — включён";
        }

        private void ShowOff()
        {
            title.Text = "Кладезъ выключен";
            text.Text = "Память освобождена, и при следующем входе в Windows Кладезъ сам не запустится. " +
                        "Понадобится — откройте ярлык «Кладезъ» на рабочем столе. Вернуть запуск с Windows: " +
                        "переключатель ниже или Кладезъ → Настройки → Телефоны.";
            state.Text = "Кладезъ выключен";
            toggle.On = false;
            if (trayToggle != null) trayToggle.Text = "Включить Кладезъ";
            if (tray != null) tray.Text = "Кладезъ — выключен";
        }

        private void Apply(bool turnOn)
        {
            if (busy) return;
            busy = true;
            toggle.Enabled = false;
            state.Text = turnOn ? "Запускаю Кладезъ… (до пары минут)" : "Выключаю Кладезъ…";
            var worker = new Thread(() =>
            {
                bool ok = true;
                try
                {
                    if (turnOn) ok = start();
                    else stop();
                }
                catch (Exception)
                {
                    ok = false;
                }
                try
                {
                    BeginInvoke(new Action(() =>
                    {
                        busy = false;
                        toggle.Enabled = true;
                        if (turnOn && !ok)
                        {
                            toggle.On = false;
                            ShowOff();
                            state.Text = "Не удалось запустить — откройте ярлык «Кладезъ»";
                        }
                        else if (turnOn) ShowOn();
                        else ShowOff();
                    }));
                }
                catch (InvalidOperationException) { } // окошко уже закрыли
            });
            // Не фоновый: закрыли окошко посреди «Выключаю…» — программа всё равно доведёт выключение до конца.
            worker.IsBackground = false;
            worker.Start();
        }
    }
}
