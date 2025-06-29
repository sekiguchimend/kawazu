import chalk from 'chalk';
import fetch from 'node-fetch';
import { loadConfig } from '../utils/config';

export async function showProfile(username: string) {
  try {
    const config = await loadConfig();
    
    console.log(chalk.blue(` ${username} のプロフィールを取得中...`));
    
    // API リクエスト
    const response = await fetch(`${config.server_url}/api/profiles/${username}/url`);
    const result = await response.json() as any;
    
    if (!response.ok || !result.success) {
      console.error(chalk.red(` ${result.error || 'プロフィールが見つかりません'}`));
      return;
    }
    
    const { url, is_public } = result.data;
    
    console.log(chalk.green('\n プロフィールが見つかりました！'));
    console.log(` ユーザー: ${chalk.cyan(username)}`);
    console.log(` URL: ${chalk.blue(url)}`);
    
    if (!is_public) {
      console.log(chalk.yellow(' このプロフィールはプライベート設定です'));
    }
    
    console.log(chalk.gray('\n 上記URLをブラウザで開いてプロフィールを確認できます'));
    
  } catch (error) {
    console.error(chalk.red(` エラーが発生しました: ${error.message}`));
    
    if (error.code === 'ECONNREFUSED') {
      console.log(chalk.yellow(' APIサーバーが起動していない可能性があります'));
    }
  }
}

export async function openProfile(username: string) {
  try {
    const config = await loadConfig();
    
    // プロフィールURL取得
    const response = await fetch(`${config.server_url}/api/profiles/${username}/url`);
    const result = await response.json() as any;
    
    if (!response.ok || !result.success) {
      console.error(chalk.red(` ${result.error || 'プロフィールが見つかりません'}`));
      return;
    }
    
    const { url } = result.data;
    
    // プラットフォーム別でブラウザオープン
    const { spawn } = require('child_process');
    const platform = process.platform;
    
    let command: string;
    let args: string[];
    
    if (platform === 'darwin') {
      command = 'open';
      args = [url];
    } else if (platform === 'win32') {
      command = 'start';
      args = [url];
    } else {
      command = 'xdg-open';
      args = [url];
    }
    
    console.log(chalk.blue(` ブラウザで ${username} のプロフィールを開いています...`));
    console.log(chalk.gray(`URL: ${url}`));
    
    const child = spawn(command, args, { 
      detached: true, 
      stdio: 'ignore' 
    });
    
    child.unref();
    
  } catch (error) {
    console.error(chalk.red(` ブラウザを開けませんでした: ${error.message}`));
    console.log(chalk.yellow(' 手動でブラウザを開いて以下のURLにアクセスしてください:'));
    
    // フォールバック: URL表示
    await showProfile(username);
  }
}