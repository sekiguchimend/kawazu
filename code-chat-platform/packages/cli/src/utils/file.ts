import * as fs from 'fs-extra';
import * as path from 'path';

export function getCodechatPath(roomSlug: string, workingDir: string = process.cwd()): string {
  return path.join(workingDir, `${roomSlug}.codechat`);
}

export async function createCodechatFile(
  filePath: string, 
  roomSlug: string, 
  username: string
): Promise<void> {
  const initialContent = `================================================================================
 File: ${roomSlug}.codechat
================================================================================

 Room: ${roomSlug}
 User: ${username}
 Max Messages: 7 (最新メッセージのみ表示)

================================================================================

💭 チャットを開始しましょう！

================================================================================


------------------------------------------------------------------------------>
メッセージを上の線上に書き

================================================================================
`;
  
  await fs.writeFile(filePath, initialContent, 'utf8');
  
  // コマンドヘルプファイルを作成
  await createCommandHelpFile(path.dirname(filePath), roomSlug);
}

// 新しい関数：ファイル存在チェック付きの安全な作成
export async function createCodechatFileIfNotExists(
  filePath: string, 
  roomSlug: string, 
  username: string
): Promise<{ created: boolean; existed: boolean }> {
  try {
    // ファイルの存在をチェック
    const fileExists = await fs.pathExists(filePath);
    
    if (fileExists) {
      console.log(`📄 既存のチャットファイルが見つかりました: ${path.basename(filePath)}`);
      
      // 既存ファイルのユーザー名を更新（必要に応じて）
      await updateUsernameInExistingFile(filePath, username);
      
      // コマンドヘルプファイルは常に最新にする
      await createCommandHelpFile(path.dirname(filePath), roomSlug);
      
      return { created: false, existed: true };
    } else {
      console.log(`📝 新しいチャットファイルを作成中: ${path.basename(filePath)}`);
      await createCodechatFile(filePath, roomSlug, username);
      return { created: true, existed: false };
    }
  } catch (error) {
    console.error('ファイル作成チェックエラー:', error);
    // エラーの場合は安全のため新しいファイルを作成
    await createCodechatFile(filePath, roomSlug, username);
    return { created: true, existed: false };
  }
}

// 既存ファイルのユーザー名を更新
async function updateUsernameInExistingFile(filePath: string, newUsername: string): Promise<void> {
  try {
    const content = await fs.readFile(filePath, 'utf8');
    
    // ヘッダー部分のユーザー名を更新
    const userLineRegex = /^ User: .+$/m;
    const updatedContent = content.replace(userLineRegex, ` User: ${newUsername}`);
    
    if (content !== updatedContent) {
      await fs.writeFile(filePath, updatedContent, 'utf8');
      console.log(`👤 ファイル内のユーザー名を更新しました: ${newUsername}`);
    }
  } catch (error) {
    console.error('ユーザー名更新エラー:', error);
    // エラーは無視（ファイルが存在することが重要）
  }
}

