console.log("ADMIN JS CARGADO");

const supabaseUrl = "https://lomvwmrnfemuemrdamtu.supabase.co";
const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxvbXZ3bXJuZmVtdWVtcmRhbXR1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzMxNzU1NDQsImV4cCI6MjA4ODc1MTU0NH0.n_WHSZN-_TWdt5cSeQC7zanUCjb_MQ0AFFU-ULKFjPo";

const { createClient } = supabase;
const supabaseClient = createClient(supabaseUrl, supabaseKey);

const statusEl = document.getElementById("status");
const adminList = document.getElementById("adminList");
const filtroEstado = document.getElementById("filtroEstado");
const reloadBtn = document.getElementById("reloadBtn");

function setStatus(message, type = "") {
  statusEl.textContent = message;
  statusEl.className = `status ${type}`.trim();
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

function renderCard(row) {
  return `
    <article class="admin-card">
      <div class="admin-card-top">
        <div>
          <h3>${escapeHtml(row.titulo || "Sin título")}</h3>
          <div class="hint">
            Código: ${escapeHtml(row.codigo_confirmacion || "—")} ·
            Estado actual: <strong>${escapeHtml(row.estado_editorial || "—")}</strong>
          </div>
        </div>

        <div class="admin-actions">
          <select data-id="${row.id}" data-estado-actual="${row.estado_editorial || ""}" class="estadoSelect">
            <option value="pendiente" ${row.estado_editorial === "pendiente" ? "selected" : ""}>Pendiente</option>
            <option value="aprobado" ${row.estado_editorial === "aprobado" ? "selected" : ""}>Aprobado</option>
            <option value="publicado" ${row.estado_editorial === "publicado" ? "selected" : ""}>Publicado</option>
            <option value="rechazado" ${row.estado_editorial === "rechazado" ? "selected" : ""}>Rechazado</option>
          </select>
          <button type="button" class="saveEstadoBtn" data-id="${row.id}">Guardar</button>
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
    bindSaveButtons();
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
    setStatus(`Estado actualizado a "${nuevoEstado}".`, "success");
    await cargarEnvios();
  } catch (error) {
    console.error(error);
    setStatus(`Error actualizando estado: ${error.message}`, "error");
  }
}

function bindSaveButtons() {
  document.querySelectorAll(".saveEstadoBtn").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const id = btn.dataset.id;
      const select = document.querySelector(`.estadoSelect[data-id="${id}"]`);
      const nuevoEstado = select.value;
      const estadoActual = select.dataset.estadoActual;

      if (nuevoEstado === estadoActual) {
        setStatus("No hubo cambios para guardar.");
        return;
      }

      btn.disabled = true;
      btn.textContent = "Guardando...";

      await actualizarEstado(id, nuevoEstado);

      btn.disabled = false;
      btn.textContent = "Guardar";
    });
  });
}

reloadBtn?.addEventListener("click", cargarEnvios);
filtroEstado?.addEventListener("change", cargarEnvios);

cargarEnvios();
