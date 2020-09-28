import React from 'react';

import { useWeb3 } from '@chainsafe/web3-context';
import { ethers, providers } from 'ethers';

function networkName(id: any) {
  switch (Number(id)) {
    case 1:
      return 'main';
    case 3:
      return 'ropsten';
    case 4:
      return 'rinkeby';
    case 5:
      return 'goerli';
    case 42:
      return 'kovan';
    default:
      return 'localhost';
  }
}

const signMessage = async (
  message: string,
  provider: providers.Web3Provider
) => {
  const data = ethers.utils.toUtf8Bytes(message);
  const signer = await provider.getSigner();
  const addr = await signer.getAddress();
  const sig = await provider.send('personal_sign', [
    ethers.utils.hexlify(data),
    addr.toLowerCase(),
  ]);
  return sig;
};

const Wallet = () => {
  const {
    address,
    ethBalance,
    network,
    wallet,
    onboard,
    provider,
    isReady,
    checkIsReady,
    resetOnboard,
    selectCheckAndSign,
  } = useWeb3();

  return (
    <div>
      <main>
        <header className="user-info">
          {address && <span>{address}</span>}
          {ethBalance != null && <span>{ethBalance} ETH</span>}
          {network && <span>{networkName(network)} network</span>}
        </header>
        <section className="main">
          <div className="container">
            <h2>Onboarding Users with Onboard.js</h2>
            <div>
              {!wallet?.provider && (
                <>
                  <button
                    className="bn-demo-button"
                    onClick={() => {
                      onboard?.walletSelect();
                    }}
                  >
                    Select a Wallet
                  </button>
                  <button
                    className="bn-demo-button"
                    onClick={selectCheckAndSign}
                  >
                    Select check sign
                  </button>
                </>
              )}

              {wallet?.provider && !isReady && (
                <button className="bn-demo-button" onClick={checkIsReady}>
                  Wallet Checks
                </button>
              )}

              {wallet?.provider && (
                <button
                  className="bn-demo-button"
                  onClick={() => onboard?.walletSelect()}
                >
                  Switch Wallets
                </button>
              )}

              {provider && isReady && (
                <button
                  className="bn-demo-button"
                  onClick={() => signMessage('test', provider)}
                >
                  Sign message
                </button>
              )}

              {wallet?.provider && (
                <button className="bn-demo-button" onClick={resetOnboard}>
                  Reset Wallet State
                </button>
              )}

              {wallet?.provider && wallet?.dashboard && (
                <button className="bn-demo-button" onClick={wallet.dashboard}>
                  Open Wallet Dashboard
                </button>
              )}
              {wallet?.provider && wallet.type === 'hardware' && address && (
                <button
                  className="bn-demo-button"
                  onClick={onboard?.accountSelect}
                >
                  Switch Account
                </button>
              )}
            </div>
          </div>
        </section>
      </main>
    </div>
  );
};
export default Wallet;
