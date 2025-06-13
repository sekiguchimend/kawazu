import { Router, Request, Response } from 'express';
import { supabase } from '../lib/supabase';
import { AuthenticatedRequest, authenticateToken } from '../middleware/auth';

const router = Router();

// AI アシスタント設定
const AI_CONFIG = {
  models: {
    'code-review': {
      name: 'Code Review Assistant',
      description: 'コードレビューと改善提案を行います',
      maxTokens: 2000
    },
    'code-generation': {
      name: 'Code Generation Assistant', 
      description: 'コードの自動生成を行います',
      maxTokens: 1000
    },
    'debugging': {
      name: 'Debug Assistant',
      description: 'バグの発見と修正提案を行います',
      maxTokens: 1500
    },
    'documentation': {
      name: 'Documentation Assistant',
      description: 'コードのドキュメント生成を行います',
      maxTokens: 1000
    }
  }
};

// AI アシスタントと会話
router.post('/chat', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { message, context, model = 'code-review', room_id } = req.body;

    if (!message) {
      res.status(400).json({
        success: false,
        error: 'Message is required'
      });
      return;
    }

    // 使用回数制限チェック（プレミアム機能）
    const today = new Date().toISOString().split('T')[0];
    const { data: usage } = await supabase
      .from('ai_usage')
      .select('count')
      .eq('user_id', req.user!.id)
      .eq('date', today)
      .single();

    const dailyLimit = req.user!.role === 'premium' ? 100 : 10;
    if (usage && usage.count >= dailyLimit) {
      res.status(429).json({
        success: false,
        error: `Daily AI usage limit reached (${dailyLimit} requests)`
      });
      return;
    }

    // AI レスポンス生成（実際のAI APIと統合）
    const aiResponse = await generateAIResponse(message, context, model);

    // 会話履歴を保存
    const { data: conversation, error } = await supabase
      .from('ai_conversations')
      .insert({
        user_id: req.user!.id,
        room_id,
        model,
        user_message: message,
        ai_response: aiResponse.content,
        context: context || {},
        tokens_used: aiResponse.tokensUsed
      })
      .select()
      .single();

    if (error) {
      console.error('Save conversation error:', error);
    }

    // 使用回数を更新
    await supabase
      .from('ai_usage')
      .upsert({
        user_id: req.user!.id,
        date: today,
        count: (usage?.count || 0) + 1,
        tokens_used: (usage?.tokens_used || 0) + aiResponse.tokensUsed
      });

    res.json({
      success: true,
      data: {
        response: aiResponse.content,
        model,
        tokensUsed: aiResponse.tokensUsed,
        conversationId: conversation?.id
      }
    });

  } catch (error) {
    console.error('AI chat error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to process AI request'
    });
  }
});

// コードレビュー
router.post('/code-review', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { code, language, focus_areas } = req.body;

    if (!code) {
      res.status(400).json({
        success: false,
        error: 'Code is required'
      });
      return;
    }

    const prompt = `
Please review the following ${language || 'code'} and provide detailed feedback:

${focus_areas ? `Focus areas: ${focus_areas.join(', ')}` : ''}

\`\`\`${language || ''}
${code}
\`\`\`

Please provide:
1. Overall code quality assessment
2. Potential bugs or issues
3. Performance improvements
4. Best practices suggestions
5. Security considerations
`;

    const aiResponse = await generateAIResponse(prompt, { code, language }, 'code-review');

    res.json({
      success: true,
      data: {
        review: aiResponse.content,
        language,
        tokensUsed: aiResponse.tokensUsed
      }
    });

  } catch (error) {
    console.error('Code review error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to review code'
    });
  }
});

// コード生成
router.post('/generate-code', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { description, language, style, examples } = req.body;

    if (!description) {
      res.status(400).json({
        success: false,
        error: 'Code description is required'
      });
      return;
    }

    const prompt = `
Generate ${language || 'JavaScript'} code based on the following description:

${description}

${style ? `Code style: ${style}` : ''}
${examples ? `Examples or patterns to follow:\n${examples}` : ''}

Please provide:
1. Clean, well-commented code
2. Error handling
3. Best practices implementation
4. Brief explanation of the solution
`;

    const aiResponse = await generateAIResponse(prompt, { description, language }, 'code-generation');

    res.json({
      success: true,
      data: {
        code: aiResponse.content,
        language,
        description,
        tokensUsed: aiResponse.tokensUsed
      }
    });

  } catch (error) {
    console.error('Code generation error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to generate code'
    });
  }
});

