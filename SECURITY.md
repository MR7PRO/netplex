# Security Guidelines

## Environment Variables

### ⚠️ Never Commit Secrets

- The `.env` file contains environment-specific configuration
- **Never commit** `.env` to version control
- Use `.env.example` as a template (contains placeholders only)

### What's Safe to Expose

| Variable | Safe to Expose? | Notes |
|----------|-----------------|-------|
| `VITE_SUPABASE_URL` | ✅ Yes | Public project URL |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | ✅ Yes | Anon key, safe for client-side |
| `VITE_SUPABASE_PROJECT_ID` | ✅ Yes | Public identifier |
| `SUPABASE_SERVICE_ROLE_KEY` | ❌ **NEVER** | Full database access |
| `SUPABASE_DB_URL` | ❌ **NEVER** | Direct database connection |

### Lovable Cloud Secrets

Private secrets (API keys, service role keys) are stored securely in Lovable Cloud and are only accessible in Edge Functions. They are **never** exposed to the client.

## If Secrets Are Exposed

### Rotating Supabase Keys

If you accidentally expose your `SERVICE_ROLE_KEY`:

1. **Immediately** go to Lovable Cloud → Backend → Settings
2. Navigate to API Settings
3. Generate new API keys
4. Update any Edge Functions using the old keys
5. Review database access logs for unauthorized access

### Rotating the Anon Key

The anon key is designed to be public, but if you need to rotate it:

1. Go to Lovable Cloud → Backend → Settings → API
2. Generate a new anon key
3. The `.env` file will be automatically updated

## Row Level Security (RLS)

This project uses RLS to protect data:

- ✅ All tables have RLS enabled
- ✅ Policies restrict access based on `auth.uid()`
- ✅ Admin checks use `SECURITY DEFINER` functions to prevent recursion
- ✅ Phone numbers are protected via views (not exposed to other users)

## Best Practices

1. **Never store roles in the profiles table** - Use the separate `user_roles` table
2. **Never check admin status client-side** - Always validate on the server
3. **Use Edge Functions for sensitive operations** - They have access to service role
4. **Rate limiting** - Submissions are rate-limited per phone number per day
5. **Storage** - The `listings` bucket is private; images use signed URLs

## Reporting Security Issues

If you discover a security vulnerability, please report it responsibly by contacting the project maintainers directly.
