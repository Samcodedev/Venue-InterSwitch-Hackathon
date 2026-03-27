# 🚀 SmartMove – Next-Gen Transit & Fleet Management

**SmartMove** is a scalable, real-time transportation and transit tracking platform built for modern cities and inter-city travel. It brings order to the unpredictability of transit by combining **live GPS vehicle tracking, AI-powered arrival predictions, and a seamless booking experience** directly integrated with the **Interswitch Payment Gateway**.

This project was built and submitted for the **Interswitch Venue Hackathon**.

## Link to the [Back-end Repo](https://github.com/Samcodedev/SmartMove/tree/main/back-end/)

---

## 💡 The Problem We Are Solving

Public transit and private fleet operations often suffer from the same set of problems:
1. **Opaque Schedules:** Riders wait at stops with no idea when the next bus will actually arrive.
2. **Unpredictable Delays:** Traffic and weather conditions make static timetables obsolete.
3. **Friction in Payments:** Paying for trips often involves cash handling or disconnected third-party apps.
4. **Management Blindspots:** Fleet administrators lack real-time oversight of their vehicles and active route density.

**SmartMove** fixes this by bridging the gap between fleet dispatchers, drivers, and commuters in a single unified platform. 

---

## ✨ Key Features

### 📍 Live Fleet Tracking
Built on top of OpenStreetMap and `react-leaflet`, SmartMove renders active vehicles on an interactive map in real-time. Riders can open the dashboard, see exactly where their bus is, and track its movement towards their specific pickup location.

### 🧠 AI-Powered Estimates & ETAs
The platform doesn't just guess when a bus will arrive. It utilizes real-time feeds and historical trip data to calculate **predicted journey durations, expected delays, and current traffic conditions**. Commuters get a confidence score alongside their ETA.

### 💳 Seamless Interswitch Payments
Booking a seat is entirely frictionless. Once a user reserves a seat on a specific trip, they are seamlessly handed off to the **Interswitch Payment Gateway** to finalize their fare. The platform automatically confirms the booking upon a successful transaction callback.

### 🛣️ Smart Route Discovery
Users can input their desired starting location and destination. SmartMove computationally filters through active routes to guarantee the stops are connected, dynamically calculates distance (km), and finds the best matching trip available. 

### 👥 Role-Based Ecosystem
- **Riders (Commuters):** Can explore routes, track buses live, book seats, and pay online.
- **Drivers:** Can update their statuses, be assigned to buses, and broadcast their GPS location.
- **Admins:** Have a dedicated dashboard to manage routes, deploy buses, and monitor network health.

---

## 🛠️ Technology Stack

Our frontend architecture is built for extreme speed, reactivity, and type-safety.

- **Framework:** React 19 powered by Vite for lightning-fast HMR and optimized builds.
- **Language:** TypeScript for comprehensive type-safety across domain models and API responses.
- **Styling:** Tailwind CSS v4 alongside modular components for a beautiful, premium, and highly responsive user interface.
- **Geospatial & Maps:** `leaflet` and `react-leaflet` to render custom map tiles, bounding boxes, and dynamic routing paths.
- **HTTP Client:** `axios` configured with intelligent interceptors for token refreshing and error un-wrapping.
- **Animations:** `motion` for fluid micro-animations and page transitions.
- **Icons:** Heroicons (`react-icons/hi2`).

---

## 🚦 Getting Started

Follow these instructions to run the SmartMove frontend locally on your machine.

### Prerequisites
- [Node.js](https://nodejs.org/) (v18 or higher recommended)
- `npm` or `yarn`

### Installation

1. **Clone the repository:**
   ```bash
   git clone <your-repo-url>
   cd Venue-InterSwitch-Hackathon
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Environment Setup:**
   Duplicate the `.env.example` file and rename it to `.env`:
   ```bash
   cp .env.example .env
   ```
   Ensure the `VITE_API_BASE_URL` is pointing to your backend (default is usually `http://localhost:5000/api`).

4. **Start the development server:**
   ```bash
   npm run dev
   ```

5. **Open the app:**
   Open your browser and navigate to `http://localhost:5173`.

---

## 🚀 Future Roadmap

- **Offline Mode:** Implement PWA service workers for riders to view their tickets and route maps even without cell service.
- **Driver Mobile App:** A dedicated React Native application for drivers to make location polling more battery-efficient natively.
- **Dynamic Pricing Algorithms:** Adjust base fares automatically based on route demand, weather, and time of day. 

---

*Built with ❤️ for the Interswitch Hackathon.*
