# TaskCraft Pro - PWA対応 タスク管理アプリケーション

!TaskCraft Pro

TaskCraft Pro は、洗練されたモダンUIと直感的な操作性を備えたToDo・タスク管理Webアプリケーションです。
オフライン完全対応のPWA（Progressive Web App）として構築されており、ネットワークの接続状態に関わらず快適に動作します。

## 🌟 主な機能

- **タスク管理 (CRUD)**: 新規作成・編集・削除・ステータス切替（未完了 / 進行中 / 完了）
- **詳細プロパティ**: 優先度（高・中・低）、期限日、タグ付与、詳細メモ
- **リアルタイムフィルター＆検索**: キーワード検索、ステータスタブ、優先度ドロップダウン、タグチップフィルタリング
- **並べ替え**: 期限日順・優先度順・作成日順の柔軟なソーティング
- **ダッシュボード統計**: 全タスク数、完了率の可視化
- **PWA & オフラインキャッシュ**: Service WorkerとLocalStorageによるオフライン時の一時保存＆オンライン復帰時の自動同期
- **レスポンシブデザイン**: スマホ、タブレット、PCすべての画面サイズに最適化された Glassmorphism デザイン

## 🚀 セットアップ方法

```bash
# リポジトリのクローン
git clone https://github.com/your-username/taskcraft-pro-pwa.git
cd taskcraft-pro-pwa

# 依存パッケージのインストール
npm install

# サーバーの起動
npm start
```

起動後、ブラウザで `http://localhost:3000` にアクセスしてください。

## 🛠 技術スタック
- **Frontend**: HTML5, Tailwind CSS, JavaScript (ES6+), FontAwesome Icons
- **Backend**: Node.js, Express.js
- **PWA**: Service Worker API, Web App Manifest, Cache API, LocalStorage
- **Deployment**: Vercel Ready