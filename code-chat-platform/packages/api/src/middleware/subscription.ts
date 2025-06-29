import { Request, Response, NextFunction } from 'express';
import { supabase } from '../lib/supabase';
import { AuthenticatedRequest } from './auth';

export interface PlanLimits {
  max_rooms: number | 'unlimited';
  max_participants_per_room: number | 'unlimited';
  storage_gb: number;
  advanced_features: boolean;
  priority_support: boolean;
}

// プラン制限を取得
export async function getUserPlanLimits(userId: string): Promise<PlanLimits | null> {
  try {
    const { data: subscription, error } = await supabase
      .from('user_subscriptions')
      .select(`
        *,
        subscription_plans (
          features
        )
      `)
      .eq('user_id', userId)
      .eq('status', 'active')
      .single();

    if (error || !subscription) {
      // デフォルト（無料）プランの制限
      return {
        max_rooms: 1,
        max_participants_per_room: 5,
        storage_gb: 0.1,
        advanced_features: false,
        priority_support: false
      };
    }

    return subscription.subscription_plans.features as PlanLimits;
  } catch (error) {
    console.error('Get plan limits error:', error);
    return null;
  }
}

// ルーム作成制限チェック
export const checkRoomCreationLimit = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.user?.id;
    
    if (!userId) {
      res.status(401).json({
        success: false,
        error: 'Authentication required'
      });
      return;
    }

    // ユーザーのプラン制限を取得
    const limits = await getUserPlanLimits(userId);
    
    if (!limits) {
      res.status(500).json({
        success: false,
        error: 'Failed to get plan limits'
      });
      return;
    }

    // 現在のルーム数を取得
    const { count: currentRoomCount, error } = await supabase
      .from('rooms')
      .select('*', { count: 'exact', head: true })
      .eq('created_by', userId);

    if (error) {
      console.error('Get room count error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to check room limits'
      });
      return;
    }

    // 制限チェック
    if (limits.max_rooms !== 'unlimited' && (currentRoomCount || 0) >= limits.max_rooms) {
      res.status(403).json({
        success: false,
        error: `Room creation limit reached. Your plan allows ${limits.max_rooms} rooms.`,
        plan_limits: {
          max_rooms: limits.max_rooms,
          current_rooms: currentRoomCount || 0
        }
      });
      return;
    }

    // 制限情報をrequestに追加
    req.planLimits = limits;
    next();

  } catch (error) {
    console.error('Check room creation limit error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
};

// ルーム参加制限チェック
export const checkRoomParticipantLimit = async (roomId: string, currentCount: number): Promise<boolean> => {
  try {
    // ルーム作成者のプラン制限を取得
    const { data: room, error } = await supabase
      .from('rooms')
      .select('created_by')
      .eq('id', roomId)
      .single();

    if (error || !room || !room.created_by) {
      // 作成者情報がない場合はデフォルト制限
      return currentCount < 5;
    }

    const limits = await getUserPlanLimits(room.created_by);
    
    if (!limits) {
      return currentCount < 5;
    }

    if (limits.max_participants_per_room === 'unlimited') {
      return true;
    }

    return currentCount < limits.max_participants_per_room;
  } catch (error) {
    console.error('Check participant limit error:', error);
    return false;
  }
};

// ストレージ制限チェック
export const checkStorageLimit = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.user?.id;
    const fileSize = req.body.file_size || 0; // バイト
    
    if (!userId) {
      res.status(401).json({
        success: false,
        error: 'Authentication required'
      });
      return;
    }

    const limits = await getUserPlanLimits(userId);
    
    if (!limits) {
      res.status(500).json({
        success: false,
        error: 'Failed to get plan limits'
      });
      return;
    }

    // 現在の使用量を取得（実装は簡略化）
    const { data: usage, error } = await supabase
      .from('file_shares')
      .select('file_name')
      .eq('owner_username', req.user?.username);

    if (error) {
      console.error('Get storage usage error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to check storage limits'
      });
      return;
    }

    // 簡易的な使用量計算（実際にはファイルサイズの合計が必要）
    const currentUsageGB = (usage?.length || 0) * 0.1; // 仮の計算
    const fileSizeGB = fileSize / (1024 * 1024 * 1024);

    if (currentUsageGB + fileSizeGB > limits.storage_gb) {
      res.status(403).json({
        success: false,
        error: `Storage limit exceeded. Your plan allows ${limits.storage_gb}GB.`,
        plan_limits: {
          storage_gb: limits.storage_gb,
          current_usage_gb: currentUsageGB
        }
      });
      return;
    }

    next();

  } catch (error) {
    console.error('Check storage limit error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
};

// プラン情報を取得するヘルパー
export const getPlanInfo = async (userId: string) => {
  const limits = await getUserPlanLimits(userId);
  
  if (!limits) {
    return null;
  }

  // 現在の使用量を取得
  const { count: roomCount } = await supabase
    .from('rooms')
    .select('*', { count: 'exact', head: true })
    .eq('created_by', userId);

  return {
    limits,
    usage: {
      rooms: roomCount || 0
    }
  };
}; 