// Lucide icons inline bundle — solo los iconos usados en index.html.
// Reemplaza al script unpkg.com/lucide@latest (~410KB) por un sprite de ~5KB.
// API compatible: window.lucide.createIcons() reemplaza <i data-lucide="name"> por <svg>.
(function () {
    const PATHS = {
        "menu": '<line x1="4" x2="20" y1="6" y2="6"/><line x1="4" x2="20" y1="12" y2="12"/><line x1="4" x2="20" y1="18" y2="18"/>',
        "x": '<path d="M18 6 6 18"/><path d="m6 6 12 12"/>',
        "search-check": '<path d="m9 13-2 3.5L4 14"/><path d="m21 11-8.5 8.5a2.83 2.83 0 0 1-4 0L2 13"/><path d="M4 13c.9-1.4 2.3-2.5 4-3a8 8 0 0 1 8 5c-.5 1.7-1.6 3.1-3 4"/><circle cx="11" cy="14" r="8"/>',
        "layers": '<path d="m12.83 2.18a2 2 0 0 0-1.66 0L2.6 6.08a1 1 0 0 0 0 1.83l8.58 3.91a2 2 0 0 0 1.66 0l8.58-3.9a1 1 0 0 0 0-1.83Z"/><path d="m22 17.65-9.17 4.16a2 2 0 0 1-1.66 0L2 17.65"/><path d="m22 12.65-9.17 4.16a2 2 0 0 1-1.66 0L2 12.65"/>',
        "graduation-cap": '<path d="M21.42 10.922a1 1 0 0 0-.019-1.838L12.83 5.18a2 2 0 0 0-1.66 0L2.6 9.08a1 1 0 0 0 0 1.832l8.57 3.908a2 2 0 0 0 1.66 0z"/><path d="M22 10.25V15"/><path d="M5.5 13.5v3.75a3 3 0 0 0 3 3h6a3 3 0 0 0 3-3V13.5"/>',
        "gauge": '<path d="m12 14 4-4"/><path d="M3.34 19a10 10 0 1 1 17.32 0"/>',
        "route": '<circle cx="6" cy="19" r="3"/><path d="M9 19h8.5a3.5 3.5 0 0 0 0-7h-11a3.5 3.5 0 0 1 0-7H15"/><circle cx="18" cy="5" r="3"/>',
        "users": '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>',
        "shield-check": '<path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z"/><path d="m9 12 2 2 4-4"/>',
        "trophy": '<path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6"/><path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18"/><path d="M4 22h16"/><path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22"/><path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22"/><path d="M18 2H6v7a6 6 0 0 0 12 0V2Z"/>',
        "quote": '<path d="M3 21c3 0 7-1 7-8V5c0-1.25-.756-2.017-2-2H4c-1.25 0-2 .75-2 1.972V11c0 1.25.75 2 2 2 1 0 1 0 1 1v1c0 1-1 2-2 2s-1 .008-1 1.031V20c0 1 0 1 1 1z"/><path d="M15 21c3 0 7-1 7-8V5c0-1.25-.757-2.017-2-2h-4c-1.25 0-2 .75-2 1.972V11c0 1.25.75 2 2 2h.75c0 2.25.25 4-2.75 4v3c0 1 0 1 1 1z"/>',
        "mail": '<path d="m22 7-8.991 5.727a2 2 0 0 1-2.009 0L2 7"/><rect x="2" y="4" width="20" height="16" rx="2"/>',
        "calendar-clock": '<path d="M21 7.5V6a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h3"/><path d="M16 2v4"/><path d="M8 2v4"/><path d="M3 13h4"/><path d="M18 22a4 4 0 0 0 4-4a4 4 0 0 0-4-4a4 4 0 0 0-4 4a4 4 0 0 0 4 4z"/><path d="M18 14v2l2 1"/>',
        "globe": '<circle cx="12" cy="12" r="10"/><path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20"/><path d="M2 12h20"/>'
    };

    function makeSvg(name, attrs) {
        const body = PATHS[name];
        if (!body) return null;
        const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
        svg.setAttribute("xmlns", "http://www.w3.org/2000/svg");
        svg.setAttribute("width", "24");
        svg.setAttribute("height", "24");
        svg.setAttribute("viewBox", "0 0 24 24");
        svg.setAttribute("fill", "none");
        svg.setAttribute("stroke", "currentColor");
        svg.setAttribute("stroke-width", "2");
        svg.setAttribute("stroke-linecap", "round");
        svg.setAttribute("stroke-linejoin", "round");
        svg.classList.add("lucide", "lucide-" + name);
        svg.innerHTML = body;
        if (attrs && attrs.class) {
            String(attrs.class).split(/\s+/).filter(Boolean).forEach(function (c) {
                svg.classList.add(c);
            });
        }
        return svg;
    }

    function replaceOne(node) {
        const name = node.getAttribute("data-lucide");
        if (!name || !PATHS[name]) return;
        const svg = makeSvg(name, {
            class: node.getAttribute("class") || ""
        });
        if (!svg) return;
        for (const an of node.attributes) {
            if (an.name === "data-lucide" || an.name === "class") continue;
            if (!svg.hasAttribute(an.name)) svg.setAttribute(an.name, an.value);
        }
        node.replaceWith(svg);
    }

    function createIcons(root) {
        (root || document).querySelectorAll("[data-lucide]").forEach(replaceOne);
    }

    function poll() {
        if (document.readyState === "loading") {
            document.addEventListener("DOMContentLoaded", function () { createIcons(); });
        } else {
            createIcons();
        }
    }

    window.lucide = window.lucide || { createIcons: createIcons };
    poll();
})();
