const PUBLIC_URL = process.env.NEXT_PUBLIC_R2_PUBLIC_URL ?? "";

export function avatarUrl(
  path: string | null | undefined,
  cacheBust?: string | number | null
): string | null {
  if (!path) return null;
  const base = `${PUBLIC_URL}/${path}`;
  return cacheBust ? `${base}?v=${cacheBust}` : base;
}
