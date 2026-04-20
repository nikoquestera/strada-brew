#!/usr/bin/env python3
"""
submit_mkg_journals.py — Submit MKG PENJUALAN CAFE & UANG MASUK journals to Accurate Online.

Reads from: audit/MASS INPUT FINANCE - MASTER ENTER-NON QUINOS.csv
Credentials: auto-loaded from .env.local (Supabase → accurate_tokens table)

Usage:
  python scripts/submit_mkg_journals.py --reauth               # First time / reconnect
  python scripts/submit_mkg_journals.py --date 2025-01-01
  python scripts/submit_mkg_journals.py --from 2025-01-01 --to 2025-01-31
  python scripts/submit_mkg_journals.py --date 2025-01-01 --dry-run
  python scripts/submit_mkg_journals.py --date 2025-01-01 --skip-penjualan
  python scripts/submit_mkg_journals.py --date 2025-01-01 --skip-uang-masuk

Flags:
  --reauth          Run OAuth flow in browser (required first time or after token expires)
  --dry-run         Validate and show journal lines, but do NOT post to Accurate
  --skip-penjualan  Skip Journal 1 (Penjualan Cafe)
  --skip-uang-masuk Skip Journal 2 (Uang Masuk)
  --input FILE      Path to template CSV (default: audit/MASS INPUT FINANCE - MASTER ENTER-NON QUINOS.csv)

Balance rules for Penjualan journal:
  diff = 0           → OK
  0 < diff ≤ 5 Rp    → auto-fix: add to 7200.02 (Biaya Pembulatan)
  diff > 5 Rp        → ERROR — fix the template data, cannot submit
"""

import argparse
import csv
import json
import re
import sys
import threading
import webbrowser
from datetime import datetime, timedelta
from http.server import BaseHTTPRequestHandler, HTTPServer
from pathlib import Path
from urllib.parse import parse_qs, urlparse

# ── Try to import requests; guide user if missing ────────────────────────────
try:
    import requests
except ImportError:
    print("ERROR: 'requests' not installed.")
    print("Run: pip3 install requests (or: pip3 install --user requests)")
    sys.exit(1)

# ── Constants ────────────────────────────────────────────────────────────────
SCRIPT_DIR   = Path(__file__).parent
REPO_ROOT    = SCRIPT_DIR.parent
DEFAULT_CSV  = REPO_ROOT / "audit" / "MASS INPUT FINANCE - MASTER ENTER-NON QUINOS.csv"
ENV_FILE     = REPO_ROOT / ".env.local"

# Accurate account codes for MKG
ACC = {
    "piutang":      "1100.10",    # Piutang Usaha MKG
    "penjualan":    "4000.01.03", # Penjualan Strada MKG
    "service":      "2002.04.03", # Hutang Service MKG
    "tax":          "2002.03.04", # Hutang Pajak Pemkot MKG
    "rounding":     "7200.02",    # Biaya Pembulatan
    "settlement":   "1000.02.04", # Bank BCA MKG 4599991899
    "admin_bank":   "6000.01.08", # Biaya Admin Bank
}

CUSTOMER_NO = "C.00045"   # MKG / BCA subsidiary

# Validation thresholds — same limits as BREW Revenue Store
BALANCE_TOLERANCE  = 0        # Rupiah — exact zero is OK (no tolerance)
ROUNDING_LIMIT     = 5        # diff ≤ 5 → auto-fix with 7200.02 (always applied)

# ── Helpers ──────────────────────────────────────────────────────────────────
def load_env(path: Path) -> dict:
    env = {}
    if not path.exists():
        return env
    with open(path) as f:
        for line in f:
            line = line.strip()
            if not line or line.startswith("#"):
                continue
            m = re.match(r'^([A-Z0-9_A-Z_]+)=(.*)$', line)
            if m:
                env[m.group(1)] = m.group(2).strip('"').strip("'")
    return env


def save_env_keys(path: Path, updates: dict):
    """Update or append specific keys in .env.local without touching other lines."""
    lines = path.read_text().splitlines() if path.exists() else []
    remaining = dict(updates)

    new_lines = []
    for line in lines:
        m = re.match(r'^([A-Z0-9_]+)=', line)
        if m and m.group(1) in remaining:
            new_lines.append(f"{m.group(1)}={remaining.pop(m.group(1))}")
        else:
            new_lines.append(line)

    # Append any keys that weren't already in the file
    for key, val in remaining.items():
        new_lines.append(f"{key}={val}")

    path.write_text('\n'.join(new_lines) + '\n')


