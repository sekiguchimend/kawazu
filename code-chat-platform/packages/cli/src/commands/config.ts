import chalk from 'chalk';
import inquirer from 'inquirer';
import { ConfigOptions } from '../types';
import { loadConfig, saveConfig } from '../utils/config';

export async function configureSettings(options: ConfigOptions) {
  try {
    console.log(chalk.blue('⚙️  Kawazu CLI 設定\n'));
    
    // 現在の設定を読み込み
    const currentConfig = await loadConfig();
    
    // オプションが指定されている場合は直接設定
    if (options.server || options.username) {
      const newConfig = { ...currentConfig };
      
      if (options.server) {
        newConfig.server_url = options.server;
        console.log(chalk.green(`✅ サーバーURL を設定しました: ${options.server}`));
      }
      
      if (options.username) {
        newConfig.default_username = options.username;
        console.log(chalk.green(`✅ デフォルトユーザー名を設定しました: ${options.username}`));
      }
      
      await saveConfig(newConfig);
      return;
    }
    
    // インタラクティブ設定モード
    console.log(chalk.gray('現在の設定:'));
    console.log(`  サーバーURL: ${chalk.cyan(currentConfig.server_url)}`);
    console.log(`  デフォルトユーザー名: ${chalk.cyan(currentConfig.default_username || '未設定')}`);
    console.log(`  エディタ自動オープン: ${chalk.cyan(currentConfig.auto_open_editor ? 'ON' : 'OFF')}`);
    console.log(`  エディタコマンド: ${chalk.cyan(currentConfig.editor_command || 'code')}\n`);
    
    const answers = await inquirer.prompt([
      {
        type: 'input',
        name: 'server_url',
        message: 'サーバーURL:',
        default: currentConfig.server_url,
        validate: (input) => {
          try {
            new URL(input);
            return true;
          } catch {
            return '有効なURLを入力してください';
          }
        }
      },
      {
        type: 'input',
        name: 'default_username',
        message: 'デフォルトユーザー名 (任意):',
        default: currentConfig.default_username || '',
        validate: (input) => {
          if (!input.trim()) return true; // 空の場合はOK
          if (input.length > 50) return 'ユーザー名は50文字以内で入力してください';
          if (!/^[a-zA-Z0-9_-]+$/.test(input)) return 'ユーザー名は英数字、ハイフン、アンダースコアのみ使用できます';
          return true;
        }
      },
      {
        type: 'confirm',
        name: 'auto_open_editor',
        message: 'ルーム参加時に自動でエディタを開きますか？',
        default: currentConfig.auto_open_editor || false
      },
      {
        type: 'input',
        name: 'editor_command',
        message: 'エディタコマンド:',
        default: currentConfig.editor_command || 'code',
        when: (answers) => answers.auto_open_editor
      }
    ]);
    
    // 空文字の場合は undefined にする
    const newConfig = {
      server_url: answers.server_url,
      default_username: answers.default_username || undefined,
      auto_open_editor: answers.auto_open_editor,
      editor_command: answers.editor_command || 'code'
    };
    
    await saveConfig(newConfig);
    
    console.log(chalk.green('\n✅ 設定を保存しました！'));
    
    // 設定確認
    console.log(chalk.blue('\n📋 更新された設定:'));
    console.log(`  サーバーURL: ${chalk.cyan(newConfig.server_url)}`);
    console.log(`  デフォルトユーザー名: ${chalk.cyan(newConfig.default_username || '未設定')}`);
    console.log(`  エディタ自動オープン: ${chalk.cyan(newConfig.auto_open_editor ? 'ON' : 'OFF')}`);
    if (newConfig.auto_open_editor) {
      console.log(`  エディタコマンド: ${chalk.cyan(newConfig.editor_command)}`);
    }
    
  } catch (error) {
    console.error(chalk.red(`❌ 設定でエラーが発生しました: ${error.message}`));
  }
}

export async function showConfig() {
  try {
    const config = await loadConfig();
    
    console.log(chalk.blue('⚙️  現在の設定:\n'));
    console.log(`${chalk.bold('サーバーURL:')} ${chalk.cyan(config.server_url)}`);
    console.log(`${chalk.bold('デフォルトユーザー名:')} ${chalk.cyan(config.default_username || '未設定')}`);
    console.log(`${chalk.bold('エディタ自動オープン:')} ${chalk.cyan(config.auto_open_editor ? 'ON' : 'OFF')}`);
    console.log(`${chalk.bold('エディタコマンド:')} ${chalk.cyan(config.editor_command || 'code')}`);
    
    console.log(chalk.gray('\n設定を変更するには: kawazu config'));
    
  } catch (error) {
    console.error(chalk.red(`❌ 設定の読み込みでエラーが発生しました: ${error.message}`));
  }
}