# Finance Dashboard - Revenue Store Module

## Overview

This module provides automated revenue report generation for Strada Coffee's BREW portal. It fetches daily sales data from Quinos Cloud and stores the results in Supabase.

## Features

### ✅ Completed
- **Finance Dashboard Routing**: Role-based access for `selena@stradacoffee.com`
- **Revenue Store Tab**: Interactive UI for report generation
- **Quinos Cloud Automation**: Playwright Python script with comprehensive logging
- **Supabase Integration**: Persistent storage of revenue reports
- **API Endpoint**: Backend service to orchestrate the extraction process

### 🚀 Roadmap
- Penjualan (Sales) Tab - Coming Soon
- Pembayaran (Payment) Tab - Coming Soon
- Stok Opname (Stock Opname) Tab - Coming Soon

## Architecture

### Components

1. **Frontend** (`src/app/dashboard/finance/`)
   - Dashboard home page with module overview
   - Revenue Store page with interactive form
   - Placeholder pages for future modules

2. **API** (`src/app/api/finance/`)
   - `POST /api/finance/process-revenue`: Executes Python script and saves to Supabase

3. **Python Script** (`scripts/finance/extract_revenue.py`)
   - Automates Quinos Cloud login
   - Filters reports by date and store
   - Extracts sales data
   - Real-time logging

4. **Database** (`supabase/migrations/`)
   - `revenue_reports` table with indexed queries

5. **Configuration** (`src/lib/finance/config.ts`)
   - Centralized config for credentials and store list

## Setup Instructions

### Prerequisites
- Node.js 18+
- Python 3.8+
- Playwright installed

### Installation

1. **Install Node.js dependencies**
   ```bash
   npm install
   ```

2. **Install Python dependencies and Playwright**
   ```bash
   npm run setup:finance
   ```
   Or manually:
   ```bash
   pip install -r requirements-finance.txt
   python3 -m playwright install chromium
   ```

3. **Set up Supabase migration**
   - Run the SQL migration in `supabase/migrations/20260409_create_revenue_reports_table.sql`
   - Or use Supabase CLI: `supabase migration up`

4. **Configure environment variables**
   Add to `.env.local`:
   ```env
   # Quinos Cloud (optional, defaults are built-in)
   QUINOS_CLOUD_EMAIL=kopiterbaiknusantara1@gmail.com
   QUINOS_CLOUD_PASSWORD=strada123

   # Google Drive (for future integration)
   GOOGLE_DRIVE_SPREADSHEET_URL=https://docs.google.com/spreadsheets/d/YOUR_SHEET_ID
   GOOGLE_DRIVE_API_KEY=your_api_key

   # Accurate API (for next phase)
   ACCURATE_API_URL=https://api.accurate.id
   ACCURATE_API_KEY=your_key

   # Supabase
   SUPABASE_SERVICE_KEY=your_service_key
   ```

## Usage

### For Finance Staff (selena@stradacoffee.com)

1. Log in to BREW portal
2. You'll be redirected to Finance Dashboard (instead of HRD)
3. Click "Revenue Store" in the sidebar
4. Select stores and transaction date
5. Click "Proses" button
6. Monitor the logging output as the script runs
7. View results and raw JSON output

### API Usage

**Endpoint**: `POST /api/finance/process-revenue`

**Request**:
```json
{
  "date": "2026-04-09",
  "stores": ["Semanggi", "Pondok Indah", "Senayan City"]
}
```

**Response**:
```json
{
  "success": true,
  "data": [
    {
      "date": "2026-04-09",
      "store": "Semanggi",
      "bar_sales": 5000000,
      "coffee_beans_sales": 2000000,
      "kitchen_sales": 3000000,
      "konsinyasi_sales": 1000000,
      "total_sales": 11000000,
      "raw_json": { ... },
      "processed_at": "2026-04-09T14:30:00Z"
    },
    ...
  ],
  "message": "Processed 3 store(s)"
}
```

## Database Schema

### revenue_reports Table

```sql
CREATE TABLE revenue_reports (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    date DATE NOT NULL,
    store_name VARCHAR(255) NOT NULL,
    bar_sales DECIMAL(15, 2),
    coffee_beans_sales DECIMAL(15, 2),
    kitchen_sales DECIMAL(15, 2),
    konsinyasi_sales DECIMAL(15, 2),
    total_sales DECIMAL(15, 2),
    raw_json JSONB NOT NULL,
    processed_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indices
CREATE INDEX idx_revenue_reports_date_store ON revenue_reports(date, store_name);
CREATE INDEX idx_revenue_reports_created_at ON revenue_reports(created_at DESC);
```

## Python Script Details

### extract_revenue.py

**Purpose**: Automate Quinos Cloud report generation and data extraction

**Features**:
- Playwright automation with headless control
- Real-time logging for monitoring
- Error handling with graceful timeouts
- JSON output for API consumption

**Usage**:
```bash
python3 scripts/finance/extract_revenue.py <date> <store> <email> <password> [headless]

# Example:
python3 scripts/finance/extract_revenue.py 2026-04-09 "Semanggi" "user@example.com" "password" false
```

