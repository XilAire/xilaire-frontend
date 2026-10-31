import "server-only";

const SITE = "https://xilairetechnologies.com";

/** Public links in outgoing email always use the production website. */
export function getXilAirePublicUrl(path: string): string {
  if (!path.startsWith("/") || path.startsWith("//") || path.includes("\\")) {
    throw new Error("An absolute same-site path is required.");
  }
  const configured = process.env.XILAIRE_APP_URL?.trim() ||
    process.env.NEXT_PUBLIC_XILAIRE_APP_URL?.trim() || SITE;
  const origin = new URL(configured);
  if (origin.origin !== SITE || origin.username || origin.password || origin.search || origin.hash || origin.pathname !== "/") {
    throw new Error("Email application URL must be https://xilairetechnologies.com");
  }
  return new URL(path, origin).toString();
}

export function assertXilAirePublicLink(value: string): string {
  const url = new URL(value);
  if (url.origin !== SITE || url.username || url.password) {
    throw new Error("Email action links must use the XilAire production origin.");
  }
  return url.toString();
}
