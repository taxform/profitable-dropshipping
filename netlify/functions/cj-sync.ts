import type { Config } from '@netlify/functions'
import { cjEnabled } from '../../lib/cj.js'
import { forwardOrder, syncTracking, unforwardedOrders } from '../../lib/sourcing.js'

// Every 2 hours: retry paid orders that didn't reach CJ, then pull tracking numbers for open ones.
export default async () => {
  if (!cjEnabled()) return
  for (const o of await unforwardedOrders(4)) {
    await forwardOrder(o.publicId).catch((e) => console.error('CJ forward', o.publicId, e.message))
  }
  console.log('CJ tracking', await syncTracking(10))
}

export const config: Config = { schedule: '0 */2 * * *' }
