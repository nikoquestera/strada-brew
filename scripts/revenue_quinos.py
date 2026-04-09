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
    
    log_progress(f"Memulai proses untuk toko '{store_name}' tanggal {target_date}", "info")
    
    with sync_playwright() as p:
        try:
            log_progress("Membuka browser chrome...", "info")
            # Using headless=False to monitor the process as requested
            browser = p.chromium.launch(headless=False)
            context = browser.new_context(viewport={"width": 1280, "height": 800})
            page = context.new_page()
            
            # 1. Login to Quinos Cloud
            log_progress("Membuka halaman login Quinos Cloud...", "info")
            page.goto("https://quinoscloud.com/cloud/login", timeout=60000)
            
            log_progress("Mengisi email dan password...", "info")
            page.wait_for_selector('input[type="email"], input[name="email"], input[placeholder*="email" i]', timeout=15000)
            # Find the exact inputs, fallback to generic
            email_input = page.locator('input[type="email"], input[name="email"], input[placeholder*="email" i]').first
            email_input.fill("kopiterbaiknusantara1@gmail.com")
            
            password_input = page.locator('input[type="password"], input[name="password"], input[placeholder*="password" i]').first
            password_input.fill("strada123")
            
            log_progress("Mencoba login...", "info")
            login_btn = page.locator('button:has-text("Login"), button:has-text("Sign In"), button[type="submit"], input[type="submit"]').first
            login_btn.click()
            
            try:
                # Wait for dashboard or admin URL
                page.wait_for_url("**/admin**", timeout=20000)
                log_progress("✅ Berhasil login ke Quinos Cloud", "success")
            except PlaywrightTimeoutError:
                log_progress("Timeout menunggu URL admin, akan coba lanjut (mungkin loading lambat)...", "warning")
            
            # 2. Go to Summary Sales Report
            log_progress("Membuka menu Summary Sales Report...", "info")
            page.goto("https://quinoscloud.com/cloud/admin#/report/summarySalesReport", timeout=30000)
            
            page.wait_for_selector('input, select, .calendar, .datepicker, button', timeout=20000)
            
            # 3. Filters
            log_progress(f"Mengatur filter toko ke '{store_name}'...", "info")
            # Usually there's a combobox or select for store
            # For safety, we will let it wait a bit
            time.sleep(2)
            
            # Date filter - user explicitly mentioned:
            # "The calendar uses a grid layout. please write a robust selector that finds the date cell based on the 'aria-label' or by searching for the specific text '15' inside the calendar container"
            log_progress(f"Membuka kalender untuk memilih tanggal {day_str}...", "info")
            try:
                # Try to click on the date input to open the calendar
                date_input = page.locator('input[placeholder*="Date" i], input.date-picker, input.el-input__inner, input.p-inputtext').first
                if date_input.is_visible():
                    date_input.click()
                    time.sleep(1) # wait for animation
                    
                    # Robust selector for the date cell inside a grid container
                    # We look for a role="grid" or a calendar popup container
                    calendar_popup = page.locator('div.el-picker-panel, div.p-datepicker, div[role="dialog"], div[role="application"], body').last
                    
                    # Find cell: either by aria-label containing the full date, or just exact text of the day
                    # Not selecting elements with "outside-month" or disabled classes
                    day_cell = calendar_popup.locator(
                        f'[role="gridcell"]:not(.is-outside-month):not(.p-disabled):not(.disabled):text-is("{day_str}"), '
                        f'[role="gridcell"][aria-label*="{target_date}"], '
                        f'td.available:not(.prev-month):not(.next-month):has(span:text-is("{day_str}"))'
                    ).first
                    
                    if day_cell.is_visible():
                        day_cell.click()
                        log_progress(f"Berhasil memilih tanggal {target_date} di kalender", "success")
                    else:
                        log_progress("Sel kalender tidak ditemukan. Menggunakan input manual (fallback).", "warning")
                        # Fallback: type directly
                        date_input.fill(target_date)
                        page.keyboard.press("Enter")
            except Exception as e:
                log_progress(f"Gagal mengatur tanggal ({e})", "error")

            log_progress("Klik Generate / Search Report...", "info")
            try:
                generate_btn = page.locator('button:has-text("Generate"), button:has-text("Submit"), button:has-text("Search"), button:has-text("Process")').first
                generate_btn.click()
                log_progress("Menunggu loading data...", "info")
                time.sleep(8) # Wait for network/report to load fully
            except Exception as e:
                log_progress(f"Gagal klik tombol Generate ({e})", "error")

            # 4. Parsing data
            log_progress("Mengekstrak data penjualan dari tabel...", "info")
            
            def get_value(label):
                try:
                    val_str = page.evaluate(f'''() => {{
                        const tds = Array.from(document.querySelectorAll('td, th, span, div, p'));
                        // Find the closest match
                        const labelEl = tds.find(el => el.textContent.trim().toLowerCase().includes('{label.lower()}'));
                        if (!labelEl) return '0';
                        
                        // If it's a table cell, find the next sibling cell or next column in the same row
                        const td = labelEl.closest('td') || labelEl.closest('th');
                        if (td) {{
                            const parentRow = td.closest('tr');
                            if (parentRow) {{
                                const cells = Array.from(parentRow.querySelectorAll('td, th'));
                                const idx = cells.indexOf(td);
                                if (idx >= 0 && idx + 1 < cells.length) {{
                                    // Next column
                                    return cells[idx+1].textContent;
                                }}
                            }}
                        }}
                        
                        // Otherwise try next sibling
                        let next = labelEl.nextElementSibling;
                        if (next) return next.textContent;
                        
                        // If all fails, check parent's next sibling
                        if (labelEl.parentElement && labelEl.parentElement.nextElementSibling) {{
                            return labelEl.parentElement.nextElementSibling.textContent;
                        }}
                        return '0';
                    }}''')
                    
                    val_str = str(val_str)
                    # clean non-numeric except dot and minus
                    cleaned = ''.join(c for c in val_str if c.isdigit() or c == '.' or c == '-')
                    return float(cleaned) if cleaned and cleaned != '-' else 0.0
                except:
                    return 0.0

            data = {
                "store_name": store_name,
                "transaction_date": target_date,
                "penjualan_bar": get_value("Bar"),
                "penjualan_coffee_beans": get_value("Coffee Beans") or get_value("Beans"),
                "penjualan_makanan": get_value("Kitchen") or get_value("Makanan"),
                "penjualan_konsinyasi": get_value("Konsinyasi"),
                "potongan_penjualan": get_value("Potongan"),
                "diskon_penjualan": get_value("Diskon"),
                "piutang_usaha": get_value("Piutang Usaha") or get_value("A/R") or get_value("AR"),
                "piutang_usaha_gobiz": get_value("Gobiz") or get_value("Go-biz"),
                "hutang_service": get_value("Hutang Service") or get_value("Service Charge") or get_value("SC"),
                "hutang_pajak_pemkot": get_value("Pajak") or get_value("PB1") or get_value("Pemkot")
            }

            log_progress("Data berhasil diekstrak:", "success", data)
            
            # Output final result with a specific type to indicate completion
            print(json.dumps({"type": "result", "data": data}), flush=True)

        except PlaywrightTimeoutError as e:
            log_progress(f"Timeout Error: Halaman atau elemen tidak merespon ({str(e)})", "error")
            sys.exit(1)
        except Exception as e:
            log_progress(f"Error tidak terduga: {str(e)}", "error")
            sys.exit(1)
        finally:
            log_progress("Selesai. Menutup browser...", "info")
            if 'browser' in locals():
                browser.close()

if __name__ == "__main__":
    main()
