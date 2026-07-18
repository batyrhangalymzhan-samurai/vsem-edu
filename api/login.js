'use strict';

const { createSessionToken } = require('./_auth');

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Метод не поддерживается' });
    return;
  }

  const adminPassword = process.env.ADMIN_PASSWORD;
  if (!adminPassword) {
    res.status(500).json({ error: 'ADMIN_PASSWORD не задан в переменных окружения Vercel.' });
    return;
  }

  const body = req.body || {};
  const password = body.password;

  if (!password || password !== adminPassword) {
    res.status(401).json({ error: 'Неверный пароль' });
    return;
  }

  const token = createSessionToken();
  res.status(200).json({ token: token });
};
