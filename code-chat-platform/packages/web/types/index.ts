export interface Room {
  id: string;
  name: string;
  slug: string;
  is_private: boolean;
  created_at: string;
  updated_at: string;
  participant_count?: number;
}

export interface Message {
  id: string;
  username: string;
  content: string;
  message_type: 'text' | 'code';
  created_at: string;
}

export interface Participant {
  username: string;
  role: 'owner' | 'admin' | 'member';
  joined_at: string;
  last_seen?: string;
}

export interface CreateRoomData {
  name: string;
  slug: string;
  is_private: boolean;
  password?: string;
}

export interface JoinRoomData {
  username: string;
  password?: string;
}

export interface UserProfile {
  username: string;
  display_name?: string;
  bio?: string;
  avatar_url?: string;
  website_url?: string;
  twitter_handle?: string;
  github_handle?: string;
  skills?: string[];
  location?: string;
  timezone?: string;
  is_public: boolean;
  created_at: string;
  updated_at: string;
}

export interface CreateProfileData {
  username: string;
  display_name?: string;
  bio?: string;
  avatar_url?: string;
  website_url?: string;
  twitter_handle?: string;
  github_handle?: string;
  skills?: string[];
  location?: string;
  timezone?: string;
  is_public?: boolean;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  details?: Array<{ field: string; message: string }>;
}