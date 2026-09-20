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

        # Intent: Today's Tasks (READ operation)
        if any(phrase in lower_msg for phrase in ["today", "what to do", "my day", "what should i do", "what should i work on"]):
            today_tasks = self.tools.get_today_tasks()
            return self._handle_today_query(today_tasks)

        # Intent: Pending Tasks (READ operation)
        if any(phrase in lower_msg for phrase in ["pending", "what tasks", "tasks left", "remaining"]):
            pending = self.tools.get_pending_tasks()
            return self._handle_pending_query(pending)

        # Intent: Finished Early (READ operation)
        if any(phrase in lower_msg for phrase in ["finished early", "finished my assignment", "assignment early", "done early", "completed early"]):
            pending = self.tools.get_pending_tasks()
            return self._handle_finished_early_query(pending)

        # Intent: Create Task Request (MUTATION operation - requires user confirmation)
        if any(phrase in lower_msg for phrase in ["add revision", "add task", "create task", "schedule revision", "revision for"]):
            return self._handle_create_task_request(clean_msg)

        # Intent: Missed / Replanning / Exam tomorrow / Move tasks (MUTATION operation - requires user confirmation)
        if any(phrase in lower_msg for phrase in [
            "missed", "yesterday", "replan", "fell behind", "reschedule",
            "exam tomorrow", "move all my tasks", "move my tasks", "move tasks"
        ]):
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
                        "requiresUserConfirmation": False,
                    }
                ],
                requiresConfirmation=False,
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
                    "requiresUserConfirmation": False,
                }
            ],
            requiresConfirmation=False,
        )

    def _handle_pending_query(self, tasks: List[Dict[str, Any]]) -> AgentResponse:
        if not tasks:
            return AgentResponse(
                reply="You have no pending tasks. All caught up!",
                suggestedActions=[],
                requiresConfirmation=False,
            )

        reply = f"You have {len(tasks)} pending task(s) across your active goals."
        suggested_actions = [
            {
                "type": "start_task",
                "taskId": t.get("id"),
                "label": f"Work on {t.get('title')}",
                "requiresUserConfirmation": False,
            }
            for t in tasks[:3]
        ]
        return AgentResponse(
            reply=reply,
            suggestedActions=suggested_actions,
            requiresConfirmation=False,
        )

    def _handle_finished_early_query(self, tasks: List[Dict[str, Any]]) -> AgentResponse:
        """Handle student finishing work ahead of schedule (read-only guidance)."""
        if not tasks:
            return AgentResponse(
                reply="Awesome job finishing early! You have no other pending tasks for your goals. Enjoy your well-earned break!",
                suggestedActions=[],
                requiresConfirmation=False,
            )

        next_task = tasks[0]
        reply = (
            f"Great momentum finishing early! If you feel like getting ahead, you have {len(tasks)} "
            f"pending task(s). You could tackle '{next_task.get('title')}'. Or take a well-deserved rest!"
        )
        return AgentResponse(
            reply=reply,
            suggestedActions=[
                {
                    "type": "start_task",
                    "taskId": next_task.get("id"),
                    "label": f"Start next task: '{next_task.get('title')}'",
                    "requiresUserConfirmation": False,
                }
            ],
            requiresConfirmation=False,
        )

    def _handle_create_task_request(self, message: str) -> AgentResponse:
        """Handle task addition request with mandatory confirmation."""
        # Clean message punctuation
        clean = re.sub(r"[?!.]+$", "", message).strip()
        match = re.search(r"(?:can you\s+)?(?:please\s+)?(?:add|create|schedule)\s+(?:a\s+)?(?:task\s+for\s+|task\s+)?(.+)", clean, re.IGNORECASE)
        title = match.group(1).strip() if match else clean
        title = title[0].upper() + title[1:] if title else "New task"

        proposed_task = {
            "title": title,
            "estimatedMinutes": 45,
            "scheduledDate": None,
        }

        reply = (
            f"I have prepared a proposal to add '{title}' (estimated 45 mins) to your workspace. "
            f"Would you like me to add this task?"
        )

        return AgentResponse(
            reply=reply,
            suggestedActions=[
                {
                    "type": "create_tasks",
                    "requiresUserConfirmation": True,
                    "tasks": [proposed_task],
                    "label": f"Confirm: Add '{title}'",
                }
            ],
            requiresConfirmation=True,
        )

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
            f"I can propose moving the affected tasks to an adjusted schedule. Would you like me to apply that?"
        )

        return AgentResponse(
            reply=reply,
            suggestedActions=[
                {
                    "type": "replan",
                    "requiresUserConfirmation": True,
                    "planId": replan.planId,
                    "label": "Confirm and Apply Rescheduling",
                },
                {
                    "type": "confirm_replan",
                    "requiresUserConfirmation": True,
                    "planId": replan.planId,
                    "label": "Apply Rescheduling Plan",
                },
                {
                    "type": "cancel_replan",
                    "requiresUserConfirmation": False,
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

        raw_text: Optional[str] = None

        # 1. Primary: Bedrock Converse
        try:
            response = self.client.converse(
                messages=messages,
                system=system_blocks,
                inference_config={"temperature": 0.2, "maxTokens": 1024},
                model_id=self.model_id,
            )
            raw_text = extract_text_from_converse_response(response)
        except Exception:
            raw_text = None

        # 2. Secondary: Configured Gemini provider when Bedrock is unavailable
        if not raw_text or not raw_text.strip():
            try:
                from ai.providers.text_generation import GeminiTextProvider
                gemini_provider = GeminiTextProvider()
                prompt = f"{SYSTEM_PROMPT}\n\nStudent: {user_message}\nStayOn AI:"
                raw_text = gemini_provider.generate(
                    prompt=prompt,
                    max_tokens=1024,
                    temperature=0.2,
                )
            except Exception:
                raw_text = None

        # 3. Graceful fallback when both providers are unavailable
        if not raw_text or not raw_text.strip():
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
