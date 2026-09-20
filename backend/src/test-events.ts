import { handler } from "./index";

async function assert(condition: boolean, message: string) {
  if (!condition) {
    console.error(`❌ FAIL: ${message}`);
    process.exit(1);
  }
  console.log(`✅ PASS: ${message}`);
}

async function runTests() {
  process.env.TABLE_NAME = process.env.TABLE_NAME || "stayon-app-data";

  console.log("--- Starting Backend Event & Route Tests ---");

  // Test 1: API Gateway HTTP API v2 - GET /health
  const v2HealthEvent = {
    version: "2.0",
    routeKey: "GET /health",
    rawPath: "/health",
    rawQueryString: "",
    headers: {
      "content-type": "application/json",
    },
    requestContext: {
      http: {
        method: "GET",
        path: "/health",
      },
    },
  };

  const res1 = await handler(v2HealthEvent);
  await assert(res1.statusCode === 200, "HTTP API v2 GET /health returns 200");
  const body1 = JSON.parse(res1.body);
  await assert(body1.success === true, "HTTP API v2 GET /health body success is true");
  await assert(body1.data.status === "healthy", "HTTP API v2 GET /health status is healthy");
  await assert(res1.headers?.["Access-Control-Allow-Origin"] === "*", "CORS headers are present");

  // Test 2: API Gateway HTTP API v2 with stage prefix - GET /prod/health
  const v2StageHealthEvent = {
    version: "2.0",
    routeKey: "GET /health",
    rawPath: "/prod/health",
    rawQueryString: "",
    headers: {},
    requestContext: {
      stage: "prod",
      http: {
        method: "GET",
        path: "/prod/health",
      },
    },
  };

  const res2 = await handler(v2StageHealthEvent);
  await assert(res2.statusCode === 200, "HTTP API v2 GET /prod/health (stage stripped) returns 200");

  // Test 3: Legacy direct Lambda / REST API v1 style event - GET /health
  const v1HealthEvent = {
    httpMethod: "GET",
    path: "/health",
    headers: {},
    requestContext: {},
  };

  const res3 = await handler(v1HealthEvent);
  await assert(res3.statusCode === 200, "Legacy v1 GET /health returns 200");

  // Test 4: Unknown path -> 404
  const notFoundEvent = {
    version: "2.0",
    rawPath: "/unknown-endpoint",
    requestContext: {
      http: {
        method: "GET",
        path: "/unknown-endpoint",
      },
    },
  };

  const res4 = await handler(notFoundEvent);
  await assert(res4.statusCode === 404, "Unknown path returns 404");
  const body4 = JSON.parse(res4.body);
  await assert(body4.error.code === "NOT_FOUND", "404 returns NOT_FOUND error code");

  // Test 5: OPTIONS preflight CORS test
  const optionsEvent = {
    version: "2.0",
    rawPath: "/tasks",
    requestContext: {
      http: {
        method: "OPTIONS",
        path: "/tasks",
      },
    },
  };

  const res5 = await handler(optionsEvent);
  await assert(res5.statusCode === 204, "OPTIONS request returns 204");
  await assert(res5.headers?.["Access-Control-Allow-Methods"] !== undefined, "CORS allow methods header present");

  // Test 6: HTTP API v2 with JWT authorizer claims - PATCH /tasks/{id} validation
  const v2TasksPatchEvent = {
    version: "2.0",
    rawPath: "/tasks/task-abc-123",
    requestContext: {
      http: {
        method: "PATCH",
        path: "/tasks/task-abc-123",
      },
      authorizer: {
        jwt: {
          claims: {
            sub: "user-jwt-123",
          },
        },
      },
    },
    body: JSON.stringify({ title: "Updated Title" }),
  };

  const res6 = await handler(v2TasksPatchEvent);
  // Route was matched and processed by tasksHandler; if DynamoDB is unreachable it returns 500 or error, but not 404 route not found!
  await assert(res6.statusCode !== 404, "PATCH /tasks/{id} with v2 JWT claims was routed to tasksHandler (not 404)");

  // Test 7: HTTP API v2 - PATCH /habits/{id} validation
  const v2HabitsPatchEvent = {
    version: "2.0",
    rawPath: "/habits/habit-xyz-789",
    requestContext: {
      http: {
        method: "PATCH",
        path: "/habits/habit-xyz-789",
      },
      authorizer: {
        jwt: {
          claims: {
            sub: "user-jwt-123",
          },
        },
      },
    },
    body: JSON.stringify({ name: "Updated Habit Name" }),
  };

  const res7 = await handler(v2HabitsPatchEvent);
  await assert(res7.statusCode !== 404, "PATCH /habits/{id} with v2 JWT claims was routed to habitsHandler (not 404)");

  // Test 8: Legacy v1 event with direct authorizer claims
  const v1TasksEvent = {
    httpMethod: "GET",
    path: "/tasks",
    headers: {},
    requestContext: {
      authorizer: {
        claims: {
          sub: "user-v1-123",
        },
      },
    },
  };

  const res8 = await handler(v1TasksEvent);
  await assert(res8.statusCode !== 404, "Legacy v1 GET /tasks was routed to tasksHandler (not 404)");

  // Test 9: Query string normalization
  const v2QueryEvent = {
    version: "2.0",
    rawPath: "/tasks",
    rawQueryString: "goalId=goal-001&status=pending",
    requestContext: {
      http: {
        method: "GET",
        path: "/tasks",
      },
      authorizer: {
        claims: {
          sub: "user-123",
        },
      },
    },
  };

  const res9 = await handler(v2QueryEvent);
  await assert(res9.statusCode !== 404, "v2 event with rawQueryString routed successfully");

  // Test 10: Malformed event fallback
  const res10 = await handler(null);
  await assert(res10.statusCode === 404, "Null event gracefully handled and returns 404");

  console.log("--- All Backend Event & Route Tests Passed Successfully ---");
}

runTests().catch((err) => {
  console.error("Test execution failed:", err);
  process.exit(1);
});
