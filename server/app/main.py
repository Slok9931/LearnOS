from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import HTMLResponse

app = FastAPI(title="LearnOS Simulator", version="1.0.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/", response_class=HTMLResponse)
async def root():
    return """
    <!DOCTYPE html>
    <html>
    <head>
        <title>LearnOS Simulator</title>
        <style>
            body { font-family: Arial, sans-serif; margin: 40px; background-color: #f5f5f5; }
            .container { max-width: 800px; margin: 0 auto; background: white; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
            h1 { color: #2c3e50; border-bottom: 3px solid #3498db; padding-bottom: 10px; }
            h2 { color: #34495e; margin-top: 30px; }
            .feature { background: #ecf0f1; padding: 15px; margin: 10px 0; border-radius: 5px; border-left: 4px solid #3498db; }
            .status { background: #d5fdd5; padding: 10px; border-radius: 5px; color: #27ae60; text-align: center; }
            a { color: #3498db; text-decoration: none; }
            a:hover { text-decoration: underline; }
        </style>
    </head>
    <body>
        <div class="container">
            <h1>🖥️ LearnOS Simulator</h1>
            <div class="status">
                <strong>✅ Server is running successfully!</strong>
            </div>
            
            <h2>📚 About LearnOS</h2>
            <p>LearnOS is an interactive operating system simulator designed to help students and enthusiasts understand the fundamental concepts of operating systems through hands-on experience.</p>
            
            <h2>🚀 Features</h2>
            <div class="feature">
                <strong>Process Management:</strong> Simulate process creation, scheduling, and termination
            </div>
            <div class="feature">
                <strong>Memory Management:</strong> Explore virtual memory, paging, and segmentation
            </div>
            <div class="feature">
                <strong>File System:</strong> Interact with a virtual file system
            </div>
            <div class="feature">
                <strong>CPU Scheduling:</strong> Visualize different scheduling algorithms
            </div>
            
            <h2>🔧 API Documentation</h2>
            <p>Explore the interactive API documentation:</p>
            <ul>
                <li><a href="/docs" target="_blank">Swagger UI Documentation</a></li>
                <li><a href="/redoc" target="_blank">ReDoc Documentation</a></li>
            </ul>
            
            <h2>📊 Quick Health Check</h2>
            <p>API Status: <a href="/health">Check Server Health</a></p>
            
            <footer style="margin-top: 40px; text-align: center; color: #7f8c8d; font-size: 14px;">
                LearnOS Simulator v1.0.0 | Built with FastAPI
            </footer>
        </div>
    </body>
    </html>
    """

@app.get("/health")
async def health_check():
    return {
        "status": "healthy",
        "message": "LearnOS Simulator is running",
        "version": "1.0.0"
    }

@app.get("/api/info")
async def get_info():
    return {
        "name": "LearnOS Simulator",
        "version": "1.0.0",
        "description": "Interactive Operating System Simulator for Educational Purposes",
        "features": [
            "Process Management",
            "Memory Management", 
            "File System Simulation",
            "CPU Scheduling Algorithms"
        ]
    }