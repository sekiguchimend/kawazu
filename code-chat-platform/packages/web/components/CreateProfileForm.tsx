'use client';

import { useState } from 'react';
import { toast } from 'react-hot-toast';
import { useRouter } from 'next/navigation';
import { createProfile } from '@/lib/api';
import { CreateProfileData } from '@/types';

interface CreateProfileFormProps {
  onProfileCreated?: () => void;
}

export function CreateProfileForm({ onProfileCreated }: CreateProfileFormProps) {
  const router = useRouter();
  const [formData, setFormData] = useState<CreateProfileData>({
    username: '',
    display_name: '',
    bio: '',
    avatar_url: '',
    website_url: '',
    twitter_handle: '',
    github_handle: '',
    skills: [],
    location: '',
    timezone: '',
    is_public: true
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [skillInput, setSkillInput] = useState('');

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    const checked = (e.target as HTMLInputElement).checked;
    
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const addSkill = () => {
    if (skillInput.trim() && !formData.skills?.includes(skillInput.trim())) {
      setFormData(prev => ({
        ...prev,
        skills: [...(prev.skills || []), skillInput.trim()]
      }));
      setSkillInput('');
    }
  };

  const removeSkill = (skillToRemove: string) => {
    setFormData(prev => ({
      ...prev,
      skills: prev.skills?.filter(skill => skill !== skillToRemove) || []
    }));
  };

  const handleSkillKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      addSkill();
    }
  };

  const validateForm = (): string | null => {
    if (!formData.username.trim()) return 'ユーザー名を入力してください';
    if (!/^[a-zA-Z0-9_-]+$/.test(formData.username)) return 'ユーザー名は英数字、ハイフン、アンダースコアのみ使用できます';
    if (formData.username.length < 3) return 'ユーザー名は3文字以上で入力してください';
    if (formData.bio && formData.bio.length > 1000) return '自己紹介は1000文字以内で入力してください';
    if (formData.skills && formData.skills.length > 20) return 'スキルは20個まで登録できます';
    
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
      const result = await createProfile(formData);
      
      if (result.success && result.data) {
        toast.success('プロフィールを作成しました！');
        
        // プロフィールページに遷移
        setTimeout(() => {
          router.push(`/profile/${result.data!.username}`);
        }, 1000);
        
        onProfileCreated?.();
      } else {
        toast.error(result.error || 'プロフィール作成に失敗しました');
        
        if (result.details) {
          result.details.forEach(detail => {
            toast.error(`${detail.field}: ${detail.message}`);
          });
        }
      }
    } catch (error) {
      console.error('Profile creation error:', error);
      toast.error('ネットワークエラーが発生しました');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* ユーザー名 */}
      <div>
        <label htmlFor="username" className="block text-sm font-medium text-gray-700 mb-1">
          ユーザー名 *
        </label>
        <input
          type="text"
          id="username"
          name="username"
          value={formData.username}
          onChange={handleInputChange}
          placeholder="例: kawazu_user"
          pattern="[a-zA-Z0-9_\-]+"
          title="ユーザー名は半角英数字、ハイフン(-)、アンダースコア(_)のみ使用できます。"
          className="input-field w-full"
          required
          disabled={isSubmitting}
          minLength={3}
          maxLength={100}
        />
        <p className="text-xs text-gray-500 mt-1">
          プロフィールURL: kawazu.com/profile/<strong>{formData.username || 'username'}</strong>
        </p>
      </div>

      {/* 表示名 */}
      <div>
        <label htmlFor="display_name" className="block text-sm font-medium text-gray-700 mb-1">
          表示名
        </label>
        <input
          type="text"
          id="display_name"
          name="display_name"
          value={formData.display_name}
          onChange={handleInputChange}
          placeholder="例: 山田太郎"
          className="input-field w-full"
          disabled={isSubmitting}
          maxLength={100}
        />
      </div>

      {/* 自己紹介 */}
      <div>
        <label htmlFor="bio" className="block text-sm font-medium text-gray-700 mb-1">
          自己紹介
        </label>
        <textarea
          id="bio"
          name="bio"
          value={formData.bio}
          onChange={handleInputChange}
          placeholder="あなたについて教えてください..."
          rows={4}
          className="input-field w-full resize-none"
          disabled={isSubmitting}
          maxLength={1000}
        />
        <p className="text-xs text-gray-500 mt-1">
          {formData.bio?.length || 0} / 1000文字
        </p>
      </div>

      {/* スキル */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          スキル・技術
        </label>
        <div className="flex gap-2 mb-2">
          <input
            type="text"
            value={skillInput}
            onChange={(e) => setSkillInput(e.target.value)}
            onKeyPress={handleSkillKeyPress}
            placeholder="例: React, TypeScript, Node.js"
            className="input-field flex-1"
            disabled={isSubmitting}
            maxLength={50}
          />
          <button
            type="button"
            onClick={addSkill}
            disabled={!skillInput.trim() || isSubmitting}
            className="btn-secondary disabled:opacity-50"
          >
            追加
          </button>
        </div>
        
        {formData.skills && formData.skills.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {formData.skills.map((skill, index) => (
              <span
                key={index}
                className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm flex items-center gap-1"
              >
                {skill}
                <button
                  type="button"
                  onClick={() => removeSkill(skill)}
                  className="ml-1 text-blue-600 hover:text-blue-800"
                  disabled={isSubmitting}
                >
                  ×
                </button>
              </span>
            ))}
          </div>
        )}
        <p className="text-xs text-gray-500 mt-1">
          {formData.skills?.length || 0} / 20個
        </p>
      </div>

      {/* 場所 */}
      <div>
        <label htmlFor="location" className="block text-sm font-medium text-gray-700 mb-1">
          場所
        </label>
        <input
          type="text"
          id="location"
          name="location"
          value={formData.location}
          onChange={handleInputChange}
          placeholder="例: 東京, 日本"
          className="input-field w-full"
          disabled={isSubmitting}
          maxLength={100}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* ウェブサイト */}
        <div>
          <label htmlFor="website_url" className="block text-sm font-medium text-gray-700 mb-1">
            ウェブサイト
          </label>
          <input
            type="url"
            id="website_url"
            name="website_url"
            value={formData.website_url}
            onChange={handleInputChange}
            placeholder="https://example.com"
            className="input-field w-full"
            disabled={isSubmitting}
          />
        </div>

        {/* アバター画像URL */}
        <div>
          <label htmlFor="avatar_url" className="block text-sm font-medium text-gray-700 mb-1">
            アバター画像URL
          </label>
          <input
            type="url"
            id="avatar_url"
            name="avatar_url"
            value={formData.avatar_url}
            onChange={handleInputChange}
            placeholder="https://example.com/avatar.jpg"
            className="input-field w-full"
            disabled={isSubmitting}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* GitHub */}
        <div>
          <label htmlFor="github_handle" className="block text-sm font-medium text-gray-700 mb-1">
            GitHub ユーザー名
          </label>
          <div className="flex">
            <span className="inline-flex items-center px-3 rounded-l-md border border-r-0 border-gray-300 bg-gray-50 text-gray-500 text-sm">
              github.com/
            </span>
            <input
              type="text"
              id="github_handle"
              name="github_handle"
              value={formData.github_handle}
              onChange={handleInputChange}
              placeholder="username"
              pattern="[a-zA-Z0-9_-]+"
              className="input-field rounded-l-none flex-1"
              disabled={isSubmitting}
            />
          </div>
        </div>

        {/* Twitter */}
        <div>
          <label htmlFor="twitter_handle" className="block text-sm font-medium text-gray-700 mb-1">
            Twitter ユーザー名
          </label>
          <div className="flex">
            <span className="inline-flex items-center px-3 rounded-l-md border border-r-0 border-gray-300 bg-gray-50 text-gray-500 text-sm">
              @
            </span>
            <input
              type="text"
              id="twitter_handle"
              name="twitter_handle"
              value={formData.twitter_handle}
              onChange={handleInputChange}
              placeholder="username"
              pattern="[a-zA-Z0-9_]+"
              className="input-field rounded-l-none flex-1"
              disabled={isSubmitting}
            />
          </div>
        </div>
      </div>

      {/* プライバシー設定 */}
      <div className="flex items-center">
        <input
          type="checkbox"
          id="is_public"
          name="is_public"
          checked={formData.is_public}
          onChange={handleInputChange}
          className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
          disabled={isSubmitting}
        />
        <label htmlFor="is_public" className="ml-2 block text-sm text-gray-900">
          プロフィールを公開する（他のユーザーが閲覧可能）
        </label>
      </div>

      {/* 送信ボタン */}
      <button
        type="submit"
        disabled={isSubmitting}
        className="btn-primary w-full disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isSubmitting ? '作成中...' : 'プロフィールを作成'}
      </button>
    </form>
  );
}