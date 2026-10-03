import { closeSync, openSync, readSync } from 'node:fs'

// Width and height of a PNG or JPEG from its header, without dependencies. Returns null for other formats.
export function imageSize(path) {
  const fd = openSync(path, 'r')
  try {
    const head = Buffer.alloc(32); readSync(fd, head, 0, 32, 0)
    if (head.readUInt32BE(0) === 0x89504e47) return { w: head.readUInt32BE(16), h: head.readUInt32BE(20) }
    if (head[0] === 0xff && head[1] === 0xd8) {
      const buf = Buffer.alloc(65536); const n = readSync(fd, buf, 0, buf.length, 0)
      let i = 2
      while (i + 9 < n) {
        if (buf[i] !== 0xff) { i++; continue }
        const m = buf[i + 1]
        if (m >= 0xc0 && m <= 0xcf && ![0xc4, 0xc8, 0xcc].includes(m)) return { h: buf.readUInt16BE(i + 5), w: buf.readUInt16BE(i + 7) }
        i += 2 + buf.readUInt16BE(i + 2)
      }
    }
    return null
  } finally { closeSync(fd) }
}
