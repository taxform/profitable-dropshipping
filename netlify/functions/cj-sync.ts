import type { Config } from '@netlify/functions'
import { cjEnabled } from '../../lib/cj.js'
import { syncInventory, syncTracking } from '../../lib/sourcing.js'

// Supplier orders require the owner's explicit dashboard approval.
export default async () => {
  if (!cjEnabled()) return
  console.log('CJ inventory', await syncInventory())
  console.log('CJ tracking', await syncTracking(10))
}

export const config: Config = { schedule: '0 */2 * * *' }
