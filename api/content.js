'use strict';

const { getFile, putFile } = require('./_github');
const { requireAuth } = require('./_auth');

const CONTENT_PATH = 'content.json';

module.exports = async function handler(req, res) {
  try {
    if (req.method === 'GET') {
      const file = await getFile(CONTENT_PATH);
      if (!file) {
        res.status(404).json({ error: 'content.json не найден в репозитории.' });
        return;
      }
      res.setHeader('Cache-Control', 'no-store');
      res.status(200).json(JSON.parse(file.content));
      return;
    }

    if (req.method === 'POST' || req.method === 'PUT') {
      if (!requireAuth(req, res)) return;

      const newContent = req.body;
      if (!newContent || typeof newContent !== 'object' || Array.isArray(newContent)) {
        res.status(400).json({ error: 'Некорректные данные контента.' });
        return;
      }

      const existing = await getFile(CONTENT_PATH);
      const jsonText = JSON.stringify(newContent, null, 2);

      await putFile(CONTENT_PATH, jsonText, 'CMS: обновление контента сайта', {
        sha: existing ? existing.sha : undefined
      });

      res.setHeader('Cache-Control', 'no-store');
      res.status(200).json({ ok: true });
      return;
    }

    res.status(405).json({ error: 'Метод не поддерживается' });
  } catch (err) {
    res.status(500).json({ error: (err && err.message) || 'Внутренняя ошибка сервера' });
  }
};
