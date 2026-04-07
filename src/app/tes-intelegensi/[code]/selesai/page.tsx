export default function CfitSelesaiPage() {
  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#F7F5F2', fontFamily: 'Plus Jakarta Sans, sans-serif' }}>
      <div style={{ borderBottom: '1px solid #E8E4E0', backgroundColor: 'rgba(255,255,255,0.78)', backdropFilter: 'blur(12px)' }}>
        <div style={{ maxWidth: '920px', margin: '0 auto', padding: '24px 20px', display: 'flex', justifyContent: 'center' }}>
          <img src="/strada-logo.svg" alt="Strada Coffee" style={{ height: '56px', width: 'auto', filter: 'grayscale(1) contrast(2)', opacity: 0.9 }} />
        </div>
      </div>

      <div style={{ minHeight: 'calc(100vh - 105px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '28px 24px' }}>
        <div style={{ width: '100%', maxWidth: '560px', textAlign: 'center' }}>
          <div style={{ width: '88px', height: '88px', borderRadius: '50%', backgroundColor: '#E6F4F1', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px', fontSize: '38px', boxShadow: '0 12px 24px rgba(0,83,83,0.08)' }}>
            ✓
          </div>
          <h1 style={{ fontSize: '30px', fontWeight: 900, color: '#020000', margin: '0 0 12px' }}>Tes Selesai</h1>
          <p style={{ fontSize: '15px', color: '#4C4845', margin: '0 0 28px', lineHeight: 1.7 }}>
            Terima kasih telah menyelesaikan Tes Intelegensi. Jawaban Anda telah tersimpan dan akan ditinjau oleh tim HRD Strada Coffee.
          </p>
          <div style={{ backgroundColor: '#fff', borderRadius: '24px', padding: '24px', border: '1.5px solid #E8E4E0', textAlign: 'left', boxShadow: '0 14px 36px rgba(0,0,0,0.04)' }}>
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
            <p style={{ fontSize: '13px', color: '#8A8A8D', margin: '10px 0 0', lineHeight: 1.7, textAlign: 'center' }}>
              Terima kasih, nanti akan dihubungi HRD. Anda boleh menutup halaman ini.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
