import * as React from 'react';
import { useState, useEffect } from 'react';
import Onboard from 'bnc-onboard';
import {
  API as OnboardApi,
  Wallet,
  Initialization,
} from 'bnc-onboard/dist/src/interfaces';
import { providers, ethers, BigNumber } from 'ethers';
import { formatEther } from '@ethersproject/units';
import { Erc20DetailedFactory } from '../interfaces/Erc20DetailedFactory';
import { Erc20Detailed } from '../interfaces/Erc20Detailed';

export type OnboardConfig = Partial<
  Omit<Initialization, 'subscriptions' | 'networkId'>
>;

type EthGasStationSettings = 'fast' | 'fastest' | 'safeLow' | 'average';
type EtherchainSettings = 'safeLow' | 'standard' | 'fast' | 'fastest';

type Web3ContextProps = {
  onboardConfig?: OnboardConfig;
  networkIds: number[];
  ethGasStationApiKey?: string;
  gasPriceSetting?: EthGasStationSettings | EtherchainSettings;
  tokenAddresses?: string[];
  spenderAddress?: string;
  children: React.ReactNode;
};

type TokenInfo = {
  name?: string;
  symbol?: string;
  decimals: number;
  balance: number;
  allowance?: number;
};

type Tokens = {
  [address: string]: TokenInfo;
};

type Web3Context = {
  onboard?: OnboardApi;
  provider?: providers.BaseProvider;
  address?: string;
  network?: number;
  ethBalance?: number;
  wallet?: Wallet;
  isReady: boolean;
  checkIsReady(): Promise<boolean>;
  resetOnboard(): void;
  gasPrice: number;
  refreshGasPrice(): Promise<void>;
  isMobile: boolean;
  tokens: Tokens;
};

const Web3Context = React.createContext<Web3Context | undefined>(undefined);

