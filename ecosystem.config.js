module.exports = {
  apps: [
    {
      name: 'idealisted',
      cwd: '/home/dietpi/projects/idealisted',
      script: 'npm',
      args: 'run dev -- --hostname 0.0.0.0 --port 3300',
      exec_mode: 'fork',
      instances: 1,
      watch: false,
      env: {
        NODE_ENV: 'development',
        PORT: 3300
      },
      env_production: {
        NODE_ENV: 'production',
        PORT: 3300
      }
    }
  ]
}
