export const TRAVEL_FLAG = "mapNoteTravel";
const SPEED = 120; // Canvas pixels per second.
const START_DELAY = 300;

export function createTravel(note, stops, current, next, loop) {
  const origin = { x: note._source.x, y: note._source.y, index: current, at: 0 };
  const points = [origin];
  const count = loop ? stops.length + 1 : 1;
  for (let i = 0; i < count; i++) {
    const index = (next + i) % stops.length;
    const { x, y } = stops[index];
    const previous = points.at(-1);
    const at = previous.at + 1000 * Math.hypot(x - previous.x, y - previous.y) / SPEED;
    points.push({ x, y, index, at });
  }
  const end = points.at(-1);
  const repeatAt = loop ? points[1].at : null;
  if (end.at <= (repeatAt ?? 0)) return null;
  const anchor = loop ? origin : end;
  return { points, repeatAt, startedAt: serverTime() + START_DELAY, x: anchor.x, y: anchor.y };
}

export function travelPosition(note, moduleId, now = serverTime()) {
  const travel = note?.getFlag(moduleId, TRAVEL_FLAG);
  if (!travel || note._source.x !== travel.x || note._source.y !== travel.y) return null;

  const { points, repeatAt, startedAt } = travel;
  const duration = points.at(-1).at;
  let elapsed = now - startedAt;
  if (elapsed <= 0) return points[0];
  if (elapsed >= duration) {
    if (repeatAt === null) return null;
    elapsed = repeatAt + (elapsed - repeatAt) % (duration - repeatAt);
  }

  const index = points.findIndex(point => point.at > elapsed);
  const from = points[index - 1];
  const to = points[index];
  const progress = (elapsed - from.at) / (to.at - from.at);
  return {
    x: from.x + (to.x - from.x) * progress,
    y: from.y + (to.y - from.y) * progress,
    index: from.index,
  };
}

export function registerMapNoteTravel(moduleId, onFinish) {
  const moving = new Set();
  let ticker;

  Hooks.on("canvasReady", () => {
    ticker = canvas.app.ticker;
    for (const note of canvas.scene.notes.values()) sync(note);
  });
  Hooks.on("drawNote", note => sync(note.document));
  Hooks.on("updateNote", sync);
  Hooks.on("deleteNote", note => forget(note));
  Hooks.on("canvasTearDown", () => {
    ticker?.remove(tick);
    for (const note of moving) setPosition(note, note._source);
    moving.clear();
    ticker = undefined;
  });

  // A normal move ends playback. Route controls supply their own travel flag.
  Hooks.on("preUpdateNote", (note, changes) => {
    if (!("x" in changes || "y" in changes) || !note.getFlag(moduleId, TRAVEL_FLAG)) return;
    const path = `flags.${moduleId}.${TRAVEL_FLAG}`;
    if (!(path in changes) && !foundry.utils.hasProperty(changes, path)) {
      foundry.utils.setProperty(changes, path, null);
    }
  });

  function sync(note) {
    if (!ticker || note.parent !== canvas.scene || note.object?.isPreview) return;
    const position = travelPosition(note, moduleId);
    if (!position) {
      if (moving.has(note)) finish(note);
      return;
    }
    if (!moving.size) ticker.add(tick);
    moving.add(note);
    setPosition(note, position);
  }

  function tick() {
    const now = serverTime();
    for (const note of moving) {
      const position = travelPosition(note, moduleId, now);
      if (position) setPosition(note, position);
      else finish(note);
    }
  }

  function finish(note) {
    setPosition(note, note._source);
    forget(note);
    onFinish(note);
  }

  function forget(note) {
    if (moving.delete(note) && !moving.size) ticker?.remove(tick);
  }
}

function setPosition(note, { x, y }) {
  if (note.x === x && note.y === y) return;
  // Move the prepared coordinates so native hit testing and vision follow the art.
  // The stored document position changes only when a GM starts or stops travel.
  note.x = x;
  note.y = y;
  note.object?.renderFlags.set({ refreshPosition: true, refreshVisibility: true });
}

function serverTime() {
  const time = game.time?.serverTime;
  return Number.isFinite(time) ? time : Date.now();
}
