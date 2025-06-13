import chalk from 'chalk';
import inquirer from 'inquirer';
import path from 'path';
import fs from 'fs-extra';
import { loadConfig } from '../utils/config';
import { getCurrentRoomFromCodechat } from '../utils/file';

interface ShareOptions {
  room?: string;
  users?: string;
  permission?: 'read' | 'write';
  expires?: string;
  type?: string;
}

export async function shareFile(filePath: string, options: ShareOptions = {}) {
  try {
    // ファイル存在確認
    if (!fs.existsSync(filePath)) {
      console.error(chalk.red('❌ ファイルが見つかりません:'), filePath);
      return;
    }

    // ファイル情報取得
    const absolutePath = path.resolve(filePath);
    const fileName = path.basename(absolutePath);
    const fileExt = path.extname(fileName);
    const fileType = options.type || getFileType(fileExt);
    
    // ファイル内容読み取り
    const fileContent = await fs.readFile(absolutePath, 'utf-8');
    
    if (fileContent.length > 1000000) { // 1MB制限
      console.error(chalk.red('❌ ファイルサイズが大きすぎます (最大1MB)'));
      return;
    }

    console.log(chalk.blue(`📤 ファイル共有: ${fileName}`));

    // 設定取得
    const config = await loadConfig();
    if (!config.server_url) {
      console.error(chalk.red('❌ サーバーURLが設定されていません'));
      console.log(chalk.yellow('💡 設定方法: ') + chalk.cyan('kawazu config --server <URL>'));
      return;
    }

    // ルーム情報取得
    let roomSlug = options.room;
    if (!roomSlug) {
      roomSlug = await getCurrentRoomFromCodechat();
      if (!roomSlug) {
        console.error(chalk.red('❌ ルーム情報が見つかりません'));
        console.log(chalk.yellow('💡 --room オプションでルームを指定してください'));
        return;
      }
    }

    // ユーザー名確認
    const username = config.default_username;
    if (!username) {
      console.error(chalk.red('❌ ユーザー名が設定されていません'));
      console.log(chalk.yellow('💡 設定方法: ') + chalk.cyan('kawazu config --username <名前>'));
      return;
    }

    // 対象ユーザー解析
    const targetUsers = options.users ? options.users.split(',').map(u => u.trim()) : [];

    // 権限設定
    const permission = options.permission || 'read';

    // 有効期限設定
    let expiryHours = 24;
    if (options.expires) {
      const hours = parseInt(options.expires);
      if (isNaN(hours) || hours <= 0) {
        console.error(chalk.red('❌ 無効な有効期限です'));
        return;
      }
      expiryHours = hours;
    }

    // 共有確認
    console.log(chalk.yellow('\n📋 共有設定:'));
    console.log(`  ファイル: ${chalk.cyan(fileName)}`);
    console.log(`  ルーム: ${chalk.cyan(roomSlug)}`);
    console.log(`  権限: ${chalk.cyan(permission === 'read' ? '読み取り専用' : '読み書き可能')}`);
    console.log(`  対象: ${targetUsers.length > 0 ? chalk.cyan(targetUsers.join(', ')) : chalk.cyan('全参加者')}`);
    console.log(`  有効期限: ${chalk.cyan(expiryHours + '時間')}`);

    const { confirm } = await inquirer.prompt([
      {
        type: 'confirm',
        name: 'confirm',
        message: 'この設定でファイルを共有しますか？',
        default: true
      }
    ]);

    if (!confirm) {
      console.log(chalk.yellow('❌ ファイル共有をキャンセルしました'));
      return;
    }

    // API呼び出し
    const response = await fetch(`${config.server_url}/api/file-sharing/${roomSlug}/shares`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        owner_username: username,
        file_path: absolutePath,
        file_name: fileName,
        file_content: fileContent,
        file_type: fileType,
        target_users: targetUsers,
        permission_type: permission,
        expiry_hours: expiryHours
      })
    });

    const result = await response.json();

    if (result.success) {
      console.log(chalk.green('\n✅ ファイル共有が作成されました！'));
      console.log(chalk.gray(`共有トークン: ${result.data.share_token}`));
      console.log(chalk.gray(`有効期限: ${new Date(result.data.expires_at).toLocaleString()}`));
      
      if (targetUsers.length > 0) {
        console.log(chalk.blue(`\n📬 ${targetUsers.length}人のユーザーに共有リクエストを送信しました`));
        console.log(chalk.yellow('💡 相手が承認するまでお待ちください'));
      } else {
        console.log(chalk.blue('\n📬 ルーム内の全参加者に共有リクエストを送信しました'));
      }
    } else {
      console.error(chalk.red('❌ ファイル共有に失敗しました:'), result.error);
    }

  } catch (error) {
    console.error(chalk.red('❌ エラーが発生しました:'), error);
  }
}

