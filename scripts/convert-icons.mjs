import { Resvg } from '@resvg/resvg-js';
import { readFileSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const assetsDir = join(__dirname, '..', 'assets', 'images');

const conversions = [
  { input: 'icon.svg', output: 'icon.png', width: 1024, height: 1024 },
  { input: 'icon-dev.svg', output: 'icon-dev.png', width: 1024, height: 1024 },
  { input: 'splash-icon.svg', output: 'splash-icon.png', width: 1024, height: 1024 },
];

for (const { input, output, width, height } of conversions) {
  const svgPath = join(assetsDir, input);
  const pngPath = join(assetsDir, output);

  console.log(`Converting ${input} -> ${output}...`);

  const svg = readFileSync(svgPath, 'utf8');
  const resvg = new Resvg(svg, {
    fitTo: {
      mode: 'width',
      value: width,
    },
    background: input === 'splash-icon.svg' ? 'transparent' : undefined,
  });

  const pngData = resvg.render();
  const pngBuffer = pngData.asPng();

  writeFileSync(pngPath, pngBuffer);
  console.log(`  Created ${output} (${pngBuffer.length} bytes)`);
}

console.log('\nDone! Icons converted successfully.');
