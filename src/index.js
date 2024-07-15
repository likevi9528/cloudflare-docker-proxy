addEventListener("fetch", (event) => {
  event.passThroughOnException();
  event.respondWith(handleRequest(event.request));
});

const dockerHub = "https://registry-1.docker.io";

const routes = {
  // production
  "docker.io": dockerHub,
  "quay.io": "https://quay.io",
  "gcr.io": "https://gcr.io",
  "k8s.gcr.io": "https://k8s.gcr.io",
  "k8s.io": "https://registry.k8s.io",
  "ghcr.io": "https://ghcr.io",
  "cloudsmith.io": "https://docker.cloudsmith.io",
  "ecr.aws": "https://public.ecr.aws",

};

// function routeByHosts(host) {
//   if (host in routes) {
//     return routes[host];
//   }
//   if (MODE == "debug") {
//     return TARGET_UPSTREAM;
//   }
//   return "";
// }

// url = https://docker.test.com/docker.io/nginx/nginx

async function handleRequest(request) {
  const url = new URL(request.url);
  const hostname = url.hostname
  const match = url.match(/^https?:\/\/[^/]+\/([^/]+)\//);
  let up = ""
  if (match) {
    up = match[1];
  } else {
    up = "docker.io";
  }
  const upstream = routes[up];
  
  if (upstream === "") {
    return new Response(
      JSON.stringify({
        routes: routes,
      }),
      {
        status: 404,
      }
    );
  }

  // upstream == https://registry-1.docker.io
  // up = docker.io

  const isDockerHub = upstream == dockerHub;
  const authorization = request.headers.get("Authorization");
  // let partten1 = `/${upstream}/v2/`
  // if (url.pathname == `/${up}/v2/`) {
  if (url.pathname == "/v2/") {
    // const newUrl = new URL(`https://${hostname}/${up}/v2/`);
    const newUrl = new URL(upstream + "/v2/");
    const headers = new Headers();
    if (authorization) {
      headers.set("Authorization", authorization);
    }
    // check if need to authenticate
    const resp = await fetch(newUrl.toString(), {
      method: "GET",
      headers: headers,
      redirect: "follow",
    });
    if (resp.status === 401) {
      if (MODE == "debug") {
        headers.set(
          "Www-Authenticate",
          `Bearer realm="http://${url.host}/v2/auth",service="cloudflare-docker-proxy"`
        );
      } else {
        headers.set(
          "Www-Authenticate",
          `Bearer realm="https://${url.hostname}/v2/auth",service="cloudflare-docker-proxy"`
        );
      }
      return new Response(JSON.stringify({ message: "UNAUTHORIZED" }), {
        status: 401,
        headers: headers,
      });
    } else {
      return resp;
    }
  }
  // get token
  // if (url.pathname == `"/${up}/v2/auth"`) {
  if (url.pathname == "/v2/auth") {
    const newUrl = new URL(upstream + "/v2/");
    const resp = await fetch(newUrl.toString(), {
      method: "GET",
      redirect: "follow",
    });
    if (resp.status !== 401) {
      return resp;
    }
    const authenticateStr = resp.headers.get("WWW-Authenticate");
    if (authenticateStr === null) {
      return resp;
    }
    const wwwAuthenticate = parseAuthenticate(authenticateStr);
    let scope = url.searchParams.get("scope");
    // autocomplete repo part into scope for DockerHub library images
    // Example: repository:busybox:pull => repository:library/busybox:pull
    if (scope && isDockerHub) {
      let scopeParts = scope.split(":");
      if (scopeParts.length == 3 && !scopeParts[1].includes("/")) {
        scopeParts[1] = "library/" + scopeParts[1];
        scope = scopeParts.join(":");
      }
    }
    return await fetchToken(wwwAuthenticate, scope, authorization);
  }
  // redirect for DockerHub library images
  // Example: /v2/busybox/manifests/latest => /v2/library/busybox/manifests/latest
  // Example: docker.test.com/docker.io/v2/busybox/manifests/latest => docker.test.com/v2/library/busybox/manifests/latest
  // url = https://docker.test.com/docker.io/nginx/nginx
  if (isDockerHub) {
    const pathParts = url.pathname.split("/");
    if (pathParts.length == 6) {
      pathParts.splice(3, 0, "library");
      const redirectUrl = new URL(url);
      redirectUrl.pathname = pathParts.join("/");
      return Response.redirect(redirectUrl, 302);
    }
  }
  // foward requests
  // https://registry-1.docker.io/docker.io/...  --> https://registry-1.docker.io/...
  // const newUrl = new URL(upstream + url.pathname);
  const newUrl = new URL(upstream + url.pathname.replace(`"/${up}"`,""));
  const newReq = new Request(newUrl, {
    method: request.method,
    headers: request.headers,
    redirect: "follow",
  });
  return await fetch(newReq);
}

function parseAuthenticate(authenticateStr) {
  // sample: Bearer realm="https://auth.ipv6.docker.com/token",service="registry.docker.io"
  // match strings after =" and before "
  const re = /(?<=\=")(?:\\.|[^"\\])*(?=")/g;
  const matches = authenticateStr.match(re);
  if (matches == null || matches.length < 2) {
    throw new Error(`invalid Www-Authenticate Header: ${authenticateStr}`);
  }
  return {
    realm: matches[0],
    service: matches[1],
  };
}

async function fetchToken(wwwAuthenticate, scope, authorization) {
  const url = new URL(wwwAuthenticate.realm);
  if (wwwAuthenticate.service.length) {
    url.searchParams.set("service", wwwAuthenticate.service);
  }
  if (scope) {
    url.searchParams.set("scope", scope);
  }
  headers = new Headers();
  if (authorization) {
    headers.set("Authorization", authorization);
  }
  return await fetch(url, { method: "GET", headers: headers });
}