// バグ検出と修正提案
router.post('/debug', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { code, error_message, language, expected_behavior } = req.body;

    if (!code) {
      res.status(400).json({
        success: false,
        error: 'Code is required'
      });
      return;
    }

    const prompt = `
Debug the following ${language || 'code'}:

${error_message ? `Error message: ${error_message}` : ''}
${expected_behavior ? `Expected behavior: ${expected_behavior}` : ''}

\`\`\`${language || ''}
${code}
\`\`\`

Please provide:
1. Identified issues and root causes
2. Step-by-step debugging approach
3. Fixed code with explanations
4. Prevention strategies for similar issues
`;

    const aiResponse = await generateAIResponse(prompt, { code, error_message, language }, 'debugging');

    res.json({
      success: true,
      data: {
        analysis: aiResponse.content,
        language,
        tokensUsed: aiResponse.tokensUsed
      }
    });

  } catch (error) {
    console.error('Debug error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to debug code'
    });
  }
});

// コードドキュメント生成
router.post('/document', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { code, language, style = 'jsdoc' } = req.body;

    if (!code) {
      res.status(400).json({
        success: false,
        error: 'Code is required'
      });
      return;
    }

    const prompt = `
Generate comprehensive documentation for the following ${language || 'code'} using ${style} style:

\`\`\`${language || ''}
${code}
\`\`\`

Please provide:
1. Function/class descriptions
2. Parameter documentation
3. Return value documentation
4. Usage examples
5. Any important notes or warnings
`;

    const aiResponse = await generateAIResponse(prompt, { code, language }, 'documentation');

    res.json({
      success: true,
      data: {
        documentation: aiResponse.content,
        language,
        style,
        tokensUsed: aiResponse.tokensUsed
      }
    });

  } catch (error) {
    console.error('Documentation error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to generate documentation'
    });
  }
});

// AI使用統計取得
router.get('/usage', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { days = '7' } = req.query;
    const daysNum = parseInt(days as string);

    const { data: usage, error } = await supabase
      .from('ai_usage')
      .select('date, count, tokens_used')
      .eq('user_id', req.user!.id)
      .gte('date', new Date(Date.now() - daysNum * 24 * 60 * 60 * 1000).toISOString().split('T')[0])
      .order('date', { ascending: false });

    if (error) {
      console.error('Get usage error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get usage statistics'
      });
      return;
    }

    const totalRequests = usage?.reduce((sum, day) => sum + day.count, 0) || 0;
    const totalTokens = usage?.reduce((sum, day) => sum + day.tokens_used, 0) || 0;

    res.json({
      success: true,
      data: {
        daily_usage: usage || [],
        summary: {
          total_requests: totalRequests,
          total_tokens: totalTokens,
          days: daysNum
        }
      }
    });

  } catch (error) {
    console.error('Get usage error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

// AI モデル一覧取得
router.get('/models', (req: Request, res: Response) => {
  res.json({
    success: true,
    data: AI_CONFIG.models
  });
});

// AI レスポンス生成関数（実際のAI APIと統合予定）
async function generateAIResponse(prompt: string, context: any, model: string) {
  // この部分は実際のAI APIと統合する
  // 例: OpenAI GPT-4, Claude, Gemini など
  
  // デモ用のモックレスポンス
  const mockResponses = {
    'code-review': `
## コードレビュー結果

### 総合評価: B+ (良好)

### 発見された問題点:
1. **エラーハンドリング不足**: try-catch文が不完全です
2. **変数名**: より説明的な名前を使用することを推奨
3. **パフォーマンス**: ループ処理を最適化できます

### 改善提案:
- エラーハンドリングの強化
- TypeScript型定義の追加
- 単体テストの実装

### セキュリティ考慮事項:
- 入力値検証の追加が必要
- SQLインジェクション対策の確認
`,
    'code-generation': `
\`\`\`javascript
// 生成されたコード例
function ${context.description?.split(' ')[0] || 'example'}Function() {
  try {
    // 実装内容
    console.log('Generated code implementation');
    return true;
  } catch (error) {
    console.error('Error:', error);
    return false;
  }
}
\`\`\`

このコードは${context.description || '指定された要件'}を満たすように実装されています。
`,
    'debugging': `
## デバッグ分析

### 特定された問題:
1. **変数未定義エラー**: 変数スコープの問題
2. **型エラー**: 予期しない型変換

### 修正されたコード:
\`\`\`javascript
// 修正版
${context.code?.substring(0, 200) || 'code'}
\`\`\`

### 予防策:
- TypeScriptの使用
- リンター設定の強化
`,
    'documentation': `
## API ドキュメント

### 関数概要
この関数は${context.language || 'JavaScript'}で実装されており、以下の機能を提供します。

### パラメータ
- \`param1\`: 文字列型 - 入力値
- \`param2\`: 数値型 - オプション設定

### 戻り値
- \`Promise<boolean>\`: 処理結果

### 使用例
\`\`\`javascript
const result = await myFunction('example', 42);
\`\`\`
`
  };

  return {
    content: mockResponses[model as keyof typeof mockResponses] || 'AI レスポンス生成中...',
    tokensUsed: Math.floor(Math.random() * 500) + 100
  };
}

export default router;