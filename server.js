const http = require("http");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const PORT = process.env.PORT || 3030;
const PUBLIC_DIR = path.join(__dirname, "public");
const DATA_DIR = path.join(__dirname, "data");
const STORE_PATH = path.join(DATA_DIR, "store.json");
const CONFIG_PATH = path.join(__dirname, "config", "building-config.json");

const DEFAULT_SETTINGS = {
  totalLots: 308,
  spacesPerLot: 2,
};

function ensureStore() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }

  if (!fs.existsSync(STORE_PATH)) {
    fs.writeFileSync(
      STORE_PATH,
      JSON.stringify(
        {
          settings: DEFAULT_SETTINGS,
          draws: [],
        },
        null,
        2
      )
    );
  }
}

function readStore() {
  ensureStore();
  return JSON.parse(fs.readFileSync(STORE_PATH, "utf8"));
}

function writeStore(store) {
  ensureStore();
  fs.writeFileSync(STORE_PATH, JSON.stringify(store, null, 2));
}

function readConfig() {
  return JSON.parse(fs.readFileSync(CONFIG_PATH, "utf8"));
}

function writeConfig(config) {
  fs.writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2));
}

function json(response, statusCode, payload) {
  response.writeHead(statusCode, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
  });
  response.end(JSON.stringify(payload));
}

function readBody(request) {
  return new Promise((resolve, reject) => {
    let body = "";

    request.on("data", (chunk) => {
      body += chunk.toString("utf8");
      if (body.length > 1_000_000) {
        reject(new Error("Payload muito grande."));
      }
    });

    request.on("end", () => {
      if (!body) {
        resolve({});
        return;
      }

      try {
        resolve(JSON.parse(body));
      } catch (error) {
        reject(new Error("JSON invalido."));
      }
    });

    request.on("error", reject);
  });
}

function createLots(settings) {
  return Array.from({ length: settings.totalLots }, (_, index) => ({
    lotNumber: index + 1,
    lotLabel: `Lote ${index + 1}`,
    spaces: settings.spacesPerLot,
  }));
}

function formatApartmentNumber(floor, position) {
  return `${floor}${position}`;
}

function generateApartmentsFromConfig(config) {
  if (Array.isArray(config.apartments) && config.apartments.length) {
    return config.apartments.map((apartment, index) => ({
      order: index + 1,
      id: apartment.id || `apt-${index + 1}`,
      label: apartment.label,
      block: apartment.block,
      floor: apartment.floor,
    }));
  }

  const apartments = [];

  config.blocks.forEach((block) => {
    const basePerFloor = Math.floor(block.apartmentCount / config.floorsPerBlock);
    const remainder = block.apartmentCount % config.floorsPerBlock;

    for (let floor = 1; floor <= config.floorsPerBlock; floor += 1) {
      const apartmentsThisFloor = basePerFloor + (floor <= remainder ? 1 : 0);

      for (let position = 1; position <= apartmentsThisFloor; position += 1) {
        const apartmentNumber = formatApartmentNumber(floor, position);
        apartments.push({
          order: apartments.length + 1,
          id: `${block.name.toLowerCase()}-${String(floor).padStart(2, "0")}-${String(position).padStart(2, "0")}`,
          label: `${block.name} ${apartmentNumber}`,
          block: block.name,
          floor,
        });
      }
    }
  });

  return apartments;
}

function syncConfigApartments(config) {
  const apartments = generateApartmentsFromConfig(config);
  return {
    ...config,
    apartments: apartments.map((apartment) => ({
      id: apartment.id,
      label: apartment.label,
      block: apartment.block,
      floor: apartment.floor,
    })),
  };
}

function updateApartment(config, apartmentId, input) {
  const syncedConfig = syncConfigApartments(config);
  const apartments = syncedConfig.apartments || [];
  const apartment = apartments.find((item) => item.id === apartmentId);

  if (!apartment) {
    throw new Error("Apartamento nao encontrado.");
  }

  const block = String(input.block || "").trim();
  const number = String(input.number || "").trim();

  if (!block || !number) {
    throw new Error("Informe bloco e numero do apartamento.");
  }

  apartment.block = block;
  apartment.label = `${block} ${number}`;

  return syncedConfig;
}

