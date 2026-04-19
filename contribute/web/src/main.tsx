import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { ConnectionProvider, WalletProvider } from '@solana/wallet-adapter-react'
import { WalletModalProvider } from '@solana/wallet-adapter-react-ui'
import { PhantomWalletAdapter, SolflareWalletAdapter } from '@solana/wallet-adapter-wallets'
import { clusterApiUrl } from '@solana/web3.js'
import App from './App'
import './index.css'
import '@solana/wallet-adapter-react-ui/styles.css'

const endpoint = clusterApiUrl('devnet')
const wallets = [new PhantomWalletAdapter(), new SolflareWalletAdapter()]

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <ConnectionProvider endpoint={endpoint}>
        <WalletProvider wallets={wallets} autoConnect>
          <WalletModalProvider>
            <App />
          </WalletModalProvider>
        </WalletProvider>
      </ConnectionProvider>
    </BrowserRouter>
  </StrictMode>
)
