from bs4 import BeautifulSoup

with open('dump_0409.html', 'r') as f:
    soup = BeautifulSoup(f, 'html.parser')

print("Looking for 'Bar' row data in dump_0409.html")

rows = soup.find_all('tr')
for row in rows:
    cells = row.find_all(['td', 'th'])
    if cells:
        first_cell_text = cells[0].text.strip().lower()
        if "bar" in first_cell_text or "sales" in first_cell_text:
            print(f"Match '{first_cell_text}': {[c.text.strip() for c in cells]}")

