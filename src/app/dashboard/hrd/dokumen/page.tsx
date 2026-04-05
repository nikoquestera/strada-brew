'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Upload, CheckCircle, FileText, Zap } from 'lucide-react'

interface DocTemplate {
  id: string
  doc_id: string
  name: string
  category: string
  type: string
  storage_path: string | null
  uploaded_at: string | null
}

export default function DokumenPage() {
  const supabase = createClient()
  const [templates, setTemplates] = useState<DocTemplate[]>([])
  const [uploading, setUploading] = useState<string | null>(null)
  const [uploadSuccess, setUploadSuccess] = useState<string | null>(null)

  useEffect(() => {
    loadTemplates()
  }, [])

  async function loadTemplates() {
    const { data } = await supabase
      .from('document_templates')
      .select('*')
      .order('category')
    if (data) setTemplates(data)
  }

  async function handleUpload(docId: string, file: File) {
    if (!file.name.endsWith('.docx')) {
      alert('Hanya file .docx yang diterima')
      return
    }
    setUploading(docId)

    const path = `templates/${docId}.docx`
    const { error } = await supabase.storage
      .from('document-templates')
      .upload(path, file, { upsert: true })

    if (!error) {
      await supabase.from('document_templates')
        .update({ storage_path: path, uploaded_at: new Date().toISOString() })
        .eq('doc_id', docId)

      setUploadSuccess(docId)
      setTimeout(() => setUploadSuccess(null), 3000)
      await loadTemplates()
    } else {
      alert('Upload gagal: ' + error.message)
    }
    setUploading(null)
  }

  const byCategory = templates.reduce((acc, t) => {
    if (!acc[t.category]) acc[t.category] = []
    acc[t.category].push(t)
    return acc
  }, {} as Record<string, DocTemplate[]>)

  const generateCount = templates.filter(t => t.type === 'generate').length
  const uploadedCount = templates.filter(t => t.type === 'generate' && t.storage_path).length

  return (
    <div style={{ padding: '24px', minHeight: '100vh' }}>

      {/* Header */}
      <div style={{ marginBottom: '24px' }}>
        <p style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '3px', color: '#037894', textTransform: 'uppercase', margin: '0 0 4px' }}>HRD</p>
        <h1 style={{ fontSize: '24px', fontWeight: 800, color: '#020000', margin: 0 }}>Template Dokumen</h1>
        <p style={{ fontSize: '13px', color: '#8A8A8D', margin: '4px 0 0' }}>
          {uploadedCount}/{generateCount} template generate sudah diupload
        </p>
      </div>

      {/* Progress */}
      <div style={{ backgroundColor: '#fff', borderRadius: '16px', padding: '20px', border: '1.5px solid #E8E4E0', marginBottom: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
          <span style={{ fontSize: '13px', fontWeight: 600, color: '#020000' }}>Progress Upload Template</span>
          <span style={{ fontSize: '13px', color: '#037894', fontWeight: 700 }}>{uploadedCount}/{generateCount}</span>
        </div>
        <div style={{ height: '8px', borderRadius: '4px', backgroundColor: '#F0EEEC' }}>
          <div style={{ height: '100%', borderRadius: '4px', backgroundColor: '#037894', width: `${generateCount > 0 ? (uploadedCount / generateCount) * 100 : 0}%`, transition: 'width 0.3s' }} />
        </div>

        {/* Placeholder guide */}
        <div style={{ marginTop: '16px', padding: '14px', borderRadius: '10px', backgroundColor: 'rgba(3,120,148,0.04)', border: '1px solid rgba(3,120,148,0.15)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '10px' }}>
            <Zap size={14} color="#037894" />
            <span style={{ fontSize: '12px', fontWeight: 700, color: '#037894' }}>Format Placeholder di DOCX</span>
          </div>
          <p style={{ fontSize: '12px', color: '#4C4845', margin: '0 0 8px' }}>
            Gunakan format <code style={{ backgroundColor: '#E8E4E0', padding: '1px 6px', borderRadius: '4px', fontFamily: 'monospace' }}>{'{{PLACEHOLDER}}'}</code> di dalam template DOCX. Contoh:
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '4px' }}>
            {[
              ['{{NAMA_LENGKAP}}', 'Nama karyawan'],
              ['{{ID_KARYAWAN}}', 'STD00xxx'],
              ['{{JABATAN}}', 'Posisi'],
              ['{{TANGGAL_HARI_INI}}', 'Otomatis'],
              ['{{GAJI_POKOK}}', 'Rp xxx,-'],
              ['{{MULAI_KONTRAK}}', 'Tgl mulai'],
              ['{{AKHIR_KONTRAK}}', 'Tgl akhir'],
              ['{{NIK_KTP}}', 'Nomor KTP'],
              ['{{OUTLET}}', 'Penempatan'],
              ['{{PIMPINAN}}', 'Evani Jesslyn'],
            ].map(([ph, desc]) => (
              <div key={ph} style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                <code style={{ fontSize: '10px', backgroundColor: '#E8E4E0', padding: '2px 6px', borderRadius: '4px', fontFamily: 'monospace', flexShrink: 0 }}>{ph}</code>
                <span style={{ fontSize: '11px', color: '#8A8A8D' }}>{desc}</span>
              </div>
            ))}
          </div>
          <p style={{ fontSize: '11px', color: '#8A8A8D', margin: '8px 0 0' }}>
            Field yang datanya kosong di database akan otomatis menjadi <code style={{ backgroundColor: '#E8E4E0', padding: '1px 4px', borderRadius: '3px', fontSize: '10px' }}>[___________]</code> untuk diisi manual.
          </p>
        </div>
      </div>

      {/* Template list by category */}
      {Object.entries(byCategory).map(([category, docs]) => (
        <div key={category} style={{ marginBottom: '20px' }}>
          <p style={{ fontSize: '11px', fontWeight: 700, color: '#8A8A8D', textTransform: 'uppercase', letterSpacing: '2px', margin: '0 0 10px' }}>{category}</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {docs.map(doc => (
              <div key={doc.doc_id} style={{ backgroundColor: '#fff', borderRadius: '14px', padding: '16px 20px', border: `1.5px solid ${doc.storage_path ? 'rgba(3,120,148,0.2)' : '#E8E4E0'}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{ width: '36px', height: '36px', borderRadius: '10px', backgroundColor: doc.storage_path ? 'rgba(3,120,148,0.08)' : doc.type === 'generate' ? '#FEF8E6' : '#F7F5F2', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    {doc.type === 'view_only'
                      ? <FileText size={16} color="#8A8A8D" />
                      : doc.storage_path
                        ? <CheckCircle size={16} color="#037894" />
                        : <Upload size={16} color="#DE9733" />
                    }
                  </div>
                  <div>
                    <p style={{ fontSize: '14px', fontWeight: 600, color: '#020000', margin: 0 }}>{doc.name}</p>
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginTop: '2px' }}>
                      <span style={{ fontSize: '11px', padding: '1px 8px', borderRadius: '6px', fontWeight: 600,
                        backgroundColor: doc.type === 'generate' ? (doc.storage_path ? 'rgba(3,120,148,0.08)' : '#FEF8E6') : '#F0EEEC',
                        color: doc.type === 'generate' ? (doc.storage_path ? '#037894' : '#DE9733') : '#8A8A8D' }}>
                        {doc.type === 'view_only' ? 'View Only' : doc.storage_path ? 'Template Ready ✓' : 'Belum Upload'}
                      </span>
                      {doc.uploaded_at && (
                        <span style={{ fontSize: '11px', color: '#8A8A8D' }}>
                          Upload: {new Date(doc.uploaded_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {doc.type === 'generate' && (
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    {uploadSuccess === doc.doc_id && (
                      <span style={{ fontSize: '12px', color: '#005353', fontWeight: 600 }}>✓ Berhasil!</span>
                    )}
                    <label style={{ padding: '8px 16px', borderRadius: '10px', backgroundColor: doc.storage_path ? '#F7F5F2' : '#037894', color: doc.storage_path ? '#4C4845' : '#fff', fontSize: '12px', fontWeight: 700, cursor: uploading === doc.doc_id ? 'not-allowed' : 'pointer', opacity: uploading === doc.doc_id ? 0.7 : 1, whiteSpace: 'nowrap' }}>
                      {uploading === doc.doc_id ? 'Uploading...' : doc.storage_path ? '↑ Replace Template' : '↑ Upload Template'}
                      <input type="file" accept=".docx" style={{ display: 'none' }}
                        onChange={e => e.target.files?.[0] && handleUpload(doc.doc_id, e.target.files[0])} />
                    </label>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}