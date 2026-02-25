import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useWallet } from '@solana/wallet-adapter-react';
import { useConnection } from '@solana/wallet-adapter-react';
import { getProgram, getProvider } from '@/services/anchor';
import { BN } from '@coral-xyz/anchor';
import { PublicKey } from '@solana/web3.js';
import { toast } from 'sonner';
import { indexTransaction } from '@/lib/api';
import { pubkeyToFeedId, HERMES_ENDPOINT } from '@/lib/pyth-feeds';

/**
 * Pyth Pull Oracle resolution hook.
 *
 * Flow:
 * 1. Fetches the latest price VAA from Hermes for the market's oracle feed
 * 2. Posts the price update to the Pyth Receiver program on-chain (creates PriceUpdateV2 account)
 * 3. Calls our `resolve_market_oracle` instruction with the PriceUpdateV2 account
 *
 * This is permissionless — any wallet can crank it after end_timestamp.
 */
export function usePythResolve() {
    const wallet = useWallet();
    const { connection } = useConnection();
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({
            marketId,
            oracleFeed, // base58 pubkey (stores Pyth feed ID bytes)
        }: {
            marketId: string;
            oracleFeed: string;
        }) => {
            if (!wallet.publicKey || !wallet.signTransaction || !wallet.signAllTransactions) {
                throw new Error("Wallet not connected");
            }

            const provider = getProvider(wallet as any);
            if (!provider) throw new Error("Provider not available");
            const program = getProgram(provider);

            // 1. Convert oracle_feed pubkey to hex feed ID
            const feedIdHex = pubkeyToFeedId(new PublicKey(oracleFeed));

            // 2. Fetch latest price update from Hermes
            const hermesUrl = `${HERMES_ENDPOINT}/v2/updates/price/latest?ids[]=0x${feedIdHex}&encoding=base64`;
            const hermesRes = await fetch(hermesUrl);
            if (!hermesRes.ok) throw new Error(`Hermes API error: ${hermesRes.status}`);
            const hermesData = await hermesRes.json();

            const parsed = hermesData.parsed?.[0];
            if (!parsed) throw new Error("No price data returned from Hermes");

            const priceInfo = parsed.price;
            console.log(`Hermes price: ${priceInfo.price} (expo: ${priceInfo.expo}), publish_time: ${priceInfo.publish_time}`);

            // 3. Build the transaction using PythSolanaReceiver
            const { PythSolanaReceiver } = await import('@pythnetwork/pyth-solana-receiver');

            const pythReceiver = new PythSolanaReceiver({
                connection,
                wallet: {
                    publicKey: wallet.publicKey,
                    signTransaction: wallet.signTransaction,
                    signAllTransactions: wallet.signAllTransactions,
                } as any, // Cast needed: Anchor Wallet type requires `payer` but it's unused at runtime
            });

            const mid = new BN(marketId);
            const [marketPda] = PublicKey.findProgramAddressSync(
                [Buffer.from("market"), mid.toArrayLike(Buffer, "le", 8)],
                program.programId
            );

            // Build transaction: post price update + resolve
            const builder = pythReceiver.newTransactionBuilder({
                closeUpdateAccounts: true, // clean up the PriceUpdateV2 account after use (save rent)
            });

            // Add the Hermes VAA posting instruction(s)
            await builder.addPostPriceUpdates(hermesData.binary.data);

            // Add our resolve instruction that consumes the posted price
            await builder.addPriceConsumerInstructions(
                async (getPriceUpdateAccount: (feedId: string) => PublicKey) => {
                    const priceFeedAccount = getPriceUpdateAccount(`0x${feedIdHex}`);

                    const ix = await program.methods
                        .resolveMarketOracle(mid)
                        .accounts({
                            pythPriceFeed: priceFeedAccount,
                        } as any)
                        .instruction();

                    return [{
                        instruction: ix,
                        signers: [],
                        computeUnits: 200_000,
                    }];
                }
            );

            // 4. Build and send legacy transactions
            const txsWithSigners = builder.buildLegacyTransactions({
                computeUnitPriceMicroLamports: 50_000,
                tightComputeBudget: true,
            });

            // Sign and send each transaction
            const signatures: string[] = [];
            for (const { tx, signers } of txsWithSigners) {
                // Set recent blockhash and fee payer
                const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash('confirmed');
                tx.recentBlockhash = blockhash;
                tx.feePayer = wallet.publicKey;

                // Sign with any additional keypair signers (e.g., PriceUpdateV2 account)
                if (signers.length > 0) {
                    tx.partialSign(...signers);
                }

                // Sign with wallet
                const signedTx = await wallet.signTransaction(tx);

                // Send
                const sig = await connection.sendRawTransaction(signedTx.serialize(), {
                    skipPreflight: true,
                    maxRetries: 3,
                });

                // Confirm
                await connection.confirmTransaction({
                    signature: sig,
                    blockhash,
                    lastValidBlockHeight,
                }, 'confirmed');

                signatures.push(sig);
            }

            return {
                signatures,
                priceInfo: {
                    price: priceInfo.price,
                    expo: priceInfo.expo,
                    publishTime: priceInfo.publish_time,
                },
            };
        },
        onSuccess: (data) => {
            const { signatures, priceInfo } = data;
            const priceStr = (Number(priceInfo.price) * Math.pow(10, priceInfo.expo)).toFixed(2);
            toast.success(`Market resolved by Pyth oracle! Price: $${priceStr}`);
            console.log("Oracle Resolve Txs:", signatures);
            // Index the last transaction (contains our resolve instruction)
            if (signatures.length > 0) {
                indexTransaction(signatures[signatures.length - 1]);
            }
            queryClient.invalidateQueries({ queryKey: ['markets'] });
            queryClient.invalidateQueries({ queryKey: ['market'] });
        },
        onError: (error) => {
            console.error("Pyth resolve error:", error);
            toast.error("Failed to resolve market: " + error.message);
        }
    });
}