def parse_amount(val: str) -> float:
    """Parse Indonesian/US formatted number strings: '2,595,690.00' → 2595690.0"""
    if val is None:
        return 0.0
    val = str(val).strip().replace('"', '')
    if not val:
        return 0.0
    # Remove thousand separators (commas before digits), keep decimal point
    val = re.sub(r',(\d{3})', r'\1', val)
    # Handle negative in parens e.g. (307,812.93)
    if val.startswith('(') and val.endswith(')'):
        val = '-' + val[1:-1]
    try:
        return float(val)
    except ValueError:
        return 0.0


def parse_template_date(val: str) -> datetime | None:
    """Parse D/M/YY or D/M/YYYY → datetime"""
    val = val.strip()
    for fmt in ('%d/%m/%y', '%d/%m/%Y'):
        try:
            return datetime.strptime(val, fmt)
        except ValueError:
            continue
    return None


def fmt_date_accurate(dt: datetime) -> str:
    """Format datetime → DD/MM/YYYY for Accurate API"""
    return dt.strftime('%d/%m/%Y')


def fmt_rp(amount: float) -> str:
    return f"Rp {amount:,.2f}"


def color(text: str, code: str) -> str:
    """ANSI color for terminal output"""
    colors = {'red': '31', 'green': '32', 'yellow': '33', 'cyan': '36', 'bold': '1', 'reset': '0'}
    return f"\033[{colors.get(code, '0')}m{text}\033[0m"


# ── CSV Parser ────────────────────────────────────────────────────────────────
def load_template(csv_path: Path) -> list[dict]:
    """
    Returns list of dicts with keys:
      date (datetime), piutang, penjualan, service, tax, rounding,
      uang_masuk, admin_bank
    """
    rows = []
    with open(csv_path, newline='', encoding='utf-8-sig') as f:
        reader = csv.reader(f)
        header = next(reader)  # skip header row
        # Expected: Tanggal,Komponen,1100.10,4000.01.03,2002.04.03,2002.03.04,7200.02,Uang Masuk 1000.02.04,biaya Admin Bank 6000.01.08

        for i, row in enumerate(reader, start=2):
            if len(row) < 9:
                # Pad missing columns with empty string
                row += [''] * (9 - len(row))

            dt = parse_template_date(row[0])
            if dt is None:
                print(f"  [WARN] Row {i}: Could not parse date '{row[0]}' — skipped")
                continue

            rows.append({
                'date':       dt,
                'piutang':    parse_amount(row[2]),   # 1100.10
                'penjualan':  parse_amount(row[3]),   # 4000.01.03
                'service':    parse_amount(row[4]),   # 2002.04.03
                'tax':        parse_amount(row[5]),   # 2002.03.04
                'rounding':   parse_amount(row[6]),   # 7200.02
                'uang_masuk': parse_amount(row[7]),   # 1000.02.04
                'admin_bank': parse_amount(row[8]),   # 6000.01.08
            })
    return rows


