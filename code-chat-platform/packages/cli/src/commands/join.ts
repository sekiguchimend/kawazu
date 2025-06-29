import { io, Socket } from 'socket.io-client';
import chalk from 'chalk';
import ora from 'ora';
import chokidar from 'chokidar';
import inquirer from 'inquirer';
import { JoinOptions } from '../types';
import { loadConfig } from '../utils/config';
import { 
  createCodechatFile, 
  getCodechatPath, 
  appendMessageToFile, 
  readFileContent,
  isValidRoomSlug,
  clearInputArea
} from '../utils/file';
import { 
  formatMessage, 
  detectMessageType, 
  sanitizeMessage, 
  extractNewContent,
  isFileShareCommand,
  parseFileShareCommand
} from '../utils/message';
import { requireAuth } from '../utils/config';

export async function joinRoom(roomId: string, options: JoinOptions) {
  if (!isValidRoomSlug(roomId)) {
    console.error(chalk.red('❌ 無効なルームIDです。英数字、ハイフン、アンダースコアのみ使用できます。'));
    return;
  }

  // 認証チェック
  console.log(chalk.blue('🔍 認証状態を確認中...'));
  const config = await requireAuth();

  const spinner = ora('ルームに接続中...').start();
  
  try {
    // ユーザー名の取得（認証済みユーザーの場合はconfig.user_usernameを使用）
    const username = options.username || config.user_username || config.default_username || await promptUsername();
    
    // .codechatファイルのパス
    const codechatFile = getCodechatPath(roomId);
    
    // .codechatファイルの作成
    await createCodechatFile(codechatFile, roomId, username);
    
    // WebSocket接続（認証トークン付き）
    const socket = io(config.server_url, {
      timeout: 10000,
      transports: ['polling', 'websocket'],
      forceNew: true,
      autoConnect: true,
      auth: {
        token: config.auth_token
      }
    });
    
    spinner.text = 'サーバーに接続中...';
    
    // 接続エラーハンドリング
    socket.on('connect_error', (error) => {
      spinner.fail('サーバー接続に失敗しました');
      console.error(chalk.red(`接続エラー: ${error.message}`));
      
      // 認証エラーの場合
      if (error.message.includes('unauthorized') || error.message.includes('authentication')) {
        console.log(chalk.yellow(' 認証エラーが発生しました。再ログインが必要です。'));
        console.log(chalk.blue(' ログイン: ') + chalk.cyan('kawazu login'));
      } else {
        console.error(chalk.gray(`詳細: ${JSON.stringify(error, null, 2)}`));
        console.error(chalk.gray(`サーバーURL: ${config.server_url}`));
      }
      process.exit(1);
    });
    
    // タイムアウト処理
    setTimeout(() => {
      if (!socket.connected) {
        spinner.fail('接続タイムアウト');
        console.error(chalk.red('サーバーへの接続がタイムアウトしました'));
        process.exit(1);
      }
    }, 10000);
    
    // 接続成功時の処理
    socket.on('connect', () => {
      spinner.text = 'ルームに参加中...';
      
      // ルーム参加リクエスト
      socket.emit('join-room', {
        room_slug: roomId,
        username: username,
        password: options.password
      });
    });
    
    // ルーム参加成功
    socket.on('joined-room', (data) => {
      spinner.succeed(`ルーム "${data.room.name}" に参加しました！`);
      console.log(chalk.green(`📝 ${codechatFile} をエディタで開いてチャットを開始してください`));
      console.log(chalk.blue(`💡 終了するには Ctrl+C を押してください`));
      
      // ファイル監視を開始
      setupFileWatcher(codechatFile, socket, roomId, username);
      
      // Socket イベントリスナーの設定
      setupSocketListeners(socket, codechatFile, username);
    });
    
    // エラーハンドリング
    socket.on('error', (error) => {
      spinner.fail('エラーが発生しました');
      console.error(chalk.red(`❌ ${error.message}`));
      
      if (error.message.includes('Password required') || error.message.includes('Invalid password')) {
        console.log(chalk.yellow('💡 プライベートルームの場合は -p オプションでパスワードを指定してください'));
        console.log(chalk.gray('例: kawazu join room-name -p password'));
      }
      
      socket.disconnect();
      process.exit(1);
    });
    
    // Socket イベントリスナーは joinRoom 内で設定される
    
  } catch (error) {
    spinner.fail('ルーム参加に失敗しました');
    console.error(chalk.red(`エラー: ${error.message}`));
    process.exit(1);
  }
}

