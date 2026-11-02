globalThis.__nitro_main__ = import.meta.url;
import { t as HookableCore } from "./_libs/hookable.mjs";
import { i as HTTPError, n as defineLazyEventHandler, t as H3Core } from "./_libs/h3+rou3+srvx.mjs";
import { t as FastResponse } from "./_libs/srvx.mjs";
// #nitro-vite-setup
function lazyService(loader) {
	let promise, mod;
	return { fetch(req) {
		if (mod) return mod.fetch(req);
		if (!promise) promise = loader().then((_mod) => mod = _mod.default || _mod);
		return promise.then((mod) => mod.fetch(req));
	} };
}
var services = { ["ssr"]: lazyService(() => import("./_ssr/ssr.mjs")) };
globalThis.__nitro_vite_envs__ = services;
// #nitro/virtual/public-assets-data
var public_assets_data_default = {
	"/admin.html": {
		"type": "text/html; charset=utf-8",
		"etag": "\"8fc-nNY9Mk3E95ku8l/bcBFNHSwUlnE\"",
		"mtime": "2026-11-01T13:22:56.000Z",
		"size": 2300,
		"path": "../public/admin.html"
	},
	"/favicon.ico": {
		"type": "image/vnd.microsoft.icon",
		"etag": "\"4f95-3RXc3p2mhEAs1WBwaIvE0Y0uu0Y\"",
		"mtime": "2026-07-17T09:31:53.000Z",
		"size": 20373,
		"path": "../public/favicon.ico"
	},
	"/curriculum.html": {
		"type": "text/html; charset=utf-8",
		"etag": "\"288f-0ts76ipHofEVnXpC4nKgzD5Dm/M\"",
		"mtime": "2026-11-01T13:20:25.000Z",
		"size": 10383,
		"path": "../public/curriculum.html"
	},
	"/faq.html": {
		"type": "text/html; charset=utf-8",
		"etag": "\"31a4-hTf5oUAXjOfL5Tz4Mk/f+3NZQEc\"",
		"mtime": "2026-11-01T13:20:25.000Z",
		"size": 12708,
		"path": "../public/faq.html"
	},
	"/config.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"338-+3IwPhhCI4cJ/prizOCf+TWDQSE\"",
		"mtime": "2026-10-31T20:07:45.000Z",
		"size": 824,
		"path": "../public/config.js"
	},
	"/features.html": {
		"type": "text/html; charset=utf-8",
		"etag": "\"2831-Hx7XY0q0wTZNKGue3hAc0nQUhHc\"",
		"mtime": "2026-11-01T13:20:25.000Z",
		"size": 10289,
		"path": "../public/features.html"
	},
	"/admin.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"7d0a-1+n9b9vMiUvHKuVtamUkFoX69Ro\"",
		"mtime": "2026-11-01T13:22:56.000Z",
		"size": 32010,
		"path": "../public/admin.js"
	},
	"/lessons.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"354f-+uHqvjehnOzoFP+TVth6L0FXPCs\"",
		"mtime": "2026-11-01T13:21:37.000Z",
		"size": 13647,
		"path": "../public/lessons.js"
	},
	"/login.html": {
		"type": "text/html; charset=utf-8",
		"etag": "\"1389-ggRDCXDLGSGNjrbxf4t1KsjpORk\"",
		"mtime": "2026-11-01T13:21:37.000Z",
		"size": 5001,
		"path": "../public/login.html"
	},
	"/lessons.html": {
		"type": "text/html; charset=utf-8",
		"etag": "\"6e6-giiJKcUYYYttIGGcH239yLuSIfk\"",
		"mtime": "2026-11-01T13:21:37.000Z",
		"size": 1766,
		"path": "../public/lessons.html"
	},
	"/platform.css": {
		"type": "text/css; charset=utf-8",
		"etag": "\"33cb-ab8qy5z57aLuQfXsGskQ9pyCqxY\"",
		"mtime": "2026-11-01T19:17:35.000Z",
		"size": 13259,
		"path": "../public/platform.css"
	},
	"/index.html": {
		"type": "text/html; charset=utf-8",
		"etag": "\"2f98-+32EFg0e2Sp/CcNLU/nyzvtsHNM\"",
		"mtime": "2026-11-01T13:20:25.000Z",
		"size": 12184,
		"path": "../public/index.html"
	},
	"/platform.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"3433-Rr9atW2kc1yiUYC5Wq9fXSJhbLY\"",
		"mtime": "2026-11-01T13:21:37.000Z",
		"size": 13363,
		"path": "../public/platform.js"
	},
	"/register.html": {
		"type": "text/html; charset=utf-8",
		"etag": "\"1d5f-K9IjTllLC1W8Ul8lA/rHsvTE1tU\"",
		"mtime": "2026-11-01T13:20:25.000Z",
		"size": 7519,
		"path": "../public/register.html"
	},
	"/notebooks.html": {
		"type": "text/html; charset=utf-8",
		"etag": "\"26e5-ercdgel+k2EGHmydE9a7mnDG2Ig\"",
		"mtime": "2026-11-01T13:20:25.000Z",
		"size": 9957,
		"path": "../public/notebooks.html"
	},
	"/site.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"a46-BzB7u3N/0CqFkNbr2wGeboocSQw\"",
		"mtime": "2026-11-01T13:20:21.000Z",
		"size": 2630,
		"path": "../public/site.js"
	},
	"/pricing.html": {
		"type": "text/html; charset=utf-8",
		"etag": "\"29e5-pmpODQPO08qke+M8Lhn2IFOjotc\"",
		"mtime": "2026-11-01T13:20:25.000Z",
		"size": 10725,
		"path": "../public/pricing.html"
	},
	"/style.css": {
		"type": "text/css; charset=utf-8",
		"etag": "\"8319-lGKmE6mtEoguDA3yuvG6LVW5CMA\"",
		"mtime": "2026-11-01T13:20:21.000Z",
		"size": 33561,
		"path": "../public/style.css"
	},
	"/assets/index-XMjrTol0.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"5a5a1-73nIBMKNpSphe95YxoeW5275WA8\"",
		"mtime": "2026-11-02T01:27:46.975Z",
		"size": 370081,
		"path": "../public/assets/index-XMjrTol0.js"
	},
	"/assets/logo.svg": {
		"type": "image/svg+xml",
		"etag": "\"693-Obq7VQKRLUqLtIWfZr7S7gbI1tY\"",
		"mtime": "2026-07-17T09:31:11.000Z",
		"size": 1683,
		"path": "../public/assets/logo.svg"
	},
	"/script.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"463c-8drq//mUE7z2atVfzyHDhPZHwNg\"",
		"mtime": "2026-07-19T12:34:57.093Z",
		"size": 17980,
		"path": "../public/script.js"
	},
	"/assets/mascot.webp": {
		"type": "image/webp",
		"etag": "\"23bb2-oOHWo4tbm+XpbCAznFeX1L+/LqQ\"",
		"mtime": "2026-11-01T13:19:10.000Z",
		"size": 146354,
		"path": "../public/assets/mascot.webp"
	},
	"/assets/mascot.png": {
		"type": "image/png",
		"etag": "\"91704-EHN5MtONHYJ9Y2tN8yJe6v24VNA\"",
		"mtime": "2026-07-17T09:31:18.000Z",
		"size": 595716,
		"path": "../public/assets/mascot.png"
	},
	"/assets/routes-R8V8g0LZ.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"167-2SoMFHIct6YxUj2xJxr5GJbjNIA\"",
		"mtime": "2026-11-02T01:27:46.976Z",
		"size": 359,
		"path": "../public/assets/routes-R8V8g0LZ.js"
	},
	"/assets/icons/ai.svg": {
		"type": "image/svg+xml",
		"etag": "\"2f8-4L8Z5bjndr3LV8LJZQKQUEXHTpA\"",
		"mtime": "2026-07-17T09:29:58.000Z",
		"size": 760,
		"path": "../public/assets/icons/ai.svg"
	},
	"/assets/styles-CQBEM3ma.css": {
		"type": "text/css; charset=utf-8",
		"etag": "\"11158-LXXSvStzCQqrfOQ8x4oLFYwbEpI\"",
		"mtime": "2026-11-02T01:27:46.976Z",
		"size": 69976,
		"path": "../public/assets/styles-CQBEM3ma.css"
	},
	"/assets/og-image.jpg": {
		"type": "image/jpeg",
		"etag": "\"1e26d-Q6LSQquniBvvm5owFDby6BGVDsY\"",
		"mtime": "2026-10-19T12:07:20.000Z",
		"size": 123501,
		"path": "../public/assets/og-image.jpg"
	},
	"/login.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"13ee-y/Qr0u8b8NYjC/vhpiA3EIkIMF0\"",
		"mtime": "2026-11-01T13:21:37.000Z",
		"size": 5102,
		"path": "../public/login.js"
	},
	"/assets/icons/phone.svg": {
		"type": "image/svg+xml",
		"etag": "\"1e5-wvzy4c6ug+Qa3Hi2WUxVgZ2TMKY\"",
		"mtime": "2026-07-17T09:30:14.000Z",
		"size": 485,
		"path": "../public/assets/icons/phone.svg"
	},
	"/assets/icons/check.svg": {
		"type": "image/svg+xml",
		"etag": "\"1ef-4SLwyMBBdkjGp6W0Z7ptNdvvDFg\"",
		"mtime": "2026-07-17T09:30:03.000Z",
		"size": 495,
		"path": "../public/assets/icons/check.svg"
	},
	"/assets/icons/robot.svg": {
		"type": "image/svg+xml",
		"etag": "\"32a-wDpXN43kAcKnuS+dlopdaGReBcA\"",
		"mtime": "2026-07-17T09:30:22.000Z",
		"size": 810,
		"path": "../public/assets/icons/robot.svg"
	},
	"/assets/icons/python.svg": {
		"type": "image/svg+xml",
		"etag": "\"2e1-kLZAc20C5t4j9osnhhJPIu9uF90\"",
		"mtime": "2026-07-17T09:30:18.000Z",
		"size": 737,
		"path": "../public/assets/icons/python.svg"
	},
	"/register.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"3ecf-+bRU4yBbVgZ4GOqlK5W8lqrzcz4\"",
		"mtime": "2026-11-01T13:21:19.000Z",
		"size": 16079,
		"path": "../public/register.js"
	},
	"/assets/icons/whatsapp.svg": {
		"type": "image/svg+xml",
		"etag": "\"211-lr2eYnpo8jkYsTIZP5RsO2GxnjA\"",
		"mtime": "2026-07-17T09:30:35.000Z",
		"size": 529,
		"path": "../public/assets/icons/whatsapp.svg"
	},
	"/assets/notebooks/explain-cover.webp": {
		"type": "image/webp",
		"etag": "\"114f2-0KDPo/WPjI3JD0zVT0Wxdt2kIaU\"",
		"mtime": "2026-10-18T19:25:38.000Z",
		"size": 70898,
		"path": "../public/assets/notebooks/explain-cover.webp"
	},
	"/assets/icons/student.svg": {
		"type": "image/svg+xml",
		"etag": "\"265-Lw4z/fq2pD0yyHYBby+aclOpE4A\"",
		"mtime": "2026-07-17T09:30:26.000Z",
		"size": 613,
		"path": "../public/assets/icons/student.svg"
	},
	"/assets/icons/graduation.svg": {
		"type": "image/svg+xml",
		"etag": "\"294-7VAzHOXZz39+K1wlHN5Id+akRNA\"",
		"mtime": "2026-07-17T09:30:08.000Z",
		"size": 660,
		"path": "../public/assets/icons/graduation.svg"
	},
	"/assets/notebooks/practice-cover.webp": {
		"type": "image/webp",
		"etag": "\"13c08-SaV6VvLKmdbmb5sl6TEHYh3zm38\"",
		"mtime": "2026-10-18T19:25:39.000Z",
		"size": 80904,
		"path": "../public/assets/notebooks/practice-cover.webp"
	}
};
// #nitro/virtual/public-assets
var publicAssetBases = {};
function isPublicAssetURL(id = "") {
	if (public_assets_data_default[id]) return true;
	for (const base in publicAssetBases) if (id.startsWith(base)) return true;
	return false;
}
// node_modules/nitro/dist/runtime/internal/route-rules.mjs
var headers = ((m) => function headersRouteRule(event) {
	for (const [key, value] of Object.entries(m.options || {})) event.res.headers.set(key, value);
});
// #nitro/virtual/routing
var findRouteRules = /* @__PURE__ */ (() => {
	const $0 = [{
		name: "headers",
		route: "/assets/**",
		handler: headers,
		options: { "cache-control": "public, max-age=31536000, immutable" }
	}];
	return (m, p) => {
		let r = [];
		if (p.charCodeAt(p.length - 1) === 47) p = p.slice(0, -1) || "/";
		let s = p.split("/");
		if (s.length > 1) {
			if (s[1] === "assets") r.unshift({
				data: $0,
				params: { "_": s.slice(2).join("/") }
			});
		}
		return r;
	};
})();
var _lazy_3N_OQd = defineLazyEventHandler(() => import("./_chunks/ssr-renderer.mjs"));
var findRoute = /* @__PURE__ */ (() => {
	const data = {
		route: "/**",
		handler: _lazy_3N_OQd
	};
	return ((_m, p) => {
		return {
			data,
			params: { "_": p.slice(1) }
		};
	});
})();
[].filter(Boolean);
// node_modules/nitro/dist/runtime/internal/error/prod.mjs
var errorHandler = (error, event) => {
	const res = defaultHandler(error, event);
	return new FastResponse(typeof res.body === "string" ? res.body : JSON.stringify(res.body, null, 2), res);
};
function defaultHandler(error, event) {
	const unhandled = error.unhandled ?? !HTTPError.isError(error);
	const { status = 500, statusText = "" } = unhandled ? {} : error;
	if (status === 404) {
		const url = event.url || new URL(event.req.url);
		const baseURL = "/";
		if (/^\/[^/]/.test(baseURL) && !url.pathname.startsWith(baseURL)) return {
			status: 302,
			headers: new Headers({ location: `${baseURL}${url.pathname.slice(1)}${url.search}` })
		};
	}
	const headers = new Headers(unhandled ? {} : error.headers);
	headers.set("content-type", "application/json; charset=utf-8");
	return {
		status,
		statusText,
		headers,
		body: {
			error: true,
			...unhandled ? {
				status,
				unhandled: true
			} : typeof error.toJSON === "function" ? error.toJSON() : {
				status,
				statusText,
				message: error.message
			}
		}
	};
}
// #nitro/virtual/error-handler
var errorHandlers = [errorHandler];
async function error_handler_default(error, event) {
	for (const handler of errorHandlers) try {
		const response = await handler(error, event, { defaultHandler });
		if (response) return response;
	} catch (error) {
		console.error(error);
	}
}
// #nitro/virtual/app
function createNitroApp() {
	const captureError = (error, errorCtx) => {
		if (errorCtx?.event) {
			const errors = errorCtx.event.req.context?.nitro?.errors;
			if (errors) errors.push({
				error,
				context: errorCtx
			});
		}
	};
	const h3App = createH3App({ onError(error, event) {
		return error_handler_default(error, event);
	} });
	let appHandler = (req) => {
		req.context ||= {};
		req.context.nitro = req.context.nitro || { errors: [] };
		return h3App.fetch(req);
	};
	return {
		fetch: appHandler,
		h3: h3App,
		hooks: void 0,
		captureError
	};
}
function createH3App(config) {
	const h3App = new H3Core(config);
	h3App["~findRoute"] = (event) => findRoute(event.req.method, event.url.pathname);
	h3App["~getMiddleware"] = (event, route) => {
		const pathname = event.url.pathname;
		const method = event.req.method;
		const middleware = [];
		const routeRules = getRouteRules(method, pathname);
		event.context.routeRules = routeRules?.routeRules;
		if (routeRules?.routeRuleMiddleware.length) middleware.push(...routeRules.routeRuleMiddleware);
		if (route?.data?.middleware?.length) middleware.push(...route.data.middleware);
		return middleware;
	};
	return h3App;
}
// node_modules/nitro/dist/runtime/internal/app.mjs
var APP_ID = "default";
function useNitroApp() {
	let instance = useNitroApp._instance;
	if (instance) return instance;
	instance = useNitroApp._instance = createNitroApp();
	globalThis.__nitro__ = globalThis.__nitro__ || {};
	globalThis.__nitro__[APP_ID] = instance;
	return instance;
}
function useNitroHooks() {
	const nitroApp = useNitroApp();
	const hooks = nitroApp.hooks;
	if (hooks) return hooks;
	return nitroApp.hooks = new HookableCore();
}
function getRouteRules(method, pathname) {
	const m = findRouteRules(method, pathname);
	if (!m?.length) return { routeRuleMiddleware: [] };
	const routeRules = {};
	for (const layer of m) for (const rule of layer.data) {
		const currentRule = routeRules[rule.name];
		if (currentRule) {
			if (rule.options === false) {
				delete routeRules[rule.name];
				continue;
			}
			if (typeof currentRule.options === "object" && typeof rule.options === "object") currentRule.options = {
				...currentRule.options,
				...rule.options
			};
			else currentRule.options = rule.options;
			currentRule.route = rule.route;
			currentRule.params = {
				...currentRule.params,
				...layer.params
			};
		} else if (rule.options !== false) routeRules[rule.name] = {
			...rule,
			params: layer.params
		};
	}
	const middleware = [];
	const orderedRules = Object.values(routeRules).sort((a, b) => (a.handler?.order || 0) - (b.handler?.order || 0));
	for (const rule of orderedRules) {
		if (rule.options === false || !rule.handler) continue;
		middleware.push(rule.handler(rule));
	}
	return {
		routeRules,
		routeRuleMiddleware: middleware
	};
}
// node_modules/nitro/dist/presets/cloudflare/runtime/_module-handler.mjs
function createHandler(hooks) {
	const nitroApp = useNitroApp();
	const nitroHooks = useNitroHooks();
	return {
		async fetch(request, env, context) {
			globalThis.__env__ = env;
			augmentReq(request, {
				env,
				context
			});
			const ctxExt = {};
			const url = new URL(request.url);
			if (hooks.fetch) {
				const res = await hooks.fetch(request, env, context, url, ctxExt);
				if (res) return res;
			}
			return await nitroApp.fetch(request);
		},
		scheduled(controller, env, context) {
			globalThis.__env__ = env;
			context.waitUntil(nitroHooks.callHook("cloudflare:scheduled", {
				controller,
				env,
				context
			}) || Promise.resolve());
		},
		email(message, env, context) {
			globalThis.__env__ = env;
			context.waitUntil(nitroHooks.callHook("cloudflare:email", {
				message,
				event: message,
				env,
				context
			}) || Promise.resolve());
		},
		queue(batch, env, context) {
			globalThis.__env__ = env;
			context.waitUntil(nitroHooks.callHook("cloudflare:queue", {
				batch,
				event: batch,
				env,
				context
			}) || Promise.resolve());
		},
		tail(traces, env, context) {
			globalThis.__env__ = env;
			context.waitUntil(nitroHooks.callHook("cloudflare:tail", {
				traces,
				env,
				context
			}) || Promise.resolve());
		},
		trace(traces, env, context) {
			globalThis.__env__ = env;
			context.waitUntil(nitroHooks.callHook("cloudflare:trace", {
				traces,
				env,
				context
			}) || Promise.resolve());
		}
	};
}
function augmentReq(cfReq, ctx) {
	const req = cfReq;
	req.ip = cfReq.headers.get("cf-connecting-ip") || void 0;
	req.runtime ??= { name: "cloudflare" };
	req.runtime.cloudflare = {
		...req.runtime.cloudflare,
		...ctx
	};
	req.waitUntil = ctx.context?.waitUntil.bind(ctx.context);
}
// node_modules/nitro/dist/presets/cloudflare/runtime/cloudflare-module.mjs
var cloudflare_module_default = createHandler({ fetch(cfRequest, env, context, url) {
	if (env.ASSETS && isPublicAssetURL(url.pathname)) return env.ASSETS.fetch(cfRequest);
} });
export { cloudflare_module_default as default };
