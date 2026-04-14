import axios from 'axios'
import * as querystring from 'querystring'

export interface QuinosRevenueData {
  store_name: string
  transaction_date: string
  penjualan_bar: number
  penjualan_coffee_beans: number
  penjualan_makanan: number
  penjualan_konsinyasi: number
  penjualan_bundling: number
  penjualan_inventory: number
  penjualan_modifier: number
  penjualan_konsinyasi_no_brand: number
  payment_academy_100_vouc: number
  payment_academy_50_vouch: number
  payment_go_dine_in_vou: number
  payment_cl_upperwest: number
  payment_strada_gift_vou: number
  payment_voucher_ckt_50_0: number
  payment_voucher_florist: number
  payment_voucher_harris_p: number
  payment_voucher_justyoga: number
  payment_voucher_padel_sp: number
  payment_voucher_smkg: number
  payment_voucher_timezone: number
  payment_voucher_workshop: number
  payment_voucher_50_smb: number
  payment_bsd_workshop_vou: number
  payment_voucher_bogo: number
  payment_voucher_chope: number
  payment_voucher_telkomsel: number
  payment_workshop_sms_voucher: number
  payment_credit_bca: number
  payment_debit_bca: number
  payment_gobiz: number
  payment_qris: number
  payment_strada_reward: number
  payment_ovo: number
  payment_transfer: number
  payment_cash: number
  revenue_discount: number
  hutang_service: number
  hutang_pajak_pemkot: number
}

export async function createQuinosSession(): Promise<string[]> {
  const axiosInstance = axios.create({
    maxRedirects: 0,
    validateStatus: status => status >= 200 && status < 400
  })

  let cookies: string[] = []

  const updateCookies = (setCookieHeaders: string[] | undefined) => {
    if (!setCookieHeaders) return
    setCookieHeaders.forEach(c => {
      const cookieVal = c.split(';')[0]
      const key = cookieVal.split('=')[0]
      cookies = cookies.filter(existing => !existing.startsWith(key + '='))
      cookies.push(cookieVal)
    })
  }

  try {
    const initRes = await axiosInstance.get('https://quinoscloud.com/cloud/login')
    updateCookies(initRes.headers['set-cookie'])
  } catch (e: any) {
    throw new Error(`Gagal inisialisasi session: ${e.message}`)
  }

  try {
    const loginData = querystring.stringify({
      'data[Staff][email]': 'kopiterbaiknusantara1@gmail.com',
      'data[Staff][password]': 'strada123'
    })

    const loginRes = await axiosInstance.post('https://quinoscloud.com/cloud/staffs/login', loginData, {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Cookie': cookies.join('; '),
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'
      }
    })
    updateCookies(loginRes.headers['set-cookie'])
  } catch (e: any) {
    if (e.response?.status === 302) {
      updateCookies(e.response.headers['set-cookie'])
    } else {
      throw new Error(`Gagal login ke Quinos: ${e.message}`)
    }
  }

  return cookies
}

