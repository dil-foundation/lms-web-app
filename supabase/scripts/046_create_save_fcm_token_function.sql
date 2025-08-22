CREATE OR REPLACE FUNCTION save_fcm_token(token_value TEXT)
RETURNS void AS $$
BEGIN
    INSERT INTO fcm_tokens (user_id, token)
    VALUES (auth.uid(), token_value)
    ON CONFLICT (user_id, token) DO NOTHING;
END;
$$ LANGUAGE plpgsql;
