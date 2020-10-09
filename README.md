# Web3-Context

A React Context wrapper for Blocknative OnbardJS

## How to use

Wrap you application in a

```
<Web3Provider networkIds={[1]}>
    {YOUR APP CODE}
</Web3Provider>
```

The following props can be passed in to configure the Web3 Provider:

```
  onboardConfig?: OnboardConfig; // The OnboardJS Configuration object - See [here](https://docs.blocknative.com/onboard#built-in-modules)
  networkIds: number[];
  ethGasStationApiKey?: string;
  gasPricePollingInterval?: number; // Seconds between gas price polls. Defaults to 0 - Disabled
  gasPriceSetting?: EthGasStationSettings | EtherchainGasSettings;
  tokenAddresses?: string[];
  spenderAddress?: string;
  saveWalletSelect: boolean; // Whether the user's wallet selection should be cached
  children: React.ReactNode;
```

Anywhere further down the component tree, use:

```
  const {address} = useWeb3();
```

Take a look at the `example` folder for a basic implementation of the components.

### Happy Building ♡
