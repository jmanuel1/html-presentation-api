const { promises: fs } = require('fs');
const { join } = require('path');

const dbPath = join(__dirname, 'data.json');

exports.store = async function store(obj) {
  const allJSON = await loadAllJSON();
  await writeAllJSON({...allJSON, ...obj});
}

exports.load = async function load(id, deserialize) {
  const allJSON = await loadAllJSON(deserialize);
  return allJSON[id];
}

async function loadAllJSON(deserialize) {
  let data = null;
  try {
    data = JSON.parse(await fs.readFile(dbPath, 'utf8'), deserialize);
  } catch (err) {
    console.error('error during loading JSON')
    console.error(err);
    data = {};
  }
  return data;
}

async function writeAllJSON(obj) {
  await fs.writeFile(dbPath, JSON.stringify(obj), 'utf8');
}
