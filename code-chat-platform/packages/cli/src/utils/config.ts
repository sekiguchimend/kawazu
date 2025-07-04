import * as fs from 'fs-extra';
import * as path from 'path';
import * as os from 'os';
import chalk from 'chalk';
import { Config } from '../types';

const CONFIG_DIR = path.join(os.homedir(), '.kawazu');
const CONFIG_FILE = path.join(CONFIG_DIR, 'config.json');

export async function loadConfig(): Promise<Config> {
  try {
    await fs.ensureDir(CONFIG_DIR);
    
    if (await fs.pathExists(CONFIG_FILE)) {
      const config = await fs.readJson(CONFIG_FILE);
      return {
        server_url: process.env.KAWAZU_SERVER || 'https://kawazu.onrender.com',
        ...config
      };
    }
  } catch (error) {
    console.warn('設定ファイルの読み込みに失敗しました:', error.message);
  }
  
  // デフォルト設定（本番環境URL）
  return {
    server_url: process.env.KAWAZU_SERVER || 'https://kawazu.onrender.com'
  };
}

export async function saveConfig(config: Partial<Config>): Promise<void> {
  try {
    await fs.ensureDir(CONFIG_DIR);
    
    const currentConfig = await loadConfig();
    const newConfig = { ...currentConfig, ...config };
    
    await fs.writeJson(CONFIG_FILE, newConfig, { spaces: 2 });
  } catch (error) {
    throw new Error(`設定の保存に失敗しました: ${error.message}`);
  }
}

export async function getDefaultConfig(): Promise<Config> {
  return {
    server_url: process.env.KAWAZU_SERVER || 'https://kawazu.onrender.com',
    default_username: process.env.KAWAZU_USERNAME,
    auto_open_editor: false,
    editor_command: 'code'
  };
}

export async function isAuthenticated(): Promise<boolean> {
  const config = await loadConfig();
  return !!(config.auth_token && config.user_email);
}

export async function requireAuth(): Promise<Config> {
  const config = await loadConfig();
  
  if (!config.auth_token || !config.user_email) {
    console.error(chalk.red('❌ ログインが必要です'));
    console.log(chalk.blue('💡 ログインするには: ') + chalk.cyan('kawazu login'));
    process.exit(1);
  }
  
  return config;
}