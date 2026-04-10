import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { spawn } from 'child_process'
import path from 'path'
import fs from 'fs'

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

    const scriptPath = path.join(process.cwd(), 'scripts', 'revenue_quinos.py')
    const venvPythonPath = path.join(process.cwd(), 'venv', 'bin', 'python')
    const pythonExec = fs.existsSync(venvPythonPath) ? venvPythonPath : 'python3'

    const encoder = new TextEncoder()
    const stream = new ReadableStream({
      async start(controller) {
        for (const store of stores) {
          controller.enqueue(encoder.encode(JSON.stringify({ type: 'info', message: `=== Memulai proses untuk toko: ${store} ===` }) + '\n'))
          
          await new Promise<void>((resolve) => {
            let buffer = ''
            const pythonProcess = spawn(pythonExec, [scriptPath, date, store], {
              cwd: process.cwd(),
              env: { ...process.env, PYTHONUNBUFFERED: '1' }
            })

            pythonProcess.on('error', (err) => {
              controller.enqueue(encoder.encode(JSON.stringify({ type: 'error', message: `Gagal menjalankan skrip Python: ${err.message}` }) + '\n'))
              resolve()
            })

            pythonProcess.stdout.on('data', async (data) => {
              buffer += data.toString()
              const lines = buffer.split('\n')
              buffer = lines.pop() || ''
              
              for (const line of lines) {
                if (!line.trim()) continue
                try {
                  const log = JSON.parse(line)
                  controller.enqueue(encoder.encode(line + '\n'))
                  
                  if (log.type === 'result' && log.data) {
                    controller.enqueue(encoder.encode(JSON.stringify({ type: 'info', message: 'Menyimpan data ke database Supabase...' }) + '\n'))
                    const { error } = await supabase
                      .from('daily_revenue')
                      .upsert({
                        store_name: log.data.store_name,
                        transaction_date: log.data.transaction_date,
                        penjualan_bar: log.data.penjualan_bar,
                        penjualan_coffee_beans: log.data.penjualan_coffee_beans,
                        penjualan_makanan: log.data.penjualan_makanan,
                        penjualan_konsinyasi: log.data.penjualan_konsinyasi,
                        payment_academy_100_vouc: log.data.payment_academy_100_vouc,
                        payment_credit_bca: log.data.payment_credit_bca,
                        payment_debit_bca: log.data.payment_debit_bca,
                        payment_gobiz: log.data.payment_gobiz,
                        payment_qris: log.data.payment_qris,
                        payment_strada_reward: log.data.payment_strada_reward,
                        revenue_discount: log.data.revenue_discount,
                        updated_at: new Date().toISOString()
                      }, { onConflict: 'store_name,transaction_date' })
                      
                    if (error) {
                      controller.enqueue(encoder.encode(JSON.stringify({ type: 'error', message: `Gagal menyimpan ke database: ${error.message}` }) + '\n'))
                    } else {
                      controller.enqueue(encoder.encode(JSON.stringify({ type: 'success', message: '✅ Berhasil menyimpan ke database' }) + '\n'))
                    }
                  }
                } catch (e) {
                  controller.enqueue(encoder.encode(JSON.stringify({ type: 'info', message: line }) + '\n'))
                }
              }
            })

            let errBuffer = ''
            pythonProcess.stderr.on('data', (data) => {
              errBuffer += data.toString()
              const lines = errBuffer.split('\n')
              errBuffer = lines.pop() || ''
              
              for (const line of lines) {
                if (!line.trim()) continue
                controller.enqueue(encoder.encode(JSON.stringify({ type: 'warning', message: line }) + '\n'))
              }
            })

            pythonProcess.on('close', (code) => {
              if (buffer.trim()) {
                controller.enqueue(encoder.encode(JSON.stringify({ type: 'info', message: buffer.trim() }) + '\n'))
              }
              if (errBuffer.trim()) {
                controller.enqueue(encoder.encode(JSON.stringify({ type: 'warning', message: errBuffer.trim() }) + '\n'))
              }
              if (code !== 0) {
                controller.enqueue(encoder.encode(JSON.stringify({ type: 'error', message: `Script exit dengan kode ${code}` }) + '\n'))
              }
              resolve()
            })
          })
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
