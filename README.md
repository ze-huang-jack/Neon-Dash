<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/drive/1irBjDbo7B2Iz87FiTPfgOO1t-18ZknqP

## Run Locally

**Prerequisites:**  Node.js


1. Install dependencies:
   `npm install`
2. Set the `GEMINI_API_KEY` in [.env.local](.env.local) to your Gemini API key
3. Run the app:
   `npm run dev`

for android build 
1. npm install @capacitor/core @capacitor/cli
2. npx cap init
3. npm install @capacitor/android
4. npx cap add android
5. npm run build 
6. npx cap sync android
7. /android/local.properties 里  sdk.dir=C\:\\Users\\suqiu\\AppData\\Local\\Android\\Sdk
8. keytool -genkey -v -keystore my-release-key.keystore -alias my-key-alias -keyalg RSA -keysize 2048 -validity 10000
9. gradlew assembleRelease