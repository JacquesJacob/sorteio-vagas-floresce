const state = {
  latestDraw: null,
  revealTimer: null,
  modalCloseTimer: null,
  isAnimating: false,
  editingApartmentId: null,
  drawSpeedMultiplier: 1,
};

const statsNode = document.querySelector("#stats");
const apartmentsBody = document.querySelector("#apartments-body");
const resultsBody = document.querySelector("#results-body");
const historyList = document.querySelector("#history-list");
const drawSummary = document.querySelector("#draw-summary");
const downloadAuditButton = document.querySelector("#download-audit");
const downloadResultsCsvButton = document.querySelector("#download-results-csv");
const downloadResultsExcelButton = document.querySelector("#download-results-excel");
const statusBadge = document.querySelector("#status-badge");
const configSummary = document.querySelector("#config-summary");
const drawButton = document.querySelector("#draw-button");
const drawButtonText = document.querySelector(".draw-button-text");
const machineReel = document.querySelector("#machine-reel");
const machineTitle = document.querySelector("#machine-title");
const machineSubtitle = document.querySelector("#machine-subtitle");
const lotteryMachine = document.querySelector("#lottery-machine");
const drawModal = document.querySelector("#draw-modal");
const drawModalTitle = document.querySelector("#draw-modal-title");
const drawModalLot = document.querySelector("#draw-modal-lot");
const drawModalApartment = document.querySelector("#draw-modal-apartment");
const drawModalPercent = document.querySelector("#draw-modal-percent");
const drawModalCounter = document.querySelector("#draw-modal-counter");
const drawModalEta = document.querySelector("#draw-modal-eta");
const drawModalNote = document.querySelector("#draw-modal-note");
const drawModalProgressFill = document.querySelector("#draw-modal-progress-fill");
const drawModalCancelButton = document.querySelector("#draw-modal-cancel-button");
const drawSpeed2xButton = document.querySelector("#draw-speed-2x-button");
const drawSpeed4xButton = document.querySelector("#draw-speed-4x-button");
const editModal = document.querySelector("#edit-modal");
const editApartmentForm = document.querySelector("#edit-apartment-form");
const editCancelButton = document.querySelector("#edit-cancel-button");

async function api(path, options = {}) {
  const response = await fetch(path, {
    headers: {
      "Content-Type": "application/json",
    },
    ...options,
  });

  const payload = await response.json();

  if (!response.ok) {
    throw new Error(payload.error || "Erro na requisicao.");
  }

  return payload;
}

function statCard(label, value) {
  const template = document.querySelector("#stat-card-template");
  const card = template.content.firstElementChild.cloneNode(true);
  card.querySelector(".stat-label").textContent = label;
  card.querySelector(".stat-value").textContent = value;
  return card;
}

function renderStats(data) {
  statsNode.innerHTML = "";
  statsNode.append(
    statCard("Apartamentos", data.stats.apartmentCount),
    statCard("Lotes", data.stats.lotCount),
    statCard("Vagas por lote", data.stats.spacesPerLot),
    statCard("Vagas totais", data.stats.totalSpaces)
  );
}

function renderConfigSummary(summary) {
  const blockLines = Object.entries(summary.blocks)
    .map(([block, count]) => `${escapeHtml(block)}: ${count} apartamentos`)
    .join("<br />");

  const assumptions = summary.assumptions
    .map((item) => `<li>${escapeHtml(item)}</li>`)
    .join("");

  configSummary.innerHTML = `
    <div><strong>Condominio:</strong> ${escapeHtml(summary.condominiumName)}</div>
    <div><strong>Andares por bloco:</strong> ${summary.floorsPerBlock}</div>
    <div><strong>Distribuicao atual:</strong><br />${blockLines}</div>
    <div><strong>Padrao de rotulo:</strong> ${escapeHtml(summary.apartmentLabelPattern)}</div>
    <div>
      <strong>Premissas desta V1:</strong>
      <ul>${assumptions}</ul>
    </div>
  `;
}

