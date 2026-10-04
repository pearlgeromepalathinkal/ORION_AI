import os
import time
from pathlib import Path
from typing import Optional, Dict, Any, List

try:
    from dotenv import load_dotenv
    load_dotenv(dotenv_path=Path(__file__).resolve().parent.parent / ".env")
except ImportError:
    pass


class JiraTool:
    """
    Abstraction layer for Jira Cloud REST API communication.

    Handles authentication, ticket retrieval, ticket creation,
    comment posting, status transitions, and custom AI field updates.
    All agent-facing Jira operations are routed through this class
    to maintain separation of concerns in the ORION-AI architecture.
    """

    ORION_AI_FIELD_MAP = {
        "AI Category":        "customfield_10200",
        "AI Risk Score":      "customfield_10201",
        "AI Decision":        "customfield_10202",
        "AI Confidence":      "customfield_10203",
        "AI Knowledge Sources": "customfield_10204",
        "AI Resolution":      "customfield_10205",
        "AI Processing Time": "customfield_10206",
        "AI Agent Status":    "customfield_10207",
    }

    TRANSITION_MAP = {
        "resolve":     "Done",
        "clarify":     "In Progress",
        "escalate":    "In Progress",
        "reject":      "Done",
        "in_progress": "In Progress",
    }

    def __init__(self) -> None:
        """
        Initialize Jira client from environment variables.
        Raises EnvironmentError if required credentials are missing.
        """
        self.base_url = os.getenv("JIRA_URL", "").rstrip("/")
        self.email = os.getenv("JIRA_EMAIL", "")
        self.api_token = os.getenv("JIRA_API_TOKEN", "")
        self.project_key = os.getenv("JIRA_PROJECT_KEY", "ORION")

        if not self.base_url or not self.email or not self.api_token:
            raise EnvironmentError(
                "JIRA_URL, JIRA_EMAIL, and JIRA_API_TOKEN must be set in .env"
            )

        self._client = None

    @property
    def client(self):
        """
        Lazy-load authenticated JIRA client instance.
        """
        if self._client is None:
            from jira import JIRA
            self._client = JIRA(
                server=self.base_url,
                basic_auth=(self.email, self.api_token)
            )
        return self._client

    def health_check(self) -> tuple[bool, str]:
        """
        Verify Jira Cloud connectivity and authentication.

        Returns:
            Tuple of (success: bool, message: str)
        """
        try:
            myself = self.client.myself()
            return True, f"Connected as {myself['displayName']} ({myself['emailAddress']})"
        except Exception as e:
            return False, f"Jira connection failed: {str(e)}"

    def get_ticket(self, issue_key: str) -> Dict[str, Any]:
        """
        Retrieve a Jira issue and normalize it into ORION-AI AgentState format.

        Args:
            issue_key: Jira issue key, e.g. 'ORION-1'

        Returns:
            Dict containing ticket_id, title, description, status, priority, reporter.
        """
        issue = self.client.issue(issue_key)
        fields = issue.fields

        return {
            "ticket_id": issue.key,
            "title": fields.summary or "",
            "description": fields.description or "",
            "status": fields.status.name if fields.status else "Open",
            "priority": fields.priority.name if fields.priority else "Medium",
            "reporter": fields.reporter.displayName if fields.reporter else "Unknown",
        }

    def create_ticket(
        self,
        summary: str,
        description: str,
        priority: str = "Medium",
        issue_type: str = "Task"
    ) -> Dict[str, Any]:
        """
        Create a new Jira issue in the ORION project.

        Args:
            summary: One-line ticket summary.
            description: Full ticket description.
            priority: Jira priority name (e.g., 'High', 'Medium', 'Low').
            issue_type: Jira issue type name.

        Returns:
            Dict containing key, summary, and url of the created issue.
        """
        issue_dict = {
            "project": {"key": self.project_key},
            "summary": summary,
            "description": description,
            "issuetype": {"name": issue_type},
            "priority": {"name": priority},
        }

        new_issue = self.client.create_issue(fields=issue_dict)

        return {
            "key": new_issue.key,
            "summary": summary,
            "url": f"{self.base_url}/browse/{new_issue.key}",
        }

    def add_comment(self, issue_key: str, comment: str) -> bool:
        """
        Add a comment to an existing Jira issue.

        Args:
            issue_key: Jira issue key, e.g. 'ORION-1'
            comment: Comment text body.

        Returns:
            True if comment was added successfully, False otherwise.
        """
        try:
            self.client.add_comment(issue_key, comment)
            return True
        except Exception as e:
            print(f"Failed to add comment to {issue_key}: {e}", flush=True)
            return False

    def transition_ticket(self, issue_key: str, decision: str) -> bool:
        """
        Transition a Jira issue status based on the ORION-AI decision output.

        Maps ORION decision strings ('resolve', 'clarify', 'escalate', 'reject')
        to Jira transition names and applies the transition via REST API.

        Args:
            issue_key: Jira issue key, e.g. 'ORION-1'
            decision: ORION-AI decision string.

        Returns:
            True if transition was applied successfully, False otherwise.
        """
        try:
            target_name = self.TRANSITION_MAP.get(decision, "In Progress")
            transitions = self.client.transitions(issue_key)

            for transition in transitions:
                if transition["name"].lower() == target_name.lower():
                    self.client.transition_issue(issue_key, transition["id"])
                    return True

            print(
                f"No matching transition '{target_name}' found for {issue_key}. "
                f"Available: {[t['name'] for t in transitions]}",
                flush=True
            )
            return False

        except Exception as e:
            print(f"Failed to transition {issue_key}: {e}", flush=True)
            return False

    def post_resolution(
        self,
        issue_key: str,
        decision: str,
        category: str,
        risk_score: float,
        response: str,
        sources: List[str],
        processing_time: float,
    ) -> bool:
        """
        Post a structured ORION-AI resolution comment to the Jira ticket.

        Formats and attaches the full AI resolution summary including decision
        pathway, knowledge sources, risk score, and generated response.

        Args:
            issue_key: Jira issue key, e.g. 'ORION-1'
            decision: Final decision string (resolve/clarify/escalate).
            category: Detected ticket category (e.g., 'VPN', 'Database').
            risk_score: Computed risk score between 0.0 and 1.0.
            response: Step-by-step resolution text generated by the LLM.
            sources: List of knowledge silo names queried.
            processing_time: Total processing time in seconds.

        Returns:
            True if comment was successfully posted.
        """
        decision_upper = decision.upper()
        sources_str = ", ".join(s.capitalize() for s in sources) if sources else "None"

        comment = (
            f"*🤖 ORION-AI Autonomous Resolution*\n\n"
            f"----\n\n"
            f"*AI Category:* {category}\n"
            f"*AI Decision:* {decision_upper}\n"
            f"*AI Risk Score:* {risk_score:.2f}\n"
            f"*Knowledge Sources:* {sources_str}\n"
            f"*Processing Time:* {processing_time:.2f}s\n\n"
            f"----\n\n"
            f"*Resolution:*\n\n{response}\n\n"
            f"----\n"
            f"_Resolved automatically by ORION-AI. If this resolution did not help, "
            f"please reopen this ticket for human review._"
        )

        return self.add_comment(issue_key, comment)

    def post_escalation(
        self,
        issue_key: str,
        risk_score: float,
        reason: str,
    ) -> bool:
        """
        Post a structured escalation notice to the Jira ticket.

        Args:
            issue_key: Jira issue key.
            risk_score: Computed risk score.
            reason: Human-readable escalation reason.

        Returns:
            True if comment was successfully posted.
        """
        comment = (
            f"*🚨 ORION-AI Escalation Notice*\n\n"
            f"----\n\n"
            f"*Risk Score:* {risk_score:.2f}\n"
            f"*Reason:* {reason}\n\n"
            f"*Required Action:* Human administrator review required.\n\n"
            f"----\n"
            f"_This ticket has been automatically escalated by ORION-AI "
            f"due to a high-risk operation or insufficient documentation._"
        )

        return self.add_comment(issue_key, comment)

    def post_clarification_request(
        self,
        issue_key: str,
        questions: List[str],
    ) -> bool:
        """
        Post a clarification request comment to the Jira ticket.

        Args:
            issue_key: Jira issue key.
            questions: List of clarifying questions for the reporter.

        Returns:
            True if comment was successfully posted.
        """
        questions_text = "\n".join(f"{i+1}. {q}" for i, q in enumerate(questions))

        comment = (
            f"*ℹ️ ORION-AI — Additional Information Required*\n\n"
            f"----\n\n"
            f"To process this request accurately, ORION-AI needs the following details:\n\n"
            f"{questions_text}\n\n"
            f"----\n"
            f"_Please reply with the requested information so ORION-AI can continue processing._"
        )

        return self.add_comment(issue_key, comment)
