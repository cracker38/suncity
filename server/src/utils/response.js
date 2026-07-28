export function ok(res, data = null, message = 'Success', status = 200) {
  return res.status(status).json({ success: true, message, data });
}

export function fail(res, message = 'Error', status = 400, errors = null) {
  return res.status(status).json({ success: false, message, errors });
}

export function asyncHandler(fn) {
  return (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
}
