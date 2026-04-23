export default function PersonaliaSelesai() {
  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#F7F5F2', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '24px', fontFamily: 'Plus Jakarta Sans, sans-serif' }}>
      <div style={{ width: '100%', maxWidth: '440px', textAlign: 'center' }}>
        <div style={{
          width: '80px', height: '80px', borderRadius: '50%',
          backgroundColor: '#E6F4F1', display: 'flex', alignItems: 'center', justifyContent: 'center',
          margin: '0 auto 24px', fontSize: '36px',
        }}>
          ☕
        </div>
        <img src="/strada-logo.svg" alt="Strada Coffee" style={{ height: '40px', width: 'auto', filter: 'grayscale(1) contrast(2)', opacity: 0.7, marginBottom: '24px' }} />
        <h1 style={{ fontSize: '24px', fontWeight: 800, color: '#020000', margin: '0 0 12px' }}>
          Data Berhasil Disimpan
        </h1>
        <p style={{ fontSize: '15px', color: '#4C4845', margin: '0 0 32px', lineHeight: 1.7 }}>
          Selamat bergabung di tim Strada Coffee! Formulir Data Personalia Anda telah kami terima untuk proses administrasi karyawan baru.
        </p>

        <div style={{ backgroundColor: '#fff', borderRadius: '20px', padding: '24px', border: '1.5px solid #E8E4E0', textAlign: 'left' }}>
          <p style={{ fontSize: '12px', fontWeight: 700, color: '#037894', letterSpacing: '1.5px', textTransform: 'uppercase', margin: '0 0 12px' }}>Informasi Onboarding</p>
          {[
            { step: '1', text: 'Tim HRD akan memproses kelengkapan dokumen Anda.' },
            { step: '2', text: 'Data Anda telah resmi terdaftar dalam sistem karyawan.' },
            { step: '3', text: 'Harap tunggu instruksi selanjutnya dari atasan atau HRD.' },
          ].map(item => (
            <div key={item.step} style={{ display: 'flex', gap: '12px', alignItems: 'flex-start', marginBottom: '12px' }}>
              <div style={{ width: '24px', height: '24px', borderRadius: '50%', backgroundColor: '#E6F4F8', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <span style={{ fontSize: '11px', fontWeight: 800, color: '#037894' }}>{item.step}</span>
              </div>
              <p style={{ fontSize: '13px', color: '#4C4845', margin: 0, lineHeight: 1.6 }}>{item.text}</p>
            </div>
          ))}
        </div>

        <p style={{ fontSize: '12px', color: '#8A8A8D', marginTop: '28px' }}>
          Anda dapat menutup halaman ini.
        </p>
      </div>
    </div>
  )
}
