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
  networkIds: number[]; // The Networks that the app is designed to work with
  ethGasStationApiKey?: string;
  gasPricePollingInterval?: number;
  gasPriceSetting?: EthGasStationSettings | EtherchainGasSettings;
  tokenAddresses?: string[];
  spenderAddress?: string;
```

Anywhere further down the ocmponent tree, use:

```
  const {address} = useWeb3();
```

Take a look at the `example` folder for a basic implementation of the components.

### Happy Building ♡