export async function appendMessageToFile(filePath: string, message: string): Promise<void> {
  try {
    console.log(`🔍 ファイル書き込み開始: ${path.basename(filePath)}`);
    console.log(`📝 追加するメッセージ: "${message.substring(0, 100)}${message.length > 100 ? '...' : ''}"`);
    
    // ファイルの内容を読み取り
    const currentContent = await fs.readFile(filePath, 'utf8');
    console.log(`📂 現在のファイルサイズ: ${currentContent.length}文字`);
    
    // 新しい形式の境界を特定
    const headerEnd = '================================================================================';
    const inputLineStart = '------------------------------------------------------------------------------>';
    
    const firstHeaderIndex = currentContent.indexOf(headerEnd);
    const secondHeaderIndex = currentContent.indexOf(headerEnd, firstHeaderIndex + 1);
    const thirdHeaderIndex = currentContent.indexOf(headerEnd, secondHeaderIndex + 1);
    const inputLineIndex = currentContent.lastIndexOf(inputLineStart);
    
    console.log(`🔍 ファイル構造解析:`, {
      firstHeaderIndex,
      secondHeaderIndex, 
      thirdHeaderIndex,
      inputLineIndex,
      validStructure: firstHeaderIndex !== -1 && secondHeaderIndex !== -1 && thirdHeaderIndex !== -1 && inputLineIndex !== -1
    });
    
    if (firstHeaderIndex !== -1 && secondHeaderIndex !== -1 && thirdHeaderIndex !== -1 && inputLineIndex !== -1) {
      // ヘッダー部分
      const headerPart = currentContent.substring(0, secondHeaderIndex + headerEnd.length);
      
      // 現在のメッセージ部分
      const messagePart = currentContent.substring(secondHeaderIndex + headerEnd.length, thirdHeaderIndex);
      
      // フッター部分（入力エリア以降）
      const footerStart = currentContent.substring(thirdHeaderIndex);
      
      console.log(`🔍 ファイル構造分割完了:`, {
        headerLength: headerPart.length,
        messagePartLength: messagePart.length,
        footerLength: footerStart.length
      });
      
      // 既存のメッセージを抽出
      const existingMessages = extractMessagesFromContent(messagePart);
      console.log(`📜 既存メッセージ数: ${existingMessages.length}`);
      
      // 新しいメッセージを追加
      existingMessages.push(message);
      console.log(`📝 メッセージ追加後: ${existingMessages.length}件`);
      
      // メッセージ数を7個に制限
      const limitedMessages = existingMessages.slice(-7);
      console.log(`📊 制限後のメッセージ数: ${limitedMessages.length}`);
      
      // 新しいメッセージ部分を構築
      const newMessagePart = buildMessageContent(limitedMessages);
      console.log(`🔧 新しいメッセージ部分のサイズ: ${newMessagePart.length}文字`);
      
      // ファイル全体を再構築
      const newContent = headerPart + '\n' + newMessagePart + '\n' + footerStart;
      console.log(`📄 新しいファイルサイズ: ${newContent.length}文字`);
      
      await fs.writeFile(filePath, newContent, 'utf8');
      console.log(`✅ ファイル書き込み完了: ${path.basename(filePath)}`);
    } else {
      console.error(`❌ ファイル形式が認識できません:`, {
        filePath,
        contentLength: currentContent.length,
        headerEndCount: (currentContent.match(new RegExp(headerEnd, 'g')) || []).length,
        inputLineCount: (currentContent.match(new RegExp(inputLineStart, 'g')) || []).length
      });
      
      // フォールバック: メッセージを最後に追加
      const fallbackContent = currentContent + '\n' + message;
      await fs.writeFile(filePath, fallbackContent, 'utf8');
      console.log(`⚠️ フォールバック書き込み完了`);
    }
  } catch (error) {
    console.error(`❌ ファイル書き込みエラー:`, {
      filePath,
      message: message.substring(0, 100),
      error: error.message,
      stack: error.stack
    });
    
    // 重要なエラーの場合は再スロー
    throw error;
  }
}

