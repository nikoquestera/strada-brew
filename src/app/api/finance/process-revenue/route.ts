import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { fetchQuinosRevenue } from '@/lib/finance/quinos'

export async function POST(request: NextRequest) {
  try {
    const { date, stores } = await request.json()

    if (!date || !Array.isArray(stores) || stores.length === 0) {
      return new Response(JSON.stringify({ type: 'error', message: 'Invalid input' }), { status: 400 })
    }

    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return new Response(JSON.stringify({ type: 'error', message: 'Unauthorized' }), { status: 401 })
    }

    const encoder = new TextEncoder()
    const stream = new ReadableStream({
      async start(controller) {
        for (const store of stores) {
          controller.enqueue(encoder.encode(JSON.stringify({ type: 'info', message: `=== Memulai proses untuk toko: ${store} ===` }) + '\n'))
          
          try {
            const result = await fetchQuinosRevenue(date, store, (msg, type) => {
              controller.enqueue(encoder.encode(JSON.stringify({ type: type || 'info', message: msg }) + '\n'))
            })

            // Log detailed results to UI
            controller.enqueue(encoder.encode(JSON.stringify({ type: 'info', message: '--- Sales per Department ---' }) + '\n'))
            controller.enqueue(encoder.encode(JSON.stringify({ type: 'info', message: `» Bar: Rp ${result.penjualan_bar.toLocaleString('id-ID')}` }) + '\n'))
            controller.enqueue(encoder.encode(JSON.stringify({ type: 'info', message: `» Coffee Beans: Rp ${result.penjualan_coffee_beans.toLocaleString('id-ID')}` }) + '\n'))
            controller.enqueue(encoder.encode(JSON.stringify({ type: 'info', message: `» Kitchen: Rp ${result.penjualan_makanan.toLocaleString('id-ID')}` }) + '\n'))
            controller.enqueue(encoder.encode(JSON.stringify({ type: 'info', message: `» Konsinyasi: Rp ${result.penjualan_konsinyasi.toLocaleString('id-ID')}` }) + '\n'))
            
            controller.enqueue(encoder.encode(JSON.stringify({ type: 'info', message: '--- Payment Method ---' }) + '\n'))
            controller.enqueue(encoder.encode(JSON.stringify({ type: 'info', message: `» CREDIT BCA: Rp ${result.payment_credit_bca.toLocaleString('id-ID')}` }) + '\n'))
            controller.enqueue(encoder.encode(JSON.stringify({ type: 'info', message: `» DEBIT BCA: Rp ${result.payment_debit_bca.toLocaleString('id-ID')}` }) + '\n'))
            controller.enqueue(encoder.encode(JSON.stringify({ type: 'info', message: `» QRIS: Rp ${result.payment_qris.toLocaleString('id-ID')}` }) + '\n'))
            controller.enqueue(encoder.encode(JSON.stringify({ type: 'info', message: `» GOBIZ: Rp ${result.payment_gobiz.toLocaleString('id-ID')}` }) + '\n'))

            controller.enqueue(encoder.encode(JSON.stringify({ type: 'info', message: 'Menyimpan data ke database Supabase...' }) + '\n'))
            
            const { error } = await supabase
              .from('daily_revenue')
              .upsert({
                store_name: result.store_name,
                transaction_date: result.transaction_date,
                penjualan_bar: result.penjualan_bar,
                penjualan_coffee_beans: result.penjualan_coffee_beans,
                penjualan_makanan: result.penjualan_makanan,
                penjualan_konsinyasi: result.penjualan_konsinyasi,
                payment_academy_100_vouc: result.payment_academy_100_vouc,
                payment_credit_bca: result.payment_credit_bca,
                payment_debit_bca: result.payment_debit_bca,
                payment_gobiz: result.payment_gobiz,
                payment_qris: result.payment_qris,
                payment_strada_reward: result.payment_strada_reward,
                revenue_discount: result.revenue_discount,
                updated_at: new Date().toISOString()
              }, { onConflict: 'store_name,transaction_date' })
              
            if (error) {
              controller.enqueue(encoder.encode(JSON.stringify({ type: 'error', message: `Gagal menyimpan ke database: ${error.message}` }) + '\n'))
            } else {
              controller.enqueue(encoder.encode(JSON.stringify({ type: 'success', message: '✅ Berhasil menyimpan ke database' }) + '\n'))
            }

            // Also send back the final object for the "Raw Results" view
            controller.enqueue(encoder.encode(JSON.stringify({ type: 'result', data: result }) + '\n'))

          } catch (err: any) {
            controller.enqueue(encoder.encode(JSON.stringify({ type: 'error', message: `Error processing ${store}: ${err.message}` }) + '\n'))
          }
        }
        controller.enqueue(encoder.encode(JSON.stringify({ type: 'success', message: '🎉 Semua proses telah selesai' }) + '\n'))
        controller.close()
      }
    })

    return new Response(stream, {
      headers: {
        'Content-Type': 'application/x-ndjson',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    })
  } catch (error: any) {
    return new Response(JSON.stringify({ type: 'error', message: error.message }), { status: 500 })
  }
}
