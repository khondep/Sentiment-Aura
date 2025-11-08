from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional
import os
import sys
from pathlib import Path
from dotenv import load_dotenv
import json

# Load .env file from the root directory (parent of backend folder)
root_dir = Path(__file__).parent.parent
env_path = root_dir / '.env'

# Try to load from root, fallback to current directory if not found
if env_path.exists():
    load_dotenv(env_path)
    print(f"✅ Loaded .env from: {env_path}")
else:
    load_dotenv()  # Try current directory
    print(f"⚠️ .env not found in root, trying current directory")

# Configuration class to organize all environment variables
class Config:
    # Backend specific
    BACKEND_API_KEY = os.getenv('BACKEND_API_KEY')
    DATABASE_URL = os.getenv('DATABASE_URL')
    SECRET_KEY = os.getenv('SECRET_KEY')
    BACKEND_PORT = int(os.getenv('BACKEND_PORT', 8000))
    
    # AI Provider Configuration
    AI_PROVIDER = os.getenv('AI_PROVIDER', 'openai').lower()
    
    # API Keys for different providers
    # Backend can read both VITE_ prefixed (for frontend sharing) and non-prefixed versions
    OPENAI_API_KEY = os.getenv('OPENAI_API_KEY') or os.getenv('VITE_OPENAI_API_KEY')
    ANTHROPIC_API_KEY = os.getenv('ANTHROPIC_API_KEY') or os.getenv('VITE_ANTHROPIC_API_KEY')
    GOOGLE_API_KEY = os.getenv('GOOGLE_API_KEY') or os.getenv('VITE_GOOGLE_API_KEY')
    
    # Frontend URLs (from VITE_ variables)
    FRONTEND_URL = os.getenv('VITE_API_BASE_URL', 'http://localhost:5173')
    WEBSOCKET_URL = os.getenv('VITE_WEBSOCKET_URL', 'ws://localhost:8000')
    
    # Shared configuration
    NODE_ENV = os.getenv('NODE_ENV', 'development')
    DEBUG = os.getenv('DEBUG', 'false').lower() == 'true'

# Print configuration info on startup (only in development)
if Config.NODE_ENV == 'development':
    print(f"🚀 Starting Sentiment Aura API")
    print(f"📁 Environment: {Config.NODE_ENV}")
    print(f"🤖 AI Provider: {Config.AI_PROVIDER}")
    print(f"🔑 OpenAI Key configured: {bool(Config.OPENAI_API_KEY)}")
    print(f"🔑 Anthropic Key configured: {bool(Config.ANTHROPIC_API_KEY)}")
    print(f"🔑 Google Key configured: {bool(Config.GOOGLE_API_KEY)}")
    print(f"🐛 Debug mode: {Config.DEBUG}")

app = FastAPI(title="Sentiment Aura API")

# CORS middleware to allow frontend to communicate
origins = [
    "http://localhost:3000",
    "http://localhost:5173",
    "http://localhost:5174",  # Vite sometimes uses this
]

# Add the configured frontend URL if different
if Config.FRONTEND_URL and Config.FRONTEND_URL not in origins:
    origins.append(Config.FRONTEND_URL)

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Request/Response Models
class TextInput(BaseModel):
    text: str

class SentimentResponse(BaseModel):
    sentiment: dict
    keywords: List[str]

def analyze_with_openai(text: str) -> dict:
    """Analyze sentiment using OpenAI"""
    if not Config.OPENAI_API_KEY:
        raise HTTPException(
            status_code=500, 
            detail="OpenAI API key not configured. Please set OPENAI_API_KEY or VITE_OPENAI_API_KEY in .env file"
        )
    
    from openai import OpenAI
    
    client = OpenAI(api_key=Config.OPENAI_API_KEY)
    
    prompt = f"""Analyze the following text and return a JSON response with:
1. sentiment: object with 'type' (positive/negative/neutral) and 'score' (0-1, where 1 is most intense)
2. keywords: array of 3-5 most important keywords or themes

Text: "{text}"

Return ONLY valid JSON in this exact format:
{{
  "sentiment": {{"type": "positive", "score": 0.8}},
  "keywords": ["keyword1", "keyword2", "keyword3"]
}}"""

    try:
        response = client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {"role": "system", "content": "You are a sentiment analysis expert. Return only valid JSON."},
                {"role": "user", "content": prompt}
            ],
            temperature=0.3,
            max_tokens=200
        )
        
        result = response.choices[0].message.content.strip()
        # Remove markdown code blocks if present
        if result.startswith("```"):
            result = result.split("```")[1]
            if result.startswith("json"):
                result = result[4:]
        
        return json.loads(result)
    except Exception as e:
        print(f"OpenAI Error: {e}")
        raise HTTPException(status_code=500, detail=f"OpenAI API error: {str(e)}")

