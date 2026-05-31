# ROADSoS

### AI-Powered Emergency Decision Intelligence Platform

> From Panic to Action. From Search to Decision Intelligence.

---

## Problem Statement

During emergencies, users often lose critical time searching for hospitals, emergency services, and appropriate response actions.

Traditional navigation systems provide locations but do not provide emergency-specific decision support.

ROADSoS bridges this gap using AI-powered emergency analysis, location intelligence, specialized hospital routing, and emergency resource discovery.

---

## Key Features

### AI Emergency Analysis

* Google Gemini 2.0 Flash powered emergency understanding
* Severity assessment
* Emergency classification
* Actionable emergency guidance

### Specialized Medical Routing

* Trauma Care
* Cardiac Care
* Neurology
* Burns Care
* General Medical Emergencies

### Emergency Resource Discovery

* Hospitals
* Trauma Centres
* Police Stations
* Mechanics
* Towing Services
* Fuel Stations
* Vehicle Service Centres

### Country-Aware Emergency Support

* 21+ supported countries
* Dynamic emergency numbers
* Country-specific emergency assistance

### SOS Alert System

* Fast2SMS integration
* WhatsApp emergency fallback
* GPS-enabled emergency messages
* Emergency contact notifications

### Trip Safety Mode

* Live GPS tracking
* Reverse geocoding
* Checkpoint monitoring
* Safety status updates

### Offline Emergency Readiness

* Cached emergency resources
* Cached location data
* SOS retry queue
* Offline first-aid guidance

---

# Technical Highlights

| Metric                     | Value       |
| -------------------------- | ----------- |
| Countries Supported        | 21+         |
| Verified Trauma Centres    | 26          |
| Reliability Layers         | 12          |
| Offline Emergency Features | 8           |
| Emergency Categories       | 5           |
| Search Radius              | Up to 30 KM |
| Nearby Resources Cached    | 20          |
| Ranked Results Displayed   | 10          |

---

# Architecture

User Input

↓

AI Emergency Analysis

↓

Severity Assessment

↓

Hospital Hint Generation

↓

Location Intelligence Engine

↓

Emergency Resource Discovery

↓

Distance & Relevance Ranking

↓

Recommended Action Plan

---

# Technology Stack

## Frontend

* React 18
* TypeScript
* Vite
* TanStack Router
* Tailwind CSS

## AI

* Google Gemini 2.0 Flash

## Maps & Location

* OpenStreetMap
* Overpass API
* Nominatim
* Leaflet

## Backend Services

* Firebase Firestore
* Fast2SMS

## Mobile Support

* Capacitor 7
* Capacitor Geolocation

## Offline Support

* Workbox PWA
* LocalStorage Caching

---

# Reliability & Fallback Architecture

ROADSoS includes multiple reliability layers to ensure operation during emergency situations.

### Reliability Mechanisms

* Multi-Mirror Overpass API Support
* GPS Fallback
* Cached Location Recovery
* Country Profile Cache
* AI Fallback Engine
* Trauma Centre Database Fallback
* SOS Retry Queue
* WhatsApp Emergency Fallback
* Offline Emergency Guidance
* Last Known Location Recovery
* Dynamic Geocoding Cache
* Platform-Aware Location Services

---

# AI Workflow

User Emergency Description

↓

Gemini Analysis

↓

Severity Assessment

↓

Emergency Classification

↓

Guidance Generation

↓

Hospital Recommendation

↓

Nearby Resource Discovery

---

# Offline Features

Available Without Internet:

* First Aid Guidance
* Emergency Classification (Fallback Engine)
* Trauma Centre Routing
* Emergency Contact Access
* Cached Resource Access
* Country Emergency Numbers
* SOS Queue Storage
* Last Known Location Recovery

---

# Project Structure

```bash
src/
│
├── routes/
│   ├── home.tsx
│   ├── emergency.tsx
│   ├── analysis.tsx
│   ├── nearby.tsx
│   ├── medical.tsx
│   ├── sos.tsx
│   ├── trip.tsx
│   ├── contacts.tsx
│   ├── guidance.tsx
│   └── offline.tsx
│
├── services/
│   ├── places.ts
│   └── location.ts
│
├── utils/
│   ├── emergencyIntelligence.ts
│   ├── countryEmergency.ts
│   ├── traumaCentres.ts
│   └── sosQueue.ts
│
├── ai/
│   └── gemini.ts
│
└── firebase/
    ├── config.ts
    └── users.ts
```

---

# Installation

Clone the repository

```bash
git clone https://github.com/YOUR_USERNAME/roadsos.git
```

Navigate to project

```bash
cd roadsos
```

Install dependencies

```bash
npm install
```

Run development server

```bash
npm run dev
```

Build project

```bash
npm run build
```

---

# Environment Variables

Create a `.env` file:

```env
VITE_GEMINI_API_KEY=
VITE_FIREBASE_API_KEY=
VITE_FIREBASE_AUTH_DOMAIN=
VITE_FIREBASE_PROJECT_ID=
VITE_FIREBASE_STORAGE_BUCKET=
VITE_FIREBASE_MESSAGING_SENDER_ID=
VITE_FIREBASE_APP_ID=
VITE_FAST2SMS_API_KEY=
```

---

# Deployment

### Web Application

Deploy using:

* Netlify
* Vercel
* Cloudflare Pages

### Progressive Web App

Install directly from browser.

### Android Application

```bash
npm run build
npx cap sync android
```

Build APK using Android Studio.

---

# Future Scope

* Push Notifications (FCM)
* Government Emergency Network Integration
* Ambulance Dispatch Integration
* Advanced Trauma Centre Database
* Smart City Emergency Integration
* Background Trip Tracking

---

# Team

Team Name: CRASH PREVENTERS

Members:

* ## N. Saichandana
* ## N. Janaki
* ## Ayyan
* ## Muthu Kumar 

---

# Live Demo

Web Application:
https://roadhack.netlify.app

GitHub Repository:
https://github.com/nsaichandana/roadside-rescue
---

# License

This project was developed as part of a Hackathon submission.

ROADSoS © 2026

Because every second counts.