function setupSocketListeners(socket: Socket, codechatFile: string, currentUsername: string) {
  // 新しいメッセージを受信
  socket.on('new-message', async (message) => {
    const isOwnMessage = message.username === currentUsername;
    const formattedMessage = formatMessage(
      message.username, 
      message.content, 
      message.created_at,
      isOwnMessage
    );
    
    await appendMessageToFile(codechatFile, formattedMessage);
  });

  // プロフィールURL応答
  socket.on('profile-url-response', (data) => {
    if (data.exists && data.url) {
      console.log(chalk.blue(`👤 ${data.username} のプロフィール: ${data.url}`));
      if (!data.is_public) {
        console.log(chalk.yellow('   ⚠️  このプロフィールはプライベート設定です'));
      }
    } else {
      console.log(chalk.gray(`👤 ${data.username} のプロフィールは見つかりませんでした`));
    }
  });
  
  // ユーザー参加通知
  socket.on('user-joined', (data) => {
    console.log(chalk.blue(`👋 ${data.username} がルームに参加しました`));
  });
  
  // ユーザー退出通知
  socket.on('user-left', (data) => {
    console.log(chalk.yellow(`👋 ${data.username} がルームから退出しました`));
  });
  
  // タイピング状態
  socket.on('user-typing', (data) => {
    if (data.is_typing) {
      console.log(chalk.gray(`✏️  ${data.username} が入力中...`));
    }
  });
  
  // 参加者一覧
  socket.on('participants-list', (participants) => {
    console.log(chalk.cyan(`👥 参加者 (${participants.length}人): ${participants.map(p => p.username).join(', ')}`));
    console.log(chalk.gray('💡 ユーザー名をタップしてプロフィールを表示: kawazu profile <username>'));
  });

  // ファイル共有関連のリスナー
  setupFileShareListeners(socket);
}

function setupFileShareListeners(socket: Socket) {
  // ファイル共有リクエスト受信
  socket.on('file-share-request', (data) => {
    console.log(chalk.blue(`\n📤 ファイル共有リクエスト`));
    console.log(chalk.cyan(`ファイル: ${data.file_name}`));
    console.log(chalk.gray(`所有者: ${data.owner_username}`));
    console.log(chalk.gray(`権限: ${data.permission_type === 'read' ? '読み取り専用' : '読み書き可能'}`));
    
    if (data.expires_at) {
      console.log(chalk.gray(`有効期限: ${new Date(data.expires_at).toLocaleString()}`));
    }
    
    console.log(chalk.green(`承認: kawazu approve ${data.share_token}`));
    console.log(chalk.red(`拒否: kawazu deny ${data.share_token}`));
  });

  // ファイル共有承認通知
  socket.on('file-share-approved', (data) => {
    console.log(chalk.green(`\n✅ ファイル共有が承認されました`));
    console.log(chalk.cyan(`ファイル: ${data.file_name}`));
    console.log(chalk.gray(`承認者: ${data.username}`));
    if (data.reason) {
      console.log(chalk.gray(`理由: ${data.reason}`));
    }
  });

  // ファイル共有拒否通知
  socket.on('file-share-denied', (data) => {
    console.log(chalk.red(`\n❌ ファイル共有が拒否されました`));
    console.log(chalk.cyan(`ファイル: ${data.file_name}`));
    console.log(chalk.gray(`拒否者: ${data.username}`));
    if (data.reason) {
      console.log(chalk.gray(`理由: ${data.reason}`));
    }
  });

  // 共有ファイル更新通知
  socket.on('shared-file-updated', (data) => {
    console.log(chalk.blue(`\n📝 共有ファイルが更新されました`));
    console.log(chalk.cyan(`ファイル: ${data.file_name}`));
    console.log(chalk.gray(`更新者: ${data.updated_by}`));
    console.log(chalk.gray(`更新時刻: ${new Date(data.updated_at).toLocaleString()}`));
  });

  // ファイル共有作成成功
  socket.on('file-share-created', (data) => {
    console.log(chalk.green(`\n✅ ファイル共有を作成しました`));
    console.log(chalk.cyan(`ファイル: ${data.file_name}`));
    console.log(chalk.gray(`トークン: ${data.share_token}`));
    console.log(chalk.gray(`有効期限: ${new Date(data.expires_at).toLocaleString()}`));
  });
}

