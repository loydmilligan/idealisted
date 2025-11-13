/** @type {import('next').NextConfig} */
const nextConfig = {
  webpack: (config, { isServer }) => {
    if (isServer) {
      // Don't bundle better-sqlite3 on server-side
      config.externals = [...(config.externals || []), 'better-sqlite3']
    }
    return config
  },
}

module.exports = nextConfig
