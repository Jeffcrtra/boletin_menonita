const supabaseUrl = "https://lomvwmrnfemuemrdamtu.supabase.co";
const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxvbXZ3bXJuZmVtdWVtcmRhbXR1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzMxNzU1NDQsImV4cCI6MjA4ODc1MTU0NH0.n_WHSZN-_TWdt5cSeQC7zanUCjb_MQ0AFFU-ULKFjPo";
const edgeFunctionName = "boletin-confirmacion";

const supabase = window.supabase.createClient(supabaseUrl, supabaseKey);

const form = document.getElementById("boletinForm");
const submitBtn = document.getElementById("submitBtn");
const clearBtn = document.getElementById("clearBtn");
const statusEl = document.getElementById("status");
const imagenesInput = document.getElementById("imagenes");
const previewList = document.getElementById("previewList");

const MAX_FILES = 3;
const MAX_FILE_SIZE_MB = 10;
const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;

function setStatus(message, type = "") {
  statusEl.textContent = message;
  statusEl.className = `status ${type}`.trim();
}

function slugify(text) {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .trim();
}

function formatDateForPath(dateString) {
  return dateString || "sin-fecha";
}

function clearPreviews() {
  previewList.innerHTML = "";
}

function renderImagePreviews(files) {
  clearPreviews();
  if (!files || files.length === 0) return;

  Array.from(files).forEach((file) => {
    const item = document.createElement("div");
    item.className = "preview-item";

    const img = document.createElement("img");
    img.alt = file.name;

    const caption = document.createElement("div");
    caption.className = "caption";
    caption.textContent = file.name;

    const reader = new FileReader();
    reader.onload = (e) => {
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);

    item.appendChild(img);
    item.appendChild(caption);
    previewList.appendChild(item);
  });
}

function validateFiles(files) {
  if (!files || files.length === 0) return { ok: true };

  if (files.length > MAX_FILES) {
    return { ok: false, message: `Solo se permiten hasta ${MAX_FILES} imágenes.` };
  }

  for (const file of files) {
    if (!file.type.startsWith("image/")) {
      return { ok: false, message: `El archivo "${file.name}" no es una imagen válida.` };
    }
    if (file.size > MAX_FILE_SIZE_BYTES) {
      return { ok: false, message: `La imagen "${file.name}" supera ${MAX_FILE_SIZE_MB} MB.` };
    }
  }

  return { ok: true };
}

function getFormValues() {
  return {
    titulo: document.getElementById("titulo").value.trim(),
    zona: document.getElementById("zona").value.trim(),
    iglesia: document.getElementById("iglesia").value.trim(),
    autor: document.getElementById("autor").value.trim(),
    contacto: document.getElementById("contacto").value.trim() || null,
    fecha_evento: document.getElementById("fecha_evento").value || null,
    categoria: document.getElementById("categoria").value,
    contenido: document.getElementById("contenido").value.trim(),
    texto_ai_estado: document.getElementById("texto_ai_estado").value,
    imagenes_ai_estado: document.getElementById("imagenes_ai_estado").value,
    ai_aclaracion: document.getElementById("ai_aclaracion").value.trim() || null,
  };
}

function validateForm(values, files) {
  if (!values.titulo) return "El título es obligatorio.";
  if (!values.zona) return "La zona es obligatoria.";
  if (!values.iglesia) return "La iglesia es obligatoria.";
  if (!values.autor) return "El autor es obligatorio.";
  if (!values.contenido) return "El contenido no puede estar vacío.";

  const fileValidation = validateFiles(files);
  if (!fileValidation.ok) return fileValidation.message;

  return null;
}

async function uploadImages(files, meta) {
  const imageUrls = [];

  for (const file of files) {
    const extension = file.name.split(".").pop()?.toLowerCase() || "jpg";
    const safeTitle = slugify(meta.titulo || "sin-titulo");
    const safeZone = slugify(meta.zona || "sin-zona");
    const safeChurch = slugify(meta.iglesia || "sin-iglesia");
    const datePart = formatDateForPath(meta.fecha_evento);
    const uniqueName = `${Date.now()}-${crypto.randomUUID()}.${extension}`;
    const filePath = `${datePart}/${safeZone}/${safeChurch}/${safeTitle}/${uniqueName}`;

    const { error: uploadError } = await supabase.storage
      .from("boletin-imagenes")
      .upload(filePath, file, {
        cacheControl: "3600",
        upsert: false,
      });

    if (uploadError) {
      throw new Error(`Error subiendo "${file.name}": ${uploadError.message}`);
    }

    const { data: publicData } = supabase.storage
      .from("boletin-imagenes")
      .getPublicUrl(filePath);

    imageUrls.push({
      name: file.name,
      path: filePath,
      publicUrl: publicData.publicUrl,
      size: file.size,
      type: file.type,
    });
  }

  return imageUrls;
}

async function sendToEdgeFunction(values, imageUrls) {
  const { data, error } = await supabase.functions.invoke(edgeFunctionName, {
    body: {
      ...values,
      imagenes: imageUrls,
    },
  });

  if (error) {
    throw new Error(error.message || "Error invocando la función.");
  }

  if (!data?.success) {
    throw new Error(data?.error || "La función no devolvió una respuesta válida.");
  }

  return data;
}

imagenesInput?.addEventListener("change", (e) => {
  const files = e.target.files;
  const validation = validateFiles(files);

  if (!validation.ok) {
    setStatus(validation.message, "error");
    imagenesInput.value = "";
    clearPreviews();
    return;
  }

  setStatus("");
  renderImagePreviews(files);
});

clearBtn?.addEventListener("click", () => {
  form.reset();
  clearPreviews();
  setStatus("");
});

form?.addEventListener("submit", async (e) => {
  e.preventDefault();
  setStatus("");

  const values = getFormValues();
  const files = imagenesInput.files;

  const validationError = validateForm(values, files);
  if (validationError) {
    setStatus(validationError, "error");
    return;
  }

  submitBtn.disabled = true;
  submitBtn.textContent = "Enviando...";
  setStatus("Subiendo y registrando tu información...", "");

  try {
    let imageUrls = [];

    if (files && files.length > 0) {
      imageUrls = await uploadImages(files, values);
    }

    const result = await sendToEdgeFunction(values, imageUrls);

    form.reset();
    clearPreviews();

    const mensaje = `Información enviada correctamente.\n\nCódigo de confirmación: ${result.codigo_confirmacion}\nFecha de recepción: ${result.fecha_recepcion}\n\nGuarda este código por si necesitamos dar seguimiento.`;

    alert(mensaje);

    setStatus(
      `Información enviada correctamente. Código de confirmación: ${result.codigo_confirmacion}. Fecha de recepción: ${result.fecha_recepcion}.`,
      "success"
    );
  } catch (error) {
    console.error(error);
    setStatus(error.message || "Ocurrió un error inesperado.", "error");
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = "Enviar contenido";
  }
});
