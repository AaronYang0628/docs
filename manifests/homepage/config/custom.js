(() => {
  const countdowns = [
    {
      id: "retirement-countdown",
      label: "退休",
      target: "2043-10-19T00:00:00+08:00",
    },
  ];

  function renderCountdowns() {
    const now = Date.now();
    countdowns.forEach(({ id, label, target }) => {
      const item = document.getElementById(id);
      const description = item?.querySelector(".bookmark-description");
      if (!description) return;

      const days = Math.max(0, Math.ceil((new Date(target).getTime() - now) / 86400000));
      const text = days === 0 ? `${label}日期已到` : `还有 ${days} 天`;
      if (description.textContent !== text) description.textContent = text;
    });
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
