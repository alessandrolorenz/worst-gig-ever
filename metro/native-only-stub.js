/**
 * What `react-native-google-mobile-ads` and `react-native-purchases` resolve
 * to in the web bundle (M23).
 *
 * ## Why a stub and not a lazy require
 *
 * Both adapters already `require()` their SDK from inside a function rather
 * than importing it at module scope, and both check `Platform.OS` before doing
 * even that. Those guards are correct and they are not enough, because they
 * are *runtime* guards and the failure is a *build* one: Metro resolves every
 * statically-analyzable `require()` whether or not it will ever run, pulls the
 * package into the web graph, and fails on the first native-only import it
 * finds inside it —
 *
 *     Importing native-only module
 *     "react-native/Libraries/Utilities/codegenNativeCommands" on web from
 *     react-native-google-mobile-ads/.../GoogleMobileAdsBannerViewNativeComponent.js
 *
 * A `try/catch` cannot catch that. There is nothing to catch: the bundle is
 * never produced. This file is what the resolver hands Metro instead, so the
 * graph closes and the web export builds.
 *
 * ## It is deliberately inert, and never reached
 *
 * Nothing on web gets this far. `ADS_SUPPORTED` and `BILLING_SUPPORTED` are
 * both `Platform.OS === 'android' || Platform.OS === 'ios'`, and both are
 * checked before the require — so on web `loadSdk()` returns `null` without
 * asking for this module at all. It exists to satisfy the bundler, not the
 * program.
 *
 * An empty object rather than a throwing proxy, on purpose. A throw here would
 * convert a build-time failure into a runtime one on the player's screen,
 * which is the wrong direction: the platform guards are the contract, and the
 * `try/catch` in each adapter is the backstop if one is ever missed.
 */
module.exports = {};
