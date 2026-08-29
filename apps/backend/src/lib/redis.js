"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.redis = void 0;
// === IMPORTS ===
var ioredis_1 = require("ioredis");
var env_js_1 = require("../config/env.js");
exports.redis = new ioredis_1.Redis(env_js_1.env.REDIS_URL, { maxRetriesPerRequest: null });
