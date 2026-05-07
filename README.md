# MixMate

MixMate is a React + Vite web app for controlling an automatic cocktail dispenser over Bluetooth Low Energy (BLE). It lets users browse recipes, assign liquids to pumps, and dispense drinks — all from the browser.

## Prerequisites

- [Node.js](https://nodejs.org/) v18 or later
- npm (comes with Node)
- A Firebase project (for auth and Firestore)
- Chrome or Edge browser (Web Bluetooth is not supported in Firefox or Safari)

## Installation

1. **Clone the repository**

   ```bash
   git clone https://github.com/dhruvnup1/MixMate-Webapp.git
   cd MixMate-Webapp
   ```

2. **Install dependencies**

   ```bash
   npm install
   ```

3. **Set up Firebase**

   - Go to the [Firebase Console](https://console.firebase.google.com/) and create a new project.
   - Enable **Email/Password** and **Google** sign-in under Authentication → Sign-in method.
   - Create a **Firestore** database (start in test mode for local development).
   - In Project Settings → General, scroll to "Your apps" and register a Web app to get your config keys.

4. **Configure environment variables**
   
   **For Professor, Please check our group's project folder in teams for the API keys to run this project.**

   Create a `.env` file in the project root:

   ```
   VITE_FIREBASE_API_KEY=your_api_key
   VITE_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
   VITE_FIREBASE_PROJECT_ID=your_project_id
   VITE_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
   VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
   VITE_FIREBASE_APP_ID=your_app_id
   ```

   All values come from the Firebase Web app config screen.

6. **Start the development server**

   ```bash
   npm run dev
   ```

   Open [http://localhost:5173](http://localhost:5173) in Chrome or Edge.

## BLE Requirements

Web Bluetooth only works over **HTTPS or localhost**. The dev server (`npm run dev`) runs on localhost so it works out of the box. If you deploy, the site must be served over HTTPS or the Connect Device page will not function.

The MixMate hardware uses the Nordic UART Service (NUS) UUIDs. Make sure the ESP32 firmware advertises the correct service UUID — see `src/hooks/useBleDevice.js` for the values.

## Available Scripts

| Command | Description |
|---|---|
| `npm run dev` | Start the local dev server |
| `npm run build` | Build for production (output in `dist/`) |
| `npm run preview` | Preview the production build locally |

## Project Structure

```
src/
  components/    # Shared UI components (Navbar, ErrorBoundary, etc.)
  Context/       # React contexts for auth, BLE, and dispense state
  hooks/         # useBleDevice — raw Web Bluetooth logic
  pages/         # Route-level pages (Login, Recipes, DeviceStatus, etc.)
  styles/        # CSS files
  firebase/      # Firebase initialization
```
