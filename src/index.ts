/**
 * Welcome to Cloudflare Workers! This is your first worker.
 *
 * - Run `npm run dev` in your terminal to start a development server
 * - Open a browser tab at http://localhost:8787/ to see your worker in action
 * - Run `npm run deploy` to publish your worker
 *
 * Bind resources to your worker in `wrangler.toml`. After adding bindings, a type definition for the
 * `Env` object can be regenerated with `npm run cf-typegen`.
 *
 * Learn more at https://developers.cloudflare.com/workers/
 */

import { config, html404, handleError, responseHeader, sha512, checkURL, saveUrl, is_url_exist } from "./utils";
import * as schema from "./schema";

async function kv_router(path: string, params: string): Promise<Response> {
    const value = await SHORT_URL.get(path);
    let location;

    if (params) {
        location = value + params;
    } else {
        location = value;
    }
    console.log(value);

    if (location) {
        if (config.no_ref == "on") {
            let no_ref = await fetch("https://cdn.jsdelivr.net/gh/xyTom/Url-Shorten-Worker@crazypeace-gh-pages/no-ref.html");
            let res = await no_ref.text();
            res = res.replace(/{Replace}/gm, location);
            return new Response(res, {
                headers: {
                    "content-type": "text/html;charset=UTF-8",
                },
            });
        } else {
            return Response.redirect(location, 302);
        }
    } else {
        return new Response(html404, {
            headers: {
                "content-type": "text/html;charset=UTF-8",
            },
            status: 404,
        });
    }
}

async function main(requestURL: URL): Promise<Response> {
    const path = requestURL.pathname.split("/")[1];
    const password_value = await SHORT_URL.get("password");
    const params = requestURL.search;

    if (path == password_value) {
        let index = await fetch("https://cdn.jsdelivr.net/gh/xyTom/Url-Shorten-Worker@crazypeace-gh-pages/" + config.theme + "/index.html");
        let res = await index.text();
        res = res.replace(/__PASSWORD__/gm, password_value);
        return new Response(res, {
            headers: {
                "content-type": "text/html;charset=UTF-8",
            },
        });
    }

    return await kv_router(path, params);
}

async function post(request: Request): Promise<Response> {
    let req: schema.RequestBody = await request.json();
    let req_cmd = req["cmd"];
    const password_value = await SHORT_URL.get("password");

    if (req_cmd == "add") {
        let req_url = req["url"];
        let req_keyPhrase = req["keyPhrase"];
        let req_password = req["password"];

        if (!(await checkURL(req_url))) {
            return handleError("Url illegal.");
        }

        if (req_password != password_value) {
            return handleError("Invalid password.");
        }

        let stat, random_key;
        if (config.custom_link && req_keyPhrase != "") {
            let is_exist = await SHORT_URL.get(req_keyPhrase);
            if (is_exist != null) {
                return handleError("Custom shortURL existed.");
            } else {
                random_key = req_keyPhrase;
                stat, await SHORT_URL.put(req_keyPhrase, req_url, config.ttl);
            }
        } else if (config.unique_link) {
            let url_sha512 = await sha512(req_url);
            let url_key = await is_url_exist(url_sha512);
            if (url_key) {
                random_key = url_key;
            } else {
                stat, (random_key = await saveUrl(req_url));
                if (typeof stat == "undefined") {
                    console.log(await SHORT_URL.put(url_sha512, random_key, config.ttl));
                }
            }
        } else {
            stat, (random_key = await saveUrl(req_url));
        }
        console.log(stat);
        if (typeof stat == "undefined") {
            return new Response(`{"status":200, "key":"` + random_key + `", "error": ""}`, {
                headers: responseHeader,
            });
        } else {
            return handleError("Reach the KV write limitation.");
        }
    } else if (req_cmd == "del") {
        let req_keyPhrase = req["keyPhrase"];
        let req_password = req["password"];

        if (req_password != password_value) {
            return handleError("Invalid password.");
        }

        await SHORT_URL.delete(req_keyPhrase);
        return new Response(`{"status":200}`, {
            headers: responseHeader,
        });
    } else {
        return new Response(html404, {
            headers: {
                "content-type": "text/html;charset=UTF-8",
            },
            status: 404,
        });
    }
}

async function handleRequest(request: Request): Promise<Response> {
    if (request.method === "POST") {
        return await post(request);
    } else if (request.method === "OPTIONS") {
        return new Response(``, {
            headers: responseHeader,
        });
    } else if (request.method === "GET") {
        return await main(new URL(request.url));
    } else {
        // If request not in kv, return 404
        return new Response(html404, {
            headers: {
                "content-type": "text/html;charset=UTF-8",
            },
            status: 404,
        });
    }
}

addEventListener("fetch", async event => {
    event.respondWith(handleRequest(event.request));
});