# ── Validation (same logic as BREW RevenueStoreClient.getValidation) ─────────
def validate_row(row: dict) -> dict:
    """
    Returns:
      penjualan_diff   float — signed (debit minus kredit)
      penjualan_abs    float — absolute difference
      penjualan_ok     bool  — diff == 0 (no tolerance)
      rounding_fix     dict | None — {type, amount} to add to 7200.02 when 0 < diff ≤ 5
      is_error         bool  — diff > 5 (cannot submit, fix template data)
      uang_masuk_diff  float — signed
      uang_masuk_ok    bool
    """
    # ── Journal 1: Penjualan ─────────────────────────────────────────────────
    debit_p  = row['piutang']
    kredit_p = row['penjualan'] + row['service'] + row['tax'] + row['rounding']
    penjualan_diff = round(debit_p - kredit_p, 2)
    penjualan_abs  = abs(penjualan_diff)
    penjualan_ok   = penjualan_abs == 0

    # diff ≤ 5 → auto-fix by adding to 7200.02
    # diff > 5 → error, cannot submit
    rounding_fix = None
    is_error     = False

    if not penjualan_ok:
        if penjualan_abs <= ROUNDING_LIMIT:
            # debit > kredit → need extra KREDIT on 7200.02
            # debit < kredit → need extra DEBIT on 7200.02
            rounding_fix = {
                'type':   'CREDIT' if penjualan_diff > 0 else 'DEBIT',
                'amount': penjualan_abs,
            }
        else:
            is_error = True

    # ── Journal 2: Uang Masuk ────────────────────────────────────────────────
    debit_u         = row['uang_masuk'] + row['admin_bank']
    kredit_u        = row['piutang']
    uang_masuk_diff = round(debit_u - kredit_u, 2)
    uang_masuk_ok   = abs(uang_masuk_diff) <= 1  # 1 Rupiah tolerance for float rounding

    return {
        'penjualan_diff':  penjualan_diff,
        'penjualan_abs':   penjualan_abs,
        'penjualan_ok':    penjualan_ok,
        'rounding_fix':    rounding_fix,
        'is_error':        is_error,
        'uang_masuk_diff': uang_masuk_diff,
        'uang_masuk_ok':   uang_masuk_ok,
    }


# ── Journal Builder ───────────────────────────────────────────────────────────
def build_detail(account: str, amount_type: str, amount: float) -> dict | None:
    """Return an Accurate journal detail entry, or None if amount is 0."""
    amount = round(amount, 2)
    if amount <= 0:
        return None

    detail: dict = {
        'accountNo':  account.strip(),
        'amountType': amount_type,
        'amount':     amount,
    }
    if account.strip() == ACC['piutang']:
        detail['customerNo']     = CUSTOMER_NO
        detail['subsidiaryType'] = 'CUSTOMER'
    return detail


def build_penjualan(row: dict, v: dict) -> list[dict]:
    """Build Penjualan Cafe journal detail lines."""
    details = []

    # DEBIT: Piutang Usaha MKG
    d = build_detail(ACC['piutang'], 'DEBIT', row['piutang'])
    if d:
        details.append(d)

    # KREDIT: Penjualan Strada MKG
    d = build_detail(ACC['penjualan'], 'CREDIT', row['penjualan'])
    if d:
        details.append(d)

    # KREDIT: Hutang Service MKG (may be 0 in template)
    d = build_detail(ACC['service'], 'CREDIT', row['service'])
    if d:
        details.append(d)

    # KREDIT: Hutang Pajak Pemkot MKG
    d = build_detail(ACC['tax'], 'CREDIT', row['tax'])
    if d:
        details.append(d)

    # KREDIT/DEBIT: Biaya Pembulatan — from template data first, then rounding_fix if needed
    d = build_detail(ACC['rounding'], 'CREDIT', row['rounding'])
    if d:
        details.append(d)

    # Auto-fix: diff ≤ 5 → always add to 7200.02
    if v['rounding_fix']:
        fix = v['rounding_fix']
        d = build_detail(ACC['rounding'], fix['type'], fix['amount'])
        if d:
            details.append(d)

    return details


def build_uang_masuk(row: dict) -> list[dict]:
    """Build Uang Masuk journal detail lines."""
    details = []

    # DEBIT: Bank BCA MKG
    d = build_detail(ACC['settlement'], 'DEBIT', row['uang_masuk'])
    if d:
        details.append(d)

    # DEBIT: Biaya Admin Bank
    d = build_detail(ACC['admin_bank'], 'DEBIT', row['admin_bank'])
    if d:
        details.append(d)

    # KREDIT: Piutang Usaha MKG (clear the piutang)
    d = build_detail(ACC['piutang'], 'CREDIT', row['piutang'])
    if d:
        details.append(d)

    return details


# ── Accurate API Calls ────────────────────────────────────────────────────────
def get_access_token(env: dict) -> tuple[str, str, str, str]:
    """
    Read access + refresh token from .env.local (written by --reauth).
    Returns (access_token, refresh_token, token_id='local', expires_at).
    """
    access_token  = env.get('ACCURATE_ACCESS_TOKEN', '')
    refresh_token = env.get('ACCURATE_REFRESH_TOKEN', '')
    expires_at    = env.get('ACCURATE_EXPIRES_AT', '2000-01-01T00:00:00+00:00')

    if not access_token or not refresh_token:
        raise RuntimeError(
            "No Accurate token found in .env.local.\n"
            "Run:  python3 scripts/submit_mkg_journals.py --reauth"
        )

    return access_token, refresh_token, 'local', expires_at


