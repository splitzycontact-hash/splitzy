// Provider type `customJwt` : valide le JWT Clerk via issuer + JWKS directement,
// SANS exiger de claim `aud` (le provider OIDC `{domain, applicationID}` exige
// aud === applicationID, or les templates Clerk n'émettent pas de claim `aud`).
// Le matching se fait sur l'`iss`. Les deux issuers = instances Clerk de Splitzy.
export default {
  providers: [
    {
      type: "customJwt",
      issuer: "https://novel-cougar-88.clerk.accounts.dev",
      jwks: "https://novel-cougar-88.clerk.accounts.dev/.well-known/jwks.json",
      algorithm: "RS256",
    },
    {
      type: "customJwt",
      issuer: "https://clerk.splitzy.fr",
      jwks: "https://clerk.splitzy.fr/.well-known/jwks.json",
      algorithm: "RS256",
    },
  ],
};
