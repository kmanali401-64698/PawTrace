T# 🐾 PawTrace

**A full-stack pet identification and safety app.** PawTrace lets pet owners register their pets with a unique, scannable QR code — so if a pet ever goes missing, anyone who finds it can scan the tag and instantly see contact details and help reunite them. Vets can also log medical reports tied to each pet's profile, giving future vets full visibility into a pet's health history.

Built as a practical project exploring how AI tools can be used throughout the development process — from code generation to in-app AI features like automated vet-note summarization.

---

## ✨ Features

- 🔐 **Role-based auth** — separate logins for pet owners and veterinarians
- 🐶 **Pet profiles** — photo, name, breed, species, age, height, weight, and a note for finders
- 📱 **QR tags** — high-resolution QR per pet, printable collar tags (6 per page) and a printable "LOST" poster
- 🌍 **Public scan page** — no login required; shows the pet, the owner's note, and Call / WhatsApp / Email buttons
- 💬 **Finder messages** — whoever finds the pet can send the owner a message with their location
- 🚨 **Lost pet mode** — scans of a lost pet's tag capture the finder's location
- 🗺️ **Location map** — owners see every scan and finder report on an interactive OpenStreetMap map
- 🩺 **AI vet reports** — vets write shorthand notes; AI turns them into a plain-language summary, medication schedule, home-care tips and next visit date
- 📅 **Upcoming visits** — follow-up dates from vet reports appear on the owner's dashboard
- 🔒 **Privacy-first design** — medical history and scan locations are only visible to the owner (and vets for reports); the public page shows contact details only

---

## 🛠️ Tech Stack

- **Framework:** [Next.js](https://nextjs.org) (App Router)
- **Database:** PostgreSQL via [Neon](https://neon.tech)
- **ORM:** [Prisma](https://www.prisma.io)
- **Auth:** [NextAuth](https://authjs.dev)
- **AI:** Google Gemini API (vet report summarization, with automatic fallback across models)
- **Maps:** Leaflet + OpenStreetMap tiles (no API key needed)
- **Styling:** Tailwind CSS

---

## 🚀 Getting Started

**1. Clone the repo**
```bash
git clone https://github.com/kmanali401-64698/PawTrace.git
cd PawTrace/pawtrace
```

**2. Install dependencies**
```bash
npm install
```

**3. Set up environment variables**

Create a `.env` file in the root with:

```env
DATABASE_URL="postgresql://..."        # Neon connection string
AUTH_SECRET="..."                      # generate with: npx auth secret
GEMINI_API_KEY="..."                   # https://aistudio.google.com/apikey
# Optional
NEXT_PUBLIC_APP_URL="https://your-deployed-site.com"  # address QR codes point to once deployed
GEMINI_MODEL="gemini-3.6-flash"        # preferred model; others are tried if it is busy
NEXT_PUBLIC_MAPTILER_KEY="..."         # only if you want MapTiler tiles instead of OpenStreetMap
```

**4. Set up the database**
```bash
npx prisma migrate dev
```

**5. Run the dev server**
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to see the app running. 🎉

**Testing QR scans with your phone:** while developing, QR codes automatically point to your computer's Wi-Fi address (e.g. `http://192.168.1.5:3000`) so a phone on the same Wi-Fi can open them. If the phone can't connect, allow Node.js through Windows Firewall for private networks. Browsers only share location over HTTPS, so location sharing from phones works once the app is deployed (or through an HTTPS tunnel).

---

## 📖 Project Background

This project was built as a practical exploration of AI-assisted full-stack development — documenting how AI tools were used at each stage, from scaffolding to in-app features, is part of the accompanying project report.

---

## 📄 License

This project was built for educational purposes as part of a college practical.
