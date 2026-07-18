'use strict';

/* =============================================
   Простая проверка сессии админ-панели.
   Токен — это JSON, подписанный HMAC-SHA256,
   без сторонних зависимостей (никакого JWT-пакета не нужно).
   ============================================= */

const crypto = require('crypto');

const SESSION_TTL_MS = 12 * 60 * 60 * 1000; // 12 часов

function getSecret() {
  return process.env.SESSION_SECRET || process.env.ADMIN_PASSWORD || 'vsem-edu-fallback-secret';
}

function base64url(buffer) {
  return buffer.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function sign(payload) {
  const secret = getSecret();
  const data = base64url(Buffer.from(JSON.stringify(payload), 'utf-8'));
  const sig = base64url(crypto.createHmac('sha256', secret).update(data).digest());
  return data + '.' + sig;
}

function verify(token) {
  if (!token || typeof token !== 'string' || token.indexOf('.') === -1) return null;

  const secret = getSecret();
  const parts = token.split('.');
  const data = parts[0];
  const sig = parts[1];

  const expected = base64url(crypto.createHmac('sha256', secret).update(data).digest());
  if (sig !== expected) return null;

  try {
    const json = Buffer.from(data.replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString('utf-8');
    const payload = JSON.parse(json);
    if (payload.exp && Date.now() > payload.exp) return null;
    return payload;
  } catch (e) {
    return null;
  }
}

function createSessionToken() {
  return sign({ role: 'admin', exp: Date.now() + SESSION_TTL_MS });
}

function getBearerToken(req) {
  const header = (req.headers && req.headers.authorization) || '';
  const match = /^Bearer\s+(.+)$/i.exec(header);
  return match ? match[1] : null;
}

/**
 * Проверяет авторизацию запроса. При провале сам пишет 401 в res и возвращает null.
 */
function requireAuth(req, res) {
  const token = getBearerToken(req);
  const payload = token && verify(token);
  if (!payload) {
    res.status(401).json({ error: 'Не авторизован. Войдите в панель заново.' });
    return null;
  }
  return payload;
}

module.exports = { sign, verify, createSessionToken, getBearerToken, requireAuth };
