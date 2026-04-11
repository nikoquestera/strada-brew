-- Table to store Accurate OAuth tokens
CREATE TABLE IF NOT EXISTS accurate_tokens (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    access_token TEXT NOT NULL,
    refresh_token TEXT NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    UNIQUE(user_id)
);

ALTER TABLE accurate_tokens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow users to read their own accurate_tokens" ON accurate_tokens
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Allow users to insert their own accurate_tokens" ON accurate_tokens
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Allow users to update their own accurate_tokens" ON accurate_tokens
    FOR UPDATE USING (auth.uid() = user_id);
