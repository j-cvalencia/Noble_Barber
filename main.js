/* ==========================================================================
   NAVAJA & TIJERA · Lógica de la página
   --------------------------------------------------------------------------
   Índice
   1. CONFIGURACIÓN  → aquí cambias datos del negocio (precios, fotos, horarios...)
   2. UTILIDADES    → funciones pequeñas y reutilizables
   3. LÓGICA        → funciones que calculan cosas (sin tocar el HTML)
   4. RENDERIZADO   → funciones que dibujan datos en el HTML
   5. FORMULARIO    → validación, resumen y envío por WhatsApp
   6. VISOR         → ampliar las fotos de la galería
   7. INICIO        → arranca todo cuando carga la página

   Regla del archivo: la sección 1 es la única que debería cambiar si solo
   quieres actualizar información del negocio. No hace falta tocar el HTML.
   ========================================================================== */

"use strict";


/* ==========================================================================
   1. CONFIGURACIÓN
   ========================================================================== */

const BUSINESS = {
  name: "Navaja & Tijera",
  whatsapp: "573000000000",        // código de país + número, sin "+" ni espacios
  whatsappDisplay: "300 000 0000", // cómo se muestra en pantalla
};

const BOOKING = {
  slotMinutes: 30,   // duración de cada turno
  daysAhead: 30,     // hasta cuántos días en el futuro se puede reservar
  minNoticeMinutes: 15, // antelación mínima para reservar el mismo día
};

/* Servicios. Para agregar uno nuevo, copia un bloque y cambia los datos:
   aparecerá solo en la lista de precios y en el formulario de reserva. */
const SERVICES = [
  {
    id: "corte-barba",
    name: "Corte + barba",
    price: 38000,
    description: "Corte a tijera o máquina, barba perfilada y toalla caliente.",
    featured: true,
  },
  {
    id: "corte",
    name: "Corte de cabello",
    price: 25000,
    description: "Clásico, degradado o diseño. Cuéntanos qué buscas.",
  },
  {
    id: "barba",
    name: "Barba",
    price: 18000,
    description: "Perfilado y arreglo con navaja.",
  },
  {
    id: "afeitado",
    name: "Afeitado clásico",
    price: 22000,
    description: "Toalla caliente, espuma y navaja. Sin prisa.",
  },
  {
    id: "corte-nino",
    name: "Corte niño",
    price: 20000,
    description: "Hasta 12 años.",
  },
  {
    id: "cejas",
    name: "Cejas",
    price: 8000,
  },
];

/* Galería "Nuestro trabajo". Para agregar una foto: guárdala en la carpeta
   images/ y copia un bloque. `alt` describe la foto (lectores de pantalla)
   y `caption` es el texto que se ve al ampliarla. */
const GALLERY = [
  { src: "images/trabajo-1.svg", alt: "Corte clásico a tijera",        caption: "Corte clásico a tijera" },
  { src: "images/trabajo-2.svg", alt: "Afeitado con navaja",           caption: "Afeitado con navaja" },
  { src: "images/trabajo-3.svg", alt: "Degradado con peinado de lado", caption: "Degradado y peinado" },
  { src: "images/trabajo-4.svg", alt: "Corte y barba perfilada",       caption: "Corte + barba" },
  { src: "images/trabajo-5.svg", alt: "Perfilado de barba",            caption: "Perfilado de barba" },
  { src: "images/trabajo-6.svg", alt: "Corte moderno con textura",     caption: "Corte moderno" },
];

/* Horario semanal. El índice coincide con Date.getDay(): 0 = domingo.
   `hours: [apertura, cierre]` en horas (9.5 = 9:30). Un día cerrado se
   escribe `hours: null`. */
const SCHEDULE = [
  { name: "Domingo",   hours: [9, 14] },
  { name: "Lunes",     hours: [9, 19] },
  { name: "Martes",    hours: [9, 19] },
  { name: "Miércoles", hours: [9, 19] },
  { name: "Jueves",    hours: [9, 19] },
  { name: "Viernes",   hours: [9, 20] },
  { name: "Sábado",    hours: [8, 18] },
];

