// =============================
// lib/storage.ts (optional: clean public video URLs)
// =============================
const PUBLIC_VIDEO_BUCKET = process.env.NEXT_PUBLIC_VIDEO_BUCKET ?? "videos"; // Supabase Storage bucket name


export function getPublicVideoUrl(path: string) {
const base = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/$/, "");
return `${base}/storage/v1/object/public/${PUBLIC_VIDEO_BUCKET}/${path}`;
}