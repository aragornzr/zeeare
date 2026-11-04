const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

test('rural Gondor regions retain valley terrain instead of a generic fortress scene', async () => {
  const { sceneKind } = await import('../atlas-3d.js');
  for (const name of ['Lamedon', 'Morthond', 'Lebennin', 'Ithilien', 'Anfalas']) {
    assert.equal(sceneKind({ name, region: 'Gondor' }), 'valley', name);
  }
  assert.equal(sceneKind({ name: 'Minas Tirith', region: 'Gondor' }), 'city');
});

test('all photographic surface maps are bundled locally as JPEG assets', () => {
  const directory = path.join(__dirname, '../assets/materials');
  const sources = JSON.parse(fs.readFileSync(path.join(directory, 'sources.json')));
  assert.equal(sources.assets.length, 6);
  for (const asset of sources.assets) {
    assert.equal(asset.error, undefined);
    const image = fs.readFileSync(path.join(directory, path.basename(asset.file)));
    assert.equal(image.readUInt16BE(0), 0xffd8, asset.file);
    assert.ok(image.length > 10000, asset.file);
  }
});

test('close-up cameras remain above raised terrain and intervening ridges', async () => {
  const { terrainCamera } = await import('../atlas-3d.js');
  const plateau = terrainCamera([0, 5, -15], 12, .7, .25, () => 40);
  assert.equal(plateau.target[1], 46);
  assert.ok(plateau.eye[1] >= 42);
  const ridge = (x, z) => z > 40 && z < 70 ? 90 : 0;
  const camera = terrainCamera([0, 5, 0], 100, 0, .2, ridge);
  for (let i = 1; i <= 12; i++) {
    const f = i / 12;
    const z = camera.target[2] + (camera.eye[2] - camera.target[2]) * f;
    const y = camera.target[1] + (camera.eye[1] - camera.target[1]) * f;
    assert.ok(y >= ridge(0, z) + 2 - 1e-8);
  }
});

test('all close-up material maps have bundled 4096-pixel JPEG sources', () => {
  const directory = path.join(__dirname, '../assets/materials');
  const sources = JSON.parse(fs.readFileSync(path.join(directory, 'sources.json')));
  assert.equal(sources.highResolutionAssets.length, 6);
  for (const asset of sources.highResolutionAssets) {
    assert.equal(asset.error, undefined);
    const image = fs.readFileSync(path.join(directory, path.basename(asset.file)));
    let position = 2, dimensions;
    while (position < image.length) {
      if (image[position++] !== 0xff) continue;
      const marker = image[position++];
      if (marker === 0xd8 || marker === 0xd9) continue;
      const length = image.readUInt16BE(position);
      if (marker === 0xc0 || marker === 0xc2) {
        dimensions = [image.readUInt16BE(position + 5), image.readUInt16BE(position + 3)];
        break;
      }
      position += length;
    }
    assert.deepEqual(dimensions, [4096, 4096], asset.file);
  }
});
