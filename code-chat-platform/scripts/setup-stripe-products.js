#!/usr/bin/env node

/**
 * Stripe商品・価格設定スクリプト
 * 開発環境でStripeの商品とPrice IDを自動作成します
 */

const Stripe = require('stripe');
require('dotenv').config();

// Stripeシークレットキーの確認
const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
if (!stripeSecretKey) {
  console.error('❌ STRIPE_SECRET_KEY環境変数が設定されていません');
  process.exit(1);
}

const stripe = new Stripe(stripeSecretKey, {
  apiVersion: '2024-11-20.acacia',
});

// プラン定義
const PLANS = [
  {
    name: 'ベーシック',
    amount: 1000,
    currency: 'jpy',
    interval: 'month',
    features: {
      max_rooms: 5,
      max_participants_per_room: 10,
      storage_gb: 1
    }
  },
  {
    name: 'スタンダード',
    amount: 3000,
    currency: 'jpy',
    interval: 'month',
    features: {
      max_rooms: 20,
      max_participants_per_room: 50,
      storage_gb: 10,
      advanced_features: true
    }
  },
  {
    name: 'プレミアム',
    amount: 5000,
    currency: 'jpy',
    interval: 'month',
    features: {
      max_rooms: 'unlimited',
      max_participants_per_room: 'unlimited',
      storage_gb: 100,
      advanced_features: true,
      priority_support: true
    }
  }
];

async function createStripeProducts() {
  console.log('🚀 Stripe商品・価格を作成しています...\n');

  const results = [];

  for (const plan of PLANS) {
    try {
      console.log(`📦 ${plan.name}プランを作成中...`);

      // 商品作成
      const product = await stripe.products.create({
        name: `Kawazu ${plan.name}`,
        description: `Kawazu ${plan.name}プラン - ${Object.keys(plan.features).length}つの機能`,
        metadata: {
          plan_type: plan.name.toLowerCase(),
          features: JSON.stringify(plan.features)
        }
      });

      console.log(`  ✅ 商品作成: ${product.id}`);

      // 価格作成
      const price = await stripe.prices.create({
        product: product.id,
        unit_amount: plan.amount,
        currency: plan.currency,
        recurring: {
          interval: plan.interval
        },
        metadata: {
          plan_name: plan.name,
          features: JSON.stringify(plan.features)
        }
      });

      console.log(`  💰 価格作成: ${price.id}`);

      results.push({
        plan: plan.name,
        product_id: product.id,
        price_id: price.id,
        amount: plan.amount,
        features: plan.features
      });

      console.log(`  🎉 ${plan.name}プラン完了\n`);

    } catch (error) {
      console.error(`❌ ${plan.name}プランの作成に失敗:`, error.message);
    }
  }

  return results;
}

async function updateSupabaseSchema(results) {
  console.log('📝 Supabaseスキーマ更新用SQLを生成しています...\n');

  const sqlStatements = results.map(result => {
    return `UPDATE subscription_plans SET stripe_price_id = '${result.price_id}' WHERE name = '${result.plan}';`;
  }).join('\n');

  const fullSql = `
-- Stripe Price IDを更新するSQL
-- 以下のSQLをSupabaseのSQL Editorで実行してください

${sqlStatements}

-- 確認クエリ
SELECT name, stripe_price_id, amount, features FROM subscription_plans ORDER BY amount;
`;

  console.log('📄 以下のSQLをSupabaseで実行してください:');
  console.log('=' * 60);
  console.log(fullSql);
  console.log('=' * 60);
}

async function generateEnvVariables(results) {
  console.log('\n🔧 環境変数の設定例:\n');

  results.forEach(result => {
    console.log(`# ${result.plan}プラン`);
    console.log(`STRIPE_PRICE_ID_${result.plan.toUpperCase()}=${result.price_id}`);
  });

  console.log('\n📋 .env.developmentファイルに追加してください:\n');
  console.log('# Stripe Price IDs');
  results.forEach(result => {
    console.log(`STRIPE_PRICE_ID_${result.plan.toUpperCase().replace(/ー/g, '')}=${result.price_id}`);
  });
}

async function main() {
  try {
    console.log('🎯 Kawazu Stripe セットアップスクリプト\n');
    
    // Stripe接続テスト
    console.log('🔐 Stripe接続をテスト中...');
    const account = await stripe.accounts.retrieve();
    console.log(`✅ Stripe接続成功: ${account.country} (${account.type})\n`);

    // 商品・価格作成
    const results = await createStripeProducts();

    if (results.length === 0) {
      console.log('❌ 商品の作成に失敗しました');
      process.exit(1);
    }

    // 結果表示
    console.log('🎉 セットアップ完了!\n');
    console.log('📊 作成された商品・価格:');
    console.table(results.map(r => ({
      プラン: r.plan,
      '商品ID': r.product_id,
      '価格ID': r.price_id,
      '金額': `¥${r.amount.toLocaleString()}/月`
    })));

    // Supabase更新SQL生成
    await updateSupabaseSchema(results);

    // 環境変数生成
    await generateEnvVariables(results);

    console.log('\n🚀 次のステップ:');
    console.log('1. 上記のSQLをSupabaseで実行');
    console.log('2. 環境変数を.envファイルに追加');
    console.log('3. APIサーバーを再起動');
    console.log('4. Pricingページでテスト');

  } catch (error) {
    console.error('❌ セットアップエラー:', error.message);
    process.exit(1);
  }
}

// スクリプトが直接実行された場合のみ実行
if (require.main === module) {
  main();
}

module.exports = { createStripeProducts, PLANS };