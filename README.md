# ツギバト — コラボ型ビート積み上げアプリ

Phonk ビートを複数人が順番に「要素を1つずつ」足して1曲完成させる Web アプリ（PWA）。

## MVP 設計

### 未決定事項の決定

| 項目 | 決定 | 理由 |
|------|------|------|
| ジャンル | **Phonk 一本** | 要件の主軸。BPM 130–150・808・Memphis 系に集中 |
| 1人の単位 | **ループ1個（4小節）** | Incredibox 的なシンプルさ。4小節単位は後から拡張可 |
| 最大人数 | **6人** | 4人だと短すぎ、6人で十分な積み上げ感 |
| 音源 | **Tone.js シンセ生成** | 著作権リスクゼロ。後から WAV パックに差し替え可能 |

### 画面構成

```
/                 ホーム（モード選択・曲一覧）
/create           土台ビート作成
/collaborate      途中曲一覧 → 参加
/add/:code        1要素追加
/song/:code       曲再生・積み上げ表示・シェア
/s/:code          シェア用短縮URL（同上）
```

### データモデル

```
Song
  id, shareCode, title, bpm, maxBars(8), maxContributors(6)
  status(open|complete), mode(solo|collab|daily|virtual)
  creatorName, createdAt, updatedAt

Layer
  id, songId, loopId, contributorName, contributorIndex
  isVirtual, addedAt

LoopDefinition
  id, name, category, preset(Tone.js), bars(4)
```

### 1曲のライフサイクル

```
1. 作成者が土台ループ1つ + BPM を設定 → status: open
2. 参加者がループ1つずつ追加（最大6人）
3. 6人で埋まる OR 作成者が「完成にする」→ status: complete
4. 完成曲ページで自動ミックス再生 + シェアURL
```

### 0人問題対策

- **ソロ**: 全スロットを自分で埋める
- **仮想追加**: 土台作成時にハイハットが自動追加
- **コラボ**: デモ曲 + 途中曲一覧から参加
- **デイリー**: 日替わりお題付き土台

## 技術スタック

- **Frontend**: Vite + React 19 + TypeScript
- **Audio**: Tone.js（Web Audio API）
- **State**: Zustand
- **Storage**: localStorage（MVP）→ Supabase 移行予定
- **PWA**: vite-plugin-pwa

## セットアップ

```bash
npm install
npm run dev
```

http://localhost:5173 で起動。

### npm install が SSL エラーで失敗する場合

```
npm error code UNABLE_TO_VERIFY_LEAF_SIGNATURE
```

社内プロキシやウイルス対策の HTTPS 検査が原因のことが多いです。次を試してください。

```powershell
# Node.js 24+ — システムの CA 証明書を使う
$env:NODE_OPTIONS="--use-system-ca"
npm install
```

それでもダメな場合は OneDrive 外（例: `C:\dev\tsugi-bato`）にコピーして実行してください。

## ビルド

```bash
npm run build
npm run preview
```

## デプロイ手順

### Cloudflare Pages（推奨・無料）

1. GitHub にリポジトリを push
2. [Cloudflare Pages](https://pages.cloudflare.com/) → Create project → Git 連携
3. ビルド設定:
   - **Build command**: `npm run build`
   - **Output directory**: `dist`
   - **Node version**: 20
4. デプロイ完了。カスタムドメインは Pages 設定から

### Vercel

```bash
npm i -g vercel
vercel
```

Framework Preset: Vite、Output: `dist`

### Firebase Hosting

```bash
npm install -g firebase-tools
firebase login
firebase init hosting
# public directory: dist
npm run build
firebase deploy
```

## 今後の拡張

- [ ] Supabase 連携（リアルタイムコラボ・認証）
- [ ] Cloudflare R2 に WAV ループパック配置
- [ ] WAV 書き出し（Tone.Offline）
- [ ] 追加ジャンルパック
- [ ] 広告 / 課金

## 音源について

MVP では Tone.js のシンセ・ドラムで Phonk 風パターンを生成しています。
本番では自作またはライセンス済み WAV を `public/samples/` に配置し、
`src/data/loops.ts` の `preset` を `sample: 'kick-01.wav'` 形式に差し替えます。

## ライセンス

MIT
