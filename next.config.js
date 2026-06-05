/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    domains: ['fonts.googleapis.com'],
  },
  // @sparticuz/chromium + puppeteer-core'u Next bundle'indan haric tut.
  // Aksi halde Next, chromium'un "bin" klasorunu tasiyip bozuyor ve
  // sunucu PDF route'u "input directory ... does not exist" hatasi veriyor.
  experimental: {
    serverComponentsExternalPackages: ['@sparticuz/chromium', 'puppeteer-core'],
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
