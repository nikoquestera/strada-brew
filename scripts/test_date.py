import time
from playwright.sync_api import sync_playwright

def main():
    target_date = "2026-04-09"
    day_str = "9"
    
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=False)
        context = browser.new_context(viewport={"width": 1280, "height": 800})
        page = context.new_page()
        
        page.goto("https://quinoscloud.com/cloud/login", timeout=60000)
        
        email_input = page.locator('input[type="email"], input[name="email"], input[placeholder*="email" i], input[type="text"]').first
        email_input.fill("kopiterbaiknusantara1@gmail.com")
        
        password_input = page.locator('input[type="password"], input[name="password"], input[placeholder*="password" i]').first
        password_input.fill("strada123")
        
        login_btn = page.locator('button:has-text("Login"), button:has-text("Sign In"), button:has-text("Sign in"), button[type="submit"], input[type="submit"], button.btn-primary').first
        login_btn.click()
        page.wait_for_url("**/admin**", timeout=20000)
            
        page.goto("https://quinoscloud.com/cloud/admin#/report/summarySalesReport", timeout=30000)
        time.sleep(5)
        
        page.locator('select').first.select_option(label="Daily")
        time.sleep(1)
        
        date_inputs = page.locator('input.el-input__inner[placeholder*="Date" i], input.p-inputtext, input.date-picker').all()
        date_inputs_to_click = [inp for inp in date_inputs if inp.is_visible()]
        
        print(f"Found {len(date_inputs_to_click)} visible date inputs")
        
        for i, date_input in enumerate(date_inputs_to_click[:2]):
            print(f"Before click, Input {i} value: {date_input.input_value()}")
            date_input.click()
            time.sleep(1)
            
            calendar_popup = page.locator('div.el-picker-panel, div.p-datepicker, div[role="dialog"], div[role="application"], body').last
            day_cell = calendar_popup.locator(
                f'[role="gridcell"]:not(.is-outside-month):not(.p-disabled):not(.disabled):has-text("9"), '
                f'td.available:not(.prev-month):not(.next-month):has(span:text-is("9"))'
            ).first
            
            if day_cell.is_visible():
                print(f"Clicking day cell for Input {i}")
                day_cell.click()
            else:
                print(f"Day cell not visible for Input {i}")
            time.sleep(1)
            print(f"After click, Input {i} value: {date_input.input_value()}")
            
        browser.close()

if __name__ == "__main__":
    main()
