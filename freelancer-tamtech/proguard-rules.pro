# Protect React Native Picker classes and event emitters from obfuscation/removal
-keep public class com.reactnativecommunity.picker.** { *; }
-dontwarn com.reactnativecommunity.picker.**