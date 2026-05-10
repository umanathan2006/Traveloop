import { auth } from "./firebase/firebase";
import { createUserWithEmailAndPassword, signInWithEmailAndPassword, updateProfile } from "firebase/auth";
import { useState, useEffect, useRef } from "react";
import { MapContainer, TileLayer, Marker, Popup, Polyline } from "react-leaflet";
import { db } from "./firebase/firebase";
import { collection, addDoc, getDocs, query, where, serverTimestamp } from "firebase/firestore";
// ─── MOCK DATA ────────────────────────────────────────────────────────────────
const MOCK_TRIPS = [
  {
    id: "trip1",
    destination: "Bali, Indonesia",
    days: 5,
    budget: 1200,
    mood: "Adventure",
    createdAt: "2025-04-10",
    status: "completed",
    emoji: "🌴",
    coverColor: "from-orange-400 to-pink-500",
    itinerary: [
      { day: 1, title: "Arrival & Seminyak Beach", plan: "Check into resort, sunset at Seminyak Beach, seafood dinner at Jimbaran Bay." },
      { day: 2, title: "Ubud Culture Day", plan: "Sacred Monkey Forest, Tegallalang Rice Terraces, traditional Kecak dance performance." },
      { day: 3, title: "Temple Trail", plan: "Tanah Lot at sunrise, Uluwatu Temple, explore local artisan markets." },
      { day: 4, title: "Water Sports & Spa", plan: "Morning surfing lesson, afternoon at water park, evening Balinese spa." },
      { day: 5, title: "Departure Day", plan: "Last minute shopping at Sukawati Market, farewell lunch, airport transfer." },
    ],
    budgetBreakdown: { hotel: 400, food: 250, travel: 300, activities: 250 },
    locations: ["Seminyak Beach", "Ubud", "Tanah Lot", "Uluwatu"],
    packingList: ["Sunscreen", "Light clothing", "Flip flops", "Mosquito repellent", "Camera", "Swimwear"],
  },
  {
    id: "trip2",
    destination: "Swiss Alps, Switzerland",
    days: 7,
    budget: 3500,
    mood: "Relaxation",
    createdAt: "2025-05-20",
    status: "upcoming",
    emoji: "🏔️",
    coverColor: "from-blue-400 to-cyan-500",
    itinerary: [
      { day: 1, title: "Zurich Arrival", plan: "Land at Zurich airport, transfer to Interlaken, evening lakeside walk." },
      { day: 2, title: "Jungfraujoch", plan: "Top of Europe trip, Aletsch Glacier views, alpine lunch." },
      { day: 3, title: "Grindelwald Hike", plan: "Bachalpsee trail, wildflower meadows, traditional Swiss fondue dinner." },
      { day: 4, title: "Lauterbrunnen Valley", plan: "Staubbach Falls, Trümmelbach Falls, valley cycling." },
      { day: 5, title: "Lucerne Day Trip", plan: "Chapel Bridge, Lion Monument, lake cruise, chocolate shopping." },
      { day: 6, title: "Ski Day", plan: "Full day skiing at Kleine Scheidegg, après-ski at mountain bar." },
      { day: 7, title: "Departure", plan: "Scenic train to Zurich, last Swiss chocolate purchases, flight home." },
    ],
    budgetBreakdown: { hotel: 1400, food: 700, travel: 800, activities: 600 },
    locations: ["Interlaken", "Jungfraujoch", "Grindelwald", "Lucerne"],
    packingList: ["Thermal jacket", "Snow boots", "Ski gear", "Warm layers", "Sunglasses", "Gloves", "Passport"],
  },
];

const PACKING_RULES = {
  beach: ["Sunscreen SPF 50+", "Swimwear", "Flip flops", "Beach towel", "Snorkel gear", "Rash guard", "Waterproof bag"],
  hill: ["Thermal jacket", "Trekking boots", "Warm socks", "Rain poncho", "Torch/headlamp", "First aid kit"],
  mountain: ["Thermal jacket", "Snow boots", "Gloves", "Warm hat", "Ski jacket", "Thermals", "Hand warmers"],
  snow: ["Heavy winter coat", "Snow boots", "Gloves", "Scarf", "Hand warmers", "Thermal base layers"],
  city: ["Comfortable walking shoes", "Day pack", "City map", "Power bank", "Versatile outfits", "Metro card"],
  tropical: ["Light clothing", "Mosquito repellent", "Sunscreen", "Breathable fabrics", "Umbrella", "Hydration salts"],
  default: ["Passport/ID", "Travel adapter", "Phone charger", "First aid kit", "Travel insurance docs", "Credit/debit cards", "Medications", "Toiletries"],
};

const MOODS = [
  { label: "Adventure", emoji: "🧗", color: "from-orange-500 to-red-500" },
  { label: "Relaxation", emoji: "🧘", color: "from-blue-400 to-cyan-400" },
  { label: "Culture", emoji: "🏛️", color: "from-purple-500 to-pink-500" },
  { label: "Foodie", emoji: "🍜", color: "from-yellow-400 to-orange-400" },
  { label: "Romance", emoji: "💕", color: "from-pink-400 to-rose-500" },
  { label: "Budget", emoji: "💰", color: "from-green-400 to-teal-500" },
];