function renderApartmentPreview(apartments) {
  apartmentsBody.innerHTML = "";

  apartments.forEach((apartment) => {
    const row = document.createElement("tr");
    row.innerHTML = `
      <td>${escapeHtml(apartment.block)}</td>
      <td>${apartment.floor}</td>
      <td>${escapeHtml(apartment.label)}</td>
      <td><button type="button" class="secondary table-button" data-edit-apartment="${apartment.id}" data-block="${escapeHtml(apartment.block)}" data-label="${escapeHtml(apartment.label)}">Editar</button></td>
    `;
    apartmentsBody.appendChild(row);
  });
}

function openEditModal(apartmentId, block, label) {
  state.editingApartmentId = apartmentId;
  const number = String(label).replace(`${block} `, "").trim();
  editApartmentForm.elements.block.value = block;
  editApartmentForm.elements.number.value = number;
  editModal.hidden = false;
  document.body.classList.add("modal-open");
}

function closeEditModal() {
  state.editingApartmentId = null;
  editModal.hidden = true;
  if (drawModal.hidden) {
    document.body.classList.remove("modal-open");
  }
}

function resetMachine() {
  lotteryMachine.classList.remove("is-running", "is-finished");
  machineReel.innerHTML = "<span>Pronto para sortear</span>";
  machineTitle.textContent = "Aguardando inicio";
  machineSubtitle.textContent = "Clique no botao para rodar o sorteio automatico.";
}

function setDrawButtonRunning(isRunning) {
  state.isAnimating = isRunning;
  drawButton.disabled = isRunning;
  drawButton.classList.toggle("is-running", isRunning);
  drawButtonText.textContent = isRunning ? "Sorteando e registrando..." : "Sortear e registrar";

  if (!isRunning) {
    state.drawSpeedMultiplier = 1;
    updateSpeedButtons();
  }
}

function clearAnimationTimers() {
  if (state.revealTimer) {
    clearTimeout(state.revealTimer);
    state.revealTimer = null;
  }

  if (state.modalCloseTimer) {
    clearTimeout(state.modalCloseTimer);
    state.modalCloseTimer = null;
  }
}

function setSummaryForIdle(draw) {
  drawSummary.classList.remove("drawing");
  drawSummary.classList.toggle("empty", !draw);

  if (!draw) {
    drawSummary.textContent = "Nenhum sorteio executado ainda.";
    return;
  }

  drawSummary.innerHTML = `
    <strong>Seed:</strong> ${escapeHtml(draw.seed)}<br />
    <strong>Executado em:</strong> ${formatDate(draw.executedAt)}<br />
    <strong>Hash de auditoria:</strong> <code>${escapeHtml(draw.auditHash)}</code><br />
    <strong>Status:</strong> sorteio salvo e registrado no banco local.
  `;
}

function setExportButtonsDisabled(isDisabled) {
  downloadAuditButton.disabled = isDisabled;
  downloadResultsCsvButton.disabled = isDisabled;
  downloadResultsExcelButton.disabled = isDisabled;
}

function appendResultRow(assignment) {
  const row = document.createElement("tr");
  row.className = "result-row-enter";
  row.innerHTML = `
    <td>${escapeHtml(assignment.lotLabel)}</td>
    <td>${escapeHtml(assignment.apartmentLabel)}</td>
    <td>${escapeHtml(assignment.block)}</td>
    <td>${assignment.floor}</td>
  `;
  resultsBody.appendChild(row);
  row.scrollIntoView({ block: "nearest" });
}

function renderAllAssignments(draw) {
  resultsBody.innerHTML = "";
  draw.assignments.forEach(appendResultRow);
}

