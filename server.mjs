import { createServer } from "node:http";
import { promises as fs } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import crypto from "node:crypto";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const publicDir = path.join(__dirname, "public");
const dataDir = path.join(__dirname, "data");
const port = Number(process.env.PORT || 3000);

const resources = [
  {
    id: "burnout",
    label: "Burnout",
    title: "Saat produktif terasa seperti syarat untuk berharga",
    description: "Kenali sinyal tubuh dan buat jeda kecil sebelum semuanya terasa terlalu penuh.",
    duration: "4 menit",
    accent: "coral"
  },
  {
    id: "overthinking",
    label: "Overthinking",
    title: "Membedakan masalah nyata dan skenario di kepala",
    description: "Latihan singkat untuk menurunkan volume pikiran tanpa memaksa diri langsung positif.",
    duration: "6 menit",
    accent: "mint"
  },
  {
    id: "boundaries",
    label: "Boundaries",
    title: "Bilang ‘nggak’ tanpa merasa jadi orang jahat",
    description: "Contoh kalimat sederhana untuk menjaga energi, waktu, dan relasi yang penting.",
    duration: "5 menit",
    accent: "yellow"
  }
];

const seedStories = [
  {
    id: "seed-1",
    topic: "Overthinking",
    message: "Aku baru sadar, istirahat bukan hadiah setelah semuanya selesai. Istirahat memang bagian dari proses.",
    createdAt: "2026-10-02T09:30:00.000Z"
  },
  {
    id: "seed-2",
    topic: "Relasi",
    message: "Pelan-pelan belajar kalau menjaga batas bukan berarti aku berhenti sayang sama orang lain.",
    createdAt: "2026-10-01T14:10:00.000Z"
  }
];

const jsonFiles = {
  stories: path.join(dataDir, "shares.json"),
  consultations: path.join(dataDir, "consultations.json"),
  checkins: path.join(dataDir, "checkins.json")
};

const allowedTopics = ["Overthinking", "Burnout", "Relasi", "Keluarga", "Kuliah / kerja", "Self-worth"];
const allowedChannels = ["Email", "WhatsApp"];
const maxBodyBytes = 50_000;

async function readJson(filePath, fallback) {
  try {
    return JSON.parse(await fs.readFile(filePath, "utf8"));
  } catch (error) {
    if (error.code !== "ENOENT") console.error(`Gagal membaca ${filePath}:`, error.message);
    return fallback;
  }
}

async function writeJson(filePath, value) {
  await fs.mkdir(dataDir, { recursive: true });
  await fs.writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

function sendJson(response, status, payload) {
  response.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
    "X-Content-Type-Options": "nosniff"
  });
  response.end(JSON.stringify(payload));
}

function cleanText(value, maxLength) {
  return typeof value === "string" ? value.trim().slice(0, maxLength) : "";
}

async function parseBody(request) {
  let body = "";
  for await (const chunk of request) {
    body += chunk;
    if (Buffer.byteLength(body) > maxBodyBytes) {
      const error = new Error("Payload terlalu besar.");
      error.statusCode = 413;
      throw error;
    }
  }

  try {
    return body ? JSON.parse(body) : {};
  } catch {
    const error = new Error("Format data tidak valid.");
    error.statusCode = 400;
    throw error;
  }
}

function formatStory(story) {
  return {
    id: story.id,
    topic: story.topic,
    message: story.message,
    createdAt: story.createdAt
  };
}

