import SwiftUI
import FirebaseCore

final class AppDelegate: NSObject, UIApplicationDelegate {
    func application(
        _ application: UIApplication,
        didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]? = nil
    ) -> Bool {
        // Needs SkabbaDeals/GoogleService-Info.plist from the Firebase console.
        FirebaseApp.configure()
        return true
    }
}

@main
struct SkabbaDealsApp: App {
    @UIApplicationDelegateAdaptor(AppDelegate.self) private var appDelegate

    var body: some Scene {
        WindowGroup {
            ProductListView()
        }
    }
}