function openDrawModal(totalLots) {
  drawModal.hidden = false;
  document.body.classList.add("modal-open");
  drawModal.classList.remove("is-finished");
  state.drawSpeedMultiplier = 1;
  updateSpeedButtons();
  drawModalTitle.textContent = "Preparando sorteio";
  drawModalLot.textContent = "Lote --";
  drawModalApartment.textContent = "Aguardando primeiro resultado...";
  drawModalPercent.textContent = "0%";
  drawModalCounter.textContent = `0 de ${totalLots} lotes`;
  drawModalEta.textContent = `Tempo restante estimado: ${formatRemainingTime(totalLots / state.drawSpeedMultiplier)}.`;
  drawModalNote.textContent = "O sorteio ja foi salvo no banco local e esta sendo exibido lote por lote.";
  drawModalProgressFill.style.width = "0%";
}

function closeDrawModal() {
  drawModal.hidden = true;
  drawModal.classList.remove("is-finished");
  if (editModal.hidden) {
    document.body.classList.remove("modal-open");
  }
}

function updateSpeedButtons() {
  drawSpeed2xButton.classList.toggle("is-active", state.drawSpeedMultiplier === 2);
  drawSpeed4xButton.classList.toggle("is-active", state.drawSpeedMultiplier === 4);
}

async function cancelCurrentDraw() {
  if (!state.latestDraw) {
    closeDrawModal();
    return;
  }

  const confirmed = window.confirm(
    "Deseja cancelar este sorteio? Todos os dados deste sorteio serao cancelados e removidos do registro local."
  );

  if (!confirmed) {
    return;
  }

  clearAnimationTimers();
  setDrawButtonRunning(false);
  await api(`/api/draws/${state.latestDraw.drawId}`, {
    method: "DELETE",
  });
  state.latestDraw = null;
  closeDrawModal();
  resultsBody.innerHTML = "";
  drawSummary.classList.remove("drawing");
  drawSummary.classList.add("empty");
  drawSummary.textContent = "Sorteio cancelado. Nenhum resultado foi mantido.";
  statusBadge.textContent = "Sorteio cancelado";
  machineTitle.textContent = "Sorteio cancelado";
  machineSubtitle.textContent = "Todos os dados deste sorteio foram removidos do banco local.";
  machineReel.innerHTML = "<span>Sorteio cancelado</span>";
  lotteryMachine.classList.remove("is-running", "is-finished");
  await refresh();
}

function updateDrawModal(assignment, index, totalLots) {
  const rawPercent = (index / totalLots) * 100;
  const percent = index === totalLots ? "100" : rawPercent.toFixed(1);
  const remainingLots = Math.max(totalLots - index, 0);
  drawModalTitle.textContent = "Sorteando lotes";
  drawModalLot.textContent = assignment.lotLabel;
  drawModalApartment.textContent = assignment.apartmentLabel;
  drawModalPercent.textContent = `${percent}%`;
  drawModalCounter.textContent = `${index} de ${totalLots} lotes`;
  drawModalEta.textContent =
    remainingLots > 0
      ? `Tempo restante estimado: ${formatRemainingTime(remainingLots / state.drawSpeedMultiplier)}.`
      : "Tempo restante estimado: concluindo...";
  drawModalProgressFill.style.width = `${percent}%`;
  drawModalNote.textContent = `Bloco ${assignment.block}, andar ${assignment.floor}.`;
}

function formatRemainingTime(totalSeconds) {
  const roundedSeconds = Math.max(0, Math.ceil(totalSeconds));
  const minutes = Math.floor(roundedSeconds / 60);
  const seconds = roundedSeconds % 60;

  if (minutes <= 0) {
    return `${seconds}s`;
  }

  if (seconds === 0) {
    return `${minutes}min`;
  }

  return `${minutes}min ${seconds}s`;
}

