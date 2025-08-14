CREATE OR REPLACE FUNCTION get_fcm_tokens_for_users(user_ids UUID[])
RETURNS TABLE (token TEXT) AS $$
BEGIN
    RETURN QUERY
    SELECT fcm_tokens.token
    FROM fcm_tokens
    WHERE fcm_tokens.user_id = ANY(user_ids);
END;
$$ LANGUAGE plpgsql;
