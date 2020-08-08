import React from 'react'

import {Web3Provider} from '@chainsafe/web3-context'
import Wallet from './Wallet'

const App = () => (
  <Web3Provider
    networkIds={[1]}
    >
    <Wallet />
  </Web3Provider>
)
export default App
