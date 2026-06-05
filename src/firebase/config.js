// ============================================================
// Firebase Configuration
// ============================================================
// Nilai diambil dari file .env (lihat .env.example)
// Buat project di: https://console.firebase.google.com
// ============================================================

import { initializeApp } from 'firebase/app'
import { getFirestore, connectFirestoreEmulator } from 'firebase/firestore'
import { getAuth, connectAuthEmulator } from 'firebase/auth'
import { getStorage, connectStorageEmulator } from 'firebase/storage'

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
}

// Cek apakah Firebase sudah dikonfigurasi
const isConfigured = firebaseConfig.apiKey && firebaseConfig.apiKey !== 'undefined'

let app = null
let db = null
let auth = null
let storage = null

if (isConfigured) {
  app = initializeApp(firebaseConfig)
  db = getFirestore(app, 'hadir-hr')  // Named database (bukan default)
  auth = getAuth(app)
  storage = getStorage(app)

  // Uncomment baris di bawah untuk pakai Firebase Emulator saat development
  // if (import.meta.env.DEV) {
  //   connectFirestoreEmulator(db, 'localhost', 8080)
  //   connectAuthEmulator(auth, 'http://localhost:9099')
  //   connectStorageEmulator(storage, 'localhost', 9199)
  // }

  console.log('✅ Firebase connected:', firebaseConfig.projectId)
} else {
  console.log('⚠️ Firebase belum dikonfigurasi. Menggunakan demo data.')
  console.log('   Buat file .env berdasarkan .env.example untuk connect ke Firebase.')
}

export { app, db, auth, storage, isConfigured }
