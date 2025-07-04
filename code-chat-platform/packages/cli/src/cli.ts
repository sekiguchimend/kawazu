#!/usr/bin/env node

import { Command } from 'commander';
import chalk from 'chalk';
import { joinRoom } from './commands/join';
import { createRoom } from './commands/create';
import { listRooms } from './commands/list';
import { configureSettings, showConfig } from './commands/config';
import { showProfile, openProfile } from './commands/profile';
import { shareFile, listSharedFiles, downloadSharedFile, revokeFileShare } from './commands/share';
import { approveFileShare, denyFileShare, listPendingRequests } from './commands/approve';

const program = new Command();

// バージョンとメタ情報
program
  .name('kawazu')
  .description('エディタ上でリアルタイムチャットを行うCLIツール')
  .version('1.1.1');

// ログインコマンド
program
  .command('login')
  .description('アカウントにログインする')
  .option('-e, --email <email>', 'メールアドレス')
  .option('-p, --password <password>', 'パスワード')
  .action(async (options) => {
    const { loginUser } = await import('./commands/auth');
    await loginUser(options);
  });

// ログアウトコマンド
program
  .command('logout')
  .description('ログアウトする')
  .action(async () => {
    const { logoutUser } = await import('./commands/auth');
    await logoutUser();
  });

// アカウント状態確認コマンド
program
  .command('whoami')
  .description('現在ログイン中のユーザー情報を表示')
  .action(async () => {
    const { showCurrentUser } = await import('./commands/auth');
    await showCurrentUser();
  });

// プラン確認コマンド
program
  .command('plan')
  .description('現在のサブスクリプションプランを表示')
  .action(async () => {
    const { showSubscriptionPlan } = await import('./commands/auth');
    await showSubscriptionPlan();
  });

// ルーム参加コマンド
program
  .command('join <roomId>')
  .description('指定されたルームに参加する')
  .option('-u, --username <name>', 'ユーザー名を指定')
  .option('-p, --password <password>', 'プライベートルームのパスワード')
  .action(async (roomId, options) => {
    await joinRoom(roomId, options);
  });

// ルーム作成コマンド
program
  .command('create <roomName>')
  .description('新しいルームを作成して参加')
  .option('--private', 'プライベートルームとして作成')
  .option('--password <password>', 'プライベートルーム用パスワード')
  .action(async (roomName, options) => {
    await createRoom(roomName, options);
  });

// ルーム一覧コマンド
program
  .command('list')
  .description('ローカルのチャットファイル一覧を表示')
  .action(async () => {
    await listRooms();
  });

// 設定コマンド
program
  .command('config')
  .description('CLI設定を管理')
  .option('--server <url>', 'サーバーURLを設定')
  .option('--username <name>', 'デフォルトユーザー名を設定')
  .option('--show', '現在の設定を表示')
  .action(async (options) => {
    if (options.show) {
      await showConfig();
    } else {
      await configureSettings(options);
    }
  });

// プロフィールコマンド
program
  .command('profile <username>')
  .description('ユーザーのプロフィールを表示')
  .option('--open', 'ブラウザでプロフィールを開く')
  .action(async (username, options) => {
    if (options.open) {
      await openProfile(username);
    } else {
      await showProfile(username);
    }
  });

// ファイル共有コマンド
program
  .command('share <filePath>')
  .description('ファイルを他のユーザーと共有')
  .option('--room <roomId>', '対象のルームを指定')
  .option('--users <usernames>', '対象ユーザーをカンマ区切りで指定（省略時は全参加者）')
  .option('--permission <type>', '権限タイプ (read|write)', 'read')
  .option('--expires <hours>', '有効期限（時間）', '24')
  .option('--type <fileType>', 'ファイルタイプを手動指定')
  .action(async (filePath, options) => {
    await shareFile(filePath, options);
  });

// ファイル共有承認コマンド
program
  .command('approve <shareToken>')
  .description('ファイル共有リクエストを承認')
  .option('--reason <text>', '承認理由')
  .action(async (shareToken, options) => {
    await approveFileShare(shareToken, options);
  });

// ファイル共有拒否コマンド
program
  .command('deny <shareToken>')
  .description('ファイル共有リクエストを拒否')
  .option('--reason <text>', '拒否理由')
  .action(async (shareToken, options) => {
    await denyFileShare(shareToken, options);
  });

// 共有ファイル一覧コマンド
program
  .command('files [roomId]')
  .description('共有されているファイル一覧を表示')
  .action(async (roomId) => {
    await listSharedFiles(roomId);
  });

// ファイルダウンロードコマンド
program
  .command('download <shareToken> [outputPath]')
  .description('共有ファイルをダウンロード')
  .action(async (shareToken, outputPath) => {
    await downloadSharedFile(shareToken, outputPath);
  });

