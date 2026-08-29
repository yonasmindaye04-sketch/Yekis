"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g = Object.create((typeof Iterator === "function" ? Iterator : Object).prototype);
    return g.next = verb(0), g["throw"] = verb(1), g["return"] = verb(2), typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.telebirrClient = void 0;
// === IMPORTS ===
var node_crypto_1 = require("node:crypto");
var env_js_1 = require("../../../config/env.js");
var logger_js_1 = require("../../../lib/logger.js");
var telebirr_token_js_1 = require("./telebirr.token.js");
var telebirr_signing_js_1 = require("./telebirr.signing.js");
/**
 * Telebirr C2B Web Checkout — the primary payment rail.
 *
 * Implements the full Telebirr payment flow:
 * 1. Obtains a fabric token (cached in Redis via telebirr.token.ts)
 * 2. Creates a preOrder via the Telebirr Merchant API
 * 3. Assembles a web checkout URL for browser redirect
 * 4. Verifies incoming webhook signatures (RSA-PSS in the body)
 *
 * When credentials are not configured, falls back to mock mode
 * (returns a fake transaction ID and triggers an auto-webhook).
 */
/**
 * Checks whether the required Telebirr credentials are configured.
 * All five core credentials must be present for live mode.
 */
function hasCredentials() {
    return !!(env_js_1.env.TELEBIRR_FABRIC_APP_ID &&
        env_js_1.env.TELEBIRR_APP_SECRET &&
        env_js_1.env.TELEBIRR_MERCHANT_APP_ID &&
        env_js_1.env.TELEBIRR_MERCHANT_CODE &&
        env_js_1.env.TELEBIRR_PRIVATE_KEY);
}
/**
 * Generates a unique merchant order ID.
 * Format: YKS-<unix_timestamp>-<6_char_random>
 * This is stored as providerTransactionId and used as merch_order_id
 * in the Telebirr preOrder request.
 */
