/**
 * Consistent success response envelope.
 * Errors use a separate envelope produced by the error middleware.
 */
export const ok = (res, data, status = 200) => res.status(status).json({ success: true, data });

export const created = (res, data) => ok(res, data, 201);

export const noContent = (res) => res.status(204).send();
