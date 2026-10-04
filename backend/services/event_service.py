"""
Real-Time Event Manager for WebSocket Streaming.
Supports publishing and subscribing to workflow events per ticket ID.
"""

import asyncio
import threading
from typing import Dict, List, Set, Any
from starlette.websockets import WebSocket


class EventService:
    """
    In-memory pub/sub event broadcaster for WebSocket clients.
    Thread-safe and async-friendly. Stores event history per ticket
    so late subscribers receive the full sequence.
    """

    def __init__(self) -> None:
        self._subscribers: Dict[str, Set[WebSocket]] = {}
        self._history: Dict[str, List[Dict[str, Any]]] = {}
        self._lock = threading.Lock()

    def subscribe(self, ticket_id: str, websocket: WebSocket) -> None:
        """Register a WebSocket client for a ticket's event stream."""
        with self._lock:
            if ticket_id not in self._subscribers:
                self._subscribers[ticket_id] = set()
            self._subscribers[ticket_id].add(websocket)

    def unsubscribe(self, ticket_id: str, websocket: WebSocket) -> None:
        """Unregister a WebSocket client."""
        with self._lock:
            if ticket_id in self._subscribers:
                self._subscribers[ticket_id].discard(websocket)
                if not self._subscribers[ticket_id]:
                    del self._subscribers[ticket_id]

    def get_history(self, ticket_id: str) -> List[Dict[str, Any]]:
        """Retrieve buffered past events for a ticket."""
        with self._lock:
            return list(self._history.get(ticket_id, []))

    async def publish(self, ticket_id: str, event: Dict[str, Any]) -> None:
        """
        Record and broadcast an event to all connected WebSocket subscribers.
        """
        with self._lock:
            if ticket_id not in self._history:
                self._history[ticket_id] = []
            self._history[ticket_id].append(event)
            targets = list(self._subscribers.get(ticket_id, []))

        dead_sockets: List[WebSocket] = []
        for ws in targets:
            try:
                await ws.send_json(event)
            except Exception:
                dead_sockets.append(ws)

        if dead_sockets:
            with self._lock:
                for ws in dead_sockets:
                    if ticket_id in self._subscribers:
                        self._subscribers[ticket_id].discard(ws)


# Global singleton event service
event_service = EventService()