function extractMessagesFromContent(messageSection: string): string[] {
  const messages: string[] = [];
  const lines = messageSection.split('\n');
  
  let currentMessage = '';
  let collectingMessage = false;
  
  for (const line of lines) {
    // メッセージの開始を検出（名前 アイコン 時刻の形式）
    // 例: "関口峻矢 👦 12:34" または ANSIエスケープシーケンス付き
    if (line.match(/^[^\s]+\s+[^\s]+\s+\d{1,2}:\d{2}/) || 
        line.match(/^\[[0-9;]+m[^\s]+\s+[^\s]+.*\[[0-9;]*m/)) {
      // 前のメッセージを保存
      if (currentMessage.trim()) {
        messages.push(currentMessage.trim());
      }
      currentMessage = line;
      collectingMessage = true;
    } else if (collectingMessage && line.trim() !== '') {
      // メッセージの続きを追加
      currentMessage += '\n' + line;
    } else if (collectingMessage && line.trim() === '') {
      // 空行でメッセージ終了
      if (currentMessage.trim()) {
        messages.push(currentMessage.trim());
      }
      currentMessage = '';
      collectingMessage = false;
    }
  }
  
  // 最後のメッセージを保存
  if (currentMessage.trim()) {
    messages.push(currentMessage.trim());
  }
  
  return messages.filter(msg => msg.length > 0 && !msg.includes('💭 チャットを開始しましょう！'));
}

function extractExistingMessages(historySection: string): string[] {
  const messages: string[] = [];
  const lines = historySection.split('\n');
  
  let currentMessage = '';
  let insideMessage = false;
  
  for (const line of lines) {
    // メッセージの開始を検出（┌─ で始まる行）
    if (line.includes('┌─') && !line.includes('チャット履歴')) {
      if (currentMessage.trim()) {
        messages.push(currentMessage.trim());
      }
      currentMessage = line + '\n';
      insideMessage = true;
    } else if (insideMessage) {
      currentMessage += line + '\n';
      // メッセージの終了を検出（└─ で始まる行）
      if (line.includes('└─')) {
        messages.push(currentMessage.trim());
        currentMessage = '';
        insideMessage = false;
      }
    }
  }
  
  return messages.filter(msg => msg.length > 0 && !msg.includes('💭 チャットを開始しましょう！'));
}

function buildMessageContent(messages: string[]): string {
  if (messages.length === 0) {
    return '💭 チャットを開始しましょう！';
  }
  
  // 7つ以上のメッセージがある場合は、古いメッセージ削除の表示を追加
  let content = '';
  if (messages.length >= 7) {
    content += '▲ 古いメッセージは自動削除されます（7つまで表示）\n\n';
  }
  
  // メッセージを追加
  for (let i = 0; i < messages.length; i++) {
    content += messages[i];
    if (i < messages.length - 1) {
      content += '\n';
    }
  }
  
  return content;
}

function buildChatHistory(messages: string[]): string {
  const chatHistoryStart = '╔═ チャット履歴 ═════════════════════════════════════════════════════════════╗';
  const chatHistoryEnd = '╚═══════════════════════════════════════════════════════════════════════════╝';
  
  let historyContent = chatHistoryStart + '\n';
  
  if (messages.length === 0) {
    // メッセージがない場合は初期状態
    for (let i = 0; i < 18; i++) {
      if (i === 9) {
        historyContent += '║                          💭 チャットを開始しましょう！                    ║\n';
      } else {
        historyContent += '║                                                                           ║\n';
      }
    }
  } else {
    // メッセージがある場合は表示
    let lineCount = 0;
    const maxLines = 18;
    
    for (const message of messages) {
      const messageLines = message.split('\n');
      
      // メッセージの前に空行を追加
      if (lineCount > 0 && lineCount < maxLines) {
        historyContent += '║                                                                           ║\n';
        lineCount++;
      }
      
      // メッセージを追加
      for (const line of messageLines) {
        if (lineCount < maxLines) {
          historyContent += line + '\n';
          lineCount++;
        }
      }
    }
    
    // 残りの行を空行で埋める
    while (lineCount < maxLines) {
      historyContent += '║                                                                           ║\n';
      lineCount++;
    }
  }
  
  historyContent += chatHistoryEnd;
  return historyContent;
}

export async function readFileContent(filePath: string): Promise<string> {
  try {
    return await fs.readFile(filePath, 'utf8');
  } catch (error) {
    console.error('ファイル読み取りエラー:', error);
    return '';
  }
}

export async function ensureDirectory(dirPath: string): Promise<void> {
  await fs.ensureDir(dirPath);
}

export function isValidRoomSlug(slug: string): boolean {
  return /^[a-zA-Z0-9-_]+$/.test(slug);
}

export async function getCurrentRoomFromCodechat(): Promise<string | null> {
  try {
    const currentDir = process.cwd();
    const files = await fs.readdir(currentDir);
    
    // .codechatファイルを探す
    const codechatFiles = files.filter(file => file.endsWith('.codechat'));
    
    if (codechatFiles.length === 0) {
      return null;
    }

    // 最初の.codechatファイルからルーム名を抽出
    const codechatFile = codechatFiles[0];
    const roomSlug = codechatFile.replace('.codechat', '');
    
    return roomSlug;
  } catch (error) {
    console.error('ルーム情報取得エラー:', error);
    return null;
  }
}

export async function getCodechatFiles(): Promise<string[]> {
  try {
    const currentDir = process.cwd();
    const files = await fs.readdir(currentDir);
    
    return files.filter(file => file.endsWith('.codechat'));
  } catch (error) {
    console.error('ファイル一覧取得エラー:', error);
    return [];
  }
}

export async function clearInputArea(filePath: string): Promise<void> {
  try {
    const currentContent = await fs.readFile(filePath, 'utf8');
    
    // 入力線の上の部分をクリア
    const inputLineStart = '------------------------------------------------------------------------------>';
    const inputLineIndex = currentContent.lastIndexOf(inputLineStart);
    
    if (inputLineIndex !== -1) {
      // 入力線より前の部分を取得
      const beforeInputLine = currentContent.substring(0, inputLineIndex);
      
      // 最後の区切り線（================）を見つける
      const lastSeparator = '================================================================================';
      const lastSeparatorIndex = beforeInputLine.lastIndexOf(lastSeparator);
      
      if (lastSeparatorIndex !== -1) {
        const beforeMessages = beforeInputLine.substring(0, lastSeparatorIndex + lastSeparator.length);
        const inputArea = currentContent.substring(inputLineIndex);
        
        // 入力エリアをクリア（空行2つ + 入力線以降）
        const cleanContent = beforeMessages + '\n\n\n' + inputArea;
        await fs.writeFile(filePath, cleanContent, 'utf8');
      }
    }
  } catch (error) {
    console.error('入力エリアクリアエラー:', error);
  }
}

export async function createCommandHelpFile(
  dirPath: string, 
  roomSlug: string
): Promise<void> {
  const helpFilePath = path.join(dirPath, `${roomSlug}-commands.kawazu`);
  
  const helpContent = `================================================================================
 Kawazu コマンドリファレンス - ${roomSlug}
================================================================================

📋 基本操作:
  • メッセージ送信: .codechatファイルで編集後 Ctrl+S
  • チャット終了: Ctrl+C

🔧 利用可能なコマンド:

📁 ファイル共有:
  kawazu share /path/to/file.js
  └─ ファイルを他の参加者と共有（承認が必要）

👤 ユーザー情報:
  kawazu profile ユーザー名
  └─ 指定ユーザーのプロフィールを表示

🏠 ルーム操作:
  kawazu list
  └─ 参加可能なルーム一覧を表示
  
  kawazu create "新しいルーム名"
  └─ 新しいルームを作成

🔐 認証・プラン:
  kawazu login
  └─ Webアプリアカウントでログイン
  
  kawazu logout
  └─ ログアウト
  
  kawazu whoami
  └─ 現在のユーザー情報を表示
  
  kawazu plan
  └─ サブスクリプションプラン情報を確認

💬 メッセージ形式:
  • プレーンテキスト
  • コードブロック: \`\`\`言語名 で開始
  • 絵文字対応

📊 制限事項:
  • メッセージ履歴: 7つまで（古いものは自動削除）
  • ファイル共有: プランに応じた容量制限
  • ルーム作成数: プランに応じた制限

================================================================================
`;

  await fs.writeFile(helpFilePath, helpContent, 'utf8');
  console.log(`📖 コマンドヘルプファイルを作成しました: ${roomSlug}-commands.kawazu`);
}