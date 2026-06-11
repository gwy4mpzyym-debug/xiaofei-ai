const { Readable } = require("stream");
const appHandler = require("../../server");

function originalUrl(event) {
  let pathname = event.path || "/";
  pathname = pathname.replace(/^\/\.netlify\/functions\/app/, "") || "/";
  if (!pathname.startsWith("/")) pathname = `/${pathname}`;
  const rawQuery = event.rawQuery || new URLSearchParams(event.queryStringParameters || {}).toString();
  const query = rawQuery ? `?${rawQuery}` : "";
  return `${pathname}${query}`;
}

function createRequest(event) {
  const req = new Readable({ read() {} });
  req.method = event.httpMethod || "GET";
  req.url = originalUrl(event);
  req.headers = Object.fromEntries(
    Object.entries(event.headers || {}).map(([key, value]) => [key.toLowerCase(), value])
  );
  req.headers.host = req.headers.host || "localhost";
  return req;
}

function createResponse(resolve) {
  const chunks = [];
  const headers = {};
  let statusCode = 200;

  const res = {
    setHeader(name, value) {
      headers[name] = value;
    },
    getHeader(name) {
      return headers[name];
    },
    writeHead(status, nextHeaders = {}) {
      statusCode = status;
      Object.assign(headers, nextHeaders);
    },
    write(chunk) {
      chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(String(chunk)));
    },
    end(chunk) {
      if (chunk) this.write(chunk);
      const body = Buffer.concat(chunks);
      const contentType = String(headers["Content-Type"] || headers["content-type"] || "");
      const isText = !body.length || /^(text\/|application\/json|application\/javascript|image\/svg\+xml)/.test(contentType);
      const responseHeaders = { ...headers };
      const response = {
        statusCode,
        headers: responseHeaders,
        body: isText ? body.toString("utf8") : body.toString("base64"),
        isBase64Encoded: !isText
      };

      if (headers["Set-Cookie"]) {
        delete responseHeaders["Set-Cookie"];
        response.multiValueHeaders = {
          "Set-Cookie": Array.isArray(headers["Set-Cookie"]) ? headers["Set-Cookie"] : [headers["Set-Cookie"]]
        };
      }

      resolve(response);
    }
  };

  return res;
}

exports.handler = async (event) => new Promise((resolve, reject) => {
  const req = createRequest(event);
  const res = createResponse(resolve);

  try {
    appHandler(req, res);
    process.nextTick(() => {
      if (event.body) {
        req.push(Buffer.from(event.body, event.isBase64Encoded ? "base64" : "utf8"));
      }
      req.push(null);
    });
  } catch (error) {
    reject(error);
  }
});
