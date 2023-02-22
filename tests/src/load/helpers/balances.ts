/* eslint-disable @typescript-eslint/naming-convention */
export function UNQ(tokens: bigint) {
  return tokens * (10n ** 18n);
}

export function DOT(tokens: bigint) {
  return tokens * (10n ** 12n);
}