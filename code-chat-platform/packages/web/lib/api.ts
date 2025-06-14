import { CreateRoomData, JoinRoomData, Room, Message, Participant, UserProfile, CreateProfileData, ApiResponse } from '@/types';
import { API_URL } from './supabase';

// API関数のベース実装
async function apiCall<T>(endpoint: string, options: RequestInit = {}): Promise<ApiResponse<T>> {
  try {
    console.log('=== API Call Debug ===');
    console.log('URL:', `${API_URL}${endpoint}`);
    console.log('Options:', options);
    console.log('Headers:', options.headers);
    console.log('Body:', options.body);

    const response = await fetch(`${API_URL}${endpoint}`, {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      ...options,
    });

    console.log('Response status:', response.status);
    console.log('Response headers:', response.headers);
    
    const responseText = await response.text();
    console.log('Response text:', responseText);
    
    let data;
    try {
      data = JSON.parse(responseText);
    } catch (parseError) {
      console.error('JSON parse error:', parseError);
      console.error('Raw response:', responseText);
      return {
        success: false,
        error: 'Invalid JSON response'
      };
    }
    
    console.log('Parsed data:', data);
    
    if (!response.ok) {
      console.error('API Error Response:', {
        status: response.status,
        statusText: response.statusText,
        data: data
      });
      return {
        success: false,
        error: data.error || 'API request failed',
        details: data.details
      };
    }

    return data;
  } catch (error) {
    console.error('=== API Call Exception ===');
    console.error('Error:', error);
    console.error('Error type:', typeof error);
    console.error('Error message:', error instanceof Error ? error.message : String(error));
    console.error('Error stack:', error instanceof Error ? error.stack : 'No stack trace');
    return {
      success: false,
      error: 'Network error'
    };
  }
}

// 認証用のAPI呼び出し（Authorizationヘッダーを自動で付与）
async function authenticatedApiCall<T>(endpoint: string, options: RequestInit = {}): Promise<ApiResponse<T>> {
  const token = localStorage.getItem('token');
  
  if (!token) {
    return {
      success: false,
      error: 'No authentication token found'
    };
  }

  return apiCall<T>(endpoint, {
    ...options,
    headers: {
      'Authorization': `Bearer ${token}`,
      ...options.headers,
    },
  });
}

// 現在のユーザー情報取得
export async function getCurrentUser(): Promise<ApiResponse<{ user: any; profile: UserProfile | null }>> {
  return authenticatedApiCall<{ user: any; profile: UserProfile | null }>('/api/auth/me');
}

// JWTトークン検証
export async function verifyToken(token: string): Promise<ApiResponse<{ valid: boolean; user?: any }>> {
  return apiCall<{ valid: boolean; user?: any }>('/api/auth/verify', {
    method: 'POST',
    body: JSON.stringify({ token }),
  });
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