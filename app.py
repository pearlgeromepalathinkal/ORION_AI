#!/usr/bin/env python3
"""
ORION-AI — Master Application Entry Point
------------------------------------------
Starts the background FastAPI backend service and the interactive
Employee Terminal Assistant for autonomous IT support ticket resolution.
"""

import sys
import time
import threading
import logging
import urllib.request
from typing import Optional

import uvicorn
from rich.console import Console

from config import Config
from chatbot.terminal import TerminalChatbot

console = Console()


def is_api_healthy(host: str, port: int, timeout: float = 0.5) -> bool:
    """Check if the FastAPI backend is responding on /health."""
    try:
        url = f"http://{host}:{port}/health"
        with urllib.request.urlopen(url, timeout=timeout) as resp:
            return resp.status == 200
    except Exception:
        return False


def start_background_api(host: str = Config.API_HOST, port: int = Config.API_PORT) -> Optional[uvicorn.Server]:
    """
    Starts the FastAPI backend asynchronously in a daemon thread so the
    terminal assistant runs alongside it seamlessly.
    """
    if is_api_healthy(host, port):
        console.print(f"  [dim cyan]⚡ FastAPI backend is already running at http://{host}:{port}[/dim cyan]")
        return None

    # Mute access logs during terminal session to preserve Rich formatting
    logging.getLogger("orion_api").setLevel(logging.WARNING)
    logging.getLogger("uvicorn.access").setLevel(logging.WARNING)
    logging.getLogger("uvicorn.error").setLevel(logging.WARNING)

    server_config = uvicorn.Config(
        "backend.main:app",
        host=host,
        port=port,
        log_level="warning",
        access_log=False,
    )
    server = uvicorn.Server(server_config)

    server_thread = threading.Thread(
        target=server.run,
        daemon=True,
        name="ORION-FastAPI-Server"
    )
    server_thread.start()

    # Wait for the backend to become healthy
    start_t = time.time()
    while time.time() - start_t < 8.0:
        if is_api_healthy(host, port):
            console.print(
                f"  [bold green]🚀 FastAPI Backend online:[/bold green] "
                f"[cyan]http://{host}:{port}[/cyan] "
                f"[dim](Swagger Docs: http://{host}:{port}/docs)[/dim]\n"
            )
            return server
        time.sleep(0.2)

    console.print(f"  [yellow]⚠️ FastAPI backend initialization taking longer than usual...[/yellow]\n")
    return server


def main() -> None:
    """Launch ORION-AI with automated background FastAPI backend and Terminal Assistant."""
    server: Optional[uvicorn.Server] = None
    try:
        server = start_background_api()
        chatbot = TerminalChatbot()
        chatbot.start()
    except KeyboardInterrupt:
        console.print("\n\n[yellow]Session terminated by user. Goodbye![/yellow]")
        sys.exit(0)
    except Exception as e:
        console.print(f"\n[bold red]❌ Unexpected Application Error:[/bold red] {e}")
        sys.exit(1)
    finally:
        if server:
            server.should_exit = True


if __name__ == "__main__":
    main()
