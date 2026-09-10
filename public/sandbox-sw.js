var T = Object.defineProperty;
var O = (e, t, r) => t in e ? T(e, t, { enumerable: !0, configurable: !0, writable: !0, value: r }) : e[t] = r;
var g = (e, t, r) => O(e, typeof t != "symbol" ? t + "" : t, r);
class C {
  constructor() {
    g(this, "ports", /* @__PURE__ */ new Map());
  }
  register(t, r) {
    this.ports.set(t, {
      port: t,
      messagePort: r,
      lastActive: Date.now()
    });
  }
  unregister(t) {
    this.ports.delete(t);
  }
  has(t) {
    return this.ports.has(t);
  }
  get(t) {
    return this.ports.get(t);
  }
  list() {
    return Array.from(this.ports.keys());
  }
}
const h = new C();
async function v(e, t, r) {
  const n = h.get(e);
  if (!n)
    return new Response(
      `<html><body><h2>503 Service Unavailable</h2><p>No virtual HTTP server listening on port ${e}.</p></body></html>`,
      {
        status: 503,
        statusText: "Service Unavailable",
        headers: {
          "Content-Type": "text/html; charset=utf-8",
          "Cross-Origin-Opener-Policy": "same-origin",
          "Cross-Origin-Embedder-Policy": "require-corp"
        }
      }
    );
  if (n.messagePort) {
    const i = new MessageChannel(), f = {};
    t.headers.forEach((d, a) => {
      f[a] = d;
    });
    const m = t.method !== "GET" && t.method !== "HEAD" ? await t.arrayBuffer() : null;
    return new Promise((d) => {
      let a = null, o = !1, c = 200, y = "OK";
      const u = new Headers({
        "Cross-Origin-Opener-Policy": "same-origin",
        "Cross-Origin-Embedder-Policy": "require-corp"
      }), w = setTimeout(() => {
        o || (o = !0, d(
          new Response(
            `<html><body><h2>504 Gateway Timeout</h2><p>Port ${e} timed out responding.</p></body></html>`,
            { status: 504, headers: { "Content-Type": "text/html" } }
          )
        ));
      }, 15e3);
      i.port1.onmessage = (b) => {
        clearTimeout(w);
        const s = b.data;
        if (s.type === "headers") {
          if (c = s.status || 200, y = s.statusText || "OK", s.headers)
            for (const [p, l] of Object.entries(s.headers))
              u.set(p, String(l));
          return;
        }
        if (s.type === "chunk") {
          if (o)
            a && a.enqueue(new Uint8Array(s.data));
          else {
            o = !0;
            const p = new ReadableStream({
              start(l) {
                a = l, l.enqueue(new Uint8Array(s.data));
              }
            });
            d(
              new Response(p, {
                status: c,
                statusText: y,
                headers: u
              })
            );
          }
          return;
        }
        if (s.type === "end" || !s.type) {
          if (a)
            s.body && s.body.byteLength > 0 && a.enqueue(new Uint8Array(s.body)), a.close();
          else if (!o) {
            if (o = !0, s.headers)
              for (const [l, P] of Object.entries(s.headers))
                u.set(l, String(P));
            const p = new Response(s.body || null, {
              status: s.status || c,
              statusText: s.statusText || y,
              headers: u
            });
            d(p);
          }
        }
      }, n.messagePort.postMessage(
        {
          type: "http:request",
          port: e,
          path: r,
          method: t.method,
          headers: f,
          body: m,
          replyPort: i.port2
        },
        [i.port2]
      );
    });
  }
  return new Response(
    `<!DOCTYPE html><html><head><title>Preview ${e}</title></head><body><h1>Preview Server on Port ${e}</h1><p>Status: Active</p><p>Path: ${r}</p></body></html>`,
    {
      status: 200,
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        "Cross-Origin-Opener-Policy": "same-origin",
        "Cross-Origin-Embedder-Policy": "require-corp"
      }
    }
  );
}
function R() {
  if (typeof BroadcastChannel > "u") return;
  const e = new BroadcastChannel("buddhilive-sandbox-sw");
  e.onmessage = (t) => {
    const { type: r, port: n } = t.data;
    r === "port:register" && typeof n == "number" ? (h.register(n), e.postMessage({ type: "port:registered", port: n })) : r === "port:unregister" && typeof n == "number" ? h.unregister(n) : r === "sw:ping" && e.postMessage({
      type: "sw:pong",
      ports: h.list()
    });
  }, e.postMessage({
    type: "sw:ready",
    ports: h.list()
  });
}
self.addEventListener("install", (e) => {
  e.waitUntil(self.skipWaiting());
});
self.addEventListener("activate", (e) => {
  e.waitUntil(
    (async () => {
      await self.clients.claim(), R();
    })()
  );
});
self.addEventListener("fetch", (e) => {
  const t = new URL(e.request.url), r = t.pathname.match(/^\/__preview\/(\d+)(.*)/);
  if (r) {
    const n = parseInt(r[1], 10), i = r[2] || "/";
    e.respondWith(v(n, e.request, i));
    return;
  }
  t.origin === self.location.origin && e.respondWith(
    (async () => {
      const n = await fetch(e.request), i = new Headers(n.headers);
      return i.set("Cross-Origin-Opener-Policy", "same-origin"), i.set("Cross-Origin-Embedder-Policy", "require-corp"), new Response(n.body, {
        status: n.status,
        statusText: n.statusText,
        headers: i
      });
    })()
  );
});
