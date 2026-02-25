'use client';

import { useMemo } from 'react';
import { useAnchorWallet, useConnection } from '@solana/wallet-adapter-react';
import { Program, AnchorProvider, Idl } from '@coral-xyz/anchor';
import { SolanaPredict } from '@/types/solana_predict';
import IDL from '@/lib/idl/solana_predict.json';
import { PublicKey } from '@solana/web3.js';
import { PROGRAM_ID } from '@/lib/constants';

export function useProgram() {
    const { connection } = useConnection();
    const wallet = useAnchorWallet();

    const provider = useMemo(() => {
        if (!wallet) return null;
        return new AnchorProvider(connection, wallet, {
            preflightCommitment: 'confirmed',
        });
    }, [connection, wallet]);

    const program = useMemo(() => {
        if (!provider) return null;

        // Fallback if PROGRAM_ID is missing for dev logic
        const programId = PROGRAM_ID ? new PublicKey(PROGRAM_ID) : PublicKey.default;

        return new Program(IDL as unknown as Idl, provider);
    }, [provider]);

    return { program, provider };
}
