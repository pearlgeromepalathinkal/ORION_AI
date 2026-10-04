# ORION-AI: Complete Setup & Deployment Guide

This guide will walk you through exactly how to set up and run the **ORION-AI Federated Multi-Agent IT Support System** on a completely new machine (like your friend's laptop) from scratch.

---

## 1. Prerequisites
Before copying the code over, ensure the new laptop has the following installed:
- **Python 3.10+**: For running the backend and agents.
- **Docker**: For running the Qdrant Vector Database.
- **Ollama**: For running the local AI model. ([Download Ollama](https://ollama.com/download))

## 2. Transfer the Project
Copy the entire `ORION-AI` folder to the new laptop. You can use a USB drive, GitHub, or ZIP file.

**WARNING:** Do **NOT** copy the `myenv/` (Virtual Environment) folder to the new laptop, as virtual environments are tied to the specific hardware and OS they were created on. We will recreate it cleanly.

## 3. Set Up the Python Environment
Open a terminal inside the copied `ORION-AI` directory and run:

```bash
# 1. Create a fresh virtual environment
python3 -m venv myenv

# 2. Activate the virtual environment
# (On Mac/Linux)
source myenv/bin/activate
# (On Windows)
# .\myenv\Scripts\activate

# 3. Install all exact dependencies from requirements.txt
pip install -r requirements.txt
```

## 4. Configure the Environment Variables
Ensure the `.env` file exists in the root of the project with the following configuration. Replace the Jira API token with a fresh one if necessary.

```ini
LLM_PROVIDER=ollama
OLLAMA_HOST=http://localhost:11434
OLLAMA_MODEL=qwen2.5:3b

QDRANT_HOST=http://localhost:6333
QDRANT_COLLECTION=orion_knowledge   

JIRA_URL=https://emailnssvitc.atlassian.net
JIRA_EMAIL=email.nssvitc@gmail.com
JIRA_API_TOKEN=your_jira_api_token_here
JIRA_PROJECT_KEY=KAN
```

## 5. Start the Qdrant Database (Docker)
Start the Qdrant vector database using Docker. This will run it continuously in the background.

```bash
docker run -d -p 6333:6333 -p 6334:6334 \
    --name orion-qdrant \
    qdrant/qdrant
```

## 6. Start Ollama and Pull the Model
Ensure Ollama is running in the background (usually a menu bar app on Mac/Windows). Then, open a terminal and pull the required Qwen model:

```bash
ollama pull qwen2.5:3b
```

## 7. Ingest the Knowledge Base
Now that Qdrant is running, we need to populate it with your IT Support documents so the Agents can perform RAG (Retrieval-Augmented Generation).

```bash
# Ensure your virtual environment is still active
python -c "
from tools.qdrant_tools import QdrantTool
qt = QdrantTool()
result = qt.ingest_knowledge_base('knowledge-base')
print('Ingestion Complete!', result)
"
```
*You should see an output indicating that all your `.txt` files were embedded and uploaded.*

## 8. Run the Application!
The system is fully built and ready. Launch the rich terminal interface:

```bash
python app.py
```

**Default login credentials:**
- **Username**: `santhos`
- **Password**: `admin123`
