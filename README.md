# みちくじ 🌲

北海道の道の駅を、エリアや施設でしぼって抽選するレスポンシブなウェブアプリです。

## できること

- 北海道128駅からルーレットで均等に抽選
- 6エリアの複数選択、駅名・市町村のキーワード検索
- 温泉 / レストラン / 産地直売所 / ドッグラン / EV充電器（複数条件はAND）
- お気に入り、訪問済み、訪問した駅の除外
- 最近30回の抽選履歴とGoogleマップ・公式駅情報へのリンク
- スマホ / iPad / PC対応、キーボード操作とモーション軽減設定への対応

記録は利用中のブラウザのlocalStorageに保存されます。アカウント作成・外部API・課金サービスは不要です。端末間の同期はありません。プライベートブラウズやブラウザのデータ削除で記録が消えることがあります。

## データ

確認日：2026-10-23。

- 名称・住所・登録番号：[北海道地区「道の駅」連絡会「北の道の駅」住所等一覧](https://hokkaido-michinoeki.jp/ichiran/)
- エリア・施設：[北の道の駅 施設検索](https://hokkaido-michinoeki.jp/category/michinoeki/)
- 登録取消の足寄湖・まるせっぷ・フォーレスト276大滝は対象外です。
- 温泉等には、公式検索の分類に従い周辺施設が含まれる場合があります。営業中・無料・敷地内といった保証はありません。休館日や利用条件は公式情報で確認してください。
- `stations-source.txt` は公式一覧の事実情報、`generate-data.mjs` は確認時のエリア・施設分類、`data.js` は生成済みデータです。自動的には更新しません。
- イラストは本プロジェクトの装飾画です。個々の駅の実際の風景や写真を示すものではありません。

本サイトは公式スタンプラリー・観光団体とは関係のない非公式サービスです。

## 開発・検証

Node.js 20以上。依存パッケージはありません。

```sh
node --test core.test.mjs
node build.mjs
python3 -m http.server 4173
```

http://localhost:4173/ を開きます。データを更新した場合は `node generate-data.mjs` を実行します。

## Vercel

このGitHubリポジトリをVercelにImportします。`vercel.json` が静的サイトのビルドと出力先 `dist/` を指定します。Framework PresetはOther。環境変数は不要です。GitHubのmainへのpush後に自動で更新されます。

## 抽選仕様

絞り込み後の全候補から `crypto.getRandomValues` と棄却法で偏りのない番号を選びます。ルーレットは全候補を等角度で描画し、その駅の区画の中心が上のポインタに停止します。候補が多い場合は登録番号のラベルだけを間引いて表示します。候補0件では抽選不可、候補1件も処理できます。回転中は条件を固定し、結果を見るボタンでアニメーションを短縮できます。

## 写真と寄り道ガイド（2026-10-24）

128駅すべてに、名物・市町村の特産品・見どころを記載したカードと詳細ダイアログを追加。駅名・市町村に加え、名物・特産品でも絞り込めます。詳細では公式掲載の営業時間、休館日、電話番号、駐車場情報と出典を確認できます。

- `guides.js`: 北の道の駅、自治体・施設の一次情報を基にした独自要約。補足した出典URLも各駅に保持しています。
- `media.js`: Wikimedia Commonsの128駅の写真と、写真ごとの撮影者・ライセンス・原典URL。
- `hokkaido-biei.jpg`: 美瑛町の畑と道の実写。Adam Jones撮影、CC BY-SA 2.0。出典とライセンスはサイト上に明記。
- 写真はCSSでトリミング表示しています。各写真には元のライセンスを適用し、撮影者名・原典・ライセンスへのリンクを写真ごとに表示。
- おとふけの写真は旧施設（2008年）です。カードと詳細で旧施設であること、2022年移転であることを明記しています。
- 営業情報と写真は確認時点のものです。訪問前の公式情報確認を案内しています。

写真URLの応答確認：128/128。レイアウトは320・375・390・430・768・1024・1440pxの7幅で、トップ・カード一覧・詳細の横はみ出しを確認します。

## 2026-10-25 / Phase 1

Framework-free ESM static site, built with `node build.mjs`; no runtime backend or database. `data.js` contains 128 official station records, `guides.js` contains sourced descriptions, `media.js` contains licensed photo metadata, `stamps.js` contains verified physical-stamp access information. `pages.mjs` renders HTML shared by the homepage, roulette, catalog, stamp guide, journal, and 128 station pages. `components.js` is shared between build and browser. All primary station content is present in the generated HTML before JavaScript runs.

- Fixed the wheel's sizing: a square wrapper and absolute inset keep canvas width and height equal independently of intrinsic canvas dimensions. Added the 2.8-second station-name drum with a small overshoot; result is chosen before animation.
- Hero provides an immediate unfiltered draw, a one-line explanation, and an 8-second slideshow using two already-held, licensed Biei photos. Both photos retain author/source/license links. Automatic motion stops for reduced-motion preferences, and manual/pause controls remain available.
- Removed the duplicate lower landscape and unused clover glyphs. `gallery.js` has `lowerPhoto=null`; providing a properly credited photo there renders the optional lower image. No new photos were fetched for this change.
- Filters are collapsed initially on all screen widths. Stamp times are distinct from toilet access; 31 unqualified 24h, 83 hours-limited, and 14 conditional records. Locations are explicitly confirmed for 29 records and otherwise marked unconfirmed. Supplemental primary-source links and exceptions remain in the data.
- Built 133 complete HTML pages plus 404. Local QA: 30 page/width combinations (6 page types × 320/375/390/768/1440px), no page overflow. Wheel dimensions match at 8 portrait/landscape viewport sizes, including while rotating. Existing uniform-selection/storage tests and static-route checks pass.

Local verification: `npm run build`, `npm test`, then `npm start` and open `http://127.0.0.1:4173/`. The server serves the built routes from `dist/`.

## Phase 2 / private drive tools

Geolocation is requested only by pressing the explicit button. Coordinates remain in page memory (not localStorage, URLs, analytics or requests), can be erased, and are lost on navigation. Distance uses Haversine with Earth mean radius6371.0088km; 30/60/100km filters label approximate straight-line distances. Denial/timeout/unsupported errors explain area-selection fallback. All128 station destinations use current, source-verified official map markers; directions open Google Maps URLs without API keys. Missing coordinates fall back to name/address search. Shiranuka's stale separate Google link was not used.

Winter-only filtering is not enabled: some free-text winter hours exist, but there is no complete, structured and sufficiently verified seasonal-closure/operating-period dataset. Unknown stations are not guessed to be winter-open. The actual station opening/closing information remains visible on each page.
