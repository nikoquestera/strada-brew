import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { execSync } from 'child_process'
import path from 'path'
import financeConfig from '@/lib/finance/config'

interface ProcessRevenueRequest {
  date: string
  stores: string[]
}

interface RevenueData {
  date: string
  store: string
  bar_sales: number
  coffee_beans_sales: number
  kitchen_sales: number
  konsinyasi_sales: number
  total_sales: number
  raw_json: Record<string, any>
  processed_at: string
}

/**
 * Execute Python script to extract revenue from Quinos Cloud
 * POST /api/finance/process-revenue
 */
export async function POST(request: NextRequest) {
  try {
    const body: ProcessRevenueRequest = await request.json()
    const { date, stores } = body

    // Validate input
    if (!date || !Array.isArray(stores) || stores.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Invalid input: date and stores are required' },
        { status: 400 }
      )
    }

    // Check if Python is available
    try {
      execSync('python3 --version', { stdio: 'pipe' })
    } catch {
      return NextResponse.json(
        { success: false, error: 'Python3 is not available on this system' },
        { status: 500 }
      )
    }

    // Verify playwright is installed
    try {
      execSync('python3 -m pip show playwright', { stdio: 'pipe' })
    } catch {
      return NextResponse.json(
        { success: false, error: 'Playwright Python package is not installed. Run: pip install playwright' },
        { status: 500 }
      )
    }

    // Get Supabase client
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Process each store
    const results: RevenueData[] = []
    const scriptPath = path.join(process.cwd(), 'scripts/finance/extract_revenue.py')

    for (const store of stores) {
      try {
        console.log(`Processing revenue for ${store} on ${date}...`)

        // Execute Python script
        const command = `python3 "${scriptPath}" "${date}" "${store}" "${financeConfig.quinosCloud.email}" "${financeConfig.quinosCloud.password}" false`
        
        const output = execSync(command, {
          encoding: 'utf-8',
          stdio: ['pipe', 'pipe', 'pipe'],
          maxBuffer: 10 * 1024 * 1024, // 10MB buffer
        })

        const scriptResult = JSON.parse(output)

        if (scriptResult.success) {
          // Save to Supabase
          const revenueData: RevenueData = {
            date,
            store,
            bar_sales: scriptResult.data.bar_sales || 0,
            coffee_beans_sales: scriptResult.data.coffee_beans_sales || 0,
            kitchen_sales: scriptResult.data.kitchen_sales || 0,
            konsinyasi_sales: scriptResult.data.konsinyasi_sales || 0,
            total_sales: (
              (scriptResult.data.bar_sales || 0) +
              (scriptResult.data.coffee_beans_sales || 0) +
              (scriptResult.data.kitchen_sales || 0) +
              (scriptResult.data.konsinyasi_sales || 0)
            ),
            raw_json: scriptResult,
            processed_at: new Date().toISOString(),
          }

          const { data, error } = await supabase
            .from('revenue_reports')
            .insert([revenueData])
            .select()

          if (error) {
            console.error(`Supabase insert error for ${store}:`, error)
            results.push({
              ...revenueData,
              raw_json: {
                ...scriptResult,
                supabase_error: error.message,
              },
            })
          } else {
            results.push(revenueData)
          }
        } else {
          console.error(`Script failed for ${store}:`, scriptResult.error)
          results.push({
            date,
            store,
            bar_sales: 0,
            coffee_beans_sales: 0,
            kitchen_sales: 0,
            konsinyasi_sales: 0,
            total_sales: 0,
            raw_json: scriptResult,
            processed_at: new Date().toISOString(),
          })
        }
      } catch (storeError: any) {
        console.error(`Error processing ${store}:`, storeError.message)
        results.push({
          date,
          store,
          bar_sales: 0,
          coffee_beans_sales: 0,
          kitchen_sales: 0,
          konsinyasi_sales: 0,
          total_sales: 0,
          raw_json: {
            error: storeError.message,
            success: false,
          },
          processed_at: new Date().toISOString(),
        })
      }
    }

    return NextResponse.json({
      success: true,
      data: results,
      message: `Processed ${results.length} store(s)`,
    })
  } catch (error: any) {
    console.error('API Error:', error)
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Internal server error',
      },
      { status: 500 }
    )
  }
}