def analyze_with_anthropic(text: str) -> dict:
    """Analyze sentiment using Anthropic Claude"""
    if not Config.ANTHROPIC_API_KEY:
        raise HTTPException(
            status_code=500, 
            detail="Anthropic API key not configured. Please set ANTHROPIC_API_KEY or VITE_ANTHROPIC_API_KEY in .env file"
        )
    
    import anthropic
    
    client = anthropic.Anthropic(api_key=Config.ANTHROPIC_API_KEY)
    
    prompt = f"""Analyze the following text and return a JSON response with:
1. sentiment: object with 'type' (positive/negative/neutral) and 'score' (0-1, where 1 is most intense)
2. keywords: array of 3-5 most important keywords or themes

Text: "{text}"

Return ONLY valid JSON in this exact format:
{{
  "sentiment": {{"type": "positive", "score": 0.8}},
  "keywords": ["keyword1", "keyword2", "keyword3"]
}}"""

    try:
        message = client.messages.create(
            model="claude-3-haiku-20240307",  # UPDATED: Using Haiku model
            max_tokens=200,
            temperature=0.3,
            messages=[
                {"role": "user", "content": prompt}
            ]
        )
        
        result = message.content[0].text.strip()
        if Config.DEBUG:
            print(f"Claude response: {result}")  # Debug logging
        
        # Remove markdown code blocks if present
        if result.startswith("```"):
            result = result.split("```")[1]
            if result.startswith("json"):
                result = result[4:]
        
        return json.loads(result)
    except Exception as e:
        print(f"Anthropic Error: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Anthropic API error: {str(e)}")

def analyze_with_google(text: str) -> dict:
    """Analyze sentiment using Google Gemini"""
    if not Config.GOOGLE_API_KEY:
        raise HTTPException(
            status_code=500, 
            detail="Google API key not configured. Please set GOOGLE_API_KEY or VITE_GOOGLE_API_KEY in .env file"
        )
    
    import google.generativeai as genai
    
    genai.configure(api_key=Config.GOOGLE_API_KEY)
    model = genai.GenerativeModel('gemini-pro')
    
    prompt = f"""Analyze the following text and return a JSON response with:
1. sentiment: object with 'type' (positive/negative/neutral) and 'score' (0-1, where 1 is most intense)
2. keywords: array of 3-5 most important keywords or themes

Text: "{text}"

Return ONLY valid JSON in this exact format:
{{
  "sentiment": {{"type": "positive", "score": 0.8}},
  "keywords": ["keyword1", "keyword2", "keyword3"]
}}"""

    try:
        response = model.generate_content(prompt)
        result = response.text.strip()
        
        # Remove markdown code blocks if present
        if result.startswith("```"):
            result = result.split("```")[1]
            if result.startswith("json"):
                result = result[4:]
        
        return json.loads(result)
    except Exception as e:
        print(f"Google Error: {e}")
        raise HTTPException(status_code=500, detail=f"Google API error: {str(e)}")

@app.get("/")
async def root():
    return {
        "message": "Sentiment Aura API is running!",
        "provider": Config.AI_PROVIDER,
        "environment": Config.NODE_ENV,
        "debug": Config.DEBUG,
        "endpoints": {
            "/process_text": "POST - Analyze text sentiment and extract keywords",
            "/api/health": "GET - Health check endpoint",
            "/api/config": "GET - Get configuration status"
        }
    }

@app.get("/api/health")
async def health_check():
    """Health check endpoint for frontend connection verification"""
    return {
        "status": "healthy",
        "provider": Config.AI_PROVIDER,
        "environment": Config.NODE_ENV
    }

@app.get("/api/config")
async def get_config():
    """Get configuration status (sanitized for security)"""
    return {
        "status": "connected",
        "environment": Config.NODE_ENV,
        "debug": Config.DEBUG,
        "ai_provider": Config.AI_PROVIDER,
        "providers_configured": {
            "openai": bool(Config.OPENAI_API_KEY),
            "anthropic": bool(Config.ANTHROPIC_API_KEY),
            "google": bool(Config.GOOGLE_API_KEY)
        }
    }

@app.post("/process_text", response_model=SentimentResponse)
@app.post("/api/process_text", response_model=SentimentResponse)  # Alternative path for consistency
async def process_text(input_data: TextInput):
    """
    Main endpoint to process text and return sentiment + keywords
    Available at both /process_text and /api/process_text
    """
    text = input_data.text.strip()
    
    if not text:
        raise HTTPException(status_code=400, detail="Text cannot be empty")
    
    if len(text) < 3:
        # Return neutral for very short text
        return SentimentResponse(
            sentiment={"type": "neutral", "score": 0.5},
            keywords=[]
        )
    
    try:
        # Route to appropriate AI provider
        if Config.AI_PROVIDER == "openai":
            result = analyze_with_openai(text)
        elif Config.AI_PROVIDER == "anthropic":
            result = analyze_with_anthropic(text)
        elif Config.AI_PROVIDER == "google":
            result = analyze_with_google(text)
        else:
            raise HTTPException(status_code=500, detail=f"Unknown AI provider: {Config.AI_PROVIDER}")
        
        return SentimentResponse(
            sentiment=result.get("sentiment", {"type": "neutral", "score": 0.5}),
            keywords=result.get("keywords", [])
        )
    
    except json.JSONDecodeError as e:
        print(f"JSON parsing error: {e}")
        raise HTTPException(status_code=500, detail="Failed to parse AI response")
    except HTTPException:
        # Re-raise HTTPExceptions as-is
        raise
    except Exception as e:
        print(f"Unexpected error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    
    # Use port from environment variable or default to 8000
    port = Config.BACKEND_PORT
    
    print(f"\n🎉 Starting server on http://localhost:{port}")
    print(f"📝 API documentation available at http://localhost:{port}/docs")
    print(f"🔧 API Provider: {Config.AI_PROVIDER.upper()}\n")
    
    uvicorn.run(
        app, 
        host="0.0.0.0", 
        port=port,
        reload=Config.DEBUG  # Enable auto-reload in debug mode
    )