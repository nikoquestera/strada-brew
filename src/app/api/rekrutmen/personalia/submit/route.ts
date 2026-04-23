import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const SERVICE_KEY = process.env.SERVICE_SUPABASE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY

export async function POST(request: NextRequest) {
  try {
    const { access_code, form } = await request.json()
    if (!access_code || !form) return NextResponse.json({ error: 'Missing data' }, { status: 400 })

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      SERVICE_KEY!
    )

    // 1. Validate session
    const { data: session, error: sessErr } = await supabase
      .from('personalia_sessions')
      .select('*, applicants(*)')
      .eq('access_code', access_code)
      .eq('status', 'pending')
      .single()

    if (sessErr || !session) return NextResponse.json({ error: 'Invalid or completed session' }, { status: 404 })

    // 2. Create Employee Record (ONLY NOW they become visible in Karyawan)
    const { data: employee, error: empErr } = await supabase
      .from('employees')
      .insert([{
        applicant_id: session.applicant_id,
        full_name: form.full_name,
        email: form.email,
        phone: form.phone,
        position: session.applicants.position_applied,
        outlet: session.applicants.outlet_preference,
        status: 'active',
        join_date: new Date().toISOString().split('T')[0],
        
        // Identity
        nickname: form.nickname,
        birth_place: form.birth_place,
        birth_date: form.birth_date,
        religion: form.religion,
        blood_type: form.blood_type,
        gender: form.gender,
        identity_number: form.identity_number,
        address_ktp: form.address_ktp,
        address_domicile: form.address_domicile,
        home_phone: form.home_phone,
        postal_code: form.postal_code,
        
        // Family & Living
        marital_status: form.marital_status,
        marital_since: form.marital_since || null,
        family_data: [...form.family_data, ...form.parents_siblings],
        housing_status: form.housing_status === 'Lain-lain' ? form.housing_other : form.housing_status,
        vehicle_used: form.vehicle_used,
        
        // Skills & History
        education_history: form.education_history,
        language_skills: form.language_skills,
        training_history: form.training_history,
        work_history: form.work_history,
        
        // Financial
        bpjs_kesehatan_number: form.bpjs_kesehatan,
        bpjs_ketenagakerjaan_number: form.bpjs_ketenagakerjaan,
        npwp_number: form.npwp,
        bank_account_number: form.bank_account_number,
        bank_account_name: form.bank_account_name,
        
        // Preferences & Interests
        happiest_workplace: form.happiest_workplace,
        happiest_workplace_reason: form.happiest_workplace_reason,
        job_interests: form.job_interests,
        expected_salary: form.expected_salary,
        expected_facilities: form.expected_facilities,
        willing_to_be_relocated: form.willing_to_be_relocated === 'Ya',
        relocation_refusal_reason: form.relocation_refusal_reason,
        
        // Social & Medical
        social_sports: form.social_sports,
        social_hobbies: form.social_hobbies,
        social_organizations: form.social_organizations,
        references_data: form.references,
        internal_relations: form.internal_acquaintances,
        medical_history: form.medical_history,
        psychotest_history: form.psychotest_history,
        
        // Self
        self_description: form.self_description
      }])
      .select()
      .single()

    if (empErr) {
        console.error('Employee creation error:', empErr)
        throw empErr
    }

    // 3. Close Session
    await supabase
      .from('personalia_sessions')
      .update({ 
        status: 'completed', 
        completed_at: new Date().toISOString(),
        form_data: form 
      })
      .eq('id', session.id)

    return NextResponse.json({ success: true })
  } catch (err: any) {
    console.error('[personalia/submit] error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
