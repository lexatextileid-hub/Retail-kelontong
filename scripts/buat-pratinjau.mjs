// Mengubah hasil build satu-file menjadi potongan HTML (tanpa <html>/<head>/<body>)
// yang siap dipublikasikan sebagai pratinjau. Hasil: dist-pratinjau/pratinjau.html
import { readFileSync, writeFileSync } from 'node:fs';

const html = readFileSync('dist-pratinjau/index.html', 'utf8');
const head = (html.match(/<head[^>]*>([\s\S]*?)<\/head>/i) || [, ''])[1]
  .replace(/<meta[^>]*charset[^>]*>/i, '')
  .replace(/<meta[^>]*viewport[^>]*>/i, '');
const body = (html.match(/<body[^>]*>([\s\S]*?)<\/body>/i) || [, ''])[1];

// Pindahkan <title> ke paling atas, lalu sisa head, lalu isi body.
const title = (head.match(/<title>[\s\S]*?<\/title>/i) || [''])[0];
const sisaHead = head.replace(title, '');
writeFileSync('dist-pratinjau/pratinjau.html', `${title}\n${sisaHead}\n${body}\n`);
console.log('dist-pratinjau/pratinjau.html siap');
