console.log("ADMIN JS CARGADO");

const supabaseUrl = "https://lomvwmrnfemuemrdamtu.supabase.co";
const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxvbXZ3bXJuZmVtdWVtcmRhbXR1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzMxNzU1NDQsImV4cCI6MjA4ODc1MTU0NH0.n_WHSZN-_TWdt5cSeQC7zanUCjb_MQ0AFFU-ULKFjPo";

const { createClient } = supabase;
const supabaseClient = createClient(supabaseUrl, supabaseKey);

const statusEl = document.getElementById("status");
const adminList = document.getElementById("adminList");
const filtroEstado = document.getElementById("filtroEstado");
const reloadBtn = document.getElementById("reloadBtn");
const publicarBtn = document.getElementById("publicarBtn");

const publicacionPanel = document.getElementById("publicacionPanel");
const publicacionList = document.getElementById("publicacionList");
const publicacionStatus = document.getElementById("publicacionStatus");
const marcarPublicadosBtn = document.getElementById("marcarPublicadosBtn");
const cerrarPublicacionBtn = document.getElementById("cerrarPublicacionBtn");

const ESTADOS = ["pendiente", "aprobado", "publicado", "rechazado"];

function setStatus(message, type = "") {
  statusEl.textContent = message;
  statusEl.className = `status ${type}`.trim();
}

