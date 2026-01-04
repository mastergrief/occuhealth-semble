// convex/auth.config.ts
// Configuration for Convex to accept WorkOS JWT tokens
// This enables ctx.auth.getUserIdentity() to return the authenticated user
//
// IMPORTANT: Two providers are needed:
// 1. SSO provider (issuer: https://api.workos.com/)
// 2. User Management provider (issuer: https://api.workos.com/user_management/{clientId})
//
// Reference: https://docs.convex.dev/auth/authkit

const clientId = process.env.WORKOS_CLIENT_ID;

export default {
  providers: [
    // Provider 1: SSO tokens
    {
      type: "customJwt",
      issuer: "https://api.workos.com/",
      algorithm: "RS256",
      applicationID: clientId,
      jwks: `https://api.workos.com/sso/jwks/${clientId}`,
    },
    // Provider 2: User Management tokens (most common for AuthKit)
    {
      type: "customJwt",
      issuer: `https://api.workos.com/user_management/${clientId}`,
      algorithm: "RS256",
      jwks: `https://api.workos.com/sso/jwks/${clientId}`,
    },
  ],
};
