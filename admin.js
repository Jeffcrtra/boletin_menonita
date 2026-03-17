console.log("ADMIN JS CARGADO");

const supabaseUrl = "https://lomvwmrnfemuemrdamtu.supabase.co";
const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxvbXZ3bXJuZmVtdWVtcmRhbXR1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzMxNzU1NDQsImV4cCI6MjA4ODc1MTU0NH0.n_WHSZN-_TWdt5cSeQC7zanUCjb_MQ0AFFU-ULKFjPo";

const { createClient } = supabase;
const supabaseClient = createClient(supabaseUrl, supabaseKey);

const statusEl = document.getElementById("status");
const adminList = document.getElementById("adminList");
const filtroEstado = document.getElementById("filtroEstado");
const publicarBtn = document.getElementById("publicarBtn");
const publicarBtnWrap = document.getElementById("publicarBtnWrap");

const publicacionPanel = document.getElementById("publicacionPanel");
const publicacionList = document.getElementById("publicacionList");
const publicacionStatus = document.getElementById("publicacionStatus");
const cerrarPublicacionBtn = document.getElementById("cerrarPublicacionBtn");
const exportPdfBtn = document.getElementById("exportPdfBtn");
const boletinFecha = document.getElementById("boletinFecha");
const pdfContent = document.getElementById("pdfContent");

const ESTADOS = ["pendiente", "aprobado", "publicado", "rechazado"];

function setStatus(message, type = "") {
  if (!statusEl) return;
  statusEl.textContent = message;
  statusEl.className = `status ${type}`.trim();
}

function setPublicacionStatus(message, type = "") {
  if (!publicacionStatus) return;
  publicacionStatus.textContent = message;
  publicacionStatus.className = `status ${type}`.trim();
}

