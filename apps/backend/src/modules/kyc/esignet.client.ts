// === IMPORTS ===
import axios from "axios";
import * as jose from "jose";
import { randomBytes } from "node:crypto";
import { env } from "../../config/env.js";
import { logger } from "../../lib/logger.js";

// === INTERFACES & TYPES ===
export interface OidcEndpoints {
  issuer: string;
  authorization_endpoint: string;
  token_endpoint: string;
  userinfo_endpoint: string;
  jwks_uri: string;
  pushed_authorization_request_endpoint: string;
}

export interface ESignetUserInfo {
  sub: string;
  name?: string;
  gender?: string;
  birthdate?: string;
  phone?: string;
  address?: string;
}

let cachedEndpoints: OidcEndpoints | null = null;

// === INTERNAL UTILITIES ===

export async function getOidcEndpoints(): Promise<OidcEndpoints> {
  if (cachedEndpoints) return cachedEndpoints;
  if (!env.ESIGNET_DISCOVERY_URL)
    throw new Error("ESIGNET_DISCOVERY_URL is not set");

  const response = await axios.get(env.ESIGNET_DISCOVERY_URL);
  cachedEndpoints = response.data;
  return cachedEndpoints as OidcEndpoints;
}

async function getPrivateKey(): Promise<jose.KeyLike | Uint8Array> {
  if (!env.ESIGNET_PRIVATE_KEY_JWK_B64)
    throw new Error("ESIGNET_PRIVATE_KEY_JWK_B64 is not set");
  const jsonString = Buffer.from(
    env.ESIGNET_PRIVATE_KEY_JWK_B64,
    "base64",
  ).toString("utf8");
  const jwk = JSON.parse(jsonString);
  return await jose.importJWK(jwk, "RS256");
}

export async function generateClientAssertion(
  endpointAudience: string,
): Promise<string> {
  if (!env.ESIGNET_CLIENT_ID) throw new Error("ESIGNET_CLIENT_ID is not set");

  const privateKey = await getPrivateKey();
  const jti = randomBytes(16).toString("hex");

  return await new jose.SignJWT({})
    .setProtectedHeader({ alg: "RS256" })
    .setIssuer(env.ESIGNET_CLIENT_ID)
    .setSubject(env.ESIGNET_CLIENT_ID)
    .setAudience(endpointAudience)
    .setExpirationTime("2m")
    .setIssuedAt()
    .setJti(jti)
    .sign(privateKey);
}

// === MAIN EXPORTS ===

/**
 * Initiates the Pushed Authorization Request (PAR) flow.
 */
export async function initiatePar(params: {
  state: string;
  nonce: string;
}): Promise<{ authorizeUrl: string; requestUri: string }> {
  if (!env.ESIGNET_CLIENT_ID || !env.ESIGNET_REDIRECT_URI) {
    throw new Error("Missing ESIGNET configuration");
  }

  const endpoints = await getOidcEndpoints();
  const clientAssertion = await generateClientAssertion(
    endpoints.pushed_authorization_request_endpoint,
  );

  const parParams = new URLSearchParams({
    client_id: env.ESIGNET_CLIENT_ID,
    scope: env.ESIGNET_SCOPES,
    response_type: "code",
    redirect_uri: env.ESIGNET_REDIRECT_URI,
    state: params.state,
    nonce: params.nonce,
    prompt: "consent",
    client_assertion_type:
      "urn:ietf:params:oauth:client-assertion-type:jwt-bearer",
    client_assertion: clientAssertion,
  });

  const response = await axios.post(
    endpoints.pushed_authorization_request_endpoint,
    parParams,
    {
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
    },
  );

  return {
    authorizeUrl: endpoints.authorization_endpoint,
    requestUri: response.data.request_uri,
  };
}

/**
 * Exchanges the auth code for access and ID tokens.
 */
export async function exchangeCodeForTokens(
  code: string,
): Promise<{ accessToken: string; idToken: string }> {
  if (!env.ESIGNET_CLIENT_ID || !env.ESIGNET_REDIRECT_URI) {
    throw new Error("Missing ESIGNET configuration");
  }

  const endpoints = await getOidcEndpoints();
  const clientAssertion = await generateClientAssertion(
    endpoints.token_endpoint,
  );

  const tokenParams = new URLSearchParams({
    grant_type: "authorization_code",
    code: code,
    redirect_uri: env.ESIGNET_REDIRECT_URI,
    client_id: env.ESIGNET_CLIENT_ID,
    client_assertion_type:
      "urn:ietf:params:oauth:client-assertion-type:jwt-bearer",
    client_assertion: clientAssertion,
  });

  const response = await axios.post(endpoints.token_endpoint, tokenParams, {
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
  });

  return {
    accessToken: response.data.access_token,
    idToken: response.data.id_token,
  };
}

/**
 * Fetches and decrypts the nested UserInfo (JWE -> JWS -> Claims)
 */
export async function fetchAndDecryptUserInfo(
  accessToken: string,
): Promise<ESignetUserInfo> {
  const endpoints = await getOidcEndpoints();

  // Fetch Encrypted UserInfo using the access token
  const response = await axios.get(endpoints.userinfo_endpoint, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: "application/jwt",
    },
  });

  const encryptedPayload = response.data;
  const privateKey = await getPrivateKey();

  // Step 1: Decrypt Outer JWE Layer using Yekis Private Key
  const { plaintext } = await jose.compactDecrypt(encryptedPayload, privateKey);
  const jwsString = new TextDecoder().decode(plaintext);

  // Step 2: Validate Inner JWS signature using Fayda's JWKS
  const JWKS = jose.createRemoteJWKSet(new URL(endpoints.jwks_uri));
  const { payload } = await jose.jwtVerify(jwsString, JWKS, {
    issuer: endpoints.issuer,
  });

  return {
    sub: payload.sub as string,
    name: payload.name as string | undefined,
    gender: payload.gender as string | undefined,
    birthdate: payload.birthdate as string | undefined,
    phone: payload.phone as string | undefined,
    address: payload.address as string | undefined,
  };
}