/* Orden en que se muestran los días en la tabla (empezando en lunes) */
const SCHEDULE_DISPLAY_ORDER = [1, 2, 3, 4, 5, 6, 0];


/* ==========================================================================
   2. UTILIDADES
   ========================================================================== */

/** Atajo para buscar un elemento por su id. */
const $ = (id) => document.getElementById(id);

/**
 * Crea un elemento HTML de forma corta y segura (usa textContent, no innerHTML).
 * Ejemplo: createElement("p", "service__name", "Barba")
 */
function createElement(tag, className, text) {
  const element = document.createElement(tag);
  if (className) element.className = className;
  if (text !== undefined) element.textContent = text;
  return element;
}

/** 38000 → "$ 38.000" */
const priceFormatter = new Intl.NumberFormat("es-CO", {
  style: "currency",
  currency: "COP",
  maximumFractionDigits: 0,
});
const formatPrice = (value) => priceFormatter.format(value);

/** 570 (minutos desde la medianoche) → "9:30" */
function formatMinutes(totalMinutes) {
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return `${hours}:${String(minutes).padStart(2, "0")}`;
}

/** 9.5 (horas) → 570 (minutos) */
const hoursToMinutes = (hours) => Math.round(hours * 60);

/** Date → "2026-10-09" (el formato que usa <input type="date">) */
function toISODate(date) {
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${date.getFullYear()}-${month}-${day}`;
}

/** "2026-10-09" → Date (en hora local, sin saltos por zona horaria) */
function parseISODate(isoDate) {
  const [year, month, day] = isoDate.split("-").map(Number);
  return new Date(year, month - 1, day);
}

/** Minutos transcurridos desde la medianoche en una fecha dada. */
const minutesSinceMidnight = (date) => date.getHours() * 60 + date.getMinutes();

/** Date → "viernes 9/10/2026" */
function formatLongDate(date) {
  const weekday = SCHEDULE[date.getDay()].name.toLowerCase();
  return `${weekday} ${date.getDate()}/${date.getMonth() + 1}/${date.getFullYear()}`;
}

/** Texto de horario de un día: "9:00 – 19:00" o "Cerrado". */
function formatDayHours(daySchedule) {
  if (!daySchedule.hours) return "Cerrado";
  const [open, close] = daySchedule.hours;
  return `${formatMinutes(hoursToMinutes(open))} – ${formatMinutes(hoursToMinutes(close))}`;
}

const findService = (id) => SERVICES.find((service) => service.id === id);


/* ==========================================================================
   3. LÓGICA (funciones que devuelven datos, no modifican la página)
   ========================================================================== */

/**
 * Dice si el local está abierto en el momento `now` y arma el mensaje.
 * @returns {{ isOpen: boolean, message: string }}
 */
function getOpenStatus(now = new Date()) {
  const today = SCHEDULE[now.getDay()];
  const current = minutesSinceMidnight(now);

  if (today.hours) {
    const open = hoursToMinutes(today.hours[0]);
    const close = hoursToMinutes(today.hours[1]);

    if (current >= open && current < close) {
      return { isOpen: true, message: `Abierto ahora · cerramos a las ${formatMinutes(close)}` };
    }
    if (current < open) {
      return { isOpen: false, message: `Cerrado · abrimos hoy a las ${formatMinutes(open)}` };
    }
  }

  // Ya cerró hoy (o hoy no abre): buscamos el próximo día con horario
  for (let offset = 1; offset <= 7; offset++) {
    const next = SCHEDULE[(now.getDay() + offset) % 7];
    if (next.hours) {
      const when = offset === 1 ? "mañana" : `el ${next.name.toLowerCase()}`;
      return {
        isOpen: false,
        message: `Cerrado · abrimos ${when} a las ${formatMinutes(hoursToMinutes(next.hours[0]))}`,
      };
    }
  }

  return { isOpen: false, message: "Cerrado" };
}

/**
 * Lista las horas de un día y marca cuáles siguen disponibles.
 * @param {string} isoDate  Fecha elegida, formato "AAAA-MM-DD"
 * @returns {{ time: string, available: boolean }[]}
 */
function getTimeSlots(isoDate, now = new Date()) {
  const date = parseISODate(isoDate);
  const { hours } = SCHEDULE[date.getDay()];
  if (!hours) return [];

  const isToday = toISODate(now) === isoDate;
  const earliestToday = minutesSinceMidnight(now) + BOOKING.minNoticeMinutes;
  const open = hoursToMinutes(hours[0]);
  const close = hoursToMinutes(hours[1]);
  const slots = [];

  // El último turno debe terminar antes de la hora de cierre
  for (let start = open; start + BOOKING.slotMinutes <= close; start += BOOKING.slotMinutes) {
    slots.push({
      time: formatMinutes(start),
      available: !isToday || start >= earliestToday,
    });
  }
  return slots;
}

/**
 * Valida los datos del formulario.
 * @returns {Object} Un objeto { campo: "mensaje de error" }. Vacío si todo está bien.
 */
function validateBooking(values) {
  const errors = {};

  if (values.name.length < 2) {
    errors.name = "Escribe tu nombre.";
  }
  if (!/^\+?\d{7,13}$/.test(values.phone.replace(/[\s()-]/g, ""))) {
    errors.phone = "Escribe un teléfono válido, solo números.";
  }
  if (!findService(values.serviceId)) {
    errors.service = "Elige un servicio.";
  }
  if (!values.date) {
    errors.date = "Elige una fecha.";
  } else if (!values.time) {
    errors.time = "Elige una hora.";
  }

  return errors;
}

/** Arma el enlace de WhatsApp con el mensaje de la reserva ya escrito. */
function buildWhatsAppUrl(booking) {
  const message = [
    "Hola, quiero reservar una cita:",
    `Nombre: ${booking.name}`,
    `Servicio: ${booking.service.name}`,
    `Día: ${formatLongDate(booking.dateObject)}`,
    `Hora: ${booking.time}`,
  ].join("\n");

  return `https://wa.me/${BUSINESS.whatsapp}?text=${encodeURIComponent(message)}`;
}


