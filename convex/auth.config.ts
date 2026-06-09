// Provider type `customJwt` : valide le JWT Clerk via issuer + JWKS directement,
// SANS exiger de claim `aud`. Le matching se fait sur l'`iss`.
//
// SECURITY (Vuln 4) : l'instance Clerk DEV (novel-cougar-88, inscription ouverte)
// a été retirée de la prod après cutover du frontend splitzy.fr sur pk_live
// (clerk.splitzy.fr). Login prod vérifié avant retrait. La prod n'accepte plus
// que les JWT émis par l'instance prod clerk.splitzy.fr.
export default {
  providers: [
    {
      type: "customJwt",
      issuer: "https://clerk.splitzy.fr",
      jwks: "https://clerk.splitzy.fr/.well-known/jwks.json",
      algorithm: "RS256",
    },
  ],
};
