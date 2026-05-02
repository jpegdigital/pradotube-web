export function redirectToLogin(): void {
  const currentUrl = window.location.href;
  const authUrl = new URL("/login", process.env.NEXT_PUBLIC_AUTH_URL!);
  authUrl.searchParams.set("next", currentUrl);
  window.location.href = authUrl.toString();
}
