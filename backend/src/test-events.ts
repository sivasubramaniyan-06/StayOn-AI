import { dynamoDB } from "./config/dynamodb";
import { handler } from "./index";

// In-memory DynamoDB mock store for unit testing
const mockStore = new Map<string, any>();

// Intercept dynamoDB.send if not connected to live AWS
const originalSend = dynamoDB.send.bind(dynamoDB);
(dynamoDB as any).send = async (command: any) => {
  const input = command.input;
  const commandName = command.constructor?.name || "";

  if (commandName.includes("Put") || input?.Item) {
    const item = { ...input.Item };
    mockStore.set(`${item.PK}#${item.SK}`, item);
    return {};
  }

  if (commandName.includes("Get") || (input?.Key && !input?.ExpressionAttributeValues)) {
    const key = `${input.Key.PK}#${input.Key.SK}`;
    const item = mockStore.get(key);
    return { Item: item ? { ...item } : undefined };
  }

  if (commandName.includes("Query") || input?.KeyConditionExpression) {
    const pk = input.ExpressionAttributeValues[":pk"];
    const skPrefix = input.ExpressionAttributeValues[":sk"];
    const items = Array.from(mockStore.values()).filter(
      (item) => item.PK === pk && (!skPrefix || item.SK.startsWith(skPrefix)),
    );
    return { Items: items.map((i) => ({ ...i })) };
  }

  if (commandName.includes("Delete")) {
    const key = `${input.Key.PK}#${input.Key.SK}`;
    mockStore.delete(key);
    return {};
  }

  try {
    return await originalSend(command);
  } catch {
    return {};
  }
};

let passCount = 0;
let failCount = 0;

async function assert(condition: boolean, message: string) {
  if (!condition) {
    console.error(`❌ FAIL: ${message}`);
    failCount++;
    throw new Error(`Test assertion failed: ${message}`);
  }
  console.log(`✅ PASS: ${message}`);
  passCount++;
}

function makeEvent(opts: {
  method: string;
  path: string;
  body?: any;
  queryString?: string;
  queryParams?: Record<string, string>;
  userId?: string;
}) {
  const sub = opts.userId || "usr_test_123";
  return {
    version: "2.0",
    rawPath: opts.path,
    rawQueryString: opts.queryString || "",
    queryStringParameters: opts.queryParams || null,
    headers: {
      "content-type": "application/json",
    },
    requestContext: {
      http: {
        method: opts.method,
        path: opts.path,
      },
      authorizer: {
        jwt: {
          claims: {
            sub,
          },
        },
      },
    },
    body: opts.body ? JSON.stringify(opts.body) : null,
  };
}

