import sys
import json
import time
from playwright.sync_api import sync_playwright, TimeoutError as PlaywrightTimeoutError
from datetime import datetime

def log_progress(msg, log_type="info", data=None):
    out = {"type": log_type, "message": msg}
    if data is not None:
        out["data"] = data
    print(json.dumps(out), flush=True)

def main():
    if len(sys.argv) < 3:
        log_progress("Missing arguments: date and store_name", "error")
        sys.exit(1)
        
    target_date = sys.argv[1] # e.g., '2026-04-10'
    store_name = sys.argv[2]
    
    # parse target_date to get day string for calendar
    try:
        dt = datetime.strptime(target_date, "%Y-%m-%d")
        day_str = str(dt.day)
    except Exception as e:
        log_progress(f"Format tanggal salah: {e}", "error")
        sys.exit(1)
    
    log_progress(f"Memulai proses otomatisasi Quinos Cloud untuk toko '{store_name}' tanggal {target_date}", "info")
    
    with sync_playwright() as p:
        try:
            log_progress("⏳ [0%] Inisialisasi sistem automation...", "info")
            log_progress("Membuka browser di latar belakang (mode tersembunyi)...", "info")
            # Changed to headless=True to run completely in the background
            browser = p.chromium.launch(headless=True)
            context = browser.new_context(viewport={"width": 1280, "height": 800})
            page = context.new_page()
            
            # 1. Login to Quinos Cloud
            log_progress("⏳ [10%] Tahap 1: Membuka halaman login Quinos Cloud (https://quinoscloud.com/cloud/login)...", "info")
            page.goto("https://quinoscloud.com/cloud/login", timeout=60000)
            
            log_progress("⏳ [15%] Mengamankan koneksi & Mengisi kredensial login rahasia...", "info")
            page.wait_for_selector('input[type="email"], input[name="email"], input[placeholder*="email" i], input[type="text"]', timeout=15000)
            email_input = page.locator('input[type="email"], input[name="email"], input[placeholder*="email" i], input[type="text"]').first
            email_input.fill("kopiterbaiknusantara1@gmail.com")
            
            password_input = page.locator('input[type="password"], input[name="password"], input[placeholder*="password" i]').first
            password_input.fill("strada123")
            
            log_progress("⏳ [20%] Meminta akses masuk ke server Quinos...", "info")
            login_btn = page.locator('button:has-text("Login"), button:has-text("Sign In"), button:has-text("Sign in"), button[type="submit"], input[type="submit"], button.btn-primary').first
            login_btn.click()
            
            try:
                page.wait_for_url("**/admin**", timeout=20000)
                log_progress("✅ [25%] Tahap 1 Selesai: Berhasil login ke Quinos Cloud! Akses disetujui.", "success")
            except PlaywrightTimeoutError:
                log_progress("⚠️ Server Quinos merespon lambat, mencoba melanjutkan proses secara paksa...", "warning")
            
            # 2. Go to Summary Sales Report
            log_progress("⏳ [30%] Tahap 2: Menavigasi ke menu 'Summary Sales Report'...", "info")
            page.goto("https://quinoscloud.com/cloud/admin#/report/summarySalesReport", timeout=30000)
            
            log_progress("⏳ [35%] Menunggu halaman report selesai memuat semua komponen visualnya (Estimasi: 10 detik)...", "info")
            for i in range(1, 6):
                time.sleep(2)
                log_progress(f"   Memuat... {i*20}% selesai", "info")
            
            # 3. Filtering
            log_progress("⏳ [45%] Tahap 3: Melakukan Filtering Data Laporan...", "info")
            
            # Select Daily
            log_progress("⏳ [50%] Mengubah periode laporan dari 'Monthly' menjadi 'Daily'...", "info")
            try:
                period_dropdown = page.locator('select').first
                if period_dropdown.is_visible():
                    period_dropdown.select_option(label="Daily")
                    log_progress("✅ Berhasil mengatur laporan ke mode harian (Daily).", "success")
                    time.sleep(1)
                else:
                    dropdowns = page.locator('.el-select, .p-dropdown').all()
                    if dropdowns:
                        dropdowns[0].click()
                        time.sleep(1)
                        daily_option = page.locator('li:has-text("Daily"), option:has-text("Daily"), span:has-text("Daily")').first
                        if daily_option.is_visible():
                            daily_option.click()
                            log_progress("✅ Berhasil mengatur laporan ke mode harian (Daily).", "success")
                        else:
                            log_progress("⚠️ Opsi 'Daily' tidak ditemukan, mungkin web sudah berada di mode Daily.", "warning")
                            page.keyboard.press("Escape")
            except Exception as e:
                log_progress(f"⚠️ Gagal mengubah dropdown periode: {e}", "warning")

            # Date Filter (2 boxes)
            log_progress(f"⏳ [55%] Mencari kolom kalender untuk mengatur rentang tanggal ke {target_date}...", "info")
            try:
                date_inputs = page.locator('input.hasDatepicker').all()
                date_inputs_to_click = [inp for inp in date_inputs if inp.is_visible()]
                
                if len(date_inputs_to_click) < 2:
                    date_inputs = page.locator('input[ng-model="parameter.from"], input[ng-model="parameter.to"]').all()
                    date_inputs_to_click = [inp for inp in date_inputs if inp.is_visible()]
                
                for i, date_input in enumerate(date_inputs_to_click[:2]):
                    box_name = "Start Date (Dari)" if i == 0 else "End Date (Sampai)"
                    log_progress(f"⏳ [60%] Membuka kalender {box_name}...", "info")
                    date_input.click()
                    time.sleep(1)
                    
                    calendar_popup = page.locator('#ui-datepicker-div, div.ui-datepicker, div.el-picker-panel').last
                    
                    day_cell = calendar_popup.locator(
                        f'td:not(.ui-datepicker-unselectable) a:text-is("{day_str}"), '
                        f'td.available:not(.prev-month):not(.next-month):has(span:text-is("{day_str}"))'
                    ).first
                    
                    if day_cell.is_visible():
                        day_cell.click()
                        log_progress(f"✅ Berhasil memilih tanggal {target_date} di kotak {box_name}.", "success")
                    else:
                        log_progress(f"⚠️ Angka tanggal di {box_name} tidak terlihat, mencoba mengetik secara manual...", "warning")
                        date_input.fill(target_date)
                        page.keyboard.press("Enter")
                        
                    time.sleep(1)
            except Exception as e:
                log_progress(f"❌ Gagal mengatur tanggal kalender: {e}", "error")

            # Store Filter
            log_progress(f"⏳ [70%] Mencari pengaturan outlet untuk difilter ke toko '{store_name}'...", "info")
            try:
                selects = page.locator('select').all()
                if len(selects) > 1 and selects[1].is_visible():
                    try:
                        selects[1].select_option(label=store_name)
                        log_progress(f"✅ Outlet '{store_name}' berhasil dipilih.", "success")
                        time.sleep(1)
                    except:
                        selects[1].select_option(value=store_name)
                        log_progress(f"✅ Outlet '{store_name}' berhasil dipilih.", "success")
                        time.sleep(1)
                else:
                    store_dropdown = page.locator('.el-select, select').filter(has_text="All Stores").first
                    if not store_dropdown.is_visible():
                        store_dropdown = page.locator('.el-select:has-text("Store"), select:has-text("Store")').first
                    
                    if store_dropdown.is_visible():
                        store_dropdown.click()
                        time.sleep(1)
                        store_option = page.locator(f'li:has-text("{store_name}"), span:has-text("{store_name}")').first
                        if store_option.is_visible():
                            store_option.click()
                            log_progress(f"✅ Outlet '{store_name}' berhasil dipilih.", "success")
                        else:
                            log_progress(f"⚠️ Toko '{store_name}' tidak ada di daftar instan, mencoba mencari manual...", "info")
                            page.keyboard.type(store_name)
                            page.keyboard.press("Enter")
                    else:
                        log_progress("⚠️ Dropdown All Stores tidak ditemukan.", "warning")
            except Exception as e:
                log_progress(f"⚠️ Gagal mengatur filter toko: {e}", "warning")

            log_progress("⏳ [75%] Memulai kalkulasi data di server Quinos...", "info")
            try:
                generate_btn = page.locator('button:has-text("Generate"), button:has-text("Submit"), button:has-text("Search"), button:has-text("Process")').first
                generate_btn.click()
                log_progress("⏳ [80%] Permintaan Generate dikirim! Menunggu tabel data selesai dirender (Estimasi: 10 detik)...", "info")
                for i in range(1, 6):
                    time.sleep(2)
                    log_progress(f"   Mengambil data... {i*20}% selesai", "info")
            except Exception as e:
                log_progress(f"❌ Gagal menekan tombol Generate: {e}", "error")

            # 4. Parsing data
            log_progress("⏳ [90%] Tahap 4: Membaca dan mengekstrak tabel laporan penjualan secara cerdas...", "info")
            
            def get_value(label):
                try:
                    val_str = page.evaluate(f'''() => {{
                        const rows = Array.from(document.querySelectorAll('tr'));
                        const totalTarget = 'total ' + '{label.lower()}';
                        
                        // First try "Total X"
                        for (let row of rows) {{
                            const cells = Array.from(row.querySelectorAll('td, th'));
                            if (cells.length > 1) {{
                                if (cells[0].textContent.trim().toLowerCase() === totalTarget) {{
                                    return cells[cells.length - 1].textContent.trim();
                                }}
                            }}
                        }}
                        
                        // Then try exact match, keep the one with max columns
                        const exactTarget = '{label.lower()}';
                        let bestMatch = '0';
                        let maxCols = 0;
                        
                        for (let row of rows) {{
                            const cells = Array.from(row.querySelectorAll('td, th'));
                            if (cells.length > 1) {{
                                if (cells[0].textContent.trim().toLowerCase() === exactTarget) {{
                                    if (cells.length >= maxCols) {{
                                        bestMatch = cells[cells.length - 1].textContent.trim();
                                        maxCols = cells.length;
                                    }}
                                }}
                            }}
                        }}
                        return bestMatch;
                    }}''')
                    
                    val_str = str(val_str)
                    cleaned = ''.join(c for c in val_str if c.isdigit() or c == '.' or c == '-')
                    return float(cleaned) if cleaned and cleaned != '-' else 0.0
                except:
                    return 0.0

            log_progress("⏳ [95%] Mengekstrak data dari kategori: Sales per Department, Payment Method, dan Revenue...", "info")
            
            # Sales per Department
            penjualan_bar = get_value("Bar")
            penjualan_coffee_beans = get_value("Coffee Beans")
            penjualan_kitchen = get_value("Kitchen")
            penjualan_konsinyasi = get_value("Konsinyasi")
            
            # Payment Method
            payment_academy = get_value("Academy 100 Vouc")
            payment_credit_bca = get_value("CREDIT BCA")
            payment_debit_bca = get_value("DEBIT BCA")
            payment_gobiz = get_value("GOBIZ")
            payment_qris = get_value("QRIS")
            payment_strada_reward = get_value("STRADA + REWARD")
            
            # Revenue
            revenue_discount = get_value("Discount")

            data = {
                "store_name": store_name,
                "transaction_date": target_date,
                "penjualan_bar": penjualan_bar,
                "penjualan_coffee_beans": penjualan_coffee_beans,
                "penjualan_makanan": penjualan_kitchen,
                "penjualan_konsinyasi": penjualan_konsinyasi,
                "payment_academy_100_vouc": payment_academy,
                "payment_credit_bca": payment_credit_bca,
                "payment_debit_bca": payment_debit_bca,
                "payment_gobiz": payment_gobiz,
                "payment_qris": payment_qris,
                "payment_strada_reward": payment_strada_reward,
                "revenue_discount": revenue_discount
            }

            # 5. Print results to display logging
            log_progress("✅ [100%] Tahap 5: Berhasil memproses angka penjualan. Berikut adalah rincian transaksinya:", "success")
            
            log_progress("--- Sales per Department ---", "info")
            log_progress(f"» Penjualan Bar: Rp {data['penjualan_bar']:,.0f}", "info")
            log_progress(f"» Penjualan Coffee Beans: Rp {data['penjualan_coffee_beans']:,.0f}", "info")
            log_progress(f"» Penjualan Makanan: Rp {data['penjualan_makanan']:,.0f}", "info")
            log_progress(f"» Penjualan Konsinyasi: Rp {data['penjualan_konsinyasi']:,.0f}", "info")
            
            log_progress("--- Payment Method ---", "info")
            log_progress(f"» Academy 100 Vouc: Rp {data['payment_academy_100_vouc']:,.0f}", "info")
            log_progress(f"» CREDIT BCA: Rp {data['payment_credit_bca']:,.0f}", "info")
            log_progress(f"» DEBIT BCA: Rp {data['payment_debit_bca']:,.0f}", "info")
            log_progress(f"» GOBIZ: Rp {data['payment_gobiz']:,.0f}", "info")
            log_progress(f"» QRIS: Rp {data['payment_qris']:,.0f}", "info")
            log_progress(f"» STRADA + REWARD: Rp {data['payment_strada_reward']:,.0f}", "info")
            
            log_progress("--- Revenue ---", "info")
            log_progress(f"» Discount: Rp {data['revenue_discount']:,.0f}", "info")
            
            # Send final structured result to node process
            print(json.dumps({"type": "result", "data": data}), flush=True)

        except PlaywrightTimeoutError as e:
            log_progress(f"❌ Tahap Error (Timeout): Halaman atau elemen tidak merespon di Quinos Cloud ({str(e)})", "error")
            sys.exit(1)
        except Exception as e:
            log_progress(f"❌ Terjadi error yang tidak terduga saat mengeksekusi automation: {str(e)}", "error")
            sys.exit(1)
        finally:
            log_progress("🧹 Semua operasi selesai. Menutup mesin virtual browser...", "info")
            if 'browser' in locals():
                browser.close()

if __name__ == "__main__":
    main()
