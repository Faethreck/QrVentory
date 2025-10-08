const fs = require('node:fs');
const path = require('node:path');

const src = path.resolve(__dirname, '..', 'assets', 'icons', 'app-icon.png');
const dest = path.resolve(__dirname, '..', 'assets', 'icons', 'app-icon.ico');

if (!fs.existsSync(src)) {
  throw new Error(`Source PNG not found at ${src}`);
}
const png = fs.readFileSync(src);
if (png.length < 24 || png.readUInt32BE(0) !== 0x89504e47) {
  throw new Error('Source is not a PNG file');
}
const width = png.readUInt32BE(16);
const height = png.readUInt32BE(20);

const ICONDIR_SIZE = 6;
const ENTRY_SIZE = 16;
const header = Buffer.alloc(ICONDIR_SIZE + ENTRY_SIZE);

header.writeUInt16LE(0, 0); // reserved
header.writeUInt16LE(1, 2); // icon type
header.writeUInt16LE(1, 4); // number of images
header.writeUInt8(width >= 256 ? 0 : width, 6);
header.writeUInt8(height >= 256 ? 0 : height, 7);
header.writeUInt8(0, 8); // color palette
header.writeUInt8(0, 9); // reserved
header.writeUInt16LE(0, 10); // color planes
header.writeUInt16LE(32, 12); // bits per pixel
header.writeUInt32LE(png.length, 14);
header.writeUInt32LE(ICONDIR_SIZE + ENTRY_SIZE, 18);

fs.writeFileSync(dest, Buffer.concat([header, png]));
console.log(`Wrote ICO with ${png.length} bytes from ${path.basename(src)}`);