function renderDraw(draw, options = {}) {
  const { animated = false } = options;

  state.latestDraw = draw;
  setExportButtonsDisabled(!draw);
  clearAnimationTimers();

  if (!draw) {
    resultsBody.innerHTML = "";
    setSummaryForIdle(null);
    resetMachine();
    closeDrawModal();
    return;
  }

  if (!animated) {
    renderAllAssignments(draw);
    setSummaryForIdle(draw);
    machineTitle.textContent = "Sorteio concluido";
    machineSubtitle.textContent = "Resultado completo disponivel na tabela abaixo.";
    machineReel.innerHTML = `<span>${escapeHtml(draw.assignments[0].lotLabel)} • ${escapeHtml(draw.assignments[0].apartmentLabel)}</span>`;
    lotteryMachine.classList.add("is-finished");
    closeDrawModal();
    return;
  }

  resultsBody.innerHTML = "";
  drawSummary.classList.remove("empty");
  drawSummary.classList.add("drawing");
  drawSummary.innerHTML = `
    <strong>Sorteio em andamento</strong><br />
    Preparando embaralhamento auditavel, salvando no banco local e revelando os lotes...
  `;

  lotteryMachine.classList.remove("is-finished");
  lotteryMachine.classList.add("is-running");
  machineTitle.textContent = "Sorteio randomico em execucao";
  machineSubtitle.textContent = "Cada lote sera exibido por 1 segundo e o progresso vai de 0% a 100%.";
  machineReel.innerHTML = "<span>Primeiro lote saindo...</span>";
  openDrawModal(draw.assignments.length);

  let currentIndex = 0;

  function revealNext() {
    if (currentIndex >= draw.assignments.length) {
      clearAnimationTimers();
      setSummaryForIdle(draw);
      lotteryMachine.classList.remove("is-running");
      lotteryMachine.classList.add("is-finished");
      machineTitle.textContent = "Sorteio concluido";
      machineSubtitle.textContent = "Todos os lotes foram sorteados, salvos e auditados.";
      machineReel.innerHTML = `<span>${escapeHtml(draw.assignments[draw.assignments.length - 1].lotLabel)} • ${escapeHtml(draw.assignments[draw.assignments.length - 1].apartmentLabel)}</span>`;
      drawModal.classList.add("is-finished");
      drawModalTitle.textContent = "Sorteio concluido";
      drawModalEta.textContent = "Tempo restante estimado: 5s para fechar a janela.";
      drawModalNote.textContent = "A janela sera fechada automaticamente em 5 segundos.";
      drawModalPercent.textContent = "100%";
      drawModalProgressFill.style.width = "100%";
      setDrawButtonRunning(false);
      state.modalCloseTimer = setTimeout(() => {
        closeDrawModal();
      }, 5000);
      return;
    }

    const assignment = draw.assignments[currentIndex];
    currentIndex += 1;

    appendResultRow(assignment);
    updateDrawModal(assignment, currentIndex, draw.assignments.length);
    machineReel.innerHTML = `<span>${escapeHtml(assignment.lotLabel)} • ${escapeHtml(assignment.apartmentLabel)}</span>`;
    machineTitle.textContent = "Sorteio randomico em execucao";
    machineSubtitle.textContent = `${currentIndex} de ${draw.assignments.length} lotes revelados.`;
    drawSummary.innerHTML = `
      <strong>Sorteio em andamento</strong><br />
      ${currentIndex} de ${draw.assignments.length} lotes ja foram exibidos e registrados.
    `;

    state.revealTimer = setTimeout(revealNext, 1000 / state.drawSpeedMultiplier);
  }

  state.revealTimer = setTimeout(revealNext, 1000 / state.drawSpeedMultiplier);
}

function renderHistory(draws) {
  historyList.innerHTML = "";

  if (!draws.length) {
    historyList.innerHTML = '<div class="muted">Nenhum sorteio salvo ainda.</div>';
    return;
  }

  draws.forEach((draw) => {
    const item = document.createElement("article");
    item.className = "history-item";
    item.dataset.drawId = draw.drawId;

    if (state.latestDraw && state.latestDraw.drawId === draw.drawId) {
      item.classList.add("is-active");
    }

    item.innerHTML = `
      <strong>${formatDate(draw.executedAt)}</strong>
      <span>Seed: ${escapeHtml(draw.seed)}</span>
      <span><code>${escapeHtml(draw.auditHash)}</code></span>
      <small>Clique para abrir os detalhes deste sorteio</small>
    `;
    historyList.appendChild(item);
  });
}

