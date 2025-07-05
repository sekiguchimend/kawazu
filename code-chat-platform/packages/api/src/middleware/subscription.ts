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
    console.log('🔍 Getting plan limits for user:', userId);
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

    if (error) {
      console.log('📋 No active subscription found (using default plan):', {
        message: error.message,
        code: error.code,
        userId: userId
      });
      // デフォルト（無料）プランの制限
      return {
        max_rooms: 1,
        max_participants_per_room: 5,
        storage_gb: 0.1,
        advanced_features: false,
        priority_support: false
      };
    }

    if (!subscription) {
      console.log('📋 No subscription data found (using default plan)');
      return {
        max_rooms: 1,
        max_participants_per_room: 5,
        storage_gb: 0.1,
        advanced_features: false,
        priority_support: false
      };
    }

    console.log('✅ Found active subscription:', subscription.id);
    return subscription.subscription_plans.features as PlanLimits;
  } catch (error) {
    console.error('❌ Get plan limits error:', {
      message: error.message,
      stack: error.stack,
      userId: userId
    });
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
    console.log('🔄 Starting room creation limit check...');
    const userId = req.user?.id;
    
    if (!userId) {
      console.log('❌ No user ID found in request');
      res.status(401).json({
        success: false,
        error: 'Authentication required'
      });
      return;
    }

    console.log('🔍 User ID confirmed:', userId);

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
    console.log('🔍 Checking room count for user:', userId);

    // 詳細なデバッグログを追加
    console.log('🔍 About to execute rooms query with filters:', {
      userId,
      created_by: userId
    });

    // 複数のアプローチでルーム数を取得
    let currentRoomCount = 0;
    let error = null;
    let data = null;

    try {
      // 方法1: 標準的な count クエリ
      const result1 = await supabase
        .from('rooms')
        .select('id, name, slug, created_by', { count: 'exact' })
        .eq('created_by', userId);

      console.log('🔍 Method 1 result:', {
        count: result1.count,
        error: result1.error ? {
          message: result1.error.message,
          details: result1.error.details,
          hint: result1.error.hint,
          code: result1.error.code
        } : null,
        dataLength: result1.data ? result1.data.length : 0
      });

      if (result1.error) {
        error = result1.error;
      } else {
        currentRoomCount = result1.count || 0;
        data = result1.data;
      }

      // 方法2: データを取得してから count（バックアップ）
      if (error) {
        console.log('🔍 Method 1 failed, trying method 2...');
        const result2 = await supabase
          .from('rooms')
          .select('id')
          .eq('created_by', userId);

        console.log('🔍 Method 2 result:', {
          error: result2.error ? {
            message: result2.error.message,
            details: result2.error.details,
            hint: result2.error.hint,
            code: result2.error.code
          } : null,
          dataLength: result2.data ? result2.data.length : 0
        });

        if (result2.error) {
          error = result2.error;
        } else {
          currentRoomCount = result2.data?.length || 0;
          error = null;
        }
      }

    } catch (catchError) {
      console.error('🔍 Exception caught during room count query:', catchError);
      error = catchError;
    }

    console.log('🔍 Final room query result:', {
      count: currentRoomCount,
      error: error ? {
        message: error.message,
        details: error.details,
        hint: error.hint,
        code: error.code
      } : null,
      dataLength: data ? data.length : 0,
      data: data ? data.map(r => ({ id: r.id, name: r.name, slug: r.slug })) : null
    });

    if (error) {
      console.error('❌ Get room count error:', {
        message: error.message,
        details: error.details,
        hint: error.hint,
        code: error.code,
        userId: userId,
        fullError: error
      });
      res.status(500).json({
        success: false,
        error: 'Failed to check room limits',
        debug: {
          message: error.message,
          code: error.code,
          details: error.details
        }
      });
      return;
    }

    console.log('✅ Room count retrieved successfully:', currentRoomCount);

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