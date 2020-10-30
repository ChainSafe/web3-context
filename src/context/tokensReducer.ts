export type TokenInfo = {
  name?: string;
  symbol?: string;
  decimals: number;
  balance: number;
  allowance?: number;
  imageUri?: string;
};

export type Tokens = {
  [address: string]: TokenInfo;
};
export function tokensReducer(
  tokens: Tokens,
  action:
    | { type: 'addToken'; payload: { id: string; token: TokenInfo } }
    | { type: 'resetTokens' }
    | {
        type: 'updateTokenBalanceAllowance';
        payload: { id: string; balance: number; allowance: number };
      }
) {
  switch (action.type) {
    case 'addToken':
      return {
        ...tokens,
        [action.payload.id]: { ...action.payload.token },
      };
    case 'updateTokenBalanceAllowance':
      return {
        ...tokens,
        [action.payload.id]: {
          ...tokens[action.payload.id],
          balance: action.payload.balance,
          allowance: action.payload.allowance,
        },
      };
    case 'resetTokens':
      return {};
    default:
      return tokens;
  }
}