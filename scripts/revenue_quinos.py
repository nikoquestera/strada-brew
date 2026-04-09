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
            log_progress("Membuka browser chrome (mode terlihat)...", "info")
            browser = p.chromium.launch(headless=False)
            context = browser.new_context(viewport={"width": 1280, "height": 800})
            page = context.new_page()
            
            # 1. Login to Quinos Cloud
            log_progress("Tahap 1: Membuka halaman login Quinos Cloud di https://quinoscloud.com/cloud/login", "info")
            page.goto("https://quinoscloud.com/cloud/login", timeout=60000)
            
            log_progress("Mengisi email: kopiterbaiknusantara1@gmail.com dan password...", "info")
            page.wait_for_selector('input[type="email"], input[name="email"], input[placeholder*="email" i]', timeout=15000)
            email_input = page.locator('input[type="email"], input[name="email"], input[placeholder*="email" i]').first
            email_input.fill("kopiterbaiknusantara1@gmail.com")
            
            password_input = page.locator('input[type="password"], input[name="password"], input[placeholder*="password" i]').first
            password_input.fill("strada123")
            
            log_progress("Mengeklik tombol Login...", "info")
            login_btn = page.locator('button:has-text("Login"), button:has-text("Sign In"), button[type="submit"], input[type="submit"]').first
            login_btn.click()
            
            try:
                page.wait_for_url("**/admin**", timeout=20000)
                log_progress("✅ Tahap 1 Selesai: Berhasil login ke Quinos Cloud", "success")
            except PlaywrightTimeoutError:
                # Kadang dashboard admin butuh waktu loading agak lama
                log_progress("Timeout menunggu URL berubah ke admin, mencoba melanjutkan proses...", "warning")
            
            # 2. Go to Summary Sales Report
            log_progress("Tahap 2: Membuka URL Summary Sales Report (https://quinoscloud.com/cloud/admin#/report/summarySalesReport)", "info")
            page.goto("https://quinoscloud.com/cloud/admin#/report/summarySalesReport", timeout=30000)
            
            log_progress("Menunggu halaman report termuat...", "info")
            page.wait_for_selector('input, select, .calendar, .datepicker, button', timeout=20000)
            
            # 3. Filtering
            log_progress("Tahap 3: Melakukan Filtering Data", "info")
            
            # Select Daily
            log_progress("Memilih opsi 'Daily' di kotak dropdown pertama...", "info")
            try:
                # Biasanya dropdown pertama adalah periode waktu
                period_dropdown = page.locator('select, input.el-select__inner, div.el-select').first
                if period_dropdown.is_visible():
                    # Coba klik kalau bentuknya custom UI
                    period_dropdown.click()
                    time.sleep(1)
                    # Cari opsi Daily dan klik
                    daily_option = page.locator('li:has-text("Daily"), option:has-text("Daily"), span:has-text("Daily")').first
                    if daily_option.is_visible():
                        daily_option.click()
                        log_progress("Berhasil memilih opsi 'Daily'", "success")
                    else:
                        log_progress("Opsi 'Daily' tidak ditemukan di dropdown, asumsikan sudah terpilih secara default", "warning")
            except Exception as e:
                log_progress(f"Gagal memilih 'Daily' di dropdown pertama: {e}", "warning")

            # Date Filter
            log_progress(f"Membuka kalender untuk memilih tanggal {day_str}...", "info")
            try:
                date_input = page.locator('input[placeholder*="Date" i], input.date-picker, input.el-input__inner, input.p-inputtext').first
                if date_input.is_visible():
                    date_input.click()
                    time.sleep(1) # wait for calendar popup animation
                    
                    # Robust selector for the date cell inside a grid container
                    calendar_popup = page.locator('div.el-picker-panel, div.p-datepicker, div[role="dialog"], div[role="application"], body').last
                    
                    day_cell = calendar_popup.locator(
                        f'[role="gridcell"]:not(.is-outside-month):not(.p-disabled):not(.disabled):has-text("{day_str}"), '
                        f'[role="gridcell"][aria-label*="{target_date}"], '
                        f'td.available:not(.prev-month):not(.next-month):has(span:text-is("{day_str}"))'
                    ).first
                    
                    if day_cell.is_visible():
                        day_cell.click()
                        log_progress(f"Berhasil memilih tanggal {target_date} di kalender (grid layout)", "success")
                    else:
                        log_progress("Sel kalender tidak ditemukan. Menggunakan input manual (fallback).", "warning")
                        date_input.fill(target_date)
                        page.keyboard.press("Enter")
            except Exception as e:
                log_progress(f"Gagal mengatur tanggal kalender: {e}", "error")

            # Store Filter
            log_progress(f"Memilih toko '{store_name}'...", "info")
            try:
                # Cari input yang biasa untuk milih outlet/toko
                store_input = page.locator('input[placeholder*="Store" i], input[placeholder*="Outlet" i], div.el-select:has-text("Outlet")').first
                if store_input.is_visible():
                    store_input.click()
                    time.sleep(1)
                    store_option = page.locator(f'li:has-text("{store_name}"), span:has-text("{store_name}")').first
                    if store_option.is_visible():
                        store_option.click()
                        log_progress(f"Berhasil memilih toko '{store_name}'", "success")
                    else:
                        # Fallback input
                        store_input.fill(store_name)
                        page.keyboard.press("Enter")
                        log_progress(f"Mengisi manual toko '{store_name}'", "info")
            except Exception as e:
                log_progress(f"Gagal mengatur filter toko: {e}", "warning")

            log_progress("Mengeklik tombol Generate Report...", "info")
            try:
                generate_btn = page.locator('button:has-text("Generate"), button:has-text("Submit"), button:has-text("Search"), button:has-text("Process")').first
                generate_btn.click()
                log_progress("Permintaan Generate dikirim, menunggu loading data...", "info")
                time.sleep(8) # Memberikan waktu agar network / DOM update report secara penuh
            except Exception as e:
                log_progress(f"Gagal klik tombol Generate: {e}", "error")

            # 4. Parsing data
            log_progress("Tahap 4: Mengekstrak angka penjualan dan department dari laporan yang di-generate...", "info")
            
            def get_value(label):
                try:
                    val_str = page.evaluate(f'''() => {{
                        const elements = Array.from(document.querySelectorAll('td, th, span, div, p'));
                        const match = elements.find(el => el.textContent.trim().toLowerCase() === '{label.lower()}' || el.textContent.trim().toLowerCase().includes('{label.lower()}'));
                        if (!match) return '0';
                        
                        // Check table context
                        const td = match.closest('td') || match.closest('th');
                        if (td) {{
                            const row = td.closest('tr');
                            if (row) {{
                                const cells = Array.from(row.querySelectorAll('td, th'));
                                const idx = cells.indexOf(td);
                                if (idx >= 0 && idx + 1 < cells.length) {{
                                    return cells[idx+1].textContent;
                                }}
                            }}
                        }}
                        
                        let next = match.nextElementSibling;
                        if (next) return next.textContent;
                        
                        if (match.parentElement && match.parentElement.nextElementSibling) {{
                            return match.parentElement.nextElementSibling.textContent;
                        }}
                        return '0';
                    }}''')
                    
                    val_str = str(val_str)
                    cleaned = ''.join(c for c in val_str if c.isdigit() or c == '.' or c == '-')
                    return float(cleaned) if cleaned and cleaned != '-' else 0.0
                except:
                    return 0.0

            data = {
                "store_name": store_name,
                "transaction_date": target_date,
                "penjualan_bar": get_value("Bar") or get_value("Penjualan Bar"),
                "penjualan_coffee_beans": get_value("Coffee Beans") or get_value("Beans"),
                "penjualan_makanan": get_value("Kitchen") or get_value("Makanan"),
                "penjualan_konsinyasi": get_value("Konsinyasi") or get_value("Penjualan Konsinyasi"),
                "potongan_penjualan": get_value("Potongan"),
                "diskon_penjualan": get_value("Diskon"),
                "piutang_usaha": get_value("Piutang Usaha") or get_value("A/R") or get_value("AR"),
                "piutang_usaha_gobiz": get_value("Gobiz") or get_value("Go-biz"),
                "hutang_service": get_value("Hutang Service") or get_value("Service Charge") or get_value("SC"),
                "hutang_pajak_pemkot": get_value("Pajak") or get_value("PB1") or get_value("Pemkot")
            }

            # 5. Print results to display logging
            log_progress("Tahap 5: Berhasil parsing angka penjualan:", "success")
            log_progress(f"» Penjualan Bar: Rp {data['penjualan_bar']:,.0f}", "info")
            log_progress(f"» Penjualan Coffee Beans: Rp {data['penjualan_coffee_beans']:,.0f}", "info")
            log_progress(f"» Penjualan Makanan: Rp {data['penjualan_makanan']:,.0f}", "info")
            log_progress(f"» Penjualan Konsinyasi: Rp {data['penjualan_konsinyasi']:,.0f}", "info")
            log_progress(f"» Potongan Penjualan: Rp {data['potongan_penjualan']:,.0f}", "info")
            log_progress(f"» Diskon Penjualan: Rp {data['diskon_penjualan']:,.0f}", "info")
            log_progress(f"» Piutang Usaha: Rp {data['piutang_usaha']:,.0f}", "info")
            log_progress(f"» Piutang Usaha Gobiz: Rp {data['piutang_usaha_gobiz']:,.0f}", "info")
            log_progress(f"» Hutang Service: Rp {data['hutang_service']:,.0f}", "info")
            log_progress(f"» Hutang Pajak Pemkot: Rp {data['hutang_pajak_pemkot']:,.0f}", "info")
            
            # Send final structured result to node process
            print(json.dumps({"type": "result", "data": data}), flush=True)

        except PlaywrightTimeoutError as e:
            log_progress(f"Tahap Error (Timeout): Halaman atau elemen tidak merespon di Quinos Cloud ({str(e)})", "error")
            sys.exit(1)
        except Exception as e:
            log_progress(f"Terjadi error yang tidak terduga saat mengeksekusi automation: {str(e)}", "error")
            sys.exit(1)
        finally:
            log_progress("Semua operasi UI automation selesai. Menutup browser...", "info")
            if 'browser' in locals():
                browser.close()

if __name__ == "__main__":
    main()
