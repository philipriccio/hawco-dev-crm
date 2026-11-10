-- Apply as migration owner using psql -v runtime_role=<existing role name>.
-- No credential or role creation. Existing User SELECT/UPDATE rights are unchanged.
GRANT SELECT, INSERT, UPDATE ON TABLE "ClaudeConnectionCredential", "ClaudeConnectionThrottle" TO :"runtime_role";
