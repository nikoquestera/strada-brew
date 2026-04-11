import axios from 'axios'

async function fetchMetadata() {
  // This script needs to be run with environment variables
  const accessToken = process.env.ACCURATE_ACCESS_TOKEN
  const sessionId = process.env.ACCURATE_SESSION_ID
  const host = process.env.ACCURATE_HOST

  if (!accessToken || !sessionId || !host) {
    console.error('Missing Accurate credentials in env')
    return
  }

  const apiBaseUrl = `${host}/accurate`

  try {
    console.log('--- Customers ---')
    const custRes = await axios.get(`${apiBaseUrl}/api/customer/list.do`, {
      headers: { 'Authorization': `Bearer ${accessToken}`, 'X-Session-ID': sessionId }
    })
    if (custRes.data.s) {
      console.log(custRes.data.d.slice(0, 10).map((c: any) => `${c.name} (${c.customerNo})`))
    }

    console.log('\n--- Vendors ---')
    const vendRes = await axios.get(`${apiBaseUrl}/api/vendor/list.do`, {
      headers: { 'Authorization': `Bearer ${accessToken}`, 'X-Session-ID': sessionId }
    })
    if (vendRes.data.s) {
      console.log(vendRes.data.d.slice(0, 10).map((v: any) => `${v.name} (${v.vendorNo})`))
    }
  } catch (e: any) {
    console.error('Error fetching metadata:', e.message)
  }
}

fetchMetadata()