/* ==========================================================================
   4. RENDERIZADO (funciones que dibujan datos en la página)
   ========================================================================== */

/** Dibuja la lista de precios a partir de SERVICES. */
function renderServiceList() {
  const list = $("service-list");

  SERVICES.forEach((service) => {
    const item = createElement("li", "service");

    const name = createElement("span", "service__name", service.name);
    if (service.featured) {
      name.append(createElement("span", "service__badge", "El más pedido"));
    }

    item.append(
      name,
      createElement("span", "service__dots"),
      createElement("span", "service__price", formatPrice(service.price)),
    );
    if (service.description) {
      item.append(createElement("span", "service__description", service.description));
    }

    list.append(item);
  });
}

/** Dibuja la galería de fotos a partir de GALLERY. */
function renderGallery() {
  const list = $("gallery");

  GALLERY.forEach((photo, index) => {
    const item = createElement("li", "gallery__item");

    // Cada foto es un botón para que se pueda abrir con teclado
    const button = createElement("button", "gallery__button");
    button.type = "button";
    button.dataset.index = index;
    button.setAttribute("aria-label", `Ampliar foto: ${photo.caption}`);

    const image = createElement("img", "gallery__image");
    image.src = photo.src;
    image.alt = photo.alt;
    image.loading = "lazy";
    image.width = 800;
    image.height = 1000;

    button.append(image);
    item.append(button);
    list.append(item);
  });
}

/** Agrega los servicios como opciones del <select> del formulario. */
function renderServiceOptions() {
  const select = $("field-service");

  SERVICES.forEach((service) => {
    const option = createElement("option", "", `${service.name} (${formatPrice(service.price)})`);
    option.value = service.id;
    select.append(option);
  });
}

