const FEED_URL = './feed.json';
const REFRESH_INTERVAL_MS = 60000;

let lastGoodData = null;
let isStale = false;

function qs(id) { return document.getElementById(id); }

function fmtVal(v) {
  if (v === null || v === undefined || v === '') return '—';
  return v;
}

function stateClass(state) {
  const map = {
    'PASS': 'state-pass',
    'REWORK': 'state-rework',
    'BLOCKED': 'state-blocked',
    'ACTIVE': 'state-active',
    'BUILT_WAITING_VERIFICATION': 'state-built',
    'READY': 'state-ready',
    'WAIT_DEP': 'state-waitdep',
    'NOT_STARTED': 'state-notstarted',
    'STATE_UNAVAILABLE': 'state-unavailable'
  };
  return map[state] || 'state-unknown';
}

function renderStatePill(state) {
  const label = state ? state : 'STATE_UNAVAILABLE';
  const cls = stateClass(label);
  return `<span class="pill ${cls}">${label}</span>`;
}

function setMirrorStatusPill(status) {
  const el = qs('mirror-status');
  el.textContent = `MIRROR: ${fmtVal(status)}`;
  el.className = 'pill ' + (status === 'CURRENT' ? 'state-pass' : status ? 'state-rework' : 'unknown');
}

function showErrorBanner(show) {
  qs('error-banner').classList.toggle('hidden', !show);
}

function showStaleBanner(show) {
  qs('stale-banner').classList.toggle('hidden', !show);
}

function renderSummary(data) {
  const health = data.health || {};
  const tasks = data.tasks || [];
  const counts = {
    total: tasks.length,
    PASS: 0, ACTIVE: 0, READY: 0,
    BUILT_WAITING_VERIFICATION: 0, REWORK: 0, BLOCKED: 0, WAIT_DEP: 0
  };
  tasks.forEach(t => {
    if (counts.hasOwnProperty(t.state)) counts[t.state]++;
  });
  const items = [
    ['Total Tasks', counts.total],
    ['PASS', health.pass_count !== undefined ? health.pass_count : counts.PASS],
    ['ACTIVE', health.active_count !== undefined ? health.active_count : counts.ACTIVE],
    ['READY', health.ready_count !== undefined ? health.ready_count : counts.READY],
    ['BUILT_WAITING_VERIFICATION', health.built_waiting_verification_count !== undefined ? health.built_waiting_verification_count : counts.BUILT_WAITING_VERIFICATION],
    ['REWORK', health.rework_count !== undefined ? health.rework_count : counts.REWORK],
    ['BLOCKED', health.blocked_count !== undefined ? health.blocked_count : counts.BLOCKED],
    ['WAIT_DEP', health.wait_dep_count !== undefined ? health.wait_dep_count : counts.WAIT_DEP]
  ];
  qs('summary-grid').innerHTML = items.map(([label, val]) =>
    `<div class="summary-card"><div class="summary-label">${label}</div><div class="summary-value">${fmtVal(val)}</div></div>`
  ).join('');
}

function renderTasks(data) {
  const tasks = data.tasks || [];
  const body = qs('tasks-body');
  if (!tasks.length) {
    body.innerHTML = '<tr><td colspan="9">—</td></tr>';
    return;
  }
  body.innerHTML = tasks.map(t => {
    const deps = (t.dependencies && t.dependencies.length) ? t.dependencies.join(', ') : '—';
    return `<tr>
      <td>${fmtVal(t.task_id)}</td>
      <td>${fmtVal(t.label)}</td>
      <td>${fmtVal(t.lane)}</td>
      <td>${renderStatePill(t.state)}</td>
      <td>${deps}</td>
      <td>${fmtVal(t.builder)}</td>
      <td>${fmtVal(t.verification_state)}</td>
      <td>${fmtVal(t.retry_count)}</td>
      <td>${fmtVal(t.next_action)}</td>
    </tr>`;
  }).join('');
}

function renderWorkers(data) {
  const workers = data.workers || [];
  const body = qs('workers-body');
  const section = qs('workers-section');
  if (!workers.length) {
    section.classList.add('hidden');
    return;
  }
  section.classList.remove('hidden');
  body.innerHTML = workers.map(w => {
    return `<tr>
      <td>${fmtVal(w.worker_id)}</td>
      <td>${fmtVal(w.label)}</td>
      <td>${fmtVal(w.status)}</td>
      <td>${fmtVal(w.current_task)}</td>
      <td>${fmtVal(w.claim_state)}</td>
      <td>${fmtVal(w.last_heartbeat || w.last_update)}</td>
    </tr>`;
  }).join('');
}

function renderHealth(data) {
  const health = data.health || {};
  const items = [
    ['Mirror Status', fmtVal(data.mirror_status)],
    ['Health Status', fmtVal(health.status)],
    ['Fail Closed', fmtVal(health.fail_closed)],
    ['Snapshot Age (s)', fmtVal(health.source_snapshot_age_seconds_at_publish)],
    ['Task Count', fmtVal(health.task_count)]
  ];
  qs('health-grid').innerHTML = items.map(([label, val]) =>
    `<div class="health-card"><div class="health-label">${label}</div><div class="health-value">${val}</div></div>`
  ).join('');
}

function renderEvents(data) {
  const events = data.recent_events || [];
  const section = qs('events-section');
  const list = qs('events-list');
  if (!events.length) {
    section.classList.add('hidden');
    return;
  }
  section.classList.remove('hidden');
  list.innerHTML = events.map(e =>
    `<li><span class="event-task">${fmtVal(e.task_id)}</span> — <span class="event-name">${fmtVal(e.event)}</span> by ${fmtVal(e.actor)} at ${fmtVal(e.at)}</li>`
  ).join('');
}

function renderAll(data) {
  setMirrorStatusPill(data.mirror_status);
  qs('feed-generated').textContent = `Generated: ${fmtVal(data.generated_at)}`;
  qs('source-modified').textContent = `Source modified: ${fmtVal(data.source_modified_at)}`;
  renderSummary(data);
  renderTasks(data);
  renderWorkers(data);
  renderHealth(data);
  renderEvents(data);
}

function setLastRendered() {
  qs('last-rendered').textContent = `Last rendered: ${new Date().toLocaleString()}`;
}

function setUnavailableState() {
  showErrorBanner(true);
  showStaleBanner(false);
  setMirrorStatusPill('STATE_UNAVAILABLE');
  qs('feed-generated').textContent = 'Generated: —';
  qs('source-modified').textContent = 'Source modified: —';
  qs('summary-grid').innerHTML = '';
  qs('tasks-body').innerHTML = '<tr><td colspan="9">STATE_UNAVAILABLE</td></tr>';
  qs('workers-section').classList.add('hidden');
  qs('health-grid').innerHTML = '';
  qs('events-section').classList.add('hidden');
}

async function fetchFeed() {
  try {
    const response = await fetch(`./feed.json?t=${Date.now()}`, {
      cache: 'no-store'
    });
    if (!response.ok) throw new Error('HTTP ' + response.status);
    const data = await response.json();
    if (!data || typeof data !== 'object') throw new Error('Malformed feed');

    lastGoodData = data;
    isStale = false;
    showErrorBanner(false);
    showStaleBanner(false);
    renderAll(data);
  } catch (err) {
    if (lastGoodData) {
      isStale = true;
      showErrorBanner(false);
      showStaleBanner(true);
    } else {
      setUnavailableState();
    }
  } finally {
    setLastRendered();
  }
}

qs('refresh-btn').addEventListener('click', fetchFeed);

fetchFeed();
setInterval(fetchFeed, REFRESH_INTERVAL_MS);
