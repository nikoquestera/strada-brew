/**
 * Finance Configuration
 * Stores sensitive data for automated scripts
 * Keep this file secure and never commit credentials
 */

export const financeConfig = {
  quinosCloud: {
    baseUrl: 'https://quinoscloud.com/cloud',
    loginUrl: 'https://quinoscloud.com/cloud/login',
    email: process.env.QUINOS_CLOUD_EMAIL || 'kopiterbaiknusantara1@gmail.com',
    password: process.env.QUINOS_CLOUD_PASSWORD || 'strada123',
  },
  // Google Drive spreadsheet for report backup
  googleDrive: {
    spreadsheetUrl: process.env.GOOGLE_DRIVE_SPREADSHEET_URL || 'https://docs.google.com/spreadsheets/d/YOUR_SHEET_ID',
    apiKey: process.env.GOOGLE_DRIVE_API_KEY || '',
  },
  // Accurate API (for next phase)
  accurate: {
    baseUrl: process.env.ACCURATE_API_URL || 'https://api.accurate.id',
    apiKey: process.env.ACCURATE_API_KEY || '',
  },
  // Supabase configuration
  supabase: {
    url: process.env.NEXT_PUBLIC_SUPABASE_URL || '',
    anonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '',
    serviceKey: process.env.SUPABASE_SERVICE_KEY || '',
  },
  // List of stores for filtering
  stores: [
    'Semanggi',
    'Pondok Indah',
    'Senayan City',
    'Kota Kasablanka',
    'Gateway Mall',
    'Plaza Indonesia',
    'Senayan Raya',
    'Epicentrum',
  ],
}

export default financeConfig