REAUTH_MSG = (
    "\n  Token Accurate tidak valid atau sudah kedaluwarsa.\n"
    "  Silakan buka BREW web app → Revenue Store → klik 'Hubungkan ke Accurate'\n"
    "  untuk login ulang, lalu jalankan script ini lagi."
)


def do_refresh(env: dict, refresh_tok: str, token_id: str) -> str:
    """Refresh Accurate access token via refresh_token grant. Saves to .env.local. Returns new access token."""
    client_id     = env.get('ACCURATE_OAUTH_CLIENT_ID', '')
    client_secret = env.get('ACCURATE_OAUTH_CLIENT_SECRET', '')

    res = requests.post(
        'https://account.accurate.id/oauth/token',
        data={'grant_type': 'refresh_token', 'refresh_token': refresh_tok},
        auth=requests.auth.HTTPBasicAuth(client_id, client_secret),
        headers={'Content-Type': 'application/x-www-form-urlencoded'},
    )

    if res.status_code in (400, 401):
        print(color(f"  [DEBUG] Refresh failed {res.status_code}: {res.text[:300]}", 'yellow'))
        raise RuntimeError(REAUTH_MSG)
    res.raise_for_status()

    from datetime import timezone
    tok         = res.json()
    new_access  = tok['access_token']
    new_refresh = tok.get('refresh_token', refresh_tok)
    expires_at  = (datetime.now(timezone.utc) + timedelta(seconds=tok['expires_in'])).isoformat()

    save_env_keys(ENV_FILE, {
        'ACCURATE_ACCESS_TOKEN':  new_access,
        'ACCURATE_REFRESH_TOKEN': new_refresh,
        'ACCURATE_EXPIRES_AT':    expires_at,
    })

    print(color("  [TOKEN] Access token refreshed successfully.", 'green'))
    return new_access


def open_db_session(access_token: str, env: dict, token_id: str, refresh_tok: str) -> tuple[str, str, str]:
    """
    Get Accurate DB session.
    Returns (session_id, host, access_token) — access_token may be updated after auto-refresh.
    Auto-retries once if a 401 is returned (forces token refresh).
    """
    for attempt in range(2):
        res = requests.get(
            'https://account.accurate.id/api/db-list.do',
            headers={'Authorization': f'Bearer {access_token}'},
        )

        if res.status_code == 401:
            # Print the actual Accurate error body so we can diagnose
            print(color(f"  [DEBUG] 401 body: {res.text[:300]}", 'yellow'))
            print(color(f"  [DEBUG] Token prefix: {access_token[:20]}...", 'yellow'))
            if attempt == 0:
                print(color("  [TOKEN] 401 received — forcing token refresh...", 'yellow'))
                try:
                    access_token = do_refresh(env, refresh_tok, token_id)
                    continue   # retry with new token
                except RuntimeError as e:
                    raise RuntimeError(str(e))
            else:
                raise RuntimeError(REAUTH_MSG)

        res.raise_for_status()
        db_data = res.json()
        if not db_data.get('s') or not db_data.get('d'):
            raise RuntimeError(f"Could not retrieve Accurate database list: {db_data}")

        db_id   = db_data['d'][0]['id']
        db_name = db_data['d'][0].get('alias', str(db_id))
        print(f"  [DB] Using database: {db_name}")

        # Open session
        res2 = requests.get(
            f'https://account.accurate.id/api/open-db.do?id={db_id}',
            headers={'Authorization': f'Bearer {access_token}'},
        )
        res2.raise_for_status()
        sess = res2.json()
        if not sess.get('s'):
            raise RuntimeError(f"Failed to open Accurate DB: {sess.get('d')}")

        return sess['session'], sess['host'], access_token

    raise RuntimeError(REAUTH_MSG)  # unreachable but satisfies type checker


