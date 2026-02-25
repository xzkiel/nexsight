import { useMemo } from 'react';
import { useConnection } from '@solana/wallet-adapter-react';
import { Program, AnchorProvider, Idl, Wallet } from '@coral-xyz/anchor';
import { Keypair, PublicKey } from '@solana/web3.js';
import { PROGRAM_ID } from '@/lib/constants';
import IDL from '@/lib/idl/solana_predict.json';

// Dummy wallet for read-only access
const READ_ONLY_WALLET: Wallet = {
    publicKey: Keypair.generate().publicKey,
    signTransaction: async (tx) => {
        throw new Error("Read-only execution cannot sign transactions");
    },
    signAllTransactions: async (txs) => {
        throw new Error("Read-only execution cannot sign transactions");
    },
    payer: Keypair.generate(), // Dummy payer
};

export function useReadOnlyProgram() {
    const { connection } = useConnection();

    const program = useMemo(() => {
        const provider = new AnchorProvider(connection, READ_ONLY_WALLET, {
            preflightCommitment: 'confirmed',
        });

        const programId = PROGRAM_ID ? new PublicKey(PROGRAM_ID) : PublicKey.default;

        // Cast IDL to unknown then Idl to avoid strict type checks against the JSON
        return new Program(IDL as unknown as Idl, provider);
    }, [connection]);

    return program;
}
