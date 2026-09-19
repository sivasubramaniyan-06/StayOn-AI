import { handler } from "./handlers";

console.log("TEST STARTED");

async function main() {
    const response = await handler({
        path: "/tasks",
        httpMethod: "GET",
        headers: {},
        multiValueHeaders: {},
        queryStringParameters: null,
        multiValueQueryStringParameters: null,
        pathParameters: null,
        stageVariables: null,
        requestContext: {
            authorizer: {
                claims: {
                    sub: "test-user-123",
                },
            },
        } as any,
        resource: "/health",
        body: null,
        isBase64Encoded: false,
    });

    console.log("STATUS:", response.statusCode);
    console.log("BODY:", response.body);
}

main().catch((error) => {
    console.error(error);
    process.exit(1);
});