// ─── AI SERVICE ───────────────────────────────────────────────────────────────
async function generateTripAI(destination, days, budget, mood) {
  try {
    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${import.meta.env.VITE_GROQ_API_KEY}`,
      },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile",
        messages: [
          {
            role: "user",
            content: `Create a ${days}-day travel itinerary for ${destination} with $${budget} budget for ${mood} travel. Return ONLY a JSON object like this with no extra text:
{"itinerary":[{"day":1,"title":"Day title","plan":"Detailed activities for the day"}],"budgetBreakdown":{"hotel":${Math.round(budget*0.4)},"food":${Math.round(budget*0.25)},"travel":${Math.round(budget*0.2)},"activities":${Math.round(budget*0.15)}},"locations":["Place 1","Place 2","Place 3","Place 4"],"packingList":["Item 1","Item 2","Item 3","Item 4","Item 5"],"highlights":"One sentence about the trip"}`
          }
        ],
        temperature: 0.7,
        max_tokens: 3000,
      }),
    });
    const data = await response.json();
    console.log("Groq response:", data);
    const text = data.choices?.[0]?.message?.content || "";
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error("No JSON found");
    return JSON.parse(jsonMatch[0]);
  } catch (e) {
    console.error("Groq API failed:", e);
    return generateMockTrip(destination, days, budget, mood);
  }
}

function generateMockTrip(destination, days, budget, mood) {
  const itinerary = Array.from({ length: days }, (_, i) => ({
    day: i + 1,
    title: `Day ${i + 1} in ${destination}`,
    plan: `Explore the best of ${destination} on day ${i + 1}. Visit local landmarks, try authentic cuisine, and immerse yourself in the ${mood.toLowerCase()} experience that ${destination} has to offer.`,
  }));
  return {
    itinerary,
    budgetBreakdown: {
      hotel: Math.round(budget * 0.4),
      food: Math.round(budget * 0.25),
      travel: Math.round(budget * 0.2),
      activities: Math.round(budget * 0.15),
    },
    locations: [destination, `${destination} City Center`, `${destination} Old Town`, `${destination} Outskirts`],
    packingList: ["Passport", "Comfortable shoes", "Camera", "Sunscreen", "Travel adapter", "Light jacket"],
    highlights: `An unforgettable ${days}-day ${mood.toLowerCase()} journey through the heart of ${destination}.`,
  };
}

function getPackingList(destination, mood) {
  const dest = destination.toLowerCase();
  let list = [...PACKING_RULES.default];
  if (dest.includes("beach") || dest.includes("goa") || dest.includes("bali") || dest.includes("maldive")) list = [...list, ...PACKING_RULES.beach];
  else if (dest.includes("hill") || dest.includes("ooty") || dest.includes("munnar") || dest.includes("kodai")) list = [...list, ...PACKING_RULES.hill];
  else if (dest.includes("alp") || dest.includes("swiss") || dest.includes("himala") || dest.includes("kashmir")) list = [...list, ...PACKING_RULES.mountain];
  else if (dest.includes("snow") || dest.includes("iceland") || dest.includes("lapland")) list = [...list, ...PACKING_RULES.snow];
  else if (dest.includes("tropical") || dest.includes("thailand") || dest.includes("kerala")) list = [...list, ...PACKING_RULES.tropical];
  else list = [...list, ...PACKING_RULES.city];
  return [...new Set(list)];
}

// ─── COMPONENTS ───────────────────────────────────────────────────────────────

function NavBar({ currentScreen, onNavigate, user, trips }) {
  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-black/80 backdrop-blur-xl border-b border-white/10">
      <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
        <button onClick={() => onNavigate(user ? "dashboard" : "landing")} className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-500 to-cyan-400 flex items-center justify-center text-sm font-bold text-white">T</div>
          <span className="font-bold text-white text-lg tracking-tight">Traveloop</span>
        </button>
        <div className="flex items-center gap-3">
          {user ? (
            <>
              <button onClick={() => onNavigate("dashboard")} className="text-white/60 hover:text-white text-sm transition-colors px-3 py-1.5 rounded-lg hover:bg-white/10">Dashboard</button>
              <button onClick={() => onNavigate("create")} className="bg-gradient-to-r from-violet-600 to-cyan-500 text-white text-sm font-medium px-4 py-1.5 rounded-lg hover:opacity-90 transition-opacity">+ New Trip</button>
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-violet-500 to-cyan-400 flex items-center justify-center text-white text-xs font-bold cursor-pointer" onClick={() => onNavigate("profile")}>
                {user.name?.[0] || "U"}
              </div>
            </>
          ) : (
            <>
              <button onClick={() => onNavigate("login")} className="text-white/60 hover:text-white text-sm transition-colors px-3 py-1.5">Sign In</button>
              <button onClick={() => onNavigate("signup")} className="bg-gradient-to-r from-violet-600 to-cyan-500 text-white text-sm font-medium px-4 py-1.5 rounded-lg hover:opacity-90 transition-opacity">Get Started</button>
            </>
          )}
        </div>
      </div>
    </nav>
  );
}

function TripCard({ trip, onClick }) {
  const statusColors = { completed: "bg-green-500/20 text-green-400", upcoming: "bg-cyan-500/20 text-cyan-400", ongoing: "bg-orange-500/20 text-orange-400" };
  return (
    <div onClick={onClick} className="group relative bg-white/5 border border-white/10 rounded-2xl overflow-hidden cursor-pointer hover:border-white/30 hover:bg-white/10 transition-all duration-300 hover:-translate-y-1">
      <div className={`h-32 bg-gradient-to-br ${trip.coverColor} flex items-center justify-center text-5xl relative overflow-hidden`}>
        <div className="absolute inset-0 bg-black/20" />
        <span className="relative z-10 drop-shadow-lg">{trip.emoji}</span>
      </div>
      <div className="p-4">
        <div className="flex items-start justify-between mb-2">
          <h3 className="text-white font-semibold text-base leading-tight">{trip.destination}</h3>
          <span className={`text-xs px-2 py-0.5 rounded-full font-medium capitalize ${statusColors[trip.status] || "bg-white/10 text-white/60"}`}>{trip.status}</span>
        </div>
        <div className="flex items-center gap-3 text-white/50 text-xs">
          <span>📅 {trip.days} days</span>
          <span>💰 ${trip.budget}</span>
          <span>✨ {trip.mood}</span>
        </div>
        <div className="mt-3 text-white/40 text-xs">{trip.createdAt}</div>
      </div>
    </div>
  );
}

// ─── SCREENS ──────────────────────────────────────────────────────────────────

function LandingScreen({ onNavigate, user, trips }) {
  const [hoveredFeature, setHoveredFeature] = useState(null);
  const features = [
    { icon: "🤖", title: "AI Itinerary", desc: "Claude generates your perfect day-by-day plan" },
    { icon: "🗺️", title: "Map View", desc: "See all your stops plotted on an interactive map" },
    { icon: "💸", title: "Budget Tracker", desc: "Real-time expense breakdown and invoicing" },
    { icon: "🎒", title: "Packing Assistant", desc: "Smart packing lists based on destination" },
  ];
  return (
    <div className="min-h-screen bg-black text-white overflow-hidden">
      {/* Hero */}
      <div className="relative min-h-screen flex items-center justify-center px-4 pt-16">
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-violet-600/20 rounded-full blur-3xl animate-pulse" />
          <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-cyan-500/20 rounded-full blur-3xl animate-pulse" style={{ animationDelay: "1s" }} />
          <div className="absolute top-1/2 left-1/2 w-64 h-64 bg-pink-500/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: "2s" }} />
        </div>
        <div className="relative z-10 text-center max-w-4xl mx-auto">
          <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur border border-white/20 rounded-full px-4 py-2 text-sm mb-8">
            <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
            <span className="text-white/80">AI-powered</span>
          </div>
          <h1 className="text-6xl md:text-8xl font-black mb-6 leading-none tracking-tight">
            Plan trips.<br />
            <span className="bg-gradient-to-r from-violet-400 via-pink-400 to-cyan-400 bg-clip-text text-transparent">Travel smarter.</span>
          </h1>
          <p className="text-xl text-white/60 mb-10 max-w-2xl mx-auto leading-relaxed">
            Tell us where you want to go. Our AI builds your perfect itinerary, tracks your budget, and even packs your bag.
          </p>
          {user && trips.length > 0 ? (
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <button onClick={() => onNavigate("dashboard")} className="bg-gradient-to-r from-violet-600 to-cyan-500 text-white font-bold px-8 py-4 rounded-2xl text-lg hover:opacity-90 transition-all hover:scale-105 shadow-lg shadow-violet-500/30">
                Continue: {trips[trips.length - 1].destination} →
              </button>
              <button onClick={() => onNavigate("create")} className="bg-white/10 backdrop-blur border border-white/20 text-white font-semibold px-8 py-4 rounded-2xl text-lg hover:bg-white/20 transition-all">
                + Plan New Trip
              </button>
            </div>
          ) : (
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <button onClick={() => onNavigate("signup")} className="bg-gradient-to-r from-violet-600 to-cyan-500 text-white font-bold px-8 py-4 rounded-2xl text-lg hover:opacity-90 transition-all hover:scale-105 shadow-lg shadow-violet-500/30">
                Start Planning Free →
              </button>
              <button onClick={() => onNavigate("login")} className="bg-white/10 backdrop-blur border border-white/20 text-white font-semibold px-8 py-4 rounded-2xl text-lg hover:bg-white/20 transition-all">
                Sign In
              </button>
            </div>
          )}
        </div>
      </div>
      {/* Features */}
      <div className="max-w-6xl mx-auto px-4 py-24">
        <h2 className="text-4xl font-bold text-center mb-4">Everything a traveler needs</h2>
        <p className="text-white/50 text-center mb-16">One app. Zero planning headaches.</p>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {features.map((f, i) => (
            <div key={i} onMouseEnter={() => setHoveredFeature(i)} onMouseLeave={() => setHoveredFeature(null)} className={`p-6 rounded-2xl border transition-all duration-300 cursor-default ${hoveredFeature === i ? "bg-white/10 border-white/30 -translate-y-1" : "bg-white/5 border-white/10"}`}>
              <div className="text-4xl mb-4">{f.icon}</div>
              <h3 className="text-white font-bold mb-2">{f.title}</h3>
              <p className="text-white/50 text-sm leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </div>
      {/* Sample Trips */}
      <div className="max-w-6xl mx-auto px-4 pb-24">
        <h2 className="text-4xl font-bold text-center mb-4">Where will you go?</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {MOCK_TRIPS.map((trip) => (
            <TripCard key={trip.id} trip={trip} onClick={() => onNavigate("login")} />
          ))}
        </div>
        <div className="text-center mt-10">
          <button onClick={() => onNavigate("signup")} className="bg-gradient-to-r from-violet-600 to-cyan-500 text-white font-bold px-10 py-4 rounded-2xl text-lg hover:opacity-90 transition-all hover:scale-105">
            Create Your First Trip →
          </button>
        </div>
      </div>
    </div>
  );
}

function AuthScreen({ mode, onNavigate, onAuth }) {
  const [form, setForm] = useState({ name: "", email: "", password: "", city: "", country: "" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const isLogin = mode === "login";

 const handleSubmit = async () => {
  setError("");
  if (!form.email || !form.password) { setError("Please fill in all required fields"); return; }
  if (!isLogin && !form.name) { setError("Please enter your name"); return; }
  setLoading(true);
  try {
    if (isLogin) {
      const result = await signInWithEmailAndPassword(auth, form.email, form.password);
      const user = { uid: result.user.uid, name: result.user.displayName || form.email.split("@")[0], email: form.email };
      onAuth(user);
      onNavigate("dashboard");
    } else {
      const result = await createUserWithEmailAndPassword(auth, form.email, form.password);
      await updateProfile(result.user, { displayName: form.name });
      const user = { uid: result.user.uid, name: form.name, email: form.email };
      onAuth(user);
      onNavigate("dashboard");
    }
  } catch (e) {
    setError(e.message.replace("Firebase: ", ""));
  }
  setLoading(false);
};

  return (
    <div className="min-h-screen bg-black text-white flex items-center justify-center px-4 pt-16">
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-1/3 left-1/3 w-72 h-72 bg-violet-600/15 rounded-full blur-3xl" />
        <div className="absolute bottom-1/3 right-1/3 w-72 h-72 bg-cyan-500/15 rounded-full blur-3xl" />
      </div>
      <div className="relative w-full max-w-md">
        <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-8">
          <div className="text-center mb-8">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-violet-500 to-cyan-400 flex items-center justify-center text-2xl font-black text-white mx-auto mb-4">T</div>
            <h1 className="text-2xl font-bold">{isLogin ? "Welcome back" : "Start your journey"}</h1>
            <p className="text-white/50 mt-1 text-sm">{isLogin ? "Sign in to your Traveloop account" : "Create your free account today"}</p>
          </div>
          {error && <div className="bg-red-500/20 border border-red-500/30 text-red-400 text-sm px-4 py-3 rounded-xl mb-4">{error}</div>}
          <div className="space-y-4">
            {!isLogin && (
              <div className="grid grid-cols-2 gap-3">
                <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="Full Name" className="bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-white placeholder-white/30 focus:outline-none focus:border-violet-500 text-sm" />
                <input placeholder="Phone" className="bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-white placeholder-white/30 focus:outline-none focus:border-violet-500 text-sm" />
              </div>
            )}
            <input value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} placeholder="Email Address" type="email" className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-white placeholder-white/30 focus:outline-none focus:border-violet-500 text-sm" />
            <input value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} placeholder="Password" type="password" className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-white placeholder-white/30 focus:outline-none focus:border-violet-500 text-sm" />
            {!isLogin && (
              <div className="grid grid-cols-2 gap-3">
                <input value={form.city} onChange={e => setForm({ ...form, city: e.target.value })} placeholder="City" className="bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-white placeholder-white/30 focus:outline-none focus:border-violet-500 text-sm" />
                <input value={form.country} onChange={e => setForm({ ...form, country: e.target.value })} placeholder="Country" className="bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-white placeholder-white/30 focus:outline-none focus:border-violet-500 text-sm" />
              </div>
            )}
            <button onClick={handleSubmit} disabled={loading} className="w-full bg-gradient-to-r from-violet-600 to-cyan-500 text-white font-bold py-3.5 rounded-xl hover:opacity-90 transition-all disabled:opacity-50 flex items-center justify-center gap-2">
              {loading ? (<><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Processing...</>) : (isLogin ? "Sign In" : "Create Account")}
            </button>
          </div>
          <p className="text-center text-white/40 text-sm mt-6">
            {isLogin ? "Don't have an account? " : "Already have an account? "}
            <button onClick={() => onNavigate(isLogin ? "signup" : "login")} className="text-violet-400 hover:text-violet-300 font-medium">
              {isLogin ? "Sign up free" : "Sign in"}
            </button>
          </p>
          <div className="mt-4 pt-4 border-t border-white/10">
            <button onClick={() => { onAuth({ uid: "demo", name: "Demo User", email: "demo@traveloop.com" }); onNavigate("dashboard"); }} className="w-full bg-white/5 border border-white/10 text-white/60 text-sm py-2.5 rounded-xl hover:bg-white/10 transition-all">
              🚀 Continue with Demo Account
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function DashboardScreen({ onNavigate, user, trips, onSelectTrip }) {
  const ongoing = trips.filter(t => t.status === "ongoing");
  const upcoming = trips.filter(t => t.status === "upcoming");
  const completed = trips.filter(t => t.status === "completed");

  return (
    <div className="min-h-screen bg-black text-white pt-20 pb-12">
      <div className="max-w-6xl mx-auto px-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-10">
          <div>
            <p className="text-white/50 text-sm mb-1">Good day,</p>
            <h1 className="text-3xl font-bold">Welcome back, {user?.name?.split(" ")[0] || "Traveler"} ✈️</h1>
          </div>
          <button onClick={() => onNavigate("create")} className="bg-gradient-to-r from-violet-600 to-cyan-500 text-white font-semibold px-6 py-3 rounded-xl hover:opacity-90 transition-all hover:scale-105 shadow-lg shadow-violet-500/20">
            + Plan New Trip
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10">
          {[
            { label: "Total Trips", value: trips.length, icon: "✈️" },
            { label: "Countries", value: [...new Set(trips.map(t => t.destination.split(",").pop().trim()))].length, icon: "🌍" },
            { label: "Days Traveled", value: trips.reduce((a, t) => a + t.days, 0), icon: "📅" },
            { label: "Total Spent", value: "$" + trips.reduce((a, t) => a + t.budget, 0).toLocaleString(), icon: "💰" },
          ].map((s, i) => (
            <div key={i} className="bg-white/5 border border-white/10 rounded-2xl p-5">
              <div className="text-2xl mb-2">{s.icon}</div>
              <div className="text-2xl font-bold text-white">{s.value}</div>
              <div className="text-white/50 text-sm mt-0.5">{s.label}</div>
            </div>
          ))}
        </div>

        {/* Trips */}
        {trips.length === 0 ? (
          <EmptyState onNavigate={onNavigate} />
        ) : (
          <>
            {ongoing.length > 0 && (
              <div className="mb-8">
                <h2 className="text-xl font-bold mb-4 flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-orange-400 animate-pulse" />Ongoing</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {ongoing.map(t => <TripCard key={t.id} trip={t} onClick={() => { onSelectTrip(t); onNavigate("itinerary"); }} />)}
                </div>
              </div>
            )}
            {upcoming.length > 0 && (
              <div className="mb-8">
                <h2 className="text-xl font-bold mb-4 flex items-center gap-2">🗓️ Upcoming</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {upcoming.map(t => <TripCard key={t.id} trip={t} onClick={() => { onSelectTrip(t); onNavigate("itinerary"); }} />)}
                </div>
              </div>
            )}
            {completed.length > 0 && (
              <div className="mb-8">
                <h2 className="text-xl font-bold mb-4 flex items-center gap-2">✅ Completed</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {completed.map(t => <TripCard key={t.id} trip={t} onClick={() => { onSelectTrip(t); onNavigate("itinerary"); }} />)}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

function CreateTripScreen({ onNavigate, user, onTripCreated }) {
  const [form, setForm] = useState({ destination: "", days: 5, budget: 1000, mood: "Adventure" });
  const [step, setStep] = useState(1);

  const handleGenerate = () => {
    if (!form.destination.trim()) return;
    onNavigate("ailoading");
    // Generate async
    const doGenerate = async () => {
      const aiData = await generateTripAI(form.destination, form.days, form.budget, form.mood);
      const packingList = getPackingList(form.destination, form.mood);
      const coverColors = ["from-orange-400 to-pink-500", "from-blue-400 to-cyan-500", "from-violet-500 to-purple-600", "from-green-400 to-teal-500", "from-yellow-400 to-orange-500"];
      const emojis = ["🌴", "🏔️", "🏙️", "🏖️", "🗺️", "🌸", "🌊", "🏜️"];
      const newTrip = {
        id: "trip_" + Date.now(),
        userId: user?.uid,
        destination: form.destination,
        days: form.days,
        budget: form.budget,
        mood: form.mood,
        status: "upcoming",
        createdAt: new Date().toISOString().split("T")[0],
        coverColor: coverColors[Math.floor(Math.random() * coverColors.length)],
        emoji: emojis[Math.floor(Math.random() * emojis.length)],
        ...aiData,
        packingList: [...(aiData.packingList || []), ...packingList].slice(0, 12),
      };
      onTripCreated(newTrip);
      onNavigate("itinerary");
    };
    doGenerate();
  };

  return (
    <div className="min-h-screen bg-black text-white pt-20 pb-12">
      <div className="max-w-2xl mx-auto px-4">
        <div className="text-center mb-10">
          <h1 className="text-4xl font-bold mb-3">Plan a New Trip</h1>
          <p className="text-white/50">Tell our AI where you want to go and we'll handle the rest</p>
        </div>
        <div className="bg-white/5 backdrop-blur border border-white/10 rounded-3xl p-8 space-y-8">
          {/* Destination */}
          <div>
            <label className="block text-white/70 text-sm font-medium mb-2">📍 Where are you going?</label>
            <input value={form.destination} onChange={e => setForm({ ...form, destination: e.target.value })} placeholder="e.g. Bali, Indonesia or Paris, France" className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-4 text-white placeholder-white/30 focus:outline-none focus:border-violet-500 text-base" />
          </div>
          {/* Days */}
          <div>
            <label className="block text-white/70 text-sm font-medium mb-3">📅 Duration: <span className="text-white font-bold">{form.days} days</span></label>
            <input type="range" min={1} max={30} value={form.days} onChange={e => setForm({ ...form, days: +e.target.value })} className="w-full accent-violet-500" />
            <div className="flex justify-between text-white/30 text-xs mt-1"><span>1 day</span><span>30 days</span></div>
          </div>
          {/* Budget */}
          <div>
            <label className="block text-white/70 text-sm font-medium mb-3">💰 Budget: <span className="text-white font-bold">${form.budget.toLocaleString()}</span></label>
            <input type="range" min={100} max={10000} step={100} value={form.budget} onChange={e => setForm({ ...form, budget: +e.target.value })} className="w-full accent-cyan-500" />
            <div className="flex justify-between text-white/30 text-xs mt-1"><span>$100</span><span>$10,000</span></div>
          </div>
          {/* Mood */}
          <div>
            <label className="block text-white/70 text-sm font-medium mb-3">✨ Travel Style</label>
            <div className="grid grid-cols-3 gap-3">
              {MOODS.map(m => (
                <button key={m.label} onClick={() => setForm({ ...form, mood: m.label })} className={`p-3 rounded-xl border text-center transition-all ${form.mood === m.label ? "border-violet-500 bg-violet-500/20" : "border-white/10 bg-white/5 hover:border-white/30"}`}>
                  <div className="text-2xl mb-1">{m.emoji}</div>
                  <div className="text-xs font-medium text-white/80">{m.label}</div>
                </button>
              ))}
            </div>
          </div>
          <button onClick={handleGenerate} disabled={!form.destination.trim()} className="w-full bg-gradient-to-r from-violet-600 to-cyan-500 text-white font-bold py-4 rounded-xl text-lg hover:opacity-90 transition-all disabled:opacity-40 disabled:cursor-not-allowed hover:scale-[1.01]">
            🤖 Generate AI Itinerary →
          </button>
        </div>
      </div>
    </div>
  );
}

function AILoadingScreen() {
  const [step, setStep] = useState(0);
  const steps = ["Analyzing destination...", "Crafting daily itinerary...", "Optimizing your budget...", "Building your packing list...", "Finalizing your perfect trip..."];
  useEffect(() => {
    const t = setInterval(() => setStep(s => Math.min(s + 1, steps.length - 1)), 1400);
    return () => clearInterval(t);
  }, []);
  return (
    <div className="min-h-screen bg-black text-white flex items-center justify-center px-4">
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-1/3 left-1/4 w-80 h-80 bg-violet-600/20 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-1/3 right-1/4 w-80 h-80 bg-cyan-500/20 rounded-full blur-3xl animate-pulse" style={{ animationDelay: "0.5s" }} />
      </div>
      <div className="relative text-center max-w-md">
        <div className="w-24 h-24 rounded-3xl bg-gradient-to-br from-violet-500 to-cyan-400 flex items-center justify-center text-4xl font-black text-white mx-auto mb-8 animate-bounce">🤖</div>
        <h1 className="text-3xl font-bold mb-3">AI is planning your trip</h1>
        <p className="text-white/50 mb-10">Claude is crafting the perfect experience just for you</p>
        <div className="space-y-3 text-left">
          {steps.map((s, i) => (
            <div key={i} className={`flex items-center gap-3 p-3 rounded-xl transition-all duration-500 ${i < step ? "bg-white/10" : i === step ? "bg-violet-500/20 border border-violet-500/30" : "opacity-30"}`}>
              <span className="text-lg">{i < step ? "✅" : i === step ? <span className="inline-block w-5 h-5 border-2 border-violet-400 border-t-transparent rounded-full animate-spin" /> : "⏳"}</span>
              <span className={`text-sm font-medium ${i === step ? "text-violet-300" : i < step ? "text-white/70" : "text-white/30"}`}>{s}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function ItineraryScreen({ trip, onNavigate, onSelectDay }) {
  if (!trip) return <EmptyState onNavigate={onNavigate} />;
  return (
    <div className="min-h-screen bg-black text-white pt-20 pb-12">
      <div className="max-w-4xl mx-auto px-4">
        {/* Hero */}
        <div className={`relative h-56 rounded-3xl overflow-hidden mb-8 bg-gradient-to-br ${trip.coverColor}`}>
          <div className="absolute inset-0 bg-black/30" />
          <div className="absolute inset-0 flex items-end p-8">
            <div>
              <div className="text-5xl mb-3">{trip.emoji}</div>
              <h1 className="text-4xl font-black text-white">{trip.destination}</h1>
              <div className="flex items-center gap-4 mt-2 text-white/80 text-sm">
                <span>📅 {trip.days} days</span>
                <span>💰 ${trip.budget.toLocaleString()} budget</span>
                <span>✨ {trip.mood}</span>
              </div>
            </div>
          </div>
        </div>
        {/* Quick Actions */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
          {[
            { label: "Map View", icon: "🗺️", screen: "map" },
            { label: "Budget", icon: "💸", screen: "budget" },
            { label: "Packing", icon: "🎒", screen: "packing" },
            { label: "Invoice", icon: "🧾", screen: "invoice" },
          ].map(a => (
            <button key={a.screen} onClick={() => onNavigate(a.screen)} className="bg-white/5 border border-white/10 rounded-2xl p-4 text-center hover:bg-white/10 hover:border-white/30 transition-all group">
              <div className="text-2xl mb-1 group-hover:scale-110 transition-transform">{a.icon}</div>
              <div className="text-sm font-medium text-white/70">{a.label}</div>
            </button>
          ))}
        </div>
        {/* Highlights */}
        {trip.highlights && (
          <div className="bg-gradient-to-r from-violet-500/20 to-cyan-500/20 border border-violet-500/30 rounded-2xl p-5 mb-8">
            <p className="text-white/80 text-sm leading-relaxed">✨ {trip.highlights}</p>
          </div>
        )}
        {/* Day Cards */}
        <h2 className="text-xl font-bold mb-4">Day-by-Day Itinerary</h2>
        <div className="space-y-4">
          {trip.itinerary?.map((day, i) => (
            <div key={i} onClick={() => { onSelectDay(day); onNavigate("daydetail"); }} className="bg-white/5 border border-white/10 rounded-2xl p-6 cursor-pointer hover:bg-white/10 hover:border-white/30 transition-all group">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-violet-600 to-cyan-500 flex items-center justify-center text-white font-bold text-lg flex-shrink-0">
                  {day.day}
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-1">
                    <h3 className="text-white font-semibold">{day.title}</h3>
                    <span className="text-white/30 group-hover:text-white/60 transition-colors text-lg">→</span>
                  </div>
                  <p className="text-white/50 text-sm leading-relaxed line-clamp-2">{day.plan}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
        <div className="mt-8 flex gap-3">
          <button onClick={() => onNavigate("summary")} className="flex-1 bg-gradient-to-r from-violet-600 to-cyan-500 text-white font-bold py-4 rounded-xl hover:opacity-90 transition-all">
            View Trip Summary
          </button>
          <button onClick={() => onNavigate("share")} className="bg-white/10 border border-white/20 text-white font-semibold px-6 py-4 rounded-xl hover:bg-white/20 transition-all">
            🔗 Share
          </button>
        </div>
      </div>
    </div>
  );
}

function DayDetailScreen({ day, trip, onNavigate }) {
  if (!day) return <EmptyState onNavigate={onNavigate} />;
  const activities = day.plan?.split(/[,.]/).filter(a => a.trim().length > 10) || [];
  return (
    <div className="min-h-screen bg-black text-white pt-20 pb-12">
      <div className="max-w-2xl mx-auto px-4">
        <button onClick={() => onNavigate("itinerary")} className="text-white/50 hover:text-white text-sm mb-6 flex items-center gap-2">← Back to Itinerary</button>
        <div className="flex items-center gap-4 mb-8">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-violet-600 to-cyan-500 flex items-center justify-center text-white font-black text-2xl">
            {day.day}
          </div>
          <div>
            <p className="text-white/50 text-sm">Day {day.day} of {trip?.days}</p>
            <h1 className="text-2xl font-bold">{day.title}</h1>
          </div>
        </div>
        {/* Plan */}
        <div className="bg-white/5 border border-white/10 rounded-2xl p-6 mb-6">
          <h2 className="text-lg font-semibold mb-4">📋 Today's Plan</h2>
          <p className="text-white/70 leading-relaxed mb-6">{day.plan}</p>
          {activities.length > 1 && (
            <div className="space-y-3">
              {activities.slice(0, 4).map((a, i) => (
                <div key={i} className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-violet-500/30 flex items-center justify-center text-violet-400 text-xs font-bold flex-shrink-0 mt-0.5">{i + 1}</div>
                  <p className="text-white/60 text-sm">{a.trim()}</p>
                </div>
              ))}
            </div>
          )}
        </div>
        {/* Tips */}
        <div className="bg-gradient-to-r from-amber-500/10 to-orange-500/10 border border-amber-500/20 rounded-2xl p-5 mb-6">
          <h3 className="text-amber-400 font-semibold mb-2">💡 Travel Tips</h3>
          <ul className="space-y-1 text-white/60 text-sm">
            <li>• Book restaurants in advance for dinner reservations</li>
            <li>• Keep local currency for smaller vendors</li>
            <li>• Download offline maps before heading out</li>
          </ul>
        </div>
        <div className="flex gap-3">
          {day.day > 1 && <button onClick={() => onNavigate("itinerary")} className="flex-1 bg-white/10 border border-white/20 text-white py-3 rounded-xl hover:bg-white/20 transition-all text-sm font-medium">← Previous Day</button>}
          {day.day < (trip?.days || 1) && <button onClick={() => onNavigate("itinerary")} className="flex-1 bg-gradient-to-r from-violet-600 to-cyan-500 text-white py-3 rounded-xl hover:opacity-90 transition-all text-sm font-bold">Next Day →</button>}
        </div>
      </div>
    </div>
  );
}

function MapScreen({ trip, onNavigate }) {
  const [coords, setCoords] = useState([]);
  const [loading, setLoading] = useState(true);
  const locations = trip?.locations || [];

  useEffect(() => {
    const geocodeAll = async () => {
      setLoading(true);
      const results = [];
      for (const loc of locations) {
        try {
          const res = await fetch(
            `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(loc)}`
          );
          const data = await res.json();
          if (data[0]) {
            results.push([parseFloat(data[0].lat), parseFloat(data[0].lon)]);
          }
        } catch (e) {
          console.error("Geocode failed for", loc);
        }
      }
      setCoords(results);
      setLoading(false);
    };
    if (locations.length > 0) geocodeAll();
  }, [trip]);

  const center = coords.length > 0 ? coords[0] : [20, 0];

  return (
    <div className="min-h-screen bg-black text-white pt-20 pb-12">
      <div className="max-w-4xl mx-auto px-4">
        <div className="flex items-center justify-between mb-6">
          <div>
            <button onClick={() => onNavigate("itinerary")} className="text-white/50 hover:text-white text-sm mb-1 flex items-center gap-1">← Back</button>
            <h1 className="text-2xl font-bold">🗺️ Trip Map</h1>
          </div>
          <div className="text-white/50 text-sm">{trip?.destination}</div>
        </div>
        {loading ? (
          <div className="h-96 bg-white/5 border border-white/10 rounded-3xl flex items-center justify-center">
            <div className="text-center">
              <div className="w-8 h-8 border-2 border-violet-400 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
              <p className="text-white/50 text-sm">Loading map locations...</p>
            </div>
          </div>
        ) : (
          <div className="rounded-3xl overflow-hidden border border-white/10 mb-6" style={{ height: "450px" }}>
            <MapContainer center={center} zoom={5} style={{ height: "100%", width: "100%" }}>
              <TileLayer
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                attribution='&copy; OpenStreetMap contributors'
              />
              {coords.map((pos, i) => (
                <Marker key={i} position={pos}>
                  <Popup>
                    <strong>{locations[i]}</strong>
                  </Popup>
                </Marker>
              ))}
              {coords.length > 1 && (
                <Polyline positions={coords} color="#7c3aed" weight={3} dashArray="8,4" />
              )}
            </MapContainer>
          </div>
        )}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {locations.map((loc, i) => (
            <div key={i} className="bg-white/5 border border-white/10 rounded-xl p-3 flex items-center gap-3">
              <div className={`w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-bold ${i === 0 ? "bg-violet-600" : "bg-cyan-600"}`}>{i + 1}</div>
              <span className="text-white/70 text-sm">{loc}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function BudgetScreen({ trip, onNavigate }) {
  if (!trip) return <EmptyState onNavigate={onNavigate} />;
  const bd = trip.budgetBreakdown || {};
  const total = Object.values(bd).reduce((a, b) => a + b, 0);
  const categories = [
    { label: "Hotel", key: "hotel", icon: "🏨", color: "bg-violet-500" },
    { label: "Food & Dining", key: "food", icon: "🍽️", color: "bg-cyan-500" },
    { label: "Travel", key: "travel", icon: "✈️", color: "bg-pink-500" },
    { label: "Activities", key: "activities", icon: "🎯", color: "bg-amber-500" },
  ];
  return (
    <div className="min-h-screen bg-black text-white pt-20 pb-12">
      <div className="max-w-2xl mx-auto px-4">
        <button onClick={() => onNavigate("itinerary")} className="text-white/50 hover:text-white text-sm mb-6 flex items-center gap-1">← Back</button>
        <h1 className="text-3xl font-bold mb-2">💸 Budget Overview</h1>
        <p className="text-white/50 mb-8">{trip.destination} · {trip.days} days</p>
        {/* Total */}
        <div className="bg-gradient-to-br from-violet-600/30 to-cyan-500/30 border border-violet-500/30 rounded-3xl p-8 mb-8 text-center">
          <p className="text-white/60 text-sm mb-1">Total Budget</p>
          <p className="text-5xl font-black text-white">${trip.budget.toLocaleString()}</p>
          <p className="text-white/40 text-sm mt-2">Allocated: ${total.toLocaleString()}</p>
        </div>
        {/* Bar Chart */}
        <div className="bg-white/5 border border-white/10 rounded-2xl p-6 mb-6">
          <h2 className="font-semibold mb-5">Spending Breakdown</h2>
          <div className="space-y-4">
            {categories.map(c => {
              const amount = bd[c.key] || 0;
              const pct = total > 0 ? Math.round((amount / total) * 100) : 0;
              return (
                <div key={c.key}>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-white/70 text-sm flex items-center gap-2">{c.icon} {c.label}</span>
                    <span className="text-white font-semibold">${amount.toLocaleString()} <span className="text-white/40 text-xs">({pct}%)</span></span>
                  </div>
                  <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                    <div className={`h-full ${c.color} rounded-full transition-all duration-700`} style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
        {/* Per day */}
        <div className="grid grid-cols-2 gap-4 mb-6">
          <div className="bg-white/5 border border-white/10 rounded-2xl p-5 text-center">
            <p className="text-white/50 text-xs mb-1">Per Day</p>
            <p className="text-2xl font-bold text-white">${Math.round(trip.budget / trip.days)}</p>
          </div>
          <div className="bg-white/5 border border-white/10 rounded-2xl p-5 text-center">
            <p className="text-white/50 text-xs mb-1">Remaining (mock)</p>
            <p className="text-2xl font-bold text-green-400">${Math.round(trip.budget * 0.15)}</p>
          </div>
        </div>
        <button onClick={() => onNavigate("invoice")} className="w-full bg-gradient-to-r from-violet-600 to-cyan-500 text-white font-bold py-4 rounded-xl hover:opacity-90 transition-all">
          🧾 View Invoice →
        </button>
      </div>
    </div>
  );
}

function InvoiceScreen({ trip, onNavigate }) {
  if (!trip) return <EmptyState onNavigate={onNavigate} />;
  const bd = trip.budgetBreakdown || {};
  const rows = [
    { cat: "Hotel", desc: `${trip.days} nights accommodation`, qty: trip.days, unit: Math.round((bd.hotel || 0) / trip.days), total: bd.hotel || 0 },
    { cat: "Food", desc: "Daily meals & dining", qty: trip.days, unit: Math.round((bd.food || 0) / trip.days), total: bd.food || 0 },
    { cat: "Travel", desc: "Flights & local transport", qty: 1, unit: bd.travel || 0, total: bd.travel || 0 },
    { cat: "Activities", desc: "Tours, entry fees & experiences", qty: trip.days, unit: Math.round((bd.activities || 0) / trip.days), total: bd.activities || 0 },
  ];
  const subtotal = rows.reduce((a, r) => a + r.total, 0);
  const tax = Math.round(subtotal * 0.08);
  return (
    <div className="min-h-screen bg-black text-white pt-20 pb-12">
      <div className="max-w-3xl mx-auto px-4">
        <button onClick={() => onNavigate("budget")} className="text-white/50 hover:text-white text-sm mb-6 flex items-center gap-1">← Back</button>
        <div className="bg-white/5 border border-white/10 rounded-3xl overflow-hidden">
          {/* Invoice Header */}
          <div className="bg-gradient-to-r from-violet-900/50 to-cyan-900/50 border-b border-white/10 p-8">
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-cyan-400 flex items-center justify-center font-black text-white">T</div>
                  <span className="text-xl font-bold">Traveloop</span>
                </div>
                <h1 className="text-3xl font-black mb-1">INVOICE</h1>
                <p className="text-white/50 text-sm">#TRP-{trip.id.slice(-6).toUpperCase()}</p>
              </div>
              <div className="text-right">
                <p className="text-white/50 text-xs mb-1">Trip Date</p>
                <p className="text-white font-semibold">{trip.createdAt}</p>
                <p className="text-white/50 text-xs mt-2 mb-1">Status</p>
                <span className="bg-green-500/20 text-green-400 text-xs px-2 py-1 rounded-full">Paid</span>
              </div>
            </div>
            <div className="mt-6 pt-6 border-t border-white/10">
              <p className="text-white/50 text-sm mb-1">Trip Destination</p>
              <p className="text-xl font-bold">{trip.destination}</p>
              <p className="text-white/40 text-sm">{trip.days} days · {trip.mood} experience</p>
            </div>
          </div>
          {/* Table */}
          <div className="p-6">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/10">
                  <th className="text-left text-white/40 pb-3 font-medium">Category</th>
                  <th className="text-left text-white/40 pb-3 font-medium">Description</th>
                  <th className="text-right text-white/40 pb-3 font-medium">Qty</th>
                  <th className="text-right text-white/40 pb-3 font-medium">Unit</th>
                  <th className="text-right text-white/40 pb-3 font-medium">Total</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r, i) => (
                  <tr key={i} className="border-b border-white/5">
                    <td className="py-4 font-medium text-white">{r.cat}</td>
                    <td className="py-4 text-white/50">{r.desc}</td>
                    <td className="py-4 text-right text-white/70">{r.qty}</td>
                    <td className="py-4 text-right text-white/70">${r.unit}</td>
                    <td className="py-4 text-right font-semibold text-white">${r.total.toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="mt-6 space-y-2 border-t border-white/10 pt-4">
              <div className="flex justify-between text-white/60 text-sm"><span>Subtotal</span><span>${subtotal.toLocaleString()}</span></div>
              <div className="flex justify-between text-white/60 text-sm"><span>Tax (8%)</span><span>${tax.toLocaleString()}</span></div>
              <div className="flex justify-between text-white font-bold text-lg border-t border-white/20 pt-3 mt-3"><span>Total</span><span>${(subtotal + tax).toLocaleString()}</span></div>
            </div>
          </div>
          <div className="p-6 border-t border-white/10 flex gap-3">
            <button className="flex-1 bg-white/10 border border-white/20 text-white font-semibold py-3 rounded-xl hover:bg-white/20 transition-all text-sm">⬇ Download PDF</button>
            <button className="flex-1 bg-gradient-to-r from-violet-600 to-cyan-500 text-white font-bold py-3 rounded-xl hover:opacity-90 transition-all text-sm">Mark as Paid</button>
          </div>
        </div>
      </div>
    </div>
  );
}

function PackingScreen({ trip, onNavigate }) {
  const [checked, setChecked] = useState({});
  const packingList = trip?.packingList || getPackingList(trip?.destination || "", trip?.mood || "");
  const categories = {
    "Essentials 📋": packingList.filter(i => ["Passport", "Travel adapter", "First aid kit", "Travel insurance docs", "Credit/debit cards", "Medications", "Toiletries"].some(e => i.includes(e.split(" ")[0]))),
    "Clothing 👕": packingList.filter(i => ["jacket", "coat", "clothing", "wear", "dress", "socks", "shoes", "boots", "layers", "thermal"].some(e => i.toLowerCase().includes(e))),
    "Gear & Extras 🎒": packingList.filter(i => !["Passport", "Travel adapter", "First aid kit", "Travel insurance docs", "Credit/debit cards", "Medications", "Toiletries"].some(e => i.includes(e.split(" ")[0])) && !["jacket", "coat", "clothing", "wear", "dress", "socks", "shoes", "boots", "layers", "thermal"].some(e => i.toLowerCase().includes(e))),
  };
  const total = packingList.length;
  const done = Object.values(checked).filter(Boolean).length;

  return (
    <div className="min-h-screen bg-black text-white pt-20 pb-12">
      <div className="max-w-2xl mx-auto px-4">
        <button onClick={() => onNavigate("itinerary")} className="text-white/50 hover:text-white text-sm mb-6 flex items-center gap-1">← Back</button>
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold">🎒 Packing List</h1>
            <p className="text-white/50 mt-1">{trip?.destination}</p>
          </div>
          <div className="text-right">
            <div className="text-2xl font-bold text-white">{done}/{total}</div>
            <div className="text-white/50 text-xs">packed</div>
          </div>
        </div>
        {/* Progress */}
        <div className="bg-white/5 border border-white/10 rounded-2xl p-5 mb-6">
          <div className="flex justify-between text-sm mb-2">
            <span className="text-white/60">Packing progress</span>
            <span className="text-white font-medium">{total > 0 ? Math.round((done / total) * 100) : 0}%</span>
          </div>
          <div className="h-3 bg-white/10 rounded-full overflow-hidden">
            <div className="h-full bg-gradient-to-r from-violet-500 to-cyan-500 rounded-full transition-all duration-500" style={{ width: `${total > 0 ? (done / total) * 100 : 0}%` }} />
          </div>
          {done === total && total > 0 && <p className="text-green-400 text-sm mt-3 text-center">🎉 All packed! Ready to go!</p>}
        </div>
        {/* Lists */}
        {Object.entries(categories).map(([cat, items]) => items.length > 0 && (
          <div key={cat} className="bg-white/5 border border-white/10 rounded-2xl p-5 mb-4">
            <h3 className="font-semibold text-white/80 mb-4">{cat}</h3>
            <div className="space-y-2">
              {items.map((item, i) => (
                <label key={i} className="flex items-center gap-3 cursor-pointer group">
                  <div onClick={() => setChecked(c => ({ ...c, [item]: !c[item] }))} className={`w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 transition-all ${checked[item] ? "bg-violet-500 border-violet-500" : "border-white/30 group-hover:border-white/60"}`}>
                    {checked[item] && <span className="text-white text-xs">✓</span>}
                  </div>
                  <span className={`text-sm transition-all ${checked[item] ? "line-through text-white/30" : "text-white/70"}`}>{item}</span>
                </label>
              ))}
            </div>
          </div>
        ))}
        <button onClick={() => setChecked({})} className="w-full bg-white/5 border border-white/10 text-white/50 py-3 rounded-xl hover:bg-white/10 transition-all text-sm mt-2">Reset All</button>
      </div>
    </div>
  );
}

function SummaryScreen({ trip, onNavigate }) {
  if (!trip) return <EmptyState onNavigate={onNavigate} />;
  return (
    <div className="min-h-screen bg-black text-white pt-20 pb-12">
      <div className="max-w-2xl mx-auto px-4">
        <div className="text-center mb-10">
          <div className="text-6xl mb-4">{trip.emoji}</div>
          <h1 className="text-4xl font-black mb-2">{trip.destination}</h1>
          <p className="text-white/50">{trip.highlights || "Your perfect travel experience"}</p>
        </div>
        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 mb-8">
          {[
            { label: "Days", value: trip.days, icon: "📅" },
            { label: "Budget", value: "$" + trip.budget, icon: "💰" },
            { label: "Stops", value: trip.locations?.length || 0, icon: "📍" },
          ].map((s, i) => (
            <div key={i} className="bg-white/5 border border-white/10 rounded-2xl p-4 text-center">
              <div className="text-2xl mb-1">{s.icon}</div>
              <div className="text-xl font-bold">{s.value}</div>
              <div className="text-white/40 text-xs">{s.label}</div>
            </div>
          ))}
        </div>
        {/* Highlights */}
        <div className="bg-white/5 border border-white/10 rounded-2xl p-6 mb-6">
          <h2 className="font-semibold mb-4">📍 Key Locations</h2>
          <div className="flex flex-wrap gap-2">
            {trip.locations?.map((loc, i) => (
              <span key={i} className="bg-violet-500/20 border border-violet-500/30 text-violet-300 text-sm px-3 py-1.5 rounded-full">{loc}</span>
            ))}
          </div>
        </div>
        <div className="bg-white/5 border border-white/10 rounded-2xl p-6 mb-6">
          <h2 className="font-semibold mb-4">📆 Itinerary Highlights</h2>
          <div className="space-y-3">
            {trip.itinerary?.slice(0, 3).map((day, i) => (
              <div key={i} className="flex items-center gap-3">
                <span className="w-6 h-6 rounded-full bg-cyan-500/30 text-cyan-400 text-xs flex items-center justify-center font-bold">{day.day}</span>
                <span className="text-white/60 text-sm">{day.title}</span>
              </div>
            ))}
            {trip.itinerary?.length > 3 && <p className="text-white/30 text-sm pl-9">+ {trip.itinerary.length - 3} more days</p>}
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <button onClick={() => onNavigate("share")} className="bg-gradient-to-r from-violet-600 to-cyan-500 text-white font-bold py-4 rounded-xl hover:opacity-90 transition-all">🔗 Share Trip</button>
          <button onClick={() => onNavigate("dashboard")} className="bg-white/10 border border-white/20 text-white font-semibold py-4 rounded-xl hover:bg-white/20 transition-all">← Dashboard</button>
        </div>
      </div>
    </div>
  );
}

function ShareScreen({ trip, onNavigate }) {
  const [copied, setCopied] = useState(false);
  const shareUrl = `https://traveloop.app/trip/${trip?.id || "demo"}`;
  return (
    <div className="min-h-screen bg-black text-white pt-20 pb-12">
      <div className="max-w-2xl mx-auto px-4">
        <h1 className="text-3xl font-bold mb-2">🔗 Share Your Trip</h1>
        <p className="text-white/50 mb-8">Let others see your amazing itinerary</p>
        <div className="bg-white/5 border border-white/10 rounded-3xl overflow-hidden mb-6">
          <div className={`h-40 bg-gradient-to-br ${trip?.coverColor || "from-violet-500 to-cyan-500"} flex items-center justify-center text-5xl`}>{trip?.emoji || "✈️"}</div>
          <div className="p-6">
            <h2 className="text-xl font-bold mb-1">{trip?.destination || "My Trip"}</h2>
            <p className="text-white/50 text-sm mb-4">{trip?.days} days · {trip?.mood} · ${trip?.budget}</p>
            <div className="flex gap-2">
              <input readOnly value={shareUrl} className="flex-1 bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-white/60 text-sm" />
              <button onClick={() => { setCopied(true); setTimeout(() => setCopied(false), 2000); }} className="bg-violet-600 text-white px-4 py-3 rounded-xl text-sm font-medium hover:bg-violet-500 transition-all whitespace-nowrap">
                {copied ? "✓ Copied!" : "Copy"}
              </button>
            </div>
          </div>
        </div>
        <div className="grid grid-cols-3 gap-3 mb-8">
          {["Twitter / X", "WhatsApp", "Instagram"].map(s => (
            <button key={s} className="bg-white/5 border border-white/10 rounded-xl p-4 text-center hover:bg-white/10 transition-all">
              <div className="text-2xl mb-1">{s.includes("Twitter") ? "🐦" : s.includes("WhatsApp") ? "💬" : "📸"}</div>
              <div className="text-xs text-white/50">{s}</div>
            </button>
          ))}
        </div>
        <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
          <h3 className="font-semibold mb-3">👀 Public Preview</h3>
          <p className="text-white/50 text-sm">Anyone with this link can view your itinerary, locations, and highlights — but not your personal budget details.</p>
        </div>
      </div>
    </div>
  );
}