function xmur3(seedText) {
  let hash = 1779033703 ^ seedText.length;
  for (let index = 0; index < seedText.length; index += 1) {
    hash = Math.imul(hash ^ seedText.charCodeAt(index), 3432918353);
    hash = (hash << 13) | (hash >>> 19);
  }

  return function nextSeed() {
    hash = Math.imul(hash ^ (hash >>> 16), 2246822507);
    hash = Math.imul(hash ^ (hash >>> 13), 3266489909);
    hash ^= hash >>> 16;
    return hash >>> 0;
  };
}

function sfc32(a, b, c, d) {
  return function nextRandom() {
    a >>>= 0;
    b >>>= 0;
    c >>>= 0;
    d >>>= 0;
    let value = (a + b) | 0;
    a = b ^ (b >>> 9);
    b = (c + (c << 3)) | 0;
    c = (c << 21) | (c >>> 11);
    d = (d + 1) | 0;
    value = (value + d) | 0;
    c = (c + value) | 0;
    return (value >>> 0) / 4294967296;
  };
}

function createPrng(seedText) {
  const seed = xmur3(seedText);
  return sfc32(seed(), seed(), seed(), seed());
}

function shuffle(items, nextRandom) {
  const copy = [...items];

  for (let index = copy.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(nextRandom() * (index + 1));
    [copy[index], copy[swapIndex]] = [copy[swapIndex], copy[index]];
  }

  return copy;
}

function hashPayload(payload) {
  return crypto.createHash("sha256").update(JSON.stringify(payload)).digest("hex");
}

function createDraw(store, config, seedInput) {
  const settings = store.settings || DEFAULT_SETTINGS;
  const apartments = generateApartmentsFromConfig(config);
  const lots = createLots(settings);

  if (apartments.length !== settings.totalLots) {
    throw new Error(
      `A configuracao possui ${apartments.length} apartamentos, mas o sistema espera ${settings.totalLots}.`
    );
  }

  const seed =
    seedInput && String(seedInput).trim()
      ? String(seedInput).trim()
      : `floresce-${new Date().toISOString()}`;
  const executedAt = new Date().toISOString();
  const drawId = crypto.randomUUID();
  const prng = createPrng(seed);
  const shuffledApartments = shuffle(apartments, prng);

  const assignments = lots.map((lot, index) => {
    const apartment = shuffledApartments[index];
    return {
      lotNumber: lot.lotNumber,
      lotLabel: lot.lotLabel,
      spaces: lot.spaces,
      apartmentId: apartment.id,
      apartmentLabel: apartment.label,
      block: apartment.block,
      floor: apartment.floor,
      drawPosition: index + 1,
    };
  });

  const auditBase = {
    drawId,
    executedAt,
    seed,
    algorithm: "Fisher-Yates shuffle + sfc32 seeded PRNG",
    settings,
    apartmentSource: {
      floorsPerBlock: config.floorsPerBlock,
      blocks: config.blocks,
      generationMode: Array.isArray(config.apartments) && config.apartments.length ? "explicit-list" : "auto-generated",
    },
    apartments,
    shuffledApartments: shuffledApartments.map((apartment, index) => ({
      drawPosition: index + 1,
      apartmentId: apartment.id,
      apartmentLabel: apartment.label,
      block: apartment.block,
      floor: apartment.floor,
    })),
    assignments,
  };

  return {
    ...auditBase,
    auditHash: hashPayload(auditBase),
  };
}

function summarizeByBlock(apartments) {
  return apartments.reduce((summary, apartment) => {
    summary[apartment.block] = (summary[apartment.block] || 0) + 1;
    return summary;
  }, {});
}

