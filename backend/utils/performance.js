const { randomUUID } = require('crypto');
const { performance } = require('perf_hooks');

const enabled = () => process.env.PERF_LOGS === '1' || process.env.NODE_ENV === 'development';

const now = () => performance.now();
const elapsed = startedAt => Number((now() - startedAt).toFixed(2));

function logBackendPerf(perf, operation, durationMs, metrics = {}, category = 'BACKEND') {
  if (!enabled()) return;
  console.info(`[PERF][${category}]`, {
    operation,
    durationMs: Number(durationMs.toFixed(2)),
    ...(perf?.id ? { perfId: perf.id } : {}),
    ...metrics,
  });
}

function beginUploadPerf(req, res, next) {
  if (enabled()) {
    const headerId = String(req.get('x-perf-id') || '');
    const id = /^[a-zA-Z0-9-]{1,80}$/.test(headerId) ? headerId : randomUUID();
    req.perf = { id, startedAt: now(), log: (operation, durationMs, metrics, category) => logBackendPerf(req.perf, operation, durationMs, metrics, category) };

    res.on('finish', () => {
      const fileBytes = Number(req.file?.size || 0);
      logBackendPerf(req.perf, 'upload-request-total', elapsed(req.perf.startedAt), {
        statusCode: res.statusCode,
        fileBytes,
        responseBytes: Number(res.getHeader('Content-Length') || 0),
      });
    });
  }
  next();
}

function markUploadReceived(req, _res, next) {
  if (req.perf) {
    req.perf.fileReceivedAt = now();
    req.perf.log('upload-file-received', elapsed(req.perf.startedAt), {
      fileBytes: Number(req.file?.size || 0),
    });
  }
  next();
}

module.exports = { enabled, now, elapsed, logBackendPerf, beginUploadPerf, markUploadReceived };
