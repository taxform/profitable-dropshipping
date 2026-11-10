import Foundation

enum API {
    static let baseURL = URL(string: "https://skabbadeals.com")!

    static func fetchCatalog() async throws -> Catalog {
        let (data, response) = try await URLSession.shared.data(from: baseURL.appendingPathComponent("api/products"))
        guard let http = response as? HTTPURLResponse, (200..<300).contains(http.statusCode) else {
            throw URLError(.badServerResponse)
        }
        return try JSONDecoder().decode(Catalog.self, from: data)
    }

    /// Product images may be absolute (supplier CDN) or site-relative (/images/...).
    static func imageURL(_ path: String) -> URL? {
        if let url = URL(string: path), url.scheme != nil { return url }
        return URL(string: path, relativeTo: baseURL)?.absoluteURL
    }

    static func productPageURL(_ slug: String) -> URL {
        baseURL.appendingPathComponent("products/\(slug)")
    }
}