export async function listSharedFiles(roomSlug?: string) {
  try {
    const config = await loadConfig();
    if (!config.server_url || !config.default_username) {
      console.error(chalk.red('❌ 設定が不完全です'));
      console.log(chalk.yellow('💡 設定方法: ') + chalk.cyan('kawazu config'));
      return;
    }

    // ルーム情報取得
    if (!roomSlug) {
      roomSlug = await getCurrentRoomFromCodechat();
      if (!roomSlug) {
        console.error(chalk.red('❌ ルーム情報が見つかりません'));
        return;
      }
    }

    const response = await fetch(`${config.server_url}/api/file-sharing/${roomSlug}/shares?username=${config.default_username}`);
    const result = await response.json();

    if (result.success) {
      const files = result.data;
      
      if (files.length === 0) {
        console.log(chalk.yellow('📁 共有されているファイルはありません'));
        return;
      }

      console.log(chalk.blue.bold(`\n📁 共有ファイル一覧 (${roomSlug})\n`));

      files.forEach((file: any, index: number) => {
        const statusColor = file.status === 'approved' ? chalk.green : 
                           file.status === 'denied' ? chalk.red : chalk.yellow;
        const permissionIcon = file.permission_type === 'write' ? '✏️' : '👀';
        
        console.log(`${index + 1}. ${permissionIcon} ${chalk.cyan(file.file_name)}`);
        console.log(`   所有者: ${chalk.gray(file.owner_username)}`);
        console.log(`   ステータス: ${statusColor(getStatusText(file.status))}`);
        console.log(`   権限: ${chalk.gray(file.permission_type === 'read' ? '読み取り専用' : '読み書き可能')}`);
        
        if (file.expires_at) {
          const expiresAt = new Date(file.expires_at);
          const isExpired = expiresAt < new Date();
          console.log(`   有効期限: ${isExpired ? chalk.red('期限切れ') : chalk.gray(expiresAt.toLocaleString())}`);
        }
        
        console.log(`   トークン: ${chalk.gray(file.share_token)}`);
        console.log('');
      });
    } else {
      console.error(chalk.red('❌ ファイル一覧の取得に失敗しました:'), result.error);
    }

  } catch (error) {
    console.error(chalk.red('❌ エラーが発生しました:'), error);
  }
}

export async function downloadSharedFile(shareToken: string, outputPath?: string) {
  try {
    const config = await loadConfig();
    if (!config.server_url || !config.default_username) {
      console.error(chalk.red('❌ 設定が不完全です'));
      return;
    }

    const response = await fetch(`${config.server_url}/api/file-sharing/shares/${shareToken}/content?username=${config.default_username}`);
    const result = await response.json();

    if (result.success) {
      const data = result.data;
      const fileName = outputPath || data.file_name;
      const filePath = path.resolve(fileName);

      // ファイル上書き確認
      if (fs.existsSync(filePath)) {
        const { overwrite } = await inquirer.prompt([
          {
            type: 'confirm',
            name: 'overwrite',
            message: `ファイル ${fileName} は既に存在します。上書きしますか？`,
            default: false
          }
        ]);

        if (!overwrite) {
          console.log(chalk.yellow('❌ ダウンロードをキャンセルしました'));
          return;
        }
      }

      // ファイル保存
      await fs.writeFile(filePath, data.file_content, 'utf-8');

      console.log(chalk.green(`✅ ファイルをダウンロードしました: ${fileName}`));
      console.log(chalk.gray(`所有者: ${data.owner_username}`));
      console.log(chalk.gray(`権限: ${data.permission_type === 'read' ? '読み取り専用' : '読み書き可能'}`));
      
      if (data.expires_at) {
        console.log(chalk.gray(`有効期限: ${new Date(data.expires_at).toLocaleString()}`));
      }

    } else {
      console.error(chalk.red('❌ ファイルのダウンロードに失敗しました:'), result.error);
    }

  } catch (error) {
    console.error(chalk.red('❌ エラーが発生しました:'), error);
  }
}

export async function revokeFileShare(shareToken: string) {
  try {
    const config = await loadConfig();
    if (!config.server_url || !config.default_username) {
      console.error(chalk.red('❌ 設定が不完全です'));
      return;
    }

    const { confirm } = await inquirer.prompt([
      {
        type: 'confirm',
        name: 'confirm',
        message: 'このファイル共有を取り消しますか？',
        default: false
      }
    ]);

    if (!confirm) {
      console.log(chalk.yellow('❌ 取り消しをキャンセルしました'));
      return;
    }

    const response = await fetch(`${config.server_url}/api/file-sharing/shares/${shareToken}`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        username: config.default_username
      })
    });

    const result = await response.json();

    if (result.success) {
      console.log(chalk.green('✅ ファイル共有を取り消しました'));
      console.log(chalk.gray(`ファイル: ${result.data.file_name}`));
    } else {
      console.error(chalk.red('❌ ファイル共有の取り消しに失敗しました:'), result.error);
    }

  } catch (error) {
    console.error(chalk.red('❌ エラーが発生しました:'), error);
  }
}

// ヘルパー関数
function getFileType(extension: string): string {
  const typeMap: { [key: string]: string } = {
    '.js': 'javascript',
    '.ts': 'typescript',
    '.jsx': 'javascript',
    '.tsx': 'typescript',
    '.py': 'python',
    '.java': 'java',
    '.cpp': 'cpp',
    '.c': 'c',
    '.cs': 'csharp',
    '.php': 'php',
    '.rb': 'ruby',
    '.go': 'go',
    '.rs': 'rust',
    '.html': 'html',
    '.css': 'css',
    '.scss': 'scss',
    '.sass': 'sass',
    '.json': 'json',
    '.xml': 'xml',
    '.yml': 'yaml',
    '.yaml': 'yaml',
    '.md': 'markdown',
    '.txt': 'text',
    '.sh': 'bash',
    '.sql': 'sql'
  };

  return typeMap[extension.toLowerCase()] || 'text';
}

function getStatusText(status: string): string {
  switch (status) {
    case 'pending': return '承認待ち';
    case 'approved': return '承認済み';
    case 'denied': return '拒否';
    default: return status;
  }
}