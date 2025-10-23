// Kling API JWT Authentication
// Reference: https://app.klingai.com/global/dev/document-api/apiReference/commonInfo

export interface JWTPayload {
  iss: string; // Access Key
  exp: number; // Expiration time (current time + 1800s)
  nbf: number; // Not before time (current time - 5s)
}

/**
 * Generate JWT token for Kling API authentication
 * Following JWT (Json Web Token, RFC 7519) standard
 * JWT consists of three parts: Header, Payload, Signature
 */
export function generateKlingJWT(accessKey: string, secretKey: string): string {
  const header = {
    alg: "HS256",
    typ: "JWT"
  };

  const payload: JWTPayload = {
    iss: accessKey,
    exp: Math.floor(Date.now() / 1000) + 1800, // Valid for 30 minutes
    nbf: Math.floor(Date.now() / 1000) - 5 // Start 5 seconds ago
  };

  console.log("生成 Kling JWT:");
  console.log("- Access Key:", accessKey);
  console.log("- Payload:", payload);

  // Encode header and payload
  const encodedHeader = base64UrlEncode(JSON.stringify(header));
  const encodedPayload = base64UrlEncode(JSON.stringify(payload));

  // Create signature
  const signatureInput = `${encodedHeader}.${encodedPayload}`;
  const signature = hmacSHA256(signatureInput, secretKey);
  const encodedSignature = base64UrlEncode(signature);

  const jwt = `${encodedHeader}.${encodedPayload}.${encodedSignature}`;
  console.log("- 生成的 JWT:", jwt.substring(0, 50) + "...");

  // Combine all parts
  return jwt;
}

/**
 * Base64 URL encode
 * Handles both string and Buffer input
 */
function base64UrlEncode(input: string | Buffer): string {
  const buffer = typeof input === 'string' ? Buffer.from(input) : input;
  const base64 = buffer.toString('base64');
  return base64
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');
}

/**
 * HMAC SHA256 signature
 * Returns Buffer for proper encoding
 */
function hmacSHA256(message: string, secret: string): Buffer {
  const crypto = require('crypto');
  const hmac = crypto.createHmac('sha256', secret);
  hmac.update(message);
  return hmac.digest(); // Return Buffer, not base64 string
}

