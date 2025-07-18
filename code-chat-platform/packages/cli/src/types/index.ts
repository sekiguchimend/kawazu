export interface JoinOptions {
  username?: string;
  password?: string;
}

export interface CreateOptions {
  private?: boolean;
  password?: string;
}

export interface ConfigOptions {
  server?: string;
  username?: string;
}

export interface Config {
  server_url: string;
  default_username?: string;
  auto_open_editor?: boolean;
  editor_command?: string;
  auth_token?: string;
  user_email?: string;
  user_username?: string;
  user_id?: string;
}

export interface MessageData {
  room_slug: string;
  username: string;
  content: string;
  message_type: 'text' | 'code';
}

export interface RoomData {
  room_slug: string;
  username: string;
  password?: string;
}

export interface SocketMessage {
  id: string;
  username: string;
  content: string;
  message_type: 'text' | 'code';
  created_at: string;
}