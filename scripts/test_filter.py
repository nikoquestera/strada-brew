import time
from playwright.sync_api import sync_playwright

def main():
    target_date = "2026-04-09"
    store_name = "LA.PIAZZA"
    
    print("Testing Quinos Cloud Dropdown & Filtering")
    
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=False)
        context = browser.new_context(viewport={"width": 1280, "height": 800})
        page = context.new_page()
        
        print("Login...")
        page.goto("https://quinoscloud.com/cloud/login", timeout=60000)
        
        page.wait_for_selector('input[type="email"], input[name="email"], input[placeholder*="email" i], input[type="text"]', timeout=15000)
        email_input = page.locator('input[type="email"], input[name="email"], input[placeholder*="email" i], input[type="text"]').first
        email_input.fill("kopiterbaiknusantara1@gmail.com")
        
        password_input = page.locator('input[type="password"], input[name="password"], input[placeholder*="password" i]').first
        password_input.fill("strada123")
        
        login_btn = page.locator('button:has-text("Login"), button:has-text("Sign In"), button:has-text("Sign in"), button[type="submit"], input[type="submit"], button.btn-primary').first
        login_btn.click()
        
        try:
            page.wait_for_url("**/admin**", timeout=20000)
            print("Login successful")
        except:
            print("Timeout waiting for admin url")
            
        print("Goto Summary Sales Report")
        page.goto("https://quinoscloud.com/cloud/admin#/report/summarySalesReport", timeout=30000)
        time.sleep(10)
        
        print("Finding dropdowns...")
        # Dump HTML to inspect
        html = page.content()
        with open("page_dump.html", "w") as f:
            f.write(html)
            
        print("Trying to click Monthly dropdown...")
        try:
            # First, looking for a select element that contains Monthly or Daily
            # Usually Quinos uses Angular/Vue. If it's a native <select>:
            native_select = page.locator('select').first
            if native_select.is_visible():
                print(f"Found native select: {native_select.inner_text()}")
                # If it's native, we might just select by value
                # We can do native_select.select_option(label="Daily")
                native_select.select_option(label="Daily")
                print("Selected Daily via native select")
            else:
                print("No visible native select found. Looking for custom dropdown...")
                # It might be a custom dropdown like .el-select or .dropdown
                dropdown_trigger = page.locator('text="Monthly", text="Monthly ", .el-select, .dropdown-toggle').first
                if dropdown_trigger.is_visible():
                    dropdown_trigger.click()
                    time.sleep(1)
                    
                    daily_option = page.locator('text="Daily"').first
                    if daily_option.is_visible():
                        daily_option.click()
                        print("Clicked Daily option")
                    else:
                        print("Daily option not visible")
                else:
                    print("Dropdown trigger not visible")
        except Exception as e:
            print(f"Error selecting Daily: {e}")
            
        time.sleep(3)
        
        print("Checking date inputs...")
        inputs = page.locator('input[type="text"], input.date-picker, input.el-input__inner').all()
        for i, inp in enumerate(inputs):
            if inp.is_visible():
                print(f"Visible Input {i}: placeholder={inp.get_attribute('placeholder')}, value={inp.input_value()}")
                
        browser.close()

if __name__ == "__main__":
    main()
