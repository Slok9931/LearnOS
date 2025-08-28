from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.endpoints.cpu import router as cpu_router

app = FastAPI(
    title="LearnOS Simulator API",
    description="Backend API for operating system concepts simulation",
    version="1.0.0"
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:8080", "http://127.0.0.1:8080", "https://learn-os-nu.vercel.app"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(cpu_router)

@app.get("/")
async def root():
    return {"message": "LearnOS Simulator API", "status": "running"}

@app.get("/health")
async def health_check():
    return {"status": "healthy", "message": "LearnOS Simulator API is running"}

@app.get("/api/info")
async def api_info():
    return {
        "name": "LearnOS Simulator API",
        "version": "1.0.0",
        "status": "healthy",
        "endpoints": {
            "cpu_scheduling": "/api/cpu/",
            "health": "/health"
        }
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=5000)