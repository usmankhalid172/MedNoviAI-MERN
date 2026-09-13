const fs = require('fs');
const s = fs.readFileSync('./.next/server/chunks/430.js', 'utf8');
const re = /(\d+):\(a[^)]*\)=>\{"use strict";a\.exports=require\("([^"]+)"\)/g;
let x; while ((x = re.exec(s))) { if (x[2].includes('next-server')) console.log(x[1], '->', x[2]); }
const s2 = fs.readFileSync('./.next/server/chunks/445.js', 'utf8');
const re2 = /"use strict";a\.exports=c\((\d+)\)/g;
let y; while ((y = re2.exec(s2))) console.log('445 indirect:', y[1]);
const s3 = fs.readFileSync('./.next/server/chunks/430.js', 'utf8');
const re3 = /846:\(?([a-z,)]*)\)?=>\{(.{0,120})/g;
let z; while ((z = re3.exec(s3))) console.log('430 req:', z[1], z[2]);
