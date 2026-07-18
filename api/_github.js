'use strict';

/* =============================================
   Обёртка над GitHub Contents API.
   Используется для чтения и записи файлов сайта
   (content.json, images/*) прямо в репозитории,
   откуда Vercel автоматически пересобирает сайт.
   ============================================= */

const API_BASE = 'https://api.github.com';

function getEnv() {
  const { GITHUB_OWNER, GITHUB_REPO, GITHUB_BRANCH, GITHUB_TOKEN } = process.env;

  if (!GITHUB_OWNER || !GITHUB_REPO || !GITHUB_TOKEN) {
    throw new Error(
      'GitHub не настроен. Задайте переменные окружения GITHUB_OWNER, GITHUB_REPO и GITHUB_TOKEN в настройках проекта Vercel.'
    );
  }

  return {
    owner: GITHUB_OWNER,
    repo: GITHUB_REPO,
    branch: GITHUB_BRANCH || 'main',
    token: GITHUB_TOKEN
  };
}

function encodePath(filePath) {
  return filePath
    .split('/')
    .map(function (segment) { return encodeURIComponent(segment); })
    .join('/');
}

async function githubRequest(path, options) {
  options = options || {};
  const { token } = getEnv();

  const res = await fetch(API_BASE + path, {
    ...options,
    headers: {
      'Authorization': 'Bearer ' + token,
      'Accept': 'application/vnd.github+json',
      'User-Agent': 'vsem-edu-cms',
      ...(options.headers || {})
    }
  });

  let data = null;
  try {
    data = await res.json();
  } catch (e) {
    data = null;
  }

  if (!res.ok) {
    const message = (data && data.message) || ('GitHub API error: ' + res.status);
    const error = new Error(message);
    error.status = res.status;
    throw error;
  }

  return data;
}

/**
 * Возвращает { content, sha } или null, если файл не найден.
 */
async function getFile(filePath) {
  const { owner, repo, branch } = getEnv();

  try {
    const data = await githubRequest(
      '/repos/' + owner + '/' + repo + '/contents/' + encodePath(filePath) + '?ref=' + encodeURIComponent(branch)
    );
    const content = Buffer.from(data.content, 'base64').toString('utf-8');
    return { content: content, sha: data.sha };
  } catch (err) {
    if (err.status === 404) return null;
    throw err;
  }
}

/**
 * Создаёт или обновляет файл в репозитории.
 * contentOrBase64 — обычный текст (isBase64=false) либо уже base64-строка (isBase64=true).
 */
async function putFile(filePath, contentOrBase64, message, opts) {
  opts = opts || {};
  const { owner, repo, branch } = getEnv();

  const body = {
    message: message,
    branch: branch,
    content: opts.isBase64 ? contentOrBase64 : Buffer.from(contentOrBase64, 'utf-8').toString('base64')
  };
  if (opts.sha) body.sha = opts.sha;

  return githubRequest(
    '/repos/' + owner + '/' + repo + '/contents/' + encodePath(filePath),
    {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    }
  );
}

module.exports = { getFile, putFile, getEnv };
