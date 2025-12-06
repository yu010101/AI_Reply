const withBundleAnalyzer = require('@next/bundle-analyzer')({
  enabled: process.env.ANALYZE === 'true',
});

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,

  // 最適化設定
  compress: true,
  poweredByHeader: false,

  // コンパイラー最適化
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production' ? {
      exclude: ['error', 'warn'],
    } : false,
  },

  // モジュール最適化
  modularizeImports: {
    '@mui/material': {
      transform: '@mui/material/{{member}}',
    },
    '@mui/icons-material': {
      transform: '@mui/icons-material/{{member}}',
    },
  },

  // 実験的機能
  experimental: {
    optimizePackageImports: ['@mui/material', '@mui/icons-material', 'chart.js', 'react-chartjs-2'],
  },

  images: {
    domains: [
      'localhost',
      // 本番環境で使用する画像ホスティングサービスのドメインを追加
      // 例: 'images.unsplash.com', 'cdn.example.com'
      ...(process.env.NEXT_PUBLIC_IMAGE_DOMAINS?.split(',') || []),
    ],
    formats: ['image/webp', 'image/avif'],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
  },

  typescript: {
    // ビルド時の型チェックを有効化（型安全性の確保）
    ignoreBuildErrors: false,
  },

  eslint: {
    // ビルド時のESLintチェックを有効化（コード品質の確保）
    ignoreDuringBuilds: false,
  },

  webpack: (config, { isServer }) => {
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        tls: false,
        dns: false,
        child_process: false,
        dgram: false,
        redis: false,
        crypto: require.resolve('crypto-browserify'),
        stream: require.resolve('stream-browserify'),
        url: require.resolve('url'),
        zlib: require.resolve('browserify-zlib'),
        http: require.resolve('stream-http'),
        https: require.resolve('https-browserify'),
        assert: require.resolve('assert'),
        os: require.resolve('os-browserify'),
        path: require.resolve('path-browserify'),
        'process/browser': require.resolve('process/browser'),
      };
    }

    // バンドルサイズ最適化
    if (!isServer) {
      config.optimization = {
        ...config.optimization,
        moduleIds: 'deterministic',
        splitChunks: {
          chunks: 'all',
          cacheGroups: {
            default: false,
            vendors: false,
            // MUIを別チャンクに分離
            mui: {
              name: 'mui',
              chunks: 'all',
              test: /[\\/]node_modules[\\/](@mui|@emotion)[\\/]/,
              priority: 40,
              enforce: true,
            },
            // Chart.jsを別チャンクに分離
            charts: {
              name: 'charts',
              chunks: 'all',
              test: /[\\/]node_modules[\\/](chart\.js|react-chartjs-2)[\\/]/,
              priority: 35,
              enforce: true,
            },
            // その他のベンダーライブラリ
            vendor: {
              name: 'vendor',
              chunks: 'all',
              test: /[\\/]node_modules[\\/]/,
              priority: 20,
              enforce: true,
            },
            // 共通コンポーネント
            commons: {
              name: 'commons',
              minChunks: 2,
              priority: 10,
              reuseExistingChunk: true,
            },
          },
        },
      };
    }

    return config;
  },
};

module.exports = withBundleAnalyzer(nextConfig); 