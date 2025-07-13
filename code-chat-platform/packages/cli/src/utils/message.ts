export function detectMessageType(content: string): 'text' | 'code' {
  return content.includes('```') ? 'code' : 'text';
}

export function formatMessage(username: string, content: string, timestamp: string, isOwnMessage: boolean = false): string {
  const time = new Date(timestamp).toLocaleTimeString('ja-JP', {
    hour: '2-digit',
    minute: '2-digit'
  });
  
  const userIcon = getUserIcon(username);
  const userColor = getUserColor(username);
  const isCode = content.includes('```');
  
  if (isCode) {
    return formatCodeMessage(username, content, time, userIcon, userColor, isOwnMessage);
  }
  
  // 通常のメッセージ
  return formatTextMessage(username, content, time, userIcon, userColor, isOwnMessage);
}

function formatTextMessage(username: string, content: string, time: string, icon: string, color: string, isOwnMessage: boolean): string {
  // シンプルな左寄せフォーマット: 名前 アイコン 時刻
  const wrappedContent = wrapText(content, 60);
  
  // ヘッダー行: 名前 アイコン 時刻（ANSIコードを削除）
  const header = `${username} ${icon} ${time}`;
  
  // メッセージ行
  const messageLines = wrappedContent.map(line => `  ${line}`);
  
  return `${header}
${messageLines.join('\n')}
`;
}

function getUserIcon(username: string): string {
  const icons = ['👤', '👨', '👩', '🧑', '👦', '👧', '🐱', '🐶', '🦊', '🐼', '🤖', '👽', '🎭', '🦄', '🔥'];
  const hash = username.split('').reduce((a, b) => a + b.charCodeAt(0), 0);
  return icons[hash % icons.length];
}

function getUserColor(username: string): string {
  // ANSI色コード（ターミナル対応）
  const colors = [
    '\x1b[94m', // 明るい青
    '\x1b[92m', // 明るい緑  
    '\x1b[95m', // 明るいマゼンタ
    '\x1b[96m', // 明るいシアン
    '\x1b[93m', // 明るい黄色
    '\x1b[91m', // 明るい赤
    '\x1b[97m', // 明るい白
    '\x1b[90m', // 明るい黒
  ];
  const hash = username.split('').reduce((a, b) => a + b.charCodeAt(0), 0);
  return colors[hash % colors.length];
}

function wrapText(text: string, maxWidth: number): string[] {
  const words = text.split(' ');
  const lines: string[] = [];
  let currentLine = '';

  for (const word of words) {
    if ((currentLine + word).length <= maxWidth) {
      currentLine += (currentLine ? ' ' : '') + word;
    } else {
      if (currentLine) {
        lines.push(currentLine);
      }
      currentLine = word;
    }
  }
  
  if (currentLine) {
    lines.push(currentLine);
  }
  
  return lines.length ? lines : [''];
}

function formatCodeMessage(username: string, content: string, time: string, icon: string, color: string, isOwnMessage: boolean): string {
  const codeBlocks = content.split('```');
  
  // シンプルな左寄せフォーマット: 名前 アイコン 💻 時刻（ANSIコードを削除）
  const header = `${username} ${icon} 💻 ${time}`;
  
  let formatted = `${header}\n`;
  
  for (let i = 0; i < codeBlocks.length; i++) {
    if (i % 2 === 1) { // コードブロック内
      const codeLines = codeBlocks[i].split('\n').filter(line => line.trim());
      codeLines.forEach(line => {
        formatted += `  ${line}\n`;
      });
    } else if (codeBlocks[i].trim()) { // テキスト部分
      const textLines = codeBlocks[i].trim().split('\n');
      textLines.forEach(line => {
        if (line.trim()) {
          formatted += `  ${line}\n`;
        }
      });
    }
  }
  
  formatted += '\n';
  return formatted;
}

export function sanitizeMessage(content: string): string {
  // 基本的なサニタイズ
  return content
    .trim()
    .replace(/[\r\n]+/g, '\n') // 改行を統一
    .substring(0, 10000); // 長さ制限
}

export function isSystemMessage(line: string): boolean {
  const trimmed = line.trim();
  return trimmed.startsWith('#') || trimmed.startsWith('[') || trimmed.length === 0;
}

export function extractNewContent(currentContent: string, lastContent: string): string {
  console.log('🔍 extractNewContent 開始');
  
  // 新しい線形式のマーカーを定義
  const inputLineStart = '------------------------------------------------------------------------------>';
  const separatorLine = '================================================================================';
  
  console.log('🔍 マーカー定義:', { inputLineStart: inputLineStart.substring(0, 20) + '...', separatorLine: separatorLine.substring(0, 20) + '...' });
  
  // 現在のコンテンツから入力エリアを抽出
  const currentInputArea = extractInputAreaFromContent(currentContent);
  console.log('🔍 現在の入力エリア:', `"${currentInputArea}"`);
  
  if (!currentInputArea) {
    console.log('🔍 現在の入力エリアが見つかりません');
    return '';
  }
  
  // 前回のコンテンツから入力エリアを抽出
  const lastInputArea = lastContent ? extractInputAreaFromContent(lastContent) : '';
  console.log('🔍 前回の入力エリア:', `"${lastInputArea}"`);
  
  // 両方のエリアを行に分割してクリーンアップ
  const currentLines = cleanupMessageLines(currentInputArea.split('\n'));
  const lastLines = lastContent ? cleanupMessageLines(lastInputArea.split('\n')) : [];
  
  console.log('🔍 現在のクリーンな行:', currentLines);
  console.log('🔍 前回のクリーンな行:', lastLines);
  
  // 差分を検出して新しいメッセージのみを抽出
  const newLines = detectNewLines(currentLines, lastLines);
  console.log('🔍 検出された新しい行:', newLines);
  
  // 結果をフィルタリングして返す
  const result = newLines.join('\n').trim();
  console.log('🔍 extractNewContent 結果:', `"${result}"`);
  
  return result;
}

