import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { ACCURATE_MAPPING } from '@/lib/finance/accurate-mapping'
import axios from 'axios'

export async function POST(request: NextRequest) {
  const encoder = new TextEncoder()
  
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return new Response(JSON.stringify({ success: false, message: 'Unauthorized' }), { status: 401 })
    }

    const resultData = await request.json()
    const { options } = resultData
    const submitUangMasuk = options?.submitUangMasuk ?? true
    const submitPenjualan = options?.submitPenjualan ?? true

    if (!resultData || !resultData.transaction_date || !resultData.store_name) {
      return new Response(JSON.stringify({ success: false, message: 'Invalid data payload' }), { status: 400 })
    }

    const store = resultData.store_name
    const mapping = ACCURATE_MAPPING.STORES[store]
    
    const stream = new ReadableStream({
      async start(controller) {
        const sendLog = (msg: string, type: string = 'info') => {
          controller.enqueue(encoder.encode(JSON.stringify({ type, message: msg }) + '\n'))
        }

        try {
          sendLog(`⏳ [0%] Memulai integrasi Accurate untuk ${store}...`)

          if (!mapping) {
            throw new Error(`Mapping kode akun untuk toko ${store} tidak ditemukan di sistem.`)
          }

          // 1. Get Access Token from DB
          sendLog('⏳ [10%] Mengambil kredensial Accurate dari database...')
          const { data: tokenData, error: tokenError } = await supabase
            .from('accurate_tokens')
            .select('*')
            .eq('user_id', user.id)
            .maybeSingle()

          if (tokenError || !tokenData) {
            throw new Error('Portal belum terhubung ke Accurate. Silakan klik tombol "Hubungkan ke Accurate" di bagian atas.')
          }

          let accessToken = tokenData.access_token
          if (new Date(tokenData.expires_at) <= new Date()) {
            sendLog('⏳ [20%] Access Token kedaluwarsa, mencoba memperbarui otomatis...')
            try {
              const authHeader = Buffer.from(`${process.env.ACCURATE_OAUTH_CLIENT_ID}:${process.env.ACCURATE_OAUTH_CLIENT_SECRET}`).toString('base64')
              const refreshRes = await axios.post('https://account.accurate.id/oauth/token', 
                new URLSearchParams({
                  grant_type: 'refresh_token',
                  refresh_token: tokenData.refresh_token
                }).toString(),
                {
                  headers: {
                    'Authorization': `Basic ${authHeader}`,
                    'Content-Type': 'application/x-www-form-urlencoded'
                  }
                }
              )
              accessToken = refreshRes.data.access_token
              const expiresAt = new Date(Date.now() + refreshRes.data.expires_in * 1000).toISOString()
              
              await supabase.from('accurate_tokens').update({
                access_token: accessToken,
                refresh_token: refreshRes.data.refresh_token,
                expires_at: expiresAt,
                updated_at: new Date().toISOString()
              }).eq('id', tokenData.id)
              sendLog('✅ [25%] Token berhasil diperbarui.', 'success')
            } catch (err: any) {
              throw new Error(`Gagal memperbarui token: ${err.response?.data?.error_description || err.message}`)
            }
          }

          // 2. Get Database List
          sendLog('⏳ [30%] Mencari daftar database Accurate Anda...')
          const dbListRes = await axios.get('https://account.accurate.id/api/db-list.do', {
            headers: { 'Authorization': `Bearer ${accessToken}` }
          })
          
          if (!dbListRes.data.s || dbListRes.data.d.length === 0) {
            throw new Error('Tidak ada database Accurate yang ditemukan untuk akun ini.')
          }

          const dbId = dbListRes.data.d[0].id
          sendLog(`✅ [40%] Database ditemukan: "${dbListRes.data.d[0].alias}".`)
          
          // 3. Open DB session
          sendLog(`⏳ [50%] Membuka sesi koneksi ke database Accurate...`)
          const sessionRes = await axios.get(`https://account.accurate.id/api/open-db.do?id=${dbId}`, {
            headers: { 'Authorization': `Bearer ${accessToken}` }
          })
          
          if (!sessionRes.data.s) {
            throw new Error(`Gagal membuka database: ${sessionRes.data.d}`)
          }
          
          const sessionId = sessionRes.data.session
          const host = sessionRes.data.host
          const apiBaseUrl = `${host}/accurate`
          sendLog('✅ [60%] Sesi database berhasil dibuka.', 'success')

          // Helper to add detail rows
          const addDetail = (details: any[], account: string, type: 'DEBIT' | 'CREDIT', amount: number) => {
            if (!account) return
            const trimmedAccount = account.trim()
            const roundedAmount = Math.round(amount * 100) / 100
            if (roundedAmount <= 0) return
            
            const detail: any = {
              accountNo: trimmedAccount,
              amountType: type,
              amount: roundedAmount
            }

            // Add customer/vendor if mapped (required for Piutang/Hutang accounts)
            const customerNo = ACCURATE_MAPPING.CUSTOMER_MAPPING[trimmedAccount]
            if (customerNo) {
              detail.customerNo = customerNo
              detail.subsidiaryType = 'CUSTOMER'
            }

            const vendorNo = ACCURATE_MAPPING.VENDOR_MAPPING[trimmedAccount]
            if (vendorNo) {
              detail.vendorNo = vendorNo
              detail.subsidiaryType = 'VENDOR'
            }
            
            details.push(detail)
          }

          const dateParts = resultData.transaction_date.split('-')
          const accurateDate = `${dateParts[2]}/${dateParts[1]}/${dateParts[0]}`
          const memoPenjualan = `BREW - Penjualan cafe ${resultData.store_name} tanggal ${accurateDate}`
          const memoUangMasuk = `BREW - Uang masuk penjualan cafe ${resultData.store_name} tanggal ${accurateDate}`

          // POST Logic
          const postToAccurate = async (memo: string, details: any[]) => {
            const debits = details.filter(d => d.amountType === 'DEBIT').reduce((s, d) => s + d.amount, 0)
            const credits = details.filter(d => d.amountType === 'CREDIT').reduce((s, d) => s + d.amount, 0)
            
            const diff = Math.abs(debits - credits)
            if (diff > 1) { // 1 Rupiah tolerance
              throw new Error(`Jurnal "${memo}" tidak balance! (Selisih: ${diff.toFixed(2)}, D: ${debits.toFixed(2)}, K: ${credits.toFixed(2)})`)
            }

            const payload = {
              transDate: accurateDate,
              description: memo,
              detailJournalVoucher: details
            }

            console.log(`[Accurate Request] POST ${apiBaseUrl}/api/journal-voucher/save.do`)
            console.log('Payload:', JSON.stringify(payload, null, 2))

            const response = await axios.post(`${apiBaseUrl}/api/journal-voucher/save.do`, payload, {              headers: { 
                'Authorization': `Bearer ${accessToken}`,
                'X-Session-ID': sessionId,
                'Content-Type': 'application/json'
              }
            })

            if (!response.data.s) {
              const d = response.data.d
              let errMsg = 'Unknown Accurate Error'
              if (typeof d === 'string') errMsg = d
              else if (Array.isArray(d)) errMsg = d.join(', ')
              else if (typeof d === 'object') errMsg = JSON.stringify(d)
              
              throw new Error(`Accurate Reject: ${errMsg}`)
            }

            return response.data
          }

          // ─── JOURNAL 1: PENJUALAN CAFE ──────────────────────────────────
          if (submitPenjualan) {
            sendLog('⏳ [70%] Menyusun Jurnal Penjualan Cafe...')
            const detailsPenjualan: any[] = []
            addDetail(detailsPenjualan, mapping.payment_credit_bca, 'DEBIT', (resultData.payment_credit_bca || 0))
            addDetail(detailsPenjualan, mapping.payment_debit_bca, 'DEBIT', (resultData.payment_debit_bca || 0))
            addDetail(detailsPenjualan, mapping.payment_qris, 'DEBIT', (resultData.payment_qris || 0))
            addDetail(detailsPenjualan, mapping.payment_gobiz, 'DEBIT', (resultData.payment_gobiz || 0))
            addDetail(detailsPenjualan, mapping.payment_ovo, 'DEBIT', (resultData.payment_ovo || 0))
            addDetail(detailsPenjualan, mapping.payment_cash, 'DEBIT', (resultData.payment_cash || 0))
            addDetail(detailsPenjualan, mapping.payment_transfer, 'DEBIT', (resultData.payment_transfer || 0))
            
            for (const key in ACCURATE_MAPPING.GLOBAL) {
              if (key.startsWith('payment_')) addDetail(detailsPenjualan, ACCURATE_MAPPING.GLOBAL[key], 'DEBIT', (resultData[key] || 0))
            }
            if (mapping.payment_bsd_workshop_vou) addDetail(detailsPenjualan, mapping.payment_bsd_workshop_vou, 'DEBIT', (resultData.payment_bsd_workshop_vou || 0))
            if (mapping.payment_voucher_smkg) addDetail(detailsPenjualan, mapping.payment_voucher_smkg, 'DEBIT', (resultData.payment_voucher_smkg || 0))
            if (mapping.payment_workshop_sms_voucher) addDetail(detailsPenjualan, mapping.payment_workshop_sms_voucher, 'DEBIT', (resultData.payment_workshop_sms_voucher || 0))
            if (mapping.payment_cl_upperwest) addDetail(detailsPenjualan, mapping.payment_cl_upperwest, 'DEBIT', (resultData.payment_cl_upperwest || 0))

            addDetail(detailsPenjualan, mapping.discount, 'DEBIT', (resultData.revenue_discount || 0))

            addDetail(detailsPenjualan, mapping.sales_bar, 'CREDIT', (resultData.penjualan_bar || 0))
            addDetail(detailsPenjualan, mapping.sales_beans, 'CREDIT', (resultData.penjualan_coffee_beans || 0))
            addDetail(detailsPenjualan, mapping.sales_kitchen, 'CREDIT', (resultData.penjualan_makanan || 0))
            addDetail(detailsPenjualan, mapping.sales_konsinyasi, 'CREDIT', (resultData.penjualan_konsinyasi || 0))
            addDetail(detailsPenjualan, mapping.sales_bundling, 'CREDIT', (resultData.penjualan_bundling || 0))
            addDetail(detailsPenjualan, mapping.sales_inventory, 'CREDIT', (resultData.penjualan_inventory || 0))
            addDetail(detailsPenjualan, mapping.sales_modifier, 'CREDIT', (resultData.penjualan_modifier || 0))
            addDetail(detailsPenjualan, mapping.sales_konsinyasi_no_brand, 'CREDIT', (resultData.penjualan_konsinyasi_no_brand || 0))
            addDetail(detailsPenjualan, mapping.service_charge, 'CREDIT', (resultData.hutang_service || 0))
            addDetail(detailsPenjualan, mapping.tax, 'CREDIT', (resultData.hutang_pajak_pemkot || 0))

            sendLog('⏳ [80%] Mengirim Jurnal Penjualan ke server Accurate...')
            await postToAccurate(memoPenjualan, detailsPenjualan)
            sendLog('✅ [85%] Jurnal Penjualan berhasil.', 'success')
          }

          // ─── JOURNAL 2: UANG MASUK PENJUALAN CAFE ───────────────────────
          if (submitUangMasuk) {
            sendLog('⏳ [90%] Menyusun Jurnal Uang Masuk Cafe...')
            const detailsUangMasuk: any[] = []
            
            // Calculate Total NET Receipt (Bank Statement values + Manual Cash)
            const totalNetReceipt = 
              (resultData.bca_kredit_income || 0) + 
              (resultData.bca_debit_income || 0) + 
              (resultData.bca_qris_income || 0) + 
              (resultData.gobiz_income || 0) + 
              (resultData.ovo_income || 0) + 
              (resultData.cash_income || 0) + 
              (resultData.payment_transfer || 0)

            // DEBIT: Settlement BCA (Actual cash/bank received)
            addDetail(detailsUangMasuk, mapping.settlement_bca, 'DEBIT', totalNetReceipt)
            
            // DEBIT: Fees (Selisih)
            addDetail(detailsUangMasuk, ACCURATE_MAPPING.GLOBAL.admin_bank, 'DEBIT', (resultData.biaya_admin_bank || 0))
            addDetail(detailsUangMasuk, ACCURATE_MAPPING.GLOBAL.admin_merchant, 'DEBIT', (resultData.biaya_penjualan_merchant_online || 0))
            
            // KREDIT: Only clear the 7 core Piutang/Payment accounts that were added to the Debit side
            const corePaymentKeys = [
              'payment_cash',
              'payment_transfer',
              'payment_credit_bca',
              'payment_debit_bca',
              'payment_qris',
              'payment_gobiz',
              'payment_ovo'
            ]

            for (const key of corePaymentKeys) {
              const amount = resultData[key] || 0
              if (amount > 0) {
                const account = mapping[key] || ACCURATE_MAPPING.GLOBAL[key]
                if (account) {
                  addDetail(detailsUangMasuk, account, 'CREDIT', amount)
                }
              }
            }

            sendLog('⏳ [95%] Mengirim Jurnal Uang Masuk ke server Accurate...')
            await postToAccurate(memoUangMasuk, detailsUangMasuk)
            sendLog('✅ [98%] Jurnal Uang Masuk berhasil.', 'success')
          }

          sendLog('✅ [100%] Semua pilihan Jurnal berhasil ter-posting!', 'success')
          controller.enqueue(encoder.encode(JSON.stringify({ success: true, message: 'Done' }) + '\n'))
          controller.close()

        } catch (err: any) {
          console.error('Submit Accurate Error Trace:', err.response?.data || err.message)
          const errorData = err.response?.data
          let errorMsg = err.message
          
          if (errorData) {
            if (typeof errorData.d === 'string') errorMsg = errorData.d
            else if (Array.isArray(errorData.d)) errorMsg = errorData.d.join(', ')
            else errorMsg = JSON.stringify(errorData)
          }
          
          sendLog(`❌ Gagal: ${errorMsg}`, 'error')
          controller.close()
        }
      }
    })

    return new Response(stream, {
      headers: { 'Content-Type': 'application/x-ndjson', 'Cache-Control': 'no-cache' }
    })

  } catch (error: any) {
    return new Response(JSON.stringify({ success: false, message: error.message }), { status: 500 })
  }
}
