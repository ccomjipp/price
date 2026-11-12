# 심학산 판매기록

마켓 현장에서 막걸리 판매를 건별로 기록하는 웹앱.

- **오프라인 우선**: 기록은 먼저 폰(localStorage)에 저장되고, 연결되면 자동으로 서버에 올라간다.
- **서버 저장**: Netlify Functions(`/api/sales`) + Netlify Blobs.
- 다른 기기에서 열어도 같은 토큰이면 서버 기록을 받아 합친다(폰 기록이 사라져도 복구 가능).

## 구조

```
public/                 화면(정적 파일)
  index.html            앱 전체(메뉴·가격은 파일 위쪽 MENU 배열)
  sw.js                 오프라인 캐시(/api 는 캐시 안 함)
  manifest.json
netlify/functions/
  sales.mjs             API: GET/POST/DELETE /api/sales
netlify.toml
package.json            @netlify/blobs
```

## 배포 (최초 1회)

1. Netlify 로그인 → **Add new project → Import an existing project → GitHub** → `price` 저장소 선택
2. 빌드 설정은 `netlify.toml`을 그대로 사용(Build command 비움, Publish `public`) → **Deploy**
3. 폰 Safari로 `https://<사이트이름>.netlify.app` 접속
4. 공유 → **홈 화면에 추가** → 이후 홈 화면 아이콘으로만 사용

> 토큰 없이 동작한다. 사이트 주소를 아는 사람은 기록·삭제할 수 있으므로 주소를 공유하지 않는다.

## API

인증 없음.

| 요청 | 설명 |
|---|---|
| `GET /api/sales?date=2026-11-10` | 그날 장소·거래 |
| `GET /api/sales?from=2026-11-01&to=2026-11-30` | 기간 거래(내보내기·Supabase 이관용) |
| `POST /api/sales` `{date, place, tx:[{id,time,n,a,b,p}]}` | 저장(같은 id는 덮어씀) |
| `DELETE /api/sales?date=…&id=…` | 1건 삭제 |

거래 필드: `n` 메뉴명, `a` 500ml 병수, `b` 190ml 병수, `p` 받은 금액(원).
