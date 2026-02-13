# Strompreis-Optimierer — Frontend

React-basierte Webanwendung zur Optimierung des Energieverbrauchs von Haushaltsgeräten und Speichersystemen basierend auf Strompreisen.

## Voraussetzungen

- Node.js (empfohlen v18 oder neuer)
- npm (wird mit Node ausgeliefert)

## Installation

Abhängigkeiten installieren:

```powershell
npm install
```

Development (lokal)

```powershell
npm run dev
```

Vite wählt automatisch einen freien Port, falls 5173 belegt ist.

## Build erstellen

Produktions-Build erzeugen:

```powershell
npm run dev
```

Kurzer Projektüberblick (Auszug)

- `index.html` — HTML-Einstieg
- `src/main.jsx`, `src/App.jsx` — Einstieg und Hauptkomponente
- `src/pages/` — Seiten (Plan, Actions, Devices, Settings)
- `src/components/` — wiederverwendbare UI-Komponenten
- `src/services/` — API-Wrapper und Hilfsfunktionen
- `src/styles/` — CSS-Dateien
