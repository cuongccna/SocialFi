// PM2 Ecosystem Configuration
// CryptoCrush SocialFi API Server

module.exports = {
  apps: [
    {
      // Application name (unique identifier)
      name: 'cryptocrush-api',
      
      // Working directory
      cwd: '/var/www/SocialFi/server',
      
      // Entry point
      script: 'src/index.js',
      
      // Number of instances (1 for now, can scale later)
      instances: 1,
      
      // Execution mode: 'cluster' for multi-core, 'fork' for single
      exec_mode: 'fork',
      
      // Auto restart on crash
      autorestart: true,
      
      // Don't watch for file changes in production
      watch: false,
      
      // Restart if memory exceeds 500MB
      max_memory_restart: '500M',
      
      // Restart delay
      restart_delay: 4000,
      
      // Max restarts before stopping
      max_restarts: 10,
      
      // Min uptime to consider successfully started
      min_uptime: '10s',
      
      // Environment variables
      env: {
        NODE_ENV: 'production',
        PORT: 3000
      },
      
      // Development environment (use with --env development)
      env_development: {
        NODE_ENV: 'development',
        PORT: 3000
      },
      
      // Log files
      error_file: '/var/www/SocialFi/logs/api-error.log',
      out_file: '/var/www/SocialFi/logs/api-out.log',
      log_file: '/var/www/SocialFi/logs/api-combined.log',
      
      // Merge logs from all instances
      merge_logs: true,
      
      // Add timestamp to logs
      time: true,
      
      // Log date format
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      
      // Kill timeout
      kill_timeout: 5000,
      
      // Listen timeout
      listen_timeout: 8000,
      
      // Shutdown with SIGINT
      shutdown_with_message: true,
      
      // Node.js arguments
      node_args: [
        '--max-old-space-size=512'
      ],
      
      // Instance variables (available via process.env.instance_var)
      instance_var: 'INSTANCE_ID',
      
      // Source map support
      source_map_support: true
    }
  ],
  
  // Deployment configuration (optional - for pm2 deploy)
  deploy: {
    production: {
      // SSH user
      user: 'root',
      
      // Target server
      host: '72.61.114.103',
      
      // Git reference
      ref: 'origin/main',
      
      // Git repository
      repo: 'https://github.com/cuongccna/SocialFi.git',
      
      // Server path
      path: '/var/www/SocialFi',
      
      // Pre-deploy commands (local)
      'pre-deploy-local': '',
      
      // Post-deploy commands (remote)
      'post-deploy': 'cd server && npm install --production && pm2 reload ecosystem.config.js --env production',
      
      // Pre-setup commands
      'pre-setup': ''
    }
  }
};
