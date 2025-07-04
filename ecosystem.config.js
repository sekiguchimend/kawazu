module.exports = {
  apps: [
    {
      name: 'kawazu-api',
      script: 'dist/server.js',
      cwd: '/path/to/kawazu/code-chat-platform/packages/api',
      env: {
        NODE_ENV: 'production',
        PORT: 8000,
        SUPABASE_URL: 'your_supabase_url',
        SUPABASE_SERVICE_KEY: 'your_supabase_service_key',
        JWT_SECRET: 'your_jwt_secret',
        STRIPE_SECRET_KEY: 'your_stripe_secret_key',
        STRIPE_WEBHOOK_SECRET: 'your_stripe_webhook_secret',
        FRONTEND_URL: 'https://your-vercel-app.vercel.app'
      },
      instances: 1,
      exec_mode: 'fork',
      watch: false,
      max_memory_restart: '1G',
      error_file: '/var/log/pm2/kawazu-api-error.log',
      out_file: '/var/log/pm2/kawazu-api-out.log',
      log_file: '/var/log/pm2/kawazu-api.log'
    },
    {
      name: 'kawazu-web',
      script: 'npm',
      args: 'start',
      cwd: '/path/to/kawazu/code-chat-platform/packages/web',
      env: {
        NODE_ENV: 'production',
        PORT: 3000,
        NEXT_PUBLIC_API_URL: 'https://kawazu.onrender.com',
        NEXT_PUBLIC_SUPABASE_URL: 'your_supabase_url',
        NEXT_PUBLIC_SUPABASE_ANON_KEY: 'your_supabase_anon_key',
        NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: 'your_stripe_publishable_key'
      },
      instances: 1,
      exec_mode: 'fork',
      watch: false,
      max_memory_restart: '1G',
      error_file: '/var/log/pm2/kawazu-web-error.log',
      out_file: '/var/log/pm2/kawazu-web-out.log',
      log_file: '/var/log/pm2/kawazu-web.log'
    }
  ]
}; 