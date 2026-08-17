(() => {
  if (window.__portalToolsStarted) return;
  window.__portalToolsStarted = true;

  const API_BASE = "/api/portal-tools";
  const groups = {
    countdowns: {
      name: "倒计时",
      templateId: "portal-countdown-template",
    },
    tasks: {
      name: "待办",
      templateId: "portal-task-template",
    },
  };
  const state = {
    countdowns: [],
    tasks: [],
    loading: true,
    error: "",
  };

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

  function findGroup(groupName) {
    return Array.from(document.querySelectorAll(".bookmark-group")).find(
      (group) => group.querySelector(".bookmark-group-name")?.textContent.trim() === groupName,
    );
  }

  function getGroupList(group) {
    return group?.querySelector("ul");
  }

  function getTemplate(group, templateId) {
    if (!group) return null;
    if (!group.portalToolsTemplate) {
      const list = getGroupList(group);
      const source = list?.querySelector("li.bookmark");
      if (source) group.portalToolsTemplate = source.cloneNode(true);
    }
    if (!group.portalToolsTemplate) return null;
    const template = group.portalToolsTemplate.cloneNode(true);
    template.id = templateId;
    return template;
  }

  function setBookmarkText(card, name, description) {
    const nameNode = card.querySelector(".bookmark-name");
    const descriptionNode = card.querySelector(".bookmark-description");
    if (nameNode) nameNode.textContent = name;
    if (descriptionNode) descriptionNode.textContent = description;
    card.dataset.name = name;
  }

  function prepareAnchor(card, name, onActivate) {
    const anchor = card.querySelector("a");
    if (!anchor) return null;
    anchor.href = "#";
    anchor.removeAttribute("target");
    anchor.title = name;
    anchor.addEventListener("click", (event) => {
      event.preventDefault();
      onActivate(event);
    });
    return anchor;
  }

  function setIconText(card, text) {
    const icon = card.querySelector(".bookmark-icon");
    if (!icon) return;
    icon.replaceChildren(element("span", "portal-bookmark-icon-text", text));
  }

  function buildAddCard(template, type) {
    const card = template.cloneNode(true);
    card.id = `portal-${type}-add`;
    card.classList.add("portal-add-bookmark");
    const label = type === "countdowns" ? "新增倒计时" : "新增任务";
    setBookmarkText(card, label, "点击添加");
    setIconText(card, "＋");
    prepareAnchor(card, label, () => {
      if (type === "countdowns") openCountdownDialog();
      else openTaskDialog();
    });
    return card;
  }

  function buildStatusCard(template, message) {
    const card = template.cloneNode(true);
    card.id = "portal-tools-status";
    card.classList.add("portal-tools-status-bookmark");
    setBookmarkText(card, message, "请稍候");
    prepareAnchor(card, message, () => loadData(true));
    return card;
  }

  function buildCountdownCard(template, item) {
    const card = template.cloneNode(true);
    card.id = `portal-countdown-${item.id}`;
    card.classList.add("portal-countdown-bookmark");
    card.dataset.countdownId = item.id;
    setBookmarkText(card, item.label, `还有 ${daysUntil(item.target)} 天`);
    const anchor = prepareAnchor(card, item.label, () => openCountdownDialog(item));
    if (anchor) anchor.title = `${item.label} · ${item.target}`;
    return card;
  }

  function buildTaskCard(template, item) {
    const card = template.cloneNode(true);
    card.id = `portal-task-${item.id}`;
    card.classList.add("portal-task-bookmark");
    card.classList.toggle("portal-task-done", item.done);
    card.dataset.taskId = item.id;
    setBookmarkText(card, item.title, item.done ? "已完成" : "待办");

    const anchor = card.querySelector("a");
    const icon = card.querySelector(".bookmark-icon");
    const checkbox = element("input", "portal-task-checkbox");
    checkbox.type = "checkbox";
    checkbox.checked = item.done;
    checkbox.setAttribute("aria-label", `完成${item.title}`);
    checkbox.addEventListener("click", (event) => event.stopPropagation());
    checkbox.addEventListener("change", () => updateTask(item.id, { done: checkbox.checked }));
    icon?.replaceChildren(checkbox);

    if (anchor) {
      anchor.href = "#";
      anchor.removeAttribute("target");
      anchor.title = item.title;
      anchor.addEventListener("click", (event) => {
        if (event.target === checkbox) return;
        event.preventDefault();
        openTaskDialog(item);
      });
    }
    return card;
  }

  function renderGroup(type) {
    const definition = groups[type];
    const group = findGroup(definition.name);
    const list = getGroupList(group);
    const template = getTemplate(group, definition.templateId);
    if (!group || !list || !template) return false;

    const cards = [];
    if (state.loading) {
      cards.push(buildStatusCard(template, "加载中..."));
    } else if (state.error) {
      cards.push(buildStatusCard(template, "暂时不可用"));
    } else if (type === "countdowns") {
      state.countdowns.forEach((item) => cards.push(buildCountdownCard(template, item)));
    } else {
      state.tasks.forEach((item) => cards.push(buildTaskCard(template, item)));
    }
    cards.push(buildAddCard(template, type));
    group.dataset.portalToolsGroup = type;
    list.replaceChildren(...cards);
    return true;
  }

  function renderGroups() {
    renderGroup("countdowns");
    renderGroup("tasks");
  }

  async function loadData(showLoading = false) {
    if (showLoading) {
      state.loading = true;
      state.error = "";
      renderGroups();
    }
    try {
      const data = await request("");
      state.countdowns = Array.isArray(data.countdowns) ? data.countdowns : [];
      state.tasks = Array.isArray(data.tasks) ? data.tasks : [];
      state.error = "";
    } catch (requestError) {
      state.error = requestError.message;
    } finally {
      state.loading = false;
      renderGroups();
    }
  }

  function refreshCountdownValues() {
    state.countdowns.forEach((item) => {
      const card = Array.from(document.querySelectorAll(".portal-countdown-bookmark")).find(
        (candidate) => candidate.dataset.countdownId === item.id,
      );
      const description = card?.querySelector(".bookmark-description");
      if (description) description.textContent = `还有 ${daysUntil(item.target)} 天`;
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

  function formFooter(close, submitLabel, deleteHandler) {
    const footer = element("div", "portal-tools-form-footer");
    if (deleteHandler) footer.append(button("删除", "portal-tools-danger-button", "删除", deleteHandler));
    const actions = element("div", "portal-tools-form-actions");
    actions.append(button("取消", "portal-tools-secondary", "取消", close));
    const submit = button(submitLabel, "portal-tools-primary", submitLabel);
    submit.type = "submit";
    actions.append(submit);
    footer.append(actions);
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
    const footerState = formFooter(
      dialogState.close,
      item ? "保存" : "添加",
      item
        ? () => {
            dialogState.close();
            deleteCountdown(item);
          }
        : null,
    );
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
    const footerState = formFooter(
      dialogState.close,
      item ? "保存" : "添加",
      item
        ? () => {
            dialogState.close();
            deleteTask(item);
          }
        : null,
    );
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
      renderGroups();
    }
  }

  async function deleteCountdown(item) {
    if (!window.confirm(`删除“${item.label}”？`)) return;
    try {
      await request(`/countdowns/${encodeURIComponent(item.id)}`, { method: "DELETE" });
      await loadData();
    } catch (requestError) {
      state.error = requestError.message;
      renderGroups();
    }
  }

  async function deleteTask(item) {
    if (!window.confirm(`删除“${item.title}”？`)) return;
    try {
      await request(`/tasks/${encodeURIComponent(item.id)}`, { method: "DELETE" });
      await loadData();
    } catch (requestError) {
      state.error = requestError.message;
      renderGroups();
    }
  }

  function groupsNeedRender() {
    return Object.entries(groups).some(([type, definition]) => {
      const group = findGroup(definition.name);
      return group && group.dataset.portalToolsGroup !== type;
    });
  }

  function start() {
    renderGroups();
    loadData(true);
    window.setInterval(refreshCountdownValues, 60000);
    new MutationObserver(() => {
      if (groupsNeedRender()) renderGroups();
    }).observe(document.body, { childList: true, subtree: true });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", start, { once: true });
  } else {
    start();
  }
})();