function formatDate(dateText) {
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "medium",
  }).format(new Date(dateText));
}

function formatFileTimestamp(dateText) {
  const date = new Date(dateText);
  const year = String(date.getFullYear());
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  const seconds = String(date.getSeconds()).padStart(2, "0");

  return `${year}-${month}-${day}_${hours}-${minutes}-${seconds}`;
}

function downloadBlob(filename, blob) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => {
    URL.revokeObjectURL(url);
  }, 0);
}

function getResultsExportRows(draw) {
  return draw.assignments.map((assignment) => ({
    lote: assignment.lotLabel,
    apartamento: assignment.apartmentLabel,
    bloco: assignment.block,
    andar: assignment.floor,
  }));
}

function escapeCsvValue(value) {
  return `"${String(value ?? "").replaceAll('"', '""')}"`;
}

function escapeExcelValue(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function exportResultsCsv(draw) {
  const rows = getResultsExportRows(draw);
  const csvLines = [
    ["Lote", "Apartamento", "Bloco", "Andar"].map(escapeCsvValue).join(";"),
    ...rows.map((row) =>
      [row.lote, row.apartamento, row.bloco, row.andar].map(escapeCsvValue).join(";")
    ),
  ];

  const blob = new Blob([`\uFEFF${csvLines.join("\n")}`], {
    type: "text/csv;charset=utf-8;",
  });

  downloadBlob(`resultado-sorteio-${formatFileTimestamp(draw.executedAt)}.csv`, blob);
}

function exportResultsExcel(draw) {
  const rows = getResultsExportRows(draw);
  const tableRows = rows
    .map(
      (row) => `
        <tr>
          <td>${escapeExcelValue(row.lote)}</td>
          <td>${escapeExcelValue(row.apartamento)}</td>
          <td>${escapeExcelValue(row.bloco)}</td>
          <td>${escapeExcelValue(row.andar)}</td>
        </tr>
      `
    )
    .join("");

  const documentContent = `
    <html xmlns:o="urn:schemas-microsoft-com:office:office"
          xmlns:x="urn:schemas-microsoft-com:office:excel"
          xmlns="http://www.w3.org/TR/REC-html40">
      <head>
        <meta charset="UTF-8" />
        <meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
        <style>
          table { border-collapse: collapse; width: 100%; }
          th, td { border: 1px solid #b7c6d6; padding: 8px; text-align: left; }
          th { background: #dff7ef; }
        </style>
      </head>
      <body>
        <table>
          <thead>
            <tr>
              <th>Lote</th>
              <th>Apartamento</th>
              <th>Bloco</th>
              <th>Andar</th>
            </tr>
          </thead>
          <tbody>${tableRows}</tbody>
        </table>
      </body>
    </html>
  `;

  const blob = new Blob([`\uFEFF${documentContent}`], {
    type: "application/vnd.ms-excel;charset=utf-8;",
  });

  downloadBlob(`resultado-sorteio-${formatFileTimestamp(draw.executedAt)}.xls`, blob);
}

function escapeHtml(text) {
  return String(text)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

async function refresh(options = {}) {
  const data = await api("/api/state");
  renderStats(data);
  renderConfigSummary(data.configSummary);
  renderApartmentPreview(data.apartments);

  if (!options.preserveCurrentDraw || !state.latestDraw || !state.isAnimating) {
    renderDraw(data.latestDraw);
  }

  renderHistory(data.draws);

  statusBadge.textContent = "Pronto para uso offline";
}

async function openHistoryDraw(drawId) {
  if (!drawId || state.isAnimating) {
    return;
  }

  const response = await api(`/api/draws/${encodeURIComponent(drawId)}`);
  renderDraw(response.draw);
  renderHistory((await api("/api/state")).draws);
  statusBadge.textContent = "Detalhes do historico carregados";
}

document.querySelector("#draw-form").addEventListener("submit", async (event) => {
  event.preventDefault();
  const form = event.currentTarget;

  if (state.isAnimating) {
    return;
  }

  const formData = new FormData(form);
  setDrawButtonRunning(true);
  statusBadge.textContent = "Sorteio em execucao";

  try {
    const response = await api("/api/draws", {
      method: "POST",
      body: JSON.stringify({
        seed: formData.get("seed"),
      }),
    });

    form.reset();
    renderDraw(response.draw, { animated: true });
    await refresh({ preserveCurrentDraw: true });
  } catch (error) {
    setDrawButtonRunning(false);
    statusBadge.textContent = "Erro ao sortear";
    setSummaryForIdle(null);
    machineTitle.textContent = "Falha ao sortear";
    machineSubtitle.textContent = error.message;
    throw error;
  }
});

document.querySelector("#clear-history").addEventListener("click", async () => {
  const confirmed = window.confirm("Deseja apagar todo o historico de sorteios?");
  if (!confirmed) {
    return;
  }

  clearAnimationTimers();
  setDrawButtonRunning(false);
  await api("/api/draws", { method: "DELETE" });
  await refresh();
});

drawModalCancelButton.addEventListener("click", async () => {
  try {
    await cancelCurrentDraw();
  } catch (error) {
    statusBadge.textContent = "Erro ao cancelar";
    drawModalNote.textContent = error.message;
  }
});

drawSpeed2xButton.addEventListener("click", () => {
  state.drawSpeedMultiplier = 2;
  updateSpeedButtons();
});

drawSpeed4xButton.addEventListener("click", () => {
  state.drawSpeedMultiplier = 4;
  updateSpeedButtons();
});

historyList.addEventListener("click", async (event) => {
  const item = event.target.closest("[data-draw-id]");
  if (!item) {
    return;
  }

  try {
    await openHistoryDraw(item.dataset.drawId);
  } catch (error) {
    statusBadge.textContent = "Erro ao abrir historico";
    drawSummary.textContent = error.message;
  }
});

apartmentsBody.addEventListener("click", (event) => {
  const button = event.target.closest("[data-edit-apartment]");
  if (!button) {
    return;
  }

  openEditModal(
    button.dataset.editApartment,
    button.dataset.block,
    button.dataset.label
  );
});

editCancelButton.addEventListener("click", () => {
  closeEditModal();
});

editApartmentForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  if (!state.editingApartmentId) {
    return;
  }

  const formData = new FormData(editApartmentForm);
  await api(`/api/apartments/${encodeURIComponent(state.editingApartmentId)}`, {
    method: "PUT",
    body: JSON.stringify({
      block: formData.get("block"),
      number: formData.get("number"),
    }),
  });

  closeEditModal();
  await refresh({ preserveCurrentDraw: true });
});

downloadAuditButton.addEventListener("click", () => {
  if (!state.latestDraw) {
    return;
  }

  const blob = new Blob([JSON.stringify(state.latestDraw, null, 2)], {
    type: "application/json",
  });
  downloadBlob(`auditoria-${state.latestDraw.drawId}.json`, blob);
});

downloadResultsCsvButton.addEventListener("click", () => {
  if (!state.latestDraw) {
    return;
  }

  exportResultsCsv(state.latestDraw);
});

downloadResultsExcelButton.addEventListener("click", () => {
  if (!state.latestDraw) {
    return;
  }

  exportResultsExcel(state.latestDraw);
});

refresh().catch((error) => {
  statusBadge.textContent = "Erro ao carregar";
  drawSummary.textContent = error.message;
});
