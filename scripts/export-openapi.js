'use strict';

const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const outDir = path.join(root, 'contracts');

const services = [
  { name: 'auth', swaggerPath: path.join(root, 'services', 'auth', 'src', 'swagger', 'swagger.js') },
  { name: 'restaurant', swaggerPath: path.join(root, 'services', 'restaurant', 'src', 'swagger', 'swagger.js') },
  { name: 'order', swaggerPath: path.join(root, 'services', 'order', 'src', 'swagger', 'swagger.js') },
  { name: 'payment', swaggerPath: path.join(root, 'services', 'payment', 'src', 'swagger', 'swagger.js') },
  { name: 'rider', swaggerPath: path.join(root, 'services', 'rider', 'src', 'swagger', 'swagger.js') },
];

if (!fs.existsSync(outDir)) {
  fs.mkdirSync(outDir, { recursive: true });
}

const index = {
  generatedAt: new Date().toISOString(),
  files: [],
};

for (const svc of services) {
  // eslint-disable-next-line global-require, import/no-dynamic-require
  const { spec } = require(svc.swaggerPath);
  const outFile = path.join(outDir, `${svc.name}.openapi.json`);
  fs.writeFileSync(outFile, JSON.stringify(spec, null, 2), 'utf8');
  index.files.push({ service: svc.name, file: `${svc.name}.openapi.json` });
}

fs.writeFileSync(path.join(outDir, 'index.json'), JSON.stringify(index, null, 2), 'utf8');

console.log(`Exported ${services.length} OpenAPI specs to ${outDir}`);
