// Fallback: simple SPL token mint for demo if Anchor isn't available
// Usage: npx ts-node fallback-mint.ts <recipient-pubkey> <amount>
import { Connection, Keypair, PublicKey, clusterApiUrl } from '@solana/web3.js'
import { createMint, mintTo, getOrCreateAssociatedTokenAccount } from '@solana/spl-token'
import * as fs from 'fs'

async function main() {
  const recipient = new PublicKey(process.argv[2])
  const amount = parseInt(process.argv[3]) * 1_000_000 // 6 decimals

  const connection = new Connection(clusterApiUrl('devnet'), 'confirmed')

  // Load or create mint authority keypair
  let authority: Keypair
  const keyPath = './mint-authority.json'
  if (fs.existsSync(keyPath)) {
    authority = Keypair.fromSecretKey(Uint8Array.from(JSON.parse(fs.readFileSync(keyPath, 'utf-8'))))
  } else {
    authority = Keypair.generate()
    fs.writeFileSync(keyPath, JSON.stringify(Array.from(authority.secretKey)))
    console.log('Created mint authority:', authority.publicKey.toBase58())
    console.log('Fund it: solana airdrop 2', authority.publicKey.toBase58())
    return
  }

  // Create or load mint
  const mintPath = './mint-address.json'
  let mintAddress: PublicKey
  if (fs.existsSync(mintPath)) {
    mintAddress = new PublicKey(JSON.parse(fs.readFileSync(mintPath, 'utf-8')))
  } else {
    mintAddress = await createMint(connection, authority, authority.publicKey, null, 6)
    fs.writeFileSync(mintPath, JSON.stringify(mintAddress.toBase58()))
    console.log('Created $ASTRO mint:', mintAddress.toBase58())
  }

  const tokenAccount = await getOrCreateAssociatedTokenAccount(connection, authority, mintAddress, recipient)
  await mintTo(connection, authority, mintAddress, tokenAccount.address, authority, amount)
  console.log(`Minted ${amount / 1_000_000} $ASTRO to ${recipient.toBase58()}`)
}

main().catch(console.error)
