import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { journal_voucher } from '@/lib/accurate'

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

    // --- PENDING MAPPING INFORMATION FROM USER ---
    // We have two Journal Vouchers to create:
    // 1. Uang Masuk Penjualan Cafe
    // 2. Penjualan Cafe
    //
    // The exact account codes (accountNo) for each component are currently unknown.
    // I am setting up the structure with placeholders.

    /*
    Example Structure for "Penjualan Cafe" (Sales Recognition):
    DEBIT: Piutang BCA (bca_kredit_income + bca_debit_income + bca_qris_income)
    DEBIT: Piutang Gobiz (gobiz_income)
    DEBIT: Piutang OVO (ovo_income)
    DEBIT: Diskon Penjualan (revenue_discount)
    DEBIT: Biaya Admin Bank (biaya_admin_bank)
    DEBIT: Biaya Merchant Online (biaya_penjualan_merchant_online)
    CREDIT: Pendapatan Bar (penjualan_bar)
    CREDIT: Pendapatan Coffee Beans (penjualan_coffee_beans)
    CREDIT: Pendapatan Kitchen (penjualan_makanan)
    CREDIT: Pendapatan Konsinyasi (penjualan_konsinyasi)
    CREDIT: Hutang Service (hutang_service)
    CREDIT: Hutang Pajak PB1 (hutang_pajak_pemkot)

    Example Structure for "Uang Masuk Penjualan Cafe" (Cash/Bank Receipt):
    DEBIT: Kas/Bank BCA (bca_kredit_income + bca_debit_income + bca_qris_income)
    CREDIT: Piutang BCA (...)
    DEBIT: Kas/Bank Gobiz (gobiz_income)
    CREDIT: Piutang Gobiz (...)
    */

    // Format transaction_date from YYYY-MM-DD to DD/MM/YYYY for Accurate API
    const dateParts = resultData.transaction_date.split('-')
    const accurateDate = `${dateParts[2]}/${dateParts[1]}/${dateParts[0]}`

    // TODO: Send to Accurate using the library
    /*
    const response = await journal_voucher.save({
      transDate: accurateDate,
      description: `Penjualan Cafe - ${resultData.store_name}`,
      detailJournalVoucher: [
        {
          accountNo: 'TODO_ACCOUNT_PIUTANG_BCA',
          amountType: 'DEBIT',
          amount: resultData.bca_kredit_income + resultData.bca_debit_income + resultData.bca_qris_income,
          departmentName: resultData.store_name // Optional, if mapped to departments
        },
        // ... other details
      ]
    })
    */

    // For now, we return a success response to simulate the UI working,
    // but in reality we need the account mappings first.
    return NextResponse.json({ 
      success: true, 
      message: 'Data siap dikirim. Menunggu pemetaan Kode Akun Accurate.',
      data: resultData 
    })

  } catch (error: any) {
    console.error('Submit Accurate Error:', error)
    return NextResponse.json({ success: false, message: error.message }, { status: 500 })
  }
}
