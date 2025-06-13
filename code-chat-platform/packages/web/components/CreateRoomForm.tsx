'use client';

import { useState } from 'react';
import { toast } from 'react-hot-toast';
import { createRoom } from '@/lib/api';
import { CreateRoomData } from '@/types';

interface CreateRoomFormProps {
  onRoomCreated?: () => void;
}

export function CreateRoomForm({ onRoomCreated }: CreateRoomFormProps) {
  const [formData, setFormData] = useState<CreateRoomData>({
    name: '',
    slug: '',
    is_private: false,
    password: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const validateForm = (): string | null => {
    if (!formData.name.trim()) return 'ルーム名を入力してください';
    if (!formData.slug.trim()) return 'ルームIDを入力してください';
    if (!/^[a-zA-Z0-9-_]+$/.test(formData.slug)) return 'ルームIDは英数字、ハイフン、アンダースコアのみ使用できます';
    if (formData.is_private && !formData.password) return 'プライベートルームにはパスワードが必要です';
    if (formData.password && formData.password.length < 4) return 'パスワードは4文字以上で入力してください';
    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const error = validateForm();
    if (error) {
      toast.error(error);
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      const result = await createRoom(formData);
      
      if (result.success && result.data) {
        toast.success('ルームが作成されました！');
        
        // CLIコマンドを表示
        const cliCommand = formData.is_private 
          ? `kawazu join ${result.data.slug} -p your_password`
          : `kawazu join ${result.data.slug}`;
        
        // フォームをリセット
        setFormData({
          name: '',
          slug: '',
          is_private: false,
          password: ''
        });
        
        // 成功のモーダルまたは通知を表示
        setTimeout(() => {
          toast.success(
            `CLIコマンド: ${cliCommand}`,
            { duration: 8000 }
          );
        }, 1000);
        
        onRoomCreated?.();
      } else {
        toast.error(result.error || 'ルーム作成に失敗しました');
        
        if (result.details) {
          result.details.forEach(detail => {
            toast.error(`${detail.field}: ${detail.message}`);
          });
        }
      }
    } catch (error) {
      console.error('Room creation error:', error);
      toast.error('ネットワークエラーが発生しました');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* ルーム名 */}
      <div>
        <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
          ルーム名
        </label>
        <input
          type="text"
          id="name"
          name="name"
          value={formData.name}
          onChange={handleInputChange}
          placeholder="例: プロジェクト会議"
          className="input-field w-full"
          required
          disabled={isSubmitting}
        />
      </div>

      {/* ルームID */}
      <div>
        <label htmlFor="slug" className="block text-sm font-medium text-gray-700 mb-1">
          ルームID
        </label>
        <input
          type="text"
          id="slug"
          name="slug"
          value={formData.slug}
          onChange={handleInputChange}
          placeholder="例: project-meeting"
          pattern="[a-zA-Z0-9\-_]+"
          className="input-field w-full"
          required
          disabled={isSubmitting}
        />
        <p className="text-xs text-gray-500 mt-1">
          英数字、ハイフン（-）、アンダースコア（_）のみ使用できます
        </p>
      </div>

      {/* プライベートルーム */}
      <div className="flex items-center">
        <input
          type="checkbox"
          id="is_private"
          name="is_private"
          checked={formData.is_private}
          onChange={handleInputChange}
          className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
          disabled={isSubmitting}
        />
        <label htmlFor="is_private" className="ml-2 block text-sm text-gray-900">
          プライベートルーム（パスワード保護）
        </label>
      </div>

      {/* パスワード（プライベートルーム時のみ表示） */}
      {formData.is_private && (
        <div>
          <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
            パスワード
          </label>
          <input
            type="password"
            id="password"
            name="password"
            value={formData.password}
            onChange={handleInputChange}
            placeholder="4文字以上"
            className="input-field w-full"
            required={formData.is_private}
            disabled={isSubmitting}
            minLength={4}
          />
        </div>
      )}

      {/* 送信ボタン */}
      <button
        type="submit"
        disabled={isSubmitting}
        className="btn-primary w-full disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isSubmitting ? '作成中...' : 'ルームを作成'}
      </button>
    </form>
  );
}