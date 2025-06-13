import * as fs from 'fs-extra';
import * as path from 'path';
import * as os from 'os';
import { Config } from '../types';

const CONFIG_DIR = path.join(os.homedir(), '.kawazu');
const CONFIG_FILE = path.join(CONFIG_DIR, 'config.json');

export async function loadConfig(): Promise<Config> {
  try {
    await fs.ensureDir(CONFIG_DIR);
    
    if (await fs.pathExists(CONFIG_FILE)) {
      const config = await fs.readJson(CONFIG_FILE);
      return {
        server_url: 'http://localhost:8000',
        ...config
      };
    }
  } catch (error) {
    console.warn('設定ファイルの読み込みに失敗しました:', error.message);
  }
  
  // デフォルト設定
  return {
    server_url: 'http://localhost:8000'
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
    server_url: process.env.KAWAZU_SERVER || 'http://localhost:8000',
    default_username: process.env.KAWAZU_USERNAME,
    auto_open_editor: false,
    editor_command: 'code'
  };
}