# ORION-AI

A federated multi-agent framework for autonomous IT support ticket resolution. ORION-AI combines a LangGraph workflow, a Python terminal assistant, a FastAPI service, and a Next.js operations dashboard to triage incidents, retrieve supporting knowledge, and route decisions through verification and human review.

## Features

- **Agent workflow:** ticket intake, intent detection, scope validation, risk assessment, knowledge routing, evidence aggregation, conflict resolution, and response generation.
- **Knowledge retrieval:** Qdrant and Sentence Transformers over the included IT knowledge base, organized into Confluence, SharePoint, and GitHub source categories.
- **Human review:** clarification, approval, and review of unknown incidents before the workflow continues.
- **Verification and provenance:** resolution checks, audit information, and feedback stages.
- **Jira integration:** ticket creation and updates when Jira credentials are configured.
- **Operations dashboard:** incident views, an interactive operations floor, analytics, knowledge browsing, and workflow event streaming. Some views include simulated or fallback data.

The bundled knowledge documents represent source silos; they do not automatically synchronize with live Confluence, SharePoint, or GitHub accounts.

## Project structure

```text
ORION-AI/
├── Agents.py          # LangGraph agents, routing, and workflow
├── app.py             # Terminal assistant and background API launcher
├── config.py          # Environment configuration
├── backend/           # FastAPI routes, schemas, services, and WebSockets
├── chatbot/           # Terminal UI, SQLite authentication, and sessions
├── dashboard/         # Next.js / React / TypeScript dashboard
├── models/            # Human-review and verification models
├── tools/             # Ollama, Jira, and Qdrant integrations
├── knowledge-base/    # IT support documents by domain and source
├── figures/           # Project diagrams and figures
└── requirements.txt   # Python dependency snapshot
```

## Local setup

Use Python 3.10 or later and a Node.js runtime compatible with the version of Next.js in `dashboard/package.json`. Ollama is required for the current LLM implementation. Docker is useful for running Qdrant.

Run commands from the repository root unless a step specifies otherwise.

### 1. Install Python dependencies

```bash
python3 -m venv .venv
source .venv/bin/activate
python -m pip install --upgrade pip
python -m pip install -r requirements.txt
python -m pip install fastapi 'uvicorn[standard]' PyJWT
```

On Windows, activate the environment with `.venv\Scripts\activate`.

The additional API packages above are imported by the backend but are not listed in the current `requirements.txt` snapshot. The snapshot contains exact version pins; installation depends on those versions being available for your platform and package index.

### 2. Configure the backend

```bash
cp .env.example .env
```

Edit `.env` for your environment:

| Variable | Purpose |
| --- | --- |
| `OLLAMA_HOST` | Ollama server; defaults to `http://localhost:11434` |
| `OLLAMA_MODEL` | Model to run; the example uses `qwen2.5:3b` |
| `QDRANT_HOST` | Qdrant endpoint; defaults to `http://localhost:6333` |
| `QDRANT_COLLECTION` | Collection name; defaults to `orion_knowledge` |
| `JIRA_URL`, `JIRA_EMAIL`, `JIRA_API_TOKEN` | Optional Jira connection credentials |
| `JIRA_PROJECT_KEY` | Jira project used for tickets |
| `JWT_SECRET_KEY` | Set a strong, unique signing secret |
| `CORS_ORIGINS` | Comma-separated permitted frontend origins |
| `API_HOST`, `API_PORT` | Host and port used by `app.py` |

Although `.env.example` mentions other LLM providers, `tools/llm_tools.py` currently calls Ollama directly. Set `OLLAMA_MODEL` explicitly to keep the client and configuration defaults consistent.

### 3. Start Ollama and prepare retrieval

With Ollama installed, start its service if it is not already running:

```bash
ollama serve
```

In another terminal, download the configured model:

```bash
ollama pull qwen2.5:3b
```

For vector retrieval, start Qdrant:

```bash
docker run -d --name orion-qdrant \
  -p 6333:6333 -p 6334:6334 \
  -v orion-qdrant-data:/qdrant/storage \
  qdrant/qdrant
```

The retrieval module enables offline Hugging Face mode. Download the embedding model once in a separate Python process before importing that module:

```bash
HF_HUB_OFFLINE=0 TRANSFORMERS_OFFLINE=0 python -c \
  'from sentence_transformers import SentenceTransformer; SentenceTransformer("all-MiniLM-L6-v2")'
```

Then index the bundled documents into Qdrant:

```bash
python -c 'from tools.qdrant_tools import QdrantTool; print(QdrantTool().ingest_knowledge_base())'
```

Some knowledge operations fall back to local documents when Qdrant is unavailable. Use a running Qdrant service and cached embeddings for vector search.

### 4. Run the application

Start the terminal assistant and its background API together:

```bash
python app.py
```

Or run only the API:

```bash
python -m uvicorn backend.main:app --host 127.0.0.1 --port 8000 --reload
```

- API health: `http://localhost:8000/health`
- Dependency health: `http://localhost:8000/health/dependencies`
- Interactive API documentation: `http://localhost:8000/docs`

The local SQLite user database is created automatically. `chatbot/auth.py` seeds demonstration accounts; review those defaults before exposing the application beyond your machine.

### 5. Run the dashboard

In a separate terminal:

```bash
cd dashboard
cp .env.local.example .env.local
npm ci
npm run dev
```

Set `NEXT_PUBLIC_ORION_API_URL=http://localhost:8000` and `NEXT_PUBLIC_ORION_WS_URL=ws://localhost:8000` in `.env.local`. Configure the Supabase URL and anonymous key for features using its realtime client. Dashboard Jira routes use `JIRA_BASE_URL`, while the Python backend uses `JIRA_URL`.

Open `http://localhost:3000`.

For a production build:

```bash
npm run build
npm start
```

Run `npm run lint` in `dashboard/` for the configured frontend lint checks.

## Configuration and data

- Keep credentials in local environment files. Commit example files containing placeholders only.
- User databases, virtual environments, build output, and Qdrant runtime storage are excluded from Git. Knowledge-base source documents remain versioned.
- The supplied authentication and demo accounts are intended for local development. Review password storage, default accounts, JWT configuration, and endpoint access before deployment.
- See [SETUP_GUIDE.md](SETUP_GUIDE.md) and [DEPLOY.md](DEPLOY.md) for additional project notes; check their commands against the current code and the setup above.
- Dashboard asset credits are listed in [dashboard/ATTRIBUTION.md](dashboard/ATTRIBUTION.md).
