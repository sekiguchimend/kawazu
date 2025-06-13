import chalk from 'chalk';
import inquirer from 'inquirer';
import { loadConfig } from '../utils/config';

interface ApprovalOptions {
  reason?: string;
}

export async function approveFileShare(shareToken: string, options: ApprovalOptions = {}) {
  try {
    const config = await loadConfig();
    if (!config.server_url || !config.default_username) {
      console.error(chalk.red('❌ 設定が不完全です'));
      console.log(chalk.yellow('💡 設定方法: ') + chalk.cyan('kawazu config'));
      return;
    }

    console.log(chalk.blue(`📝 ファイル共有を承認します`));
    console.log(chalk.gray(`トークン: ${shareToken}`));

    // 承認確認
    const { confirm } = await inquirer.prompt([
      {
        type: 'confirm',
        name: 'confirm',
        message: 'このファイル共有リクエストを承認しますか？',
        default: true
      }
    ]);

    if (!confirm) {
      console.log(chalk.yellow('❌ 承認をキャンセルしました'));
      return;
    }

    // API呼び出し
    const response = await fetch(`${config.server_url}/api/file-sharing/shares/${shareToken}/approve`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        username: config.default_username,
        reason: options.reason
      })
    });

    const result = await response.json();

    if (result.success) {
      console.log(chalk.green('\n✅ ファイル共有を承認しました！'));
      console.log(chalk.cyan(`ファイル: ${result.data.file_name}`));
      console.log(chalk.gray(`所有者: ${result.data.owner}`));
      console.log(chalk.blue('\n💡 ファイルにアクセスするには:'));
      console.log(chalk.cyan(`kawazu download ${shareToken}`));
    } else {
      console.error(chalk.red('❌ 承認に失敗しました:'), result.error);
    }

  } catch (error) {
    console.error(chalk.red('❌ エラーが発生しました:'), error);
  }
}

export async function denyFileShare(shareToken: string, options: ApprovalOptions = {}) {
  try {
    const config = await loadConfig();
    if (!config.server_url || !config.default_username) {
      console.error(chalk.red('❌ 設定が不完全です'));
      return;
    }

    console.log(chalk.yellow(`🚫 ファイル共有を拒否します`));
    console.log(chalk.gray(`トークン: ${shareToken}`));

    // 拒否理由の入力（オプション）
    let reason = options.reason;
    if (!reason) {
      const { inputReason } = await inquirer.prompt([
        {
          type: 'input',
          name: 'inputReason',
          message: '拒否理由を入力してください（オプション）:',
        }
      ]);
      reason = inputReason;
    }

    // 拒否確認
    const { confirm } = await inquirer.prompt([
      {
        type: 'confirm',
        name: 'confirm',
        message: 'このファイル共有リクエストを拒否しますか？',
        default: false
      }
    ]);

    if (!confirm) {
      console.log(chalk.yellow('❌ 拒否をキャンセルしました'));
      return;
    }

    // API呼び出し
    const response = await fetch(`${config.server_url}/api/file-sharing/shares/${shareToken}/deny`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        username: config.default_username,
        reason
      })
    });

    const result = await response.json();

    if (result.success) {
      console.log(chalk.green('\n✅ ファイル共有を拒否しました'));
      console.log(chalk.cyan(`ファイル: ${result.data.file_name}`));
      console.log(chalk.gray(`所有者: ${result.data.owner}`));
      if (reason) {
        console.log(chalk.gray(`理由: ${reason}`));
      }
    } else {
      console.error(chalk.red('❌ 拒否に失敗しました:'), result.error);
    }

  } catch (error) {
    console.error(chalk.red('❌ エラーが発生しました:'), error);
  }
}

export async function listPendingRequests() {
  try {
    const config = await loadConfig();
    if (!config.server_url || !config.default_username) {
      console.error(chalk.red('❌ 設定が不完全です'));
      return;
    }

    // 現在のルームを取得
    const { getCurrentRoomFromCodechat } = await import('../utils/file');
    const roomSlug = await getCurrentRoomFromCodechat();
    
    if (!roomSlug) {
      console.error(chalk.red('❌ ルーム情報が見つかりません'));
      console.log(chalk.yellow('💡 ルームに参加してから実行してください'));
      return;
    }

    // 共有ファイル一覧を取得
    const response = await fetch(`${config.server_url}/api/file-sharing/${roomSlug}/shares?username=${config.default_username}`);
    const result = await response.json();

    if (result.success) {
      const pendingFiles = result.data.filter((file: any) => file.status === 'pending');

      if (pendingFiles.length === 0) {
        console.log(chalk.yellow('📨 承認待ちのファイル共有リクエストはありません'));
        return;
      }

      console.log(chalk.blue.bold(`\n📨 承認待ちのファイル共有リクエスト (${pendingFiles.length}件)\n`));

      pendingFiles.forEach((file: any, index: number) => {
        const permissionIcon = file.permission_type === 'write' ? '✏️' : '👀';
        
        console.log(`${index + 1}. ${permissionIcon} ${chalk.cyan(file.file_name)}`);
        console.log(`   所有者: ${chalk.yellow(file.owner_username)}`);
        console.log(`   権限: ${chalk.gray(file.permission_type === 'read' ? '読み取り専用' : '読み書き可能')}`);
        
        if (file.expires_at) {
          const expiresAt = new Date(file.expires_at);
          const isExpired = expiresAt < new Date();
          console.log(`   有効期限: ${isExpired ? chalk.red('期限切れ') : chalk.gray(expiresAt.toLocaleString())}`);
        }
        
        console.log(`   承認: ${chalk.green('kawazu approve ' + file.share_token)}`);
        console.log(`   拒否: ${chalk.red('kawazu deny ' + file.share_token)}`);
        console.log('');
      });

      console.log(chalk.blue('💡 承認・拒否のコマンド例:'));
      console.log(chalk.cyan(`kawazu approve ${pendingFiles[0].share_token}`));
      console.log(chalk.cyan(`kawazu deny ${pendingFiles[0].share_token}`));

    } else {
      console.error(chalk.red('❌ リクエスト一覧の取得に失敗しました:'), result.error);
    }

  } catch (error) {
    console.error(chalk.red('❌ エラーが発生しました:'), error);
  }
}