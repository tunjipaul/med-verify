"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.normalizeCallUpNumber = normalizeCallUpNumber;
exports.isValidCallUpFormat = isValidCallUpFormat;
exports.normalizeNin = normalizeNin;
exports.isValidNin = isValidNin;
const CALL_UP_PATTERN = /^NYSC-[A-Z]{2,4}-\d{4}-\d{6}$/;
function normalizeCallUpNumber(raw) {
    return raw
        .trim()
        .toUpperCase()
        .replace(/\s+/g, "")
        .replace(/\//g, "-");
}
function isValidCallUpFormat(normalized) {
    return CALL_UP_PATTERN.test(normalized);
}
function normalizeNin(raw) {
    return raw.replace(/\D/g, "").slice(0, 11);
}
function isValidNin(nin) {
    return /^\d{11}$/.test(nin);
}
//# sourceMappingURL=call-up-number.js.map