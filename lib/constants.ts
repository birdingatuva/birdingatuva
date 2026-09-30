// Shared constants for event image uploads
export const MAX_IMAGE_MB = 5;
export const MAX_IMAGE_SIZE = MAX_IMAGE_MB * 1024 * 1024;

// Admin auth token used for simple bearer validation between client and server
// NOTE: For production, prefer a signed JWT or a short-lived session cookie.
// This constant ensures both client and server compare the same value.
// Admin token is now a short-lived JWT; no static token constant.