export async function fetchQuinosRevenue(date: string, store: string, onProgress?: (msg: string, type?: string) => void, existingCookies?: string[], onRawPayments?: (payments: Array<{code: string, amount: number}>) => void): Promise<QuinosRevenueData> {
  const log = (msg: string, type: string = 'info') => {
    if (onProgress) onProgress(msg, type)
  }

  const axiosInstance = axios.create({
    maxRedirects: 0,
    validateStatus: status => status >= 200 && status < 400
  })

  let cookies: string[] = []

  const updateCookies = (setCookieHeaders: string[] | undefined) => {
    if (!setCookieHeaders) return
    setCookieHeaders.forEach(c => {
      const cookieVal = c.split(';')[0]
      const key = cookieVal.split('=')[0]
      cookies = cookies.filter(existing => !existing.startsWith(key + '='))
      cookies.push(cookieVal)
    })
  }

  if (existingCookies && existingCookies.length > 0) {
    cookies = [...existingCookies]
  } else {
    log('⏳ [10%] Inisialisasi koneksi ke Quinos Cloud...')

    try {
      const initRes = await axiosInstance.get('https://quinoscloud.com/cloud/login')
      updateCookies(initRes.headers['set-cookie'])
    } catch (e: any) {
      throw new Error(`Gagal inisialisasi session: ${e.message}`)
    }

    log('⏳ [20%] Melakukan login otomatis...')

    try {
      const loginData = querystring.stringify({
        'data[Staff][email]': 'kopiterbaiknusantara1@gmail.com',
        'data[Staff][password]': 'strada123'
      })

      const loginRes = await axiosInstance.post('https://quinoscloud.com/cloud/staffs/login', loginData, {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Cookie': cookies.join('; '),
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'
        }
      })
      updateCookies(loginRes.headers['set-cookie'])
      log('✅ [30%] Login berhasil! Akses diterima.', 'success')
    } catch (e: any) {
      if (e.response?.status === 302) {
          updateCookies(e.response.headers['set-cookie'])
          log('✅ [30%] Login berhasil (redirect)! Akses diterima.', 'success')
      } else {
          throw new Error(`Gagal login ke Quinos: ${e.message}`)
      }
    }
  }

  const cookieStr = cookies.join('; ')
  const baseUrl = 'https://quinoscloud.com/cloud/reports'
  
  // Format date for Quinos URL: YYYY-M-D (no leading zeros)
  const [year, month, day] = date.split('-').map(s => parseInt(s, 10).toString())
  const quinosDate = `${year}-${month}-${day}`

  const sleep = (ms: number) => new Promise(r => setTimeout(r, ms))

  const fetchEndpoint = async (endpoint: string) => {
    const url = `${baseUrl}/${endpoint}/${quinosDate}/${quinosDate}/${store}`
    const maxRetries = 5
    let lastError: Error = new Error('Unknown error')

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const res = await axiosInstance.get(url, {
          headers: {
            'Cookie': cookieStr,
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'
          },
          timeout: 30000
        })
        // Detect session expiry: Quinos redirects to login page (HTML response)
        if (typeof res.data === 'string' && res.data.includes('<form') && res.data.toLowerCase().includes('login')) {
          throw new Error(`SESSION_EXPIRED: Quinos session expired untuk ${endpoint}`)
        }
        return res.data
      } catch (e: any) {
        // Don't retry on session expiry — caller handles it
        if (e.message?.startsWith('SESSION_EXPIRED')) throw e

        const status = e.response?.status
        const body = e.response?.data ? JSON.stringify(e.response.data).slice(0, 200) : ''
        lastError = new Error(`Quinos ${endpoint} gagal (HTTP ${status ?? 'no-response'}): ${e.message}${body ? ' | ' + body : ''}`)

        if (attempt < maxRetries) {
          const delay = Math.pow(2, attempt) * 2000 // 4s, 8s, 16s, 32s
          log(`     ⏳ Retry ${attempt}/${maxRetries - 1} untuk ${endpoint} — tunggu ${delay / 1000}s...`)
          await sleep(delay)
        }
      }
    }

    throw lastError
  }

  log(`⏳ [40%] Menarik ringkasan transaksi untuk ${store} pada ${date}...`)
  const transaction = await fetchEndpoint('getTransactionSummaryReport')
  const transObj = transaction[0]?.Transaction || {}
  
  log(`⏳ [60%] Menarik rincian pembayaran...`)
  const payment = await fetchEndpoint('getPaymentSummaryReport')
  
  log(`⏳ [80%] Menarik rincian penjualan departemen...`)
  const itemSales = await fetchEndpoint('getItemSalesReport3')

  log('⏳ [90%] Memproses dan menjumlahkan data...')

  const deptTotals: Record<string, number> = {}
  if (Array.isArray(itemSales)) {
    itemSales.forEach((item: any) => {
      const dept = item.TransactionLine?.department_code || 'Unknown'
      const revenue = parseFloat(item.TransactionLine?.revenue) || 0
      deptTotals[dept] = (deptTotals[dept] || 0) + revenue
    })
  }

  // Track all matched payment codes so we can detect unmatched ones
  const matchedPaymentCodes = new Set<string>()

  // Sum all rows matching any of the given codes (case-insensitive)
  const findPayment = (...codes: string[]) => {
    if (!Array.isArray(payment)) return 0
    const upperCodes = codes.map(c => c.toUpperCase())
    return payment.reduce((sum: number, p: any) => {
      const code = p.TransactionLine?.payment_code?.trim().toUpperCase() || ''
      if (upperCodes.includes(code)) {
        matchedPaymentCodes.add(code)
        sum += parseFloat(p.TransactionLine?.amount) || 0
      }
      return sum
    }, 0)
  }

  const result: QuinosRevenueData = {
    store_name: store,
    transaction_date: date,
    penjualan_bar: (deptTotals['Bar'] || 0) + (deptTotals['Coffee Experience'] || 0),
    penjualan_coffee_beans: deptTotals['Coffee Beans'] || 0,
    penjualan_makanan: deptTotals['Kitchen'] || 0,
    penjualan_konsinyasi: (deptTotals['Konsinyasi'] || 0) + (deptTotals['Konsiyasi No Brand'] || 0),
    penjualan_bundling: (deptTotals['Bundling Kitchen and Bar'] || 0) + (deptTotals['PROMO'] || 0),
    penjualan_inventory: deptTotals['Inventory'] || 0,
    penjualan_modifier: deptTotals['Modifier'] || 0,
    penjualan_konsinyasi_no_brand: 0, // merged into penjualan_konsinyasi
    payment_academy_100_vouc: findPayment('Academy 100 Vouc'),
    payment_academy_50_vouch: findPayment('Academy 50 Vouch'),
    payment_go_dine_in_vou: findPayment('Go Dine In Vou'),
    payment_cl_upperwest: findPayment('CL UPPERWEST'),
    payment_strada_gift_vou: findPayment('Strada+ Gift Vou'),
    payment_voucher_ckt_50_0: findPayment('Voucher CKT 50.0'),
    payment_voucher_florist: findPayment('Voucher Florist', 'Voucher Floris', 'Vou Florist'),
    payment_voucher_harris_p: findPayment('Voucher Harris P'),
    payment_voucher_justyoga: findPayment('Voucher JustYoga'),
    payment_voucher_padel_sp: findPayment('Voucher Padel Sp'),
    payment_voucher_smkg: findPayment('Voucher SMKG'),
    payment_voucher_timezone: findPayment('Voucher Timezone'),
    payment_voucher_workshop: findPayment('Voucher Workshop'),
    payment_voucher_50_smb: findPayment('Voucher 50 SMB'),
    payment_bsd_workshop_vou: findPayment('BSD Workshop Vou'),
    payment_voucher_bogo: findPayment('Voucher Bogo'),
    payment_voucher_chope: findPayment('Voucher Chope'),
    payment_voucher_telkomsel: findPayment('Voucher Telkomsel'),
    payment_workshop_sms_voucher: findPayment('Workshop SMS Voucher', 'Workshop SMS Vou'),
    payment_credit_bca: findPayment('CREDIT BCA'),
    payment_debit_bca: findPayment('DEBIT BCA', 'DEBIT'), // 'DEBIT' is an alias for DEBIT BCA in Quinos
    payment_gobiz: findPayment('GOBIZ'),
    payment_qris: findPayment('QRIS'),
    payment_strada_reward: findPayment('STRADA + REWARD'),
    payment_ovo: findPayment('OVO'),
    payment_transfer: findPayment('TRANSFER'),
    payment_cash: findPayment('CASH'),
    revenue_discount: parseFloat(transObj.discount) || 0,
    hutang_service: parseFloat(transObj.service_charge) || 0,
    hutang_pajak_pemkot: parseFloat(transObj.tax) || 0
  }

  // Pass raw payment codes to caller for debugging
  if (onRawPayments && Array.isArray(payment)) {
    const raw = payment
      .map((p: any) => ({
        code: p.TransactionLine?.payment_code?.trim() || '',
        amount: parseFloat(p.TransactionLine?.amount) || 0
      }))
      .filter(p => p.code && p.amount > 0)
    onRawPayments(raw)
  }

  log('✅ [100%] Data berhasil diekstrak sepenuhnya!', 'success')
  return result
}