function setPublicacionStatus(message, type = "") {
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

function renderImagenes(imagenes) {
  if (!imagenes || !Array.isArray(imagenes) || imagenes.length === 0) {
    return `<p class="hint">Sin imágenes</p>`;
  }

  return `
    <div class="admin-images">
      ${imagenes.map((img) => `
        <a href="${escapeHtml(img.publicUrl)}" target="_blank" rel="noopener noreferrer">
          <img src="${escapeHtml(img.publicUrl)}" alt="${escapeHtml(img.name || "imagen")}" />
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
        ${renderImagenes(row.imagenes)}
      </div>
    </article>
  `;
}

function renderPublicacionCard(row) {
  return `
    <article class="publicacion-card">
      <div class="publicacion-card-top">
        <h3>${escapeHtml(row.titulo || "Sin título")}</h3>
        ${renderEstadoBadge(row.estado_editorial || "—")}
      </div>

      <div class="publicacion-meta">
        <p><strong>Iglesia:</strong> ${escapeHtml(row.iglesia || "—")}</p>
        <p><strong>Zona:</strong> ${escapeHtml(row.zona || "—")}</p>
        <p><strong>Autor:</strong> ${escapeHtml(row.autor || "—")}</p>
        <p><strong>Categoría:</strong> ${escapeHtml(row.categoria || "—")}</p>
        <p><strong>Fecha del evento:</strong> ${escapeHtml(row.fecha_evento || "—")}</p>
      </div>

      <div class="publicacion-content">
        ${escapeHtml(row.contenido || "").replaceAll("\n", "<br>")}
      </div>

      <div class="publicacion-images">
        ${renderImagenes(row.imagenes)}
      </div>
    </article>
  `;
}

async function cargarConteosEstados() {
  try {
    const { data, error } = await supabaseClient
      .from("boletin_envios")
      .select("estado_editorial");

    if (error) {
      throw new Error(error.message);
    }

    const conteos = {
      pendiente: 0,
      aprobado: 0,
      publicado: 0,
      rechazado: 0
    };

    for (const row of data || []) {
      const estado = row.estado_editorial;
      if (conteos.hasOwnProperty(estado)) {
        conteos[estado]++;
      }
    }

    actualizarOpcionesFiltro(conteos);
  } catch (error) {
    console.error("Error cargando conteos:", error);
  }
}

function actualizarOpcionesFiltro(conteos) {
  const valorActual = filtroEstado.value || "pendiente";
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

  filtroEstado.value = valorActual;
}

async function cargarEnvios() {
  setStatus("Cargando envíos...");
  adminList.innerHTML = "";

  try {
    const estado = filtroEstado.value;
    console.log("Filtro actual:", estado);

    let query = supabaseClient
      .from("boletin_envios")
      .select("*")
      .order("created_at", { ascending: false });

    if (estado !== "todos") {
      query = query.eq("estado_editorial", estado);
    }

    const { data, error } = await query;

    if (error) {
      throw new Error(error.message);
    }

    console.log("Envíos cargados:", data);

    if (!data || data.length === 0) {
      adminList.innerHTML = `<p class="hint">No hay envíos para este filtro.</p>`;
      setStatus("Sin resultados.");
      return;
    }

    adminList.innerHTML = data.map(renderCard).join("");
    setStatus(`Se cargaron ${data.length} envío(s).`, "success");
    bindEstadoAutosave();
    await cargarConteosEstados();
  } catch (error) {
    console.error(error);
    setStatus(`Error cargando envíos: ${error.message}`, "error");
  }
}

async function actualizarEstado(id, nuevoEstado) {
  try {
    console.log("Actualizando estado:", { id, nuevoEstado });

    const { data, error } = await supabaseClient
      .from("boletin_envios")
      .update({ estado_editorial: nuevoEstado })
      .eq("id", id)
      .select();

    if (error) {
      throw new Error(error.message);
    }

    console.log("Resultado update:", data);
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

      if (nuevoEstado === estadoActual) {
        return;
      }

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
  publicacionPanel.classList.remove("hidden");
  publicacionList.innerHTML = "";
  setPublicacionStatus("Cargando aprobados...");

  try {
    const { data, error } = await supabaseClient
      .from("boletin_envios")
      .select("*")
      .eq("estado_editorial", "aprobado")
      .order("created_at", { ascending: false });

    if (error) {
      throw new Error(error.message);
    }

    if (!data || data.length === 0) {
      publicacionList.innerHTML = `<p class="hint">No hay envíos aprobados para publicar.</p>`;
      setPublicacionStatus("No hay aprobados disponibles.");
      return;
    }

    publicacionList.innerHTML = data.map(renderPublicacionCard).join("");
    setPublicacionStatus(`Se cargaron ${data.length} envío(s) aprobados.`, "success");
  } catch (error) {
    console.error(error);
    setPublicacionStatus(`Error cargando aprobados: ${error.message}`, "error");
  }
}

async function marcarAprobadosComoPublicados() {
  const confirmar = window.confirm(
    'Esto cambiará todos los envíos con estado "aprobado" a "publicado". ¿Deseas continuar?'
  );

  if (!confirmar) return;

  marcarPublicadosBtn.disabled = true;
  setPublicacionStatus('Marcando aprobados como "publicado"...');

  try {
    const { data: aprobados, error: errorConsulta } = await supabaseClient
      .from("boletin_envios")
      .select("id")
      .eq("estado_editorial", "aprobado");

    if (errorConsulta) {
      throw new Error(errorConsulta.message);
    }

    if (!aprobados || aprobados.length === 0) {
      setPublicacionStatus("No hay aprobados para marcar como publicados.");
      marcarPublicadosBtn.disabled = false;
      return;
    }

    const ids = aprobados.map((item) => item.id);

    const { error: errorUpdate } = await supabaseClient
      .from("boletin_envios")
      .update({ estado_editorial: "publicado" })
      .in("id", ids);

    if (errorUpdate) {
      throw new Error(errorUpdate.message);
    }

    setPublicacionStatus(`Se marcaron ${ids.length} envío(s) como publicados.`, "success");
    setStatus(`Se publicaron ${ids.length} envío(s).`, "success");

    await cargarEnvios();
    await cargarAprobadosParaPublicacion();
  } catch (error) {
    console.error(error);
    setPublicacionStatus(`Error publicando boletín: ${error.message}`, "error");
  } finally {
    marcarPublicadosBtn.disabled = false;
  }
}

function cerrarPanelPublicacion() {
  publicacionPanel.classList.add("hidden");
  publicacionList.innerHTML = "";
  setPublicacionStatus("");
}

reloadBtn?.addEventListener("click", cargarEnvios);
filtroEstado?.addEventListener("change", cargarEnvios);
publicarBtn?.addEventListener("click", cargarAprobadosParaPublicacion);
marcarPublicadosBtn?.addEventListener("click", marcarAprobadosComoPublicados);
cerrarPublicacionBtn?.addEventListener("click", cerrarPanelPublicacion);

cargarEnvios();
