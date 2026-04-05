$ErrorActionPreference = "Stop"

Write-Host "Keeping DB, Redis, and AI running in Docker..."
docker compose up -d postgres redis ai-service

Write-Host "Stopping any running Docker instances of node services..."
docker compose stop backend api-backend frontend

Write-Host "Starting API Backend on Port 5000..."
$env:DB_HOST="localhost"
$env:DB_USER="synapse"
$env:DB_PASSWORD="synapse"
$env:DB_NAME="documents"
$env:PORT="5000"
$env:JWT_SECRET="synapse_jwt_secret_key_2024"
Start-Process -NoNewWindow -FilePath "node" -ArgumentList "server.js" -WorkingDirectory ".\api-backend"

Write-Host "Starting Hocuspocus Backend on Port 1234..."
$env:REDIS_HOST="localhost"
$env:PORT="1234"
Start-Process -NoNewWindow -FilePath "node" -ArgumentList "server.js" -WorkingDirectory ".\backend"

Write-Host "Starting Vite Frontend..."
Start-Process -NoNewWindow -FilePath "npm.cmd" -ArgumentList "run dev" -WorkingDirectory ".\frontend"

Write-Host "All local development processes started!"
Write-Host "Backend API: http://localhost:5000"
Write-Host "Hocuspocus: ws://localhost:1234"
Write-Host "Frontend: http://localhost:5173"
