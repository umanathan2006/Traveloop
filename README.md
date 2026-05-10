# 🌍 Traveloop — AI-Powered Travel Planning App

> Plan smarter. Travel better. Built with React, Firebase & Groq AI.

![Traveloop Banner](https://img.shields.io/badge/Traveloop-AI%20Travel%20Planner-violet?style=for-the-badge)
![React](https://img.shields.io/badge/React-19-61DAFB?style=for-the-badge&logo=react)
![Firebase](https://img.shields.io/badge/Firebase-Firestore%20%2B%20Auth-FFCA28?style=for-the-badge&logo=firebase)
![Groq AI](https://img.shields.io/badge/Groq-LLaMA%203.3-F55036?style=for-the-badge)
![Tailwind](https://img.shields.io/badge/Tailwind-CSS-38BDF8?style=for-the-badge&logo=tailwindcss)
![Vite](https://img.shields.io/badge/Vite-8.0-646CFF?style=for-the-badge&logo=vite)

---

## ✨ What is Traveloop?

**Traveloop** is a full-stack AI-powered travel planning web app built for hackathons and real-world use. Just tell it where you want to go — our AI builds your complete day-by-day itinerary, tracks your budget, plots your route on a live map, and even packs your bag for you.

---

> Use the **Demo Account** button to skip login and explore all features instantly.

---

## 📱 14 Screens

| # | Screen | Description |
|---|--------|-------------|
| 1 | 🏠 Landing Page | Hero, features, sample trips |
| 2 | 🔐 Login / Signup | Firebase Auth with email & password |
| 3 | 📊 Dashboard | All trips grouped by status with stats |
| 4 | ➕ Create Trip | Destination, days, budget, mood picker |
| 5 | 🤖 AI Loading | Animated step-by-step generation screen |
| 6 | 📋 Itinerary Overview | Day cards with quick-action navigation |
| 7 | 📅 Day Details | Full plan, activities & travel tips |
| 8 | 🗺️ Map View | Real interactive map with Leaflet + geocoding |
| 9 | 💸 Budget Overview | Bar chart breakdown + per-day cost |
| 10 | 🧾 Invoice Screen | Printable invoice with line items & tax |
| 11 | 🎒 Packing Assistant | Smart rule-based lists + checkbox tracker |
| 12 | 📝 Trip Summary | Shareable overview with highlights |
| 13 | 🔗 Share / Public View | Copy link + social sharing options |
| 14 | 😶 Empty State | Onboarding call-to-action |

---

## 🧠 Core Features

- **🤖 AI Trip Generator** — Powered by Groq (LLaMA 3.3 70B), generates real day-by-day itineraries with specific places, activities and highlights
- **🗺️ Interactive Map** — React-Leaflet with real geocoded coordinates from OpenStreetMap Nominatim
- **💸 Budget Tracker** — Visual breakdown of hotel, food, travel & activities spending
- **🧾 Invoice Generator** — Full printable invoice with line items, quantities and tax
- **🎒 Smart Packing Assistant** — Rule-based packing lists tailored to destination type (beach, mountain, city, jungle etc.)
- **🔐 Firebase Auth** — Real email/password authentication
- **☁️ Firestore Database** — All trips saved and fetched in real-time
- **🔗 Trip Sharing** — Public share link for any trip

---

## 🛠️ Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 19 + Vite 8 |
| Styling | Tailwind CSS v4 |
| Auth | Firebase Authentication |
| Database | Firebase Firestore |
| AI | Groq API (LLaMA 3.3 70B) |
| Maps | React-Leaflet + OpenStreetMap |
| Geocoding | Nominatim (free, no API key) |

---

## 📁 Project Structure

```
traveloop/
├── public/
├── src/
│   ├── firebase/
│   │   └── firebase.js          # Firebase init + exports
│   ├── App.jsx                  # All 14 screens + logic
│   ├── index.css                # Tailwind import
│   └── main.jsx                 # React entry point
├── .env                         # API keys (never commit this!)
├── index.html                   # Leaflet CSS import
├── vite.config.js               # Vite + Tailwind config
└── package.json
```

---

## ⚡ Quick Start

### 1. Clone the repo
```bash
git clone https://github.com/yourusername/traveloop.git
cd traveloop
```

### 2. Install dependencies
```bash
npm install
```

### 3. Set up environment variables
Create a `.env` file in the root:
```env
VITE_GROQ_API_KEY=gsk_your_groq_api_key_here
```

### 4. Set up Firebase
1. Go to [Firebase Console](https://console.firebase.google.com)
2. Create a new project
3. Enable **Authentication → Email/Password**
4. Create **Firestore Database** in test mode
5. Copy your config into `src/firebase/firebase.js`

```js
const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_PROJECT.firebaseapp.com",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_PROJECT.appspot.com",
  messagingSenderId: "YOUR_SENDER_ID",
  appId: "YOUR_APP_ID",
};
```

### 5. Run the app
```bash
npm run dev
```

Visit: **http://localhost:5173**

---

## 🔑 API Keys

| Service | Where to get it | Cost |
|---------|----------------|------|
| Groq AI | [console.groq.com](https://console.groq.com) | ✅ Free |
| Firebase | [console.firebase.google.com](https://console.firebase.google.com) | ✅ Free tier |
| OpenStreetMap | No key needed | ✅ Completely free |

---

## 💾 Firestore Data Model

```js
// Collection: "trips"
{
  userId: string,
  destination: string,
  days: number,
  budget: number,
  mood: "Adventure" | "Relaxation" | "Culture" | "Foodie" | "Romance" | "Budget",
  status: "upcoming" | "ongoing" | "completed",
  emoji: string,
  coverColor: string,
  itinerary: [
    { day: number, title: string, plan: string }
  ],
  budgetBreakdown: {
    hotel: number,
    food: number,
    travel: number,
    activities: number
  },
  locations: string[],
  packingList: string[],
  highlights: string,
  createdAt: timestamp
}
```

---

## 🎒 Smart Packing Logic

Traveloop automatically generates packing lists based on destination keywords:

```
beach / bali / goa     → sunscreen, swimwear, flip flops
hill / ooty / munnar   → thermal jacket, trekking boots
alps / himalayas       → heavy coat, snow boots, hand warmers
city / paris / tokyo   → smart casuals, walking shoes
safari / jungle        → insect repellent, khaki clothing
```

---

## 🗺️ Map Integration

Uses **React-Leaflet** with free **OpenStreetMap** tiles and **Nominatim** geocoding:

- Real interactive map with zoom and pan
- Numbered markers for each location
- Dashed purple polyline connecting all stops
- No API key required

---

## 🔐 Firestore Security Rules

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /trips/{tripId} {
      allow read, write: if request.auth != null 
        && request.auth.uid == resource.data.userId;
      allow create: if request.auth != null;
    }
  }
}
```
## 👨‍💻 Author
  Umanathan Muthukumaran
  Suthakaran A
  Dharineesh N
> ⭐ Star this repo if you found it helpful!
