import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { journal_voucher } from '@/lib/accurate'
import { ACCURATE_MAPPING } from '@/lib/finance/accurate-mapping'
import axios from 'axios'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 })
    }

    const resultData = await request.json()
    if (!resultData || !resultData.transaction_date || !resultData.store_name) {
      return NextResponse.json({ success: false, message: 'Invalid data payload' }, { status: 400 })
    }

    const store = resultData.store_name
    const mapping = ACCURATE_MAPPING.STORES[store]
    if (!mapping) {
      return NextResponse.json({ success: false, message: `Mapping for store ${store} not found` }, { status: 400 })
    }

    // 1. Get Access Token from DB
    const { data: tokenData, error: tokenError } = await supabase
      .from('accurate_tokens')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle()

    if (tokenError || !tokenData) {
      return NextResponse.json({ success: false, message: 'Portal belum terhubung ke Accurate. Silakan klik tombol Hubungkan di atas.' }, { status: 401 })
    }

    // Check if token expired and needs refresh (Accurate tokens last 1 hour)
    let accessToken = tokenData.access_token
    if (new Date(tokenData.expires_at) <= new Date()) {
      // Refresh Logic
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
      } catch (err: any) {
        return NextResponse.json({ success: false, message: 'Sesi Accurate habis. Silakan hubungkan ulang.' }, { status: 401 })
      }
    }

    // 2. Get Database List to find the correct session
    // Accurate requires X-Session-ID for most calls. 
    // We assume the user wants to post to the first database or we need a way to select it.
    // For now, let's try to get databases.
    const dbListRes = await axios.get('https://account.accurate.id/api/db-list.do', {
      headers: { 'Authorization': `Bearer ${accessToken}` }
    })
    
    if (!dbListRes.data.s || dbListRes.data.d.length === 0) {
      return NextResponse.json({ success: false, message: 'Tidak ada database Accurate yang ditemukan.' }, { status: 404 })
    }

    const dbId = dbListRes.data.d[0].id // Use first DB for now
    
    // 3. Open DB session
    const sessionRes = await axios.get(`https://account.accurate.id/api/open-db.do?id=${dbId}`, {
      headers: { 'Authorization': `Bearer ${accessToken}` }
    })
    
    if (!sessionRes.data.s) {
      return NextResponse.json({ success: false, message: `Gagal membuka database: ${sessionRes.data.d}` }, { status: 500 })
    }
    
    const sessionId = sessionRes.data.session
    const host = sessionRes.data.host

    // Helper to add detail rows
    const addDetail = (details: any[], account: string, type: 'DEBIT' | 'KREDIT', amount: number) => {
      if (amount <= 0 || !account) return
      details.push({
        accountNo: account,
        amountType: type,
        amount: amount
      })
    }

    // Format dates
    const dateParts = resultData.transaction_date.split('-')
    const accurateDate = `${dateParts[2]}/${dateParts[1]}/${dateParts[0]}`

    // ─── JOURNAL 1: PENJUALAN CAFE ──────────────────────────────────────────
    const detailsPenjualan: any[] = []
    
    // DEBITS (Payments/Receivables)
    addDetail(detailsPenjualan, mapping.payment_credit_bca, 'DEBIT', (resultData.payment_credit_bca || 0))
    addDetail(detailsPenjualan, mapping.payment_debit_bca, 'DEBIT', (resultData.payment_debit_bca || 0))
    addDetail(detailsPenjualan, mapping.payment_qris, 'DEBIT', (resultData.payment_qris || 0))
    addDetail(detailsPenjualan, mapping.payment_gobiz, 'DEBIT', (resultData.payment_gobiz || 0))
    addDetail(detailsPenjualan, mapping.payment_ovo, 'DEBIT', (resultData.payment_ovo || 0))
    addDetail(detailsPenjualan, mapping.payment_cash, 'DEBIT', (resultData.payment_cash || 0))
    addDetail(detailsPenjualan, mapping.payment_transfer, 'DEBIT', (resultData.payment_transfer || 0))
    
    // Vouchers (Global mapping)
    for (const key in ACCURATE_MAPPING.GLOBAL) {
      if (key.startsWith('payment_')) {
        addDetail(detailsPenjualan, ACCURATE_MAPPING.GLOBAL[key], 'DEBIT', (resultData[key] || 0))
      }
    }
    // Store specific vouchers
    if (mapping.payment_bsd_workshop_vou) addDetail(detailsPenjualan, mapping.payment_bsd_workshop_vou, 'DEBIT', (resultData.payment_bsd_workshop_vou || 0))
    if (mapping.payment_voucher_smkg) addDetail(detailsPenjualan, mapping.payment_voucher_smkg, 'DEBIT', (resultData.payment_voucher_smkg || 0))
    if (mapping.payment_workshop_sms_voucher) addDetail(detailsPenjualan, mapping.payment_workshop_sms_voucher, 'DEBIT', (resultData.payment_workshop_sms_voucher || 0))
    if (mapping.payment_cl_upperwest) addDetail(detailsPenjualan, mapping.payment_cl_upperwest, 'DEBIT', (resultData.payment_cl_upperwest || 0))

    // Discounts & Fees (Debit)
    addDetail(detailsPenjualan, mapping.discount, 'DEBIT', (resultData.revenue_discount || 0))
    addDetail(detailsPenjualan, ACCURATE_MAPPING.GLOBAL.admin_bank, 'DEBIT', (resultData.biaya_admin_bank || 0))
    addDetail(detailsPenjualan, ACCURATE_MAPPING.GLOBAL.admin_merchant, 'DEBIT', (resultData.biaya_penjualan_merchant_online || 0))

    // CREDITS (Revenues)
    addDetail(detailsPenjualan, mapping.sales_bar, 'KREDIT', (resultData.penjualan_bar || 0))
    addDetail(detailsPenjualan, mapping.sales_beans, 'KREDIT', (resultData.penjualan_coffee_beans || 0))
    addDetail(detailsPenjualan, mapping.sales_kitchen, 'KREDIT', (resultData.penjualan_makanan || 0))
    addDetail(detailsPenjualan, mapping.sales_konsinyasi, 'KREDIT', (resultData.penjualan_konsinyasi || 0))
    addDetail(detailsPenjualan, mapping.sales_bundling, 'KREDIT', (resultData.penjualan_bundling || 0))
    addDetail(detailsPenjualan, mapping.sales_inventory, 'KREDIT', (resultData.penjualan_inventory || 0))
    addDetail(detailsPenjualan, mapping.sales_modifier, 'KREDIT', (resultData.penjualan_modifier || 0))
    addDetail(detailsPenjualan, mapping.sales_konsinyasi_no_brand, 'KREDIT', (resultData.penjualan_konsinyasi_no_brand || 0))
    addDetail(detailsPenjualan, mapping.service_charge, 'KREDIT', (resultData.hutang_service || 0))
    addDetail(detailsPenjualan, mapping.tax, 'KREDIT', (resultData.hutang_pajak_pemkot || 0))

    // ─── JOURNAL 2: UANG MASUK PENJUALAN CAFE ────────────────────────────────
    const detailsUangMasuk: any[] = []
    
    // DEBIT: Settlement BCA (SUM everything including cash)
    const totalSemua = (resultData.total_payment_quinos || 0)
    addDetail(detailsUangMasuk, mapping.settlement_bca, 'DEBIT', totalSemua)
    
    // KREDIT: Original accounts (Cash follows mapping code for Credit)
    addDetail(detailsUangMasuk, mapping.payment_cash, 'KREDIT', (resultData.payment_cash || 0))
    addDetail(detailsUangMasuk, mapping.payment_credit_bca, 'KREDIT', (resultData.payment_credit_bca || 0))
    addDetail(detailsUangMasuk, mapping.payment_debit_bca, 'KREDIT', (resultData.payment_debit_bca || 0))
    addDetail(detailsUangMasuk, mapping.payment_qris, 'KREDIT', (resultData.payment_qris || 0))
    addDetail(detailsUangMasuk, mapping.payment_gobiz, 'KREDIT', (resultData.payment_gobiz || 0))
    addDetail(detailsUangMasuk, mapping.payment_ovo, 'KREDIT', (resultData.payment_ovo || 0))
    addDetail(detailsUangMasuk, mapping.payment_transfer, 'KREDIT', (resultData.payment_transfer || 0))

    // POST to Accurate
    const postJournal = async (memo: string, details: any[]) => {
      // Check Balance
      const debits = details.filter(d => d.amountType === 'DEBIT').reduce((s, d) => s + d.amount, 0)
      const credits = details.filter(d => d.amountType === 'KREDIT').reduce((s, d) => s + d.amount, 0)
      
      // Handle slight floating point issues
      if (Math.abs(debits - credits) > 1) {
        throw new Error(`Jurnal "${memo}" tidak seimbang! (Debit: ${debits}, Kredit: ${credits})`)
      }

      return axios.post(`${host}/api/journal-voucher/save.do`, {
        transDate: accurateDate,
        description: memo,
        detailJournalVoucher: details
      }, {
        headers: { 
          'Authorization': `Bearer ${accessToken}`,
          'X-Session-ID': sessionId
        }
      })
    }

    const memoPenjualan = `Penjualan cafe ${resultData.store_name} tanggal ${accurateDate}`
    const memoUangMasuk = `Uang masuk penjualan cafe ${resultData.store_name} tanggal ${accurateDate}`

    const res1 = await postJournal(memoPenjualan, detailsPenjualan)
    if (!res1.data.s) throw new Error(`Gagal kirim Jurnal Penjualan: ${res1.data.d}`)

    const res2 = await postJournal(memoUangMasuk, detailsUangMasuk)
    if (!res2.data.s) throw new Error(`Gagal kirim Jurnal Uang Masuk: ${res2.data.d}`)

    return NextResponse.json({ 
      success: true, 
      message: 'Kedua Jurnal (Penjualan & Uang Masuk) berhasil dikirim ke Accurate!',
      journal1: res1.data.d,
      journal2: res2.data.d
    })

  } catch (error: any) {
    console.error('Submit Accurate Error:', error.response?.data || error.message)
    const errorMsg = error.response?.data?.d || error.message
    return NextResponse.json({ success: false, message: errorMsg }, { status: 500 })
  }
}
