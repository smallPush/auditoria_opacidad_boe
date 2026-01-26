import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const publicDir = path.join(__dirname, '../public');
const manifestPath = path.join(publicDir, 'manifest.json');

// Ensure public directory exists
if (!fs.existsSync(publicDir)) {
  console.error('Public directory not found!');
  process.exit(1);
}

// Read directory
try {
  const files = fs.readdirSync(publicDir);
  const jsonFiles = files.filter(file =>
    file.endsWith('.json') &&
    file !== 'manifest.json' // Exclude the manifest itself
  );

  const manifest = {
    generatedAt: new Date().toISOString(),
    files: jsonFiles
  };

  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));
  console.log(`Manifest generated with ${jsonFiles.length} files:`, jsonFiles);
} catch (err) {
  console.error('Error generating manifest:', err);
  process.exit(1);
}
