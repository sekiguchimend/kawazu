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
  const messageWidth = 65; // チャット履歴エリア内の幅
  const maxContentWidth = 45;
  
  // メッセージ内容を適切に分割
  const wrappedContent = wrapText(content, maxContentWidth);
  
  if (isOwnMessage) {
    // 右寄せ（自分のメッセージ）
    const headerLine = `${time} ─ ${username} ${icon}`.padStart(messageWidth);
    const contentLines = wrappedContent.map(line => 
      `║${(' '.repeat(messageWidth - line.length - 3))}${line}  ║`
    );
    
    return `║${' '.repeat(messageWidth - 2)}║
║${' '.repeat(Math.max(0, messageWidth - headerLine.length - 2))}${color}┌─${headerLine}─┐${'\x1b[0m'}║
${contentLines.join('\n')}
║${' '.repeat(Math.max(0, messageWidth - 2))}${color}└${'─'.repeat(Math.min(headerLine.length + 4, messageWidth - 4))}┘${'\x1b[0m'}║`;
  } else {
    // 左寄せ（他の人のメッセージ）
    const headerLine = `${icon} ${username} ─ ${time}`;
    const contentLines = wrappedContent.map(line => 
      `║  ${line}${' '.repeat(Math.max(0, messageWidth - line.length - 4))}║`
    );
    
    return `║${' '.repeat(messageWidth - 2)}║
║${color}┌─${headerLine}${'─'.repeat(Math.max(0, messageWidth - headerLine.length - 6))}┐${'\x1b[0m'}║
${contentLines.join('\n')}
║${color}└${'─'.repeat(Math.min(headerLine.length + 2, messageWidth - 4))}┘${'\x1b[0m'}║`;
  }
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
  const messageWidth = 65;
  const codeBlocks = content.split('```');
  
  if (isOwnMessage) {
    // 右寄せコードメッセージ
    const headerLine = `${time} ─ ${username} ${icon} 💻`;
    let formatted = `║${' '.repeat(messageWidth - 2)}║
║${' '.repeat(Math.max(0, messageWidth - headerLine.length - 6))}${color}┌─${headerLine}─┐${'\x1b[0m'}║\n`;
    
    for (let i = 0; i < codeBlocks.length; i++) {
      if (i % 2 === 1) { // コードブロック内
        const codeLines = codeBlocks[i].split('\n').filter(line => line.trim());
        codeLines.forEach(line => {
          const truncatedLine = line.substring(0, 50);
          formatted += `║${' '.repeat(Math.max(0, messageWidth - truncatedLine.length - 5))}\x1b[100m${truncatedLine}\x1b[0m  ║\n`;
        });
      } else if (codeBlocks[i].trim()) { // テキスト部分
        const textLine = codeBlocks[i].trim().substring(0, 50);
        formatted += `║${' '.repeat(Math.max(0, messageWidth - textLine.length - 5))}${textLine}  ║\n`;
      }
    }
    
    formatted += `║${' '.repeat(Math.max(0, messageWidth - headerLine.length - 4))}${color}└${'─'.repeat(Math.min(headerLine.length + 2, messageWidth - 6))}┘${'\x1b[0m'}║`;
    return formatted;
  } else {
    // 左寄せコードメッセージ
    const headerLine = `${icon} ${username} ─ ${time} 💻`;
    let formatted = `║${' '.repeat(messageWidth - 2)}║
║${color}┌─${headerLine}${'─'.repeat(Math.max(0, messageWidth - headerLine.length - 6))}┐${'\x1b[0m'}║\n`;
    
    for (let i = 0; i < codeBlocks.length; i++) {
      if (i % 2 === 1) { // コードブロック内
        const codeLines = codeBlocks[i].split('\n').filter(line => line.trim());
        codeLines.forEach(line => {
          const truncatedLine = line.substring(0, 55);
          formatted += `║  \x1b[100m${truncatedLine.padEnd(55)}\x1b[0m  ║\n`;
        });
      } else if (codeBlocks[i].trim()) { // テキスト部分
        const textLine = codeBlocks[i].trim();
        formatted += `║  ${textLine.substring(0, 55).padEnd(55)}  ║\n`;
      }
    }
    
    formatted += `║${color}└${'─'.repeat(Math.min(headerLine.length + 2, messageWidth - 4))}┘${'\x1b[0m'}║`;
    return formatted;
  }
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
  // 入力エリアからメッセージを抽出
  const inputAreaStart = '╔═ メッセージ入力 ═══════════════════════════════════════════════════════════╗';
  const inputAreaEnd = '╚═══════════════════════════════════════════════════════════════════════════╝';
  
  const startIndex = currentContent.lastIndexOf(inputAreaStart);
  const endIndex = currentContent.lastIndexOf(inputAreaEnd);
  
  if (startIndex === -1 || endIndex === -1 || endIndex <= startIndex) {
    return '';
  }
  
  // 入力エリア内のテキストを抽出
  const inputArea = currentContent.substring(startIndex, endIndex);
  const lines = inputArea.split('\n');
  
  // 実際のメッセージ内容を抽出（枠線やプレースホルダーを除外）
  const messageLines = lines.filter(line => {
    const trimmed = line.trim();
    return trimmed && 
           !trimmed.startsWith('║') && 
           !trimmed.startsWith('╔') && 
           !trimmed.startsWith('╚') &&
           !trimmed.includes('ここにメッセージを入力') &&
           !isSystemMessage(trimmed) && 
           !isFileShareCommand(trimmed);
  });
  
  return messageLines.join('\n').trim();
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