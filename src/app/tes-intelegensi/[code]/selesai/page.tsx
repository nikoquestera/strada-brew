export default function CfitSelesaiPage() {
  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#F7F5F2', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '24px', fontFamily: 'Plus Jakarta Sans, sans-serif' }}>
      <div style={{ width: '100%', maxWidth: '460px', textAlign: 'center' }}>
        <div style={{ width: '84px', height: '84px', borderRadius: '50%', backgroundColor: '#E6F4F1', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px', fontSize: '36px' }}>
          ✓
        </div>
        <img src="/strada-logo.svg" alt="Strada Coffee" style={{ height: '28px', width: 'auto', filter: 'grayscale(1) contrast(2)', opacity: 0.7, marginBottom: '24px' }} />
        <h1 style={{ fontSize: '26px', fontWeight: 900, color: '#020000', margin: '0 0 12px' }}>Tes Selesai</h1>
        <p style={{ fontSize: '15px', color: '#4C4845', margin: '0 0 28px', lineHeight: 1.7 }}>
          Terima kasih telah menyelesaikan Tes Intelegensi. Jawaban Anda telah tersimpan dan akan ditinjau oleh tim HRD Strada Coffee.
        </p>
        <div style={{ backgroundColor: '#fff', borderRadius: '20px', padding: '24px', border: '1.5px solid #E8E4E0', textAlign: 'left' }}>
          <p style={{ fontSize: '12px', fontWeight: 700, color: '#037894', letterSpacing: '1.5px', textTransform: 'uppercase', margin: '0 0 12px' }}>Langkah Selanjutnya</p>
          {[
            'Hasil tidak ditampilkan di halaman kandidat.',
            'Tim HRD akan menilai jawaban, skor, dan klasifikasi hasil Anda di portal internal.',
            'Kode akses dinonaktifkan otomatis setelah tes selesai.',
          ].map((item, index) => (
            <div key={item} style={{ display: 'flex', gap: '12px', alignItems: 'flex-start', marginBottom: '12px' }}>
              <div style={{ width: '24px', height: '24px', borderRadius: '50%', backgroundColor: '#E6F4F8', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <span style={{ fontSize: '11px', fontWeight: 800, color: '#037894' }}>{index + 1}</span>
              </div>
              <p style={{ fontSize: '13px', color: '#4C4845', margin: 0, lineHeight: 1.6 }}>{item}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
