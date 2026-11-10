// Stock is limited to China because supplier freight and orders ship from CN.
export function chinaStock(data: unknown): number {
  if (!Array.isArray(data)) throw new Error('CJ returned invalid inventory data')
  return data.filter((row) => row.countryCode === 'CN').reduce((total, row) => {
    const quantity = Number(row.totalInventoryNum ?? row.storageNum)
    if (!Number.isSafeInteger(quantity) || quantity < 0) throw new Error('CJ returned invalid inventory quantity')
    return total + quantity
  }, 0)
}
