const $ = (selector, parent = document) => parent.querySelector(selector);
const $$ = (selector, parent = document) => [...parent.querySelectorAll(selector)];

const fallbackResources = [
  { id: "burnout", label: "Burnout", title: "Saat produktif terasa seperti syarat untuk berharga", description: "Kenali sinyal tubuh dan buat jeda kecil sebelum semuanya terasa terlalu penuh.", duration: "4 menit" },
  { id: "overthinking", label: "Overthinking", title: "Membedakan masalah nyata dan skenario di kepala", description: "Latihan singkat untuk menurunkan volume pikiran tanpa memaksa diri langsung positif.", duration: "6 menit" },
  { id: "boundaries", label: "Boundaries", title: "Bilang ‘nggak’ tanpa merasa jadi orang jahat", description: "Contoh kalimat sederhana untuk menjaga energi, waktu, dan relasi yang penting.", duration: "5 menit" }
];

const fallbackStories = [
  { id: "seed-1", topic: "Overthinking", message: "Aku baru sadar, istirahat bukan hadiah setelah semuanya selesai. Istirahat memang bagian dari proses.", createdAt: "2026-10-02T09:30:00.000Z" },
  { id: "seed-2", topic: "Relasi", message: "Pelan-pelan belajar kalau menjaga batas bukan berarti aku berhenti sayang sama orang lain.", createdAt: "2026-10-01T14:10:00.000Z" }
];

function escapeHtml(value) {
  return String(value).replace(/[&<>'"]/g, (character) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    "'": "&#039;",
    '"': "&quot;"
  }[character]));
}

function setFeedback(element, message, success = false) {
  element.textContent = message;
  element.classList.toggle("success", success);
}

async function postJson(url, payload) {
  let response;
  try {
    response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
  } catch {
    const key = `tabsipakarcinta:${url}`;
    const existing = JSON.parse(localStorage.getItem(key) || "[]");
    localStorage.setItem(key, JSON.stringify([...existing, { ...payload, createdAt: new Date().toISOString() }]));
    return { message: "Tersimpan di perangkat ini. Backend bisa diaktifkan saat kamu membuka versi lokal." };
  }
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || "Terjadi gangguan. Coba lagi.");
  return data;
}

function formatDate(dateString) {
  return new Intl.DateTimeFormat("id-ID", { day: "numeric", month: "short" }).format(new Date(dateString));
}

async function loadStories() {
  const list = $(".story-list__items");
  try {
    const response = await fetch("/api/stories");
    const { stories } = await response.json();
    if (!stories?.length) {
      list.innerHTML = '<p class="loading-copy">Belum ada cerita. Mungkin kamu bisa mulai lebih dulu.</p>';
      return;
    }
    list.innerHTML = stories.map((story) => `
      <article class="story-item">
        <span class="story-item__topic">${escapeHtml(story.topic)} · ${formatDate(story.createdAt)}</span>
        <p>${escapeHtml(story.message)}</p>
      </article>
    `).join("");
  } catch {
    const localStories = JSON.parse(localStorage.getItem("tabsipakarcinta:/api/share") || "[]");
    const stories = [...fallbackStories, ...localStories].slice(-6).reverse();
    list.innerHTML = stories.map((story) => `
      <article class="story-item">
        <span class="story-item__topic">${escapeHtml(story.topic)} · ${formatDate(story.createdAt)}</span>
        <p>${escapeHtml(story.message)}</p>
      </article>
    `).join("");
  }
}

async function loadResources() {
  const grid = $("#resource-grid");
  try {
    const response = await fetch("/api/resources");
    const { resources } = await response.json();
    grid.innerHTML = resources.map((resource, index) => `
      <article class="resource-card reveal is-visible">
        <div class="resource-card__meta"><span>${escapeHtml(resource.label)}</span><span>${escapeHtml(resource.duration)}</span></div>
        <h3>${escapeHtml(resource.title)}</h3>
        <p>${escapeHtml(resource.description)}</p>
        <div class="resource-card__bottom"><span class="resource-card__read">Baca pelan-pelan ↗</span><span class="resource-card__symbol">${["◒", "〰", "✳"][index] || "✦"}</span></div>
      </article>
    `).join("");
  } catch {
    grid.innerHTML = fallbackResources.map((resource, index) => `
      <article class="resource-card reveal is-visible">
        <div class="resource-card__meta"><span>${escapeHtml(resource.label)}</span><span>${escapeHtml(resource.duration)}</span></div>
        <h3>${escapeHtml(resource.title)}</h3>
        <p>${escapeHtml(resource.description)}</p>
        <div class="resource-card__bottom"><span class="resource-card__read">Baca pelan-pelan ↗</span><span class="resource-card__symbol">${["◒", "〰", "✳"][index]}</span></div>
      </article>
    `).join("");
  }
}

function setupCheckin() {
  $$("[data-mood]").forEach((button) => {
    button.addEventListener("click", async () => {
      const feedback = $("#checkin-feedback");
      $$("[data-mood]").forEach((item) => item.classList.remove("is-selected"));
      button.classList.add("is-selected");
      setFeedback(feedback, "Menyimpan check-in...");
      try {
        const data = await postJson("/api/check-ins", { mood: button.dataset.mood });
        setFeedback(feedback, data.message, true);
      } catch (error) {
        setFeedback(feedback, error.message);
      }
    });
  });
}

function setupForms() {
  $("#share-form").addEventListener("submit", async (event) => {
    event.preventDefault();
    const form = event.currentTarget;
    const feedback = $("#share-feedback");
    const formData = new FormData(form);
    setFeedback(feedback, "Mengirim ceritamu...");
    try {
      const data = await postJson("/api/share", {
        topic: formData.get("topic"),
        message: formData.get("message"),
        consent: formData.get("consent") === "on"
      });
      form.reset();
      setFeedback(feedback, data.message, true);
      await loadStories();
    } catch (error) {
      setFeedback(feedback, error.message);
    }
  });

  $("#consultation-form").addEventListener("submit", async (event) => {
    event.preventDefault();
    const form = event.currentTarget;
    const feedback = $("#consult-feedback");
    const formData = new FormData(form);
    setFeedback(feedback, "Mengirim permintaan...");
    try {
      const data = await postJson("/api/consultations", Object.fromEntries(formData.entries()));
      form.reset();
      setFeedback(feedback, data.message, true);
    } catch (error) {
      setFeedback(feedback, error.message);
    }
  });
}

function setupNavigation() {
  const toggle = $(".menu-toggle");
  const nav = $("#main-nav");
  toggle.addEventListener("click", () => {
    const isOpen = nav.classList.toggle("is-open");
    toggle.setAttribute("aria-expanded", String(isOpen));
  });
  $$(".main-nav a").forEach((link) => link.addEventListener("click", () => {
    nav.classList.remove("is-open");
    toggle.setAttribute("aria-expanded", "false");
  }));
}

function setupReveal() {
  const items = $$(".reveal");
  if (!("IntersectionObserver" in window)) {
    items.forEach((item) => item.classList.add("is-visible"));
    return;
  }
  const observer = new IntersectionObserver((entries, currentObserver) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add("is-visible");
        currentObserver.unobserve(entry.target);
      }
    });
  }, { threshold: .12 });
  items.forEach((item) => observer.observe(item));
}

setupNavigation();
setupCheckin();
setupForms();
setupReveal();
loadStories();
loadResources();