function escapeHtml(text) {
  if (text == null) return "";
  return String(text)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function formatFecha(value) {
  if (!value) return "—";
  try {
    return new Date(value).toLocaleString("es-CR");
  } catch {
    return value;
  }
}

function capitalizar(text) {
  if (!text) return "";
  return text.charAt(0).toUpperCase() + text.slice(1);
}

function getFechaBoletin() {
  const ahora = new Date();
  const mes = ahora.toLocaleDateString("es-CR", {
    month: "long",
    year: "numeric"
  });
  return mes.replace(/^./, (c) => c.toUpperCase());
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function esperarImagenes(container) {
  if (!container) return;

  const imagenes = Array.from(container.querySelectorAll("img"));
  if (imagenes.length === 0) return;

  await Promise.all(
    imagenes.map((img) => {
      if (img.complete) return Promise.resolve();

      return new Promise((resolve) => {
        const done = () => {
          img.removeEventListener("load", done);
          img.removeEventListener("error", done);
          resolve();
        };
        img.addEventListener("load", done);
        img.addEventListener("error", done);
      });
    })
  );
}

function renderImagenes(imagenes, cssClass = "admin-images") {
  if (!imagenes || !Array.isArray(imagenes) || imagenes.length === 0) {
    return `<p class="hint">Sin imágenes</p>`;
  }

  return `
    <div class="${cssClass}">
      ${imagenes.map((img) => `
        <a href="${escapeHtml(img.publicUrl)}" target="_blank" rel="noopener noreferrer">
          <img src="${escapeHtml(img.publicUrl)}" alt="${escapeHtml(img.name || "imagen")}" crossorigin="anonymous" />
        </a>
      `).join("")}
    </div>
  `;
}

function renderEstadoBadge(estado) {
  const safeEstado = escapeHtml(estado || "sin-estado");
  return `<span class="estado-badge estado-${safeEstado}">${capitalizar(safeEstado)}</span>`;
}

function renderCard(row) {
  return `
    <article class="admin-card">
      <div class="admin-card-top">
        <div>
          <h3>${escapeHtml(row.titulo || "Sin título")}</h3>
          <div class="hint">
            Código: ${escapeHtml(row.codigo_confirmacion || "—")} ·
            Estado actual: ${renderEstadoBadge(row.estado_editorial || "—")}
          </div>
        </div>

        <div class="admin-actions">
          <label class="sr-only" for="estado-${row.id}">Estado editorial</label>
          <select
            id="estado-${row.id}"
            data-id="${row.id}"
            data-estado-actual="${row.estado_editorial || ""}"
            class="estadoSelect"
          >
            ${ESTADOS.map((estado) => `
              <option value="${estado}" ${row.estado_editorial === estado ? "selected" : ""}>
                ${capitalizar(estado)}
              </option>
            `).join("")}
          </select>
        </div>
      </div>

      <div class="admin-meta">
        <p><strong>Iglesia:</strong> ${escapeHtml(row.iglesia || "—")}</p>
        <p><strong>Zona:</strong> ${escapeHtml(row.zona || "—")}</p>
        <p><strong>Autor:</strong> ${escapeHtml(row.autor || "—")}</p>
        <p><strong>Contacto:</strong> ${escapeHtml(row.contacto || "—")}</p>
        <p><strong>Categoría:</strong> ${escapeHtml(row.categoria || "—")}</p>
        <p><strong>Fecha del evento:</strong> ${escapeHtml(row.fecha_evento || "—")}</p>
        <p><strong>Recibido:</strong> ${formatFecha(row.fecha_recepcion || row.created_at)}</p>
      </div>

      <div class="admin-block">
        <strong>Texto e IA</strong>
        <p><strong>Texto IA:</strong> ${escapeHtml(row.texto_ai_estado || "—")}</p>
        <p><strong>Imágenes IA:</strong> ${escapeHtml(row.imagenes_ai_estado || "—")}</p>
      </div>

      <div class="admin-block">
        <strong>Contenido</strong>
        <div class="admin-content">${escapeHtml(row.contenido || "").replaceAll("\n", "<br>")}</div>
      </div>

      <div class="admin-block">
        <strong>Imágenes</strong>
        ${renderImagenes(row.imagenes, "admin-images")}
      </div>
    </article>
  `;
}

function renderPublicacionCard(row, index) {
  return `
    <article class="boletin-articulo print-page-break">
      <div class="boletin-articulo-head">
        <div>
          <p class="boletin-numero">Artículo ${index + 1}</p>
          <h2>${escapeHtml(row.titulo || "Sin título")}</h2>
        </div>
      </div>

      <div class="boletin-meta">
        <p><strong>Iglesia:</strong> ${escapeHtml(row.iglesia || "—")}</p>
        <p><strong>Zona:</strong> ${escapeHtml(row.zona || "—")}</p>
        <p><strong>Autor:</strong> ${escapeHtml(row.autor || "—")}</p>
        <p><strong>Categoría:</strong> ${escapeHtml(row.categoria || "—")}</p>
        <p><strong>Fecha del evento:</strong> ${escapeHtml(row.fecha_evento || "—")}</p>
      </div>

      <div class="boletin-contenido">
        ${escapeHtml(row.contenido || "").replaceAll("\n", "<br>")}
      </div>

      <div class="boletin-imagenes">
        ${renderImagenes(row.imagenes, "publicacion-images")}
      </div>
    </article>
  `;
}

async function cargarConteosEstados() {
  try {
    const { data, error } = await supabaseClient
      .from("boletin_envios")
      .select("estado_editorial");

    if (error) throw new Error(error.message);

    const conteos = {
      pendiente: 0,
      aprobado: 0,
      publicado: 0,
      rechazado: 0
    };

    for (const row of data || []) {
      const estado = (row.estado_editorial || "").trim().toLowerCase();
      if (Object.prototype.hasOwnProperty.call(conteos, estado)) {
        conteos[estado]++;
      }
    }

    actualizarOpcionesFiltro(conteos);
  } catch (error) {
    console.error("Error cargando conteos:", error);
  }
}

function actualizarOpcionesFiltro(conteos) {
  if (!filtroEstado) return;

  const valorActual = (filtroEstado.value || "pendiente").trim().toLowerCase();

  const total =
    (conteos.pendiente || 0) +
    (conteos.aprobado || 0) +
    (conteos.publicado || 0) +
    (conteos.rechazado || 0);

  filtroEstado.innerHTML = `
    <option value="pendiente">Pendiente (${conteos.pendiente || 0})</option>
    <option value="aprobado">Aprobado (${conteos.aprobado || 0})</option>
    <option value="publicado">Publicado (${conteos.publicado || 0})</option>
    <option value="rechazado">Rechazado (${conteos.rechazado || 0})</option>
    <option value="todos">Todos (${total})</option>
  `;

  const valoresValidos = ["pendiente", "aprobado", "publicado", "rechazado", "todos"];
  filtroEstado.value = valoresValidos.includes(valorActual) ? valorActual : "pendiente";

  actualizarVisibilidadBotonPublicar();
}

function actualizarVisibilidadBotonPublicar() {
  if (!publicarBtnWrap || !publicarBtn || !filtroEstado) return;

  const estado = (filtroEstado.value || "").trim().toLowerCase();
  const mostrar = estado === "aprobado";

  publicarBtnWrap.hidden = !mostrar;
  publicarBtn.hidden = !mostrar;
  publicarBtn.disabled = !mostrar;
}

async function cargarEnvios() {
  setStatus("Cargando envíos...");
  if (adminList) adminList.innerHTML = "";

  try {
    const estado = (filtroEstado?.value || "pendiente").trim().toLowerCase();

    let query = supabaseClient
      .from("boletin_envios")
      .select("*")
      .order("created_at", { ascending: false });

    if (estado !== "todos") {
      query = query.eq("estado_editorial", estado);
    }

    const { data, error } = await query;
    if (error) throw new Error(error.message);

    if (!data || data.length === 0) {
      if (adminList) {
        adminList.innerHTML = `<p class="hint">No hay envíos para este filtro.</p>`;
      }
      setStatus("Sin resultados.");
      await cargarConteosEstados();
      actualizarVisibilidadBotonPublicar();
      return;
    }

    if (adminList) {
      adminList.innerHTML = data.map(renderCard).join("");
    }

    bindEstadoAutosave();
    setStatus(`Se cargaron ${data.length} envío(s).`, "success");
    await cargarConteosEstados();
    actualizarVisibilidadBotonPublicar();
  } catch (error) {
    console.error(error);
    setStatus(`Error cargando envíos: ${error.message}`, "error");
  }
}

async function actualizarEstado(id, nuevoEstado) {
  try {
    const { data, error } = await supabaseClient
      .from("boletin_envios")
      .update({ estado_editorial: nuevoEstado })
      .eq("id", id)
      .select();

    if (error) throw new Error(error.message);
    return { ok: true, data };
  } catch (error) {
    console.error(error);
    return { ok: false, error };
  }
}

function bindEstadoAutosave() {
  document.querySelectorAll(".estadoSelect").forEach((select) => {
    select.addEventListener("change", async () => {
      const id = select.dataset.id;
      const estadoActual = select.dataset.estadoActual;
      const nuevoEstado = select.value;

      if (nuevoEstado === estadoActual) return;

      select.disabled = true;
      setStatus(`Guardando cambio a "${nuevoEstado}"...`);

      const result = await actualizarEstado(id, nuevoEstado);

      if (!result.ok) {
        select.value = estadoActual;
        setStatus(`Error actualizando estado: ${result.error.message}`, "error");
        select.disabled = false;
        return;
      }

      select.dataset.estadoActual = nuevoEstado;
      setStatus(`Estado actualizado a "${nuevoEstado}".`, "success");
      await cargarEnvios();
    });
  });
}

async function cargarAprobadosParaPublicacion() {
  if (!publicacionPanel || !publicacionList || !boletinFecha) return;

  publicacionPanel.hidden = false;
  publicacionList.innerHTML = "";
  boletinFecha.textContent = getFechaBoletin();
  setPublicacionStatus("Cargando artículos aprobados...");

  try {
    const { data, error } = await supabaseClient
      .from("boletin_envios")
      .select("*")
      .eq("estado_editorial", "aprobado")
      .order("created_at", { ascending: false });

    if (error) throw new Error(error.message);

    if (!data || data.length === 0) {
      publicacionList.innerHTML = `<p class="hint">No hay artículos aprobados para publicar.</p>`;
      setPublicacionStatus("No hay aprobados disponibles.");
      return;
    }

    publicacionList.innerHTML = data.map((row, index) => renderPublicacionCard(row, index)).join("");
    await esperarImagenes(publicacionList);
    setPublicacionStatus(`Se prepararon ${data.length} artículo(s) aprobados para maquetación.`, "success");
    publicacionPanel.scrollIntoView({ behavior: "smooth", block: "start" });
  } catch (error) {
    console.error(error);
    setPublicacionStatus(`Error preparando publicación: ${error.message}`, "error");
  }
}

async function marcarAprobadosComoPublicados() {
  try {
    const { data: aprobados, error: errorConsulta } = await supabaseClient
      .from("boletin_envios")
      .select("id")
      .eq("estado_editorial", "aprobado");

    if (errorConsulta) throw new Error(errorConsulta.message);

    if (!aprobados || aprobados.length === 0) {
      return { ok: true, total: 0 };
    }

    const ids = aprobados.map((item) => item.id);

    const { error: errorUpdate } = await supabaseClient
      .from("boletin_envios")
      .update({ estado_editorial: "publicado" })
      .in("id", ids);

    if (errorUpdate) throw new Error(errorUpdate.message);

    return { ok: true, total: ids.length };
  } catch (error) {
    console.error(error);
    return { ok: false, error };
  }
}

function getPrintStyles() {
  return `
    <style>
      @page {
        size: A4;
        margin: 16mm;
      }

      * {
        box-sizing: border-box;
      }

      html, body {
        margin: 0;
        padding: 0;
        background: #ffffff;
        color: #111111;
        font-family: Arial, Helvetica, sans-serif;
        font-size: 12pt;
        line-height: 1.5;
      }

      body {
        padding: 0;
      }

      .print-root {
        width: 100%;
      }

      .boletin-cover {
        text-align: center;
        padding: 24px 0 16px;
        border-bottom: 2px solid #222;
        margin-bottom: 24px;
        page-break-after: always;
        break-after: page;
      }

      .boletin-kicker {
        margin: 0 0 8px;
        font-size: 11pt;
        letter-spacing: 1px;
        text-transform: uppercase;
      }

      .boletin-cover h1 {
        margin: 0 0 12px;
        font-size: 24pt;
        line-height: 1.2;
      }

      .boletin-subtitle,
      .boletin-org {
        margin: 6px 0;
        font-size: 12pt;
      }

      .publicacion-list {
        width: 100%;
      }

      .boletin-articulo {
        width: 100%;
        margin: 0 0 24px;
        padding: 0 0 18px;
        border-bottom: 1px solid #ccc;
        page-break-inside: avoid;
        break-inside: avoid;
      }

      .boletin-articulo.print-page-break {
        page-break-before: auto;
      }

      .boletin-articulo:not(:last-child) {
        page-break-after: always;
        break-after: page;
      }

      .boletin-numero {
        margin: 0 0 6px;
        font-size: 10pt;
        text-transform: uppercase;
      }

      .boletin-articulo h2 {
        margin: 0 0 14px;
        font-size: 18pt;
        line-height: 1.25;
      }

      .boletin-meta {
        margin-bottom: 14px;
      }

      .boletin-meta p {
        margin: 2px 0;
      }

      .boletin-contenido {
        margin: 14px 0 16px;
        white-space: normal;
        word-break: break-word;
      }

      .publicacion-images,
      .boletin-imagenes {
        display: block;
        width: 100%;
      }

      .publicacion-images a,
      .boletin-imagenes a {
        text-decoration: none;
      }

      .publicacion-images img,
      .boletin-imagenes img {
        display: block;
        width: 100%;
        max-width: 100%;
        height: auto;
        margin: 0 0 12px;
        border-radius: 0;
        break-inside: avoid;
        page-break-inside: avoid;
      }

      .hint {
        color: #666;
        font-style: italic;
      }
    </style>
  `;
}

function getPrintHtml() {
  if (!pdfContent) return "";

  return `
    <!DOCTYPE html>
    <html lang="es">
    <head>
      <meta charset="UTF-8" />
      <title>Boletín Menonita</title>
      ${getPrintStyles()}
    </head>
    <body>
      <div class="print-root">
        ${pdfContent.outerHTML}
      </div>
    </body>
    </html>
  `;
}

async function exportarPdf() {
  if (!exportPdfBtn || !pdfContent) return;

  try {
    exportPdfBtn.disabled = true;
    setPublicacionStatus("Preparando vista de impresión...");

    await esperarImagenes(pdfContent);
    await sleep(300);

    const printWindow = window.open("", "_blank", "width=900,height=1200");

    if (!printWindow) {
      throw new Error("El navegador bloqueó la ventana emergente de impresión.");
    }

    printWindow.document.open();
    printWindow.document.write(getPrintHtml());
    printWindow.document.close();

    await new Promise((resolve) => {
      printWindow.onload = resolve;
      setTimeout(resolve, 1200);
    });

    await sleep(500);

    const imgs = Array.from(printWindow.document.images || []);
    await Promise.all(
      imgs.map((img) => {
        if (img.complete) return Promise.resolve();
        return new Promise((resolve) => {
          img.onload = resolve;
          img.onerror = resolve;
        });
      })
    );

    setPublicacionStatus("Abriendo diálogo para guardar como PDF...", "success");

    printWindow.focus();
    printWindow.print();

    const cambiarEstados = window.confirm(
      'Cuando termines de guardar/imprimir el PDF, ¿deseas cambiar automáticamente todos los artículos "aprobado" a "publicado"?'
    );

    if (!cambiarEstados) {
      exportPdfBtn.disabled = false;
      return;
    }

    setPublicacionStatus('Actualizando artículos a "publicado"...');

    const result = await marcarAprobadosComoPublicados();

    if (!result.ok) {
      setPublicacionStatus(
        `Se abrió la impresión, pero hubo un error actualizando estados: ${result.error.message}`,
        "error"
      );
      exportPdfBtn.disabled = false;
      return;
    }

    setPublicacionStatus(`Impresión lista y ${result.total} artículo(s) pasaron a "publicado".`, "success");
    setStatus(`Se publicaron ${result.total} artículo(s).`, "success");

    cerrarPanelPublicacion();
    if (filtroEstado) {
      filtroEstado.value = "publicado";
    }
    actualizarVisibilidadBotonPublicar();
    await cargarEnvios();
  } catch (error) {
    console.error(error);
    setPublicacionStatus(`Error exportando/imprimiendo PDF: ${error.message}`, "error");
  } finally {
    exportPdfBtn.disabled = false;
  }
}

function cerrarPanelPublicacion() {
  if (publicacionPanel) {
    publicacionPanel.hidden = true;
  }
  if (publicacionList) {
    publicacionList.innerHTML = "";
  }
  setPublicacionStatus("");
}

filtroEstado?.addEventListener("change", async () => {
  actualizarVisibilidadBotonPublicar();
  await cargarEnvios();
});

publicarBtn?.addEventListener("click", async () => {
  const estado = (filtroEstado?.value || "").trim().toLowerCase();
  if (estado !== "aprobado") return;
  await cargarAprobadosParaPublicacion();
});

cerrarPublicacionBtn?.addEventListener("click", cerrarPanelPublicacion);
exportPdfBtn?.addEventListener("click", exportarPdf);

if (publicarBtnWrap) publicarBtnWrap.hidden = true;
if (publicarBtn) publicarBtn.hidden = true;
if (publicacionPanel) publicacionPanel.hidden = true;

actualizarVisibilidadBotonPublicar();
cargarEnvios();
