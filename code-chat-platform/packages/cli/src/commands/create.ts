import chalk from 'chalk';
import ora from 'ora';
import inquirer from 'inquirer';
import fetch from 'node-fetch';
import { CreateOptions } from '../types';
import { requireAuth, loadConfig } from '../utils/config';
import { joinRoom } from './join';

export async function createRoom(roomName: string, options: CreateOptions) {
  // 認証チェック
  console.log(chalk.blue('🔍 認証状態を確認中...'));
  let config = await requireAuth();

  const spinner = ora('ルームを作成中...').start();
  
  try {
    
    // ルームスラッグの生成（ルーム名から自動生成）
    const slug = generateSlug(roomName);
    
    // プライベートルームの場合はパスワードを取得
    let password = options.password;
    if (options.private && !password) {
      spinner.stop();
      const { inputPassword } = await inquirer.prompt([
        {
          type: 'password',
          name: 'inputPassword',
          message: 'プライベートルーム用のパスワードを入力してください:',
          validate: (input) => input.length >= 4 || 'パスワードは4文字以上で入力してください'
        }
      ]);
      password = inputPassword;
      spinner.start('ルームを作成中...');
    }
    
    // API リクエストデータ
    const roomData = {
      name: roomName,
      slug: slug,
      is_private: options.private || false,
      password: password
    };
    
    // API リクエスト（認証トークン付き）
    const response = await fetch(`${config.server_url}/api/rooms`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${config.auth_token}`
      },
      body: JSON.stringify(roomData)
    });
    
    const result = await response.json() as any;
    
    if (!response.ok || !result.success) {
      spinner.fail('ルーム作成に失敗しました');
      
      if (result.error) {
        console.error(chalk.red(`❌ ${result.error}`));
        
        if (result.details) {
          result.details.forEach(detail => {
            console.error(chalk.red(`   ${detail.field}: ${detail.message}`));
          });
        }
      }
      
      return;
    }
    
    spinner.succeed(`ルーム "${roomName}" を作成しました！`);
    
    // 作成したルームの情報を表示
    console.log(chalk.green(`\n📝 ルーム情報:`));
    console.log(`   名前: ${result.data.name}`);
    console.log(`   ID: ${result.data.slug}`);
    console.log(`   プライベート: ${result.data.is_private ? 'はい' : 'いいえ'}`);
    
    // CLIコマンドの表示
    const cliCommand = result.data.is_private 
      ? `kawazu join ${result.data.slug} -p ${password}`
      : `kawazu join ${result.data.slug}`;
    
    console.log(chalk.blue(`\n💡 参加コマンド:`));
    console.log(chalk.cyan(`   ${cliCommand}`));
    
    // 自動参加の確認
    const { autoJoin } = await inquirer.prompt([
      {
        type: 'confirm',
        name: 'autoJoin',
        message: '作成したルームにすぐに参加しますか？',
        default: true
      }
    ]);
    
    if (autoJoin) {
      console.log(chalk.yellow('\n🚀 ルームに参加しています...\n'));
      
      // ユーザー名の取得（認証済みユーザー名を優先）
      const username = config.user_username || await promptUsername();
      
      // 作成したルームに参加
      await joinRoom(result.data.slug, { 
        username, 
        password: password 
      });
    } else {
      console.log(chalk.green('\n✅ ルームが作成されました。上記のコマンドで参加できます。'));
    }
    
  } catch (error) {
    spinner.fail('ルーム作成でエラーが発生しました');
    console.error(chalk.red(`❌ ${error.message}`));
    
    if (error.code === 'ECONNREFUSED') {
      console.log(chalk.yellow('💡 APIサーバーが起動していない可能性があります'));
      console.log(chalk.gray(`   サーバーURL: ${config.server_url}`));
    }
  }
}

function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '') // 英数字、スペース、ハイフンのみ残す
    .replace(/\s+/g, '-') // スペースをハイフンに変換
    .replace(/-+/g, '-') // 連続ハイフンを1つに
    .replace(/^-|-$/g, ''); // 先頭末尾のハイフンを削除
}

async function promptUsername(): Promise<string> {
  const { username } = await inquirer.prompt([
    {
      type: 'input',
      name: 'username',
      message: 'チャット用のユーザー名を入力してください:',
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