function extractInputAreaFromContent(content: string): string {
  console.log('🔍 extractInputAreaFromContent 開始');
  
  const inputLineStart = '------------------------------------------------------------------------------>';
  const separatorLine = '================================================================================';
  
  // 最新の入力線を見つける
  const inputLineIndex = content.lastIndexOf(inputLineStart);
  console.log('🔍 入力線のインデックス:', inputLineIndex);
  
  if (inputLineIndex === -1) {
    console.log('🔍 入力線が見つかりません');
    return '';
  }
  
  // 入力線より前の部分を取得
  const beforeInputLine = content.substring(0, inputLineIndex);
  console.log('🔍 入力線より前の文字数:', beforeInputLine.length);
  
  // 最後の区切り線を見つける
  const lastSeparatorIndex = beforeInputLine.lastIndexOf(separatorLine);
  console.log('🔍 最後の区切り線のインデックス:', lastSeparatorIndex);
  
  if (lastSeparatorIndex === -1) {
    console.log('🔍 区切り線が見つかりません');
    return '';
  }
  
  // 区切り線から入力線までの内容を抽出
  const result = beforeInputLine.substring(lastSeparatorIndex + separatorLine.length);
  console.log('🔍 抽出された入力エリア:', `"${result}"`);
  
  return result;
}

function cleanupMessageLines(lines: string[]): string[] {
  console.log('🔍 cleanupMessageLines 開始');
  console.log('🔍 元の行数:', lines.length);
  console.log('🔍 元の行:', lines);
  
  const result = lines
    .map(line => line.trim())
    .filter(line => {
      if (!line) {
        console.log('🔍 空行を除外:', `"${line}"`);
        return false;
      }
      
      // システムメッセージやガイダンスを除外
      if (line.includes('💭 チャットを開始しましょう！')) {
        console.log('🔍 システムメッセージを除外:', `"${line}"`);
        return false;
      }
      if (line.includes('メッセージを線の上に書き')) {
        console.log('🔍 ガイダンスを除外:', `"${line}"`);
        return false;
      }
      if (line.includes('ファイルを保存すると送信されます')) {
        console.log('🔍 ガイダンスを除外:', `"${line}"`);
        return false;
      }
      if (line.includes('Ctrl+C で終了')) {
        console.log('🔍 ガイダンスを除外:', `"${line}"`);
        return false;
      }
      
      // コメント行を除外
      if (isSystemMessage(line)) {
        console.log('🔍 システムメッセージを除外:', `"${line}"`);
        return false;
      }
      
      console.log('🔍 有効な行として採用:', `"${line}"`);
      return true;
    });
  
  console.log('🔍 cleanupMessageLines 結果:', result);
  return result;
}

function detectNewLines(currentLines: string[], lastLines: string[]): string[] {
  console.log('🔍 detectNewLines 開始');
  console.log('🔍 現在の行数:', currentLines.length);
  console.log('🔍 前回の行数:', lastLines.length);
  
  // 前回の行数より多い場合、新しい行があるということ
  if (currentLines.length > lastLines.length) {
    const newLines = currentLines.slice(lastLines.length);
    console.log('🔍 新しい行を検出（行数増加）:', newLines);
    return newLines;
  }
  
  // 同じ長さの場合、最後の行が変更されているかチェック
  if (currentLines.length === lastLines.length && currentLines.length > 0) {
    const lastCurrentLine = currentLines[currentLines.length - 1];
    const lastPreviousLine = lastLines.length > 0 ? lastLines[lastLines.length - 1] : '';
    
    console.log('🔍 最後の行の比較:');
    console.log('🔍 現在の最後の行:', `"${lastCurrentLine}"`);
    console.log('🔍 前回の最後の行:', `"${lastPreviousLine}"`);
    
    if (lastCurrentLine !== lastPreviousLine) {
      // 最後の行が変更されている場合、その行のみを返す
      console.log('🔍 最後の行が変更されました:', [lastCurrentLine]);
      return [lastCurrentLine];
    }
  }
  
  console.log('🔍 新しい行は見つかりませんでした');
  return [];
}

function isKawazuCommand(line: string): boolean {
  const trimmed = line.trim();
  return trimmed.startsWith('kawazu ') || isFileShareCommand(trimmed);
}

export function isFileShareCommand(line: string): boolean {
  const trimmed = line.trim();
  return trimmed.startsWith('#share ') || trimmed.startsWith('#approve ') || trimmed.startsWith('#deny ');
}

export function parseFileShareCommand(line: string): {
  command: string;
  filePath?: string;
  users?: string[];
  permission?: 'read' | 'write';
  token?: string;
} | null {
  const trimmed = line.trim();
  
  // #share ファイルパス @user1 @user2 --write
  if (trimmed.startsWith('#share ')) {
    const parts = trimmed.substring(7).split(' ');
    const filePath = parts[0];
    const users = parts.filter(p => p.startsWith('@')).map(u => u.substring(1));
    const permission = parts.includes('--write') ? 'write' : 'read';
    
    return {
      command: 'share',
      filePath,
      users: users.length > 0 ? users : undefined,
      permission
    };
  }
  
  // #approve トークン
  if (trimmed.startsWith('#approve ')) {
    const token = trimmed.substring(9).trim();
    return {
      command: 'approve',
      token
    };
  }
  
  // #deny トークン
  if (trimmed.startsWith('#deny ')) {
    const token = trimmed.substring(6).trim();
    return {
      command: 'deny',
      token
    };
  }
  
  return null;
}