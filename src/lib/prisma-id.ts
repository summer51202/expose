export function toPrismaBigInt(value: number): bigint {
  return BigInt(value);
}

export function fromPrismaBigInt(value: bigint | null | undefined): number | null {
  if (value == null) {
    return null;
  }

  return Number(value);
}