function EmptyState({ onNavigate }) {
  return (
    <div className="min-h-screen bg-black text-white flex items-center justify-center px-4 pt-16">
      <div className="text-center max-w-md">
        <div className="text-8xl mb-6 animate-bounce">🗺️</div>
        <h1 className="text-3xl font-bold mb-3">No trips yet!</h1>
        <p className="text-white/50 mb-8 leading-relaxed">You haven't planned any trips yet. Let our AI build you the perfect itinerary in seconds.</p>
        <button onClick={() => onNavigate("create")} className="bg-gradient-to-r from-violet-600 to-cyan-500 text-white font-bold px-8 py-4 rounded-2xl text-lg hover:opacity-90 transition-all hover:scale-105">
          ✨ Plan My First Trip
        </button>
      </div>
    </div>
  );
}

function ProfileScreen({ user, trips, onNavigate, onLogout }) {
  return (
    <div className="min-h-screen bg-black text-white pt-20 pb-12">
      <div className="max-w-2xl mx-auto px-4">
        <div className="text-center mb-10">
          <div className="w-24 h-24 rounded-3xl bg-gradient-to-br from-violet-500 to-cyan-400 flex items-center justify-center text-4xl font-black text-white mx-auto mb-4">
            {user?.name?.[0] || "U"}
          </div>
          <h1 className="text-2xl font-bold">{user?.name}</h1>
          <p className="text-white/50">{user?.email}</p>
        </div>
        <div className="space-y-4">
          <div className="bg-white/5 border border-white/10 rounded-2xl p-5">
            <h2 className="font-semibold mb-4">Preplanned Trips</h2>
            <div className="grid grid-cols-3 gap-3">
              {trips.filter(t => t.status === "upcoming").map(t => (
                <div key={t.id} className={`h-20 rounded-xl bg-gradient-to-br ${t.coverColor} flex items-center justify-center text-2xl cursor-pointer hover:opacity-80`} onClick={() => onNavigate("itinerary")}>
                  {t.emoji}
                </div>
              ))}
              {trips.filter(t => t.status === "upcoming").length === 0 && <p className="text-white/30 text-sm col-span-3">No upcoming trips</p>}
            </div>
          </div>
          <div className="bg-white/5 border border-white/10 rounded-2xl p-5">
            <h2 className="font-semibold mb-4">Previous Trips</h2>
            <div className="grid grid-cols-3 gap-3">
              {trips.filter(t => t.status === "completed").map(t => (
                <div key={t.id} className={`h-20 rounded-xl bg-gradient-to-br ${t.coverColor} opacity-70 flex items-center justify-center text-2xl cursor-pointer hover:opacity-100`} onClick={() => onNavigate("itinerary")}>
                  {t.emoji}
                </div>
              ))}
            </div>
          </div>
          <button onClick={() => { onLogout(); onNavigate("landing"); }} className="w-full bg-red-500/20 border border-red-500/30 text-red-400 font-semibold py-3.5 rounded-xl hover:bg-red-500/30 transition-all">
            Sign Out
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── MAIN APP ─────────────────────────────────────────────────────────────────
export default function App() {
  const [screen, setScreen] = useState("landing");
  const [user, setUser] = useState(null);
  const [trips, setTrips] = useState([]);

useEffect(() => {
  const fetchTrips = async () => {
    if (!user) return;
    try {
      const q = query(collection(db, "trips"), where("userId", "==", user.uid));
      const snap = await getDocs(q);
      const fetched = snap.docs.map(d => {
  const data = d.data();
  return {
    ...data,
    id: d.id,
    createdAt: data.createdAt?.toDate?.().toISOString().split("T")[0] || new Date().toISOString().split("T")[0],
  };
});
      setTrips(fetched.length > 0 ? fetched : MOCK_TRIPS);
    } catch (e) {
      console.error("Error fetching trips:", e);
      setTrips(MOCK_TRIPS);
    }
  };
  fetchTrips();
}, [user]);
  const [selectedTrip, setSelectedTrip] = useState(null);
  const [selectedDay, setSelectedDay] = useState(null);

  const navigate = (s) => setScreen(s);
  const handleAuth = (u) => setUser(u);
  const handleLogout = () => { setUser(null); setSelectedTrip(null); };
  const handleTripCreated = async (trip) => {
  setTrips(prev => [trip, ...prev]);
  setSelectedTrip(trip);
  try {
    await addDoc(collection(db, "trips"), {
      ...trip,
      userId: user?.uid,
      createdAt: serverTimestamp(),
    });
    console.log("Trip saved to Firestore!");
  } catch (e) {
    console.error("Error saving trip:", e);
  }
};
  const handleSelectTrip = (trip) => setSelectedTrip(trip);
  const handleSelectDay = (day) => setSelectedDay(day);

  const screens = {
    landing: <LandingScreen onNavigate={navigate} user={user} trips={trips} />,
    login: <AuthScreen mode="login" onNavigate={navigate} onAuth={handleAuth} />,
    signup: <AuthScreen mode="signup" onNavigate={navigate} onAuth={handleAuth} />,
    dashboard: <DashboardScreen onNavigate={navigate} user={user} trips={trips} onSelectTrip={handleSelectTrip} />,
    create: <CreateTripScreen onNavigate={navigate} user={user} onTripCreated={handleTripCreated} />,
    ailoading: <AILoadingScreen />,
    itinerary: <ItineraryScreen trip={selectedTrip || trips[0]} onNavigate={navigate} onSelectDay={handleSelectDay} />,
    daydetail: <DayDetailScreen day={selectedDay} trip={selectedTrip || trips[0]} onNavigate={navigate} />,
    map: <MapScreen trip={selectedTrip || trips[0]} onNavigate={navigate} />,
    budget: <BudgetScreen trip={selectedTrip || trips[0]} onNavigate={navigate} />,
    invoice: <InvoiceScreen trip={selectedTrip || trips[0]} onNavigate={navigate} />,
    packing: <PackingScreen trip={selectedTrip || trips[0]} onNavigate={navigate} />,
    summary: <SummaryScreen trip={selectedTrip || trips[0]} onNavigate={navigate} />,
    share: <ShareScreen trip={selectedTrip || trips[0]} onNavigate={navigate} />,
    profile: <ProfileScreen user={user} trips={trips} onNavigate={navigate} onLogout={handleLogout} />,
    empty: <EmptyState onNavigate={navigate} />,
  };

  return (
    <div className="bg-black min-h-screen font-sans">
      <NavBar currentScreen={screen} onNavigate={navigate} user={user} trips={trips} />
      {screens[screen] || screens.landing}
    </div>
  );
}