// bot.acelera.agency serves the Botmaker page at its root. A vercel.json rewrite
// cannot do this because index.html exists and static files win over rewrites.
export const config = { matcher: "/" };

const botHosts = /^(?:bot\.acelera\.agency|acelera-botmaker-preview\.vercel\.app)$/;

export default function middleware(request) {
  const url = new URL(request.url);
  if (!botHosts.test(url.hostname)) return;
  url.pathname = "/botmaker";
  return new Response(null, { headers: { "x-middleware-rewrite": url.toString() } });
}
