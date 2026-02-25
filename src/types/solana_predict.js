"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.IDL = void 0;
exports.IDL = {
    "version": "0.1.0",
    "name": "solana_predict",
    "instructions": [
        {
            "name": "createMarket",
            "accounts": [
                { "name": "market", "isMut": true, "isSigner": false },
                { "name": "creator", "isMut": true, "isSigner": true },
                { "name": "systemProgram", "isMut": false, "isSigner": false }
            ],
            "args": [
                { "name": "title", "type": "string" },
                { "name": "description", "type": "string" },
                { "name": "endTimestamp", "type": "i64" }
            ]
        },
        {
            "name": "placeBet",
            "accounts": [
                { "name": "market", "isMut": true, "isSigner": false },
                { "name": "user", "isMut": true, "isSigner": true },
                { "name": "userPosition", "isMut": true, "isSigner": false },
                { "name": "vault", "isMut": true, "isSigner": false },
                { "name": "systemProgram", "isMut": false, "isSigner": false }
            ],
            "args": [
                { "name": "outcome", "type": { "defined": "Outcome" } },
                { "name": "amount", "type": "u64" }
            ]
        }
    ],
    "accounts": [
        {
            "name": "Market",
            "type": {
                "kind": "struct",
                "fields": [
                    { "name": "id", "type": "u64" },
                    { "name": "title", "type": "string" },
                    { "name": "yesPrice", "type": "u64" },
                    { "name": "noPrice", "type": "u64" }
                ]
            }
        }
    ],
    "types": [
        {
            "name": "Outcome",
            "type": {
                "kind": "enum",
                "variants": [
                    { "name": "Yes" },
                    { "name": "No" }
                ]
            }
        }
    ]
};
//# sourceMappingURL=solana_predict.js.map