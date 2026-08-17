(() => {
  if (window.__portalToolsStarted) return;
  window.__portalToolsStarted = true;

  const API_BASE = "/api/portal-tools";
  const state = {
    countdowns: [],
    tasks: [],
    error: "",
    loaded: false,
    loading: true,
  };
  let root;

  function element(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  }

  function button(label, className, ariaLabel, handler) {
    const node = element("button", `portal-tools-button ${className || ""}`, label);
    node.type = "button";
    node.setAttribute("aria-label", ariaLabel);
    node.title = ariaLabel;
    if (handler) node.addEventListener("click", handler);
    return node;
  }

  function isPlainText(value, maxLength) {
    if (!value || value.length > maxLength) return false;
    return !/[\u0000-\u001f\u007f-\u009f<>]/u.test(value);
  }

  function daysUntil(target) {
    const timestamp = new Date(`${target}T00:00:00+08:00`).getTime();
    if (!Number.isFinite(timestamp)) return 0;
    return Math.max(0, Math.ceil((timestamp - Date.now()) / 86400000));
  }

  function formatTarget(target) {
    const timestamp = new Date(`${target}T00:00:00+08:00`);
    if (Number.isNaN(timestamp.getTime())) return target;
    return new Intl.DateTimeFormat("zh-CN", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      timeZone: "Asia/Shanghai",
    }).format(timestamp);
  }

  async function request(path, options = {}) {
    const requestOptions = {
      cache: "no-store",
      ...options,
      headers: {
        Accept: "application/json",
        ...(options.body ? { "Content-Type": "application/json" } : {}),
        ...(options.headers || {}),
      },
    };
    const response = await fetch(`${API_BASE}${path}`, requestOptions);
    const payload = response.status === 204 ? null : await response.json();
    if (!response.ok) {
      throw new Error(payload?.error || `请求失败（${response.status}）`);
    }
    return payload;
  }

  function ensureRoot() {
    const anchor = document.getElementById("widgets-wrap");
    if (!anchor?.parentElement) return null;

    if (!root) {
      root = element("section", "portal-tools");
      root.id = "portal-tools";
      root.setAttribute("aria-label", "我的计划");
    }

    const parent = anchor.parentElement;
    if (root.parentElement !== parent || root.nextElementSibling !== anchor) {
      parent.insertBefore(root, anchor);
    }
    return root;
  }

  function renderHeader() {
    const header = element("div", "portal-tools-header");
    const heading = element("div", "portal-tools-heading");
    heading.append(element("span", "portal-tools-kicker", "PERSONAL BOARD"));
    heading.append(element("h2", "portal-tools-title", "我的计划"));
    heading.append(element("p", "portal-tools-subtitle", "倒计时与待办"));
    header.append(heading);

    const actions = element("div", "portal-tools-actions");
    actions.append(button("＋ 倒计时", "portal-tools-primary", "新增倒计时", () => openCountdownDialog()));
    actions.append(button("＋ 任务", "portal-tools-secondary", "新增任务", () => openTaskDialog()));
    actions.append(button("↻", "portal-tools-icon-button", "刷新数据", loadData));
    header.append(actions);
    return header;
  }

  function renderCountdownSection() {
    const section = element("section", "portal-tools-section");
    const heading = element("div", "portal-tools-section-heading");
    heading.append(element("h3", "portal-tools-section-title", "倒计时"));
    heading.append(element("span", "portal-tools-count", `${state.countdowns.length} 项`));
    section.append(heading);

    if (!state.countdowns.length) {
      section.append(element("p", "portal-tools-empty", "还没有倒计时"));
      return section;
    }

    const grid = element("div", "portal-countdown-grid");
    state.countdowns.forEach((item) => {
      const card = element("article", "portal-countdown-card");
      card.dataset.countdownId = item.id;

      const cardHeader = element("div", "portal-countdown-card-header");
      cardHeader.append(element("h4", "portal-countdown-label", item.label));
      const cardActions = element("div", "portal-countdown-actions");
      cardActions.append(button("✎", "portal-tools-icon-button", `编辑${item.label}`, () => openCountdownDialog(item)));
      cardActions.append(button("×", "portal-tools-icon-button portal-tools-danger", `删除${item.label}`, () => deleteCountdown(item)));
      cardHeader.append(cardActions);
      card.append(cardHeader);

      const number = element("div", "portal-countdown-number");
      number.append(element("strong", "portal-countdown-days", String(daysUntil(item.target))));
      number.append(element("span", "portal-countdown-unit", "天"));
      card.append(number);

      const target = element("time", "portal-countdown-target", `目标 ${formatTarget(item.target)}`);
      target.dateTime = item.target;
      card.append(target);
      grid.append(card);
    });
    section.append(grid);
    return section;
  }

  function renderTaskSection() {
    const section = element("section", "portal-tools-section portal-tasks-section");
    const heading = element("div", "portal-tools-section-heading");
    const pending = state.tasks.filter((item) => !item.done).length;
    heading.append(element("h3", "portal-tools-section-title", "待办"));
    heading.append(element("span", "portal-tools-count", `${pending} 项未完成`));
    section.append(heading);

    const quickAdd = element("form", "portal-task-quick-add");
    const input = element("input", "portal-tools-input");
    input.type = "text";
    input.name = "title";
    input.maxLength = 140;
    input.placeholder = "记一件事...";
    input.autocomplete = "off";
    input.required = true;
    const error = element("span", "portal-tools-inline-error");
    const add = button("＋", "portal-tools-primary portal-tools-add-button", "添加任务");
    quickAdd.append(input, add);
    quickAdd.append(error);
    quickAdd.addEventListener("submit", async (event) => {
      event.preventDefault();
      const title = input.value.trim();
      if (!isPlainText(title, 140)) {
        error.textContent = "请输入普通文字或 emoji";
        return;
      }
      add.disabled = true;
      error.textContent = "";
      try {
        await request("/tasks", { method: "POST", body: JSON.stringify({ title }) });
        await loadData();
      } catch (requestError) {
        error.textContent = requestError.message;
        add.disabled = false;
      }
    });
    section.append(quickAdd);

    if (!state.tasks.length) {
      section.append(element("p", "portal-tools-empty", "还没有待办"));
      return section;
    }

    const list = element("div", "portal-task-list");
    state.tasks.forEach((item) => {
      const row = element("div", `portal-task-row${item.done ? " is-done" : ""}`);
      row.dataset.taskId = item.id;
      const taskLabel = element("label", "portal-task-label");
      const checkbox = element("input", "portal-task-checkbox");
      checkbox.type = "checkbox";
      checkbox.checked = item.done;
      checkbox.setAttribute("aria-label", `完成${item.title}`);
      checkbox.addEventListener("change", () => updateTask(item.id, { done: checkbox.checked }));
      taskLabel.append(checkbox, element("span", "portal-task-title", item.title));
      row.append(taskLabel);

      const actions = element("div", "portal-task-actions");
      actions.append(button("✎", "portal-tools-icon-button", `编辑${item.title}`, () => openTaskDialog(item)));
      actions.append(button("×", "portal-tools-icon-button portal-tools-danger", `删除${item.title}`, () => deleteTask(item)));
      row.append(actions);
      list.append(row);
    });
    section.append(list);
    return section;
  }

  function render() {
    const target = ensureRoot();
    if (!target) return;
    target.replaceChildren(renderHeader());
    if (state.loading) {
      target.append(element("p", "portal-tools-state", "加载中..."));
      return;
    }
    if (state.error) {
      const error = element("div", "portal-tools-state portal-tools-state-error");
      error.append(element("p", "portal-tools-error-text", state.error));
      error.append(button("重试", "portal-tools-secondary", "重试", loadData));
      target.append(error);
      return;
    }
    target.append(renderCountdownSection(), renderTaskSection());
  }

  async function loadData() {
    if (!state.loaded) {
      state.loading = true;
      render();
    }
    state.error = "";
    try {
      const data = await request("");
      state.countdowns = Array.isArray(data.countdowns) ? data.countdowns : [];
      state.tasks = Array.isArray(data.tasks) ? data.tasks : [];
      state.loaded = true;
    } catch (requestError) {
      state.error = requestError.message;
    } finally {
      state.loading = false;
      render();
    }
  }

  function refreshCountdownValues() {
    state.countdowns.forEach((item) => {
      const card = Array.from(document.querySelectorAll(".portal-countdown-card")).find(
        (candidate) => candidate.dataset.countdownId === item.id,
      );
      const days = card?.querySelector(".portal-countdown-days");
      if (days) days.textContent = String(daysUntil(item.target));
    });
  }

  function modal(title) {
    const overlay = element("div", "portal-tools-modal-overlay");
    const dialog = element("div", "portal-tools-modal");
    dialog.setAttribute("role", "dialog");
    dialog.setAttribute("aria-modal", "true");
    dialog.setAttribute("aria-label", title);
    const header = element("div", "portal-tools-modal-header");
    header.append(element("h3", "portal-tools-modal-title", title));
    header.append(button("×", "portal-tools-icon-button", "关闭", close));
    dialog.append(header);
    overlay.append(dialog);
    document.body.append(overlay);

    function close() {
      document.removeEventListener("keydown", onKeyDown);
      overlay.remove();
    }

    function onKeyDown(event) {
      if (event.key === "Escape") close();
    }

    overlay.addEventListener("click", (event) => {
      if (event.target === overlay) close();
    });
    document.addEventListener("keydown", onKeyDown);
    return { dialog, close };
  }

  function field(label, input) {
    const wrapper = element("label", "portal-tools-field");
    wrapper.append(element("span", "portal-tools-field-label", label), input);
    return wrapper;
  }

  function formFooter(close, submitLabel) {
    const footer = element("div", "portal-tools-form-footer");
    footer.append(button("取消", "portal-tools-secondary", "取消", close));
    const submit = button(submitLabel, "portal-tools-primary", submitLabel);
    submit.type = "submit";
    footer.append(submit);
    return { footer, submit };
  }

  function openCountdownDialog(item) {
    const dialogState = modal(item ? "编辑倒计时" : "新增倒计时");
    const form = element("form", "portal-tools-form");
    const labelInput = element("input", "portal-tools-input");
    labelInput.type = "text";
    labelInput.maxLength = 48;
    labelInput.required = true;
    labelInput.autocomplete = "off";
    labelInput.value = item?.label || "";
    const dateInput = element("input", "portal-tools-input");
    dateInput.type = "date";
    dateInput.required = true;
    dateInput.value = item?.target || "";
    const error = element("p", "portal-tools-form-error");
    const footerState = formFooter(dialogState.close, item ? "保存" : "添加");
    form.append(field("名称", labelInput), field("日期", dateInput), error, footerState.footer);
    dialogState.dialog.append(form);

    form.addEventListener("submit", async (event) => {
      event.preventDefault();
      const label = labelInput.value.trim();
      if (!isPlainText(label, 48)) {
        error.textContent = "名称只能包含普通文字和 emoji";
        return;
      }
      if (!/^\d{4}-\d{2}-\d{2}$/u.test(dateInput.value)) {
        error.textContent = "请选择有效日期";
        return;
      }
      footerState.submit.disabled = true;
      error.textContent = "";
      try {
        const path = item ? `/countdowns/${encodeURIComponent(item.id)}` : "/countdowns";
        const method = item ? "PATCH" : "POST";
        await request(path, { method, body: JSON.stringify({ label, target: dateInput.value }) });
        dialogState.close();
        await loadData();
      } catch (requestError) {
        error.textContent = requestError.message;
        footerState.submit.disabled = false;
      }
    });
    labelInput.focus();
  }

  function openTaskDialog(item) {
    const dialogState = modal(item ? "编辑任务" : "新增任务");
    const form = element("form", "portal-tools-form");
    const titleInput = element("input", "portal-tools-input");
    titleInput.type = "text";
    titleInput.maxLength = 140;
    titleInput.required = true;
    titleInput.autocomplete = "off";
    titleInput.value = item?.title || "";
    const error = element("p", "portal-tools-form-error");
    const footerState = formFooter(dialogState.close, item ? "保存" : "添加");
    form.append(field("任务", titleInput), error, footerState.footer);
    dialogState.dialog.append(form);

    form.addEventListener("submit", async (event) => {
      event.preventDefault();
      const title = titleInput.value.trim();
      if (!isPlainText(title, 140)) {
        error.textContent = "任务只能包含普通文字和 emoji";
        return;
      }
      footerState.submit.disabled = true;
      error.textContent = "";
      try {
        const path = item ? `/tasks/${encodeURIComponent(item.id)}` : "/tasks";
        const method = item ? "PATCH" : "POST";
        await request(path, { method, body: JSON.stringify({ title }) });
        dialogState.close();
        await loadData();
      } catch (requestError) {
        error.textContent = requestError.message;
        footerState.submit.disabled = false;
      }
    });
    titleInput.focus();
  }

  async function updateTask(id, changes) {
    try {
      await request(`/tasks/${encodeURIComponent(id)}`, {
        method: "PATCH",
        body: JSON.stringify(changes),
      });
      await loadData();
    } catch (requestError) {
      state.error = requestError.message;
      render();
    }
  }

  async function deleteCountdown(item) {
    if (!window.confirm(`删除“${item.label}”？`)) return;
    try {
      await request(`/countdowns/${encodeURIComponent(item.id)}`, { method: "DELETE" });
      await loadData();
    } catch (requestError) {
      state.error = requestError.message;
      render();
    }
  }

  async function deleteTask(item) {
    if (!window.confirm(`删除“${item.title}”？`)) return;
    try {
      await request(`/tasks/${encodeURIComponent(item.id)}`, { method: "DELETE" });
      await loadData();
    } catch (requestError) {
      state.error = requestError.message;
      render();
    }
  }

  function start() {
    render();
    loadData();
    window.setInterval(refreshCountdownValues, 60000);
    new MutationObserver(() => {
      const wasAttached = root?.isConnected;
      const current = ensureRoot();
      if (current && (!wasAttached || current.childElementCount === 0)) render();
    }).observe(document.body, { childList: true, subtree: true });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", start, { once: true });
  } else {
    start();
  }
})();
