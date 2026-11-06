// Vista previa local: sirve site/ tal cual (igual que Netlify).
// Los envíos del formulario (POST /) responden 200 y se imprimen aquí, para probar sin Netlify.
const root = import.meta.dir + "/../site";
const port = Number(process.env.PORT || 8766);
Bun.serve({
  port,
  async fetch(req) {
    let p = decodeURIComponent(new URL(req.url).pathname);
    if (req.method === "POST") {
      console.log("Formulario recibido:", Object.fromEntries(new URLSearchParams(await req.text())));
      return new Response("ok");
    }
    if (p === "/") p = "/index.html";
    const f = Bun.file(root + p);
    return (await f.exists()) ? new Response(f, { headers: { "cache-control": "no-store" } }) : new Response("404", { status: 404 });
  },
});
console.log("ubits-resellers en http://localhost:" + port);
