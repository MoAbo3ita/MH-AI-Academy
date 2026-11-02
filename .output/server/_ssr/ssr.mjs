// node_modules/.nitro/vite/services/ssr/index.js
var lastCapturedError;
var TTL_MS = 5e3;
function record(error) {
	lastCapturedError = {
		error,
		at: Date.now()
	};
}
if (typeof globalThis.addEventListener === "function") {
	globalThis.addEventListener("error", (event) => record(event.error ?? event));
	globalThis.addEventListener("unhandledrejection", (event) => record(event.reason));
}
function consumeLastCapturedError() {
	if (!lastCapturedError) return void 0;
	if (Date.now() - lastCapturedError.at > TTL_MS) {
		lastCapturedError = void 0;
		return;
	}
	const { error } = lastCapturedError;
	lastCapturedError = void 0;
	return error;
}
function renderErrorPage() {
	return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <title>This page didn't load</title>
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <style>
      body { font: 15px/1.5 system-ui, -apple-system, sans-serif; background: #fafafa; color: #111; display: grid; place-items: center; min-height: 100vh; margin: 0; padding: 1.5rem; }
      .card { max-width: 28rem; width: 100%; text-align: center; padding: 2rem; }
      h1 { font-size: 1.25rem; margin: 0 0 0.5rem; }
      p { color: #4b5563; margin: 0 0 1.5rem; }
      .actions { display: flex; gap: 0.5rem; justify-content: center; flex-wrap: wrap; }
      a, button { padding: 0.5rem 1rem; border-radius: 0.375rem; font: inherit; cursor: pointer; text-decoration: none; border: 1px solid transparent; }
      .primary { background: #111; color: #fff; }
      .secondary { background: #fff; color: #111; border-color: #d1d5db; }
    </style>
  </head>
  <body>
    <div class="card">
      <h1>This page didn't load</h1>
      <p>Something went wrong on our end. You can try refreshing or head back home.</p>
      <div class="actions">
        <button class="primary" onclick="location.reload()">Try again</button>
        <a class="secondary" href="/">Go home</a>
      </div>
    </div>
  </body>
</html>`;
}
var public_default = "<!DOCTYPE html>\n<html lang=\"ar\" dir=\"rtl\">\n<head>\n  <meta charset=\"UTF-8\">\n  <meta name=\"viewport\" content=\"width=device-width, initial-scale=1, viewport-fit=cover\">\n  <meta name=\"theme-color\" content=\"#0B1220\">\n  <meta name=\"color-scheme\" content=\"dark\">\n  <title>MH AI Academy | ابدأ رحلتك في البرمجة والذكاء الاصطناعي</title>\n  <meta name=\"description\" content=\"MH AI Academy — منصة Mohamed Hany التعليمية لتعليم البرمجة والذكاء الاصطناعي لطلاب الصف الأول والثاني الثانوي (نظام البكالوريا). شرح مبسّط ومتابعة مستمرة ومشروعات عملية.\">\n  <meta name=\"author\" content=\"Mohamed Hany\">\n  <meta name=\"robots\" content=\"index, follow\">\n  <link rel=\"canonical\" href=\"https://mhaiacademy.com/\">\n  <meta property=\"og:type\" content=\"website\">\n  <meta property=\"og:locale\" content=\"ar_AR\">\n  <meta property=\"og:site_name\" content=\"MH AI Academy\">\n  <meta property=\"og:title\" content=\"MH AI Academy | ابدأ رحلتك في البرمجة والذكاء الاصطناعي\">\n  <meta property=\"og:description\" content=\"MH AI Academy — منصة Mohamed Hany التعليمية لتعليم البرمجة والذكاء الاصطناعي لطلاب الصف الأول والثاني الثانوي (نظام البكالوريا). شرح مبسّط ومتابعة مستمرة ومشروعات عملية.\">\n  <meta property=\"og:url\" content=\"https://mhaiacademy.com/\">\n  <meta property=\"og:image\" content=\"https://mhaiacademy.com/assets/og-image.jpg\">\n  <meta property=\"og:image:width\" content=\"1200\">\n  <meta property=\"og:image:height\" content=\"630\">\n  <meta name=\"twitter:card\" content=\"summary_large_image\">\n  <meta name=\"twitter:title\" content=\"MH AI Academy | ابدأ رحلتك في البرمجة والذكاء الاصطناعي\">\n  <meta name=\"twitter:description\" content=\"MH AI Academy — منصة Mohamed Hany التعليمية لتعليم البرمجة والذكاء الاصطناعي لطلاب الصف الأول والثاني الثانوي (نظام البكالوريا). شرح مبسّط ومتابعة مستمرة ومشروعات عملية.\">\n  <meta name=\"twitter:image\" content=\"https://mhaiacademy.com/assets/og-image.jpg\">\n  <link rel=\"icon\" type=\"image/svg+xml\" href=\"assets/logo.svg\">\n  <link rel=\"apple-touch-icon\" href=\"assets/mascot.png\">\n  <link rel=\"preconnect\" href=\"https://fonts.googleapis.com\">\n  <link rel=\"preconnect\" href=\"https://fonts.gstatic.com\" crossorigin>\n  <link href=\"https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;800;900&display=swap\" rel=\"stylesheet\">\n  <link rel=\"preload\" as=\"image\" href=\"assets/mascot.webp\" type=\"image/webp\" fetchpriority=\"high\">\n  <link rel=\"stylesheet\" href=\"style.css\">\n  \n  <script type=\"application/ld+json\">\n  {\n    \"@context\": \"https://schema.org\",\n    \"@type\": \"EducationalOrganization\",\n    \"name\": \"MH AI Academy\",\n    \"url\": \"https://mhaiacademy.com/\",\n    \"logo\": \"https://mhaiacademy.com/assets/logo.svg\",\n    \"description\": \"منصة تعليمية متخصصة في تعليم البرمجة والذكاء الاصطناعي لطلاب الصف الأول والثاني الثانوي — نظام البكالوريا.\",\n    \"founder\": {\n      \"@type\": \"Person\",\n      \"name\": \"Mohamed Hany\"\n    },\n    \"contactPoint\": {\n      \"@type\": \"ContactPoint\",\n      \"telephone\": \"+201559160083\",\n      \"contactType\": \"customer service\",\n      \"availableLanguage\": [\"Arabic\"]\n    }\n  }\n  <\/script>\n  <noscript><style>.reveal{opacity:1!important;transform:none!important}</style></noscript>\n</head>\n<body>\n  <a class=\"skip-link\" href=\"#main\">تخطَّ إلى المحتوى الرئيسي</a>\n  <div class=\"bg\" aria-hidden=\"true\">\n    <div class=\"bg-gradient\"></div><div class=\"orb orb-1\"></div><div class=\"orb orb-2\"></div><div class=\"orb orb-3\"></div>\n    <div class=\"particles\"><span></span><span></span><span></span><span></span><span></span><span></span><span></span><span></span><span></span><span></span><span></span><span></span></div>\n  </div>\n  <header class=\"site-header\" id=\"siteHeader\">\n    <nav class=\"nav container\" aria-label=\"التنقل الرئيسي\">\n      <a href=\"index.html\" class=\"nav-logo\" aria-label=\"MH AI Academy — الرئيسية\"><img src=\"assets/logo.svg\" alt=\"MH AI Academy\" width=\"180\" height=\"44\"></a>\n      <button class=\"nav-toggle\" id=\"navToggle\" type=\"button\" aria-label=\"فتح القائمة\" aria-expanded=\"false\" aria-controls=\"navLinks\"><span></span><span></span><span></span></button>\n      <ul class=\"nav-links\" id=\"navLinks\">\n        <li><a href=\"index.html\" class=\"nav-link active\" aria-current=\"page\">الرئيسية</a></li>\n        <li><a href=\"features.html\" class=\"nav-link\">المميزات</a></li>\n        <li><a href=\"curriculum.html\" class=\"nav-link\">المنهج</a></li>\n        <li><a href=\"notebooks.html\" class=\"nav-link\">المذكرات</a></li>\n        <li><a href=\"pricing.html\" class=\"nav-link\">الأسعار</a></li>\n        <li><a href=\"faq.html\" class=\"nav-link\">الأسئلة</a></li>\n        <li><a href=\"register.html\" class=\"nav-link\">التسجيل</a></li>\n        <li><a href=\"lessons.html\" class=\"nav-link\">الحصص</a></li>\n      </ul>\n    </nav>\n  </header>\n  <main id=\"main\" class=\"page-main page-home\">\n<section id=\"home\" class=\"hero\" aria-labelledby=\"heroTitle\">\n      <div class=\"container hero-grid\">\n        <div class=\"hero-content reveal\">\n          <span class=\"hero-badge\"><span class=\"dot\"></span> منصة البرمجة والذكاء الاصطناعي للثانوية العامة</span>\n          <h1 class=\"hero-title\" id=\"heroTitle\">\n            ابدأ رحلتك في البرمجة <span class=\"gradient-text\">والذكاء الاصطناعي</span>\n          </h1>\n          <p class=\"hero-subtitle\">\n            لطلاب الصف الأول والثاني الثانوي<br>\n            نظام البكالوريا\n          </p>\n          <div class=\"hero-actions\">\n            <a href=\"register.html\" class=\"btn btn-primary btn-glow\">سجل الآن</a>\n            <a href=\"https://wa.me/201555109204\" target=\"_blank\" rel=\"noopener noreferrer\" class=\"btn btn-whatsapp btn-glow\">\n              <img src=\"assets/icons/whatsapp.svg\" alt=\"\" width=\"22\" height=\"22\">\n              تواصل عبر واتساب\n            </a>\n          </div>\n        </div>\n\n        <div class=\"hero-visual reveal\">\n          <div class=\"mascot-wrap\">\n            <span class=\"mascot-glow\" aria-hidden=\"true\"></span>\n            \n            <picture><source srcset=\"assets/mascot.webp\" type=\"image/webp\"><img src=\"assets/mascot.png\" alt=\"MH AI Academy Mascot — مطور شاب يحمل لابتوب هولوجرامي يعرض أكواد بايثون\" class=\"mascot\" width=\"815\" height=\"951\" fetchpriority=\"high\" decoding=\"async\"></picture>\n            <span class=\"chip chip-1\" aria-hidden=\"true\"><img src=\"assets/icons/python.svg\" alt=\"\" width=\"32\" height=\"32\"></span>\n            <span class=\"chip chip-2\" aria-hidden=\"true\"><img src=\"assets/icons/ai.svg\" alt=\"\" width=\"30\" height=\"30\"></span>\n            <span class=\"chip chip-3\" aria-hidden=\"true\"><img src=\"assets/icons/robot.svg\" alt=\"\" width=\"28\" height=\"28\"></span>\n          </div>\n        </div>\n      </div>\n    </section>\n    <section id=\"explore\" class=\"section\" aria-labelledby=\"exploreTitle\">\n      <div class=\"container\">\n        <div class=\"section-head reveal\">\n          <h2 class=\"section-title\" id=\"exploreTitle\">اكتشف <span class=\"gradient-text\">المنصة</span></h2>\n          <p class=\"section-desc\">كل قسم في صفحة مستقلة عشان توصل للي محتاجه بسرعة.</p>\n        </div>\n        <div class=\"explore-grid\">\n          <a class=\"explore-card glass-card reveal\" href=\"features.html\"><span class=\"explore-ico\" aria-hidden=\"true\">✨</span><h3>المميزات</h3><p>ليه تختار MH AI Academy؟</p></a>\n          <a class=\"explore-card glass-card reveal\" href=\"curriculum.html\"><span class=\"explore-ico\" aria-hidden=\"true\">🧭</span><h3>المنهج</h3><p>إيه اللي هتتعلمه في كل صف</p></a>\n          <a class=\"explore-card glass-card reveal\" href=\"notebooks.html\"><span class=\"explore-ico\" aria-hidden=\"true\">📘</span><h3>المذكرات</h3><p>مذكرة الشرح ومذكرة التدريبات</p></a>\n          <a class=\"explore-card glass-card reveal\" href=\"pricing.html\"><span class=\"explore-ico\" aria-hidden=\"true\">💳</span><h3>الأسعار والمواعيد</h3><p>أسعار المجموعات وطريقة الحصص</p></a>\n          <a class=\"explore-card glass-card reveal\" href=\"faq.html\"><span class=\"explore-ico\" aria-hidden=\"true\">❓</span><h3>الأسئلة الشائعة</h3><p>إجابات على أكتر الأسئلة</p></a>\n          <a class=\"explore-card glass-card reveal\" href=\"lessons.html\"><span class=\"explore-ico\" aria-hidden=\"true\">🎬</span><h3>الحصص المسجلة</h3><p>شاهد الحصص وحمّل الملفات</p></a>\n        </div>\n      </div>\n    </section>\n  </main>\n\n  <footer class=\"site-footer\">\n    <div class=\"container footer-grid\">\n      <div class=\"footer-brand\">\n        <img src=\"assets/logo.svg\" alt=\"MH AI Academy\" width=\"180\" height=\"44\" loading=\"lazy\">\n        <p>منصة تعليمية متخصصة في البرمجة والذكاء الاصطناعي لطلاب الثانوية العامة — نظام البكالوريا.</p>\n      </div>\n      <div class=\"footer-links\" aria-labelledby=\"footerQuickLinksTitle\">\n        <h4 id=\"footerQuickLinksTitle\" style=\"color: var(--text-primary); margin-bottom: 12px; font-weight: 700;\">روابط سريعة</h4>\n        <ul style=\"list-style: none; padding: 0; margin: 0; display: flex; flex-direction: column; gap: 8px;\"><li><a href=\"index.html\" class=\"footer-link\" style=\"justify-content: flex-start;\">الرئيسية</a></li><li><a href=\"features.html\" class=\"footer-link\" style=\"justify-content: flex-start;\">المميزات</a></li><li><a href=\"curriculum.html\" class=\"footer-link\" style=\"justify-content: flex-start;\">المنهج</a></li><li><a href=\"notebooks.html\" class=\"footer-link\" style=\"justify-content: flex-start;\">المذكرات</a></li><li><a href=\"pricing.html\" class=\"footer-link\" style=\"justify-content: flex-start;\">الأسعار والمواعيد</a></li><li><a href=\"faq.html\" class=\"footer-link\" style=\"justify-content: flex-start;\">الأسئلة الشائعة</a></li><li><a href=\"register.html\" class=\"footer-link\" style=\"justify-content: flex-start;\">التسجيل</a></li><li><a href=\"lessons.html\" class=\"footer-link\" style=\"justify-content: flex-start;\">الحصص المسجلة</a></li><li><a href=\"login.html\" class=\"footer-link\" style=\"justify-content: flex-start;\">تسجيل الدخول</a></li></ul>\n      </div>\n      <div class=\"footer-contact\">\n        <a href=\"tel:+201559160083\" class=\"footer-link\"><img src=\"assets/icons/phone.svg\" alt=\"\" width=\"20\" height=\"20\" loading=\"lazy\"><span class=\"num\">01559160083</span></a>\n        <a href=\"https://wa.me/201555109204\" target=\"_blank\" rel=\"noopener noreferrer\" class=\"footer-link\"><img src=\"assets/icons/whatsapp.svg\" alt=\"\" width=\"20\" height=\"20\" loading=\"lazy\"><span class=\"num\">01555109204</span></a>\n      </div>\n    </div>\n    <div class=\"container footer-bottom\"><p>© 2026 <span class=\"brand\">Mohamed Hany</span>. All Rights Reserved.</p></div>\n  </footer>\n\n  <a href=\"https://wa.me/201555109204\" target=\"_blank\" rel=\"noopener noreferrer\" class=\"whatsapp-float\" aria-label=\"تواصل عبر واتساب\">\n    <img src=\"assets/icons/whatsapp.svg\" alt=\"\" width=\"30\" height=\"30\"><span class=\"float-tooltip\" role=\"tooltip\">تواصل عبر واتساب</span>\n  </a>\n  <button type=\"button\" class=\"back-to-top\" id=\"backToTop\" aria-label=\"العودة إلى الأعلى\">\n    <svg viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2.4\" stroke-linecap=\"round\" stroke-linejoin=\"round\" aria-hidden=\"true\"><path d=\"M12 19V5\"/><path d=\"m5 12 7-7 7 7\"/></svg>\n  </button>\n  <script src=\"site.js\" defer><\/script>\n</body>\n</html>\n";
var serverEntryPromise;
async function getServerEntry() {
	if (!serverEntryPromise) serverEntryPromise = import("./server-C0jc3rEK.mjs").then((n) => n.t).then((m) => m.default ?? m);
	return serverEntryPromise;
}
async function normalizeCatastrophicSsrResponse(response) {
	if (response.status < 500) return response;
	if (!(response.headers.get("content-type") ?? "").includes("application/json")) return response;
	const body = await response.clone().text();
	if (!isH3SwallowedErrorBody(body)) return response;
	console.error(consumeLastCapturedError() ?? /* @__PURE__ */ new Error(`h3 swallowed SSR error: ${body}`));
	return new Response(renderErrorPage(), {
		status: 500,
		headers: { "content-type": "text/html; charset=utf-8" }
	});
}
function isH3SwallowedErrorBody(body) {
	try {
		const payload = JSON.parse(body);
		return payload.unhandled === true && payload.message === "HTTPError";
	} catch {
		return false;
	}
}
var server_default = { async fetch(request, env, ctx) {
	try {
		const url = new URL(request.url);
		if (request.method === "GET" && (url.pathname === "/" || url.pathname === "/index.html")) return new Response(public_default, {
			status: 200,
			headers: {
				"content-type": "text/html; charset=utf-8",
				"cache-control": "public, max-age=0, must-revalidate"
			}
		});
		return await normalizeCatastrophicSsrResponse(await (await getServerEntry()).fetch(request, env, ctx));
	} catch (error) {
		console.error(error);
		return new Response(renderErrorPage(), {
			status: 500,
			headers: { "content-type": "text/html; charset=utf-8" }
		});
	}
} };
export { server_default as default, renderErrorPage as t };
