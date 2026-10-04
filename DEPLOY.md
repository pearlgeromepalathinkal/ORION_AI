# 🚀 ORION-AI — Deployment Guide

> Federated Multi-Agent Framework for Autonomous IT Support Ticket Resolution  
> **Time to set up: ~15 minutes**

---

## 📋 What You Need (Prerequisites)

| Tool | Version | Install Link |
|------|---------|--------------|
| Python | 3.11+ | https://python.org/downloads |
| Node.js | 18+ | https://nodejs.org |
| Docker Desktop | Latest | https://www.docker.com/products/docker-desktop |
| Ollama | Latest | https://ollama.com/download |
| Git | Latest | https://git-scm.com |

---

## 🗂 Project Structure

```
ORION-AI/
├── Agents.py            ← Core multi-agent orchestration (LangGraph)
├── app.py               ← FastAPI entry point
├── backend/             ← API routes, schemas, services
├── chatbot/             ← Terminal/chat interface agents
├── config.py            ← Central configuration
├── dashboard/           ← Next.js frontend dashboard
├── data/                ← SQLite user database
├── knowledge-base/      ← IT knowledge base documents
├── models/              ← Human review models
├── tools/               ← Jira, Qdrant, LLM tool wrappers
├── requirements.txt     ← Python dependencies
├── .env.example         ← Backend env template (copy to .env)
└── dashboard/.env.local.example  ← Frontend env template
```

---

## ⚙️ Step 1 — Clone & Enter the Project

```bash
git clone <your-repo-url> ORION-AI
cd ORION-AI
```

---

## 🤖 Step 2 — Start Ollama (Local LLM)

```bash
# 1. Download & install from: https://ollama.com/download
# 2. Pull the model:
ollama pull qwen2.5:3b

# 3. Start Ollama server (keep this terminal open):
ollama serve
```

> On macOS, Ollama auto-starts as a menu bar app after install.
> The server runs at http://localhost:11434

---

## 🐳 Step 3 — Start Qdrant (Vector Database)

Make sure Docker Desktop is running, then:

```bash
docker run -d \
  --name qdrant \
  -p 6333:6333 \
  qdrant/qdrant
```

Verify: open http://localhost:6333/dashboard in your browser.

---

## 🐍 Step 4 — Python Backend Setup

```bash
# Create virtual environment
python3 -m venv myenv

# Activate (macOS/Linux):
source myenv/bin/activate

# Activate (Windows):
# myenv\Scripts\activate

# Install dependencies
pip install -r requirements.txt
```

---

## 🔑 Step 5 — Configure Environment Variables

### Backend
```bash
cp .env.example .env
```
Edit `.env`:
- Keep `OLLAMA_MODEL=qwen2.5:3b` (already pulled)
- Fill in your Jira credentials (or leave blank — system still works)

### Frontend Dashboard
```bash
cp dashboard/.env.local.example dashboard/.env.local
```
Edit `dashboard/.env.local`:
- Add your **Supabase** project keys (free at https://supabase.com)
- Add Jira credentials (same as backend, optional)

**How to get Jira API Token:**
1. Go to: https://id.atlassian.com/manage-profile/security/api-tokens
2. Click "Create API token" → Copy it

**How to get Supabase Keys:**
1. Create project at https://supabase.com
2. Go to Settings → API
3. Copy: Project URL, anon public key, service_role key

---

## 📚 Step 6 — Populate the Knowledge Base

```bash
# With venv active:
python tools/generate_kb_docs.py
```

This loads IT knowledge documents into Qdrant for semantic search.

---

## 🖥 Step 7 — Start the Backend

```bash
# With venv active, from project root:
uvicorn app:app --host 0.0.0.0 --port 8000 --reload
```

Test it: open http://localhost:8000/docs (Swagger UI)

---

## 🌐 Step 8 — Start the Dashboard

```bash
cd dashboard
npm install          # First time only
npm run dev
```

Open: **http://localhost:3000** 🎉

---

## ✅ Health Check

| Service | URL | Expected |
|---------|-----|----------|
| Ollama LLM | http://localhost:11434 | Ollama response |
| Qdrant DB | http://localhost:6333/dashboard | Qdrant UI |
| ORION Backend | http://localhost:8000/docs | Swagger UI |
| Dashboard | http://localhost:3000 | Login page |

---

## 🔄 Daily Startup (3 Terminals)

**Terminal 1:**
```bash
ollama serve
```

**Terminal 2:**
```bash
cd ORION-AI
source myenv/bin/activate
uvicorn app:app --host 0.0.0.0 --port 8000 --reload
```

**Terminal 3:**
```bash
cd ORION-AI/dashboard
npm run dev
```

---

## 🛠 Troubleshooting

| Problem | Fix |
|---------|-----|
| `ollama: command not found` | Install from https://ollama.com/download |
| `docker: command not found` | Install & start Docker Desktop |
| Port 8000 in use | `lsof -i :8000` → kill the PID |
| Port 3000 in use | `npm run dev -- --port 3001` |
| Qdrant not reachable | `docker start qdrant` |
| LLM is slow | Use `qwen2.5:1.5b` for faster responses |
| `ModuleNotFoundError` | Activate venv: `source myenv/bin/activate` |
| Dashboard login fails | Check Supabase keys in `dashboard/.env.local` |
| No tickets resolving | Run `python tools/generate_kb_docs.py` first |

---

## 🧠 How It Works

```
Browser (localhost:3000)
    ↓ Next.js Dashboard
    ↓ FastAPI (localhost:8000)
    ↓ LangGraph Multi-Agent Pipeline
        ├── Ticket Classifier
        ├── Retrieval Agent → Qdrant vector search
        ├── Evidence Aggregator
        ├── Decision Agent:
        │     KNOWN (≥85% match)  → Auto Resolve
        │     MID   (55-85%)      → Escalate + Notify
        │     UNKNOWN (<55%)      → AI Diagnostics
        │                           → Human Review Panel
        │                           → Approve / Modify / Reject
        └── Jira Update Agent
    ↓ Ollama Local LLM (localhost:11434)
```

---

*Stack: LangGraph · FastAPI · Next.js · Qdrant · Ollama · Supabase · Jira*
