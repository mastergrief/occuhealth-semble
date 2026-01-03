# WorkOS API Programmatic Access

## Overview
WorkOS can be accessed directly via REST API using the `WORKOS_API_KEY` from `.env.local`. No CLI tool exists - use curl or SDK.

## Authentication
```bash
-H "Authorization: Bearer $WORKOS_API_KEY"
```

## Common Operations

### List Users
```bash
curl -s -X GET "https://api.workos.com/user_management/users?limit=10" \
  -H "Authorization: Bearer $WORKOS_API_KEY"
```

### Verify User Email (bypass email verification for testing)
```bash
curl -s -X PUT "https://api.workos.com/user_management/users/{USER_ID}" \
  -H "Authorization: Bearer $WORKOS_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"email_verified": true}'
```

### Update User Details
```bash
curl -s -X PUT "https://api.workos.com/user_management/users/{USER_ID}" \
  -H "Authorization: Bearer $WORKOS_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"first_name": "Test", "last_name": "User"}'
```

### Delete User
```bash
curl -s -X DELETE "https://api.workos.com/user_management/users/{USER_ID}" \
  -H "Authorization: Bearer $WORKOS_API_KEY"
```

## Testing Workflow
1. User signs up via AuthKit UI
2. Get user ID from list users API
3. Set `email_verified: true` via PUT endpoint
4. User can now sign in without email code

## API Docs
- Base URL: `https://api.workos.com`
- User Management: `/user_management/users`
- Full docs: https://workos.com/docs/reference

## Notes
- No official WorkOS CLI exists (npm `workos` package is deprecated)
- API key is `sk_test_*` for staging, `sk_live_*` for production
- Can update: email_verified, first_name, last_name, metadata, external_id
