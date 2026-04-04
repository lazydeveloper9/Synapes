$ErrorActionPreference = "Stop"

Write-Host "Keeping DB, Redis, and AI running in Docker..."
docker compose up -d postgres redis ai-service

Write-Host "Stopping any running Docker instances of node services..."
docker compose stop backend api-backend frontend

Write-Host "Starting API Backend on Port 5000..."
Start-Process -NoNewWindow -FilePath "node" -ArgumentList "server.js" -WorkingDirectory ".\api-backend" -Environment @{
    DB_HOST="localhost"
    DB_USER="synapse"
    DB_PASSWORD="synapse"
    DB_NAME="documents"
    PORT="5000"
    JWT_SECRET="synapse_jwt_secret_key_2024"
}

Write-Host "Starting Hocuspocus Backend on Port 1234..."
Start-Process -NoNewWindow -FilePath "node" -ArgumentList "server.js" -WorkingDirectory ".\backend" -Environment @{
    REDIS_HOST="localhost"
    DB_HOST="localhost"
    DB_USER="synapse"
    DB_PASSWORD="synapse"
    DB_NAME="documents"
    PORT="1234"
}

Write-Host "Starting Vite Frontend..."
Start-Process -NoNewWindow -FilePath "npm.cmd" -ArgumentList "run dev" -WorkingDirectory ".\frontend"

Write-Host "All local development processes started!"
Write-Host "Backend API: http://localhost:5000"
Write-Host "Hocuspocus: ws://localhost:1234"
Write-Host "Frontend: http://localhost:5173"
