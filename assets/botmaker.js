(() => {
  "use strict";
  // Botmaker's Vimeo video loads only when the visitor asks for it. Without
  // JavaScript the poster stays a regular link to the video on Vimeo.
  document.querySelectorAll("[data-video-facade]").forEach((host) => {
    const link = host.querySelector("a");
    const id = host.dataset.vimeoId;
    if (!link || !/^\d+$/.test(id || "")) return;
    link.addEventListener("click", (event) => {
      event.preventDefault();
      const frame = document.createElement("iframe");
      frame.src = `https://player.vimeo.com/video/${id}?dnt=1&autoplay=1&title=0&byline=0&portrait=0`;
      frame.title = "Video de la plataforma Botmaker";
      frame.allow = "autoplay; fullscreen; picture-in-picture";
      frame.allowFullscreen = true;
      frame.referrerPolicy = "strict-origin-when-cross-origin";
      host.replaceChildren(frame);
      frame.focus();
    });
  });
})();
