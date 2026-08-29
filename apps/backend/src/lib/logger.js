"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.logger = void 0;
// === IMPORTS ===
var pino_1 = __importDefault(require("pino"));
var env_js_1 = require("../config/env.js");
exports.logger = (0, pino_1.default)({
    level: env_js_1.env.NODE_ENV === "production" ? "info" : "debug",
    transport: env_js_1.env.NODE_ENV === "development"
        ? { target: "pino-pretty", options: { colorize: true } }
        : undefined,
    redact: ["req.headers.authorization", "*.password", "*.passwordHash"],
});