// 承認待ちリクエスト一覧コマンド
program
  .command('requests')
  .description('承認待ちのファイル共有リクエスト一覧')
  .action(async () => {
    await listPendingRequests();
  });

// ファイル共有取り消しコマンド
program
  .command('unshare <shareToken>')
  .description('ファイル共有を取り消し')
  .action(async (shareToken) => {
    await revokeFileShare(shareToken);
  });

// ヘルプコマンド拡張
program
  .command('help-usage')
  .description('詳細な使用方法を表示')
  .action(() => {
    console.log(chalk.blue.bold('\n📖 Kawazu CLI - 使用方法\n'));
    
    console.log(chalk.yellow('🔐 初回セットアップ:'));
    console.log('  1. ログイン: ' + chalk.cyan('kawazu login'));
    console.log('  2. プラン確認: ' + chalk.cyan('kawazu plan'));
    console.log('  3. 設定確認: ' + chalk.cyan('kawazu config --show\n'));
    
    console.log(chalk.yellow('🚀 基本的な使い方:'));
    console.log('  1. ルームを作成: ' + chalk.cyan('kawazu create "プロジェクト会議"'));
    console.log('  2. ルームに参加: ' + chalk.cyan('kawazu join project-meeting'));
    console.log('  3. エディタで .codechat ファイルを開く');
    console.log('  4. ファイルに書き込んでチャット開始！\n');
    
    console.log(chalk.yellow('👤 アカウント管理:'));
    console.log('  • ログイン: ' + chalk.cyan('kawazu login'));
    console.log('  • ログアウト: ' + chalk.cyan('kawazu logout'));
    console.log('  • ユーザー確認: ' + chalk.cyan('kawazu whoami'));
    console.log('  • プラン確認: ' + chalk.cyan('kawazu plan\n'));
    
    console.log(chalk.yellow('💡 便利なオプション:'));
    console.log('  • ユーザー名指定: ' + chalk.cyan('kawazu join room-id -u username'));
    console.log('  • プライベートルーム: ' + chalk.cyan('kawazu join room-id -p password'));
    console.log('  • 設定確認: ' + chalk.cyan('kawazu config --show'));
    console.log('  • ファイル一覧: ' + chalk.cyan('kawazu list'));
    console.log('  • プロフィール表示: ' + chalk.cyan('kawazu profile username\n'));
    
    console.log(chalk.yellow('📁 ファイル共有機能:'));
    console.log('  • ファイル共有: ' + chalk.cyan('kawazu share myfile.js --users alice,bob'));
    console.log('  • 共有承認: ' + chalk.cyan('kawazu approve <share-token>'));
    console.log('  • 共有拒否: ' + chalk.cyan('kawazu deny <share-token>'));
    console.log('  • ファイル一覧: ' + chalk.cyan('kawazu files'));
    console.log('  • ファイルダウンロード: ' + chalk.cyan('kawazu download <share-token>'));
    console.log('  • 承認待ち確認: ' + chalk.cyan('kawazu requests'));
    console.log('  • 共有取り消し: ' + chalk.cyan('kawazu unshare <share-token>\n'));
    
    console.log(chalk.yellow('🔧 初回設定:'));
    console.log('  設定を行う: ' + chalk.cyan('kawazu config'));
    console.log('  サーバーURL設定: ' + chalk.cyan('kawazu config --server https://kawazu.onrender.com\n'));
    
    console.log(chalk.yellow('📝 チャットファイルの使い方:'));
    console.log('  • # で始まる行はシステムメッセージ（送信されません）');
    console.log('  • ``` でコードブロックを作成できます');
    console.log('  • ファイルを保存すると自動で送信されます');
    console.log('  • Ctrl+C で終了できます\n');
    
    console.log(chalk.gray('詳細情報: https://github.com/your-repo/kawazu'));
  });

// エラーハンドリング
program.on('command:*', () => {
  console.error(chalk.red(`❌ 不明なコマンドです: ${program.args.join(' ')}`));
  console.log(chalk.yellow('💡 使用可能なコマンドを確認: ') + chalk.cyan('kawazu --help'));
  process.exit(1);
});

// 引数がない場合はヘルプを表示
if (process.argv.length === 2) {
  program.outputHelp();
  console.log(chalk.blue('\n💡 詳細な使用方法: ') + chalk.cyan('kawazu help-usage'));
  console.log(chalk.yellow('\n🔐 初回利用の場合: ') + chalk.cyan('kawazu login'));
}

// プログラム実行
program.parse();

// 未処理の例外をキャッチ
process.on('uncaughtException', (error) => {
  console.error(chalk.red('❌ 予期しないエラーが発生しました:'));
  console.error(error);
  process.exit(1);
});

process.on('unhandledRejection', (reason) => {
  console.error(chalk.red('❌ 未処理の Promise エラー:'));
  console.error(reason);
  process.exit(1);
});