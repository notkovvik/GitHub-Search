import * as Crypto from 'expo-crypto';

/** PKCE (RFC 7636): S256-челлендж из случайного верификатора. */

/** Случайная строка 64 символа из [0-9a-f] — подмножество разрешённого набора. */
export function createVerifier(): string {
  const bytes = Crypto.getRandomBytes(32);
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

/** base64url(SHA-256(verifier)) без выравнивающих '='. */
export async function challengeFromVerifier(verifier: string): Promise<string> {
  const b64 = await Crypto.digestStringAsync(
    Crypto.CryptoDigestAlgorithm.SHA256,
    verifier,
    { encoding: Crypto.CryptoEncoding.BASE64 },
  );
  return b64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

export function createState(): string {
  return createVerifier().slice(0, 24);
}
