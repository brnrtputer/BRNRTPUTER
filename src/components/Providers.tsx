'use client';

import { PrivyProvider } from '@privy-io/react-auth';
import { toSolanaWalletConnectors } from '@privy-io/react-auth/solana';

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <PrivyProvider
      appId={process.env.NEXT_PUBLIC_PRIVY_APP_ID || ''}
      config={{
        appearance: {
          walletChainType: 'solana-only',
          logo: '/brnrtputer.png',
          showWalletLoginFirst: true
        },
        loginMethods: ['wallet'],
        embeddedWallets: {
          solana: {
            createOnLogin: 'users-without-wallets'
          }
        },
        externalWallets: {
          solana: {
            connectors: toSolanaWalletConnectors()
          }
        }
      }}
    >
      {children}
    </PrivyProvider>
  );
}
