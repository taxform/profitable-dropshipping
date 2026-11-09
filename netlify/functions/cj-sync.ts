import type { Config } from '@netlify/functions'
import { cjEnabled } from '../../lib/cj.js'
import { syncTracking } from '../../lib/sourcing.js'

// Manual supplier approval remains required. The admin dashboard decides when a paid order is sent to CJ.
// This scheduled task only refreshes tracking on orders already approved and forwarded.
export default async () => {
  if (!cjEnabled()) return
  console.log('CJ tracking', await syncTracking(10))
}

export const config: Config = { schedule: '0 */2 * * *' }
