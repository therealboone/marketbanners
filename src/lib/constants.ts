export const STANDARD_BANNER_SIZES = [
  "160x600",
  "300x50",
  "300x250",
  "300x600",
  "320x50",
  "336x280",
  "728x90",
] as const;

export const ALLOWED_IMAGE_TYPES = [
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
] as const;

export const MAX_UPLOAD_BYTES = 10 * 1024 * 1024; // 10 MB
