/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    domains: ['fonts.googleapis.com'],
  },
  experimental: {
    // Next bundle'indan haric tut (chromium "bin" klasoru tasinmasin).
    serverComponentsExternalPackages: ['@sparticuz/chromium', 'puppeteer-core'],
    // Haric tutulan paketler otomatik izlenmez; chromium dosyalarini
    // report-pdf serverless fonksiyonuna acikca dahil et.
    outputFileTracingIncludes: {
      '/api/report-pdf': ['./node_modules/@sparticuz/chromium/**/*'],
    },
  },
  // JSON import desteği (kpi_data.json için)
  webpack: (config) => {
    config.module.rules.push({
      test: /\.json$/,
      type: 'json',
    })
    return config
  },
}

module.exports = nextConfig
