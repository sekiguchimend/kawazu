import chalk from 'chalk';
import * as fs from 'fs-extra';
import * as path from 'path';
import { loadConfig } from '../utils/config';

export async function listRooms() {
  try {
    console.log(chalk.blue('📋 ローカルのチャットファイル一覧:\n'));
    
    // 現在のディレクトリで .codechat ファイルを検索
    const currentDir = process.cwd();
    const files = await fs.readdir(currentDir);
    const codechatFiles = files.filter(file => file.endsWith('.codechat'));
    
    if (codechatFiles.length === 0) {
      console.log(chalk.gray('   .codechat ファイルが見つかりませんでした'));
      console.log(chalk.gray('   ルームに参加すると、このディレクトリに .codechat ファイルが作成されます'));
      return;
    }
    
    // ファイル情報を表示
    for (const file of codechatFiles) {
      const filePath = path.join(currentDir, file);
      const stats = await fs.stat(filePath);
      const roomSlug = path.basename(file, '.codechat');
      
      console.log(chalk.green(`📝 ${file}`));
      console.log(`   ルームID: ${chalk.cyan(roomSlug)}`);
      console.log(`   最終更新: ${chalk.gray(stats.mtime.toLocaleString('ja-JP'))}`);
      console.log(`   サイズ: ${chalk.gray(formatFileSize(stats.size))}`);
      
      // ファイルの最初の数行を読んで情報を抽出
      try {
        const content = await fs.readFile(filePath, 'utf8');
        const lines = content.split('\n');
        const roomNameLine = lines.find(line => line.startsWith('# Kawazu Chat Room:'));
        const usernameLine = lines.find(line => line.startsWith('# あなたのユーザー名:'));
        
        if (roomNameLine) {
          const roomName = roomNameLine.replace('# Kawazu Chat Room:', '').trim();
          console.log(`   ルーム名: ${chalk.yellow(roomName)}`);
        }
        
        if (usernameLine) {
          const username = usernameLine.replace('# あなたのユーザー名:', '').trim();
          console.log(`   ユーザー名: ${chalk.magenta(username)}`);
        }
      } catch (error) {
        // ファイル読み取りエラーは無視
      }
      
      console.log(`   再参加: ${chalk.cyan(`kawazu join ${roomSlug}`)}\n`);
    }
    
    // 設定情報も表示
    const config = await loadConfig();
    console.log(chalk.blue('⚙️  設定情報:'));
    console.log(`   サーバーURL: ${chalk.cyan(config.server_url)}`);
    if (config.default_username) {
      console.log(`   デフォルトユーザー名: ${chalk.magenta(config.default_username)}`);
    }
    
  } catch (error) {
    console.error(chalk.red(`❌ エラーが発生しました: ${error.message}`));
  }
}

function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  
  const k = 1024;
  const sizes = ['B', 'KB', 'MB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}