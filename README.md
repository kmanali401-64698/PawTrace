T# 🐾 PawTrace

**A full-stack pet identification and safety app.** PawTrace lets pet owners register their pets with a unique, scannable QR code — so if a pet ever goes missing, anyone who finds it can scan the tag and instantly see contact details and help reunite them. Vets can also log medical reports tied to each pet's profile, giving future vets full visibility into a pet's health history.

Built as a practical project exploring how AI tools can be used throughout the development process — from code generation to in-app AI features like automated vet-note summarization.

---

## ✨ Features

- 🔐 **Role-based auth** — separate logins for pet owners and veterinarians
- 🐶 **Pet profiles** — name, breed, species, age, height, weight
- 📱 **QR code generation** — each pet gets a unique, printable QR code
- 🌍 **Public scan page** — no login required; shows key pet info + owner contact
- 🚨 **Lost pet mode** — mark a pet as lost, and the next QR scan captures the scanner's location to help locate them
- 🩺 **Vet reports** — vets log medical notes, automatically summarized into plain language using AI
- 🔒 **Privacy-first design** — medical history stays private; only safe, minimal info is shown publicly

---

## 🛠️ Tech Stack

- **Framework:** [Next.js](https://nextjs.org) (App Router)
- **Database:** PostgreSQL via [Neon](https://neon.tech)
- **ORM:** [Prisma](https://www.prisma.io)
- **Auth:** [NextAuth](https://authjs.dev)
- **AI:** Anthropic Claude API (vet report summarization)
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

Create a `.env` file in the root with:(https://nextjs.org/docs/app/building-your-application/deploying) for more details. 

**4. Set up the database**
```bash
npx prisma migrate dev
```

**5. Run the dev server**
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to see the app running. 🎉

---

## 📖 Project Background

This project was built as a practical exploration of AI-assisted full-stack development — documenting how AI tools were used at each stage, from scaffolding to in-app features, is part of the accompanying project report.

---

## 📄 License

This project was built for educational purposes as part of a college practical.
