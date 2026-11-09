export type Product = {
  slug: string
  name: string
  tagline: string
  description: string
  bullets: string[]
  category: 'Prep' | 'Cook' | 'Brew' | 'Organize'
  price: number // cents
  compareAt: number // cents, typical high-street price for comparable items
  cost: number // cents, landed supplier cost
  inventory?: number // live supplier stock when linked to CJ
  image: string
  supplier: { name: string; sku: string; url: string; vid?: string | null }
  shipsIn: string
  cjQuery: string // search used to find the matching CJdropshipping listing
  linked?: boolean // true once a real CJ variant supplies this product
}

const SUPPLIER = 'CJdropshipping'

export const PRODUCTS: Product[] = [