async function handleApi(request, response, url) {
  if (request.method === "GET" && url.pathname === "/api/health") {
    return sendJson(response, 200, { ok: true, service: "tabsipakarcinta-api" });
  }

  if (request.method === "GET" && url.pathname === "/api/resources") {
    return sendJson(response, 200, { resources });
  }

  if (request.method === "GET" && url.pathname === "/api/stories") {
    const storedStories = await readJson(jsonFiles.stories, seedStories);
    const stories = Array.isArray(storedStories) ? storedStories : seedStories;
    return sendJson(response, 200, { stories: stories.slice(-6).reverse().map(formatStory) });
  }

  if (request.method === "POST" && url.pathname === "/api/share") {
    const body = await parseBody(request);
    const topic = cleanText(body.topic, 40);
    const message = cleanText(body.message, 500);
    const consent = body.consent === true;

    if (!allowedTopics.includes(topic)) return sendJson(response, 422, { error: "Pilih topik yang tersedia." });
    if (message.length < 20) return sendJson(response, 422, { error: "Ceritamu minimal 20 karakter supaya konteksnya cukup." });
    if (!consent) return sendJson(response, 422, { error: "Setujui dulu bahwa cerita ini boleh ditampilkan secara anonim." });

    const stories = await readJson(jsonFiles.stories, seedStories);
    const story = {
      id: crypto.randomUUID(),
      topic,
      message,
      createdAt: new Date().toISOString()
    };
    await writeJson(jsonFiles.stories, [...(Array.isArray(stories) ? stories : []), story]);
    return sendJson(response, 201, { story: formatStory(story), message: "Cerita kamu sudah masuk ke ruang berbagi." });
  }

  if (request.method === "POST" && url.pathname === "/api/consultations") {
    const body = await parseBody(request);
    const name = cleanText(body.name, 80);
    const contact = cleanText(body.contact, 120);
    const topic = cleanText(body.topic, 40);
    const channel = cleanText(body.channel, 20);
    const message = cleanText(body.message, 700);

    if (name.length < 2) return sendJson(response, 422, { error: "Isi nama panggilan minimal 2 karakter." });
    if (contact.length < 5) return sendJson(response, 422, { error: "Isi kontak yang bisa dihubungi." });
    if (!allowedTopics.includes(topic)) return sendJson(response, 422, { error: "Pilih topik konsultasi yang tersedia." });
    if (!allowedChannels.includes(channel)) return sendJson(response, 422, { error: "Pilih kanal konsultasi yang tersedia." });
    if (message.length < 20) return sendJson(response, 422, { error: "Ceritakan sedikit konteksnya, minimal 20 karakter." });

    const consultations = await readJson(jsonFiles.consultations, []);
    const requestRecord = {
      id: crypto.randomUUID(),
      name,
      contact,
      topic,
      channel,
      message,
      status: "new",
      createdAt: new Date().toISOString()
    };
    await writeJson(jsonFiles.consultations, [...(Array.isArray(consultations) ? consultations : []), requestRecord]);
    return sendJson(response, 201, { message: "Permintaan konsultasi sudah diterima. Tim kami akan menghubungi kamu." });
  }

  if (request.method === "POST" && url.pathname === "/api/check-ins") {
    const body = await parseBody(request);
    const mood = cleanText(body.mood, 30);
    if (!mood) return sendJson(response, 422, { error: "Pilih satu kondisi yang paling mendekati hari ini." });
    const checkins = await readJson(jsonFiles.checkins, []);
    await writeJson(jsonFiles.checkins, [
      ...(Array.isArray(checkins) ? checkins : []),
      { id: crypto.randomUUID(), mood, createdAt: new Date().toISOString() }
    ]);
    return sendJson(response, 201, { message: "Check-in tersimpan. Terima kasih sudah jujur hari ini." });
  }

  return sendJson(response, 404, { error: "Endpoint tidak ditemukan." });
}

const mimeTypes = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".svg": "image/svg+xml",
  ".json": "application/json; charset=utf-8"
};

async function serveStatic(request, response, url) {
  const requestedPath = url.pathname === "/" ? "/index.html" : url.pathname;
  const filePath = path.resolve(publicDir, `.${requestedPath}`);
  if (!filePath.startsWith(`${publicDir}${path.sep}`)) return sendJson(response, 403, { error: "Akses ditolak." });

  try {
    const content = await fs.readFile(filePath);
    const extension = path.extname(filePath);
    response.writeHead(200, {
      "Content-Type": mimeTypes[extension] || "application/octet-stream",
      "Cache-Control": "no-cache",
      "X-Content-Type-Options": "nosniff"
    });
    response.end(content);
  } catch (error) {
    if (error.code === "ENOENT") return sendJson(response, 404, { error: "Halaman tidak ditemukan." });
    console.error(error);
    sendJson(response, 500, { error: "Terjadi gangguan pada server." });
  }
}

const server = createServer(async (request, response) => {
  const url = new URL(request.url, `http://${request.headers.host || "localhost"}`);
  try {
    if (url.pathname.startsWith("/api/")) await handleApi(request, response, url);
    else if (request.method === "GET") await serveStatic(request, response, url);
    else sendJson(response, 405, { error: "Method tidak diizinkan." });
  } catch (error) {
    const status = error.statusCode || 500;
    console.error(error);
    sendJson(response, status, { error: status === 500 ? "Terjadi gangguan pada server." : error.message });
  }
});

server.listen(port, () => {
  console.log(`tabsipakarcinta berjalan di http://localhost:${port}`);
});
