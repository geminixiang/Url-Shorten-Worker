export const config = {
    no_ref: "off", // Control the HTTP referrer header, if you want to create an anonymous link that will hide the HTTP Referer header, please set to "on" .
    theme: "", // Homepage theme, use the empty value for default theme. To use urlcool theme, please fill with "theme/urlcool" .
    cors: "on", // Allow Cross-origin resource sharing for API requests.
    unique_link: false, // If it is true, the same long url will be shorten into the same short url
    custom_link: true, // Allow users to customize the short url.
    ttl: { expirationTtl: 120 },
};

export const html404 = `<!DOCTYPE html>
<html>
<body>
  <h1>404 Not Found.</h1>
  <p>The url you visit is not found.</p>
  <p> <a href="https://github.com/xyTom/Url-Shorten-Worker/tree/crazypeace" target="_self">Fork me on GitHub</a> </p>
</body>
</html>`;

// 定義錯誤處理函數
export function handleError(message: string, status = 500) {
    return new Response(`{"status":${status},"key":"","error":"${message}"}`, {
        headers: responseHeader,
    });
}

export let responseHeader: HeadersInit = {
    "content-type": "text/html;charset=UTF-8",
};
if (config.cors === "on") {
    responseHeader = {
        "content-type": "text/html;charset=UTF-8",
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST",
    };
}

export async function randomString(len: number = 6): Promise<string> {
    const chars = "ABCDEFGHJKMNPQRSTWXYZabcdefhijkmnprstwxyz2345678"; // Removed confusing characters
    const maxPos = chars.length;
    let result = "";

    for (let i = 0; i < len; i++) {
        result += chars.charAt(Math.floor(Math.random() * maxPos));
    }

    return result;
}

export async function sha512(url: string): Promise<string> {
    const encoder = new TextEncoder();
    const urlBytes = encoder.encode(url);

    const urlDigest = await crypto.subtle.digest(
        {
            name: "SHA-512",
        },
        urlBytes,
    );

    const hashArray = Array.from(new Uint8Array(urlDigest));
    const hashHex = hashArray.map(b => b.toString(16).padStart(2, "0")).join("");

    return hashHex;
}

export async function checkURL(URL: string): Promise<boolean> {
    const expression = /^https?:\/\/(\w+:?\w*@)?(\S+)(:\d+)?(\/|\/([\w#!:.?+=&%@!\-\/]))?/;

    if (expression.test(URL)) {
        return URL.startsWith("http");
    }

    return false;
}

export async function saveUrl(URL: string): Promise<string> {
    const randomKey = await randomString();
    const isExist = await SHORT_URL.get(randomKey);

    if (isExist === null) {
        await SHORT_URL.put(randomKey, URL, config.ttl);
        return randomKey;
    } else {
        return saveUrl(URL);
    }
}

export async function is_url_exist(url_sha512: string) {
    let is_exist = await SHORT_URL.get(url_sha512);
    console.log(is_exist);
    if (is_exist == null) {
        return false;
    } else {
        return is_exist;
    }
}
