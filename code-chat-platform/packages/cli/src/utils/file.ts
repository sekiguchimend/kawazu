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
  const initialContent = `╔═══════════════════════════════════════════════════════════════════════════╗
║                        💬 Kawazu Chat Room: ${roomSlug.padEnd(25)}    ║
║                        👤 ユーザー: ${username.padEnd(30)}    ║
╚═══════════════════════════════════════════════════════════════════════════╝

┌─ 📝 使い方とコマンド ──────────────────────────────────────────────────┐
│ 💡 メッセージ: 下の入力エリアに書いて保存                                │
│ 🚀 コード: \`\`\` で囲んでください                                        │
│ 📂 ファイル共有: #share ファイル名 @ユーザー名 --write                   │
│ ✅ 承認: #approve <トークン>  ❌ 拒否: #deny <トークン>                  │
└──────────────────────────────────────────────────────────────────────────┘

╔═ チャット履歴 ═════════════════════════════════════════════════════════════╗
║                                                                           ║
║                                                                           ║
║                          💭 チャットを開始しましょう！                    ║
║                                                                           ║
║                                                                           ║
║                                                                           ║
║                                                                           ║
║                                                                           ║
║                                                                           ║
║                                                                           ║
║                                                                           ║
║                                                                           ║
║                                                                           ║
║                                                                           ║
║                                                                           ║
║                                                                           ║
║                                                                           ║
║                                                                           ║
║                                                                           ║
║                                                                           ║
╚═══════════════════════════════════════════════════════════════════════════╝

╔═ メッセージ入力 ═══════════════════════════════════════════════════════════╗
║                                                                           ║
║  💬 ここにメッセージを入力してください...                                 ║
║                                                                           ║
╚═══════════════════════════════════════════════════════════════════════════╝
`;
  
  await fs.writeFile(filePath, initialContent, 'utf8');
}

export async function appendMessageToFile(filePath: string, message: string): Promise<void> {
  try {
    // ファイルの内容を読み取り
    const currentContent = await fs.readFile(filePath, 'utf8');
    
    // チャット履歴エリアとメッセージ入力エリアの境界を特定
    const chatHistoryStart = '╔═ チャット履歴 ═════════════════════════════════════════════════════════════╗';
    const chatHistoryEnd = '╚═══════════════════════════════════════════════════════════════════════════╝';
    const inputAreaStart = '╔═ メッセージ入力 ═══════════════════════════════════════════════════════════╗';
    
    const historyStartIndex = currentContent.indexOf(chatHistoryStart);
    const historyEndIndex = currentContent.indexOf(chatHistoryEnd, historyStartIndex);
    const inputAreaIndex = currentContent.indexOf(inputAreaStart, historyEndIndex);
    
    if (historyStartIndex !== -1 && historyEndIndex !== -1 && inputAreaIndex !== -1) {
      // 現在のチャット履歴を抽出
      const beforeHistory = currentContent.substring(0, historyStartIndex);
      const currentHistory = currentContent.substring(historyStartIndex, historyEndIndex + chatHistoryEnd.length);
      const afterHistory = currentContent.substring(inputAreaIndex);
      
      // 既存のメッセージを抽出（空行や初期メッセージを除外）
      const existingMessages = extractExistingMessages(currentHistory);
      
      // 新しいメッセージを追加
      existingMessages.push(message);
      
      // メッセージ数を5個に制限
      const limitedMessages = existingMessages.slice(-5);
      
      // 新しいチャット履歴を構築
      const newHistory = buildChatHistory(limitedMessages);
      
      // ファイル全体を再構築
      const newContent = beforeHistory + newHistory + '\n' + afterHistory;
      await fs.writeFile(filePath, newContent, 'utf8');
    } else {
      // フォールバック: 従来通り末尾に追加
      await fs.appendFile(filePath, message, 'utf8');
    }
  } catch (error) {
    console.error('ファイル書き込みエラー:', error);
  }
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
    
    // 入力エリアをリセット
    const inputAreaStart = '╔═ メッセージ入力 ═══════════════════════════════════════════════════════════╗';
    const inputAreaEnd = '╚═══════════════════════════════════════════════════════════════════════════╝';
    
    const startIndex = currentContent.lastIndexOf(inputAreaStart);
    const endIndex = currentContent.lastIndexOf(inputAreaEnd);
    
    if (startIndex !== -1 && endIndex !== -1) {
      const beforeInput = currentContent.substring(0, startIndex);
      const afterInput = currentContent.substring(endIndex + inputAreaEnd.length);
      
      const cleanInputArea = `╔═ メッセージ入力 ═══════════════════════════════════════════════════════════╗
║                                                                           ║
║  💬 ここにメッセージを入力してください...                                 ║
║                                                                           ║
╚═══════════════════════════════════════════════════════════════════════════╝`;
      
      const newContent = beforeInput + cleanInputArea + afterInput;
      await fs.writeFile(filePath, newContent, 'utf8');
    }
  } catch (error) {
    console.error('入力エリアクリアエラー:', error);
  }
}