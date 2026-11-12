// 심학산 판매기록 API — Netlify Functions(v2) + Netlify Blobs
//
//   GET    /api/sales?date=YYYY-MM-DD           → 그날 장소·거래 목록
//   GET    /api/sales?from=YYYY-MM-DD&to=...    → 기간 거래 목록(내보내기용)
//   POST   /api/sales   {date, place?, tx:[…]}  → 거래 저장(같은 id면 덮어씀)
//   DELETE /api/sales?date=YYYY-MM-DD&id=…      → 거래 1건 삭제
//
// 토큰 없이 누구나 호출할 수 있다(주소를 아는 사람은 기록·삭제 가능).
// 저장 키:  tx/<날짜>/<거래id>  ,  meta/<날짜>

import { getStore } from "@netlify/blobs";

const DATE = /^\d{4}-\d{2}-\d{2}$/;
const ID = /^[A-Za-z0-9-]{8,64}$/;

const json = (body, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" },
  });

function cleanTx(t, date) {
  const int = (v) => Math.max(0, Math.trunc(Number(v) || 0));
  if (!t || !ID.test(String(t.id))) return null;
  return {
    id: String(t.id),
    date,
    time: /^\d{2}:\d{2}$/.test(t.time) ? t.time : "00:00",
    n: String(t.n ?? "").slice(0, 40),
    a: int(t.a), // 500ml 병수
    b: int(t.b), // 190ml 병수
    p: int(t.p), // 받은 금액(원)
    at: new Date().toISOString(),
  };
}

async function readDay(store, date) {
  const { blobs } = await store.list({ prefix: `tx/${date}/` });
  const tx = (await Promise.all(blobs.map((b) => store.get(b.key, { type: "json" })))).filter(Boolean);
  tx.sort((x, y) => x.time.localeCompare(y.time));
  const meta = (await store.get(`meta/${date}`, { type: "json" })) || {};
  return { date, place: meta.place || "", tx };
}

export default async (req) => {
  const store = getStore({ name: "sales", consistency: "strong" });
  const url = new URL(req.url);

  try {
    if (req.method === "GET") {
      const date = url.searchParams.get("date");
      if (date && DATE.test(date)) return json(await readDay(store, date));

      const from = url.searchParams.get("from"), to = url.searchParams.get("to");
      if (DATE.test(from || "") && DATE.test(to || "")) {
        const { blobs } = await store.list({ prefix: "tx/" });
        const days = [...new Set(blobs.map((b) => b.key.split("/")[1]))]
          .filter((d) => d >= from && d <= to).sort();
        return json({ days: await Promise.all(days.map((d) => readDay(store, d))) });
      }
      return json({ error: "date 또는 from/to 가 필요합니다" }, 400);
    }

    if (req.method === "POST") {
      const body = await req.json().catch(() => null);
      if (!body || !DATE.test(body.date || "")) return json({ error: "date 형식 오류" }, 400);
      if (typeof body.place === "string")
        await store.setJSON(`meta/${body.date}`, { place: body.place.slice(0, 60) });
      const saved = [];
      for (const raw of Array.isArray(body.tx) ? body.tx.slice(0, 500) : []) {
        const t = cleanTx(raw, body.date);
        if (!t) continue;
        await store.setJSON(`tx/${body.date}/${t.id}`, t);
        saved.push(t.id);
      }
      return json({ saved });
    }

    if (req.method === "DELETE") {
      const date = url.searchParams.get("date"), id = url.searchParams.get("id");
      if (!DATE.test(date || "") || !ID.test(id || "")) return json({ error: "date/id 형식 오류" }, 400);
      await store.delete(`tx/${date}/${id}`);
      return json({ deleted: id });
    }

    return json({ error: "지원하지 않는 메서드" }, 405);
  } catch (e) {
    return json({ error: "서버 오류", detail: String(e?.message || e) }, 500);
  }
};

export const config = { path: "/api/sales" };
