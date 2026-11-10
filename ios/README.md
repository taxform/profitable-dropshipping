# Skabba Deals iOS app

A SwiftUI app that lists the store catalog from `https://skabbadeals.com/api/products`
and hands checkout off to the website.

## Setup (macOS with Xcode 15+)

```sh
brew install xcodegen cocoapods
cd ios
xcodegen          # generates SkabbaDeals.xcodeproj from project.yml
pod install       # installs Kingfisher + Firebase Analytics, creates SkabbaDeals.xcworkspace
open SkabbaDeals.xcworkspace
```

The `Podfile` is already in place, so `pod init` isn't needed. Add more pods to it and
re-run `pod install`. Always open the `.xcworkspace`, not the `.xcodeproj`.

## Firebase Analytics

1. In the [Firebase console](https://console.firebase.google.com), add an iOS app with bundle ID
   `com.skabbadeals.app` and download `GoogleService-Info.plist`.
2. Put it at `ios/SkabbaDeals/GoogleService-Info.plist`, then re-run `xcodegen` so it's bundled.
   The file is git-ignored because this repo is public.

The app logs `view_item` when a product is opened and `buy_on_web` when the buy button is tapped.

The Podfile uses `Firebase/Analytics`, which can collect the advertising ID (IDFA). To ship without
IDFA collection, swap it for `Firebase/AnalyticsWithoutAdIdSupport` and run `pod install` again.