/** Dibuja la tabla de horarios y marca la fila del día actual. */
function renderSchedule(now = new Date()) {
  const body = $("schedule-body");
  body.innerHTML = "";

  SCHEDULE_DISPLAY_ORDER.forEach((dayIndex) => {
    const day = SCHEDULE[dayIndex];
    const row = createElement("tr", "schedule__row");
    if (dayIndex === now.getDay()) row.classList.add("schedule__row--today");

    const dayCell = createElement("th", "schedule__day", day.name);
    dayCell.scope = "row";

    row.append(dayCell, createElement("td", "schedule__hours", formatDayHours(day)));
    body.append(row);
  });
}

/** Actualiza el mensaje "Abierto ahora / Cerrado" de la portada. */
function renderOpenStatus() {
  const { isOpen, message } = getOpenStatus();
  const status = $("status");

  status.classList.toggle("status--open", isOpen);
  status.classList.toggle("status--closed", !isOpen);
  status.querySelector(".status__text").textContent = message;
}

/** Dibuja los botones de hora para la fecha elegida. */
function renderTimeSlots(isoDate) {
  const list = $("slots-list");
  const note = $("slots-note");
  list.innerHTML = "";

  if (!isoDate) {
    note.hidden = false;
    note.textContent = "Elige primero una fecha.";
    return;
  }

  const slots = getTimeSlots(isoDate);
  const availableCount = slots.filter((slot) => slot.available).length;

  slots.forEach((slot) => {
    const wrapper = createElement("label", "slot");
    const input = createElement("input", "slot__input");
    input.type = "radio";
    input.name = "time";
    input.value = slot.time;
    input.disabled = !slot.available;

    wrapper.append(input, createElement("span", "slot__label", slot.time));
    list.append(wrapper);
  });

  note.hidden = availableCount > 0;
  if (availableCount === 0) {
    note.textContent = slots.length === 0
      ? "Ese día estamos cerrados. Prueba con otra fecha."
      : "Ya no quedan turnos para este día. Prueba con otra fecha.";
  }
}

/** Muestra u oculta el mensaje de error de un campo. Sin mensaje = limpia. */
function setFieldError(fieldName, message = "") {
  const element = document.querySelector(`[data-error-for="${fieldName}"]`);
  if (element) element.textContent = message;
}

/** Muestra el resumen de la reserva y el botón de WhatsApp. */
function renderConfirmation(booking) {
  const data = $("confirmation-data");
  data.innerHTML = "";

  const rows = [
    ["Nombre", booking.name],
    ["Teléfono", booking.phone],
    ["Servicio", booking.service.name],
    ["Día", formatLongDate(booking.dateObject)],
    ["Hora", booking.time],
  ];
  rows.forEach(([label, value]) => {
    data.append(createElement("dt", "", label), createElement("dd", "", value));
  });

  $("confirmation-whatsapp").href = buildWhatsAppUrl(booking);
}


/* ==========================================================================
   5. FORMULARIO
   ========================================================================== */

/** Lee los valores actuales del formulario. */
function readFormValues(form) {
  const checkedTime = form.querySelector('input[name="time"]:checked');

  return {
    name: form.elements.name.value.trim(),
    phone: form.elements.phone.value.trim(),
    serviceId: form.elements.service.value,
    date: form.elements.date.value,
    time: checkedTime ? checkedTime.value : "",
  };
}

/** Enfoca el primer campo con error para guiar a la persona. */
function focusFirstError(form, errors) {
  const order = ["name", "phone", "service", "date", "time"];
  const firstField = order.find((field) => errors[field]);

  const target = firstField === "time"
    ? form.querySelector(".slot__input:not(:disabled)")
    : form.elements[firstField];
  if (target) target.focus();
}