def delete_existing_journal(api_base: str, access_token: str, session_id: str, memo: str):
    """Delete an existing journal by exact description match (for revisions)."""
    try:
        res = requests.get(
            f"{api_base}/accurate/api/journal-voucher/list.do",
            params={
                'fields': 'id,description',
                'filter.keywords.op': 'EQUAL',
                'filter.keywords.val': memo,
            },
            headers={
                'Authorization': f'Bearer {access_token}',
                'X-Session-ID':  session_id,
            },
        )
        res.raise_for_status()
        data = res.json()
        if data.get('s') and data.get('d'):
            existing_id = data['d'][0]['id']
            print(f"  [REVISI] Deleting existing journal: {memo}")
            requests.delete(
                f"{api_base}/accurate/api/journal-voucher/delete.do",
                params={'id': existing_id},
                headers={
                    'Authorization': f'Bearer {access_token}',
                    'X-Session-ID':  session_id,
                },
            )
    except Exception as e:
        print(f"  [WARN] Could not check/delete existing journal '{memo}': {e}")


def post_journal(
    api_base: str,
    access_token: str,
    session_id: str,
    trans_date: str,
    memo: str,
    details: list[dict],
    dry_run: bool,
) -> bool:
    """
    Validate balance, optionally delete existing, then POST to Accurate.
    Returns True on success.
    """
    debits  = sum(d['amount'] for d in details if d['amountType'] == 'DEBIT')
    credits = sum(d['amount'] for d in details if d['amountType'] == 'CREDIT')
    diff    = abs(debits - credits)

    if diff > BALANCE_TOLERANCE:
        print(color(
            f"  [BALANCE ERROR] '{memo}' tidak balance! "
            f"D={fmt_rp(debits)}  K={fmt_rp(credits)}  selisih={fmt_rp(diff)}",
            'red'
        ))
        return False

    # Print journal preview
    print(f"\n  {'─'*60}")
    print(f"  Jurnal  : {memo}")
    print(f"  Tanggal : {trans_date}")
    print(f"  {'Akun':<14}  {'Tipe':<6}  {'Jumlah':>18}")
    print(f"  {'─'*60}")
    for d in details:
        customer_note = f" (cust: {d.get('customerNo','')})" if 'customerNo' in d else ''
        print(f"  {d['accountNo']:<14}  {d['amountType']:<6}  {fmt_rp(d['amount']):>18}{customer_note}")
    print(f"  {'─'*60}")
    print(f"  Total D={fmt_rp(debits)}  K={fmt_rp(credits)}")

    if dry_run:
        print(color("  [DRY RUN] Tidak dikirim ke Accurate.", 'yellow'))
        return True

    delete_existing_journal(api_base, access_token, session_id, memo)

    payload = {
        'transDate':             trans_date,
        'description':           memo,
        'detailJournalVoucher':  details,
    }

    res = requests.post(
        f"{api_base}/accurate/api/journal-voucher/save.do",
        json=payload,
        headers={
            'Authorization': f'Bearer {access_token}',
            'X-Session-ID':  session_id,
            'Content-Type':  'application/json',
        },
    )
    res.raise_for_status()
    result = res.json()

    if not result.get('s'):
        d = result.get('d', 'Unknown error')
        err = d if isinstance(d, str) else (', '.join(d) if isinstance(d, list) else json.dumps(d))
        print(color(f"  [ACCURATE ERROR] {err}", 'red'))
        return False

    print(color(f"  [OK] Journal posted: {memo}", 'green'))
    return True


# ── OAuth re-auth flow (self-contained, no BREW web app needed) ───────────────
REAUTH_PORT     = 8080
REAUTH_REDIRECT = f"http://localhost:{REAUTH_PORT}/callback"


