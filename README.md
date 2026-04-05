<div align="center">
  <img src="https://raw.githubusercontent.com/lucide-icons/lucide/main/icons/layers.svg" alt="Synapse Logo" width="80" height="80" />
  <h1>🚀 Synapse</h1>
  <p><strong>The Next-Generation Real-Time Collaborative Workspace</strong></p>
  <p><em>Built for HACKSAGON. Powered by CRDTs, Local AI, and WebRTC.</em></p>
</div>

---

## 🌟 Overview

**Synapse** is a powerful, unified workspace platform designed to bring teams together. Instead of juggling multiple applications for design, writing, data analysis, and coding, Synapse provides a seamless, real-time multiplayer environment for all your creative and technical needs. 

It features instant CRDT-based synchronization, integrated WebRTC voice channels for secure communication, and a context-aware AI Co-Pilot powered entirely by local models (Llama 3.2)—ensuring extreme privacy, speed, and intelligence.

## ✨ Key Features

*   **⚡ Real-Time Collaboration (CRDT)**: Lightning-fast, conflict-free collaboration across all editors powered by Yjs and Hocuspocus. See cursors, selections, and edits in real-time.
*   **🧠 Local AI Co-Pilot**: Context-aware AI assistance running locally via Ollama. Select text to instantly rewrite, refine, translate, or autocomplete without sending sensitive data to the cloud.
*   **🎙️ Spatial Voice Channels**: Hop into secure, peer-to-peer (WebRTC Mesh) voice rooms tied directly to the document you are working on. No more managing separate meeting links.
*   **🎨 Multi-Disciplinary Tooling**:
    *   **Design Studio**: Vector canvas with layers, shapes, and export capabilities.
    *   **Docs**: Rich-text editing with advanced formatting.
    *   **Sheets**: Spreadsheet editor with formula support.
    *   **Slides**: Presentation builder with themes and present mode.
    *   **Code Space**: Live coding environment with syntax highlighting for 8+ languages.
*   **👀 Multiplayer Presence Tracker**: Know exactly who is in the workspace and what they are doing with live presence avatars and activity notifications.
*   **🔐 Secure & Persistent**: JWT authentication, robust PostgreSQL storage mapping CRDT state to relational data, and Redis for blazingly fast pub/sub state distribution.
*   **💫 Premium Aesthetics**: A visually stunning UI featuring glassmorphism, fluid micro-animations (Framer Motion), and a meticulously crafted dark mode.

---

## 🛠️ Technology Stack

Synapse is built on a highly scalable, microservices-oriented architecture:

### Frontend
*   **Framework**: React 18, Vite
*   **Styling & Animation**: Tailwind CSS, Framer Motion
*   **Icons & Assets**: Lucide React
*   **State & Collaboration**: Yjs (CRDT), `@hocuspocus/provider`
*   **Networking**: Axios, WebSockets, Server-Sent Events (SSE) for AI streaming

### Core Microservices
*   **Collaboration Server (Hocuspocus)**: Node.js, `@hocuspocus/server`, `@hocuspocus/extension-redis`. Handles WebSocket connections and CRDT state synchronization.
*   **REST API Engine**: Node.js, Express.js. Manages user authentication (JWT), workspace metadata, and serves the PeerJS signaling broker.
*   **AI Service**: Python, FastAPI. Interfaces with Ollama (Llama 3.2) to stream context-aware AI responses back to the client using SSE.

### Infrastructure & Data Layer
*   **Relational Database**: PostgreSQL 15 (Stores user profiles, workspace metadata, and persistent CRDT binary blobs).
*   **In-Memory Store**: Redis Alpine (Handles horizontal scaling and pub/sub for the collaboration server).
*   **Voice Signaling**: PeerJS (WebRTC broker).
*   **DevOps**: Docker, Docker Compose (for local orchestration), Kubernetes (Ingress configs included for production deployment).

---

## 📂 Project Structure

```text
Synapse/
├── ai-service/              # Python FastAPI microservice for local LLM inference
│   ├── main.py              # SSE streaming endpoints and prompt engineering
│   └── requirements.txt     # Python dependencies
├── api-backend/             # Node.js/Express REST API & Signaling Server
│   ├── routes/              # Auth & Design metadata endpoints
│   ├── package.json         
│   └── server.js            # Express setup, Postgres init, and PeerJS integration
├── backend/                 # Hocuspocus CRDT Collaboration Server
│   ├── package.json
│   └── server.js            # WebSocket server, Redis extension, Postgres persistence
├── frontend/                # React/Vite Client Application
│   ├── public/
│   ├── src/
│   │   ├── api/             # Axios configurations
│   │   ├── components/      # Reusable UI (ChatBot, Menu, PresenceNav, VoiceChannel)
│   │   ├── context/         # AuthProvider
│   │   ├── hooks/           # Custom hooks (usePresence, useAIWorkspace)
│   │   ├── pages/           # Views (Dashboard, WorkspaceHub, Editor variants)
│   │   ├── App.jsx          # Routing setup
│   │   └── main.jsx         # Entry point
│   ├── index.html
│   └── vite.config.js       # Vite configuration
├── k8s/                     # Kubernetes deployment configurations
├── docker-compose.yml       # Orchestrates all services for local development
└── dev.ps1                  # PowerShell script for one-click local startup
```

---

## 🚀 Getting Started

### Prerequisites
*   [Docker Desktop](https://www.docker.com/products/docker-desktop/) installed and running.
*   [Node.js](https://nodejs.org/) (v18+ recommended)
*   [Ollama](https://ollama.ai/) installed locally with the `llama3.2` model (`ollama run llama3.2`).

### Quick Start (Windows)
We provide a unified PowerShell script to start the entire infrastructure (Databases via Docker, Services via Node).

1. Clone the repository:
   ```bash
   git clone https://github.com/yourusername/synapse.git
   cd synapse
   ```
2. Run the development script:
   ```powershell
   .\dev.ps1
   ```
   *This script automatically spins up PostgreSQL and Redis via Docker Compose, starts the Express API (Port 5000), Hocuspocus Server (Port 1234), and the Vite Frontend (Port 5173).*

### Manual Docker Setup (All OS)
If you prefer running everything fully containerized:
```bash
docker-compose up --build
```

### Access Points
*   **Web Application**: `http://localhost:5173`
*   **REST API**: `http://localhost:5000`
*   **WebSocket Engine**: `ws://localhost:1234`
*   **AI Service**: `http://localhost:8000`

---

## 🏆 Why Synapse Stands Out for Hackathons
1.  **Complexity Mastered**: Seamlessly integrates WebSockets, WebRTC, and SSE streaming into a single, cohesive interface.
2.  **Privacy First**: Leverages Local AI inference. No API keys needed; no user data leaves the machine to hit external LLM providers.
3.  **Real-Time Engineering**: Custom-built PostgreSQL connector for Hocuspocus to ensure binary CRDT blobs are securely persisted and restored instantly upon server restart.
4.  **Exceptional UX**: Replaces clunky, disjointed web interfaces with a desktop-class, highly animated React frontend.

---
<div align="center">
  <i>Built with passion for HACKSAGON.</i>
</div>
