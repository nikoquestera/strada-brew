import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { fetchQuinosRevenue } from '@/lib/finance/quinos'

interface BankData {
  bca_income?: number
  gobiz_income?: number
  payment_credit_bca?: number
  payment_debit_bca?: number
  payment_qris?: number
  piutang_gobiz?: number
}

export async function POST(request: NextRequest) {
  try {
    const { date, stores, bankData } = await request.json()

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

            // Process bank data if provided
            const bcaIncome = bankData?.bca_income || 0
            const gobizIncome = bankData?.gobiz_income || 0
            const paymentCreditBca = bankData?.payment_credit_bca || result.payment_credit_bca || 0
            const paymentDebitBca = bankData?.payment_debit_bca || result.payment_debit_bca || 0
            const paymentQris = bankData?.payment_qris || result.payment_qris || 0
            const paymentGobiz = result.payment_gobiz || 0

            // Calculate fees
            const biayaAdminBank = (paymentCreditBca + paymentDebitBca + paymentQris) - bcaIncome
            const biayaPenjualanMerchantOnline = paymentGobiz - gobizIncome

            if (bankData?.bca_income !== undefined) {
              controller.enqueue(encoder.encode(JSON.stringify({ type: 'info', message: '--- Bank & Payment Data ---' }) + '\n'))
              controller.enqueue(encoder.encode(JSON.stringify({ type: 'info', message: `» Uang Masuk BCA: Rp ${bcaIncome.toLocaleString('id-ID')}` }) + '\n'))
              controller.enqueue(encoder.encode(JSON.stringify({ type: 'info', message: `» Uang Masuk Gobiz: Rp ${gobizIncome.toLocaleString('id-ID')}` }) + '\n'))
              controller.enqueue(encoder.encode(JSON.stringify({ type: 'info', message: `» Biaya Admin Bank: Rp ${biayaAdminBank.toLocaleString('id-ID')}` }) + '\n'))
              controller.enqueue(encoder.encode(JSON.stringify({ type: 'info', message: `» Biaya Penjualan Merchant: Rp ${biayaPenjualanMerchantOnline.toLocaleString('id-ID')}` }) + '\n'))
            }

            controller.enqueue(encoder.encode(JSON.stringify({ type: 'info', message: 'Menyimpan data ke database Supabase...' }) + '\n'))
            
            const recordData: any = {
              store_name: result.store_name,
              transaction_date: result.transaction_date,
              penjualan_bar: result.penjualan_bar,
              penjualan_coffee_beans: result.penjualan_coffee_beans,
              penjualan_makanan: result.penjualan_makanan,
              penjualan_konsinyasi: result.penjualan_konsinyasi,
              payment_academy_100_vouc: result.payment_academy_100_vouc,
              payment_credit_bca: paymentCreditBca,
              payment_debit_bca: paymentDebitBca,
              payment_gobiz: result.payment_gobiz,
              payment_qris: paymentQris,
              payment_strada_reward: result.payment_strada_reward,
              revenue_discount: result.revenue_discount,
              updated_at: new Date().toISOString(),
            }

            // Add bank fields if provided
            if (bankData?.bca_income !== undefined) {
              recordData.bca_income = bcaIncome
              recordData.gobiz_income = gobizIncome
              recordData.piutang_gobiz = piutangGobiz
              recordData.biaya_admin_bank = biayaAdminBank
              recordData.biaya_penjualan_merchant_online = biayaPenjualanMerchantOnline
            }

            const { error } = await supabase
              .from('daily_revenue')
              .upsert(recordData, { onConflict: 'store_name,transaction_date' })
              
            if (error) {
              controller.enqueue(encoder.encode(JSON.stringify({ type: 'error', message: `Gagal menyimpan ke database: ${error.message}` }) + '\n'))
            } else {
              controller.enqueue(encoder.encode(JSON.stringify({ type: 'success', message: '✅ Berhasil menyimpan ke database' }) + '\n'))
            }

            // Build result object with all data
            const finalResult = {
              ...result,
              date,
              store,
              ...(bankData?.bca_income !== undefined && {
                bca_income: bcaIncome,
                gobiz_income: gobizIncome,
                biaya_admin_bank: biayaAdminBank,
                biaya_penjualan_merchant_online: biayaPenjualanMerchantOnline,
              }),
            }

            // Also send back the final object for the "Raw Results" view
            controller.enqueue(encoder.encode(JSON.stringify({ type: 'result', data: finalResult }) + '\n'))

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
