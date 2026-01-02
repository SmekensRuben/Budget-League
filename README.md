# Budget League

A React + Vite application backed by Firebase.

## Local setup
1. Install [Node.js](https://nodejs.org/) (version 22 or later) and npm.
2. Install project dependencies:
   ```bash
   npm install
   ```
3. Create a `.env` file in the project root with your Firebase credentials (see below).

## Environment variables
The application expects the following variables in a `.env` file:

```bash
VITE_FIREBASE_API_KEY=
VITE_FIREBASE_AUTH_DOMAIN=
VITE_FIREBASE_DATABASE_URL=
VITE_FIREBASE_PROJECT_ID=
VITE_FIREBASE_STORAGE_BUCKET=
VITE_FIREBASE_MESSAGING_SENDER_ID=
VITE_FIREBASE_APP_ID=
```

You can use the provided `.env` file as an example and replace the values with your own Firebase configuration.

## Firebase configuration
Firebase settings are stored in `.firebaserc` and `firebase.json`. The default project alias is `test-breakfast`.

## Common npm scripts

### Root project
- `npm run dev` – start the Vite development server.
- `npm run build` – create a production build of the app.
- `npm run preview` – preview the production build locally.
- `npm test` – run unit tests with Vitest.

## Running the development server
Start the frontend in development mode:

```bash
npm run dev
```
The application will be available at `http://localhost:5173` by default.
