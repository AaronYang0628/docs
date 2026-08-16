(() => {
  const countdowns = [
    {
      label: "退休",
      target: "2043-10-19T00:00:00+08:00",
    },
  ];

  function renderCountdowns() {
    const container = document.getElementById("widgets-wrap");
    if (!container) return;

    let countdown = document.getElementById("custom-countdowns");
    if (!countdown) {
      countdown = document.createElement("div");
      countdown.id = "custom-countdowns";
      countdown.setAttribute("role", "status");
      container.prepend(countdown);
    } else if (countdown.parentElement !== container) {
      container.prepend(countdown);
    }

    const now = Date.now();
    const text = countdowns
      .map(({ label, target }) => {
        const days = Math.max(0, Math.ceil((new Date(target).getTime() - now) / 86400000));
        return days === 0 ? `距离${label}日期已到` : `距离${label}还有 ${days} 天`;
      })
      .join("\n");

    if (countdown.textContent !== text) countdown.textContent = text;
  }

  function start() {
    renderCountdowns();
    window.setInterval(renderCountdowns, 60000);

    new MutationObserver(renderCountdowns).observe(document.body, {
      childList: true,
      subtree: true,
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", start, { once: true });
  } else {
    start();
  }
})();
