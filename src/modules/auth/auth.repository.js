const revokedJtis = new Set();

export const authRepository = {
  revokeToken(jti) {
    revokedJtis.add(jti);
  },

  isTokenRevoked(jti) {
    return revokedJtis.has(jti);
  },
};
