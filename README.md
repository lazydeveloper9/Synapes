# Synapes

Synapes is a full-stack design collaboration platform where users can create, edit, save, and manage visual designs in real time-inspired workflows.

The project is built with a React + Vite frontend and an Express + MongoDB backend, with Fabric.js powering the canvas editor.

## Features

- User authentication (register, login, protected routes)
- Personal dashboard for design management
- Canvas editor with Fabric.js (text, shapes, lines, free draw, image import)
- Auto-save and manual save support
- Design export to PNG
- Per-user design ownership and secure API access via JWT

## Tech Stack

### Frontend

- React 19
- Vite 8
- Tailwind CSS
- Fabric.js
- Axios
- React Router
- Zustand

### Backend

- Node.js
- Express 5
- MongoDB + Mongoose
- JWT authentication
- bcryptjs

### DevOps

- Docker
- Docker Compose

## Project Structure

```text
Synapes/
	backend/        # Express API + MongoDB models/routes
	frontend/       # React + Vite client app
	docker-compose.yaml
```

## Prerequisites

For local development without Docker:

- Node.js 18+
- npm 9+
- MongoDB 7+ (local or hosted)

For containerized development:

- Docker
- Docker Compose

## Environment Variables

Create a `.env` file inside `backend/`.

Example:

```env
PORT=5000
MONGO_URI=mongodb://localhost:27017/synapes
JWT_SECRET=replace_with_a_long_random_secret
```

Notes:

- `JWT_SECRET` is required for auth token signing and verification.
- If you run via Docker Compose, `MONGO_URI` is provided in compose as `mongodb://mongo:27017/synapes`.

## Running Locally (Without Docker)

### 1. Install dependencies

```bash
# backend
cd backend
npm install

# frontend
cd ../frontend
npm install
```

### 2. Start backend

```bash
cd backend
npm run dev
```

Backend runs on `http://localhost:5000`.

### 3. Start frontend

In a new terminal:

```bash
cd frontend
npm run dev
```

Frontend runs on `http://localhost:5173` (default Vite port).

## Running with Docker Compose

From the project root:

```bash
docker compose up --build
```

Services:

- Frontend: `http://localhost:3000`
- Backend: `http://localhost:5000`
- MongoDB: `mongodb://localhost:27017`

To stop:

```bash
docker compose down
```

To stop and remove volumes:

```bash
docker compose down -v
```

## API Overview

Base URL: `http://localhost:5000/api`

Auth:

- `POST /auth/register`
- `POST /auth/login`
- `GET /auth/me` (protected)

Designs (protected):

- `GET /designs`
- `GET /designs/:id`
- `POST /designs`
- `PUT /designs/:id`
- `DELETE /designs/:id`

Health:

- `GET /health`

## Scripts

Backend (`backend/package.json`):

- `npm run dev` - start with nodemon
- `npm start` - start with node

Frontend (`frontend/package.json`):

- `npm run dev` - start Vite dev server
- `npm run build` - production build
- `npm run preview` - preview production build
- `npm run lint` - run ESLint

## Current Limitations

- Frontend API base URL is currently hardcoded in `frontend/src/api/axios.js`.
- No test suite is configured yet.
- Collaboration is currently user-scoped persistence, not multi-user live cursor sync.

## License

This project is licensed under the terms in the `LICENSE` file.
