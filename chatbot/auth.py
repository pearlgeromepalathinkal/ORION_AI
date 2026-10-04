import sqlite3
import hashlib
from typing import Optional, Dict, Any
from config import Config


def hash_password(password: str) -> str:
    """Hash password using SHA-256."""
    return hashlib.sha256(password.encode("utf-8")).hexdigest()


class AuthManager:
    """
    Employee Authentication Manager using SQLite backend.
    Manages user registration, password verification, and profile retrieval.
    """

    def __init__(self, db_path: Optional[str] = None) -> None:
        self.db_path = db_path or str(Config.DB_PATH)
        self.init_db()

    def get_connection(self) -> sqlite3.Connection:
        conn = sqlite3.connect(self.db_path)
        conn.row_factory = sqlite3.Row
        return conn

    def init_db(self) -> None:
        """Create users table if not exists and seed default accounts."""
        with self.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS users (
                    employee_id TEXT PRIMARY KEY,
                    username TEXT UNIQUE NOT NULL,
                    password_hash TEXT NOT NULL,
                    name TEXT NOT NULL,
                    department TEXT NOT NULL,
                    email TEXT NOT NULL,
                    region TEXT NOT NULL,
                    role TEXT DEFAULT 'employee'
                )
            """)

            # Always ensure default demo users exist (safe on any machine)
            default_users = [
                ("EMP001", "santhos", hash_password("admin123"), "Santhos Kumar", "Engineering", "santhos@company.com", "AP-South", "admin"),
                ("EMP002", "pearl",   hash_password("admin123"), "Pearl Ann",     "Engineering", "pearl@company.com",   "AP-South", "admin"),
            ]
            cursor.executemany("""
                INSERT OR REPLACE INTO users (employee_id, username, password_hash, name, department, email, region, role)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            """, default_users)
            conn.commit()

    def authenticate(self, username: str, password: str) -> Optional[Dict[str, Any]]:
        """
        Verify username and password (case-insensitive and whitespace-tolerant).

        Returns:
            Dict containing user profile if successful, None otherwise.
        """
        clean_user = username.strip().lower()
        clean_pwd = password.strip()
        pwd_hash = hash_password(clean_pwd)
        with self.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("""
                SELECT employee_id, username, name, department, email, region, role
                FROM users
                WHERE (LOWER(username) = ? OR LOWER(name) = ?) AND password_hash = ?
            """, (clean_user, clean_user, pwd_hash))
            row = cursor.fetchone()
            if row:
                return dict(row)
        return None
