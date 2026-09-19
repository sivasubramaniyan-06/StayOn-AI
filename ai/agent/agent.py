"""StayOn AI Agent Reasoning Layer.

Implements the student workspace assistant.
Follows: "Bedrock suggests, backend validates, user confirms."
Never modifies DynamoDB directly; uses controlled AgentTools.
"""

from __future__ import annotations

from dataclasses import asdict, dataclass
import json
import re
from typing import Any, Dict, List, Optional

from ai.agent.tools import AgentTools
from ai.client import (
    BedrockClientProtocol,
    BedrockConverseClient,
    clean_json_markdown,
    extract_text_from_converse_response,
)
from ai.planning.replan_generator import GeneratedReplan, ReplanGenerator


@dataclass
class AgentResponse:
    """Agent response structure conforming to API_CONTRACT POST /agent."""
    reply: str
    suggestedActions: List[Dict[str, Any]]
    requiresConfirmation: bool = False
    pendingPlan: Optional[Dict[str, Any]] = None

    def to_dict(self) -> Dict[str, Any]:
        data: Dict[str, Any] = {
            "reply": self.reply,
            "suggestedActions": self.suggestedActions,
        }
        if self.requiresConfirmation:
            data["requiresConfirmation"] = True
        if self.pendingPlan:
            data["pendingPlan"] = self.pendingPlan
        return data


SYSTEM_PROMPT = """You are the StayOn AI student companion.
Your goal is to help students stay on track with their learning goals, tasks, and daily habits.
Architecture and safety principles:
1. Ground your answers strictly in the student's actual tasks and goals. Never invent imaginary tasks or deadlines.
2. If the student asks what to do today, summarize today's scheduled tasks and suggest starting the highest priority one.
3. If the student missed work or requests replanning, suggest an adaptive replanning action that requires explicit user confirmation.
4. You have NO direct database access. You interact solely through controlled action tools.
5. Be concise, encouraging, and clear.
"""


class StayOnAgent:
    """Intelligent student assistant orchestrating reasoning and tool use."""

    def __init__(
        self,
        client: Optional[BedrockClientProtocol] = None,
        tools: Optional[AgentTools] = None,
        replan_generator: Optional[ReplanGenerator] = None,
        model_id: Optional[str] = None,
    ) -> None:
        self.client = client or BedrockConverseClient()
        self.tools = tools or AgentTools()
        self.replan_generator = replan_generator or ReplanGenerator(client=self.client)
        self.model_id = model_id

    def handle_message(
        self,
        message: str,
        conversation_history: Optional[List[Dict[str, str]]] = None,
    ) -> AgentResponse:
        """Process a natural language message from the student.

        Handles queries such as:
        - "What should I do today?"
        - "What tasks are pending?"
        - "I missed yesterday." / "Help me replan"
        - "Help me plan my study."

        Returns:
            AgentResponse matching docs/API_CONTRACT.md.
        """
        if not message or not message.strip():
            raise ValueError("Student message cannot be empty")

        clean_msg = message.strip()
        lower_msg = clean_msg.lower()

        # Intent: Today's Tasks
        if any(phrase in lower_msg for phrase in ["today", "what to do", "my day", "what should i do"]):
            today_tasks = self.tools.get_today_tasks()
            return self._handle_today_query(today_tasks)

        # Intent: Pending Tasks
        if any(phrase in lower_msg for phrase in ["pending", "what tasks", "tasks left", "remaining"]):
            pending = self.tools.get_pending_tasks()
            return self._handle_pending_query(pending)

        # Intent: Missed / Replanning
        if any(phrase in lower_msg for phrase in ["missed", "yesterday", "replan", "fell behind", "reschedule"]):
            return self._handle_replan_request(reason=clean_msg)

        # Intent: General study planning or conversational query
        return self._handle_conversational_query(clean_msg, conversation_history)

    def _handle_today_query(self, tasks: List[Dict[str, Any]]) -> AgentResponse:
        if not tasks:
            return AgentResponse(
                reply="You have no tasks scheduled for today! Great job, or feel free to check pending tasks to get ahead.",
                suggestedActions=[
                    {
                        "type": "view_pending",
                        "label": "View All Pending Tasks",
                    }
                ],
            )

        task_summaries = [f"• {t.get('title')} ({t.get('estimatedMinutes', 30)} mins)" for t in tasks]
        first_task = tasks[0]

        reply = (
            f"You have {len(tasks)} task(s) scheduled for today:\n"
            + "\n".join(task_summaries)
            + f"\n\nI suggest starting with '{first_task.get('title')}'. Ready to dive in?"
        )

        return AgentResponse(
            reply=reply,
            suggestedActions=[
                {
                    "type": "start_task",
                    "taskId": first_task.get("id"),
                    "label": f"Start '{first_task.get('title')}'",
                }
            ],
        )

    def _handle_pending_query(self, tasks: List[Dict[str, Any]]) -> AgentResponse:
        if not tasks:
            return AgentResponse(
                reply="You have no pending tasks. All caught up!",
                suggestedActions=[],
            )

        reply = f"You have {len(tasks)} pending task(s) across your active goals."
        suggested_actions = [
            {
                "type": "start_task",
                "taskId": t.get("id"),
                "label": f"Work on {t.get('title')}",
            }
            for t in tasks[:3]
        ]
        return AgentResponse(reply=reply, suggestedActions=suggested_actions)

    def _handle_replan_request(self, reason: str) -> AgentResponse:
        pending = self.tools.get_pending_tasks()
        # Propose replanning via replan_generator
        replan = self.replan_generator.generate_replan(
            current_tasks=pending,
            pending_tasks=pending,
            missed_tasks=pending[:2],
            reason=reason,
        )

        reply = (
            f"No worries at all! Life happens. {replan.summary} "
            f"I have prepared an updated schedule for you. Please review and confirm to apply it."
        )

        return AgentResponse(
            reply=reply,
            suggestedActions=[
                {
                    "type": "confirm_replan",
                    "planId": replan.planId,
                    "label": "Confirm and Apply Rescheduling",
                },
                {
                    "type": "cancel_replan",
                    "planId": replan.planId,
                    "label": "Keep Current Schedule",
                },
            ],
            requiresConfirmation=True,
            pendingPlan=replan.to_dict(),
        )

    def _handle_conversational_query(
        self,
        user_message: str,
        history: Optional[List[Dict[str, str]]] = None,
    ) -> AgentResponse:
        """Delegate general queries to Bedrock Converse with safety guidelines."""
        system_blocks = [{"text": SYSTEM_PROMPT}]
        messages: List[Dict[str, Any]] = []

        if history:
            for item in history:
                messages.append({
                    "role": item.get("role", "user"),
                    "content": [{"text": item.get("content", "")}],
                })

        messages.append({
            "role": "user",
            "content": [{"text": user_message}],
        })

        try:
            response = self.client.converse(
                messages=messages,
                system=system_blocks,
                inference_config={"temperature": 0.2, "maxTokens": 1024},
                model_id=self.model_id,
            )
            raw_text = extract_text_from_converse_response(response)
        except Exception:
            raw_text = (
                "I'm here to help you stay on track! You can ask me what to do today, "
                "check your pending tasks, or ask me to replan your schedule if you fell behind."
            )

        return AgentResponse(
            reply=raw_text,
            suggestedActions=[
                {
                    "type": "view_today",
                    "label": "Check Today's Tasks",
                }
            ],
        )
