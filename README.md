# Sentiment Aura 🎭✨

**A real-time voice sentiment analysis application with stunning visual feedback**

Live AI-powered sentiment analysis that transforms spoken words into a mesmerizing Perlin noise visualization, creating a dynamic "aura" that responds to emotional tone and keywords.

<img width="3024" height="1664" alt="image" src="https://github.com/user-attachments/assets/204482e9-2533-4300-8f11-3c16955f9a0e" />



## 🌟 Features

- **Real-time Speech-to-Text**: Powered by Deepgram's Nova-2 model for accurate transcription
- **AI Sentiment Analysis**: Multiple AI provider support (Anthropic Claude, OpenAI, Google Gemini)
- **Dynamic Perlin Noise Visualization**: 2000+ particles creating organic, flowing patterns
- **Sentiment-Driven Colors**:
  
  💙 Positive → Flowing blue tones

	💜 Neutral → Calm lavender hues

  ❤️ Negative → Intense red energy
  
- **Keyword Extraction**: AI-powered topic identification with smooth animations
- **Robust Error Handling**: Automatic reconnection, request queuing, and graceful degradation

## 🏗️ Architecture

```
┌─────────────┐     ┌──────────────┐     ┌─────────────┐
│   Frontend  │────▶│   Backend    │────▶│  AI APIs    │
│   (React)   │◀────│  (FastAPI)   │◀────│ (Claude/GPT)│
└─────────────┘     └──────────────┘     └─────────────┘
       │                                          
       ▼                                          
┌─────────────┐                                  
│  Deepgram   │                                  
│   (WebSocket)│                                  
└─────────────┘                                  
```

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- Python 3.9+
- API Keys for:
  - Deepgram (speech-to-text)
  - One of: Anthropic Claude, OpenAI, or Google Gemini

### Installation

1. **Clone the repository**
```bash
git clone https://github.com/khondep/Sentiment-Aura.git
cd Sentiment-Aura
```

2. **Setup Backend**
```bash
cd backend
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt

# Create .env file
cat > .env << EOF
AI_PROVIDER=anthropic
ANTHROPIC_API_KEY=your-api-key-here
EOF
```

3. **Setup Frontend**
```bash
cd ../frontend
npm install

# Create .env file
cat > .env << EOF
VITE_BACKEND_URL=http://localhost:8000
VITE_DEEPGRAM_API_KEY=your-deepgram-key-here
EOF
```

4. **Run the Application**

In one terminal (backend):
```bash
cd backend
python main.py
```

In another terminal (frontend):
```bash
cd frontend
npm run dev
```

5. **Open in browser**: http://localhost:5173

## 🎮 Usage

1. Click the **record button** at the bottom center
2. Allow microphone permissions when prompted
3. Start speaking naturally
4. Watch as:
   - Your words appear in the transcript (
   - Keywords emerge with animations 
   - The particle field responds to your emotional tone
   - Colors and movement patterns shift with sentiment

## 🛠️ Tech Stack

### Frontend
- **React** - UI framework
- **Vite** - Build tool
- **p5.js** - Creative coding for Perlin noise visualization
- **Axios** - HTTP client
- **Deepgram SDK** - Real-time transcription

### Backend
- **FastAPI** - Python web framework
- **Anthropic/OpenAI/Google SDKs** - AI sentiment analysis
- **python-dotenv** - Environment management
- **CORS middleware** - Cross-origin support

## 📊 Performance

- **Visualization**: 60 FPS with 2000+ particles
- **Transcription Latency**: < 500ms
- **Sentiment Analysis**: < 1s response time
- **Auto-reconnection**: Exponential backoff up to 5 attempts
- **Request Queue**: Max 2 concurrent API calls

## 🎨 Visual Design

The Perlin noise visualization uses:
- **Flow Fields**: Organic particle movement
- **Dynamic Parameters**:
  - Hue (color)
  - Saturation (intensity)
  - Speed (movement rate)
  - Noise strength (chaos level)
  - Particle alpha (transparency)
- **Keyword Particles**: Orbital motion around sentiment core
- **Glassmorphic UI**: Modern translucent panels

## 🔧 Configuration

### Environment Variables
for 
**Backend (.env)**:
```env
AI_PROVIDER=anthropic|openai|google|textblob
ANTHROPIC_API_KEY=sk-ant-api03-...
OPENAI_API_KEY=sk-...
GOOGLE_API_KEY=...
```
for 
**Frontend (.env)**:
```env
VITE_BACKEND_URL=http://localhost:8000
VITE_DEEPGRAM_API_KEY=...
```

## 📈 API Endpoints

### Backend Endpoints

- `GET /` - API status
- `GET /health` - Health check
- `POST /process_text` - Sentiment analysis
  ```json
  {
    "text": "I'm really excited about this project!"
  }
  ```
  Response:
  ```json
  {
    "sentiment": {
      "type": "positive",
      "score": 0.85
    },
    "keywords": ["excited", "project"]
  }
  ```

## 🐛 Troubleshooting

| Issue | Solution |
|-------|----------|
| Microphone not working | Check browser permissions, ensure HTTPS in production |
| No visualization | Verify p5.js is installed: `npm install p5@1.7.0` |
| API errors | Check API keys in .env files |
| CORS errors | Ensure backend allows frontend origin |
| Slow sentiment | API may be rate-limited, check quotas |

## 📝 Development

### Running Tests
```bash
# Backend
cd backend
pytest

# Frontend
cd frontend
npm test
```

### Building for Production
```bash
# Frontend build
cd frontend
npm run build

# Serve with backend
cd backend
python main.py --production
```



## 🙏 Acknowledgments

- Memory Machines for the project brief
- Deepgram for speech-to-text API
- Anthropic for Claude API
- p5.js community for creative coding resources

## 📧 Contact

Purvang Khonde - khonde.p@northeastern.edu

Project Link: [https://github.com/khondep/Sentiment-Aura](https://github.com/khondep/Sentiment-Aura)

---

Built with ❤️ for Memory Machines
