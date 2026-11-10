import Foundation

struct Catalog: Decodable {
    let products: [Product]
    let offers: Offers
}

struct Offers: Decodable {
    let freeShippingThreshold: Int
    let shippingFlat: Int
}

struct Product: Decodable, Identifiable, Hashable {
    let slug: String
    let name: String
    let tagline: String
    let description: String
    let bullets: [String]
    let category: String
    let price: Int        // cents
    let compareAt: Int?   // cents, only set when higher than price
    let image: String
    let shipsIn: String
    let inventory: Int?

    var id: String { slug }
}

func formatCents(_ cents: Int) -> String {
    let f = NumberFormatter()
    f.numberStyle = .currency
    f.currencyCode = "USD"
    return f.string(from: NSNumber(value: Double(cents) / 100)) ?? "$\(cents / 100)"
}
