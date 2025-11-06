from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional
import os
from dotenv import load_dotenv
import json

# Load environment variables
load_dotenv()

app = FastAPI(title="Sentiment Aura API")

# CORS middleware to allow frontend to communicate
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:5173"],  # React dev servers
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

# Choose AI provider based on environment variable
AI_PROVIDER = os.getenv("AI_PROVIDER", "openai").lower()

def analyze_with_openai(text: str) -> dict:
    """Analyze sentiment using OpenAI"""
    from openai import OpenAI
    
    client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))
    
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
    import anthropic
    
    client = anthropic.Anthropic(api_key=os.getenv("ANTHROPIC_API_KEY"))
    
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
    import google.generativeai as genai
    
    genai.configure(api_key=os.getenv("GOOGLE_API_KEY"))
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
        "provider": AI_PROVIDER,
        "endpoints": {
            "/process_text": "POST - Analyze text sentiment and extract keywords"
        }
    }

@app.post("/process_text", response_model=SentimentResponse)
async def process_text(input_data: TextInput):
    """
    Main endpoint to process text and return sentiment + keywords
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
        if AI_PROVIDER == "openai":
            result = analyze_with_openai(text)
        elif AI_PROVIDER == "anthropic":
            result = analyze_with_anthropic(text)
        elif AI_PROVIDER == "google":
            result = analyze_with_google(text)
        else:
            raise HTTPException(status_code=500, detail=f"Unknown AI provider: {AI_PROVIDER}")
        
        return SentimentResponse(
            sentiment=result.get("sentiment", {"type": "neutral", "score": 0.5}),
            keywords=result.get("keywords", [])
        )
    
    except json.JSONDecodeError as e:
        print(f"JSON parsing error: {e}")
        raise HTTPException(status_code=500, detail="Failed to parse AI response")
    except Exception as e:
        print(f"Unexpected error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)