CREATE TABLE IF NOT EXISTS public.hrd_settings (
    id TEXT PRIMARY KEY DEFAULT 'default',
    hrd_email TEXT,
    offer_letter_template TEXT,
    quest_ai_system_prompt TEXT,
    wa_template_invitation TEXT,
    wa_template_rejection TEXT,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    updated_by TEXT
);

-- Insert default row if not exists
INSERT INTO public.hrd_settings (
    id, 
    hrd_email, 
    offer_letter_template,
    quest_ai_system_prompt,
    wa_template_invitation,
    wa_template_rejection
) 
VALUES (
    'default', 
    'hrd@stradacoffee.com', 
    'Terima kasih atas lamaran Anda...',
    'Kamu adalah Quest, AI assistant HR untuk Strada Coffee Indonesia. Tugasmu membuat template pesan komunikasi dengan kandidat yang profesional, hangat, dan on-brand dengan Strada Coffee.',
    'Halo [NAMA], kami dari tim HR Strada Coffee ingin mengundang Anda untuk interview posisi [POSISI].',
    'Halo [NAMA], terima kasih atas ketertarikan Anda. Saat ini kami belum dapat melanjutkan proses lamaran Anda.'
) 
ON CONFLICT (id) DO NOTHING;

-- Policies
ALTER TABLE public.hrd_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow read access to all authenticated users" 
ON public.hrd_settings FOR SELECT 
TO authenticated 
USING (true);

CREATE POLICY "Allow update access to authenticated users" 
ON public.hrd_settings FOR UPDATE 
TO authenticated 
USING (true) WITH CHECK (true);

CREATE POLICY "Allow insert access to authenticated users" 
ON public.hrd_settings FOR INSERT 
TO authenticated 
WITH CHECK (true);