const Web3Provider = ({
  children,
  onboardConfig,
  networkIds,
  ethGasStationApiKey,
  gasPriceSetting = 'fast',
  tokenAddresses = [],
  spenderAddress,
}: Web3ContextProps) => {
  const [address, setAddress] = useState<string | undefined>(undefined);
  const [provider, setProvider] = useState<providers.BaseProvider | undefined>(
    undefined
  );
  const [network, setNetwork] = useState<number | undefined>(undefined);
  const [ethBalance, setEthBalance] = useState<number | undefined>(undefined);
  const [wallet, setWallet] = useState<Wallet | undefined>(undefined);
  const [onboard, setOnboard] = useState<OnboardApi | undefined>(undefined);
  const [isReady, setIsReady] = useState<boolean>(false);
  const [tokens, setTokens] = useState<Tokens>({});
  const [gasPrice, setGasPrice] = useState(0);

  // Initialize OnboardJS
  useEffect(() => {
    const initializeOnboard = async () => {
      try {
        const onboard = Onboard({
          ...onboardConfig,
          networkId: networkIds[0],
          subscriptions: {
            address: (address) => {
              setAddress(address);
              checkIsReady();
            },
            wallet: (wallet: Wallet) => {
              if (wallet.provider) {
                wallet.name &&
                  localStorage.setItem('onboard.selectedWallet', wallet.name);
                setWallet(wallet);
                setProvider(new ethers.providers.Web3Provider(wallet.provider));
              } else {
                setWallet(undefined);
              }
            },
            network: (network) => {
              if (networkIds.includes(network)) {
                onboard.config({ networkId: network });
              }
              setNetwork(network);
              checkIsReady();
            },
            balance: (balance) => {
              console.log('Balance has been changed: ', balance);
              try {
                const bal = Number(formatEther(balance));
                !isNaN(bal) ? setEthBalance(bal) : setEthBalance(0);
              } catch (error) {
                setEthBalance(0);
              }
            },
          },
        });

        const savedWallet = localStorage.getItem('onboard.selectedWallet');
        savedWallet && onboard.walletSelect(savedWallet);

        setOnboard(onboard);

        //setEthBalance(Number(formatEther(onboard.getState().balance)))
      } catch (error) {
        console.log('Error initializing onboard');
        console.log(error);
      }
    };

    initializeOnboard();
  }, []);

  // Gas Price poller
  useEffect(() => {
    let poller: NodeJS.Timeout;
    if ((network || networkIds[0]) === 1) {
      console.log('Starting Gas Price Poller');
      const getGasPrice = refreshGasPrice;

      getGasPrice();
      poller = setInterval(getGasPrice, 60000);
    } else {
      console.log('You are not using mainnet. Defaulting to 10 gwei');
      setGasPrice(10);
    }
    return () => {
      if (poller) {
        clearInterval(poller);
      }
    };
  }, [network]);

  // Token balance and allowance listener
  useEffect(() => {
    const checkBalanceAndAllowance = async (
      token: Erc20Detailed,
      decimals: number
    ) => {
      if (address) {
        const balance = Number(
          BigNumber.from(await token.balanceOf(address))
            .div(decimals)
            .toString()
        );
        var allowance = 0;
        if (spenderAddress) {
          allowance = Number(
            BigNumber.from(await await token.allowance(address, spenderAddress))
              .div(decimals)
              .toString()
          );
        } else {
          console.log('No spender address provided. Unable to get allowance.');
        }
        const newTokens = tokens;
        newTokens[token.address] = {
          ...newTokens[token.address],
          balance: balance,
          allowance: allowance,
        };

        setTokens(newTokens);
      }
    };

    let tokenContracts: Array<Erc20Detailed> = [];
    if (provider && address && tokenAddresses.length > 0) {
      tokenAddresses.forEach(async (tokenAddress) => {
        const tokenContract = Erc20DetailedFactory.connect(
          tokenAddress,
          provider
        );

        const newTokenInfo: TokenInfo = {
          decimals: 0,
          balance: 0,
        };

        try {
          const tokenName = await tokenContract.name();
          newTokenInfo.name = tokenName;
        } catch (error) {
          console.log(
            'There was an error getting the token name. Does this contract implement ERC20Detailed?'
          );
        }
        try {
          const tokenSymbol = await tokenContract.symbol();
          newTokenInfo.symbol = tokenSymbol;
        } catch (error) {
          console.log(
            'There was an error getting the token symbol. Does this contract implement ERC20Detailed?'
          );
        }

        try {
          const tokenDecimals = await tokenContract.decimals();
          newTokenInfo.decimals = tokenDecimals;
        } catch (error) {
          console.log(
            'There was an error getting the decimals. Does this contract implement ERC20Detailed?'
          );
        }
        const newTokens = tokens;
        newTokens[tokenAddress] = {
          ...newTokenInfo,
        };

        setTokens(newTokens);

        checkBalanceAndAllowance(tokenContract, newTokenInfo.decimals);

        // This filter is intentionally left quite loose.
        const filterTokenApproval = tokenContract.filters.Approval(
          address,
          null,
          null
        );
        const filterTokenTransferFrom = tokenContract.filters.Transfer(
          address,
          null,
          null
        );
        const filterTokenTransferTo = tokenContract.filters.Transfer(
          null,
          address,
          null
        );

        tokenContract.on(filterTokenApproval, () =>
          checkBalanceAndAllowance(tokenContract, newTokenInfo.decimals)
        );
        tokenContract.on(filterTokenTransferFrom, () =>
          checkBalanceAndAllowance(tokenContract, newTokenInfo.decimals)
        );
        tokenContract.on(filterTokenTransferTo, () =>
          checkBalanceAndAllowance(tokenContract, newTokenInfo.decimals)
        );
        tokenContracts.push(tokenContract);
      });
    }
    return () => {
      if (tokenContracts.length > 0) {
        tokenContracts.forEach((tc) => tc.removeAllListeners());
      }
    };
  }, [network, address]);

  const checkIsReady = async () => {
    const isReady = await onboard?.walletCheck();
    setIsReady(!!isReady);
    if (!isReady) {
      setEthBalance(0);
    }
    return !!isReady;
  };

  const resetOnboard = () => {
    localStorage.setItem('onboard.selectedWallet', '');
    setIsReady(false);
    onboard?.walletReset();
  };

  const refreshGasPrice = async () => {
    try {
      let gasPrice;
      if (ethGasStationApiKey) {
        const ethGasStationResponse = await (
          await fetch(
            `https://ethgasstation.info/api/ethgasAPI.json?api-key=${process.env.REACT_APP_ETH_GAS_STATION_API_KEY}`
          )
        ).json();
        gasPrice = ethGasStationResponse[gasPriceSetting] / 10;
      } else {
        const etherchainResponse = await (
          await fetch('https://www.etherchain.org/api/gasPriceOracle')
        ).json();
        gasPrice = Number(etherchainResponse[gasPriceSetting]);
      }

      const newGasPrice = !isNaN(Number(gasPrice)) ? Number(gasPrice) : 65;
      setGasPrice(newGasPrice);
    } catch (error) {
      console.log(error);
      console.log('Using 65 gwei as default');
      setGasPrice(65);
    }
  };

  const onboardState = onboard?.getState();

  return (
    <Web3Context.Provider
      value={{
        address: address,
        provider,
        network: network,
        ethBalance: ethBalance,
        wallet: wallet,
        onboard: onboard,
        isReady: isReady,
        checkIsReady,
        resetOnboard,
        gasPrice,
        refreshGasPrice,
        isMobile: !!onboardState?.mobileDevice,
        tokens: tokens,
      }}
    >
      {children}
    </Web3Context.Provider>
  );
};

const useWeb3 = () => {
  const context = React.useContext(Web3Context);
  if (context === undefined) {
    throw new Error('useOnboard must be used within a OnboardProvider');
  }
  return context;
};

export { Web3Provider, useWeb3 };