function buildState(store, config) {
  const apartments = generateApartmentsFromConfig(config);
  const latestDraw = store.draws[0] || null;

  return {
    settings: store.settings,
    configSummary: {
      condominiumName: config.condominiumName,
      floorsPerBlock: config.floorsPerBlock,
      totalApartments: apartments.length,
      blocks: summarizeByBlock(apartments),
      apartmentLabelPattern:
        config.apartmentLabelPattern ||
        "Bloco + numero do apartamento",
      assumptions: config.assumptions || [],
    },
    apartments,
    draws: store.draws.map((draw) => ({
      drawId: draw.drawId,
      executedAt: draw.executedAt,
      seed: draw.seed,
      auditHash: draw.auditHash,
    })),
    latestDraw,
    stats: {
      lotCount: store.settings.totalLots,
      spacesPerLot: store.settings.spacesPerLot,
      totalSpaces: store.settings.totalLots * store.settings.spacesPerLot,
      apartmentCount: apartments.length,
    },
  };
}

function serveStatic(request, response) {
  const requestPath = request.url === "/" ? "/index.html" : request.url;
  const safePath = path.normalize(requestPath).replace(/^(\.\.[/\\])+/, "");
  const filePath = path.join(PUBLIC_DIR, safePath);

  if (!filePath.startsWith(PUBLIC_DIR)) {
    response.writeHead(403);
    response.end("Forbidden");
    return;
  }

  fs.readFile(filePath, (error, file) => {
    if (error) {
      response.writeHead(404);
      response.end("Not found");
      return;
    }

    const extension = path.extname(filePath);
    const contentTypes = {
      ".html": "text/html; charset=utf-8",
      ".css": "text/css; charset=utf-8",
      ".js": "application/javascript; charset=utf-8",
      ".json": "application/json; charset=utf-8",
    };

    response.writeHead(200, {
      "Content-Type": contentTypes[extension] || "application/octet-stream",
      "Cache-Control": "no-store",
    });
    response.end(file);
  });
}

async function handleApi(request, response) {
  const url = new URL(request.url, `http://${request.headers.host}`);
  const store = readStore();
  const config = readConfig();

  if (request.method === "GET" && url.pathname === "/api/state") {
    json(response, 200, buildState(store, config));
    return;
  }

  if (request.method === "PUT" && url.pathname.startsWith("/api/apartments/")) {
    const apartmentId = decodeURIComponent(url.pathname.split("/").pop());
    const body = await readBody(request);
    const updatedConfig = updateApartment(config, apartmentId, body);
    writeConfig(updatedConfig);
    json(response, 200, { apartmentId, ok: true });
    return;
  }

  if (request.method === "POST" && url.pathname === "/api/draws") {
    const body = await readBody(request);
    const draw = createDraw(store, config, body.seed);
    store.draws.unshift(draw);
    writeStore(store);
    json(response, 201, { draw });
    return;
  }

  if (request.method === "GET" && url.pathname.startsWith("/api/draws/")) {
    const drawId = decodeURIComponent(url.pathname.split("/").pop());
    const draw = store.draws.find((item) => item.drawId === drawId);

    if (!draw) {
      json(response, 404, { error: "Sorteio nao encontrado." });
      return;
    }

    json(response, 200, { draw });
    return;
  }

  if (request.method === "DELETE" && url.pathname.startsWith("/api/draws/")) {
    const drawId = decodeURIComponent(url.pathname.split("/").pop());
    const drawExists = store.draws.some((item) => item.drawId === drawId);

    if (!drawExists) {
      json(response, 404, { error: "Sorteio nao encontrado." });
      return;
    }

    store.draws = store.draws.filter((item) => item.drawId !== drawId);
    writeStore(store);
    json(response, 200, { ok: true });
    return;
  }

  if (request.method === "DELETE" && url.pathname === "/api/draws") {
    store.draws = [];
    writeStore(store);
    json(response, 200, { ok: true });
    return;
  }

  json(response, 404, { error: "Rota nao encontrada." });
}

const server = http.createServer(async (request, response) => {
  try {
    if (request.url.startsWith("/api/")) {
      await handleApi(request, response);
      return;
    }

    serveStatic(request, response);
  } catch (error) {
    json(response, 400, { error: error.message || "Erro interno." });
  }
});

server.listen(PORT, () => {
  ensureStore();
  console.log(`Sorteio Floresce rodando em http://localhost:${PORT}`);
});