function setupFileWatcher(
  codechatFile: string, 
  socket: Socket, 
  roomId: string, 
  username: string
) {
  let lastContent = '';
  
  const watcher = chokidar.watch(codechatFile, {
    persistent: true,
    ignoreInitial: true,
    usePolling: true,
    interval: 500
  });
  
  // 初期内容を読み込み
  readFileContent(codechatFile).then(content => {
    lastContent = content;
  });
  
  watcher.on('change', async () => {
    try {
      const currentContent = await readFileContent(codechatFile);
      
      // 新しく追加された内容を検出
      const newContent = extractNewContent(currentContent, lastContent);
      
      if (newContent) {
        // 行ごとに処理
        const lines = newContent.split('\n');
        
        for (const line of lines) {
          const trimmedLine = line.trim();
          
          if (!trimmedLine) continue;
          
          // ファイル共有コマンドをチェック
          if (isFileShareCommand(trimmedLine)) {
            await handleFileShareCommand(trimmedLine, socket, roomId, username);
            continue;
          }
          
          // 通常のメッセージとして送信
          const sanitizedContent = sanitizeMessage(trimmedLine);
          
          if (sanitizedContent) {
            socket.emit('send-message', {
              room_slug: roomId,
              username: username,
              content: sanitizedContent,
              message_type: detectMessageType(sanitizedContent)
            });
            
            // メッセージ送信後に入力エリアをクリア
            setTimeout(async () => {
              await clearInputArea(codechatFile);
            }, 100);
          }
        }
      }
      
      lastContent = currentContent;
    } catch (error) {
      console.error(chalk.red('ファイル処理エラー:', error.message));
    }
  });
  
  // 終了処理
  process.on('SIGINT', () => {
    console.log(chalk.yellow('\n💭 チャットを終了しています...'));
    watcher.close();
    socket.disconnect();
    console.log(chalk.green('👋 ありがとうございました！'));
    process.exit(0);
  });
  
  process.on('SIGTERM', () => {
    watcher.close();
    socket.disconnect();
    process.exit(0);
  });
}

async function promptUsername(): Promise<string> {
  const { username } = await inquirer.prompt([
    {
      type: 'input',
      name: 'username',
      message: 'ユーザー名を入力してください:',
      validate: (input) => {
        const trimmed = input.trim();
        if (trimmed.length === 0) return 'ユーザー名を入力してください';
        if (trimmed.length > 50) return 'ユーザー名は50文字以内で入力してください';
        if (!/^[a-zA-Z0-9_-]+$/.test(trimmed)) return 'ユーザー名は英数字、ハイフン、アンダースコアのみ使用できます';
        return true;
      }
    }
  ]);
  
  return username.trim();
}

async function handleFileShareCommand(
  line: string, 
  socket: Socket, 
  roomId: string, 
  username: string
) {
  const command = parseFileShareCommand(line);
  
  if (!command) {
    console.log(chalk.red('❌ 無効なファイル共有コマンドです'));
    return;
  }

  try {
    switch (command.command) {
      case 'share':
        if (!command.filePath) {
          console.log(chalk.red('❌ ファイルパスが指定されていません'));
          return;
        }
        
        console.log(chalk.blue(`📤 ファイル共有リクエストを送信: ${command.filePath}`));
        
        // 共有ファイルコマンドを実行
        const { shareFile } = await import('./share');
        await shareFile(command.filePath, {
          room: roomId,
          users: command.users?.join(','),
          permission: command.permission
        });
        break;

      case 'approve':
        if (!command.token) {
          console.log(chalk.red('❌ トークンが指定されていません'));
          return;
        }
        
        console.log(chalk.green(`✅ ファイル共有を承認: ${command.token}`));
        
        // Socket.IOで承認を送信
        socket.emit('respond-file-share', {
          share_token: command.token,
          username,
          action: 'approve'
        });
        break;

      case 'deny':
        if (!command.token) {
          console.log(chalk.red('❌ トークンが指定されていません'));
          return;
        }
        
        console.log(chalk.red(`❌ ファイル共有を拒否: ${command.token}`));
        
        // Socket.IOで拒否を送信
        socket.emit('respond-file-share', {
          share_token: command.token,
          username,
          action: 'deny'
        });
        break;

      default:
        console.log(chalk.red('❌ 不明なファイル共有コマンドです'));
    }
  } catch (error) {
    console.error(chalk.red('ファイル共有コマンドエラー:'), error.message);
  }
}