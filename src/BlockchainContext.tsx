import * as React from "react";
import { useState, useEffect } from "react";
import Onboard from "bnc-onboard";
import {
  API as OnboardApi,
  Wallet,
  Initialization,
} from "bnc-onboard/dist/src/interfaces";
import { providers, ethers } from "ethers";
import { formatEther } from "ethers/lib/utils";
import { Erc20 } from "./Erc20";

type ConfigSet = {
  contractAddress: string;
};

type AppConfig = {
  [networkId: number]: ConfigSet;
};

export type BlockchainContextProps = {
  onboardConfig: Partial<Initialization>;
  appConfig: AppConfig;
  ethGasStationApiKey?: string;
  gasPriceSetting: "safeLow" | "standard" | "fast" | "fastest" | "average";
  tokenAddresses: string[];
  children: React.ReactNode;
};

export type TokenInfo = {
  name: string;
  symbol: string;
  balance: string;
  approval: string;
};

export type BlockchainContext = {
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
  tokens: TokenInfo[];
};

const OnboardContext = React.createContext<BlockchainContext | undefined>(
  undefined
);

function OnboardProvider({
  children,
  onboardConfig,
  appConfig,
  ethGasStationApiKey,
  gasPriceSetting = "fast",
  tokenAddresses,
}: BlockchainContextProps) {
  const [address, setAddress] = useState<string | undefined>(undefined);
  const [provider, setProvider] = useState<providers.BaseProvider | undefined>(
    undefined
  );
  const [network, setNetwork] = useState<number | undefined>(undefined);
  const [ethBalance, setEthBalance] = useState<number | undefined>(undefined);
  const [wallet, setWallet] = useState<Wallet | undefined>(undefined);
  const [onboard, setOnboard] = useState<OnboardApi | undefined>(undefined);
  const [isReady, setIsReady] = useState<boolean>(false);
  const [tokens, setTokens] = useState<Array<TokenInfo>>([]);
  const [gasPrice, setGasPrice] = useState(0);

  const validNetworks = Object.keys(appConfig).map((network) =>
    Number(network)
  );

  useEffect(() => {
    const initializeOnboard = async () => {
      try {
        const onboard = Onboard({
          ...onboardConfig,
          networkId: validNetworks[0],
          subscriptions: {
            ...onboardConfig.subscriptions,
            address: (address) => {
              setAddress(address);
              checkIsReady();
            },
            wallet: (wallet: Wallet) => {
              if (wallet.provider) {
                wallet.name &&
                  localStorage.setItem("onboard.selectedWallet", wallet.name);
                setWallet(wallet);
                setProvider(new ethers.providers.Web3Provider(wallet.provider));
              } else {
                setWallet(undefined);
              }
            },
            network: (network) => {
              if (validNetworks.includes(network)) {
                onboard.config({ networkId: network });
              }
              setNetwork(network);
              checkIsReady();
            },
            balance: (balance) => {
              console.log("Balance has been changed: ", balance);
              try {
                const bal = Number(formatEther(balance));
                !isNaN(bal) ? setEthBalance(bal) : setEthBalance(0);
              } catch (error) {
                setEthBalance(0);
              }
            },
          },
        });

        const savedWallet = localStorage.getItem("onboard.selectedWallet");
        savedWallet && onboard.walletSelect(savedWallet);

        setOnboard(onboard);
        setEthBalance(Number(formatEther(onboard.getState().balance)));
      } catch (error) {
        console.log("Error initializing onboard");
        console.log(error);
      }
    };

    initializeOnboard();
  }, []);

  const checkIsReady = async () => {
    const isReady = await onboard?.walletCheck();
    setIsReady(!!isReady);
    if (!isReady) {
      setEthBalance(0);
    }
    return !!isReady;
  };

  const resetOnboard = () => {
    localStorage.setItem("onboard.selectedWallet", "");
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
          await fetch("https://www.etherchain.org/api/gasPriceOracle")
        ).json();
        gasPrice = etherchainResponse[gasPriceSetting];
      }

      const newGasPrice = !isNaN(Number(gasPrice)) ? Number(gasPrice) : 65;
      console.log(`Settings new gas price ${newGasPrice} gwei`);
      setGasPrice(newGasPrice);
    } catch (error) {
      console.log(error);
      console.log("Using 65 gwei as default");
      setGasPrice(65);
    }
  };

  // Gas Price poller
  useEffect(() => {
    if ((network || validNetworks[0]) === 1) {
      console.log("Starting Gas Price Poller");
      const getGasPrice = refreshGasPrice;

      let poller: NodeJS.Timeout;
      getGasPrice();
      poller = setInterval(getGasPrice, 60000);
      return () => {
        clearInterval(poller);
      };
    } else {
      console.log("You are not using mainnet. Defaulting to 10 gwei");
      setGasPrice(10);
    }
  }, []);

  useEffect(() => {
    const checkBalanceAndApproval = async (token: Erc20) => {
      if (address) {
        const balance = token.balanceOf(address);
        const allowance = token.allowance(address, '0x');
      }
    };
    if (address && tokenAddresses.length > 0) {
      const erc20Abi = [
        "function transfer(address to, uint256 value) returns (bool)",
        "function approve(address spender, uint256 value) returns (bool)",
        "function transferFrom(address from, address to, uint256 value) returns (bool)",
        "function totalSupply() view returns (uint256)",
        "function balanceOf(address who) view returns (uint256)",
        "function allowance(address owner, address spender) view returns (uint256)",
        "event Transfer(address indexed from, address indexed to, uint256 value)",
        "event Approval(address indexed owner, address indexed spender, uint256 value)"
      ];
      tokenAddresses.forEach((tokenAddress) => {
        const tokenContract = new Erc20(tokenAddress, erc20Abi, provider);
        checkBalanceAndApproval(tokenContract);

        const filterTokenApproval = tokenContract.filters.Approval(address, null, null) // TODO Update this to be the spender address
        const filterTokenTransferFrom = tokenContract.filters.Transfer(address, null, null);
        const filterTokenTransferTo = tokenContract.filters.Transfer(null, address, null);

        tokenContract.on(filterTokenApproval, () => checkBalanceAndApproval(tokenContract))
        tokenContract.on(filterTokenTransferFrom, () => checkBalanceAndApproval(tokenContract))
        tokenContract.on(filterTokenTransferTo, () => checkBalanceAndApproval(tokenContract))
      });

      return () => {
        // TODO: Figure out the cleanup function to be called here
        // tokenContract.removeAllListeners(filterPaymentTokenApproval);
      };
    }
  }, [network]);

  const onboardState = onboard?.getState();

  return (
    <OnboardContext.Provider
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
        tokens: [],
      }}
    >
      {children}
    </OnboardContext.Provider>
  );
}

function useOnboard() {
  const context = React.useContext(OnboardContext);
  if (context === undefined) {
    throw new Error("useOnboard must be used within a OnboardProvider");
  }
  return context;
}

export { OnboardProvider, useOnboard };
