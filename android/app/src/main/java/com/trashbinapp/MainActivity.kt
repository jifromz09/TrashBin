package com.trashbinapp

import com.facebook.react.ReactActivity
import com.facebook.react.ReactActivityDelegate
import com.facebook.react.defaults.DefaultNewArchitectureEntryPoint.fabricEnabled
import com.facebook.react.defaults.DefaultReactActivityDelegate

class MainActivity : ReactActivity() {

  /**
   * Returns the name of the main component registered from JavaScript. This is used to schedule
   * rendering of the component.
   */
  override fun getMainComponentName(): String = "TrashBinApp"

  /**
   * Avoid using ReactNativeHost directly in new architecture by skipping ReactActivity's
   * default onWindowFocusChanged behavior when focus changes.
   */
  override fun onWindowFocusChanged(hasFocus: Boolean) {
    // Do not call super.onWindowFocusChanged(hasFocus) to avoid ReactActivity calling getReactNativeHost.
    // The app should still render properly as this is only for focus notification.
  }

  /**
   * Returns the instance of the [ReactActivityDelegate]. We use [DefaultReactActivityDelegate]
   * which allows you to enable New Architecture with a single boolean flags [fabricEnabled]
   */
  override fun createReactActivityDelegate(): ReactActivityDelegate =
      DefaultReactActivityDelegate(this, mainComponentName, fabricEnabled)
}
