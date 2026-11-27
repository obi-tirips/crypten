/*
 * What the page does beyond HTML: the drawn sky, the theme switch, the menu, the tabs (the downloads, the wallets, the
 * contact topics' email templates), the donation QR codes, copying, and the small motions. The page is complete without it: every word, address and link is in the HTML.
 * Motion runs only while the system does not ask for less and the page is on screen (README.md, "Look and feel").
 */
(function () {
    "use strict";

    const root = document.documentElement;
    const motion = window.matchMedia("(prefers-reduced-motion: no-preference)");
    const lightSystem = window.matchMedia("(prefers-color-scheme: light)");
    const finePointer = window.matchMedia("(hover: hover) and (pointer: fine)");
    const $ = (selector, scope = document) => scope.querySelector(selector);
    const $$ = (selector, scope = document) => Array.from(scope.querySelectorAll(selector));
    const THEME_KEY = "crypten-theme";

    /* ---- A short message at the foot of the window, read out by screen readers ---- */

    const toast = $("[data-toast]");
    let toastTimer = 0;

    function say(message) {
        if (!toast) {
            return;
        }
        toast.textContent = message;
        toast.classList.add("is-shown");
        clearTimeout(toastTimer);
        toastTimer = setTimeout(() => toast.classList.remove("is-shown"), 2800);
    }

    /* ---- The sky: the app's Backdrop, drawn for a window of any size ---- */

    const sky = (function () {
        const base = $(".sky-base");
        const stars = $(".sky-stars");
        if (!base || !stars || !base.getContext) {
            return {redraw() {}, start() {}};
        }
        const paint = base.getContext("2d");
        const twinkle = stars.getContext("2d");
        let width = 0;
        let height = 0;
        let ratio = 1;
        let field = [];
        let planet = {x: 0, y: 0, r: 0};
        let frame = 0;
        let meteor = null;
        let nextMeteor = performance.now() + 3000 + Math.random() * 4000;

        function resize() {
            ratio = Math.min(window.devicePixelRatio || 1, 2);
            width = base.clientWidth;
            height = base.clientHeight;
            for (const canvas of [base, stars]) {
                canvas.width = Math.round(width * ratio);
                canvas.height = Math.round(height * ratio);
            }
            if (field.length === 0) {
                // Places as fractions of the sky, so a resize keeps every star where it was.
                const count = Math.round(Math.min(220, Math.max(70, width * height / 9000)));
                field = Array.from({length: count}, (unused, i) => ({
                    x: Math.random(),
                    y: Math.random(),
                    r: 0.45 + Math.random() * Math.random() * 1.35,
                    a: 0.35 + Math.random() * 0.65,
                    twinkles: i % 5 === 0,
                    phase: Math.random() * Math.PI * 2,
                    speed: 0.6 + Math.random() * 1.4
                }));
            }
            if (width >= height) {
                // As in the app: a planet far larger than the window, centred beyond its lower right corner.
                planet = {x: width * 1.04, y: height * 1.3, r: height * 1.08 + width * 0.1};
            } else {
                // An upright screen: the rim enters on the right above the middle and leaves at the lower left.
                const ax = width;
                const ay = height * 0.42;
                const bx = 0;
                const by = height * 0.92;
                const r = height * 1.5;
                const chord = Math.hypot(bx - ax, by - ay);
                const away = Math.sqrt(Math.max(r * r - chord * chord / 4, 0));
                planet = {
                    x: (ax + bx) / 2 + (by - ay) / chord * away,
                    y: (ay + by) / 2 + (ax - bx) / chord * away,
                    r
                };
            }
        }

        function light() {
            return root.dataset.theme === "light";
        }

        function drawBase() {
            const c = paint;
            const isLight = light();
            c.setTransform(ratio, 0, 0, ratio, 0, 0);
            const wash = c.createLinearGradient(0, 0, width, height);
            const stops = isLight ? [[0, "#f7faff"], [0.55, "#ecf2fd"], [1, "#e3ecfb"]]
                : [[0, "#050a17"], [0.48, "#08122a"], [1, "#060d1f"]];
            stops.forEach(([at, colour]) => wash.addColorStop(at, colour));
            c.fillStyle = wash;
            c.fillRect(0, 0, width, height);

            const glows = isLight
                ? [[0.82, 0.1, 0.48, "77, 163, 255", 0.2], [0.06, 0.96, 0.42, "124, 92, 255", 0.1]]
                : [[0.82, 0.08, 0.52, "47, 123, 255", 0.3], [0.04, 0.96, 0.44, "30, 110, 255", 0.22],
                    [0.45, 0.45, 0.62, "90, 60, 200", 0.08]];
            for (const [fx, fy, fr, rgb, alpha] of glows) {
                c.save();
                c.translate(fx * width, fy * height);
                c.scale(fr * width, fr * height);
                const glow = c.createRadialGradient(0, 0, 0, 0, 0, 1);
                glow.addColorStop(0, "rgba(" + rgb + ", " + alpha + ")");
                glow.addColorStop(1, "rgba(" + rgb + ", 0)");
                c.fillStyle = glow;
                c.beginPath();
                c.arc(0, 0, 1, 0, Math.PI * 2);
                c.fill();
                c.restore();
            }

            const {x, y, r} = planet;
            const body = c.createRadialGradient(x, y, 0, x, y, r);
            const bodyStops = isLight ? [[0.92, "#eef4ff"], [1, "#dce8fc"]]
                : [[0.86, "#03070f"], [0.97, "#081631"], [1, "#10306c"]];
            bodyStops.forEach(([at, colour]) => body.addColorStop(at, colour));
            c.fillStyle = body;
            c.beginPath();
            c.arc(x, y, r, 0, Math.PI * 2);
            c.fill();

            // The rim glows brightest at the planet's top and fades as it sweeps down to the left.
            const rims = isLight
                ? [[70, "70, 130, 240", 0.07], [26, "70, 130, 240", 0.11], [7, "70, 140, 245", 0.24],
                    [1.4, "60, 130, 240", 0.6]]
                : [[70, "70, 140, 255", 0.1], [26, "80, 150, 255", 0.16], [7, "90, 170, 255", 0.38],
                    [1.4, "165, 218, 255", 0.95]];
            for (const [lineWidth, rgb, alpha] of rims) {
                const fade = c.createLinearGradient(x, y - r, x - r, y - 0.1 * r);
                fade.addColorStop(0, "rgba(" + rgb + ", " + alpha + ")");
                fade.addColorStop(1, "rgba(" + rgb + ", 0)");
                c.strokeStyle = fade;
                c.lineWidth = lineWidth;
                c.beginPath();
                c.arc(x, y, r, 0, Math.PI * 2);
                c.stroke();
            }
        }

        function drawStars(time) {
            const c = twinkle;
            const isLight = light();
            const moving = time !== null;
            c.setTransform(ratio, 0, 0, ratio, 0, 0);
            c.clearRect(0, 0, width, height);
            c.fillStyle = isLight ? "rgb(91, 143, 232)" : "rgb(220, 232, 255)";
            const strength = isLight ? 0.22 : 1;
            // A slow drift as the page scrolls, for depth.
            const drift = moving ? window.scrollY * 0.03 % height : 0;
            for (const star of field) {
                const sx = star.x * width;
                let sy = star.y * height - drift;
                if (sy < 0) {
                    sy += height;
                }
                if (Math.hypot(sx - planet.x, sy - planet.y) < planet.r) {
                    continue;
                }
                let alpha = star.a * strength;
                if (star.twinkles && moving) {
                    alpha *= 0.55 + 0.45 * Math.sin(time / 1000 * star.speed + star.phase);
                }
                c.globalAlpha = alpha;
                c.beginPath();
                c.arc(sx, sy, star.r, 0, Math.PI * 2);
                c.fill();
            }
            c.globalAlpha = 1;
            if (meteor && moving) {
                drawMeteor(c, time);
            }
        }

        function drawMeteor(c, time) {
            const t = (time - meteor.start) / meteor.duration;
            if (t >= 1) {
                meteor = null;
                return;
            }
            const travelled = meteor.length * t;
            const headX = meteor.x + meteor.dx * travelled;
            const headY = meteor.y + meteor.dy * travelled;
            const tail = Math.min(travelled, 130);
            const tailX = headX - meteor.dx * tail;
            const tailY = headY - meteor.dy * tail;
            const fade = t < 0.75 ? 1 : (1 - t) / 0.25;
            const streak = c.createLinearGradient(tailX, tailY, headX, headY);
            streak.addColorStop(0, "rgba(150, 200, 255, 0)");
            streak.addColorStop(1, "rgba(220, 240, 255, " + (0.95 * fade).toFixed(3) + ")");
            c.strokeStyle = streak;
            c.lineWidth = 1.6;
            c.lineCap = "round";
            c.beginPath();
            c.moveTo(tailX, tailY);
            c.lineTo(headX, headY);
            c.stroke();
        }

        function running() {
            return motion.matches && !document.hidden;
        }

        function tick(time) {
            frame = 0;
            if (!running()) {
                return;
            }
            if (!meteor && time >= nextMeteor && !light()) {
                // Now and then a shooting star crosses the upper sky, down to the left.
                const angle = Math.PI * (0.76 + Math.random() * 0.1);
                meteor = {
                    x: width * (0.35 + Math.random() * 0.6),
                    y: height * Math.random() * 0.25,
                    dx: Math.cos(angle),
                    dy: Math.sin(angle),
                    length: Math.min(width, height) * (0.35 + Math.random() * 0.2),
                    start: time,
                    duration: 900 + Math.random() * 500
                };
                nextMeteor = time + 7000 + Math.random() * 9000;
            }
            drawStars(time);
            frame = requestAnimationFrame(tick);
        }

        function start() {
            if (!frame && running()) {
                frame = requestAnimationFrame(tick);
            }
        }

        function redraw() {
            resize();
            drawBase();
            drawStars(null);
            start();
        }

        return {redraw, start};
    }());

    /* ---- Theme: the system's, until the switch is used; the choice stays in this browser ---- */

    function storedTheme() {
        try {
            const theme = localStorage.getItem(THEME_KEY);
            return theme === "light" || theme === "dark" ? theme : null;
        } catch (blocked) {
            return null;
        }
    }

    function applyTheme(theme) {
        const isLight = theme === "light";
        root.dataset.theme = theme;
        const toggle = $("[data-theme-toggle]");
        if (toggle) {
            toggle.setAttribute("aria-label", isLight ? "Switch to the dark theme" : "Switch to the light theme");
        }
        const shot = $("[data-light-shot]");
        if (shot) {
            shot.media = isLight ? "all" : "not all";
        }
        $$('meta[name="theme-color"]').forEach((meta) => meta.setAttribute("content", isLight ? "#f7faff" : "#050a17"));
        sky.redraw();
    }

    applyTheme(storedTheme() || (lightSystem.matches ? "light" : "dark"));

    const themeToggle = $("[data-theme-toggle]");
    if (themeToggle) {
        themeToggle.addEventListener("click", () => {
            const next = root.dataset.theme === "light" ? "dark" : "light";
            try {
                localStorage.setItem(THEME_KEY, next);
            } catch (blocked) {
                // Not remembered, but switched all the same.
            }
            applyTheme(next);
        });
    }
    lightSystem.addEventListener("change", () => {
        if (!storedTheme()) {
            applyTheme(lightSystem.matches ? "light" : "dark");
        }
    });

    let resizeQueued = false;
    window.addEventListener("resize", () => {
        if (!resizeQueued) {
            resizeQueued = true;
            requestAnimationFrame(() => {
                resizeQueued = false;
                sky.redraw();
            });
        }
    });
    document.addEventListener("visibilitychange", () => sky.start());
    motion.addEventListener("change", () => sky.redraw());

    /* ---- The top bar: solid once the page scrolls; the progress line where CSS cannot draw it ---- */

    const topbar = $("[data-topbar]");
    const progress = $(".scroll-progress");
    const cssProgress = window.CSS && CSS.supports && CSS.supports("animation-timeline: scroll()");
    let scrollQueued = false;

    function onScroll() {
        if (scrollQueued) {
            return;
        }
        scrollQueued = true;
        requestAnimationFrame(() => {
            scrollQueued = false;
            const y = window.scrollY;
            if (topbar) {
                topbar.classList.toggle("is-scrolled", y > 8);
            }
            if (progress && !cssProgress) {
                const room = root.scrollHeight - window.innerHeight;
                progress.style.setProperty("--progress", room > 0 ? (y / room).toFixed(4) : "0");
            }
        });
    }

    window.addEventListener("scroll", onScroll, {passive: true});
    onScroll();

    /* ---- The menu on narrow windows ---- */

    const navToggle = $("[data-nav-toggle]");
    const navMenu = $("[data-nav-menu]");

    function setMenu(open, refocus) {
        root.classList.toggle("nav-open", open);
        navToggle.setAttribute("aria-expanded", String(open));
        navToggle.setAttribute("aria-label", open ? "Close the menu" : "Open the menu");
        if (!open && refocus) {
            navToggle.focus();
        }
    }

    if (navToggle && navMenu) {
        navToggle.addEventListener("click", () => setMenu(!root.classList.contains("nav-open"), false));
        navMenu.addEventListener("click", (event) => {
            if (event.target.closest("a")) {
                setMenu(false, false);
            }
        });
        document.addEventListener("keydown", (event) => {
            if (event.key === "Escape" && root.classList.contains("nav-open")) {
                setMenu(false, true);
            }
        });
        document.addEventListener("click", (event) => {
            if (root.classList.contains("nav-open") && !event.target.closest(".nav")) {
                setMenu(false, false);
            }
        });
        window.matchMedia("(min-width: 1024px)").addEventListener("change", (event) => {
            if (event.matches) {
                setMenu(false, false);
            }
        });
    }

    /* ---- The menu marks the section on screen ---- */

    const navLinks = new Map($$(".nav-links a").map((link) => [link.getAttribute("href").slice(1), link]));
    if ("IntersectionObserver" in window) {
        const spy = new IntersectionObserver((entries) => {
            for (const entry of entries) {
                if (entry.isIntersecting) {
                    const current = entry.target.dataset.nav || entry.target.id;
                    navLinks.forEach((link, id) => {
                        if (id === current) {
                            link.setAttribute("aria-current", "true");
                        } else {
                            link.removeAttribute("aria-current");
                        }
                    });
                }
            }
        }, {rootMargin: "-40% 0px -55% 0px"});
        $$("main > section").forEach((section) => spy.observe(section));
    }

    /* ---- Sections appear as they scroll into view (only while motion is welcome) ---- */

    if (motion.matches && "IntersectionObserver" in window) {
        const items = $$("[data-reveal]");
        items.forEach((item) => {
            const siblings = Array.from(item.parentElement.children).filter((c) => c.hasAttribute("data-reveal"));
            const index = siblings.indexOf(item);
            if (index > 0) {
                item.style.setProperty("--reveal-delay", Math.min(index, 6) * 80 + "ms");
            }
        });
        const reveal = new IntersectionObserver((entries) => {
            for (const entry of entries) {
                if (entry.isIntersecting) {
                    entry.target.classList.add("is-visible");
                    reveal.unobserve(entry.target);
                }
            }
        }, {rootMargin: "0px 0px -6% 0px", threshold: 0.06});
        const view = window.innerHeight;
        items.forEach((item) => {
            const box = item.getBoundingClientRect();
            if (box.top < view && box.bottom > 0) {
                // Already on screen (a link to a section): it stays as it is.
                item.removeAttribute("data-reveal");
            } else {
                reveal.observe(item);
            }
        });
        root.classList.add("reveal-ready");
    }

    /* ---- Cards glow where the pointer is; the screenshot leans toward it ---- */

    if (finePointer.matches) {
        document.addEventListener("pointermove", (event) => {
            const card = event.target.closest && event.target.closest(".card");
            if (card) {
                const box = card.getBoundingClientRect();
                card.style.setProperty("--mx", event.clientX - box.left + "px");
                card.style.setProperty("--my", event.clientY - box.top + "px");
            }
        }, {passive: true});

        const frame = $("[data-tilt]");
        if (frame) {
            frame.addEventListener("pointermove", (event) => {
                if (!motion.matches) {
                    return;
                }
                const box = frame.getBoundingClientRect();
                const x = (event.clientX - box.left) / box.width - 0.5;
                const y = (event.clientY - box.top) / box.height - 0.5;
                frame.style.setProperty("--tilt-x", (-y * 5).toFixed(2) + "deg");
                frame.style.setProperty("--tilt-y", (x * 6).toFixed(2) + "deg");
            });
            frame.addEventListener("pointerleave", () => {
                frame.style.setProperty("--tilt-x", "0deg");
                frame.style.setProperty("--tilt-y", "0deg");
            });
        }
    }

    /* ---- The screenshot's numbered points and their captions light up together ---- */

    const spots = $$(".hotspot");
    $$(".tour li").forEach((item) => {
        const spot = spots.find((candidate) => candidate.dataset.spot === item.dataset.spot);
        const light = (on) => {
            item.classList.toggle("is-active", on);
            if (spot) {
                spot.classList.toggle("is-active", on);
            }
        };
        for (const target of [item, spot]) {
            if (target) {
                target.addEventListener("pointerenter", () => light(true));
                target.addEventListener("pointerleave", () => light(false));
            }
        }
    });

    /* ---- Tabs: the visitor's system among the downloads, the cryptocurrencies among the wallets ---- */

    function setupTabs(container, first) {
        const list = $('[role="tablist"]', container);
        const tabs = $$('[role="tab"]', list);
        const vertical = list.getAttribute("aria-orientation") === "vertical";
        const panelOf = (tab) => document.getElementById(tab.getAttribute("aria-controls"));

        function select(tab, focus) {
            tabs.forEach((other) => {
                const on = other === tab;
                other.setAttribute("aria-selected", String(on));
                other.tabIndex = on ? 0 : -1;
                panelOf(other).hidden = !on;
            });
            if (focus) {
                tab.focus();
            }
        }

        tabs.forEach((tab, index) => {
            tab.addEventListener("click", () => select(tab, false));
            tab.addEventListener("keydown", (event) => {
                const forward = vertical ? ["ArrowDown", "ArrowRight"] : ["ArrowRight"];
                const back = vertical ? ["ArrowUp", "ArrowLeft"] : ["ArrowLeft"];
                let to = -1;
                if (forward.includes(event.key)) {
                    to = (index + 1) % tabs.length;
                } else if (back.includes(event.key)) {
                    to = (index - 1 + tabs.length) % tabs.length;
                } else if (event.key === "Home") {
                    to = 0;
                } else if (event.key === "End") {
                    to = tabs.length - 1;
                }
                if (to >= 0) {
                    event.preventDefault();
                    select(tabs[to], true);
                }
            });
        });
        select(tabs.find((tab) => tab.id === first) || tabs[0], false);
    }

    /** The visitor's system, read here and never sent anywhere, to open its downloads first. */
    function visitorSystem() {
        const platform = navigator.userAgentData && navigator.userAgentData.platform || navigator.platform || "";
        const agent = navigator.userAgent || "";
        if (/android/i.test(agent)) {
            return "tab-android";
        }
        if (/linux|x11|cros/i.test(platform) || /linux|x11|cros/i.test(agent) && !/windows/i.test(agent)) {
            return "tab-linux";
        }
        return "tab-windows";
    }

    const os = $('[data-tabs="os"]');
    if (os) {
        setupTabs(os, visitorSystem());
    }
    const wallets = $('[data-tabs="wallet"]');
    if (wallets) {
        setupTabs(wallets, null);
    }

    /* The contact topics show their email template; on a narrow screen it is below them, so it comes into view. */
    const mail = $('[data-tabs="mail"]');
    if (mail) {
        setupTabs(mail, null);
        $$('[role="tab"]', mail).forEach((tab) => tab.addEventListener("click", () => {
            const panel = document.getElementById(tab.getAttribute("aria-controls"));
            const box = panel.getBoundingClientRect();
            if (box.top > window.innerHeight - 120 || box.bottom < 0) {
                panel.scrollIntoView({ block: "start", behavior: motion.matches ? "smooth" : "auto" });
            }
        }));
    }

    /* ---- Each wallet's QR code, made from the address shown beside it ---- */

    if (window.CryptenQr) {
        $$(".wallet").forEach((wallet) => {
            const holder = $("[data-qr]", wallet);
            const address = $(".wallet-address", wallet).textContent.trim();
            const name = $(".wallet-name", wallet).textContent.trim();
            try {
                holder.replaceChildren(window.CryptenQr.svg(address, "QR code of the " + name + " address"));
            } catch (tooLong) {
                holder.hidden = true;
            }
        });
    }

    /* ---- Copying an address or the fingerprint ---- */

    async function copy(text) {
        try {
            if (navigator.clipboard && window.isSecureContext) {
                await navigator.clipboard.writeText(text);
                return true;
            }
        } catch (refused) {
            // Fall back to selecting it, below.
        }
        const buffer = document.createElement("textarea");
        buffer.value = text;
        buffer.setAttribute("readonly", "");
        buffer.className = "copy-buffer";
        document.body.append(buffer);
        buffer.select();
        let done;
        try {
            done = document.execCommand("copy");
        } catch (refused) {
            done = false;
        }
        buffer.remove();
        return done;
    }

    $$("[data-copy]").forEach((button) => {
        const label = $("span", button);
        const text = label ? label.textContent : "";
        let restore = 0;
        button.addEventListener("click", async () => {
            const source = $(button.dataset.copy);
            /* A hash shown in groups of eight is copied in one piece, as the hash tools print it. */
            const shown = source ? source.textContent.trim() : "";
            const value = button.hasAttribute("data-copy-joined") ? shown.replace(/\s+/g, "") : shown;
            if (!value) {
                return;
            }
            if (await copy(value)) {
                say(button.dataset.copied || "Copied.");
                button.classList.add("is-done");
                if (label) {
                    label.textContent = "Copied";
                }
                clearTimeout(restore);
                restore = setTimeout(() => {
                    button.classList.remove("is-done");
                    if (label) {
                        label.textContent = text;
                    }
                }, 1800);
            } else {
                say("Your browser did not let the page copy it: select the text and copy it yourself.");
            }
        });
    });

    /* ---- The download links are examples until the first release ---- */

    $$("[data-example]").forEach((link) => link.addEventListener("click", (event) => {
        event.preventDefault();
        say("An example link: Crypten's first public release is not out yet.");
    }));

    /* ---- A ripple from the pointer when a button is pressed ---- */

    document.addEventListener("pointerdown", (event) => {
        const button = event.target.closest && event.target.closest(".button");
        if (!button || !motion.matches) {
            return;
        }
        const box = button.getBoundingClientRect();
        const ripple = document.createElement("span");
        ripple.className = "ripple";
        ripple.style.setProperty("--rx", event.clientX - box.left + "px");
        ripple.style.setProperty("--ry", event.clientY - box.top + "px");
        ripple.style.setProperty("--rs", Math.max(box.width, box.height) * 2.2 + "px");
        button.append(ripple);
        ripple.addEventListener("animationend", () => ripple.remove());
    });
}());
