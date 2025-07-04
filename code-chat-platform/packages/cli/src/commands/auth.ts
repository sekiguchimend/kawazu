import chalk from 'chalk';
import inquirer from 'inquirer';
import ora from 'ora';
import fetch from 'node-fetch';
import { loadConfig, saveConfig } from '../utils/config';

interface LoginOptions {
  email?: string;
  password?: string;
}

export async function loginUser(options: LoginOptions) {
  console.log(chalk.blue.bold('\n Kawazu ログイン\n'));

  try {
    // メールアドレスとパスワードを取得
    const credentials = await getCredentials(options);
    
    const spinner = ora('ログイン中...').start();
    
    // サーバー設定を取得
    const config = await loadConfig();
    
    // ログイン API を呼び出し
    const response = await fetch(`${config.server_url}/api/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        email: credentials.email,
        password: credentials.password
      })
    });

    const data = await response.json() as any;

    if (!response.ok) {
      spinner.fail('ログインに失敗しました');
      console.error(chalk.red(`エラー: ${data.error || response.statusText}`));
      return;
    }

    if (data.success) {
      spinner.succeed('ログイン成功！');
      
      // トークンとユーザー情報を保存
      await saveConfig({
        auth_token: data.data.token,
        user_email: data.data.user.email,
        user_username: data.data.user.username,
        user_id: data.data.user.id
      });

      console.log(chalk.green(` こんにちは、${data.data.user.username}さん！`));
      console.log(chalk.gray(` ${data.data.user.email}`));
      console.log(chalk.blue('\n プランを確認: ') + chalk.cyan('kawazu plan'));
      console.log(chalk.blue(' チャットを開始: ') + chalk.cyan('kawazu create "ルーム名"'));
    } else {
      spinner.fail('ログインに失敗しました');
      console.error(chalk.red(`エラー: ${data.error}`));
    }
  } catch (error) {
    console.error(chalk.red('ログインエラー:'), error.message);
  }
}

export async function logoutUser() {
  console.log(chalk.yellow('ログアウトしています...'));

  try {
    // 認証情報をクリア
    await saveConfig({
      auth_token: undefined,
      user_email: undefined,
      user_username: undefined,
      user_id: undefined
    });

    console.log(chalk.green(' ログアウトしました'));
    console.log(chalk.blue(' 再度ログインするには: ') + chalk.cyan('kawazu login'));
  } catch (error) {
    console.error(chalk.red('ログアウトエラー:'), error.message);
  }
}

export async function showCurrentUser() {
  try {
    const config = await loadConfig();

    if (!config.auth_token || !config.user_email) {
      console.log(chalk.yellow('  ログインしていません'));
      console.log(chalk.blue(' ログインするには: ') + chalk.cyan('kawazu login'));
      return;
    }

    console.log(chalk.blue.bold('\n 現在のユーザー\n'));
    console.log(chalk.green(` ログイン済み`));
    console.log(chalk.gray(` メール: ${config.user_email}`));
    console.log(chalk.gray(` ユーザー名: ${config.user_username}`));
    console.log(chalk.gray(` ID: ${config.user_id}`));

    // サーバーで最新の情報を確認
    const spinner = ora('最新情報を確認中...').start();
    
    try {
      const response = await fetch(`${config.server_url}/api/auth/verify`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${config.auth_token}`
        },
        body: JSON.stringify({ token: config.auth_token })
      });

      const data = await response.json() as any;

      if (response.ok && data.success) {
        spinner.succeed('認証状態: 有効');
        console.log(chalk.green(` トークン有効期限内`));
      } else {
        spinner.warn('認証状態: 期限切れ');
        console.log(chalk.yellow(`  トークンが期限切れです`));
        console.log(chalk.blue(' 再ログインしてください: ') + chalk.cyan('kawazu login'));
      }
    } catch (error) {
      spinner.fail('認証確認に失敗');
      console.log(chalk.red(` サーバー接続エラー: ${error.message}`));
    }

  } catch (error) {
    console.error(chalk.red('ユーザー情報取得エラー:'), error.message);
  }
}

