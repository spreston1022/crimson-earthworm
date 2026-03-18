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

    const url = new URL(request.url);
    const upstreamUrl = `${url.origin}/path-0`;

    const upstreamResponse = await fetch(upstreamUrl, {
      method: "GET",
      headers: {
        accept: "application/json"
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
    const headerValue = headersObj[requestedHeader] ?? null;

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