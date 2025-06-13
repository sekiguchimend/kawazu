import { CreateRoomData, JoinRoomData, Room, Message, Participant, UserProfile, CreateProfileData, ApiResponse } from '@/types';
import { API_URL } from './supabase';

// API関数のベース実装
async function apiCall<T>(endpoint: string, options: RequestInit = {}): Promise<ApiResponse<T>> {
  try {
    const response = await fetch(`${API_URL}${endpoint}`, {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      ...options,
    });

    const data = await response.json();
    
    if (!response.ok) {
      return {
        success: false,
        error: data.error || 'API request failed',
        details: data.details
      };
    }

    return data;
  } catch (error) {
    console.error('API call failed:', error);
    return {
      success: false,
      error: 'Network error'
    };
  }
}

// ルーム作成
export async function createRoom(roomData: CreateRoomData): Promise<ApiResponse<Room>> {
  return apiCall<Room>('/api/rooms', {
    method: 'POST',
    body: JSON.stringify(roomData),
  });
}

// ルーム情報取得
export async function getRoom(slug: string): Promise<ApiResponse<Room>> {
  return apiCall<Room>(`/api/rooms/${slug}`);
}

// ルーム参加
export async function joinRoom(slug: string, joinData: JoinRoomData): Promise<ApiResponse<{ room: Room; participant: Participant }>> {
  return apiCall(`/api/rooms/${slug}/join`, {
    method: 'POST',
    body: JSON.stringify(joinData),
  });
}

// 参加者一覧取得
export async function getRoomParticipants(slug: string): Promise<ApiResponse<Participant[]>> {
  return apiCall<Participant[]>(`/api/rooms/${slug}/participants`);
}

// メッセージ履歴取得
export async function getMessages(roomSlug: string, limit = 50, offset = 0): Promise<ApiResponse<{ room: Room; messages: Message[] }>> {
  return apiCall(`/api/messages/${roomSlug}?limit=${limit}&offset=${offset}`);
}

// プロフィール作成
export async function createProfile(profileData: CreateProfileData): Promise<ApiResponse<UserProfile>> {
  return apiCall<UserProfile>('/api/profiles', {
    method: 'POST',
    body: JSON.stringify(profileData),
  });
}

// プロフィール取得
export async function getProfile(username: string, viewerUsername?: string): Promise<ApiResponse<UserProfile>> {
  const queryParam = viewerUsername ? `?viewer=${viewerUsername}` : '';
  return apiCall<UserProfile>(`/api/profiles/${username}${queryParam}`);
}

// プロフィール更新
export async function updateProfile(username: string, profileData: Partial<CreateProfileData>): Promise<ApiResponse<UserProfile>> {
  return apiCall<UserProfile>(`/api/profiles/${username}`, {
    method: 'PUT',
    body: JSON.stringify(profileData),
  });
}

// プロフィール検索
export async function searchProfiles(params: {
  search?: string;
  skills?: string;
  location?: string;
  limit?: number;
  offset?: number;
}): Promise<ApiResponse<UserProfile[]>> {
  const searchParams = new URLSearchParams();
  
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined) {
      searchParams.append(key, value.toString());
    }
  });
  
  return apiCall<UserProfile[]>(`/api/profiles?${searchParams.toString()}`);
}

// プロフィールURL取得
export async function getProfileUrl(username: string): Promise<ApiResponse<{ username: string; url: string; is_public: boolean }>> {
  return apiCall(`/api/profiles/${username}/url`);
}

// ヘルスチェック
export async function healthCheck(): Promise<ApiResponse<{ status: string; timestamp: string }>> {
  return apiCall('/health');
}