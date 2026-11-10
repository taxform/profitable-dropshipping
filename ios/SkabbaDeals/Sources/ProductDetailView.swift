import SwiftUI
import Kingfisher
import FirebaseAnalytics

struct ProductDetailView: View {
    let product: Product
    @Environment(\.openURL) private var openURL

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 16) {
                KFImage(API.imageURL(product.image))
                    .placeholder { Color.secondary.opacity(0.1) }
                    .resizable()
                    .scaledToFit()
                    .frame(maxWidth: .infinity)
                    .clipShape(RoundedRectangle(cornerRadius: 12))

                Text(product.name).font(.title2).bold()
                Text(product.tagline).foregroundStyle(.secondary)
                PriceView(product: product).font(.title3)

                Text(product.description)

                VStack(alignment: .leading, spacing: 6) {
                    ForEach(product.bullets, id: \.self) { bullet in
                        Label(bullet, systemImage: "checkmark.circle.fill")
                    }
                }

                Text("Ships in \(product.shipsIn)").font(.footnote).foregroundStyle(.secondary)

                // Checkout stays on the web store so Stripe, bundles and order tracking are shared.
                Button {
                    Analytics.logEvent("buy_on_web", parameters: [AnalyticsParameterItemID: product.slug])
                    openURL(API.productPageURL(product.slug))
                } label: {
                    Text("Buy on skabbadeals.com").frame(maxWidth: .infinity)
                }
                .buttonStyle(.borderedProminent)
                .controlSize(.large)
            }
            .padding()
        }
        .navigationBarTitleDisplayMode(.inline)
        .onAppear {
            Analytics.logEvent(AnalyticsEventViewItem, parameters: [
                AnalyticsParameterCurrency: "USD",
                AnalyticsParameterValue: Double(product.price) / 100,
                AnalyticsParameterItems: [[
                    AnalyticsParameterItemID: product.slug,
                    AnalyticsParameterItemName: product.name,
                    AnalyticsParameterItemCategory: product.category,
                    AnalyticsParameterPrice: Double(product.price) / 100,
                ]],
            ])
        }
    }
}