**Output**:
```json
{
  "success": true,
  "date": "2026-04-09",
  "store": "Semanggi",
  "data": {
    "bar_sales": 5000000,
    "coffee_beans_sales": 2000000,
    "kitchen_sales": 3000000,
    "konsinyasi_sales": 1000000,
    "total_sales": 11000000
  },
  "logs": [
    "[2026-04-09 14:30:00] [INFO] 🚀 Memulai ekstraksi data Quinos Cloud...",
    "[2026-04-09 14:30:05] [SUCCESS] ✅ Login berhasil!"
  ]
}
```

### Logging Format

The script provides real-time logging with visual indicators:
- 🚀 Process started
- 🔐 Authentication
- 📊 Report navigation
- 📅 Date filtering
- 🏪 Store selection
- ⚙️ Report generation
- 📈 Data extraction
- ✅ Success
- ❌ Error
- ⏳ Timeout/Waiting
- ⚠️ Warning

## Integration with Accurate API

The `raw_json` field in the database stores the complete response, which can be transformed and sent to Accurate API:

```typescript
// Example transformation for Accurate
const revenueData = result.data[0];
const accuratePayload = {
  date: revenueData.date,
  store_code: revenueData.store,
  sales: {
    bar: revenueData.bar_sales,
    coffee_beans: revenueData.coffee_beans_sales,
    kitchen: revenueData.kitchen_sales,
    konsinyasi: revenueData.konsinyasi_sales,
  },
  total: revenueData.total_sales,
  raw_source: revenueData.raw_json,
};

// POST to Accurate API
await fetch('https://api.accurate.id/revenue', {
  method: 'POST',
  headers: { 'Authorization': `Bearer ${ACCURATE_API_KEY}` },
  body: JSON.stringify(accuratePayload),
});
```

## File Structure

```
strada-brew/
├── middleware.ts                          # Role-based routing
├── requirements-finance.txt              # Python dependencies
├── src/
│   ├── app/
│   │   ├── dashboard/finance/            # Finance dashboard
│   │   │   ├── layout.tsx                # Server layout
│   │   │   ├── layout-client.tsx         # Client layout
│   │   │   ├── page.tsx                  # Dashboard home
│   │   │   ├── revenue-store/
│   │   │   │   ├── page.tsx              # Revenue Store page
│   │   │   │   └── RevenueStoreClient.tsx # Main component
│   │   │   ├── penjualan/
│   │   │   ├── pembayaran/
│   │   │   └── stok-opname/
│   │   └── api/finance/process-revenue/
│   │       └── route.ts                  # API endpoint
│   └── lib/finance/
│       └── config.ts                     # Configuration
├── scripts/finance/
│   └── extract_revenue.py               # Python automation
└── supabase/migrations/
    └── 20260409_create_revenue_reports_table.sql
```

## Troubleshooting

### Python Not Found
```bash
# Verify Python is installed
python3 --version

# Check pip
pip3 --version

# Install Playwright if missing
pip install playwright
python3 -m playwright install chromium
```

### Playwright Browser Issues
```bash
# Reinstall browser binaries
python3 -m playwright install

# Run with headless=false to see what's happening
python3 scripts/finance/extract_revenue.py <date> <store> <email> <password> false
```

### Supabase Connection Issues
- Verify `.env.local` has correct `NEXT_PUBLIC_SUPABASE_URL` and keys
- Check that the `revenue_reports` table exists
- Verify RLS policies are correctly configured

### Quinos Cloud Login Failures
- Verify credentials in `.env.local`
- Check if Quinos Cloud website layout has changed
- Run script with `headless=false` to monitor the login process

## Security Notes

⚠️ **IMPORTANT**: Credentials should never be hardcoded in production. Use environment variables or secret management:

```bash
# .env.local (never commit this)
QUINOS_CLOUD_EMAIL=kopiterbaiknusantara1@gmail.com
QUINOS_CLOUD_PASSWORD=strada123
ACCURATE_API_KEY=your_secret_key
```

## Testing

### Manual Test
1. Deploy the application
2. Log in as `selena@stradacoffee.com`
3. Navigate to Finance > Revenue Store
4. Select stores and date
5. Click "Proses"
6. Monitor logs and verify data is saved to Supabase

### Automated Test (Coming Soon)
```bash
npm run test:finance
```

## Next Steps

1. **Google Drive Integration**: Save reports to Google Sheets
2. **Accurate API Integration**: POST results to Accurate
3. **Scheduling**: Set up cron job for daily automatic extraction
4. **Email Notifications**: Send report summaries via email
5. **Dashboard Charts**: Add visualization for sales trends

## Support

For issues or questions:
1. Check the logs in the UI
2. Check server console for detailed errors
3. Review Python script execution with `headless=false`
4. Check Supabase dashboard for data persistence

---

**Created**: 2026-04-09
**Module**: Finance > Revenue Store
**Status**: Production Ready
**Version**: 1.0.0
