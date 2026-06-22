// storage0g.js — Upload/download JSON records lên 0G Storage
// Tuân thủ patterns/STORAGE.md:
//   - ZgFile.fromFilePath() → merkleTree() → upload() → file.close() trong try/finally
//   - Luôn lưu rootHash
// TODO: implement in logic phase

async function uploadRecord(record) {
  throw new Error('Not yet implemented');
}

module.exports = { uploadRecord };
