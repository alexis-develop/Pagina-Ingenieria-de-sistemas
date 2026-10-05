(() => {
    const story = document.querySelector(".horizontal-story");
    const viewport = story && story.querySelector(".horizontal-viewport");
    const track = story && story.querySelector(".horizontal-track");
    const slides = story ? Array.from(story.querySelectorAll(".horizontal-slide")) : [];

    if (!story || !viewport || !track || slides.length < 2 || !window.gsap || !window.ScrollTrigger) {
        return;
    }

    gsap.registerPlugin(ScrollTrigger);
    const media = gsap.matchMedia();
    let pendingSlideId = null;

    const getVisibleSlide = () => {
        const pageTop = story.getBoundingClientRect().top + window.scrollY;
        if (window.scrollY < pageTop - window.innerHeight) return null;

        const anchor = document.querySelector(".site-header").offsetHeight + window.innerHeight / 2;
        return slides.reduce((closest, slide) => {
            const bounds = slide.getBoundingClientRect();
            const distance = anchor < bounds.top ? bounds.top - anchor : anchor > bounds.bottom ? anchor - bounds.bottom : 0;
            return distance < closest.distance ? { id: slide.id, distance } : closest;
        }, { id: null, distance: Infinity }).id;
    };

    media.add("(min-width: 992px) and (prefers-reduced-motion: no-preference)", () => {
        const slideToRestore = pendingSlideId
            || slides.find(slide => slide.id === location.hash.slice(1))?.id
            || getVisibleSlide();
        story.classList.add("is-horizontal");
        const resizeSlides = () => {
            const navHeight = document.querySelector(".site-header").offsetHeight;
            viewport.scrollLeft = 0;
            gsap.set(slides, {
                width: viewport.clientWidth,
                flexBasis: `${viewport.clientWidth}px`
            });
            story.style.height = `${Math.max(viewport.clientHeight, track.scrollWidth - viewport.clientWidth - navHeight) + window.innerHeight}px`;
        };

        resizeSlides();
        ScrollTrigger.addEventListener("refreshInit", resizeSlides);

        let horizontalProgress = 0;
        const tween = gsap.to(track, {
            x: () => -(track.scrollWidth - viewport.clientWidth),
            ease: "none",
            scrollTrigger: {
                trigger: story,
                pin: viewport,
                pinSpacing: false,
                anticipatePin: 1,
                scrub: 0.6,
                start: () => `top top+=${document.querySelector(".site-header").offsetHeight}`,
                end: () => `+=${track.scrollWidth - viewport.clientWidth}`,
                invalidateOnRefresh: true,
                onUpdate: self => { horizontalProgress = self.progress; }
            }
        });

        const scrollToSlide = (slideIndex, behavior = "smooth") => {
            const trigger = tween.scrollTrigger;
            viewport.scrollLeft = 0;
            if (slideIndex === slides.length - 1) {
                window.scrollTo({ top: trigger.end - 2, behavior });
                return;
            }
            const progress = slideIndex / (slides.length - 1);
            window.scrollTo({
                top: trigger.start + (trigger.end - trigger.start) * progress,
                behavior
            });
        };

        const navigateToSlide = event => {
            const link = event.target.closest('a[href^="#"]');
            if (!link) return;

            const slideIndex = slides.findIndex(slide => slide.id === link.hash.slice(1));
            if (slideIndex < 0) return;

            event.preventDefault();
            history.pushState(null, "", link.hash);
            scrollToSlide(slideIndex);
        };

        document.addEventListener("click", navigateToSlide);
        const restoreSlide = () => {
            requestAnimationFrame(() => requestAnimationFrame(() => {
                ScrollTrigger.refresh();
                const slideIndex = slides.findIndex(slide => slide.id === slideToRestore);
                if (slideIndex >= 0) scrollToSlide(slideIndex, "instant");
                pendingSlideId = null;
            }));
        };

        if (slideToRestore) {
            if (document.readyState === "complete") requestAnimationFrame(restoreSlide);
            else window.addEventListener("load", restoreSlide, { once: true });
        }
        return () => {
            pendingSlideId = slides[Math.round(horizontalProgress * (slides.length - 1))].id;
            document.removeEventListener("click", navigateToSlide);
            window.removeEventListener("load", restoreSlide);
            ScrollTrigger.removeEventListener("refreshInit", resizeSlides);
            story.classList.remove("is-horizontal");
            gsap.set([track, ...slides], { clearProps: "transform,width,flexBasis" });
            story.style.removeProperty("height");

            requestAnimationFrame(() => {
                if (story.classList.contains("is-horizontal")) return;
                const target = document.getElementById(pendingSlideId);
                if (target) {
                    window.scrollTo(0, target.getBoundingClientRect().top + window.scrollY - document.querySelector(".site-header").offsetHeight);
                }
            });
        };
    });
})();
