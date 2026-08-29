"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createTimestamp = createTimestamp;
exports.createNonceStr = createNonceStr;
exports.buildSigningString = buildSigningString;
exports.signWithRsaPss = signWithRsaPss;
exports.verifyWithRsaPss = verifyWithRsaPss;
exports.signRequestObject = signRequestObject;
// === IMPORTS ===
var node_crypto_1 = require("node:crypto");
var node_crypto_2 = __importDefault(require("node:crypto"));
/**
 * Telebirr RSA-PSS signing and verification utilities.
 *
 * Implements the SHA256withRSAandMGF1 signing algorithm required by
 * Telebirr's payment gateway. Uses Node.js native crypto — zero external
 * dependencies (replaces the jsrsasign library used in the official demo).
 */
// Fields excluded from the signing string per Telebirr's specification.
var EXCLUDED_FIELDS = new Set([
    "sign",
    "sign_type",
    "header",
    "refund_info",
    "openType",
    "raw_request",
    "biz_content",
]);
// === MAIN FUNCTIONS ===
/**
 * Returns the current Unix epoch time as a string (seconds, not ms).
 */
function createTimestamp() {
    return String(Math.floor(Date.now() / 1000));
}
/**
 * Generates a random alphanumeric nonce string (0-9, A-Z).
 * Default length is 32 characters, matching the Telebirr demo.
 */
function createNonceStr(len) {
    if (len === void 0) { len = 32; }
    var chars = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ";
    var bytes = (0, node_crypto_1.randomBytes)(len);
    var result = "";
    for (var i = 0; i < len; i++) {
        result += chars[bytes[i] % chars.length];
    }
    return result;
}
/**
 * Builds the canonical signing string from a Telebirr request object.
 *
 * Algorithm (per Telebirr specification):
 * 1. Collect all root-level fields except those in EXCLUDED_FIELDS
 * 2. Flatten all fields from biz_content into the same map
 * 3. Sort keys in ASCII alphabetical order
 * 4. Join as key=value&key=value
 *
 * The mandate_data sub-object (if present inside biz_content) is
 * serialized as its JSON string value, not flattened further.
 */
function buildSigningString(requestObject) {
    var fieldMap = {};
    // 1. Collect root-level fields
    for (var _i = 0, _a = Object.keys(requestObject); _i < _a.length; _i++) {
        var key = _a[_i];
        if (EXCLUDED_FIELDS.has(key))
            continue;
        var val = requestObject[key];
        if (val !== undefined && val !== null) {
            fieldMap[key] = typeof val === "object" ? JSON.stringify(val) : String(val);
        }
    }
    // 2. Flatten biz_content fields
    var bizContent = requestObject.biz_content;
    if (bizContent && typeof bizContent === "object") {
        for (var _b = 0, _c = Object.keys(bizContent); _b < _c.length; _b++) {
            var key = _c[_b];
            if (EXCLUDED_FIELDS.has(key))
                continue;
            var val = bizContent[key];
            if (val !== undefined && val !== null) {
                fieldMap[key] = typeof val === "object" ? JSON.stringify(val) : String(val);
            }
        }
    }
    // 3. Sort keys in ASCII order and 4. Join
    return Object.keys(fieldMap)
        .sort()
        .map(function (key) { return "".concat(key, "=").concat(fieldMap[key]); })
        .join("&");
}
/**
 * Signs a data string using RSA-PSS with SHA-256 (SHA256withRSAandMGF1).
 *
 * @param dataString - The canonical signing string
 * @param privateKeyPem - RSA private key in PKCS#8 PEM format
 * @returns Base64-encoded signature
 */
function signWithRsaPss(dataString, privateKeyPem) {
    var signer = (0, node_crypto_1.createSign)("RSA-SHA256");
    signer.update(dataString, "utf8");
    signer.end();
    return signer.sign({
        key: privateKeyPem,
        padding: node_crypto_2.default.constants.RSA_PKCS1_PSS_PADDING,
        saltLength: node_crypto_2.default.constants.RSA_PSS_SALTLEN_DIGEST, // 32 bytes for SHA-256
    }, "base64");
}
/**
 * Verifies an RSA-PSS signature against Telebirr's public key.
 *
 * @param dataString - The canonical signing string
 * @param signatureBase64 - Base64-encoded signature from the sign field
 * @param publicKeyPem - Telebirr's RSA public key in PEM format
 * @returns true if the signature is valid
 */
function verifyWithRsaPss(dataString, signatureBase64, publicKeyPem) {
    try {
        var verifier = (0, node_crypto_1.createVerify)("RSA-SHA256");
        verifier.update(dataString, "utf8");
        verifier.end();
        return verifier.verify({
            key: publicKeyPem,
            padding: node_crypto_2.default.constants.RSA_PKCS1_PSS_PADDING,
            saltLength: node_crypto_2.default.constants.RSA_PSS_SALTLEN_DIGEST,
        }, signatureBase64, "base64");
    }
    catch (_a) {
        return false;
    }
}
/**
 * Convenience function: builds the signing string from a request object
 * and signs it with the given RSA private key.
 *
 * @returns Base64-encoded RSA-PSS signature
 */
function signRequestObject(requestObject, privateKeyPem) {
    var signingString = buildSigningString(requestObject);
    return signWithRsaPss(signingString, privateKeyPem);
}
