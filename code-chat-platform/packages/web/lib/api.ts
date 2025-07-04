import { CreateRoomData, JoinRoomData, Room, Message, Participant, UserProfile, CreateProfileData, ApiResponse } from '@/types';
import { API_URL } from './supabase';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

// API呼び出しの基本設定
const apiCall = async (endpoint: string, options: RequestInit = {}) => {
  const url = `${API_BASE_URL}${endpoint}`;
  
  const defaultHeaders = {
    'Content-Type': 'application/json',
    ...options.headers,
  };

  const token = localStorage.getItem('token');
  if (token) {
    defaultHeaders['Authorization'] = `Bearer ${token}`;
  }

  try {
    console.log(`🔗 API Call: ${options.method || 'GET'} ${endpoint}`);
    
    const response = await fetch(url, {
      ...options,
      headers: defaultHeaders,
    });

    const data = await response.json();
    
    if (!response.ok) {
      console.error(`❌ API Error: ${response.status} ${response.statusText}`, data);
      throw new Error(data.error || `HTTP error! status: ${response.status}`);
    }

    console.log(`✅ API Success: ${endpoint}`, data.success ? 'OK' : 'Failed');
    return data;
  } catch (error) {
    console.error(`💥 API Call Failed: ${endpoint}`, error);
    throw error;
  }
};

// 認証関連
export const verifyToken = async (token: string) => {
  return apiCall('/api/auth/verify', {
    method: 'POST',
    body: JSON.stringify({ token }),
  });
};

export const loginUser = async (email: string, password: string) => {
  return apiCall('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });
};

export const registerUser = async (email: string, password: string, username: string) => {
  return apiCall('/api/auth/register', {
    method: 'POST',
    body: JSON.stringify({ email, password, username }),
  });
};

// ユーザー関連
export const getCurrentUser = async () => {
  return apiCall('/api/profiles/me');
};

export const updateProfile = async (profileData: Partial<UserProfile>) => {
  return apiCall('/api/profiles/me', {
    method: 'PUT',
    body: JSON.stringify(profileData),
  });
};

export const createProfile = async (profileData: CreateProfileData) => {
  return apiCall('/api/profiles', {
    method: 'POST',
    body: JSON.stringify(profileData),
  });
};

// サブスクリプション関連
export const getSubscriptionPlans = async () => {
  return apiCall('/api/subscriptions/plans');
};

export const getCurrentSubscription = async () => {
  return apiCall('/api/subscriptions/current');
};

export const createCheckoutSession = async (priceId: string) => {
  return apiCall('/api/subscriptions/checkout', {
    method: 'POST',
    body: JSON.stringify({ price_id: priceId }),
  });
};

export const cancelSubscription = async () => {
  return apiCall('/api/subscriptions/cancel', {
    method: 'POST',
  });
};

export const resumeSubscription = async () => {
  return apiCall('/api/subscriptions/resume', {
    method: 'POST',
  });
};

export const getCustomerPortal = async () => {
  return apiCall('/api/subscriptions/portal', {
    method: 'POST',
  });
};

export const getSubscriptionHistory = async () => {
  return apiCall('/api/subscriptions/history');
};

// ルーム関連
export const getRooms = async () => {
  return apiCall('/api/rooms');
};

export const createRoom = async (roomData: {
  name: string;
  slug: string;
  description?: string;
  is_private: boolean;
  password?: string;
}) => {
  return apiCall('/api/rooms', {
    method: 'POST',
    body: JSON.stringify(roomData),
  });
};

export const getRoomBySlug = async (slug: string) => {
  return apiCall(`/api/rooms/${slug}`);
};

export const joinRoom = async (roomId: string, password?: string) => {
  return apiCall(`/api/rooms/${roomId}/join`, {
    method: 'POST',
    body: JSON.stringify({ password }),
  });
};

// メッセージ関連
export const getRoomMessages = async (roomId: string, limit = 50, offset = 0) => {
  return apiCall(`/api/messages/${roomId}?limit=${limit}&offset=${offset}`);
};

export const sendMessage = async (roomId: string, content: string, messageType = 'text') => {
  return apiCall('/api/messages', {
    method: 'POST',
    body: JSON.stringify({
      room_id: roomId,
      content,
      message_type: messageType,
    }),
  });
};

// ファイル共有関連
export const uploadFile = async (roomId: string, file: File) => {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('room_id', roomId);

  const token = localStorage.getItem('token');
  const headers: Record<string, string> = {};
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  try {
    console.log(`🔗 File Upload: ${file.name} to room ${roomId}`);
    
    const response = await fetch(`${API_BASE_URL}/api/file-sharing/upload`, {
      method: 'POST',
      headers,
      body: formData,
    });

    const data = await response.json();
    
    if (!response.ok) {
      console.error(`❌ Upload Error: ${response.status}`, data);
      throw new Error(data.error || `Upload failed! status: ${response.status}`);
    }

    console.log(`✅ Upload Success: ${file.name}`);
    return data;
  } catch (error) {
    console.error(`💥 Upload Failed: ${file.name}`, error);
    throw error;
  }
};

export const getRoomFiles = async (roomId: string) => {
  return apiCall(`/api/file-sharing/room/${roomId}`);
};

export const deleteFile = async (fileId: string) => {
  return apiCall(`/api/file-sharing/${fileId}`, {
    method: 'DELETE',
  });
};

// コラボレーション関連
export const getCollaborationDocuments = async (roomId: string) => {
  return apiCall(`/api/collaboration/documents/${roomId}`);
};

export const createCollaborationDocument = async (roomId: string, title: string, content = '') => {
  return apiCall('/api/collaboration/documents', {
    method: 'POST',
    body: JSON.stringify({
      room_id: roomId,
      title,
      content,
    }),
  });
};

export const updateCollaborationDocument = async (documentId: string, content: string) => {
  return apiCall(`/api/collaboration/documents/${documentId}`, {
    method: 'PUT',
    body: JSON.stringify({ content }),
  });
};

// ヘルスチェック
export const healthCheck = async () => {
  try {
    const response = await fetch(`${API_BASE_URL}/health`);
    return response.ok;
  } catch {
    return false;
  }
};

// エラーハンドリングヘルパー
export const handleApiError = (error: any) => {
  if (error.message?.includes('401') || error.message?.includes('Unauthorized')) {
    // 認証エラーの場合はログアウト
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.href = '/auth';
    return;
  }
  
  console.error('API Error:', error);
  return error.message || 'An unexpected error occurred';
};

// レガシー関数（互換性のため残す）
export async function getRoom(slug: string) {
  return apiCall(`/api/rooms/${slug}`);
}

export async function getRoomParticipants(slug: string) {
  return apiCall(`/api/rooms/${slug}/participants`);
}

export async function getProfile(username: string, viewerUsername?: string) {
  const queryParam = viewerUsername ? `?viewer=${viewerUsername}` : '';
  return apiCall(`/api/profiles/${username}${queryParam}`);
}

export async function searchProfiles(params: {
  search?: string;
  skills?: string;
  location?: string;
  limit?: number;
  offset?: number;
}) {
  const searchParams = new URLSearchParams();
  
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined) {
      searchParams.append(key, value.toString());
    }
  });
  
  return apiCall(`/api/profiles?${searchParams.toString()}`);
}

export async function getProfileUrl(username: string) {
  return apiCall(`/api/profiles/${username}/url`);
}