import { io, Socket } from 'socket.io-client';
import chalk from 'chalk';
import ora from 'ora';
import chokidar from 'chokidar';
import inquirer from 'inquirer';
import { JoinOptions } from '../types';
import { loadConfig } from '../utils/config';
import { 
  createCodechatFile, 
  createCodechatFileIfNotExists,
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

  // デバッグモードのチェック
  const debugMode = process.env.KAWAZU_DEBUG === 'true';
  const spinner = debugMode ? null : ora('ルームに接続中...').start();
  
  if (debugMode) {
    console.log(chalk.yellow('🔍 デバッグモードが有効です'));
    console.log(chalk.blue('🔍 ルームに接続中...'));
  }
  
  try {
    // ユーザー名の取得（認証済みユーザーの場合はconfig.user_usernameを使用）
    const username = options.username || config.user_username || config.default_username || await promptUsername();
    
    // .codechatファイルのパス
    const codechatFile = getCodechatPath(roomId);
    
    // .codechatファイルの存在チェックと作成
    const fileResult = await createCodechatFileIfNotExists(codechatFile, roomId, username);
    
    if (fileResult.existed) {
      console.log(chalk.green(`📂 既存のチャットファイルを使用します`));
      console.log(chalk.gray(`💡 これまでのメッセージ履歴が保持されています`));
    } else {
      console.log(chalk.blue(`📄 新しいチャットファイルを作成しました`));
    }
    
    // WebSocket接続（認証トークン付き・安定性重視設定）
    const socket = io(config.server_url, {
      timeout: 30000, // 接続タイムアウトを30秒に延長
      transports: ['polling', 'websocket'], // pollingを優先して安定性を重視
      forceNew: false, // 既存接続の再利用を許可
      autoConnect: true,
      reconnection: true,
      reconnectionAttempts: 10, // 再接続試行回数を増加
      reconnectionDelay: 1000, // 初回再接続を早める
      reconnectionDelayMax: 10000, // 最大遅延を延長
      randomizationFactor: 0.5,
      auth: {
        token: config.auth_token
      },
      upgrade: true,
      rememberUpgrade: false // アップグレード記憶を無効化（安定性重視）
    });
    
    if (spinner) {
      spinner.text = 'サーバーに接続中...';
    } else {
      console.log(chalk.blue('🔍 サーバーに接続中...'));
    }
    
    // 接続エラーハンドリング
    socket.on('connect_error', (error) => {
      if (spinner) {
        spinner.fail('サーバー接続に失敗しました');
      } else {
        console.log(chalk.red('❌ サーバー接続に失敗しました'));
      }
      console.error(chalk.red(`接続エラー: ${error.message}`));
      console.log(chalk.blue('🔍 接続エラーの詳細:'), error);
      
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
    
    // 切断イベント
    socket.on('disconnect', (reason, details) => {
      console.log(chalk.yellow(`🔍 WebSocket切断: ${reason}`));
      if (details) {
        console.log(chalk.gray('🔍 切断詳細:'), details);
      }
      
      // 参加前の切断の場合はエラーとして扱う
      if (!roomJoined && reason !== 'io client disconnect') {
        console.error(chalk.red('❌ ルーム参加前に接続が切断されました'));
        console.log(chalk.yellow('💡 サーバー側で認証処理に問題がある可能性があります'));
      }
    });
    
    // 再接続イベント
    socket.on('reconnect', (attemptNumber) => {
      console.log(chalk.blue(`🔍 WebSocket再接続: ${attemptNumber}`));
    });
    
    // 再接続エラー
    socket.on('reconnect_error', (error) => {
      console.log(chalk.red(`🔍 再接続エラー: ${error.message}`));
    });
    
    // タイムアウト処理
    setTimeout(() => {
      if (!socket.connected) {
        if (spinner) {
          spinner.fail('接続タイムアウト');
        } else {
          console.log(chalk.red('❌ 接続タイムアウト'));
        }
        console.error(chalk.red('サーバーへの接続がタイムアウトしました'));
        process.exit(1);
      }
    }, 30000);
    
    // ルーム参加のタイムアウト処理
    let roomJoined = false;
    setTimeout(() => {
      if (socket.connected && !roomJoined) {
        if (spinner) {
          spinner.fail('ルーム参加タイムアウト');
        } else {
          console.log(chalk.red('❌ ルーム参加タイムアウト'));
        }
        console.error(chalk.red('ルーム参加がタイムアウトしました'));
        console.log(chalk.yellow('サーバーからの応答がありません。'));
        process.exit(1);
      }
    }, 60000);
    
    // 接続成功時の処理
    socket.on('connect', () => {
      if (spinner) {
        spinner.text = 'ルームに参加中...';
      } else {
        console.log(chalk.blue('🔍 ルームに参加中...'));
      }
      console.log(chalk.blue('🔍 WebSocket接続成功'));
      
      // 接続安定化のため少し待ってからリクエスト送信
      setTimeout(() => {
        if (!socket.connected) {
          console.log(chalk.red('🔍 Socket disconnected, aborting join request'));
          return;
        }
        
        // ルーム参加リクエスト
        const joinData = {
          room_slug: roomId,
          username: username,
          password: options.password
        };
        console.log(chalk.blue('🔍 join-roomリクエスト送信:'), joinData);
        console.log(chalk.blue('🔍 Socket状態:'), { 
          connected: socket.connected,
          id: socket.id 
        });
        
        socket.emit('join-room', joinData);
      }, 1000); // 1秒待機に延長
    });
    
    // ルーム参加成功
    socket.on('joined-room', (data) => {
      roomJoined = true;
      if (spinner) {
        spinner.succeed(`ルーム "${data.room.name}" に参加しました！`);
      } else {
        console.log(chalk.green(`✅ ルーム "${data.room.name}" に参加しました！`));
      }
      console.log(chalk.green(`📝 ${codechatFile} をエディタで開いてチャットを開始してください`));
      console.log(chalk.blue(`💡 終了するには Ctrl+C を押してください`));
      
      // ファイル監視を開始
      setupFileWatcher(codechatFile, socket, roomId, username);
      
      // Socket イベントリスナーの設定
      setupSocketListeners(socket, codechatFile, username);
    });
    
    // エラーハンドリング
    socket.on('error', (error) => {
      if (spinner) {
        spinner.fail('エラーが発生しました');
      } else {
        console.log(chalk.red('❌ エラーが発生しました'));
      }
      console.error(chalk.red(`❌ ${error.message || error}`));
      console.log(chalk.blue('🔍 エラーの詳細:'), JSON.stringify(error, null, 2));
      
      // ユーザー名の問題の場合
      if (error.message && error.message.includes('Invalid username')) {
        console.log(chalk.yellow('💡 ユーザー名に問題があります。英数字、日本語、アンダースコア、ハイフンが使用できます。'));
      } else if (error.message && (error.message.includes('Password required') || error.message.includes('Invalid password'))) {
        console.log(chalk.yellow('💡 プライベートルームの場合は -p オプションでパスワードを指定してください'));
        console.log(chalk.gray('例: kawazu join room-name -p password'));
      }
      
      socket.disconnect();
      process.exit(1);
    });
    
    // Socket イベントリスナーは joinRoom 内で設定される
    
  } catch (error) {
    if (spinner) {
      spinner.fail('ルーム参加に失敗しました');
    } else {
      console.log(chalk.red('❌ ルーム参加に失敗しました'));
    }
    console.error(chalk.red(`エラー: ${error.message}`));
    process.exit(1);
  }
}

function setupSocketListeners(socket: Socket, codechatFile: string, currentUsername: string) {
  // 新しいメッセージを受信
  socket.on('new-message', async (message) => {
    try {
      console.log(chalk.blue('🔍 new-messageイベント受信:'), {
        type: typeof message,
        isNull: message === null,
        isUndefined: message === undefined,
        data: message
      });

      // メッセージの有効性をチェック
      if (!message || typeof message !== 'object' || !message.username || !message.content) {
        console.log(chalk.yellow('⚠️ 無効なメッセージを受信しました:'), {
          message,
          hasUsername: message && message.username,
          hasContent: message && message.content,
          messageType: typeof message
        });
        return;
      }

      console.log(chalk.green('✅ 有効なメッセージを受信:'), {
        username: message.username,
        content: message.content,
        created_at: message.created_at
      });

      const isOwnMessage = message.username === currentUsername;
      const formattedMessage = formatMessage(
        message.username, 
        message.content, 
        message.created_at,
        isOwnMessage
      );
      
      await appendMessageToFile(codechatFile, formattedMessage);
      console.log(chalk.green('📝 メッセージをファイルに追加しました'));
    } catch (error) {
      console.error(chalk.red('メッセージ処理エラー:'), error.message);
      console.log(chalk.gray('受信したメッセージ:'), JSON.stringify(message, null, 2));
      console.log(chalk.gray('エラースタック:'), error.stack);
    }
  });

  // プロフィールURL応答
  socket.on('profile-url-response', (data) => {
    if (!data || typeof data !== 'object' || !data.username) {
      console.log(chalk.yellow('⚠️ 無効なプロフィール応答を受信しました'));
      return;
    }

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
    if (!data || typeof data !== 'object' || !data.username) {
      console.log(chalk.yellow('⚠️ 無効なユーザー参加通知を受信しました'));
      return;
    }
    console.log(chalk.blue(`👋 ${data.username} がルームに参加しました`));
  });
  
  // ユーザー退出通知
  socket.on('user-left', (data) => {
    if (!data || typeof data !== 'object' || !data.username) {
      console.log(chalk.yellow('⚠️ 無効なユーザー退出通知を受信しました'));
      return;
    }
    console.log(chalk.yellow(`👋 ${data.username} がルームから退出しました`));
  });
  
  // タイピング状態
  socket.on('user-typing', (data) => {
    if (!data || typeof data !== 'object' || !data.username) {
      console.log(chalk.yellow('⚠️ 無効なタイピング状態を受信しました'));
      return;
    }
    if (data.is_typing) {
      console.log(chalk.gray(`✏️  ${data.username} が入力中...`));
    }
  });
  
  // 参加者一覧
  socket.on('participants-list', (participants) => {
    if (!participants || !Array.isArray(participants)) {
      console.log(chalk.yellow('⚠️ 無効な参加者一覧を受信しました'));
      return;
    }
    
    try {
      const usernames = participants
        .filter(p => p && typeof p === 'object' && p.username)
        .map(p => p.username)
        .join(', ');
      
      console.log(chalk.cyan(`👥 参加者 (${participants.length}人): ${usernames || '参加者なし'}`));
      console.log(chalk.gray('💡 ユーザー名をタップしてプロフィールを表示: kawazu profile <username>'));
    } catch (error) {
      console.error(chalk.red('参加者一覧の処理でエラーが発生しました:'), error.message);
      console.log(chalk.gray('受信した参加者データ:'), JSON.stringify(participants, null, 2));
    }
  });

  // ファイル共有関連のリスナー
  setupFileShareListeners(socket);
}

function setupFileShareListeners(socket: Socket) {
  // ファイル共有リクエスト受信
  socket.on('file-share-request', (data) => {
    if (!data || !data.file_name || !data.owner_username || !data.share_token) {
      console.log(chalk.yellow('⚠️ 無効なファイル共有リクエストを受信しました'));
      return;
    }

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
    if (!data || !data.file_name || !data.username) {
      console.log(chalk.yellow('⚠️ 無効なファイル共有承認通知を受信しました'));
      return;
    }

    console.log(chalk.green(`\n✅ ファイル共有が承認されました`));
    console.log(chalk.cyan(`ファイル: ${data.file_name}`));
    console.log(chalk.gray(`承認者: ${data.username}`));
    if (data.reason) {
      console.log(chalk.gray(`理由: ${data.reason}`));
    }
  });

  // ファイル共有拒否通知
  socket.on('file-share-denied', (data) => {
    if (!data || !data.file_name || !data.username) {
      console.log(chalk.yellow('⚠️ 無効なファイル共有拒否通知を受信しました'));
      return;
    }

    console.log(chalk.red(`\n❌ ファイル共有が拒否されました`));
    console.log(chalk.cyan(`ファイル: ${data.file_name}`));
    console.log(chalk.gray(`拒否者: ${data.username}`));
    if (data.reason) {
      console.log(chalk.gray(`理由: ${data.reason}`));
    }
  });

  // 共有ファイル更新通知
  socket.on('shared-file-updated', (data) => {
    if (!data || !data.file_name || !data.updated_by || !data.updated_at) {
      console.log(chalk.yellow('⚠️ 無効な共有ファイル更新通知を受信しました'));
      return;
    }

    console.log(chalk.blue(`\n📝 共有ファイルが更新されました`));
    console.log(chalk.cyan(`ファイル: ${data.file_name}`));
    console.log(chalk.gray(`更新者: ${data.updated_by}`));
    console.log(chalk.gray(`更新時刻: ${new Date(data.updated_at).toLocaleString()}`));
  });

  // ファイル共有作成成功
  socket.on('file-share-created', (data) => {
    if (!data || !data.file_name || !data.share_token || !data.expires_at) {
      console.log(chalk.yellow('⚠️ 無効なファイル共有作成通知を受信しました'));
      return;
    }

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
    console.log(chalk.gray('🔍 ファイル監視開始 - 初期ファイルサイズ:'), content.length);
  });
  
  watcher.on('change', async () => {
    try {
      console.log(chalk.blue('🔍 ファイル変更検出'));
      const currentContent = await readFileContent(codechatFile);
      console.log(chalk.gray('🔍 現在のファイルサイズ:'), currentContent.length);
      console.log(chalk.gray('🔍 前回のファイルサイズ:'), lastContent.length);
      
      // 新しく追加された内容を検出
      const newContent = extractNewContent(currentContent, lastContent);
      console.log(chalk.gray('🔍 抽出された新しいコンテンツ:'), `"${newContent}"`);
      
      // デバッグ用：シンプルな差分検出も試してみる
      const simpleNewContent = currentContent.length > lastContent.length ? 
        currentContent.substring(lastContent.length).trim() : '';
      console.log(chalk.gray('🔍 シンプル差分検出結果:'), `"${simpleNewContent}"`);
      
      // 入力線以降の部分だけを比較する方法も試してみる
      const inputLineStart = '------------------------------------------------------------------------------>';
      const currentInputIndex = currentContent.lastIndexOf(inputLineStart);
      const lastInputIndex = lastContent.lastIndexOf(inputLineStart);
      
      let inputAreaNewContent = '';
      if (currentInputIndex !== -1 && lastInputIndex !== -1) {
        const currentInputSection = currentContent.substring(currentInputIndex);
        const lastInputSection = lastContent.substring(lastInputIndex);
        
        if (currentInputSection !== lastInputSection) {
          // 入力エリアに変更があった場合
          const currentLines = currentInputSection.split('\n');
          const lastLines = lastInputSection.split('\n');
          
          // 新しい行を検出
          if (currentLines.length > lastLines.length) {
            inputAreaNewContent = currentLines.slice(lastLines.length).join('\n').trim();
          }
        }
      }
      console.log(chalk.gray('🔍 入力エリア差分検出結果:'), `"${inputAreaNewContent}"`);
      
      // いずれかの方法で新しいコンテンツが見つかった場合
      const finalNewContent = newContent || inputAreaNewContent;
      
      if (finalNewContent) {
        console.log(chalk.green('🔍 新しいコンテンツを検出しました'));
        
        // 行ごとに処理
        const lines = finalNewContent.split('\n');
        console.log(chalk.gray('🔍 処理する行数:'), lines.length);
        
        for (const line of lines) {
          const trimmedLine = line.trim();
          console.log(chalk.gray('🔍 処理中の行:'), `"${trimmedLine}"`);
          
          if (!trimmedLine) {
            console.log(chalk.gray('🔍 空行のためスキップ'));
            continue;
          }
          
          // ファイル共有コマンドをチェック
          if (isFileShareCommand(trimmedLine)) {
            console.log(chalk.blue('🔍 ファイル共有コマンドを検出'));
            await handleFileShareCommand(trimmedLine, socket, roomId, username);
            continue;
          }
          
          // 通常のメッセージとして送信
          const sanitizedContent = sanitizeMessage(trimmedLine);
          console.log(chalk.gray('🔍 サニタイズ後のコンテンツ:'), `"${sanitizedContent}"`);
          
          if (sanitizedContent) {
            console.log(chalk.green('🔍 メッセージを送信中...'));
            console.log(chalk.gray('🔍 送信データ:'), {
              room_slug: roomId,
              username: username,
              content: sanitizedContent,
              message_type: detectMessageType(sanitizedContent)
            });
            
            socket.emit('send-message', {
              room_slug: roomId,
              username: username,
              content: sanitizedContent,
              message_type: detectMessageType(sanitizedContent)
            });
            
            console.log(chalk.green('✅ メッセージ送信完了'));
            
            // メッセージ送信後に入力エリアをクリア
            setTimeout(async () => {
              console.log(chalk.gray('🔍 入力エリアをクリア中...'));
              await clearInputArea(codechatFile);
              
              // lastContentを更新してファイル監視のループを防ぐ
              lastContent = await readFileContent(codechatFile);
              console.log(chalk.gray('✅ 入力エリアクリア完了'));
            }, 100);
          } else {
            console.log(chalk.yellow('🔍 サニタイズ後のコンテンツが空のため送信しません'));
          }
        }
      } else {
        console.log(chalk.yellow('🔍 新しいコンテンツが見つかりませんでした'));
        console.log(chalk.gray('🔍 詳細:'));
        console.log(chalk.gray('  - extractNewContent:'), `"${newContent}"`);
        console.log(chalk.gray('  - inputAreaNewContent:'), `"${inputAreaNewContent}"`);
      }
      
      lastContent = currentContent;
    } catch (error) {
      console.error(chalk.red('ファイル処理エラー:', error.message));
      console.error(chalk.red('スタックトレース:'), error.stack);
    }
  });
  
  // エラーハンドリング
  watcher.on('error', (error) => {
    console.error(chalk.red('ファイル監視エラー:'), error);
  });
  
  console.log(chalk.green('📁 ファイル監視が開始されました'));
  console.log(chalk.gray('監視対象:'), codechatFile);
  
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