function generateMerchOrderId() {
    var ts = Date.now();
    var rand = Math.random().toString(36).substring(2, 8).toUpperCase();
    return "YKS-".concat(ts, "-").concat(rand);
}
// === MAIN EXPORT ===
exports.telebirrClient = {
    initiatePayment: function (params) {
        return __awaiter(this, void 0, void 0, function () {
            var fabricToken, merchOrderId, amountStr, timestamp, nonceStr, preOrderRequest, preOrderUrl, preOrderResponse, err_1, body, preOrderData, prepayId, rawMap, rawSign, rawRequest, checkoutUrl;
            var _a;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        if (!hasCredentials()) {
                            logger_js_1.logger.warn("Telebirr credentials not configured — using mock payment initiation.");
                            return [2 /*return*/, {
                                    providerTransactionId: "mock-telebirr-".concat((0, node_crypto_1.randomUUID)()),
                                    redirectUrl: null,
                                }];
                        }
                        return [4 /*yield*/, (0, telebirr_token_js_1.getFabricToken)()];
                    case 1:
                        fabricToken = _b.sent();
                        merchOrderId = generateMerchOrderId();
                        amountStr = (params.amountMinor / 100).toFixed(2);
                        timestamp = (0, telebirr_signing_js_1.createTimestamp)();
                        nonceStr = (0, telebirr_signing_js_1.createNonceStr)();
                        preOrderRequest = {
                            timestamp: timestamp,
                            nonce_str: nonceStr,
                            method: "payment.preorder",
                            version: "1.0",
                            biz_content: {
                                notify_url: env_js_1.env.TELEBIRR_NOTIFY_URL || "".concat(env_js_1.env.FRONTEND_URL, "/api/v1/webhooks/telebirr"),
                                appid: env_js_1.env.TELEBIRR_MERCHANT_APP_ID,
                                merch_code: env_js_1.env.TELEBIRR_MERCHANT_CODE,
                                merch_order_id: merchOrderId,
                                trade_type: "Checkout",
                                title: "Yekis Escrow \u2014 ".concat(params.reference),
                                total_amount: amountStr,
                                trans_currency: params.currency,
                                timeout_express: env_js_1.env.TELEBIRR_TIMEOUT_EXPRESS,
                            },
                            sign: "",
                            sign_type: "SHA256WithRSA",
                        };
                        // 5. Sign the request
                        preOrderRequest.sign = (0, telebirr_signing_js_1.signRequestObject)(preOrderRequest, env_js_1.env.TELEBIRR_PRIVATE_KEY);
                        preOrderUrl = "".concat(env_js_1.env.TELEBIRR_BASE_URL, "/payment/v1/merchant/preOrder");
                        logger_js_1.logger.info({ merchOrderId: merchOrderId, amountStr: amountStr, reference: params.reference }, "Creating Telebirr preOrder.");
                        _b.label = 2;
                    case 2:
                        _b.trys.push([2, 4, , 6]);
                        return [4 /*yield*/, fetch(preOrderUrl, {
                                method: "POST",
                                headers: {
                                    "Content-Type": "application/json",
                                    "X-APP-Key": env_js_1.env.TELEBIRR_FABRIC_APP_ID,
                                    "Authorization": "Bearer ".concat(fabricToken),
                                },
                                body: JSON.stringify(preOrderRequest),
                            })];
                    case 3:
                        preOrderResponse = _b.sent();
                        return [3 /*break*/, 6];
                    case 4:
                        err_1 = _b.sent();
                        // If the token might have expired, invalidate and let the next attempt re-fetch
                        return [4 /*yield*/, (0, telebirr_token_js_1.invalidateFabricToken)()];
                    case 5:
                        // If the token might have expired, invalidate and let the next attempt re-fetch
                        _b.sent();
                        throw new Error("Telebirr preOrder request failed: ".concat(err_1 instanceof Error ? err_1.message : String(err_1)));
                    case 6:
                        if (!!preOrderResponse.ok) return [3 /*break*/, 10];
                        return [4 /*yield*/, preOrderResponse.text().catch(function () { return ""; })];
                    case 7:
                        body = _b.sent();
                        if (!(preOrderResponse.status === 401)) return [3 /*break*/, 9];
                        return [4 /*yield*/, (0, telebirr_token_js_1.invalidateFabricToken)()];
                    case 8:
                        _b.sent();
                        _b.label = 9;
                    case 9: throw new Error("Telebirr preOrder failed: HTTP ".concat(preOrderResponse.status, " \u2014 ").concat(body));
                    case 10: return [4 /*yield*/, preOrderResponse.json()];
                    case 11:
                        preOrderData = (_b.sent());
                        if (preOrderData.code !== 200 || !((_a = preOrderData.biz_content) === null || _a === void 0 ? void 0 : _a.prepay_id)) {
                            throw new Error("Telebirr preOrder returned error: code=".concat(preOrderData.code, ", msg=").concat(preOrderData.msg));
                        }
                        prepayId = preOrderData.biz_content.prepay_id;
                        rawMap = {
                            appid: env_js_1.env.TELEBIRR_MERCHANT_APP_ID,
                            merch_code: env_js_1.env.TELEBIRR_MERCHANT_CODE,
                            nonce_str: (0, telebirr_signing_js_1.createNonceStr)(),
                            prepay_id: prepayId,
                            timestamp: (0, telebirr_signing_js_1.createTimestamp)(),
                        };
                        rawSign = (0, telebirr_signing_js_1.signRequestObject)(rawMap, env_js_1.env.TELEBIRR_PRIVATE_KEY);
                        rawRequest = Object.keys(rawMap)
                            .sort()
                            .map(function (k) { return "".concat(k, "=").concat(encodeURIComponent(rawMap[k])); })
                            .join("&")
                            + "&sign=".concat(encodeURIComponent(rawSign), "&sign_type=SHA256WithRSA");
                        checkoutUrl = "".concat(env_js_1.env.TELEBIRR_WEB_BASE_URL).concat(rawRequest, "&version=1.0&trade_type=Checkout");
                        logger_js_1.logger.info({ merchOrderId: merchOrderId, prepayId: prepayId }, "Telebirr preOrder created — checkout URL assembled.");
                        return [2 /*return*/, {
                                providerTransactionId: merchOrderId,
                                redirectUrl: checkoutUrl,
                            }];
                }
            });
        });
    },
    /**
     * Verifies an incoming Telebirr webhook signature.
     *
     * Telebirr embeds the signature inside the JSON body (as the "sign" field),
     * NOT in an HTTP header. This method:
     * 1. Parses the raw body to extract "sign"
     * 2. Rebuilds the canonical signing string from remaining fields
     * 3. Verifies using Telebirr's RSA public key with RSA-PSS
     *
     * The signatureHeader parameter is ignored (kept for interface compliance).
     */
    verifyWebhookSignature: function (_a) {
        var rawBody = _a.rawBody;
        if (!env_js_1.env.TELEBIRR_PUBLIC_KEY) {
            logger_js_1.logger.error("TELEBIRR_PUBLIC_KEY not set — rejecting webhook rather than trusting an unverifiable payload.");
            return false;
        }
        var payload;
        try {
            payload = JSON.parse(rawBody.toString("utf8"));
        }
        catch (_b) {
            logger_js_1.logger.error("Failed to parse Telebirr webhook body as JSON.");
            return false;
        }
        var signature = payload.sign;
        if (!signature || typeof signature !== "string") {
            logger_js_1.logger.warn("Telebirr webhook missing 'sign' field.");
            return false;
        }
        // Build signing string from the payload (excluding sign and sign_type)
        var signingString = (0, telebirr_signing_js_1.buildSigningString)(payload);
        var isValid = (0, telebirr_signing_js_1.verifyWithRsaPss)(signingString, signature, env_js_1.env.TELEBIRR_PUBLIC_KEY);
        if (!isValid) {
            logger_js_1.logger.warn("Telebirr webhook RSA-PSS signature verification failed.");
        }
        return isValid;
    },
    /**
     * Direct transaction-status query (payment.query.order) used by the
     * payment reconciliation sweep. Signed exactly like preOrder: fabric
     * token + canonical signing string + merchant private key.
     *
     * Returns null when Telebirr has no record of the merch_order_id yet —
     * that means the user likely never opened/confirmed the checkout page,
     * which is a normal PENDING, not an error.
     */
    queryPaymentStatus: function (_a) {
        return __awaiter(this, arguments, void 0, function (_b) {
            var fabricToken, queryRequest, response, err_2, body, data, s, status;
            var _c;
            var providerTransactionId = _b.providerTransactionId;
            return __generator(this, function (_d) {
                switch (_d.label) {
                    case 0:
                        if (!hasCredentials()) {
                            logger_js_1.logger.warn("Telebirr credentials not configured — reconciliation query unavailable.");
                            return [2 /*return*/, null];
                        }
                        return [4 /*yield*/, (0, telebirr_token_js_1.getFabricToken)()];
                    case 1:
                        fabricToken = _d.sent();
                        queryRequest = {
                            timestamp: (0, telebirr_signing_js_1.createTimestamp)(),
                            nonce_str: (0, telebirr_signing_js_1.createNonceStr)(),
                            method: "payment.query.order",
                            version: "1.0",
                            biz_content: {
                                appid: env_js_1.env.TELEBIRR_MERCHANT_APP_ID,
                                merch_code: env_js_1.env.TELEBIRR_MERCHANT_CODE,
                                merch_order_id: providerTransactionId,
                            },
                            sign: "",
                            sign_type: "SHA256WithRSA",
                        };
                        queryRequest.sign = (0, telebirr_signing_js_1.signRequestObject)(queryRequest, env_js_1.env.TELEBIRR_PRIVATE_KEY);
                        _d.label = 2;
                    case 2:
                        _d.trys.push([2, 4, , 6]);
                        return [4 /*yield*/, fetch("".concat(env_js_1.env.TELEBIRR_BASE_URL, "/payment/v1/merchant/queryOrder"), {
                                method: "POST",
                                headers: {
                                    "Content-Type": "application/json",
                                    "X-APP-Key": env_js_1.env.TELEBIRR_FABRIC_APP_ID,
                                    Authorization: "Bearer ".concat(fabricToken),
                                },
                                body: JSON.stringify(queryRequest),
                            })];
                    case 3:
                        response = _d.sent();
                        return [3 /*break*/, 6];
                    case 4:
                        err_2 = _d.sent();
                        return [4 /*yield*/, (0, telebirr_token_js_1.invalidateFabricToken)()];
                    case 5:
                        _d.sent();
                        throw new Error("Telebirr queryOrder request failed: ".concat(err_2 instanceof Error ? err_2.message : String(err_2)));
                    case 6:
                        if (!!response.ok) return [3 /*break*/, 10];
                        if (!(response.status === 401)) return [3 /*break*/, 8];
                        return [4 /*yield*/, (0, telebirr_token_js_1.invalidateFabricToken)()];
                    case 7:
                        _d.sent();
                        _d.label = 8;
                    case 8: return [4 /*yield*/, response.text().catch(function () { return ""; })];
                    case 9:
                        body = _d.sent();
                        throw new Error("Telebirr queryOrder failed: HTTP ".concat(response.status, " \u2014 ").concat(body));
                    case 10: return [4 /*yield*/, response.json()];
                    case 11:
                        data = (_d.sent());
                        // Telebirr returns a non-200 business code when the order is unknown.
                        if (data.code !== 200 || !((_c = data.biz_content) === null || _c === void 0 ? void 0 : _c.trade_status)) {
                            logger_js_1.logger.info({ providerTransactionId: providerTransactionId, code: data.code, msg: data.msg }, "Telebirr has no record of this order yet — treating as still PENDING.");
                            return [2 /*return*/, null];
                        }
                        s = data.biz_content.trade_status.toLowerCase();
                        if (["completed", "success"].includes(s))
                            status = "SUCCESS";
                        else if (["fail", "failed", "closed", "cancelled"].includes(s))
                            status = "FAILED";
                        else
                            status = "PENDING";
                        return [2 /*return*/, { status: status }];
                }
            });
        });
    },
};
