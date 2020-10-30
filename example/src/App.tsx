import React from 'react';

import { Web3Provider } from '@chainsafe/web3-context';
import Wallet from './Wallet';

const App = () => (
  <Web3Provider
    networkIds={[5, 6]}
    tokensToWatch={{
      5: [
        {
          address: '0x14dd060db55c0e7cc072bd3ab4709d55583119c0',
          name: 'TEST Goerli',
          symbol: 'TSTG',
        },
      ],
      6: [
        {
          address: '0x14dd060db55c0e7cc072bd3ab4709d55583119c0',
          name: 'TEST Kotti',
          symbol: 'TSTK',
        },
      ],
    }}
  >
    <Wallet />
  </Web3Provider>
);
export default App;
