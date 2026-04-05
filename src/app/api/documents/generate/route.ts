import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  const { employee_id, doc_id } = await request.json()
  if (!employee_id || !doc_id) {
    return NextResponse.json({ error: 'Missing employee_id or doc_id' }, { status: 400 })
  }

  const supabase = await createClient()

  // Get employee data
  const { data: emp, error: empErr } = await supabase
    .from('employees')
    .select('*')
    .eq('id', employee_id)
    .single()

  if (empErr || !emp) {
    return NextResponse.json({ error: 'Employee not found' }, { status: 404 })
  }

  // Get template info
  const { data: template } = await supabase
    .from('document_templates')
    .select('*')
    .eq('doc_id', doc_id)
    .single()

  // Build placeholder map from employee data
  const today = new Date()
  const fmtDate = (d: string | null) => {
    if (!d) return null
    return new Date(d).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })
  }
  const fmtCurrency = (n: number | null) => {
    if (!n) return null
    return 'Rp ' + n.toLocaleString('id-ID') + ',-'
  }

  const placeholderMap: Record<string, string> = {
    // Karyawan
    NAMA_LENGKAP: emp.full_name || '',
    ID_KARYAWAN: emp.employee_id || '',
    JABATAN: emp.position || '',
    DEPARTEMEN: emp.department || '',
    OUTLET: emp.outlet || emp.entity || '',
    ENTITY: emp.entity || '',
    TANGGAL_BERGABUNG: fmtDate(emp.join_date) || '',
    GAJI_POKOK: fmtCurrency(emp.base_salary) || '',
    TUNJANGAN: fmtCurrency(emp.tunjangan) || '',
    TIPE_KONTRAK: emp.employment_type || '',
    MULAI_KONTRAK: fmtDate(emp.contract_start) || '',
    AKHIR_KONTRAK: fmtDate(emp.contract_end) || '',
    PERIODE_KONTRAK: emp.contract_period_text || '',
    GOLONGAN: emp.grade || '',
    NIK_KTP: emp.id_number || '',
    NPWP: emp.npwp || '',
    ALAMAT: emp.address || '',
    TEMPAT_LAHIR: emp.place_of_birth || '',
    TANGGAL_LAHIR: fmtDate(emp.birth_date) || '',
    NO_HP: emp.phone || '',
    EMAIL: emp.email || '',
    STATUS_PERNIKAHAN: emp.marital_status || '',
    NO_BPJS_KESEHATAN: emp.bpjs_kesehatan || '',
    NO_BPJS_TK: emp.bpjs_tk || '',
    BANK: emp.bank_name || '',
    NO_REKENING: emp.bank_account_number || '',
    NAMA_REKENING: emp.bank_account_name || '',
    NOMOR_PKWT: emp.pkwt_doc_number || '',
    SUPERVISOR: emp.supervisor_name || '',
    // Tanggal otomatis
    TANGGAL_HARI_INI: today.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }),
    BULAN_INI: today.toLocaleDateString('id-ID', { month: 'long', year: 'numeric' }),
    TAHUN_INI: today.getFullYear().toString(),
    // Perusahaan
    NAMA_PERUSAHAAN: 'CV Kopi Terbaik Nusantara',
    BRAND: 'Strada Coffee',
    PIMPINAN: 'Evani Jesslyn',
    KOTA_KANTOR: 'Jakarta',
  }

  // Check if template DOCX exists in storage
  if (template?.storage_path) {
    try {
      // Download template from Supabase Storage
      const { data: fileData, error: fileErr } = await supabase.storage
        .from('document-templates')
        .download(template.storage_path)

      if (!fileErr && fileData) {
        // Process DOCX with docxtemplater
        const PizZip = (await import('pizzip')).default
        const Docxtemplater = (await import('docxtemplater')).default

        const arrayBuffer = await fileData.arrayBuffer()
        const zip = new PizZip(arrayBuffer)
        const doc = new Docxtemplater(zip, {
          paragraphLoop: true,
          linebreaks: true,
          // Replace unfound tags with blank (for manual fill)
          nullGetter: (part: any) => {
            if (!part.module) return `[___________]`
            return ''
          },
        })

        // Set data — docxtemplater uses {PLACEHOLDER} format
        // Convert our {{PLACEHOLDER}} format to {PLACEHOLDER}
        doc.setData(placeholderMap)

        try {
          doc.render()
        } catch (err: any) {
          console.error('Docxtemplater render error:', err)
          return NextResponse.json({
            success: false,
            error: 'Template render error',
            details: err.message,
            // Fallback: return placeholder map so client can show manual form
            placeholderMap,
            employee: emp,
          })
        }

        const output = doc.getZip().generate({
          type: 'base64',
          mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        })

        // Save generated doc to employee's folder
        const outputPath = `generated/${emp.employee_id}/${doc_id}_${Date.now()}.docx`
        await supabase.storage
          .from('document-templates')
          .upload(outputPath, Buffer.from(output, 'base64'), {
            contentType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            upsert: true,
          })

        // Log to employee_document_status
        await supabase.from('employee_document_status').upsert({
          employee_id: emp.id,
          template_id: template.id,
          status: 'presented',
          presented_date: new Date().toISOString().split('T')[0],
        }, { onConflict: 'employee_id,template_id' })

        return NextResponse.json({
          success: true,
          docx_base64: output,
          output_path: outputPath,
          filename: `${doc_id}_${emp.employee_id}.docx`,
          placeholderMap,
        })
      }
    } catch (err) {
      console.error('DOCX processing error:', err)
    }
  }

  // Fallback: template belum diupload — return placeholder map untuk manual form
  return NextResponse.json({
    success: true,
    mode: 'manual',
    placeholderMap,
    template_missing: true,
    message: 'Template DOCX belum diupload. Tampilkan form manual.',
  })
}