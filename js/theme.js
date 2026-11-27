/*
 * Runs before the page is drawn: marks that scripts run, so the page may hide what it reveals later, and puts back the
 * theme chosen last time, so the page never flashes the other one first. The choice stays in this browser alone.
 */
(function () {
    "use strict";

    const root = document.documentElement;
    root.classList.remove("no-js");
    root.classList.add("js");
    try {
        const theme = localStorage.getItem("crypten-theme");
        if (theme === "light" || theme === "dark") {
            root.dataset.theme = theme;
        }
    } catch (blocked) {
        // No storage (a private window, or blocked): the theme follows the system.
    }
}());
