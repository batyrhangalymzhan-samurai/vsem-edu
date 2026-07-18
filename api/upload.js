'use strict';

const { putFile } = require('./_github');
const { requireAuth } = require('./_auth');

function sanitizeFilename(name) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9.\-_]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '') || 'photo';
}

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Метод не поддерживается' });
    return;
  }

  if (!requireAuth(req, res)) return;

  try {
    const body = req.body || {};
    const filename = body.filename;
    const dataBase64 = body.dataBase64;

    if (!filename || !dataBase64) {
      res.status(400).json({ error: 'Нужны filename и dataBase64.' });
      return;
    }

    // ~4.5MB — лимит тела запроса у serverless-функций Vercel.
    if (dataBase64.length > 6 * 1024 * 1024) {
      res.status(413).json({ error: 'Файл слишком большой. Уменьшите размер изображения.' });
      return;
    }

    const extMatch = /\.([a-zA-Z0-9]+)$/.exec(filename);
    const ext = extMatch ? extMatch[1].toLowerCase() : 'jpg';
    const baseName = sanitizeFilename(filename.replace(/\.[^.]+$/, ''));
    const path = 'images/' + Date.now() + '-' + baseName + '.' + ext;

    await putFile(path, dataBase64, 'CMS: загрузка изображения ' + path, { isBase64: true });

    res.status(200).json({ path: path });
  } catch (err) {
    res.status(500).json({ error: (err && err.message) || 'Не удалось загрузить изображение' });
  }
};