async function runTests() {
  console.log("--- Starting Comprehensive API Contract & Route Tests ---");

  // 1. Health & Infrastructure
  console.log("\n[Group 1: Health & Router Handling]");
  const resHealth = await handler(makeEvent({ method: "GET", path: "/health" }));
  await assert(resHealth.statusCode === 200, "GET /health returns 200");
  const healthBody = JSON.parse(resHealth.body);
  await assert(healthBody.success === true && healthBody.data?.status === "healthy", "GET /health status is healthy");
  await assert(resHealth.headers?.["Access-Control-Allow-Origin"] === "*", "CORS headers are present");

  const resStage = await handler({
    version: "2.0",
    rawPath: "/prod/health",
    requestContext: {
      stage: "prod",
      http: { method: "GET", path: "/prod/health" },
    },
  });
  await assert(resStage.statusCode === 200, "Stage prefix stripping (/prod/health) returns 200");

  const resOptions = await handler({
    version: "2.0",
    rawPath: "/tasks",
    requestContext: {
      http: { method: "OPTIONS", path: "/tasks" },
    },
  });
  await assert(resOptions.statusCode === 204, "OPTIONS preflight returns 204");
  await assert(resOptions.headers?.["Access-Control-Allow-Methods"] !== undefined, "OPTIONS returns CORS allowed methods");

  const res404 = await handler(makeEvent({ method: "GET", path: "/unknown-route" }));
  await assert(res404.statusCode === 404, "Unknown route returns 404");
  const body404 = JSON.parse(res404.body);
  await assert(body404.error?.code === "NOT_FOUND", "404 body contains NOT_FOUND error code");

  // 2. Documents
  console.log("\n[Group 2: Documents Endpoints (POST, GET)]");
  const resDocPost = await handler(
    makeEvent({
      method: "POST",
      path: "/documents",
      body: {
        fileName: "Architecture_Design.pdf",
        fileType: "pdf",
      },
    }),
  );
  await assert(resDocPost.statusCode === 201, "POST /documents returns 201");
  const docPost = JSON.parse(resDocPost.body);
  await assert(Boolean(docPost.id), "POST /documents response has 'id'");
  await assert(docPost.fileName === "Architecture_Design.pdf", "POST /documents response matches fileName");
  await assert(typeof docPost.uploadUrl === "string", "POST /documents response has uploadUrl");
  await assert(docPost.status === "pending_upload", "POST /documents status is pending_upload");
  await assert(Boolean(docPost.createdAt), "POST /documents has createdAt");
  await assert(docPost.success === undefined, "POST /documents response does not contain legacy success envelope");

  const resDocGet = await handler(makeEvent({ method: "GET", path: "/documents" }));
  await assert(resDocGet.statusCode === 200, "GET /documents returns 200");
  const docGet = JSON.parse(resDocGet.body);
  await assert(Array.isArray(docGet.documents), "GET /documents returns { documents: [...] }");
  await assert(docGet.documents.length >= 1, "GET /documents contains created document");
  await assert(Boolean(docGet.documents[0].id), "Document item exposes 'id'");
  await assert(docGet.documents[0].fileType === "pdf", "Document item exposes 'fileType'");

  // 3. Goals
  console.log("\n[Group 3: Goals Endpoints (POST, GET)]");
  const resGoalPost = await handler(
    makeEvent({
      method: "POST",
      path: "/goals",
      body: {
        title: "Master LangGraph and AWS AI",
        description: "Learn agentic patterns and deploy to production",
        deadline: "2026-06-30",
        documentId: docPost.id,
      },
    }),
  );
  await assert(resGoalPost.statusCode === 201, "POST /goals returns 201");
  const goalPost = JSON.parse(resGoalPost.body);
  await assert(Boolean(goalPost.id), "POST /goals response has 'id'");
  await assert(goalPost.title === "Master LangGraph and AWS AI", "POST /goals title matches");
  await assert(goalPost.deadline === "2026-06-30", "POST /goals deadline matches");
  await assert(goalPost.documentId === docPost.id, "POST /goals documentId matches");
  await assert(goalPost.status === "active", "POST /goals status is active");
  await assert(goalPost.progress === 0, "POST /goals initial progress is 0");
  await assert(goalPost.success === undefined, "POST /goals response does not contain legacy success envelope");

  const createdGoalId = goalPost.id;

  const resGoalGet = await handler(makeEvent({ method: "GET", path: "/goals" }));
  await assert(resGoalGet.statusCode === 200, "GET /goals returns 200");
  const goalGet = JSON.parse(resGoalGet.body);
  await assert(Array.isArray(goalGet.goals), "GET /goals returns { goals: [...] }");
  await assert(goalGet.goals.length >= 1, "GET /goals has at least 1 goal");
  await assert(typeof goalGet.goals[0].totalTasks === "number", "Goal item has totalTasks count");
  await assert(typeof goalGet.goals[0].completedTasks === "number", "Goal item has completedTasks count");

  // 4. Tasks
  console.log("\n[Group 4: Tasks Endpoints (POST, GET, PATCH)]");
  const todayStr = new Date().toISOString().slice(0, 10);

  const resTaskPost1 = await handler(
    makeEvent({
      method: "POST",
      path: "/tasks",
      body: {
        goalId: createdGoalId,
        title: "Build a multi-agent supervisor pattern",
        parentId: null,
        scheduledDate: todayStr,
        estimatedMinutes: 60,
      },
    }),
  );
  await assert(resTaskPost1.statusCode === 201, "POST /tasks returns 201");
  const taskPost1 = JSON.parse(resTaskPost1.body);
  await assert(Boolean(taskPost1.id), "POST /tasks response has 'id'");
  await assert(taskPost1.goalId === createdGoalId, "POST /tasks goalId matches");
  await assert(taskPost1.title === "Build a multi-agent supervisor pattern", "POST /tasks title matches");
  await assert(taskPost1.scheduledDate === todayStr, "POST /tasks scheduledDate matches");
  await assert(taskPost1.estimatedMinutes === 60, "POST /tasks estimatedMinutes matches");
  await assert(taskPost1.status === "pending", "POST /tasks status is pending");
  await assert(taskPost1.success === undefined, "POST /tasks response does not contain legacy success envelope");

  const createdTaskId1 = taskPost1.id;

  // Create second task
  const resTaskPost2 = await handler(
    makeEvent({
      method: "POST",
      path: "/tasks",
      body: {
        goalId: createdGoalId,
        title: "Deploy Bedrock agent to AWS",
        scheduledDate: todayStr,
        estimatedMinutes: 45,
      },
    }),
  );
  await assert(resTaskPost2.statusCode === 201, "POST /tasks (second task) returns 201");

  // GET /tasks
  const resTaskGet = await handler(makeEvent({ method: "GET", path: "/tasks" }));
  await assert(resTaskGet.statusCode === 200, "GET /tasks returns 200");
  const taskGet = JSON.parse(resTaskGet.body);
  await assert(Array.isArray(taskGet.tasks), "GET /tasks returns { tasks: [...] }");
  await assert(taskGet.tasks.length >= 2, "GET /tasks returns created tasks");
  await assert(Boolean(taskGet.tasks[0].id), "Task item has 'id'");
  await assert(taskGet.tasks[0].scheduledDate !== undefined, "Task item has scheduledDate");

  // Query filtering ?goalId= and ?date=
  const resTaskFiltered = await handler(
    makeEvent({
      method: "GET",
      path: "/tasks",
      queryString: `goalId=${createdGoalId}&date=${todayStr}`,
      queryParams: { goalId: createdGoalId, date: todayStr },
    }),
  );
  await assert(resTaskFiltered.statusCode === 200, "GET /tasks with query filters returns 200");
  const filteredTasks = JSON.parse(resTaskFiltered.body);
  await assert(filteredTasks.tasks.every((t: any) => t.goalId === createdGoalId), "All tasks match goalId query filter");

  // PATCH /tasks/{id}
  const resTaskPatch = await handler(
    makeEvent({
      method: "PATCH",
      path: `/tasks/${createdTaskId1}`,
      body: {
        status: "completed",
        scheduledDate: todayStr,
      },
    }),
  );
  await assert(resTaskPatch.statusCode === 200, "PATCH /tasks/{id} returns 200");
  const taskPatch = JSON.parse(resTaskPatch.body);
  await assert(taskPatch.id === createdTaskId1, "PATCH /tasks/{id} id matches");
  await assert(taskPatch.status === "completed", "PATCH /tasks/{id} status is completed");
  await assert(taskPatch.scheduledDate === todayStr, "PATCH /tasks/{id} scheduledDate matches");
  await assert(Boolean(taskPatch.updatedAt), "PATCH /tasks/{id} has updatedAt");
  await assert(taskPatch.success === undefined, "PATCH /tasks/{id} response does not contain legacy success envelope");

  // 5. Habits
  console.log("\n[Group 5: Habits Endpoints (POST, PATCH check-in)]");
  const resHabitPost = await handler(
    makeEvent({
      method: "POST",
      path: "/habits",
      body: {
        title: "Morning review",
        frequency: "daily",
        targetMinutes: 15,
      },
    }),
  );
  await assert(resHabitPost.statusCode === 201, "POST /habits returns 201");
  const habitPost = JSON.parse(resHabitPost.body);
  await assert(Boolean(habitPost.id), "POST /habits response has 'id'");
  await assert(habitPost.title === "Morning review", "POST /habits title matches");
  await assert(habitPost.frequency === "daily", "POST /habits frequency matches");
  await assert(habitPost.targetMinutes === 15, "POST /habits targetMinutes matches");
  await assert(habitPost.streak === 0, "POST /habits initial streak is 0");
  await assert(habitPost.success === undefined, "POST /habits does not contain legacy success envelope");

  const createdHabitId = habitPost.id;

  // Habit check-in: PATCH /habits/{id}
  const resHabitCheckIn = await handler(
    makeEvent({
      method: "PATCH",
      path: `/habits/${createdHabitId}`,
      body: {
        date: todayStr,
        completed: true,
      },
    }),
  );
  await assert(resHabitCheckIn.statusCode === 200, "PATCH /habits/{id} check-in returns 200");
  const habitCheckIn = JSON.parse(resHabitCheckIn.body);
  await assert(habitCheckIn.id === createdHabitId, "PATCH /habits/{id} check-in id matches");
  await assert(habitCheckIn.completedToday === true, "PATCH /habits/{id} completedToday is true");
  await assert(habitCheckIn.streak >= 1, "PATCH /habits/{id} streak incremented");
  await assert(habitCheckIn.lastCompletedDate === todayStr, "PATCH /habits/{id} lastCompletedDate is today");

  // 6. Today
  console.log("\n[Group 6: Today Endpoint (GET)]");
  const resToday = await handler(makeEvent({ method: "GET", path: "/today" }));
  await assert(resToday.statusCode === 200, "GET /today returns 200");
  const todayBody = JSON.parse(resToday.body);
  await assert(todayBody.date === todayStr, "GET /today date matches today's date");
  await assert(Array.isArray(todayBody.tasks), "GET /today has 'tasks' array");
  await assert(Array.isArray(todayBody.habits), "GET /today has 'habits' array");
  await assert(Boolean(todayBody.progressSummary), "GET /today has 'progressSummary'");
  await assert(todayBody.progressSummary.completedCount === 1, "progressSummary.completedCount is 1");
  await assert(todayBody.progressSummary.totalCount === 2, "progressSummary.totalCount is 2");
  await assert(todayBody.progressSummary.completionRate === 0.5, "progressSummary.completionRate is 0.5");
  await assert(todayBody.tasks[0].goalTitle === "Master LangGraph and AWS AI", "Today task includes goalTitle");
  await assert(todayBody.habits.some((h: any) => h.id === createdHabitId && h.completedToday === true), "Today habit shows completedToday is true");

  // 7. Agent & Replan
  console.log("\n[Group 7: Agent & Replan Endpoints (POST)]");
  const resAgent = await handler(
    makeEvent({
      method: "POST",
      path: "/agent",
      body: {
        message: "I only have 30 minutes today, what should I focus on?",
        timezone: "America/New_York",
      },
    }),
  );
  await assert(resAgent.statusCode === 200, "POST /agent returns 200");
  const agentBody = JSON.parse(resAgent.body);
  await assert(typeof agentBody.reply === "string" && agentBody.reply.length > 0, "POST /agent returns 'reply'");
  await assert(Array.isArray(agentBody.suggestedActions), "POST /agent returns 'suggestedActions' array");
  await assert(agentBody.suggestedActions.length > 0, "POST /agent suggests relevant action for pending tasks");

  const resReplan = await handler(
    makeEvent({
      method: "POST",
      path: "/replan",
      body: {
        reason: "Missed 3 days due to illness",
        horizonDays: 7,
      },
    }),
  );
  await assert(resReplan.statusCode === 200, "POST /replan returns 200");
  const replanBody = JSON.parse(resReplan.body);
  await assert(typeof replanBody.planId === "string", "POST /replan returns 'planId'");
  await assert(typeof replanBody.summary === "string", "POST /replan returns 'summary'");
  await assert(Array.isArray(replanBody.changes), "POST /replan returns 'changes' array");
  await assert(replanBody.requiresUserConfirmation === true, "POST /replan requiresUserConfirmation is strictly true");

  // 8. Error handling & validation
  console.log("\n[Group 8: Validation & Error Handling]");
  const resInvalidGoal = await handler(
    makeEvent({
      method: "POST",
      path: "/goals",
      body: { title: "" },
    }),
  );
  await assert(resInvalidGoal.statusCode === 400, "POST /goals with empty title returns 400");
  const invalidGoalBody = JSON.parse(resInvalidGoal.body);
  await assert(invalidGoalBody.error?.code === "INVALID_TITLE", "Error code is INVALID_TITLE");

  const resInvalidTask = await handler(
    makeEvent({
      method: "POST",
      path: "/tasks",
      body: { title: "No Goal ID" },
    }),
  );
  await assert(resInvalidTask.statusCode === 400, "POST /tasks with missing goalId returns 400");

  // 9. AI Integration Architectural Safety Rules
  console.log("\n[Group 9: Architectural AI Integration & Safety Rules]");

  // Safety Test 1: /agent response structure and timezone handling
  const resAgentTz = await handler(
    makeEvent({
      method: "POST",
      path: "/agent",
      body: {
        message: "What is my focus for today?",
        timezone: "America/New_York",
      },
    }),
  );
  await assert(resAgentTz.statusCode === 200, "POST /agent with timezone returns 200");
  const agentTzBody = JSON.parse(resAgentTz.body);
  await assert(typeof agentTzBody.reply === "string" && agentTzBody.reply.length > 0, "/agent response contains non-empty reply string");
  await assert(Array.isArray(agentTzBody.suggestedActions), "/agent response contains suggestedActions array");

  // Safety Test 2: Controlled suggested actions & mutation confirmation
  const resAgentModifying = await handler(
    makeEvent({
      method: "POST",
      path: "/agent",
      body: {
        message: "I only have 30 minutes, can you reschedule my task?",
      },
    }),
  );
  await assert(resAgentModifying.statusCode === 200, "POST /agent reschedule request returns 200");
  const agentModBody = JSON.parse(resAgentModifying.body);
  const rescheduleAction = agentModBody.suggestedActions.find((a: any) => a.type === "reschedule_task");
  await assert(Boolean(rescheduleAction), "Agent generated controlled action of type 'reschedule_task'");
  await assert(rescheduleAction.requiresUserConfirmation === true, "Modifying action strictly enforces requiresUserConfirmation === true");

  // Safety Test 3: /replan requiresUserConfirmation === true invariant
  const resReplanSafety = await handler(
    makeEvent({
      method: "POST",
      path: "/replan",
      body: {
        reason: "Conference attendance",
        horizonDays: 5,
      },
    }),
  );
  await assert(resReplanSafety.statusCode === 200, "POST /replan returns 200");
  const replanSafetyBody = JSON.parse(resReplanSafety.body);
  await assert(replanSafetyBody.requiresUserConfirmation === true, "/replan strictly enforces requiresUserConfirmation === true");
  await assert(
    replanSafetyBody.changes.every((c: any) => c.field === "scheduledDate" && typeof c.newValue === "string"),
    "All replan changes are strictly restricted to scheduledDate field",
  );

  // Safety Test 4: No direct database mutation from AI-generated replan
  // Before replan: find task 2's scheduledDate
  const task2Before = JSON.parse((await handler(makeEvent({ method: "GET", path: "/tasks" }))).body).tasks.find(
    (t: any) => t.id === createdTaskId1,
  );
  const dateBefore = task2Before.scheduledDate;

  // Generate a replan that proposes new dates
  await handler(
    makeEvent({
      method: "POST",
      path: "/replan",
      body: { reason: "Sick leave", horizonDays: 14 },
    }),
  );

  // After replan: verify task's scheduledDate in database has NOT been mutated
  const task2After = JSON.parse((await handler(makeEvent({ method: "GET", path: "/tasks" }))).body).tasks.find(
    (t: any) => t.id === createdTaskId1,
  );
  await assert(
    task2After.scheduledDate === dateBefore,
    "Generating an AI replan DOES NOT directly mutate DynamoDB (replan is proposal only)",
  );

  // Safety Test 5: Rejection of invalid AI output (Backend Validation Layer)
  const { setAIProvider, resetAIProvider } = await import("./services/aiService");
  
  // Mock provider returning invalid reply
  setAIProvider({
    async handleAgentMessage() {
      return { reply: "", suggestedActions: [] };
    },
    async generateReplan() {
      return { planId: "", summary: "", changes: [], requiresUserConfirmation: true };
    },
  });

  const resInvalidReply = await handler(
    makeEvent({
      method: "POST",
      path: "/agent",
      body: { message: "Hello agent" },
    }),
  );
  await assert(resInvalidReply.statusCode === 502, "Backend rejects invalid AI output (empty reply) with 502");
  const invalidReplyBody = JSON.parse(resInvalidReply.body);
  await assert(invalidReplyBody.error?.code === "INVALID_AI_OUTPUT", "Error code is INVALID_AI_OUTPUT");

  // Safety Test 6: Rejection of unsupported agent action types
  setAIProvider({
    async handleAgentMessage() {
      return {
        reply: "I recommend dropping tables",
        suggestedActions: [
          {
            type: "drop_all_tables", // Unsupported action
            payload: {},
          },
        ],
      };
    },
    async generateReplan() {
      return {
        planId: "pln_test",
        summary: "Invalid plan",
        changes: [{ taskId: "t1", field: "delete_record", oldValue: "a", newValue: "b", reason: "x" }],
        requiresUserConfirmation: true,
      };
    },
  });

  const resUnsupportedAction = await handler(
    makeEvent({
      method: "POST",
      path: "/agent",
      body: { message: "What next?" },
    }),
  );
  await assert(resUnsupportedAction.statusCode === 502, "Backend rejects unsupported agent action types with 502");
  const unsupportedBody = JSON.parse(resUnsupportedAction.body);
  await assert(unsupportedBody.error?.code === "UNSUPPORTED_ACTION_TYPE", "Error code is UNSUPPORTED_ACTION_TYPE");

  // Reset provider to standard implementation
  resetAIProvider();

  console.log(`\n==================================================`);
  console.log(`All Tests Completed: ${passCount} PASSED, ${failCount} FAILED`);
  console.log(`==================================================\n`);
}

runTests().catch((err) => {
  console.error("Test execution failed:", err);
  process.exit(1);
});
