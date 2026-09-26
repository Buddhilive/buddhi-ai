var C = Object.defineProperty;
var O = (e, t, r) => t in e ? C(e, t, { enumerable: !0, configurable: !0, writable: !0, value: r }) : e[t] = r;
var m = (e, t, r) => O(e, typeof t != "symbol" ? t + "" : t, r);
class E {
  constructor() {
    m(this, "ports", /* @__PURE__ */ new Map());
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
const l = new E();
async function x(e, t, r) {
  const s = l.get(e);
  if (!s)
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
  if (s.messagePort) {
    const o = new MessageChannel(), f = {};
    t.headers.forEach((c, i) => {
      f[i] = c;
    });
    const w = t.method !== "GET" && t.method !== "HEAD" ? await t.arrayBuffer() : null;
    return new Promise((c) => {
      let i = null, d = !1, h = 200, y = "OK";
      const u = new Headers({
        "Cross-Origin-Opener-Policy": "same-origin",
        "Cross-Origin-Embedder-Policy": "require-corp"
      }), b = setTimeout(() => {
        d || (d = !0, c(
          new Response(
            `<html><body><h2>504 Gateway Timeout</h2><p>Port ${e} timed out responding.</p></body></html>`,
            { status: 504, headers: { "Content-Type": "text/html" } }
          )
        ));
      }, 15e3);
      let g = !1;
      o.port1.onmessage = (P) => {
        clearTimeout(b);
        const n = P.data;
        if (n.type === "headers") {
          if (h = n.status || 200, y = n.statusText || "OK", n.headers)
            for (const [p, a] of Object.entries(n.headers))
              u.set(p, String(a)), p.toLowerCase() === "content-type" && String(a).includes("text/event-stream") && (g = !0);
          return;
        }
        if (n.type === "chunk") {
          if (d)
            i && i.enqueue(new Uint8Array(n.data));
          else {
            d = !0;
            const p = new ReadableStream({
              start(a) {
                i = a, a.enqueue(new Uint8Array(n.data));
              },
              cancel() {
                try {
                  o.port1.postMessage({ type: "abort" }), o.port1.close();
                } catch {
                }
              }
            });
            c(
              new Response(p, {
                status: h,
                statusText: y,
                headers: u
              })
            );
          }
          return;
        }
        if (n.type === "close") {
          if (i)
            try {
              i.close();
            } catch {
            }
          return;
        }
        if (n.type === "end" || !n.type) {
          if (i)
            n.body && n.body.byteLength > 0 && i.enqueue(new Uint8Array(n.body)), g || i.close();
          else if (!d) {
            if (d = !0, n.headers)
              for (const [a, T] of Object.entries(n.headers))
                u.set(a, String(T));
            const p = new Response(n.body || null, {
              status: n.status || h,
              statusText: n.statusText || y,
              headers: u
            });
            c(p);
          }
        }
      }, s.messagePort.postMessage(
        {
          type: "http:request",
          port: e,
          path: r,
          method: t.method,
          headers: f,
          body: w,
          replyPort: o.port2
        },
        [o.port2]
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
    const { type: r, port: s } = t.data;
    r === "port:register" && typeof s == "number" ? (l.register(s), e.postMessage({ type: "port:registered", port: s })) : r === "port:unregister" && typeof s == "number" ? l.unregister(s) : r === "sw:ping" && e.postMessage({
      type: "sw:pong",
      ports: l.list()
    });
  }, e.postMessage({
    type: "sw:ready",
    ports: l.list()
  });
}
self.addEventListener("message", (e) => {
  const t = e.data;
  if (!t || typeof t != "object") return;
  const { type: r, port: s } = t;
  if (r === "port:register" && typeof s == "number") {
    const o = e.ports && e.ports[0];
    l.register(s, o), e.source && "postMessage" in e.source && e.source.postMessage({ type: "port:registered", port: s });
  } else r === "port:unregister" && typeof s == "number" && l.unregister(s);
});
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
    const s = parseInt(r[1], 10), o = r[2] || "/";
    e.respondWith(x(s, e.request, o));
    return;
  }
  t.origin === self.location.origin && e.respondWith(
    (async () => {
      const s = await fetch(e.request), o = new Headers(s.headers);
      return o.set("Cross-Origin-Opener-Policy", "same-origin"), o.set("Cross-Origin-Embedder-Policy", "require-corp"), new Response(s.body, {
        status: s.status,
        statusText: s.statusText,
        headers: o
      });
    })()
  );
});
