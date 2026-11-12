// «Кладезъ»: DNS за VPN (0.1.18). Многие VPN пропускают TCP, но теряют обычные (UDP) запросы адресов —
// тогда Кладезъ не скачивает ни карты, ни обновления (EAI_AGAIN). Этот пересыльщик слушает UDP на мосту
// Docker и задаёт те же вопросы 1.1.1.1 / 8.8.8.8 / 77.88.8.8 по TCP. Запускает его kladez-start
// (kz_ensure_dns) только когда обычный DNS не отвечает; работает в образе программы (там есть node).
const dgram = require('dgram'), net = require('net')
const UP = ['1.1.1.1', '8.8.8.8', '77.88.8.8']
const LISTEN = process.env.LISTEN || '0.0.0.0'
const sock = dgram.createSocket('udp4')
function ask(q, i, done) {
  if (i >= UP.length) return done(null)
  const c = net.connect(53, UP[i]); let buf = Buffer.alloc(0), fin = false
  const fail = () => { if (!fin) { fin = true; c.destroy(); ask(q, i + 1, done) } }
  c.setTimeout(4000, fail); c.on('error', fail)
  c.on('connect', () => { const l = Buffer.alloc(2); l.writeUInt16BE(q.length); c.write(Buffer.concat([l, q])) })
  c.on('data', (d) => {
    buf = Buffer.concat([buf, d])
    if (buf.length >= 2 && buf.length >= 2 + buf.readUInt16BE(0)) { fin = true; c.end(); done(buf.subarray(2, 2 + buf.readUInt16BE(0))) }
  })
}
sock.on('message', (q, r) => ask(q, 0, (a) => a && sock.send(a, r.port, r.address)))
sock.bind(53, LISTEN, () => console.log('dns-tcp: слушаю', LISTEN))
