export default async function (request: Request): Promise<Response> {
  try {
    const payload = await request.json().catch(() => ({}));

    const requestedHeader = String(
      payload?.header ?? payload?.body?.header ?? ""
    )
      .trim()
      .toLowerCase();

    if (!requestedHeader) {
      return new Response(
        JSON.stringify({
          error: "invalid_request",
          message: "A 'header' field is required."
        }),
        {
          status: 400,
          headers: { "content-type": "application/json" }
        }
      );
    }

    // Block only when the USER REQUESTS the "sam" header
    if (requestedHeader === "sam") {
      return new Response(
        JSON.stringify({
          error: "blocked",
          message: "Requests for the 'sam' header are not allowed."
        }),
        {
          status: 403,
          headers: { "content-type": "application/json" }
        }
      );
    }

    // Use a more stable public echo backend
    const upstreamResponse = await fetch("https://httpbin.org/headers", {
      method: "GET",
      headers: {
        accept: "application/json",
        "user-agent": "zuplo-mcp-demo/1.0"
      }
    });

    const upstreamText = await upstreamResponse.text();

    if (!upstreamResponse.ok) {
      return new Response(
        JSON.stringify({
          error: "upstream_error",
          message: `Upstream call failed with status ${upstreamResponse.status}.`,
          upstream_body: upstreamText
        }),
        {
          status: 502,
          headers: { "content-type": "application/json" }
        }
      );
    }

    const upstreamJson = JSON.parse(upstreamText);
    const headersObj = upstreamJson?.headers ?? {};

    // httpbin may return header keys with different casing
    const foundKey = Object.keys(headersObj).find(
      (key) => key.toLowerCase() === requestedHeader
    );

    const headerValue = foundKey ? headersObj[foundKey] : null;

    return new Response(
      JSON.stringify({
        header: requestedHeader,
        value: headerValue
      }),
      {
        status: 200,
        headers: { "content-type": "application/json" }
      }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({
        error: "internal_error",
        message: error instanceof Error ? error.message : "Unknown error"
      }),
      {
        status: 500,
        headers: { "content-type": "application/json" }
      }
    );
  }
}