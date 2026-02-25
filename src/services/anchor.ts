import { Program, AnchorProvider, setProvider } from "@coral-xyz/anchor";
import { Connection, PublicKey } from "@solana/web3.js";
import { SolanaPredict } from "@/types/solana_predict";
import idl from "@/lib/idl/solana_predict.json";
import { RPC_URL } from "@/lib/constants";

// Re-export IDL for convenience
export { idl };

// Connection config with timeout to prevent hanging requests
const CONNECTION_CONFIG = {
    commitment: 'confirmed' as const,
    confirmTransactionInitialTimeout: 30_000,
};

// Singleton cached connection — reused across all read-only calls
let _cachedConnection: Connection | null = null;
let _cachedReadOnlyProgram: Program<SolanaPredict> | null = null;

function getSharedConnection(): Connection {
    if (!_cachedConnection) {
        _cachedConnection = new Connection(RPC_URL, CONNECTION_CONFIG);
    }
    return _cachedConnection;
}

export const getProgram = (provider: AnchorProvider) => {
    setProvider(provider);
    // Anchor v0.30+ uses 2-arg constructor with IDL containing address
    return new Program(idl as unknown as SolanaPredict, provider) as Program<SolanaPredict>;
};

export const getProvider = (wallet: any) => {
    // If wallet is not connected, we can use a dummy wallet or throw
    if (!wallet) return null;

    const connection = getSharedConnection();
    return new AnchorProvider(connection, wallet, { preflightCommitment: "confirmed" });
};

// Read-only program (for fetching data without wallet) — singleton cached
export const getReadOnlyProgram = (): Program<SolanaPredict> => {
    if (_cachedReadOnlyProgram) return _cachedReadOnlyProgram;

    const connection = getSharedConnection();
    const wallet = {
        publicKey: PublicKey.default,
        signTransaction: async () => { throw new Error("Read-only") },
        signAllTransactions: async () => { throw new Error("Read-only") },
    };
    const provider = new AnchorProvider(connection, wallet as any, { preflightCommitment: "confirmed" });
    _cachedReadOnlyProgram = new Program(idl as unknown as SolanaPredict, provider) as Program<SolanaPredict>;
    return _cachedReadOnlyProgram;
};