def run_reauth(env: dict):
    """
    Full OAuth2 authorization_code flow entirely inside the script.
    1. Starts a one-shot local HTTP server on port 8080.
    2. Opens the browser to Accurate's authorize URL.
    3. Captures the ?code= from the redirect.
    4. Exchanges code for access+refresh tokens.
    5. Upserts into Supabase accurate_tokens.

    PREREQUISITE: add  http://localhost:8080/callback  as an allowed redirect URI
    in your Accurate developer app at https://account.accurate.id → Developer.
    """
    client_id     = env.get('ACCURATE_OAUTH_CLIENT_ID', '')
    client_secret = env.get('ACCURATE_OAUTH_CLIENT_SECRET', '')
    supabase_url  = env.get('NEXT_PUBLIC_SUPABASE_URL', '')
    service_key   = env.get('SERVICE_SUPABASE_KEY', '')

    if not client_id or not client_secret:
        print(color("ERROR: ACCURATE_OAUTH_CLIENT_ID / ACCURATE_OAUTH_CLIENT_SECRET missing in .env.local", 'red'))
        sys.exit(1)

    # ── Step 1: capture auth code via one-shot local server ──────────────────
    auth_code: list[str] = []   # mutable container for thread communication
    server_error: list[str] = []

    class CallbackHandler(BaseHTTPRequestHandler):
        def log_message(self, *_):
            pass  # silence default access logs

        def do_GET(self):
            parsed = urlparse(self.path)
            if parsed.path != '/callback':
                self.send_response(404)
                self.end_headers()
                return

            params = parse_qs(parsed.query)
            if 'error' in params:
                err = params['error'][0]
                server_error.append(err)
                self._respond(f"<h2>Error: {err}</h2><p>You can close this tab.</p>")
            elif 'code' in params:
                auth_code.append(params['code'][0])
                self._respond("<h2>Authenticated!</h2><p>Token tersimpan. Tutup tab ini dan kembali ke terminal.</p>")
            else:
                server_error.append('no_code')
                self._respond("<h2>Unexpected response.</h2><p>You can close this tab.</p>")

        def _respond(self, body: str):
            html = f"<html><body style='font-family:sans-serif;padding:2em'>{body}</body></html>"
            self.send_response(200)
            self.send_header('Content-Type', 'text/html; charset=utf-8')
            self.end_headers()
            self.wfile.write(html.encode())

    httpd = HTTPServer(('localhost', REAUTH_PORT), CallbackHandler)
    httpd.timeout = 120  # wait max 2 minutes for the browser redirect

    scope = 'glaccount_view company_data journal_voucher_save journal_voucher_view journal_voucher_delete'
    from urllib.parse import urlencode
    auth_url = (
        'https://account.accurate.id/oauth/authorize?'
        + urlencode({
            'client_id':     client_id,
            'response_type': 'code',
            'redirect_uri':  REAUTH_REDIRECT,
            'scope':         scope,
        })
    )

    print(f"\n  Membuka browser ke Accurate OAuth...\n  URL: {auth_url}\n")
    print(color(
        f"  PENTING: Pastikan  {REAUTH_REDIRECT}  sudah terdaftar\n"
        "  di Accurate Developer App sebagai redirect URI.\n",
        'yellow'
    ))
    webbrowser.open(auth_url)
    print("  Menunggu redirect dari browser... (timeout 120s)")

    # Handle one request (the callback redirect)
    httpd.handle_request()
    httpd.server_close()

    if server_error:
        print(color(f"ERROR: OAuth gagal — {server_error[0]}", 'red'))
        sys.exit(1)

    if not auth_code:
        print(color("ERROR: Tidak ada auth code yang diterima (timeout?)", 'red'))
        sys.exit(1)

    code = auth_code[0]
    print(color("  [OK] Auth code diterima.", 'green'))

    # ── Step 2: exchange code for tokens ─────────────────────────────────────
    print("  Menukar auth code dengan access token...")
    res = requests.post(
        'https://account.accurate.id/oauth/token',
        data={
            'grant_type':   'authorization_code',
            'code':         code,
            'redirect_uri': REAUTH_REDIRECT,
        },
        auth=requests.auth.HTTPBasicAuth(client_id, client_secret),
        headers={'Content-Type': 'application/x-www-form-urlencoded'},
    )

    if not res.ok:
        print(color(f"ERROR: Token exchange gagal — {res.status_code} {res.text}", 'red'))
        sys.exit(1)

    tok         = res.json()
    new_access  = tok['access_token']
    new_refresh = tok['refresh_token']
    from datetime import timezone
    expires_at  = (datetime.now(timezone.utc) + timedelta(seconds=tok['expires_in'])).isoformat()
    print(color("  [OK] Access token diterima.", 'green'))

    # ── Step 3: save tokens directly to .env.local ───────────────────────────
    save_env_keys(ENV_FILE, {
        'ACCURATE_ACCESS_TOKEN':  new_access,
        'ACCURATE_REFRESH_TOKEN': new_refresh,
        'ACCURATE_EXPIRES_AT':    expires_at,
    })

    print(color("\n  Token berhasil disimpan ke .env.local.", 'green'))
    print("  Sekarang jalankan script dengan --date / --from --to untuk submit jurnal.\n")