function handleSubmit(event, form) {
  event.preventDefault();

  const values = readFormValues(form);
  const errors = validateBooking(values);

  // Limpiamos errores anteriores y mostramos los nuevos
  ["name", "phone", "service", "date", "time"].forEach((field) => setFieldError(field, errors[field]));
  if (Object.keys(errors).length > 0) {
    focusFirstError(form, errors);
    return;
  }

  const booking = {
    ...values,
    service: findService(values.serviceId),
    dateObject: parseISODate(values.date),
  };

  renderConfirmation(booking);
  form.hidden = true;
  $("confirmation").hidden = false;
  $("confirmation").scrollIntoView({ behavior: "smooth", block: "center" });
}

function setupBookingForm() {
  const form = $("booking-form");
  const dateInput = $("field-date");

  // Rango de fechas permitido: desde hoy hasta `daysAhead` días
  const today = new Date();
  const lastDay = new Date(today);
  lastDay.setDate(today.getDate() + BOOKING.daysAhead);
  dateInput.min = toISODate(today);
  dateInput.max = toISODate(lastDay);

  // Al cambiar la fecha, se recalculan las horas disponibles
  dateInput.addEventListener("change", () => {
    renderTimeSlots(dateInput.value);
    setFieldError("time");
  });

  // Al escribir o elegir algo, se borra el error de ese campo
  form.addEventListener("input", (event) => {
    if (event.target.name) setFieldError(event.target.name);
  });

  form.addEventListener("submit", (event) => handleSubmit(event, form));

  // Botón "Cambiar datos": vuelve al formulario
  $("confirmation-edit").addEventListener("click", () => {
    $("confirmation").hidden = true;
    form.hidden = false;
    form.elements.name.focus();
  });
}


/* ==========================================================================
   6. VISOR DE IMÁGENES (lightbox)
   ========================================================================== */

function setupLightbox() {
  const dialog = $("lightbox");
  const image = $("lightbox-image");
  const caption = $("lightbox-caption");
  let currentIndex = 0;

  /** Muestra la foto número `index` (da la vuelta al llegar al final). */
  function showPhoto(index) {
    currentIndex = (index + GALLERY.length) % GALLERY.length;
    const photo = GALLERY[currentIndex];
    image.src = photo.src;
    image.alt = photo.alt;
    caption.textContent = photo.caption;
  }

  // Un solo listener en toda la galería (funciona con fotos agregadas luego)
  $("gallery").addEventListener("click", (event) => {
    const button = event.target.closest(".gallery__button");
    if (!button) return;
    showPhoto(Number(button.dataset.index));
    dialog.showModal();
  });

  $("lightbox-prev").addEventListener("click", () => showPhoto(currentIndex - 1));
  $("lightbox-next").addEventListener("click", () => showPhoto(currentIndex + 1));
  $("lightbox-close").addEventListener("click", () => dialog.close());

  // Cerrar al hacer clic en el fondo oscuro (fuera de la foto y los botones)
  dialog.addEventListener("click", (event) => {
    if (event.target === dialog) dialog.close();
  });

  // Flechas del teclado (Esc ya cierra el <dialog> por defecto)
  dialog.addEventListener("keydown", (event) => {
    if (event.key === "ArrowLeft") showPhoto(currentIndex - 1);
    if (event.key === "ArrowRight") showPhoto(currentIndex + 1);
  });
}


/* ==========================================================================
   7. INICIO
   ========================================================================== */

function init() {
  // Contenido generado desde la configuración
  renderServiceList();
  renderServiceOptions();
  renderGallery();
  renderSchedule();

  // Datos del negocio en el HTML
  const whatsappLink = $("contact-whatsapp");
  whatsappLink.href = `https://wa.me/${BUSINESS.whatsapp}`;
  whatsappLink.textContent = BUSINESS.whatsappDisplay;
  $("footer-year").textContent = new Date().getFullYear();

  // Estado abierto/cerrado, se refresca cada minuto
  renderOpenStatus();
  setInterval(() => {
    renderOpenStatus();
    renderSchedule(); // por si la página queda abierta y cambia el día
  }, 60 * 1000);

  setupBookingForm();
  setupLightbox();
}

document.addEventListener("DOMContentLoaded", init);
