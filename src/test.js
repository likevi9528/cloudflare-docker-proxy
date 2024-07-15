const url = "https://dp1.test.best/ghcr.libcuda.so/openfaas/queue-worker/v2/svsv/wfd?fdf=fdfd&fdf=rfdv";
const url2 = new URL("https://dp1.test.best/ghcr.libcuda.so/openfaas/queue-worker/v2/svsv/wfd?fdf=fdfd&fdf=rfdv");

// 使用正则表达式来匹配第一个斜杠和第二个斜杠之间的内容
const match = url.match(/^https?:\/\/[^/]+\/([^/]+)\//);
let updatedPathname = url.replace('/ghcr.libcuda.so', '');
let up = ""
// http://
// console.log("第二个参数：", url.hostname);
if (match) {
    // 第一个斜杠和第二个斜杠之间的参数
    const firstParam = match[1];
    const secondParam = match[2];
    up = match[1];

    console.log("第一个参数：", firstParam);
    console.log("第二个参数：", url2.hostname);
    console.log("第3个参数：", updatedPathname);
} else {
    console.log("未找到匹配的参数");
}
console.log("第4个参数：", up);

const scope = "repository:busybox:pull"
let scopeParts = scope.split(":");
console.log(scopeParts[1]);


// const dockerHub = "https://registry-1.docker.io";

// const routes = {
//     // production
//     "docker.io": dockerHub,
//     "quay.io": "https://quay.io",
//     "gcr.io": "https://gcr.io",
//     "k8s.gcr.io": "https://k8s.gcr.io",
//     "k8s.io": "https://registry.k8s.io",
//     "ghcr.io": "https://ghcr.io",
//     "cloudsmith.io": "https://docker.cloudsmith.io",
//     "ecr.aws": "https://public.ecr.aws",
  
//   };

//   function routeByHosts(host) {
//     if (host in routes) {
//       return routes[host];
//     }
//     // if (MODE == "debug") {
//     //   return TARGET_UPSTREAM;
//     // }
//     return "";
//   }

//   console.log("aaa: ", (routes["docker.io"]))