export async function showSubscriptionPlan() {
  try {
    const config = await loadConfig();

    if (!config.auth_token) {
      console.log(chalk.yellow('  ログインが必要です'));
      console.log(chalk.blue(' ログインするには: ') + chalk.cyan('kawazu login'));
      return;
    }

    const spinner = ora('サブスクリプション情報を取得中...').start();

    try {
      // 現在のサブスクリプションを取得
      const response = await fetch(`${config.server_url}/api/subscriptions/current`, {
        headers: {
          'Authorization': `Bearer ${config.auth_token}`
        }
      });

      const data = await response.json() as any;

      if (!response.ok) {
        spinner.fail('プラン情報の取得に失敗');
        if (response.status === 401) {
          console.log(chalk.yellow('  認証エラー。再ログインしてください'));
          console.log(chalk.blue(' ログイン: ') + chalk.cyan('kawazu login'));
        } else {
          console.error(chalk.red(`エラー: ${data.error || response.statusText}`));
        }
        return;
      }

      spinner.succeed('プラン情報を取得しました');

      console.log(chalk.blue.bold('\n サブスクリプションプラン\n'));

      if (data.success && data.data) {
        const subscription = data.data;
        console.log(chalk.green(` プラン: ${subscription.subscription_plans.name}`));
        console.log(chalk.gray(` 料金: ${subscription.subscription_plans.amount.toLocaleString()}/月`));
        console.log(chalk.gray(` ステータス: ${getStatusText(subscription.status)}`));
        console.log(chalk.gray(` 次回請求: ${new Date(subscription.current_period_end).toLocaleDateString('ja-JP')}`));

        if (subscription.cancel_at_period_end) {
          console.log(chalk.yellow(`  ${new Date(subscription.current_period_end).toLocaleDateString('ja-JP')} にキャンセル予定`));
        }

        console.log(chalk.blue('\n 利用可能機能:'));
        const features = subscription.subscription_plans.features;
        if (features.max_rooms) {
          console.log(chalk.gray(`   ルーム作成: ${formatFeatureValue(features.max_rooms)}個`));
        }
        if (features.max_participants_per_room) {
          console.log(chalk.gray(`   ルーム参加者: ${formatFeatureValue(features.max_participants_per_room)}人`));
        }
        if (features.storage_gb) {
          console.log(chalk.gray(`   ストレージ: ${features.storage_gb}GB`));
        }
        if (features.advanced_features) {
          console.log(chalk.gray(`   高度な機能: 利用可能`));
        }
        if (features.priority_support) {
          console.log(chalk.gray(`   優先サポート: 利用可能`));
        }

      } else {
        console.log(chalk.yellow(' アクティブなサブスクリプションがありません'));
        console.log(chalk.blue(' プランを選択: ') + chalk.cyan('https://kawazu.onrender.com/pricing'));
      }

    } catch (error) {
      spinner.fail('通信エラー');
      console.error(chalk.red(`サーバー接続エラー: ${error.message}`));
    }

  } catch (error) {
    console.error(chalk.red('プラン確認エラー:'), error.message);
  }
}

async function getCredentials(options: LoginOptions) {
  const questions = [];

  if (!options.email) {
    questions.push({
      type: 'input',
      name: 'email',
      message: 'メールアドレス:',
      validate: (input: string) => {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(input)) {
          return '有効なメールアドレスを入力してください';
        }
        return true;
      }
    });
  }

  if (!options.password) {
    questions.push({
      type: 'password',
      name: 'password',
      message: 'パスワード:',
      mask: '*',
      validate: (input: string) => {
        if (input.length < 6) {
          return 'パスワードは6文字以上で入力してください';
        }
        return true;
      }
    });
  }

  const answers = await inquirer.prompt(questions);

  return {
    email: options.email || answers.email,
    password: options.password || answers.password
  };
}

function getStatusText(status: string): string {
  switch (status) {
    case 'active':
      return ' アクティブ';
    case 'canceled':
      return ' キャンセル済み';
    case 'past_due':
      return ' 支払い遅延';
    default:
      return status;
  }
}

function formatFeatureValue(value: any): string {
  if (value === 'unlimited') return '無制限';
  if (typeof value === 'number') return value.toLocaleString();
  return value;
}
