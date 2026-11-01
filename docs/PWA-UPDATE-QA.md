# Service Worker update contract v1

目的: おさんぽビンゴ #110 / GO-TO探偵団 #65 の更新失敗を再発させず、製品仕様を変えずに再利用する。
成果物: 共通Chromium runner、製品別JSON、独立CI。通常の編集・検証・PR作成を対象とし、本番Worker変更・自動mergeは対象外。

## 原資料と既存検証

- おさんぽビンゴ: https://github.com/b-w-hiroki/osanpo-bingo/pull/110 。調査main `67a025726de36b5ad67903345f1a35175c014e39`。`tests/service-worker.browser.cjs` の実HTTP 503・旧v161 fixture・更新承認・LP/お知らせ復帰と `tests/service-worker.test.cjs` を維持。
- GO-TO探偵団: https://github.com/b-w-hiroki/goto-tanteidan/pull/65 。調査main `f622098fe2b9c1081497149426134b355826e8c6`。`tests/offline.js` のv4/v5移行・失敗・再試行・5タブ・地図・Canvas負例・390×844を維持。
- 共通runnerは上記の隔離HTTPサーバー、実旧版、503注入、状態待機、sentinel保護を再利用・抽出する。既存テストを置換しない。JSのvmだけでWorkerライフサイクルの合格にしない。

## 構成と実行

正本は `templates/pwa-update/pwa-update-contract.cjs`。作品側は同一内容を `tests/pwa-update-contract.cjs` に明示的に採用し、設定を `tests/pwa-update.json` に置く。ネットワーク越しに可変mainのテストコードを実行しない。コピー更新時は正本commitとSHA-256をPRに記録し、製品JSONを上書きしない。

```sh
npm install --no-save playwright@1.56.1
npx playwright install --with-deps chromium
node tests/pwa-update-contract.cjs tests/pwa-update.json
```

runnerは各起動で新しいChromiumと新しいcontextを作り、127.0.0.1の動的ポートと `/app/` 配下だけを使う。履歴ファイルが必要な作品はcheckout `fetch-depth: 0`。本番URLや利用者プロファイルでは実行しない。HTMLのscriptはCSPで停止するため、アプリ操作や解析・API接続の検証は既存QAが担当する。

## Done条件

1. 実旧版Workerで旧キャッシュが作成され、controllerが確定する。
2. 新Workerの必須ファイルにHTTP 503を返し、実リクエスト回数が1以上でcandidateがredundantとなる。waitingがなく、旧controllerの同一性とactivated状態が保たれる。
3. 旧キャッシュの全レスポンスURL・status・body SHA-256が失敗前後で一致する。別アプリsentinelも同じ内容で残る。
4. 通信断で製品が約束するオフラインページが表示される。失敗後に通信と必須ファイルを復旧し、同じregistrationで再試行が成功する。
5. manual方式はwaiting中も旧controller・旧キャッシュを保持し、明示メッセージ後に切替。automatic方式は承認メッセージなしで切替。
6. 新controller有効化後に不要な自アプリ旧キャッシュだけが消え、新キャッシュと必須依存、他アプリsentinelが残る。更新後の通信断表示と通信復帰も成功する。
7. 独立Chromium CIと既存製品QAが対象head SHAで成功し、ログを保存する。構文合格・CI・merge・公開・実機を別状態として報告する。

## 製品固有契約

| 製品 | 有効化 | 共通QAのオフラインページ | 維持する追加QA |
|---|---|---|---|
| おさんぽビンゴ | 明示更新メッセージ `skipWaiting` | index.html / news.html | game.htmlのnavigationをキャッシュから返さない既存仕様、ゲームJS依存、ボード復元 |
| GO-TO探偵団 | install成功後skipWaiting | index.html | 5タブ・地図UI・6分割JS/CSS。地図タイルは通信必須 |

## 他PWAへの適用

- worker名、旧版の不変ref/fixture、旧新キャッシュ名、必須ファイル、承認方法、オフライン対象ページ、HTML識別文字列を作品側で指定する。oldCacheとnewCacheは異なる実移行を選ぶ。同じcache名の更新は既存GO-TO製品QAを併用する。
- 必須対象が本当にcache.addAll等で取得されることを503実発生で確認する。ページrouteのモックはWorkerのリクエストを代替しない。
- オフライン対象を増やさない。外部API、認証、地図タイル、POST、写真データを一括キャッシュしない。キャッシュprefixは同一originで衝突しないものを使う。
- URLサブパス、query、相対URL、更新承認方式、保存データ互換は作品ごとに確認。UIの実更新ボタンは製品QAで別途検証する。
- このCIはローカルHTTPのChromiumライフサイクル検証。iPhone/Safari、OSによる停止・容量追放、本番CDN、初回インストール失敗は別検証であり、合格から推定しない。
- テストが落ちたらtimeout延長・skip・承認方式変更で隠さず、503回数、candidate/controller、cache snapshot、head SHAを確認する。

## 初期評価

追加時のローカル構文検査は成功。ローカルにはChromium実行ファイルがなく、ブラウザ合否は作品PRの独立 `PWA update contract` ジョブと既存QAの結果を参照する。未実施の実機・公開確認は合格扱いしない。