# ── Main ──────────────────────────────────────────────────────────────────────
def main():
    parser = argparse.ArgumentParser(
        description='Submit MKG Penjualan & Uang Masuk journals to Accurate.',
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog=__doc__,
    )
    parser.add_argument('--date',             help='Single date YYYY-MM-DD')
    parser.add_argument('--from', dest='date_from', help='Start date YYYY-MM-DD')
    parser.add_argument('--to',   dest='date_to',   help='End date YYYY-MM-DD')
    parser.add_argument('--reauth',           action='store_true', help='Re-authenticate with Accurate (opens browser)')
    parser.add_argument('--dry-run',          action='store_true', help='Preview only, do not post')
    parser.add_argument('--skip-penjualan',   action='store_true', help='Skip Journal 1 (Penjualan Cafe)')
    parser.add_argument('--skip-uang-masuk',  action='store_true', help='Skip Journal 2 (Uang Masuk)')
    parser.add_argument('--input',            default=str(DEFAULT_CSV), help='Path to template CSV')

    args = parser.parse_args()

    # ── Re-auth mode — runs standalone, no date needed ───────────────────────
    if args.reauth:
        env = load_env(ENV_FILE)
        run_reauth(env)
        sys.exit(0)

    # ── Determine date filter ─────────────────────────────────────────────────
    filter_dates: set[datetime] | None = None

    if args.date:
        dt = datetime.strptime(args.date, '%Y-%m-%d')
        filter_dates = {dt}
    elif args.date_from or args.date_to:
        if not (args.date_from and args.date_to):
            print("ERROR: --from and --to must be used together.")
            sys.exit(1)
        d_from = datetime.strptime(args.date_from, '%Y-%m-%d')
        d_to   = datetime.strptime(args.date_to,   '%Y-%m-%d')
        filter_dates = set()
        cur = d_from
        while cur <= d_to:
            filter_dates.add(cur)
            cur += timedelta(days=1)

    if filter_dates is None:
        print("ERROR: Specify --date or --from/--to.")
        parser.print_help()
        sys.exit(1)

    # ── Load CSV ──────────────────────────────────────────────────────────────
    csv_path = Path(args.input)
    if not csv_path.exists():
        print(f"ERROR: Template CSV not found: {csv_path}")
        sys.exit(1)

    rows = load_template(csv_path)
    target_rows = [r for r in rows if r['date'].date() in {d.date() for d in filter_dates}]

    if not target_rows:
        dates_str = ', '.join(d.strftime('%Y-%m-%d') for d in sorted(filter_dates)[:5])
        print(f"No matching rows found in CSV for: {dates_str} ...")
        print(f"(CSV covers {rows[0]['date'].date()} to {rows[-1]['date'].date()})")
        sys.exit(1)

    print(f"\n{'═'*65}")
    print(f"  BREW MKG Journal Submission  —  {len(target_rows)} tanggal ditemukan")
    print(f"  Mode: {'DRY RUN' if args.dry_run else 'LIVE'}")
    print(f"{'═'*65}\n")

    # ── Load credentials & open Accurate session (skip for dry-run) ──────────
    env = load_env(ENV_FILE)
    access_token = session_id = api_base = None

    if not args.dry_run:
        from datetime import timezone

        print("[1/3] Mengambil token Accurate dari Supabase...")
        try:
            access_token, refresh_tok, token_id, expires_at = get_access_token(env)
            # Pre-emptively refresh if expires_at is in the past
            exp_dt = datetime.fromisoformat(expires_at.replace('Z', '+00:00'))
            if exp_dt <= datetime.now(timezone.utc):
                print(color("  [TOKEN] Token kedaluwarsa, mencoba refresh...", 'yellow'))
                access_token = do_refresh(env, refresh_tok, token_id)
        except Exception as e:
            print(color(f"ERROR: {e}", 'red'))
            sys.exit(1)

        print("[2/3] Membuka sesi database Accurate...")
        try:
            session_id, host, access_token = open_db_session(access_token, env, token_id, refresh_tok)
            api_base = host
            print(color(f"  [OK] Sesi terbuka: {host}", 'green'))
        except Exception as e:
            print(color(f"ERROR: {e}", 'red'))
            sys.exit(1)

        print("[3/3] Mulai memproses jurnal...\n")
    else:
        print("[INFO] Dry-run mode — validasi saja, tidak kirim ke Accurate.\n")

    # ── Process each row ──────────────────────────────────────────────────────
    results = {'ok': 0, 'skipped': 0, 'error': 0}

    for row in sorted(target_rows, key=lambda r: r['date']):
        date_str     = row['date'].strftime('%d/%m/%Y')   # DD/MM/YYYY
        date_h1      = (row['date'] + timedelta(days=1)).strftime('%d/%m/%Y')
        memo_penj    = f"BREW - PENJUALAN STRADA MKG {date_str}"
        memo_uang    = f"BREW - UANG MASUK STRADA MKG {date_str}"

        print(f"\n{'─'*65}")
        print(color(f"  Tanggal: {date_str}  (Uang Masuk: {date_h1})", 'bold'))
        print(f"  Piutang  : {fmt_rp(row['piutang'])}")
        print(f"  Penjualan: {fmt_rp(row['penjualan'])}  Service: {fmt_rp(row['service'])}")
        print(f"  Pajak    : {fmt_rp(row['tax'])}  Pembulatan: {fmt_rp(row['rounding'])}")
        print(f"  Uang Masuk BCA: {fmt_rp(row['uang_masuk'])}  Admin Bank: {fmt_rp(row['admin_bank'])}")

        v = validate_row(row)

        # ── Penjualan validation report ───────────────────────────────────────
        if v['is_error']:
            print(color(
                f"  [ERROR] Penjualan tidak balance: selisih {fmt_rp(v['penjualan_abs'])} "
                f"({'Debit > Kredit' if v['penjualan_diff'] > 0 else 'Kredit > Debit'}) — "
                "perbaiki data di template CSV.",
                'red'
            ))
        elif v['rounding_fix']:
            fix = v['rounding_fix']
            print(color(
                f"  [FIX] Penjualan selisih {fmt_rp(v['penjualan_abs'])} → "
                f"auto-fix ke 7200.02 ({fix['type']} {fmt_rp(fix['amount'])})",
                'cyan'
            ))
        else:
            print(color("  [OK] Penjualan: Balance.", 'green'))

        if not v['uang_masuk_ok']:
            print(color(
                f"  [ERROR] Uang Masuk tidak balance: selisih {fmt_rp(abs(v['uang_masuk_diff']))} "
                "(BCA + Admin ≠ Piutang) — perbaiki data di template CSV.",
                'red'
            ))

        # ── Journal 1: Penjualan ──────────────────────────────────────────────
        if not args.skip_penjualan:
            if v['is_error']:
                print(color("  [SKIP] Penjualan dilewati karena error balance.", 'yellow'))
                results['skipped'] += 1
            else:
                details_p = build_penjualan(row, v)
                try:
                    ok = post_journal(
                        api_base, access_token, session_id,
                        date_str, memo_penj, details_p, args.dry_run,
                    )
                    if ok:
                        results['ok'] += 1
                    else:
                        results['error'] += 1
                except Exception as e:
                    print(color(f"  [ERROR] Penjualan: {e}", 'red'))
                    results['error'] += 1

        # ── Journal 2: Uang Masuk ─────────────────────────────────────────────
        if not args.skip_uang_masuk:
            details_u = build_uang_masuk(row)
            try:
                ok = post_journal(
                    api_base, access_token, session_id,
                    date_h1, memo_uang, details_u, args.dry_run,
                )
                if ok:
                    results['ok'] += 1
                else:
                    results['error'] += 1
            except Exception as e:
                print(color(f"  [ERROR] Uang Masuk: {e}", 'red'))
                results['error'] += 1

    # ── Summary ───────────────────────────────────────────────────────────────
    print(f"\n{'═'*65}")
    print(color(
        f"  SELESAI — OK: {results['ok']}  Skipped: {results['skipped']}  Error: {results['error']}",
        'bold'
    ))
    print(f"{'═'*65}\n")

    sys.exit(1 if results['error'] > 0 else 0)


if __name__ == '__main__':
    main()
