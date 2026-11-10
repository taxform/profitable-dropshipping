import SwiftUI
import Kingfisher

@MainActor
final class CatalogModel: ObservableObject {
    @Published var catalog: Catalog?
    @Published var error: String?

    func load() async {
        do {
            catalog = try await API.fetchCatalog()
            error = nil
        } catch {
            self.error = error.localizedDescription
        }
    }
}

struct ProductListView: View {
    @StateObject private var model = CatalogModel()

    var body: some View {
        NavigationStack {
            Group {
                if let catalog = model.catalog {
                    List {
                        Section {
                            ForEach(catalog.products) { product in
                                NavigationLink(value: product) { ProductRow(product: product) }
                            }
                        } footer: {
                            Text("Free shipping on orders over \(formatCents(catalog.offers.freeShippingThreshold)).")
                        }
                    }
                    .navigationDestination(for: Product.self) { ProductDetailView(product: $0) }
                } else if let error = model.error {
                    ContentUnavailableFallback(message: error) { Task { await model.load() } }
                } else {
                    ProgressView()
                }
            }
            .navigationTitle("Skabba Deals")
            .refreshable { await model.load() }
        }
        .task { await model.load() }
    }
}

struct ProductRow: View {
    let product: Product

    var body: some View {
        HStack(spacing: 12) {
            KFImage(API.imageURL(product.image))
                .placeholder { Color.secondary.opacity(0.1) }
                .resizable()
                .scaledToFill()
                .frame(width: 64, height: 64)
                .clipShape(RoundedRectangle(cornerRadius: 8))
            VStack(alignment: .leading, spacing: 4) {
                Text(product.name).font(.headline)
                Text(product.tagline).font(.subheadline).foregroundStyle(.secondary).lineLimit(1)
                PriceView(product: product)
            }
        }
    }
}

struct PriceView: View {
    let product: Product

    var body: some View {
        HStack(spacing: 6) {
            Text(formatCents(product.price)).bold()
            if let compareAt = product.compareAt {
                Text(formatCents(compareAt)).strikethrough().foregroundStyle(.secondary)
            }
        }
    }
}

struct ContentUnavailableFallback: View {
    let message: String
    let retry: () -> Void

    var body: some View {
        VStack(spacing: 12) {
            Text("Couldn't load products").font(.headline)
            Text(message).font(.footnote).foregroundStyle(.secondary).multilineTextAlignment(.center)
            Button("Try again", action: retry).buttonStyle(.borderedProminent)
        }
        .padding()
    }
}
