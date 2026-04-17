import { API_URL } from "../constants";
import { debounce } from "./main-content";
import { activateTab } from "..";

const LESSON_FILTERS_STORAGE_KEY = "lessonFilters";

let lessonFilters = {
  cabinets: [],
  lessonTypes: ["group", "individual", "trial"],
  searchItems: [],
};

// === ДИНАМИЧЕСКИЕ ДАТЫ ===
let filterCabinetsCache = [];

const daysOfWeek = ["Вс", "Пн", "Вт", "Ср", "Чт", "Пт", "Сб"];
const months = [
  "янв.",
  "фев.",
  "мар.",
  "апр.",
  "мая",
  "июн.",
  "июл.",
  "авг.",
  "сен.",
  "окт.",
  "ноя.",
  "дек.",
];

const DEFAULT_CALENDAR_SETTINGS = {
  workingDays: [1, 2, 3, 4, 5, 6],
  startHour: 8,
  endHour: 20,
  defaultView: "week",
  cardFields: {
    cabinet: true,
    subject: true,
    type: true,
    teacher: true,
    comment: true,
    clients: false,
  },
};

let calendarSettings = { ...DEFAULT_CALENDAR_SETTINGS };

let currentDate = new Date();
currentDate.setHours(0, 0, 0, 0);

let currentMonday = getMonday(currentDate);
let currentView = "week";

let cachedCabs = [];
let selectedSlots = [];

function getMonday(date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  const day = d.getDay();
  d.setDate(d.getDate() - (day === 0 ? 6 : day - 1));
  return d;
}

function getBranch() {
  return localStorage.getItem("selectedCity") || "Бобруйск";
}

function getVisibleWeekDays() {
  return [...calendarSettings.workingDays].sort((a, b) => a - b);
}

function getHoursRange() {
  return {
    start: Number(calendarSettings.startHour),
    end: Number(calendarSettings.endHour),
  };
}

function toggleDayMode() {
  const grid = document.getElementById("scheduleGrid");
  if (!grid) return;

  if (currentView === "day") {
    grid.classList.add("day-mode");
  } else {
    grid.classList.remove("day-mode");
  }
}

// === ОБНОВЛЕНИЕ ЗАГОЛОВКА ===
function updateHeader() {
  const periodEl = document.getElementById("schedulePeriod");
  const rangeEl = document.getElementById("dateRange");

  if (!periodEl || !rangeEl) {
    console.error("Элементы #schedulePeriod или #dateRange не найдены");
    return;
  }

  if (currentView === "week") {
    const visibleDays = getVisibleWeekDays();
    const firstDayOffset = visibleDays[0] - 1;
    const lastDayOffset = visibleDays[visibleDays.length - 1] - 1;

    const start = new Date(currentMonday);
    start.setDate(currentMonday.getDate() + firstDayOffset);

    const end = new Date(currentMonday);
    end.setDate(currentMonday.getDate() + lastDayOffset);

    const startStr = `${start.getDate()} ${months[start.getMonth()]}`;
    const endStr = `${end.getDate()} ${months[end.getMonth()]} ${end.getFullYear()} г.`;

    periodEl.textContent = "Неделя";
    rangeEl.textContent = `${startStr} – ${endStr}`;
  } else {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const selectedDateStr = `${currentDate.getDate()} ${months[currentDate.getMonth()]} ${currentDate.getFullYear()} г.`;

    if (currentDate.getTime() === today.getTime()) {
      periodEl.textContent = "Сегодня";
    } else {
      periodEl.textContent = "День";
    }

    rangeEl.textContent = selectedDateStr;
  }
}

function updateGridColumns(columnsCount) {
  const grid = document.getElementById("scheduleGrid");
  if (!grid) return;

  grid.style.gridTemplateColumns = `80px repeat(${columnsCount}, minmax(0, 1fr))`;
}

// === РЕНДЕР СЕТКИ НЕДЕЛИ ===
function renderWeekGrid() {
  const grid = document.getElementById("scheduleGrid");
  if (!grid) return;

  const { start, end } = getHoursRange();
  const visibleDays = getVisibleWeekDays();
  const SLOT = 20;

  updateGridColumns(visibleDays.length);

  grid.innerHTML = "";
  grid.innerHTML += `<div class="time-cell"></div>`;

  visibleDays.forEach((weekday) => {
    const date = new Date(currentMonday);
    date.setDate(currentMonday.getDate() + (weekday - 1));
    const dayName = daysOfWeek[date.getDay()];
    const dayNum = date.getDate();

    grid.innerHTML += `
      <div class="day-cell" data-weekday="${weekday}">
        ${dayNum}.${date.getMonth() + 1}, ${dayName.slice(0, 2).toLowerCase()}
      </div>
    `;
  });

  for (let hour = start; hour <= end; hour++) {
    for (let min = 0; min < 60; min += SLOT) {
      const showLabel = min === 0;
      const timeStr = `${hour.toString().padStart(2, "0")}:${min.toString().padStart(2, "0")}`;

      grid.innerHTML += `<div class="time-cell">${showLabel ? timeStr : ""}</div>`;

      visibleDays.forEach((weekday) => {
        grid.innerHTML += `
          <div 
            class="lesson-cell slot-20" 
            data-day="${weekday}" 
            data-hour="${hour}" 
            data-minute="${min}">
          </div>
        `;
      });
    }
  }

  toggleDayMode();
  updateHeader();
}

// === РЕНДЕР СЕТКИ ДНЯ (КОЛОНКИ = КАБИНЕТЫ) ===
function renderDayGrid(cabinets = []) {
  const grid = document.getElementById("scheduleGrid");
  if (!grid) return;

  const { start, end } = getHoursRange();
  const SLOT = 20;

  updateGridColumns(cabinets.length);

  grid.innerHTML = "";
  grid.innerHTML += `<div class="time-cell"></div>`;

  cabinets.forEach((cab) => {
    grid.innerHTML += `<div class="day-cell">${cab.cabinet}</div>`;
  });

  for (let hour = start; hour <= end; hour++) {
    for (let min = 0; min < 60; min += SLOT) {
      const showLabel = min === 0;
      const timeStr = `${hour.toString().padStart(2, "0")}:${min.toString().padStart(2, "0")}`;

      grid.innerHTML += `<div class="time-cell">${showLabel ? timeStr : ""}</div>`;

      cabinets.forEach((cab, index) => {
        grid.innerHTML += `
          <div 
            class="lesson-cell slot-20" 
            data-day="${index}" 
            data-hour="${hour}" 
            data-minute="${min}">
          </div>
        `;
      });
    }
  }

  toggleDayMode();
  updateHeader();
}
function renderGrid(cabinets = []) {
  if (currentView === "week") {
    renderWeekGrid();
  } else {
    renderDayGrid(cabinets);
  }
}

function waitForAuth(timeout = 5000) {
  return new Promise((resolve) => {
    const started = Date.now();

    const check = () => {
      if (window.t_id !== undefined) {
        resolve();
        return;
      }

      if (Date.now() - started > timeout) {
        resolve();
        return;
      }

      setTimeout(check, 100);
    };

    check();
  });
}

async function loadCalendarSettings() {
  const branch = getBranch();

  const response = await fetch(
    `${API_URL}/calendar-settings.php?branch=${encodeURIComponent(branch)}`,
    { credentials: "include" },
  );

  const result = await response.json();

  if (!result.success) {
    throw new Error(
      result.message || "Не удалось загрузить настройки календаря",
    );
  }

  calendarSettings = {
    ...DEFAULT_CALENDAR_SETTINGS,
    ...result.data,
    cardFields: {
      ...DEFAULT_CALENDAR_SETTINGS.cardFields,
      ...(result.data?.cardFields || {}),
    },
  };

  currentView = calendarSettings.defaultView || "week";
}

async function fetchScheduleData() {
  let lessons = [];
  let cabinets = [];

  await waitForAuth();

  const branch = getBranch();
  let url = `${API_URL}/lessons.php?branch=${encodeURIComponent(branch)}`;

  if (window.t_id) {
    url += `&teacher_id=${window.t_id}`;
  }

  if (currentView === "day") {
    url += `&date=${formatDateForInput(currentDate)}`;
  } else {
    const visibleDays = getVisibleWeekDays();
    const start = new Date(currentMonday);
    start.setDate(currentMonday.getDate() + (visibleDays[0] - 1));

    const end = new Date(currentMonday);
    end.setDate(
      currentMonday.getDate() + (visibleDays[visibleDays.length - 1] - 1),
    );

    url += `&start=${formatDateForInput(start)}&end=${formatDateForInput(end)}`;
  }

  const lessonsResponse = await fetch(url, { credentials: "include" });
  const lessonsResult = await lessonsResponse.json();

  if (!lessonsResult.success) {
    throw new Error(
      "Ошибка загрузки уроков: " +
        (lessonsResult.message || "Неизвестная ошибка"),
    );
  }

  lessons = lessonsResult.data || [];

  const cabinetsResponse = await fetch(
    `${API_URL}/cabinets.php?branch=${encodeURIComponent(branch)}`,
    { credentials: "include" },
  );
  const cabinetsResult = await cabinetsResponse.json();

  if (cabinetsResult.success) {
    cabinets = (cabinetsResult.data || []).filter(
      (cab) => cab.cabinet_active === "true",
    );
  } else {
    throw new Error(
      "Ошибка загрузки кабинетов: " +
        (cabinetsResult.message || "Неизвестная ошибка"),
    );
  }

  cachedCabs = cabinets;
  return { lessons, cabinets };
}

function getLessonTypeText(type) {
  if (type === "group") return "Групповой";
  if (type === "individual") return "Индивидуальный";
  return "Пробный";
}

function buildCardContent(lesson, cabinetName = "") {
  const fields = calendarSettings.cardFields || {};
  const titleParts = [];
  const infoParts = [];

  if (fields.subject) {
    titleParts.push(`<div class="name">${lesson.LESSON_NAME || "Урок"}</div>`);
  }

  if (fields.type) {
    infoParts.push(getLessonTypeText(lesson.LESSON_TYPE));
  }

  if (fields.teacher && lesson.LESSON_TEACHER) {
    infoParts.push(`<strong>Преподаватель:</strong> ${lesson.LESSON_TEACHER}`);
  }

  if (fields.cabinet && cabinetName) {
    infoParts.push(`<strong>Аудитория:</strong> ${cabinetName}`);
  }

  if (fields.comment && lesson.LESSON_COMMENT) {
    infoParts.push(`<strong>Комментарий:</strong> ${lesson.LESSON_COMMENT}`);
  }

  if (fields.clients && lesson.LESSON_CLIENTS) {
    infoParts.push(`<strong>Клиенты:</strong> ${lesson.LESSON_CLIENTS}`);
  }

  return `
    <div class="time">${lesson.LESSON_START.slice(0, 5)} – ${lesson.LESSON_END.slice(0, 5)}</div>
    ${titleParts.join("")}
    <div class="info">${infoParts.join("<br>")}</div>
  `;
}

function createLessonBlock(lesson, cabinets, layout) {
  const startParts = lesson.LESSON_START.split(":");
  const endParts = lesson.LESSON_END.split(":");

  const startHour = parseInt(startParts[0], 10);
  const startMin = parseInt(startParts[1], 10);
  const endHour = parseInt(endParts[0], 10);
  const endMin = parseInt(endParts[1], 10);

  const { start, end } = getHoursRange();
  if (startHour < start || startHour > end) {
    return { cell: null, element: null };
  }

  const slotMinute = Math.floor(startMin / 20) * 20;

  const cell = document.querySelector(
    `.lesson-cell[data-day="${layout.day}"][data-hour="${startHour}"][data-minute="${slotMinute}"]`,
  );
  if (!cell) return { cell: null, element: null };

  const durationMinutes = (endHour - startHour) * 60 + (endMin - startMin);

  const offsetInsideSlot = startMin - slotMinute;
  const top = `${(offsetInsideSlot / 20) * 100}%`;

  const slotHeightMinutes = 20;
  const height = `${(durationMinutes / slotHeightMinutes) * 100}%`;

  const cabinet = cabinets.find((c) => c.id == lesson.LESSON_CABINET);
  const color = cabinet ? cabinet.cabinet_color : "#95a5a6";

  const block = document.createElement("div");
  block.className = "event";
  block.dataset.id = lesson.LESSON_ID;

  block.style.top = top;
  block.style.height = height;
  block.style.backgroundColor = "#fff";
  block.style.border = `1px solid ${color}`;
  block.style.borderBottom = `10px solid ${color}`;
  block.style.width = layout.width;
  block.style.left = layout.left;
  block.style.marginLeft = layout.marginLeft;

  if (layout.margin) {
    block.style.margin = layout.margin;
  }

  block.innerHTML = buildCardContent(lesson, cabinet?.cabinet || "");

  block.addEventListener("click", () => {
    openLessonModal(lesson.LESSON_ID);
  });

  return { cell, element: block };
}

function renderWeekLessonsForDay(day, dayLessons, cabinets) {
  const sortedLessons = dayLessons
    .map((lesson) => ({
      lesson,
      start: parseInt(lesson.LESSON_START.replace(":", "")),
      end: parseInt(lesson.LESSON_END.replace(":", "")),
    }))
    .sort((a, b) => a.start - b.start);

  const groups = [];
  let currentGroup = [];

  sortedLessons.forEach((item) => {
    if (!currentGroup.length) {
      currentGroup.push(item);
      return;
    }

    const maxEnd = Math.max(...currentGroup.map((l) => l.end));

    if (item.start < maxEnd) {
      currentGroup.push(item);
    } else {
      groups.push(currentGroup);
      currentGroup = [item];
    }
  });

  if (currentGroup.length) {
    groups.push(currentGroup);
  }

  groups.forEach((group) => {
    const columns = [];

    group.forEach((item) => {
      let placed = false;

      for (const col of columns) {
        const last = col[col.length - 1];
        if (!last || item.start >= last.end) {
          col.push(item);
          placed = true;
          break;
        }
      }

      if (!placed) {
        columns.push([item]);
      }
    });

    const maxCols = columns.length;

    columns.forEach((col, colIdx) => {
      col.forEach(({ lesson }) => {
        const block = createLessonBlock(lesson, cabinets, {
          day,
          width: `calc(100% / ${maxCols} - 8px)`,
          left: `calc(${colIdx} * (100% / ${maxCols}) + 4px)`,
          marginLeft: colIdx > 0 ? "8px" : "4px",
        });

        if (block.cell && block.element) {
          block.cell.appendChild(block.element);
        }
      });
    });
  });
}

function renderDayLessonsForCabinet(day, dayLessons, cabinets) {
  dayLessons.forEach((lesson) => {
    const block = createLessonBlock(lesson, cabinets, {
      day,
      width: "calc(100% - 8px)",
      left: "0",
      marginLeft: "4px",
    });

    if (block.cell && block.element) {
      block.cell.appendChild(block.element);
    }
  });
}

function normalizeFilterValue(value) {
  return String(value || "")
    .trim()
    .toLowerCase();
}

function splitCommaValues(value) {
  return String(value || "")
    .split(",")
    .map((item) => normalizeFilterValue(item))
    .filter(Boolean);
}

function filterLessonsBeforeRender(lessons) {
  return lessons.filter((lesson) => {
    if (lessonFilters.cabinets.length > 0) {
      if (!lessonFilters.cabinets.includes(String(lesson.LESSON_CABINET))) {
        return false;
      }
    }

    if (lessonFilters.lessonTypes.length > 0) {
      if (!lessonFilters.lessonTypes.includes(lesson.LESSON_TYPE)) {
        return false;
      }
    }

    if (lessonFilters.searchItems.length > 0) {
      const lessonSubject = normalizeFilterValue(lesson.LESSON_NAME);
      const lessonClients = splitCommaValues(lesson.LESSON_CLIENTS);
      const lessonTeachers = splitCommaValues(lesson.LESSON_TEACHER);
      const lessonContract = normalizeFilterValue(lesson.LESSON_CONTRACT);
      const lessonComment = normalizeFilterValue(lesson.LESSON_COMMENT);

      const matched = lessonFilters.searchItems.some((item) => {
        const label = normalizeFilterValue(item.label);

        if (item.type === "subject") {
          return lessonSubject.includes(label);
        }

        if (item.type === "client") {
          return lessonClients.some((c) => c.includes(label));
        }

        if (item.type === "teacher") {
          return lessonTeachers.some((t) => t.includes(label));
        }

        if (item.type === "contract") {
          return lessonContract.includes(label);
        }

        if (item.type === "comment") {
          return lessonComment.includes(label);
        }

        return false;
      });

      if (!matched) return false;
    }

    return true;
  });
}

function renderLessons(lessons, cabinets) {
  lessons = filterLessonsBeforeRender(lessons);

  document.querySelectorAll(".lesson-cell").forEach((cell) => {
    cell.innerHTML = "";
  });

  const daysGroups = {};

  lessons.forEach((lesson) => {
    const lessonDate = new Date(lesson.LESSON_DATA);
    let groupKey;

    if (currentView === "day") {
      groupKey = cabinets.findIndex((c) => c.id == lesson.LESSON_CABINET);
      if (groupKey === -1) return;
    } else {
      const weekday = lessonDate.getDay() === 0 ? 7 : lessonDate.getDay();
      if (!calendarSettings.workingDays.includes(weekday)) return;
      groupKey = weekday;
    }

    if (!daysGroups[groupKey]) {
      daysGroups[groupKey] = [];
    }

    daysGroups[groupKey].push(lesson);
  });

  Object.keys(daysGroups).forEach((groupKey) => {
    const dayLessons = daysGroups[groupKey];

    dayLessons.sort((a, b) => {
      const startA = parseInt(a.LESSON_START.replace(":", ""));
      const startB = parseInt(b.LESSON_START.replace(":", ""));
      return startA - startB;
    });

    if (currentView === "week") {
      renderWeekLessonsForDay(groupKey, dayLessons, cabinets);
    } else {
      renderDayLessonsForCabinet(groupKey, dayLessons, cabinets);
    }
  });
}

let isSelecting = false;
let startCell = null;

function enableTimeSelection() {
  const cells = document.querySelectorAll(".lesson-cell");

  cells.forEach((cell) => {
    cell.addEventListener("mousedown", () => {
      isSelecting = true;
      startCell = cell;

      selectedSlots = [];
      document
        .querySelectorAll(".lesson-cell.selected")
        .forEach((c) => c.classList.remove("selected"));

      cell.classList.add("selected");
      selectedSlots.push(cell);
    });

    cell.addEventListener("dblclick", () => {
      selectedSlots = [cell];

      document
        .querySelectorAll(".lesson-cell")
        .forEach((c) => c.classList.remove("selected"));

      cell.classList.add("selected");

      document.getElementById("addLesson").click();
    });

    cell.addEventListener("mouseenter", () => {
      if (!isSelecting || !startCell) return;

      const startDay = startCell.dataset.day;
      const currentDay = cell.dataset.day;

      if (startDay !== currentDay) return;

      const allCells = Array.from(
        document.querySelectorAll(`.lesson-cell[data-day="${startDay}"]`),
      );

      const startIndex = allCells.indexOf(startCell);
      const currentIndex = allCells.indexOf(cell);

      const [from, to] =
        startIndex < currentIndex
          ? [startIndex, currentIndex]
          : [currentIndex, startIndex];

      selectedSlots = [];

      // очищаем только эту колонку
      allCells.forEach((c) => c.classList.remove("selected"));

      for (let i = from; i <= to; i++) {
        allCells[i].classList.add("selected");
        selectedSlots.push(allCells[i]);
      }
    });
  });

  document.addEventListener("mouseup", () => {
    if (isSelecting) {
      isSelecting = false;

      if (selectedSlots.length) {
        const firstCell = selectedSlots[0];

        const selectedCabinetIndex = Number(firstCell.dataset.day);

        window.selectedCabinetId =
          currentView === "day" && cachedCabs[selectedCabinetIndex]
            ? cachedCabs[selectedCabinetIndex].id
            : null;
      }
    }
  });
}

function getTimeFromSlots() {
  if (!selectedSlots.length) return null;

  const sorted = [...selectedSlots].sort((a, b) => {
    const ah = +a.dataset.hour;
    const am = +(a.dataset.minute ?? 0);
    const bh = +b.dataset.hour;
    const bm = +(b.dataset.minute ?? 0);

    return ah * 60 + am - (bh * 60 + bm);
  });

  const first = sorted[0];
  const last = sorted[sorted.length - 1];

  const startH = +first.dataset.hour;
  const startM = +first.dataset.minute;

  const endH = +last.dataset.hour;
  const endM = +last.dataset.minute;

  const SLOT = 20;
  const endTotal = endH * 60 + endM + SLOT;

  const finalEndH = Math.floor(endTotal / 60);
  const finalEndM = endTotal % 60;

  return {
    start: `${String(startH).padStart(2, "0")}:${String(startM).padStart(2, "0")}`,
    end: `${String(finalEndH).padStart(2, "0")}:${String(finalEndM).padStart(2, "0")}`,
  };
}

async function initSchedule() {
  try {
    const { lessons, cabinets } = await fetchScheduleData();
    renderGrid(cabinets);
    enableTimeSelection();
    renderLessons(lessons, cabinets);
    updateTodayButtonState();
  } catch (err) {
    console.error("Ошибка загрузки расписания:", err);
    alert(err.message || "Нет связи с сервером");
  }
}

// === ПЕРЕКЛЮЧЕНИЕ ВИДА ===
document.querySelectorAll(".view-btn").forEach((button) => {
  button.addEventListener("click", async () => {
    document
      .querySelectorAll(".view-btn")
      .forEach((btn) => btn.classList.remove("view-btn--active"));

    button.classList.add("view-btn--active");
    currentView = button.dataset.view;

    await initSchedule();
  });
});

// === СТРЕЛКИ НАВИГАЦИИ ===
document
  .querySelector(".nav-arrow--left")
  ?.addEventListener("click", async () => {
    if (currentView === "week") {
      currentMonday.setDate(currentMonday.getDate() - 7);
    } else {
      currentDate.setDate(currentDate.getDate() - 1);
      currentMonday = getMonday(currentDate);
    }

    await initSchedule();
  });

document
  .querySelector(".nav-arrow--right")
  ?.addEventListener("click", async () => {
    if (currentView === "week") {
      currentMonday.setDate(currentMonday.getDate() + 7);
    } else {
      currentDate.setDate(currentDate.getDate() + 1);
      currentMonday = getMonday(currentDate);
    }

    await initSchedule();
  });

// === МОДАЛКА НАСТРОЕК ===

function ensureCalendarSettingsModal() {
  let modal = document.getElementById("calendarSettingsModal");

  if (modal) return modal;

  modal = document.createElement("div");
  modal.id = "calendarSettingsModal";
  modal.className = "calendar-settings-modal";
  modal.hidden = true;

  modal.innerHTML = `
    <div class="calendar-settings-modal__backdrop" data-role="backdrop"></div>
    <div class="calendar-settings-modal__dialog">
      <div class="calendar-settings-modal__header">
        <h3>Настройки календаря</h3>
        <button type="button" class="calendar-settings-modal__close" data-role="close">×</button>
      </div>

      <form id="calendarSettingsForm">
        <div class="settings-group">
          <div class="settings-label">Рабочие дни</div>
          <label><input type="checkbox" name="workingDays" value="1"> Пн</label>
          <label><input type="checkbox" name="workingDays" value="2"> Вт</label>
          <label><input type="checkbox" name="workingDays" value="3"> Ср</label>
          <label><input type="checkbox" name="workingDays" value="4"> Чт</label>
          <label><input type="checkbox" name="workingDays" value="5"> Пт</label>
          <label><input type="checkbox" name="workingDays" value="6"> Сб</label>
          <label><input type="checkbox" name="workingDays" value="7"> Вс</label>
        </div>

        <div class="settings-group">
          <div class="settings-label">Рабочее время</div>
          <div class="settings-time-row">
            <input type="number" id="workStartHour" min="0" max="23">
            <span>—</span>
            <input type="number" id="workEndHour" min="0" max="23">
          </div>
        </div>

        <div class="settings-group">
          <div class="settings-label">По умолчанию открыт</div>
          <label><input type="radio" name="defaultView" value="day"> День</label>
          <label><input type="radio" name="defaultView" value="week"> Неделя</label>
        </div>

        <div class="settings-group">
          <div class="settings-label">Карточка</div>
          <label><input type="checkbox" name="cardField" value="cabinet"> Аудитория</label>
          <label><input type="checkbox" name="cardField" value="subject"> Предмет</label>
          <label><input type="checkbox" name="cardField" value="type"> Тип</label>
          <label><input type="checkbox" name="cardField" value="teacher"> Педагог</label>
          <label><input type="checkbox" name="cardField" value="comment"> Комментарий</label>
          <label><input type="checkbox" name="cardField" value="clients"> Клиенты</label>
        </div>

        <div class="settings-actions">
          <button class="filter-btn filter-btn-apply" type="submit">Сохранить</button>
        </div>
      </form>
    </div>
  `;

  document.body.appendChild(modal);

  modal.querySelector('[data-role="close"]').addEventListener("click", () => {
    closeSettingsModal();
  });

  modal
    .querySelector('[data-role="backdrop"]')
    .addEventListener("click", () => {
      closeSettingsModal();
    });

  modal
    .querySelector("#calendarSettingsForm")
    .addEventListener("submit", handleSettingsFormSubmit);

  return modal;
}

function fillSettingsForm() {
  const modal = ensureCalendarSettingsModal();
  const form = modal.querySelector("#calendarSettingsForm");

  form.querySelectorAll('input[name="workingDays"]').forEach((input) => {
    input.checked = calendarSettings.workingDays.includes(Number(input.value));
  });

  form.querySelector("#workStartHour").value = calendarSettings.startHour;
  form.querySelector("#workEndHour").value = calendarSettings.endHour;

  form.querySelectorAll('input[name="defaultView"]').forEach((input) => {
    input.checked = input.value === calendarSettings.defaultView;
  });

  form.querySelectorAll('input[name="cardField"]').forEach((input) => {
    input.checked = !!calendarSettings.cardFields[input.value];
  });
}

function openSettingsModal() {
  const modal = ensureCalendarSettingsModal();
  fillSettingsForm();
  modal.hidden = false;
}

function closeSettingsModal() {
  const modal = document.getElementById("calendarSettingsModal");
  if (modal) {
    modal.hidden = true;
  }
}

async function handleSettingsFormSubmit(e) {
  e.preventDefault();

  const modal = document.getElementById("calendarSettingsModal");
  const form = modal.querySelector("#calendarSettingsForm");

  const workingDays = [
    ...form.querySelectorAll('input[name="workingDays"]:checked'),
  ]
    .map((el) => Number(el.value))
    .sort((a, b) => a - b);

  const startHour = Number(form.querySelector("#workStartHour").value);
  const endHour = Number(form.querySelector("#workEndHour").value);

  const defaultView =
    form.querySelector('input[name="defaultView"]:checked')?.value || "week";

  const checkedFields = [
    ...form.querySelectorAll('input[name="cardField"]:checked'),
  ].map((el) => el.value);

  if (!workingDays.length) {
    alert("Выберите хотя бы один рабочий день");
    return;
  }

  if (
    Number.isNaN(startHour) ||
    Number.isNaN(endHour) ||
    startHour < 0 ||
    endHour > 23 ||
    startHour >= endHour
  ) {
    alert("Некорректно указано рабочее время");
    return;
  }

  const cardFields = {
    cabinet: checkedFields.includes("cabinet"),
    subject: checkedFields.includes("subject"),
    type: checkedFields.includes("type"),
    teacher: checkedFields.includes("teacher"),
    comment: checkedFields.includes("comment"),
    clients: checkedFields.includes("clients"),
  };

  const branch = getBranch();

  try {
    const response = await fetch(`${API_URL}/calendar-settings-save.php`, {
      method: "POST",
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        branch,
        workingDays,
        startHour,
        endHour,
        defaultView,
        cardFields,
      }),
    });

    const result = await response.json();

    if (!result.success) {
      alert(result.message || "Ошибка сохранения настроек");
      return;
    }

    calendarSettings = {
      ...calendarSettings,
      workingDays,
      startHour,
      endHour,
      defaultView,
      cardFields,
    };

    currentView = defaultView;

    document.querySelectorAll(".view-btn").forEach((btn) => {
      btn.classList.toggle(
        "view-btn--active",
        btn.dataset.view === currentView,
      );
    });

    closeSettingsModal();
    await initSchedule();
  } catch (err) {
    console.error(err);
    alert("Ошибка сохранения настроек");
  }
}

function ensureOtherMenu() {
  let menu = document.getElementById("calendarOtherMenu");
  if (menu) return menu;

  menu = document.createElement("div");
  menu.id = "calendarOtherMenu";
  menu.className = "calendar-other-menu";
  menu.hidden = true;

  menu.innerHTML = `
    <button type="button" class="calendar-other-menu__item" data-action="schedule-settings">
      Настройки расписания
    </button>
    <button type="button" class="calendar-other-menu__item" data-action="other-modal">
      Регулярные уроки
    </button>
  `;

  document.body.appendChild(menu);

  menu.addEventListener("click", (e) => {
    const item = e.target.closest(".calendar-other-menu__item");
    if (!item) return;

    const action = item.dataset.action;

    if (action === "schedule-settings") {
      closeOtherMenu();
      openSettingsModal();
      return;
    }

    if (action === "other-modal") {
      closeOtherMenu();
      openSecondModal();
    }
  });

  return menu;
}

function positionOtherMenu(button, menu) {
  const rect = button.getBoundingClientRect();

  menu.style.position = "fixed";
  menu.style.top = `${rect.bottom + 6}px`;
  menu.style.left = `${rect.left}px`;
  menu.style.zIndex = "10000";
}

function openOtherMenu() {
  const button = document.getElementById("calendarOtherBtn");
  if (!button) return;

  const menu = ensureOtherMenu();
  positionOtherMenu(button, menu);
  menu.hidden = false;
  button.classList.add("other__btn--active");
}

function closeOtherMenu() {
  const menu = document.getElementById("calendarOtherMenu");
  const button = document.getElementById("calendarSettingsBtn");

  if (menu) {
    menu.hidden = true;
  }

  if (button) {
    button.classList.remove("other__btn--active");
  }
}

function toggleOtherMenu() {
  const menu = ensureOtherMenu();

  if (menu.hidden) {
    openOtherMenu();
  } else {
    closeOtherMenu();
  }
}

async function openSecondModal() {
  await renderRegularLessonsPage();
}

document.getElementById("calendarOtherBtn")?.addEventListener("click", (e) => {
  e.stopPropagation();
  toggleOtherMenu();
});

document.addEventListener("click", (e) => {
  const menu = document.getElementById("calendarOtherMenu");
  const button = document.getElementById("calendarSettingsBtn");

  if (!menu || menu.hidden) return;

  const isClickInsideMenu = menu.contains(e.target);
  const isClickOnButton = button?.contains(e.target);

  if (!isClickInsideMenu && !isClickOnButton) {
    closeOtherMenu();
  }
});

// === КНОПКА СЕГОДНЯ ===
document.getElementById("todayBtn")?.addEventListener("click", async () => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  currentDate = new Date(today);
  currentMonday = getMonday(today);

  await initSchedule();
});

function isSameDate(dateA, dateB) {
  return (
    dateA.getFullYear() === dateB.getFullYear() &&
    dateA.getMonth() === dateB.getMonth() &&
    dateA.getDate() === dateB.getDate()
  );
}

function getTodayDate() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return today;
}

function updateTodayButtonState() {
  const todayBtn = document.getElementById("todayBtn");
  if (!todayBtn) return;

  const today = getTodayDate();

  if (currentView === "week") {
    const todayMonday = getMonday(today);
    const isCurrentWeek = isSameDate(currentMonday, todayMonday);

    todayBtn.classList.toggle("today-btn--active", isCurrentWeek);
  } else {
    const isCurrentDay = isSameDate(currentDate, today);
    todayBtn.classList.toggle("today-btn--active", isCurrentDay);
  }
}

// === ИНИЦИАЛИЗАЦИЯ ===
export async function initSchedulePage() {
  try {
    loadLessonFiltersFromStorage();
    await loadCalendarSettings();

    if (!filterCabinetsCache.length) {
      filterCabinetsCache = await fetchCabinetsForFilter();
    }

    normalizeLessonFilters();
    saveLessonFiltersToStorage();

    document.querySelectorAll(".view-btn").forEach((btn) => {
      btn.classList.toggle(
        "view-btn--active",
        btn.dataset.view === currentView,
      );
    });

    updateFilterButtonState();
    await initSchedule();
  } catch (err) {
    console.error("Ошибка инициализации календаря:", err);
    alert(err.message || "Ошибка загрузки календаря");
  }
}

async function openLessonModal(lessonId) {
  if (!lessonId) {
    alert("Ошибка: не передан ID урока");
    return;
  }

  let lesson = null;

  try {
    const response = await fetch(`${API_URL}/lessons.php?id=${lessonId}`);
    const result = await response.json();

    if (result.success && result.data) {
      lesson = result.data;
    } else {
      alert("Ошибка загрузки урока: " + (result.message || "Урок не найден"));
      return;
    }
  } catch (err) {
    console.error(err);
    alert("Нет связи с сервером");
    return;
  }

  // Форматирование времени (из "14:30:00" → "14:30")
  const formatTime = (time) => (time ? time.slice(0, 5) : "—");

  // Перевод типа урока
  const lessonTypeText =
    {
      trial: "Пробный",
      individual: "Индивидуальный",
      group: "Групповой",
    }[lesson.LESSON_TYPE] ||
    lesson.LESSON_TYPE ||
    "—";

  // Генерация модалки просмотра
  const modalHTML = `
  <div class="lesson-modal-overlay" id="dynamicLessonModal">
    <div class="lesson-modal-content">
      <div class="lesson-modal-header">
        <h2>Просмотр урока</h2>
        <span class="lesson-modal-close">×</span>
      </div>

      <div class="lesson-modal-body view-mode">
        <div class="lesson-modal-container">
          <div class="form-group">
            <label>Дата урока</label>
            <div class="view-field">${lesson.LESSON_DATA || "—"}</div>
          </div>

          <div class="form-group">
            <label>Тип урока</label>
            <div class="view-field">${lessonTypeText}</div>
          </div>
        </div>

        <div class="form-group">
          <label>Наименование урока</label>
          <div class="view-field">${lesson.LESSON_NAME || "—"}</div>
        </div>

        <div class="lesson-modal-container">
          <div class="form-group">
            <label>Время</label>
            <div class="view-field">
              ${formatTime(lesson.LESSON_START)} – ${formatTime(
                lesson.LESSON_END,
              )}
            </div>
          </div>
          <div class="form-group">
            <label>Аудитория</label>
            <div class="view-field">${lesson.cabinet_name || "—"}</div>
          </div>
        </div>

        <div class="form-group">
          <label>Педагоги</label>
          <div>
            ${
              lesson.LESSON_TEACHER
                ? lesson.LESSON_TEACHER.split(",")
                    .map((t) => t.trim())
                    .filter((t) => t)
                    .map(
                      (teacher) => `<div class="view-field">${teacher}</div>`,
                    )
                    .join("")
                : "—"
            }
          </div>
        </div>

        <div class="form-group">
          <label>Номер договора</label>
          <div class="view-field">${lesson.LESSON_CONTRACT || "—"}</div>
        </div>

        <div class="form-group">
          <label>Клиенты</label>
          <div class="view-field">
            ${
              lesson.LESSON_CLIENTS
                ? lesson.LESSON_CLIENTS.split(",")
                    .map((client) => client.trim())
                    .filter((client) => client)
                    .map(
                      (client) =>
                        `<div class="client-view-item">${client}</div>`,
                    )
                    .join("")
                : "—"
            }
          </div>
        </div>

        <div class="form-group">
          <label>Комментарии</label>
          <div class="view-field comment-view">
            ${
              lesson.LESSON_COMMENT
                ? lesson.LESSON_COMMENT.replace(/\n/g, "<br>")
                : ""
            }
          </div>
        </div>
      </div>

      <div class="lesson-modal-footer">
        <button id="btnEditLesson" class="lesson-btn lesson-btn--edit">Редактировать</button>
        <button id="btnDeleteLesson" class="lesson-btn lesson-btn--delete">Удалить</button>
        <button id="btnCloseLesson" class="lesson-btn lesson-btn--cancel">Закрыть</button>
      </div>
    </div>
  </div>
`;

  document.body.insertAdjacentHTML("beforeend", modalHTML);
  if (window.userRoleCheck) {
    document.getElementById("btnDeleteLesson")?.remove();
    document.getElementById("btnEditLesson")?.remove();
  }
  const modal = document.getElementById("dynamicLessonModal");

  const closeModal = () => modal.remove();

  // Закрытие модалки
  modal
    .querySelector(".lesson-modal-close")
    .addEventListener("click", closeModal);
  document
    .getElementById("btnCloseLesson")
    .addEventListener("click", closeModal);
  modal.addEventListener("click", (e) => {
    if (e.target === modal) closeModal();
  });

  document
    .getElementById("btnDeleteLesson")
    .addEventListener("click", async () => {
      if (!confirm("Вы уверены, что хотите удалить этот урок?")) {
        return;
      }

      try {
        const response = await fetch(`${API_URL}/lessons.php`, {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: new URLSearchParams({
            action: "delete",
            id: lessonId,
          }),
        });

        const result = await response.json();

        if (result.success) {
          const { lessons, cabinets } = await fetchScheduleData();
          closeModal();
          renderLessons(lessons, cabinets);
          alert("Урок успешно удалён!");
        } else {
          alert("Ошибка удаления: " + result.message);
        }
      } catch (err) {
        console.error(err);
        alert("Нет связи с сервером");
      }
    });

  // Кнопка "Редактировать"
  document.getElementById("btnEditLesson").addEventListener("click", () => {
    closeModal();
    openEditLessonModal(lessonId);
  });

  // Escape = закрыть
  modal.addEventListener("keyup", (e) => {
    if (e.key === "Escape") closeModal();
  });
}

function getSelectedTimeRange() {
  if (!selectedSlots.length) return null;

  const sorted = [...selectedSlots].sort((a, b) => {
    const aTime =
      parseInt(a.dataset.hour) * 60 + parseInt(a.dataset.minute || 0);
    const bTime =
      parseInt(b.dataset.hour) * 60 + parseInt(b.dataset.minute || 0);
    return aTime - bTime;
  });

  const first = sorted[0];
  const last = sorted[sorted.length - 1];

  const startHour = parseInt(first.dataset.hour);
  const startMinute = parseInt(first.dataset.minute || 0);

  const endHour = parseInt(last.dataset.hour);
  const endMinute = parseInt(last.dataset.minute || 0) + 20;

  return {
    date: getDateFromCell(first),
    start: `${String(startHour).padStart(2, "0")}:${String(startMinute).padStart(2, "0")}`,
    end: `${String(endHour).padStart(2, "0")}:${String(endMinute).padStart(2, "0")}`,
  };
}

function getDateFromCell(cell) {
  if (currentView === "week") {
    const weekday = parseInt(cell.dataset.day);

    const date = new Date(currentMonday);
    date.setDate(currentMonday.getDate() + (weekday - 1));

    return formatDateForInput(date);
  } else {
    return formatDateForInput(currentDate);
  }
}

// Кнопка добавления урока
document.getElementById("addLesson").addEventListener("click", async () => {
  let cabinets = [];
  let activeTeachers = [];
  let activeClients = [];

  // === ЗАГРУЗКА АУДИТОРИЙ ===
  try {
    const branch = localStorage.getItem("selectedCity") || "Бобруйск";

    const cabinetsResponse = await fetch(
      `${API_URL}/cabinets.php?branch=${encodeURIComponent(branch)}`,
    );
    const cabinetsResult = await cabinetsResponse.json();

    if (cabinetsResult.success) {
      cabinets = cabinetsResult.data.filter(
        (cab) => cab.cabinet_active === "true",
      );
    } else {
      alert("Ошибка загрузки аудиторий: " + cabinetsResult.message);
      return;
    }
  } catch (err) {
    console.error(err);
    alert("Нет связи с сервером");
    return;
  }

  // === ЗАГРУЗКА АКТИВНЫХ ПРЕПОДАВАТЕЛЕЙ ===
  try {
    const branch = localStorage.getItem("selectedCity") || "Бобруйск";

    const teachersResponse = await fetch(
      `${API_URL}/teachers.php?branch=${encodeURIComponent(branch)}`,
    );
    const teachersResult = await teachersResponse.json();

    if (teachersResult.success) {
      activeTeachers = teachersResult.data.map((t) => t.full_name);
    } else {
      console.warn("Не удалось загрузить преподавателей для подсказок");
    }
  } catch (err) {
    console.warn("Подсказки преподавателей недоступны");
  }

  try {
    const branch = localStorage.getItem("selectedCity") || "Бобруйск";
    const clientsRes = await fetch(
      `${API_URL}/clients.php?branch=${encodeURIComponent(branch)}`,
    );
    const clientsResult = await clientsRes.json();

    if (clientsResult.success) {
      activeClients = clientsResult.data.map((c) => c.client_name); // берём ФИО/название
    }
  } catch (err) {
    console.warn("Не удалось загрузить клиентов для автодополнения");
  }

  // === ГЕНЕРАЦИЯ МОДАЛКИ ===
  const modalHTML = `
    <div class="lesson-modal-overlay" id="dynamicLessonModal">
      <div class="lesson-modal-content">
        <div class="lesson-modal-header">
          <h2>Добавить урок</h2>
          <span class="lesson-modal-close">×</span>
        </div>

        <div class="lesson-modal-body">
          <div class="lesson-modal-container">
            <div class="form-group">
              <label>Дата урока</label>
              <input type="date" id="lessonDate" class="lesson-input" required>
            </div>

            <div class="form-group">
              <label>Тип урока</label>
              <select id="lessonType" class="lesson-input">
                <option value="trial">Пробный</option>
                <option value="individual">Индивидуальный</option>
                <option value="group">Групповой</option>
              </select>
            </div>
          </div>

          <div class="form-group">
            <label>Наименование урока</label>
            <div class="autocomplete-wrapper">
              <input type="text" id="lessonName" class="lesson-input" placeholder="Начните вводить..." autocomplete="off" required>
              <div id="autocompleteList" class="autocomplete-items"></div>
            </div>
          </div>

          <!-- Блок деталей предмета -->
          <div id="subjectDetails" style="display: none; margin-top: 8px;">
            <div class="lesson-modal-container-3">
              <div class="form-group" id="subjectTypeGroup">
                <label>Тип предмета</label>
                <select id="subjectTypeSelect" class="lesson-input"></select>
              </div>

              <div class="form-group" id="subjectGradeGroup" style="display: none;">
                <label>Разряд предмета</label>
                <select id="subjectGradeSelect" class="lesson-input"></select>
              </div>
            </div>
          </div>

          <div class="lesson-modal-container-3">
            <div class="form-group">
              <label>Время начала</label>
              <input type="time" id="lessonStart" class="lesson-input" required>
            </div>
            <div class="form-group">
              <label>Время окончания</label>
              <input type="time" id="lessonEnd" class="lesson-input" required>
            </div>
            <div class="form-group">
              <label>Аудитория</label>
              <select id="lessonCabinet" class="lesson-input" required>
                <option value="">Выберите аудиторию</option>
                ${cabinets.map((cab) => `<option value="${cab.id}">${cab.cabinet}</option>`).join("")}
              </select>
            </div>
          </div>

          <!-- Преподаватели и Клиенты (без изменений) -->
          <div class="form-group">
            <label>Педагоги</label>
            <div id="teachersContainer"></div>
            <button type="button" id="addTeacherField" class="btn-add-field">+ Добавить преподавателя</button>
          </div>

          <div class="form-group">
            <label>Клиенты</label>
            <div id="clientsContainer"></div>
            <button type="button" id="addClientField" class="btn-add-field">+ Добавить клиента</button>
          </div>

          <div class="form-group">
            <label>Номер договора</label>
            <input type="text" id="lessonContractNumber" class="lesson-input" placeholder="Например: Д-2025/001">
          </div>

          <div class="form-group">
            <label>Комментарии</label>
            <textarea id="lessonComment" class="lesson-input" rows="2"></textarea>
          </div>
        </div>

        <div class="lesson-modal-footer">
          <button id="btnSaveLesson" class="lesson-btn lesson-btn--save">Сохранить</button>
          <button id="btnCancelLesson" class="lesson-btn lesson-btn--cancel">Отмена</button>
        </div>
      </div>
    </div>
  `;

  document.body.insertAdjacentHTML("beforeend", modalHTML);

  const modal = document.getElementById("dynamicLessonModal");
  const selectCabinet = document.getElementById("lessonCabinet");

  if (window.selectedCabinetId && selectCabinet) {
    selectCabinet.value = String(window.selectedCabinetId);
  }
  const inputDate = document.getElementById("lessonDate");
  const inputName = document.getElementById("lessonName");
  const autocompleteList = document.getElementById("autocompleteList");
  const selectedRange = getSelectedTimeRange();

  const timeData = getTimeFromSlots();

  if (timeData) {
    document.getElementById("lessonStart").value = timeData.start;
    document.getElementById("lessonEnd").value = timeData.end;
  }

  if (selectedRange) {
    inputDate.value = selectedRange.date;
  } else {
    inputDate.valueAsDate = new Date();
  }

  // === Функция создания поля для преподавателя ===
  function createTeacherField(value = "") {
    const wrapper = document.createElement("div");
    wrapper.className = "teacher-field-wrapper";

    wrapper.innerHTML = `
    <div class="autocomplete-wrapper">
      <input 
        type="text" 
        class="lesson-input teacher-input" 
        placeholder="Начните вводить ФИО..." 
        value="${value}"
        autocomplete="off"
      >
      <div class="autocomplete-items teacher-autocomplete"></div>
    </div>
    <button type="button" class="btn-remove-teacher" title="Удалить">×</button>
  `;

    const input = wrapper.querySelector(".teacher-input");
    const autocompleteList = wrapper.querySelector(".teacher-autocomplete");

    // Автодополнение для преподавателей
    input.addEventListener("input", () => {
      const val = input.value.toLowerCase();
      autocompleteList.innerHTML = "";

      if (!val) return;

      const matches = activeTeachers.filter((teacher) =>
        teacher.toLowerCase().includes(val),
      );

      matches.forEach((teacher) => {
        const item = document.createElement("div");
        item.className = "autocomplete-item";
        item.textContent = teacher;
        item.addEventListener("click", () => {
          input.value = teacher;
          autocompleteList.innerHTML = "";
        });
        autocompleteList.appendChild(item);
      });
    });

    // Удаление поля
    wrapper
      .querySelector(".btn-remove-teacher")
      .addEventListener("click", () => {
        wrapper.remove();
      });

    // Закрытие подсказок при клике вне
    document.addEventListener("click", (e) => {
      if (!input.contains(e.target) && !autocompleteList.contains(e.target)) {
        autocompleteList.innerHTML = "";
      }
    });

    return wrapper;
  }

  // Инициализация первого поля преподавателя
  const teachersContainer = document.getElementById("teachersContainer");
  teachersContainer.appendChild(createTeacherField());

  // Кнопка "+ Добавить преподавателя"
  document.getElementById("addTeacherField").addEventListener("click", () => {
    teachersContainer.appendChild(createTeacherField());
  });

  // === АВТОДОПОЛНЕНИЕ НАЗВАНИЯ ===
  inputName.addEventListener(
    "input",
    debounce(async () => {
      const value = inputName.value.trim().toLowerCase();
      autocompleteList.innerHTML = "";

      if (value.length < 2) {
        document.getElementById("subjectDetails").style.display = "none";
        return;
      }

      try {
        const branch = localStorage.getItem("selectedCity") || "Бобруйск";
        const url = `${API_URL}/subjects.php?branch=${encodeURIComponent(branch)}&search=${encodeURIComponent(value)}&limit=10`;

        const res = await fetch(url);
        const result = await res.json();

        if (result.success && result.data.length > 0) {
          result.data.forEach((s) => {
            const item = document.createElement("div");
            item.className = "autocomplete-item";
            item.textContent = s.subject;
            item.dataset.subjectId = s.id; // сохраняем ID для дальнейшего использования

            item.addEventListener("click", () => {
              inputName.value = s.subject;
              autocompleteList.innerHTML = "";

              const hasType = !!(s.subject_type && s.subject_type.trim());
              const hasGrade = !!(s.subject_grade && s.subject_grade.trim());

              if (hasType || hasGrade) {
                subjectDetails.style.display = "block";

                // Тип предмета
                const typeSelect = document.getElementById("subjectTypeSelect");
                typeSelect.innerHTML = '<option value="">Выберите тип</option>';
                if (hasType) {
                  const types = s.subject_type.split(",").map((t) => t.trim());
                  types.forEach((type) => {
                    const opt = new Option(type, type);
                    typeSelect.appendChild(opt);
                  });
                  subjectTypeGroup.style.display = "block";
                } else {
                  subjectTypeGroup.style.display = "none";
                }

                // Разряд предмета — показываем только если есть разряды
                const gradeSelect =
                  document.getElementById("subjectGradeSelect");
                gradeSelect.innerHTML =
                  '<option value="">Выберите разряд</option>';
                if (hasGrade) {
                  const grades = s.subject_grade
                    .split(",")
                    .map((g) => g.trim());
                  grades.forEach((grade) => {
                    const opt = new Option(`${grade}p.`, grade);
                    gradeSelect.appendChild(opt);
                  });
                  subjectGradeGroup.style.display = "block";
                } else {
                  subjectGradeGroup.style.display = "none";
                }
              } else {
                subjectDetails.style.display = "none";
              }
            });

            autocompleteList.appendChild(item);
          });
        } else {
          autocompleteList.innerHTML =
            '<div class="autocomplete-item no-match">Ничего не найдено</div>';
        }
      } catch (err) {
        console.error("Ошибка поиска предметов:", err);
        autocompleteList.innerHTML =
          '<div class="autocomplete-item no-match">Ошибка загрузки</div>';
      }
    }, 400),
  );

  function createClientField(value = "") {
    const wrapper = document.createElement("div");
    wrapper.className = "client-field-wrapper";

    wrapper.innerHTML = `
    <div class="autocomplete-wrapper">
      <input 
        type="text" 
        class="lesson-input client-input" 
        placeholder="Начните вводить ФИО или название..." 
        value="${value}"
        autocomplete="off"
      >
      <div class="autocomplete-items client-autocomplete"></div>
    </div>
    <button type="button" class="btn-remove-client" title="Удалить">×</button>
  `;

    const input = wrapper.querySelector(".client-input");
    const autocompleteList = wrapper.querySelector(".client-autocomplete");

    // Автодополнение
    input.addEventListener("input", () => {
      const val = input.value.toLowerCase();
      autocompleteList.innerHTML = "";

      if (!val) return;

      const matches = activeClients.filter((client) =>
        client.toLowerCase().includes(val),
      );

      matches.forEach((client) => {
        const item = document.createElement("div");
        item.className = "autocomplete-item";
        item.textContent = client;
        item.addEventListener("click", () => {
          input.value = client;
          autocompleteList.innerHTML = "";
        });
        autocompleteList.appendChild(item);
      });
    });

    // Удаление строки
    wrapper
      .querySelector(".btn-remove-client")
      .addEventListener("click", () => {
        wrapper.remove();
      });

    // Закрытие подсказок при клике вне
    document.addEventListener("click", (e) => {
      if (!input.contains(e.target) && !autocompleteList.contains(e.target)) {
        autocompleteList.innerHTML = "";
      }
    });

    return wrapper;
  }

  const clientsContainer = document.getElementById("clientsContainer");
  clientsContainer.appendChild(createClientField());

  // Кнопка "+ Добавить клиента"
  document.getElementById("addClientField").addEventListener("click", () => {
    clientsContainer.appendChild(createClientField());
  });

  // === ЗАКРЫТИЕ МОДАЛКИ ===
  const closeModal = () => {
    window.selectedCabinetId = null;
    modal.remove();
  };

  modal
    .querySelector(".lesson-modal-close")
    .addEventListener("click", closeModal);
  document
    .getElementById("btnCancelLesson")
    .addEventListener("click", closeModal);
  modal.addEventListener("click", (e) => {
    if (e.target === modal) closeModal();
  });

  // Сохранение
  document
    .getElementById("btnSaveLesson")
    .addEventListener("click", async () => {
      const date = document.getElementById("lessonDate").value;
      const type = document.getElementById("lessonType").value;
      const selectedSubject = inputName.value.trim();
      const selectedType =
        document.getElementById("subjectTypeSelect")?.value || "";
      const selectedGrade =
        document.getElementById("subjectGradeSelect")?.value || "";
      let lessonDisplayName = selectedSubject;
      if (selectedGrade) lessonDisplayName += ` (${selectedGrade}p.)`;
      if (selectedType) lessonDisplayName += ` (${selectedType})`;

      const start = document.getElementById("lessonStart").value;
      const end = document.getElementById("lessonEnd").value;
      const cabinetId = document.getElementById("lessonCabinet").value;
      const comment = document.getElementById("lessonComment").value.trim();
      const contractNumber = document
        .getElementById("lessonContractNumber")
        .value.trim();
      const branch = localStorage.getItem("selectedCity") || "Бобруйск";
      const teacherInputs = document.querySelectorAll(".teacher-input");
      const teachers = Array.from(teacherInputs)
        .map((input) => input.value.trim())
        .filter((value) => value !== "");

      const clientInputs = document.querySelectorAll(".client-input");
      const clients = Array.from(clientInputs)
        .map((input) => input.value.trim())
        .filter((value) => value !== "");

      if (!date || !lessonDisplayName || !start || !end || !cabinetId) {
        alert("Заполните все обязательные поля!");
        return;
      }

      try {
        const response = await fetch(`${API_URL}/lessons.php`, {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: new URLSearchParams({
            action: "add",
            date,
            type,
            name: lessonDisplayName,
            start,
            end,
            cabinet_id: cabinetId,
            teacher: teachers.join(", "),
            comment,
            branch,
            client: clients,
            contract_number: contractNumber,
          }),
        });

        const result = await response.json();

        if (result.success) {
          closeModal();
          initSchedulePage(); // обновляем расписание
          selectedSlots.forEach((c) => c.classList.remove("selected"));
          selectedSlots = [];
          alert("Урок успешно добавлен!");
        } else {
          alert("Ошибка: " + result.message);
        }
      } catch (err) {
        console.error(err);
        alert("Нет связи с сервером");
      }
    });

  // Enter = Сохранить, Escape = Отмена
  modal.addEventListener("keyup", (e) => {
    if (e.key === "Enter") document.getElementById("btnSaveLesson").click();
    if (e.key === "Escape") closeModal();
  });
});

async function openEditLessonModal(lessonId) {
  if (!lessonId) {
    alert("Ошибка: не передан ID урока");
    return;
  }

  let lesson = null;

  try {
    const response = await fetch(`${API_URL}/lessons.php?id=${lessonId}`);
    const result = await response.json();

    if (result.success && result.data) {
      lesson = result.data;
    } else {
      alert("Ошибка загрузки урока: " + (result.message || "Урок не найден"));
      return;
    }
  } catch (err) {
    console.error(err);
    alert("Нет связи с сервером");
    return;
  }

  // Загрузка справочников (кабинеты, преподаватели, клиенты)
  let cabinets = [];
  let activeTeachers = [];
  let activeClients = [];
  const branch = localStorage.getItem("selectedCity") || "Бобруйск";

  try {
    const cabinetsRes = await fetch(
      `${API_URL}/cabinets.php?branch=${encodeURIComponent(branch)}`,
    );
    const cabinetsResult = await cabinetsRes.json();
    if (cabinetsResult.success) cabinets = cabinetsResult.data;

    const teachersRes = await fetch(
      `${API_URL}/teachers.php?branch=${encodeURIComponent(branch)}`,
    );
    const teachersResult = await teachersRes.json();
    if (teachersResult.success)
      activeTeachers = teachersResult.data.map((t) => t.full_name);

    const clientsRes = await fetch(
      `${API_URL}/clients.php?branch=${encodeURIComponent(branch)}`,
    );
    const clientsResult = await clientsRes.json();
    if (clientsResult.success)
      activeClients = clientsResult.data.map((c) => c.client_name.trim());
  } catch (err) {
    console.warn("Не удалось загрузить справочники", err);
  }

  // === Функции создания полей ===
  function createTeacherField(value = "") {
    const wrapper = document.createElement("div");
    wrapper.className = "teacher-field-wrapper";

    wrapper.innerHTML = `
      <div class="autocomplete-wrapper">
        <input type="text" class="lesson-input teacher-input" placeholder="Начните вводить ФИО..." value="${value}" autocomplete="off">
        <div class="autocomplete-items teacher-autocomplete"></div>
      </div>
      <button type="button" class="btn-remove-teacher" title="Удалить">×</button>
    `;

    const input = wrapper.querySelector(".teacher-input");
    const list = wrapper.querySelector(".teacher-autocomplete");

    input.addEventListener("input", () => {
      const val = input.value.toLowerCase();
      list.innerHTML = "";
      if (!val) return;

      const matches = activeTeachers.filter((t) =>
        t.toLowerCase().includes(val),
      );
      matches.forEach((t) => {
        const item = document.createElement("div");
        item.className = "autocomplete-item";
        item.textContent = t;
        item.onclick = () => {
          input.value = t;
          list.innerHTML = "";
        };
        list.appendChild(item);
      });
    });

    wrapper.querySelector(".btn-remove-teacher").onclick = () =>
      wrapper.remove();

    document.addEventListener("click", (e) => {
      if (!input.contains(e.target) && !list.contains(e.target))
        list.innerHTML = "";
    });

    return wrapper;
  }

  function createClientField(value = "") {
    const wrapper = document.createElement("div");
    wrapper.className = "client-field-wrapper";

    wrapper.innerHTML = `
      <div class="autocomplete-wrapper">
        <input type="text" class="lesson-input client-input" value="${value}" placeholder="Начните вводить..." autocomplete="off">
        <div class="autocomplete-items client-autocomplete"></div>
      </div>
      <button type="button" class="btn-remove-client">×</button>
    `;

    const input = wrapper.querySelector(".client-input");
    const list = wrapper.querySelector(".client-autocomplete");

    input.addEventListener("input", () => {
      const val = input.value.toLowerCase();
      list.innerHTML = "";
      if (!val) return;

      const matches = activeClients.filter((c) =>
        c.toLowerCase().includes(val),
      );
      matches.forEach((c) => {
        const item = document.createElement("div");
        item.className = "autocomplete-item";
        item.textContent = c;
        item.onclick = () => {
          input.value = c;
          list.innerHTML = "";
        };
        list.appendChild(item);
      });
    });

    wrapper.querySelector(".btn-remove-client").onclick = () =>
      wrapper.remove();

    document.addEventListener("click", (e) => {
      if (!input.contains(e.target) && !list.contains(e.target))
        list.innerHTML = "";
    });

    return wrapper;
  }

  // === МОДАЛКА ===
  const modalHTML = `
    <div class="lesson-modal-overlay" id="dynamicLessonModal">
      <div class="lesson-modal-content">
        <div class="lesson-modal-header">
          <h2>Редактировать урок</h2>
          <span class="lesson-modal-close">×</span>
        </div>

          <div class="lesson-modal-body">
          <div class="lesson-modal-container">
            <div class="form-group">
              <label>Дата урока</label>
              <input type="date" id="lessonDate" class="lesson-input" required value="${lesson.LESSON_DATA || ""}">
            </div>

            <div class="form-group">
              <label>Тип урока</label>
              <select id="lessonType" class="lesson-input">
                <option value="trial" ${lesson.LESSON_TYPE === "trial" ? "selected" : ""}>Пробный</option>
                <option value="individual" ${lesson.LESSON_TYPE === "individual" ? "selected" : ""}>Индивидуальный</option>
                <option value="group" ${lesson.LESSON_TYPE === "group" ? "selected" : ""}>Групповой</option>
              </select>
            </div>
          </div>

          <div class="form-group">
            <label>Наименование урока</label>
            <div class="autocomplete-wrapper">
              <input type="text" id="lessonName" class="lesson-input" placeholder="Начните вводить..." autocomplete="off" required value="">
              <div id="autocompleteList" class="autocomplete-items"></div>
            </div>
          </div>

          <!-- Блок типа и разряда -->
          <div id="subjectDetails" class="lesson-modal-container-3" style="display: none; margin-top: 16px;">
            <div id="subjectTypeContainer">
              <div class="form-group">
                <label>Тип предмета</label>
                <select id="subjectTypeSelect" class="lesson-input"></select>
              </div>
            </div>

            <div id="subjectGradeContainer" style="display: none;">
              <div class="form-group">
                <label>Разряд предмета</label>
                <select id="subjectGradeSelect" class="lesson-input"></select>
              </div>
            </div>
          </div>

          <div class="lesson-modal-container-3">
            <div class="form-group">
              <label>Время начала</label>
              <input type="time" id="lessonStart" class="lesson-input" required value="${lesson.LESSON_START?.slice(0, 5) || ""}">
            </div>

            <div class="form-group">
              <label>Время окончания</label>
              <input type="time" id="lessonEnd" class="lesson-input" required value="${lesson.LESSON_END?.slice(0, 5) || ""}">
            </div>

            <div class="form-group">
              <label>Аудитория</label>
              <select id="lessonCabinet" class="lesson-input" required>
                <option value="">Выберите аудиторию</option>
                ${cabinets
                  .map(
                    (cab) => `
                  <option value="${cab.id}" ${cab.id == lesson.LESSON_CABINET ? "selected" : ""}>${cab.cabinet}</option>
                `,
                  )
                  .join("")}
              </select>
            </div>
          </div>

          <div class="form-group">
            <label>Педагоги</label>
            <div id="teachersContainer"></div>
            <button type="button" id="addTeacherField" class="btn-add-field">+ Добавить преподавателя</button>
          </div>

          <div class="form-group">
            <label>Клиенты</label>
            <div id="clientsContainer"></div>
            <button type="button" id="addClientField" class="btn-add-field">+ Добавить клиента</button>
          </div>

          <div class="form-group">
            <label>Номер договора</label>
            <input type="text" id="lessonContractNumber" class="lesson-input" placeholder="Например: Д-2025/001" value="${lesson.LESSON_CONTRACT || ""}">
          </div>

          <div class="form-group">
            <label>Комментарии</label>
            <textarea id="lessonComment" class="lesson-input" rows="1">${lesson.LESSON_COMMENT || ""}</textarea>
          </div>
        </div>

        <div class="lesson-modal-footer">
          <button id="btnSaveLesson" class="lesson-btn lesson-btn--save">Сохранить изменения</button>
          <button id="btnCancelLesson" class="lesson-btn lesson-btn--cancel">Отмена</button>
        </div>
      </div>
    </div>
  `;

  document.body.insertAdjacentHTML("beforeend", modalHTML);

  const modal = document.getElementById("dynamicLessonModal");
  const inputName = document.getElementById("lessonName");
  const typeSelect = document.getElementById("subjectTypeSelect");
  const gradeSelect = document.getElementById("subjectGradeSelect");
  const detailsBlock = document.getElementById("subjectDetails");
  const autocompleteList = document.getElementById("autocompleteList");

  const subjectDetails = document.getElementById("subjectDetails");
  const typeContainer = document.getElementById("subjectTypeContainer");
  const gradeContainer = document.getElementById("subjectGradeContainer");

  // === Парсинг текущего названия урока ===
  const currentName = lesson.LESSON_NAME || "";
  let initialSubject = currentName;
  let initialType = "";
  let initialGrade = "";

  // Парсим формат "Лесник (4p.) (переподготовка)"
  const regex = /^(.*?)(?:\s*\(([^)]+)p\.\))?(?:\s*\(([^)]+)\))?$/;
  const match = currentName.trim().match(regex);

  if (match) {
    initialSubject = match[1]?.trim() || currentName;
    initialGrade = match[2]?.trim() || "";
    initialType = match[3]?.trim() || "";
  }

  inputName.value = initialSubject;

  // === При открытии модалки сразу запрашиваем полный предмет по названию ===
  async function loadFullSubject(subjectName) {
    if (!subjectName?.trim()) {
      subjectDetails.style.display = "none";
      return;
    }

    try {
      const branch = localStorage.getItem("selectedCity") || "Бобруйск";
      const url = `${API_URL}/subjects.php?branch=${encodeURIComponent(branch)}&search=${encodeURIComponent(subjectName)}&limit=1`;

      const res = await fetch(url);
      const result = await res.json();

      if (result.success && result.data.length > 0) {
        const s = result.data[0];

        const hasType = s.subject_type && s.subject_type.trim() !== "";
        const hasGrade = s.subject_grade && s.subject_grade.trim() !== "";

        // Показываем общий блок деталей только если есть хоть что-то
        if (hasType || hasGrade) {
          subjectDetails.style.display = "flex";

          // === Тип предмета ===
          typeSelect.innerHTML = '<option value="">Выберите тип</option>';
          if (hasType) {
            const types = s.subject_type
              .split(",")
              .map((t) => t.trim())
              .filter(Boolean);
            types.forEach((type) => {
              const opt = new Option(type, type);
              if (type === initialType) opt.selected = true;
              typeSelect.appendChild(opt);
            });
            typeContainer.style.display = "block"; // всегда показываем, если есть типы
          } else {
            typeContainer.style.display = "none";
          }

          // === Разряд предмета ===
          gradeSelect.innerHTML = '<option value="">Выберите разряд</option>';
          if (hasGrade) {
            const grades = s.subject_grade
              .split(",")
              .map((g) => g.trim())
              .filter(Boolean);
            grades.forEach((grade) => {
              const opt = new Option(`${grade}p.`, grade);
              if (grade === initialGrade) opt.selected = true;
              gradeSelect.appendChild(opt);
            });
            gradeContainer.style.display = "block"; // показываем строку только если есть разряды
          } else {
            gradeContainer.style.display = "none";
          }
        } else {
          subjectDetails.style.display = "none";
        }
      } else {
        subjectDetails.style.display = "none";
      }
    } catch (err) {
      console.error("Ошибка загрузки деталей предмета:", err);
      subjectDetails.style.display = "none";
    }
  }

  // При открытии — сразу пытаемся подгрузить полный предмет по текущему названию
  await loadFullSubject(initialSubject);

  // === Автодополнение при вводе ===
  inputName.addEventListener(
    "input",
    debounce(async () => {
      const value = inputName.value.trim().toLowerCase();
      autocompleteList.innerHTML = "";

      if (value.length < 2) {
        detailsBlock.style.display = "none";
        return;
      }

      try {
        const branch = localStorage.getItem("selectedCity") || "Бобруйск";
        const url = `${API_URL}/subjects.php?branch=${encodeURIComponent(branch)}&search=${encodeURIComponent(value)}&limit=10`;

        const res = await fetch(url);
        const result = await res.json();

        if (result.success && result.data.length > 0) {
          result.data.forEach((s) => {
            const item = document.createElement("div");
            item.className = "autocomplete-item";
            item.textContent = s.subject;
            item.dataset.subjectId = s.id;

            item.addEventListener("click", async () => {
              inputName.value = s.subject;
              autocompleteList.innerHTML = "";

              // Запрашиваем полный объект по ID
              await loadFullSubject(s.subject);
            });

            autocompleteList.appendChild(item);
          });
        } else {
          autocompleteList.innerHTML =
            '<div class="autocomplete-item no-match">Ничего не найдено</div>';
        }
      } catch (err) {
        console.error("Ошибка поиска:", err);
      }
    }, 400),
  );

  // === ПРЕПОДАВАТЕЛИ ===
  const teachersContainer = document.getElementById("teachersContainer");
  const existingTeachers = lesson.LESSON_TEACHER
    ? lesson.LESSON_TEACHER.split(",")
        .map((t) => t.trim())
        .filter((t) => t)
    : [];

  if (existingTeachers.length === 0) {
    teachersContainer.appendChild(createTeacherField(""));
  } else {
    existingTeachers.forEach((teacher) => {
      teachersContainer.appendChild(createTeacherField(teacher));
    });
  }

  document.getElementById("addTeacherField").addEventListener("click", () => {
    teachersContainer.appendChild(createTeacherField());
  });

  // === КЛИЕНТЫ ===
  const clientsContainer = document.getElementById("clientsContainer");
  const existingClients = lesson.LESSON_CLIENTS
    ? lesson.LESSON_CLIENTS.split(",")
        .map((c) => c.trim())
        .filter((c) => c)
    : [];

  if (existingClients.length === 0) {
    clientsContainer.appendChild(createClientField(""));
  } else {
    existingClients.forEach((client) => {
      clientsContainer.appendChild(createClientField(client));
    });
  }

  document.getElementById("addClientField").addEventListener("click", () => {
    clientsContainer.appendChild(createClientField());
  });

  // Закрытие модалки
  const closeModal = () => modal.remove();
  modal
    .querySelector(".lesson-modal-close")
    .addEventListener("click", closeModal);
  document
    .getElementById("btnCancelLesson")
    .addEventListener("click", closeModal);
  modal.addEventListener("click", (e) => {
    if (e.target === modal) closeModal();
  });

  // Сохранение изменений
  document
    .getElementById("btnSaveLesson")
    .addEventListener("click", async () => {
      const date = document.getElementById("lessonDate").value;
      const type = document.getElementById("lessonType").value;
      const start = document.getElementById("lessonStart").value;
      const end = document.getElementById("lessonEnd").value;
      const cabinetId = document.getElementById("lessonCabinet").value;
      const comment = document.getElementById("lessonComment").value.trim();
      const contractNumber = document
        .getElementById("lessonContractNumber")
        .value.trim();

      const teacherInputs = document.querySelectorAll(".teacher-input");
      const teachers = Array.from(teacherInputs)
        .map((i) => i.value.trim())
        .filter((v) => v);

      const clientInputs = document.querySelectorAll(".client-input");
      const clients = Array.from(clientInputs)
        .map((i) => i.value.trim())
        .filter((v) => v);

      // Формируем название урока
      const selectedSubject = inputName.value.trim();
      const selectedType =
        document.getElementById("subjectTypeSelect")?.value || "";
      const selectedGrade =
        document.getElementById("subjectGradeSelect")?.value || "";

      let lessonDisplayName = selectedSubject;
      if (selectedGrade) lessonDisplayName += ` (${selectedGrade}p.)`;
      if (selectedType) lessonDisplayName += ` (${selectedType})`;

      if (!date || !lessonDisplayName || !start || !end || !cabinetId) {
        alert("Заполните все обязательные поля!");
        return;
      }

      try {
        const response = await fetch(`${API_URL}/lessons.php`, {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: new URLSearchParams({
            action: "update",
            id: lessonId,
            date,
            type,
            name: lessonDisplayName,
            start,
            end,
            cabinet_id: cabinetId,
            teachers: teachers.join(","),
            comment,
            branch,
            clients: clients.join(","),
            contract_number: contractNumber,
          }),
        });

        const result = await response.json();

        if (result.success) {
          closeModal();
          initSchedulePage();
          alert("Урок успешно обновлён!");
        } else {
          alert("Ошибка: " + result.message);
        }
      } catch (err) {
        console.error(err);
        alert("Нет связи с сервером");
      }
    });

  // Клавиши Enter/Escape
  modal.addEventListener("keyup", (e) => {
    if (e.key === "Enter") document.getElementById("btnSaveLesson").click();
    if (e.key === "Escape") closeModal();
  });
}

async function fetchCabinetsForFilter() {
  const branch = getBranch();

  const response = await fetch(
    `${API_URL}/cabinets.php?branch=${encodeURIComponent(branch)}`,
    { credentials: "include" },
  );

  const result = await response.json();

  if (!result.success) {
    throw new Error(result.message || "Ошибка загрузки кабинетов");
  }

  return (result.data || []).filter((cab) => cab.cabinet_active === "true");
}

async function fetchLessonFilterSearch(query) {
  const branch = getBranch();

  const response = await fetch(
    `${API_URL}/lesson-filter-search.php?branch=${encodeURIComponent(branch)}&query=${encodeURIComponent(query)}`,
    { credentials: "include" },
  );

  const result = await response.json();

  if (!result.success) {
    throw new Error(result.message || "Ошибка поиска");
  }

  return (
    result.data || {
      subjects: [],
      clients: [],
      teachers: [],
      contracts: [],
      comments: [],
    }
  );
}

function ensureLessonFilterModal() {
  let modal = document.getElementById("lessonFilterModal");
  if (modal) return modal;

  modal = document.createElement("div");
  modal.id = "lessonFilterModal";
  modal.className = "lesson-filter-modal";
  modal.hidden = true;

  modal.innerHTML = `
    <div class="lesson-filter-modal__backdrop" data-role="backdrop"></div>
    <div class="lesson-filter-modal__dialog">
      <div class="lesson-filter-modal__header">
        <div class="lesson-filter-modal__title">Фильтрация уроков</div>
        <button type="button" class="lesson-filter-modal__close" data-role="close">×</button>
      </div>

      <div class="lesson-filter-modal__body">
        <div class="lesson-filter-row">
          <div class="lesson-filter-row__label">Поиск</div>
          <div class="lesson-filter-row__content">
            <input
              type="text"
              id="lessonFilterSearchInput"
              class="lesson-filter-input"
              placeholder="По предмету, клиенту, педагогу, договору или комментарию"
            />
            <div id="lessonFilterSearchDropdown" class="lesson-filter-search-dropdown" hidden></div>
            <div id="lessonFilterSelectedItems" class="lesson-filter-selected"></div>
          </div>
        </div>

        <div class="lesson-filter-row">
          <div class="lesson-filter-row__label">Тип урока</div>
          <div class="lesson-filter-row__content">
            <div class="lesson-filter-box">
              <label><input type="checkbox" name="lessonType" value="group"> групповой</label>
              <label><input type="checkbox" name="lessonType" value="individual"> индивидуальный</label>
              <label><input type="checkbox" name="lessonType" value="trial"> пробный</label>
            </div>
          </div>
        </div>

        <div class="lesson-filter-row">
          <div class="lesson-filter-row__label">Аудитории</div>
          <div class="lesson-filter-row__content">
            <div id="lessonFilterCabinets" class="lesson-filter-box lesson-filter-box--scroll"></div>
          </div>
        </div>
      </div>

      <div class="lesson-filter-modal__footer">
        <button type="button" class="lesson-filter-btn lesson-filter-btn--ghost" data-role="reset">Сбросить</button>
        <button type="button" class="lesson-filter-btn lesson-filter-btn--ghost" data-role="cancel">Отмена</button>
        <button type="button" class="lesson-filter-btn lesson-filter-btn--primary" data-role="apply">Применить</button>
      </div>
    </div>
  `;

  document.body.appendChild(modal);

  modal
    .querySelector('[data-role="close"]')
    .addEventListener("click", closeLessonFilterModal);
  modal
    .querySelector('[data-role="cancel"]')
    .addEventListener("click", closeLessonFilterModal);
  modal
    .querySelector('[data-role="backdrop"]')
    .addEventListener("click", closeLessonFilterModal);
  modal
    .querySelector('[data-role="reset"]')
    .addEventListener("click", resetLessonFilterDraft);
  modal
    .querySelector('[data-role="apply"]')
    .addEventListener("click", applyLessonFilterDraft);

  return modal;
}

let lessonFilterDraft = null;

function cloneLessonFilters() {
  return {
    cabinets: [...lessonFilters.cabinets],
    lessonTypes: [...lessonFilters.lessonTypes],
    searchItems: lessonFilters.searchItems.map((item) => ({ ...item })),
  };
}

async function openLessonFilterModal() {
  const modal = ensureLessonFilterModal();
  lessonFilterDraft = cloneLessonFilters();

  try {
    if (!filterCabinetsCache.length) {
      filterCabinetsCache = await fetchCabinetsForFilter();
    }

    rerenderLessonFilterModal(filterCabinetsCache);
    initLessonFilterSearch();

    modal.hidden = false;
  } catch (err) {
    console.error(err);
    alert(err.message || "Ошибка открытия фильтра");
  }
}

function closeLessonFilterModal() {
  const modal = document.getElementById("lessonFilterModal");
  if (modal) modal.hidden = true;
}

function renderLessonFilterCabinets(cabinets) {
  const container = document.getElementById("lessonFilterCabinets");
  if (!container) return;

  container.innerHTML = "";

  cabinets.forEach((cab) => {
    const checked = lessonFilterDraft.cabinets.length
      ? lessonFilterDraft.cabinets.includes(String(cab.id))
      : true;

    const row = document.createElement("label");
    row.className = "lesson-filter-cabinet";

    row.innerHTML = `
      <input type="checkbox" name="filterCabinet" value="${cab.id}" ${checked ? "checked" : ""}>
      <span class="lesson-filter-cabinet__color" style="background:${cab.cabinet_color || "#ccc"}"></span>
      <span>${cab.cabinet}</span>
    `;

    container.appendChild(row);
  });
}

function fillLessonFilterTypes() {
  const modal = document.getElementById("lessonFilterModal");
  if (!modal) return;

  modal.querySelectorAll('input[name="lessonType"]').forEach((input) => {
    input.checked = lessonFilterDraft.lessonTypes.includes(input.value);
  });
}

function rerenderLessonFilterModal(cabinets) {
  renderLessonFilterCabinets(cabinets);
  fillLessonFilterTypes();
  renderLessonFilterSelectedItems();

  const input = document.getElementById("lessonFilterSearchInput");
  if (input) {
    input.value = "";
  }

  hideLessonFilterDropdown();
}

function renderLessonFilterSelectedItems() {
  const container = document.getElementById("lessonFilterSelectedItems");
  if (!container) return;

  container.innerHTML = "";

  lessonFilterDraft.searchItems.forEach((item) => {
    const tag = document.createElement("div");
    tag.className = "lesson-filter-tag";
    tag.innerHTML = `
      <span>${item.label}</span>
      <button type="button" data-id="${item.id}" data-type="${item.type}">×</button>
    `;

    tag.querySelector("button").addEventListener("click", () => {
      lessonFilterDraft.searchItems = lessonFilterDraft.searchItems.filter(
        (x) => !(String(x.id) === String(item.id) && x.type === item.type),
      );
      renderLessonFilterSelectedItems();
    });

    container.appendChild(tag);
  });
}

let lessonFilterSearchInitialized = false;

function initLessonFilterSearch() {
  if (lessonFilterSearchInitialized) {
    const input = document.getElementById("lessonFilterSearchInput");
    if (input) input.value = "";
    hideLessonFilterDropdown();
    return;
  }

  const input = document.getElementById("lessonFilterSearchInput");
  const dropdown = document.getElementById("lessonFilterSearchDropdown");

  if (!input || !dropdown) return;

  const runSearch = debounce(async () => {
    const query = input.value.trim();

    if (!query) {
      hideLessonFilterDropdown();
      return;
    }

    try {
      const data = await fetchLessonFilterSearch(query);
      renderLessonFilterSearchDropdown(data);
    } catch (err) {
      console.error(err);
      hideLessonFilterDropdown();
    }
  }, 300);

  input.addEventListener("input", runSearch);

  document.addEventListener("click", (e) => {
    const modal = document.getElementById("lessonFilterModal");
    if (!modal || modal.hidden) return;

    if (!dropdown.contains(e.target) && e.target !== input) {
      hideLessonFilterDropdown();
    }
  });

  lessonFilterSearchInitialized = true;
}

function hideLessonFilterDropdown() {
  const dropdown = document.getElementById("lessonFilterSearchDropdown");
  if (!dropdown) return;

  dropdown.hidden = true;
  dropdown.innerHTML = "";
}

function renderLessonFilterSearchDropdown(data) {
  const dropdown = document.getElementById("lessonFilterSearchDropdown");
  if (!dropdown) return;

  dropdown.innerHTML = "";

  const sections = [
    {
      title: "Предметы",
      type: "subject",
      items: data.subjects || [],
      labelKey: "subject",
    },
    {
      title: "Клиенты",
      type: "client",
      items: data.clients || [],
      labelKey: "client_name",
    },
    {
      title: "Педагоги",
      type: "teacher",
      items: data.teachers || [],
      labelKey: "full_name",
    },
    {
      title: "Договор",
      type: "contract",
      items: data.contracts || [],
      labelKey: "contract",
    },
    {
      title: "Комментарий",
      type: "comment",
      items: data.comments || [],
      labelKey: "comment",
    },
  ];

  let hasAny = false;

  sections.forEach((section) => {
    if (!section.items.length) return;

    hasAny = true;

    const title = document.createElement("div");
    title.className = "lesson-filter-search-dropdown__title";
    title.textContent = section.title;
    dropdown.appendChild(title);

    section.items.forEach((item) => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "lesson-filter-search-dropdown__item";
      btn.textContent = item[section.labelKey];
      btn.addEventListener("click", () => {
        const exists = lessonFilterDraft.searchItems.some(
          (x) => String(x.id) === String(item.id) && x.type === section.type,
        );

        if (!exists) {
          lessonFilterDraft.searchItems.push({
            id: item.id,
            type: section.type,
            label: item[section.labelKey],
          });
        }

        renderLessonFilterSelectedItems();

        const input = document.getElementById("lessonFilterSearchInput");
        if (input) input.value = "";

        hideLessonFilterDropdown();
      });

      dropdown.appendChild(btn);
    });
  });

  if (!hasAny) {
    const empty = document.createElement("div");
    empty.className = "lesson-filter-search-dropdown__empty";
    empty.textContent = "Ничего не найдено";
    dropdown.appendChild(empty);
  }

  dropdown.hidden = false;
}

function resetLessonFilterDraft() {
  const defaultFilters = getDefaultLessonFilters();

  lessonFilterDraft = {
    cabinets: [...defaultFilters.cabinets],
    lessonTypes: [...defaultFilters.lessonTypes],
    searchItems: [...defaultFilters.searchItems],
  };

  updateFilterButtonState();
  rerenderLessonFilterModal(filterCabinetsCache);
}

function applyLessonFilterDraft() {
  const modal = document.getElementById("lessonFilterModal");
  if (!modal) return;

  const selectedCabinets = [
    ...modal.querySelectorAll('input[name="filterCabinet"]:checked'),
  ].map((input) => String(input.value));

  const selectedTypes = [
    ...modal.querySelectorAll('input[name="lessonType"]:checked'),
  ].map((input) => input.value);

  lessonFilters = {
    cabinets: selectedCabinets,
    lessonTypes: selectedTypes,
    searchItems: lessonFilterDraft.searchItems.map((item) => ({ ...item })),
  };

  saveLessonFiltersToStorage();
  updateFilterButtonState();
  closeLessonFilterModal();
  initSchedule();
}

function getAllCabinetIds() {
  return filterCabinetsCache.map((cab) => String(cab.id));
}

function normalizeLessonFilters() {
  const defaultFilters = getDefaultLessonFilters();
  const allCabinetIds = getAllCabinetIds();

  const normalizedCabinets = Array.isArray(lessonFilters.cabinets)
    ? lessonFilters.cabinets.map(String)
    : [];

  const normalizedLessonTypes = Array.isArray(lessonFilters.lessonTypes)
    ? lessonFilters.lessonTypes.filter((type) =>
        defaultFilters.lessonTypes.includes(type),
      )
    : [...defaultFilters.lessonTypes];

  const normalizedSearchItems = Array.isArray(lessonFilters.searchItems)
    ? lessonFilters.searchItems.filter(
        (item) =>
          item &&
          item.id !== undefined &&
          ["subject", "client", "teacher", "contract", "comment"].includes(
            item.type,
          ) &&
          item.label,
      )
    : [];

  lessonFilters = {
    cabinets:
      allCabinetIds.length > 0 &&
      normalizedCabinets.length === allCabinetIds.length
        ? []
        : normalizedCabinets,
    lessonTypes:
      normalizedLessonTypes.length > 0
        ? normalizedLessonTypes
        : [...defaultFilters.lessonTypes],
    searchItems: normalizedSearchItems,
  };
}

function updateFilterButtonState() {
  const btn = document.getElementById("filterLessonsBtn");
  if (!btn) return;

  const defaultFilters = getDefaultLessonFilters();
  const allCabinetIds = getAllCabinetIds();

  const selectedCabinets = lessonFilters.cabinets.map(String);

  const hasActiveCabinets =
    selectedCabinets.length > 0 &&
    selectedCabinets.length !== allCabinetIds.length;

  const hasActiveSearchItems = lessonFilters.searchItems.length > 0;

  const hasCustomLessonTypes =
    lessonFilters.lessonTypes.length !== defaultFilters.lessonTypes.length ||
    defaultFilters.lessonTypes.some(
      (type) => !lessonFilters.lessonTypes.includes(type),
    );

  const hasActiveFilters =
    hasActiveCabinets || hasActiveSearchItems || hasCustomLessonTypes;

  btn.classList.toggle("filter__btn--active", hasActiveFilters);
}

function getDefaultLessonFilters() {
  return {
    cabinets: [],
    lessonTypes: ["group", "individual", "trial"],
    searchItems: [],
  };
}

function saveLessonFiltersToStorage() {
  localStorage.setItem(
    LESSON_FILTERS_STORAGE_KEY,
    JSON.stringify(lessonFilters),
  );
}

function loadLessonFiltersFromStorage() {
  try {
    const raw = localStorage.getItem(LESSON_FILTERS_STORAGE_KEY);

    if (!raw) {
      lessonFilters = getDefaultLessonFilters();
      return;
    }

    const parsed = JSON.parse(raw);

    lessonFilters = {
      cabinets: Array.isArray(parsed?.cabinets)
        ? parsed.cabinets.map((item) => String(item))
        : [],
      lessonTypes: Array.isArray(parsed?.lessonTypes)
        ? parsed.lessonTypes
        : ["group", "individual", "trial"],
      searchItems: Array.isArray(parsed?.searchItems)
        ? parsed.searchItems.map((item) => ({
            id: item.id,
            type: item.type,
            label: item.label,
          }))
        : [],
    };
  } catch (err) {
    console.error("Ошибка чтения фильтров из localStorage:", err);
    lessonFilters = getDefaultLessonFilters();
  }
}

document
  .getElementById("filterLessonsBtn")
  ?.addEventListener("click", async () => {
    await openLessonFilterModal();
  });

//Регулярные уроки

// =========================
// REGULAR LESSONS PAGE
// =========================

let regularLessonsPageState = {
  tab: "current",
  data: [],
};

let originalLessonsContent = null;

let regularLessonFormState = {
  cabinets: [],
  selectedSubject: null,
  selectedTeachers: [],
};

async function renderRegularLessonsPage() {
  const schedule = document.getElementById("schedulePage");
  const regular = document.getElementById("regularLessonsPage");

  if (!schedule || !regular) return;

  // скрываем расписание
  schedule.style.display = "none";

  // показываем regular lessons
  regular.style.display = "block";

  regular.innerHTML = getRegularLessonsPageTemplate();
  bindRegularLessonsPageEvents();

  try {
    await loadRegularLessonsPageData();
    renderRegularLessonsTable();
  } catch (err) {
    console.error(err);
    alert(err.message || "Ошибка загрузки регулярных уроков");
  }
}

function getRegularLessonsPageTemplate() {
  return `
    <div class="regular-lessons-page">
      <div class="clients">
        <div class="clients-header">
          <div class="clients-header__left">
            <button id="addRegularLessonBtn" class="clients-header__btn add__btn">
              <i class="fa-solid fa-plus"></i> Добавить
            </button>

            <button
              id="editRegularLessonBtn"
              class="clients-header__btn edit__btn"
              disabled
            >
              <i class="fa-solid fa-pencil"></i> Править
            </button>
          </div>

          <div class="clients-header__right">
            <button id="backToScheduleBtn" class="clients-header__btn back__shedule__btn">
              <i class="fa-solid fa-arrow-left"></i> Назад
            </button>
          </div>
        </div>

        <div class="clients-main">
          <ul class="clients-nav__filtred" id="regularLessonsTabs">
            <li class="clients-nav__filtred__elem active" data-tab="current">
              <button type="button">Текущие</button>
            </li>
            <li class="clients-nav__filtred__elem" data-tab="archived">
              <button type="button">Архивные</button>
            </li>
          </ul>

          <div class="clients-content">
            <table id="regularLessonsTable" class="bd-table">
              <thead>
                <tr>
                  <th><input type="checkbox" id="regularLessonsCheckAll" /></th>
                  <th>ID</th>
                  <th>День недели</th>
                  <th>Время</th>
                  <th>Тип</th>
                  <th>Кабинет</th>
                  <th>Предмет</th>
                  <th>Педагоги</th>
                  <th>Период</th>
                  <th></th>
                </tr>
              </thead>
              <tbody id="regularLessonsTableBody"></tbody>
            </table>
          </div>
        </div>
      </div>

      <div id="regularLessonFormRoot"></div>
    </div>
  `;
}

function bindRegularLessonsPageEvents() {
  document
    .getElementById("backToScheduleBtn")
    ?.addEventListener("click", restoreSchedulePage);

  document
    .getElementById("addRegularLessonBtn")
    ?.addEventListener("click", openRegularLessonForm);

  document
    .getElementById("editRegularLessonBtn")
    ?.addEventListener("click", openSelectedRegularLessonForEdit);

  document
    .querySelectorAll("#regularLessonsTabs .clients-nav__filtred__elem")
    .forEach((tab) => {
      tab.addEventListener("click", async () => {
        regularLessonsPageState.tab = tab.dataset.tab;

        document
          .querySelectorAll("#regularLessonsTabs .clients-nav__filtred__elem")
          .forEach((item) => {
            item.classList.toggle(
              "active",
              item.dataset.tab === regularLessonsPageState.tab,
            );
          });

        await loadRegularLessonsPageData();
        renderRegularLessonsTable();
      });
    });
}

function restoreSchedulePage() {
  const schedule = document.getElementById("schedulePage");
  const regular = document.getElementById("regularLessonsPage");

  if (!schedule || !regular) return;

  // показываем расписание
  schedule.style.display = "block";

  // скрываем regular lessons
  regular.style.display = "none";

  // можно очистить, чтобы не жрало память
  regular.innerHTML = "";
}

async function fetchRegularLessons() {
  const branch = getBranch();
  const archived = regularLessonsPageState.tab === "archived" ? 1 : 0;

  const response = await fetch(
    `${API_URL}/regular-lessons.php?branch=${encodeURIComponent(branch)}&archived=${archived}`,
    { credentials: "include" },
  );

  const result = await response.json();

  if (!result.success) {
    throw new Error(result.message || "Ошибка загрузки регулярных уроков");
  }

  return result.data || [];
}

async function loadRegularLessonsPageData() {
  regularLessonsPageState.data = await fetchRegularLessons();
}

function getWeekdayLabel(weekday) {
  const map = {
    1: "Понедельник",
    2: "Вторник",
    3: "Среда",
    4: "Четверг",
    5: "Пятница",
    6: "Суббота",
    7: "Воскресенье",
  };

  return map[Number(weekday)] || "-";
}

function updateRegularLessonEditButtonState() {
  const checked = document.querySelectorAll(
    '#regularLessonsTableBody input[type="checkbox"]:checked',
  );

  const editBtn = document.getElementById("editRegularLessonBtn");
  if (!editBtn) return;

  editBtn.disabled = checked.length !== 1;
}

function getLessonTypeLabel(type) {
  if (type === "group") return "Групповой";
  if (type === "individual") return "Индивидуальный";
  if (type === "trial") return "Пробный";
  return "-";
}

function renderRegularLessonsTable() {
  const tbody = document.getElementById("regularLessonsTableBody");
  if (!tbody) return;

  tbody.innerHTML = "";

  if (!regularLessonsPageState.data.length) {
    tbody.innerHTML = `
      <tr>
        <td colspan="10" class="regular-lessons-table__empty">Нет данных</td>
      </tr>
    `;

    const checkAllEmpty = document.getElementById("regularLessonsCheckAll");
    if (checkAllEmpty) checkAllEmpty.checked = false;

    updateRegularLessonEditButtonState();
    return;
  }

  regularLessonsPageState.data.forEach((item) => {
    const tr = document.createElement("tr");
    tr.className = "regular-lessons-row";
    tr.dataset.id = item.id;

    const teachers = Array.isArray(item.teachers)
      ? item.teachers.map((teacher) => teacher.label).join(", ")
      : item.teachers_text || "";

    tr.innerHTML = `
      <td><input type="checkbox" value="${item.id}" class="regular-lessons-row__checkbox" /></td>
      <td>${item.id}</td>
      <td>${getWeekdayLabel(item.weekday)}</td>
      <td>${String(item.time_start).slice(0, 5)} – ${String(item.time_end).slice(0, 5)}</td>
      <td>${getLessonTypeLabel(item.lesson_type)}</td>
      <td>${item.cabinet_name || "-"}</td>
      <td>${item.subject_name || "-"}</td>
      <td>${teachers || "-"}</td>
      <td>${item.date_from} — ${item.date_to}</td>
      <td>
        <button
          type="button"
          class="clients-header__btn regular-lesson-delete-btn"
          data-id="${item.id}"
          title="Удалить"
        >
          <i class="fa-solid fa-trash-can"></i>
        </button>
      </td>
    `;

    tbody.appendChild(tr);
  });

  tbody.querySelectorAll(".regular-lessons-row").forEach((row) => {
    row.addEventListener("click", (e) => {
      const isCheckbox = e.target.closest('input[type="checkbox"]');
      const isDeleteBtn = e.target.closest(".regular-lesson-delete-btn");

      if (isDeleteBtn) return;

      const checkbox = row.querySelector(".regular-lessons-row__checkbox");
      if (!checkbox) return;

      if (isCheckbox) {
        updateRegularLessonEditButtonState();
        syncRegularLessonsCheckAll();
        return;
      }

      checkbox.checked = !checkbox.checked;
      updateRegularLessonEditButtonState();
      syncRegularLessonsCheckAll();
    });
  });

  tbody.querySelectorAll(".regular-lesson-delete-btn").forEach((button) => {
    button.addEventListener("click", async (e) => {
      e.stopPropagation();
      const id = button.dataset.id;
      await deleteRegularLesson(id);
    });
  });

  const checkAll = document.getElementById("regularLessonsCheckAll");
  if (checkAll) {
    checkAll.checked = false;
    checkAll.onchange = () => {
      tbody
        .querySelectorAll(".regular-lessons-row__checkbox")
        .forEach((checkbox) => {
          checkbox.checked = checkAll.checked;
        });

      updateRegularLessonEditButtonState();
    };
  }

  updateRegularLessonEditButtonState();
}

function syncRegularLessonsCheckAll() {
  const checkAll = document.getElementById("regularLessonsCheckAll");
  const checkboxes = [
    ...document.querySelectorAll(
      "#regularLessonsTableBody .regular-lessons-row__checkbox",
    ),
  ];

  if (!checkAll) return;

  if (!checkboxes.length) {
    checkAll.checked = false;
    return;
  }

  checkAll.checked = checkboxes.every((checkbox) => checkbox.checked);
}

function getSelectedRegularLessonId() {
  const checked = document.querySelector(
    '#regularLessonsTableBody input[type="checkbox"]:checked',
  );

  return checked ? checked.value : null;
}

function openSelectedRegularLessonForEdit() {
  const selectedId = getSelectedRegularLessonId();
  if (!selectedId) return;

  openRegularLessonForm(selectedId);
}

function resetRegularLessonFormState() {
  regularLessonFormState = {
    cabinets: [],
    selectedSubject: null,
    selectedTeachers: [],
    editId: null,
  };
}

function formatDateForInput(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function fillRegularLessonDefaultValues() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const nextYear = new Date(today);
  nextYear.setFullYear(nextYear.getFullYear() + 1);

  const dateFrom = document.getElementById("regularLessonDateFrom");
  const dateTo = document.getElementById("regularLessonDateTo");
  const timeStart = document.getElementById("regularLessonTimeStart");
  const timeEnd = document.getElementById("regularLessonTimeEnd");
  const weekday = document.getElementById("regularLessonWeekday");
  const lessonType = document.getElementById("regularLessonType");

  if (lessonType) lessonType.value = "trial";
  if (dateFrom) dateFrom.value = formatDateForInput(today);
  if (dateTo) dateTo.value = formatDateForInput(nextYear);
  if (timeStart) timeStart.value = "08:00";
  if (timeEnd) timeEnd.value = "09:00";

  const jsWeekday = today.getDay();
  const mappedWeekday = jsWeekday === 0 ? 7 : jsWeekday;
  if (weekday) weekday.value = String(mappedWeekday);
}

function renderRegularLessonForm() {
  const root = document.getElementById("regularLessonFormRoot");
  if (!root) return;

  const title = regularLessonFormState.editId
    ? "Редактировать регулярный урок"
    : "Добавить регулярный урок";

  root.innerHTML = `
    <div id="regularLessonFormWrapper">
      <div class="lesson-modal-overlay__teachers" id="regularLessonFormOverlay">
        <div class="teachers-form regular-lesson-form">
          <div class="teachers-form__header">
            ${title}
            <div class="teachers-form__close" id="regularLessonFormClose">
              &times;
            </div>
          </div>

          <form class="teachers-form__body" id="regularLessonForm">
            <div class="teachers-form__row">
              <div class="teachers-form__field">
                <label class="teachers-form__label">День недели <span>*</span></label>
                <select id="regularLessonWeekday" class="teachers-form__input" required>
                  <option value="1">Понедельник</option>
                  <option value="2">Вторник</option>
                  <option value="3">Среда</option>
                  <option value="4">Четверг</option>
                  <option value="5">Пятница</option>
                  <option value="6">Суббота</option>
                  <option value="7">Воскресенье</option>
                </select>
              </div>

              <div class="teachers-form__field">
                <label class="teachers-form__label">Кабинет <span>*</span></label>
                <select id="regularLessonCabinet" class="teachers-form__input" required></select>
              </div>
            </div>

            <div class="teachers-form__row">
              <div class="teachers-form__field">
                <label class="teachers-form__label">Тип урока <span>*</span></label>
                <select id="regularLessonType" class="teachers-form__input" required>
                  <option value="group">Групповой</option>
                  <option value="individual">Индивидуальный</option>
                  <option value="trial">Пробный</option>
                </select>
              </div>
            </div>

            <div class="teachers-form__row">
              <div class="teachers-form__field">
                <label class="teachers-form__label">Время от <span>*</span></label>
                <input type="time" id="regularLessonTimeStart" class="teachers-form__input" required />
              </div>

              <div class="teachers-form__field">
                <label class="teachers-form__label">Время до <span>*</span></label>
                <input type="time" id="regularLessonTimeEnd" class="teachers-form__input" required />
              </div>
            </div>

            <div class="teachers-form__field">
              <label class="teachers-form__label">Предмет <span>*</span></label>

              <input
                type="text"
                id="regularLessonSubjectSearch"
                class="teachers-form__input"
                placeholder="Начните вводить предмет"
                autocomplete="off"
              />

              <input type="hidden" id="regularLessonSubjectId">

              <div
                id="regularLessonSubjectDropdown"
                class="regular-lesson-search-dropdown"
                hidden
              ></div>
            </div>

            <div class="teachers-form__field">
              <label class="teachers-form__label">Педагоги <span>*</span></label>
              <input
                type="text"
                id="regularLessonTeachersSearch"
                class="teachers-form__input"
                placeholder="Начните вводить педагога"
                autocomplete="off"
              />
              <div id="regularLessonTeachersDropdown" class="regular-lesson-search-dropdown" hidden></div>
              <div id="regularLessonTeachersSelected" class="regular-lesson-selected"></div>
            </div>

            <div class="teachers-form__row">
              <div class="teachers-form__field">
                <label class="teachers-form__label">Период с <span>*</span></label>
                <input type="date" id="regularLessonDateFrom" class="teachers-form__input" required />
              </div>

              <div class="teachers-form__field">
                <label class="teachers-form__label">Период по <span>*</span></label>
                <input type="date" id="regularLessonDateTo" class="teachers-form__input" required />
              </div>
            </div>

            <div class="teachers-form__footer">
              <button
                type="button"
                id="regularLessonFormCancelBtn"
                class="teachers-form__btn teachers-form__btn--cancel"
              >
                Отмена
              </button>
              <button
                type="button"
                id="saveRegularLessonBtn"
                class="teachers-form__btn teachers-form__btn--save"
              >
                Сохранить
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  `;
}

function bindRegularLessonFormEvents() {
  document
    .getElementById("regularLessonFormClose")
    ?.addEventListener("click", closeRegularLessonForm);

  document
    .getElementById("regularLessonFormCancelBtn")
    ?.addEventListener("click", closeRegularLessonForm);

  document
    .getElementById("saveRegularLessonBtn")
    ?.addEventListener("click", saveRegularLessonForm);

  document
    .getElementById("regularLessonFormOverlay")
    ?.addEventListener("click", (e) => {
      if (e.target.id === "regularLessonFormOverlay") {
        closeRegularLessonForm();
      }
    });

  document.addEventListener("click", (e) => {
    const input = document.getElementById("regularLessonSubjectSearch");
    const dropdown = document.getElementById("regularLessonSubjectDropdown");

    if (!input || !dropdown) return;

    if (!input.contains(e.target) && !dropdown.contains(e.target)) {
      hideRegularLessonSubjectDropdown();
    }
  });

  initRegularLessonSubjectSearch();
  initRegularLessonTeachersSearch();
}

function closeRegularLessonForm() {
  const root = document.getElementById("regularLessonFormRoot");
  if (!root) return;

  root.innerHTML = "";
}

function fillRegularLessonCabinets() {
  const select = document.getElementById("regularLessonCabinet");
  if (!select) return;

  select.innerHTML = "";

  regularLessonFormState.cabinets.forEach((cab) => {
    const option = document.createElement("option");
    option.value = cab.id;
    option.textContent = cab.cabinet;
    select.appendChild(option);
  });
}

function fillRegularLessonFormByItem(item) {
  const weekday = document.getElementById("regularLessonWeekday");
  const cabinet = document.getElementById("regularLessonCabinet");
  const timeStart = document.getElementById("regularLessonTimeStart");
  const timeEnd = document.getElementById("regularLessonTimeEnd");
  const dateFrom = document.getElementById("regularLessonDateFrom");
  const dateTo = document.getElementById("regularLessonDateTo");
  const lessonType = document.getElementById("regularLessonType");

  if (lessonType) lessonType.value = item.lesson_type || "trial";
  if (weekday) weekday.value = String(item.weekday ?? "");
  if (cabinet) cabinet.value = String(item.cabinet_id ?? "");
  if (timeStart) timeStart.value = String(item.time_start || "").slice(0, 5);
  if (timeEnd) timeEnd.value = String(item.time_end || "").slice(0, 5);
  if (dateFrom) dateFrom.value = item.date_from || "";
  if (dateTo) dateTo.value = item.date_to || "";

  regularLessonFormState.selectedSubject = item.subject_id
    ? {
        id: item.subject_id,
        label: item.subject_name || "",
      }
    : null;

  regularLessonFormState.selectedTeachers = Array.isArray(item.teachers)
    ? item.teachers.map((teacher) => ({
        id: teacher.id,
        label: teacher.label,
      }))
    : [];

  renderRegularLessonSelectedTeachers();
  document.getElementById("regularLessonSubjectSearch").value =
    item.subject_name;
  document.getElementById("regularLessonSubjectId").value = item.subject_id;
}

async function openRegularLessonForm(editId = null) {
  try {
    resetRegularLessonFormState();
    regularLessonFormState.editId = editId ? Number(editId) : null;
    regularLessonFormState.cabinets = await fetchCabinetsForFilter();

    renderRegularLessonForm();
    initRegularLessonSubjectSearch();

    fillRegularLessonCabinets();
    fillRegularLessonDefaultValues();
    bindRegularLessonFormEvents();

    renderRegularLessonSelectedTeachers();
    hideRegularLessonTeachersDropdown();

    const subjectInput = document.getElementById("regularLessonSubjectSearch");
    const teacherInput = document.getElementById("regularLessonTeachersSearch");

    if (subjectInput) subjectInput.value = "";
    if (teacherInput) teacherInput.value = "";

    if (regularLessonFormState.editId) {
      const item = regularLessonsPageState.data.find(
        (lesson) => Number(lesson.id) === Number(regularLessonFormState.editId),
      );

      if (item) {
        fillRegularLessonFormByItem(item);
      }
    }
  } catch (err) {
    console.error(err);
    alert(err.message || "Ошибка открытия формы");
  }
}

async function deleteRegularLesson(id) {
  if (!id) return;

  const confirmed = confirm("Удалить регулярный урок?");
  if (!confirmed) return;

  try {
    const response = await fetch(`${API_URL}/regular-lessons-delete.php`, {
      method: "POST",
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        id: Number(id),
        branch: getBranch(),
      }),
    });

    const result = await response.json();

    if (!result.success) {
      alert(result.message || "Ошибка удаления");
      return;
    }

    await loadRegularLessonsPageData();
    renderRegularLessonsTable();
  } catch (err) {
    console.error(err);
    alert("Ошибка удаления");
  }
}

// =========================
// SUBJECT SEARCH
// =========================

async function fetchRegularLessonSubjects(query) {
  const branch = getBranch();

  const response = await fetch(
    `${API_URL}/regular-lesson-subject-search.php?branch=${encodeURIComponent(branch)}&query=${encodeURIComponent(query)}`,
    { credentials: "include" },
  );

  const result = await response.json();

  if (!result.success) {
    throw new Error(result.message || "Ошибка поиска предметов");
  }

  return result.data || [];
}

const runRegularLessonSubjectSearch = debounce(async () => {
  const input = document.getElementById("regularLessonSubjectSearch");
  const hidden = document.getElementById("regularLessonSubjectId");

  if (!input) return;

  const query = input.value.trim();

  if (!query) {
    if (hidden) hidden.value = "";
    hideRegularLessonSubjectDropdown();
    return;
  }

  try {
    const items = await fetchRegularLessonSubjects(query);
    renderRegularLessonSubjectDropdown(items);
  } catch (err) {
    console.error(err);
    hideRegularLessonSubjectDropdown();
  }
}, 300);

function initRegularLessonSubjectSearch() {
  const input = document.getElementById("regularLessonSubjectSearch");
  if (!input || input.dataset.initialized === "1") return;

  input.addEventListener("input", runRegularLessonSubjectSearch);
  input.dataset.initialized = "1";
}

function renderRegularLessonSubjectDropdown(items) {
  const dropdown = document.getElementById("regularLessonSubjectDropdown");
  const input = document.getElementById("regularLessonSubjectSearch");
  const hidden = document.getElementById("regularLessonSubjectId");

  if (!dropdown) return;

  dropdown.innerHTML = "";

  if (!items.length) {
    dropdown.innerHTML = `<div class="regular-lesson-search-dropdown__empty">Ничего не найдено</div>`;
    dropdown.hidden = false;
    return;
  }

  items.forEach((item) => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "regular-lesson-search-dropdown__item";
    btn.textContent = item.subject;

    btn.onclick = () => {
      input.value = item.subject;
      hidden.value = item.id;
      hideRegularLessonSubjectDropdown();
    };

    dropdown.appendChild(btn);
  });

  dropdown.hidden = false;
}

function hideRegularLessonSubjectDropdown() {
  const dropdown = document.getElementById("regularLessonSubjectDropdown");
  if (dropdown) dropdown.hidden = true;
}

// =========================
// TEACHERS SEARCH
// =========================

async function fetchRegularLessonTeachers(query) {
  const branch = getBranch();

  const response = await fetch(
    `${API_URL}/regular-lesson-teacher-search.php?branch=${encodeURIComponent(branch)}&query=${encodeURIComponent(query)}`,
    { credentials: "include" },
  );

  const result = await response.json();

  if (!result.success) {
    throw new Error(result.message || "Ошибка поиска педагогов");
  }

  return result.data || [];
}

const runRegularLessonTeachersSearch = debounce(async () => {
  const input = document.getElementById("regularLessonTeachersSearch");
  if (!input) return;

  const query = input.value.trim();

  if (!query) {
    hideRegularLessonTeachersDropdown();
    return;
  }

  try {
    const items = await fetchRegularLessonTeachers(query);
    renderRegularLessonTeachersDropdown(items);
  } catch (err) {
    console.error(err);
    hideRegularLessonTeachersDropdown();
  }
}, 300);

function initRegularLessonTeachersSearch() {
  const input = document.getElementById("regularLessonTeachersSearch");
  if (!input || input.dataset.initialized === "1") return;

  input.addEventListener("input", runRegularLessonTeachersSearch);
  input.dataset.initialized = "1";
}

function renderRegularLessonTeachersDropdown(items) {
  const dropdown = document.getElementById("regularLessonTeachersDropdown");
  if (!dropdown) return;

  dropdown.innerHTML = "";

  if (!items.length) {
    dropdown.innerHTML = `
      <div class="regular-lesson-search-dropdown__empty">Ничего не найдено</div>
    `;
    dropdown.hidden = false;
    return;
  }

  items.forEach((item) => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "regular-lesson-search-dropdown__item";
    btn.textContent = item.full_name;

    btn.addEventListener("click", () => {
      const exists = regularLessonFormState.selectedTeachers.some(
        (teacher) => String(teacher.id) === String(item.id),
      );

      if (!exists) {
        regularLessonFormState.selectedTeachers.push({
          id: item.id,
          label: item.full_name,
        });
      }

      renderRegularLessonSelectedTeachers();

      const input = document.getElementById("regularLessonTeachersSearch");
      if (input) input.value = "";

      hideRegularLessonTeachersDropdown();
    });

    dropdown.appendChild(btn);
  });

  dropdown.hidden = false;
}

function hideRegularLessonTeachersDropdown() {
  const dropdown = document.getElementById("regularLessonTeachersDropdown");
  if (!dropdown) return;

  dropdown.hidden = true;
  dropdown.innerHTML = "";
}

function renderRegularLessonSelectedTeachers() {
  const container = document.getElementById("regularLessonTeachersSelected");
  if (!container) return;

  container.innerHTML = "";

  regularLessonFormState.selectedTeachers.forEach((teacher) => {
    const tag = document.createElement("div");
    tag.className = "regular-lesson-tag";
    tag.innerHTML = `
      <span>${teacher.label}</span>
      <button type="button">×</button>
    `;

    tag.querySelector("button").addEventListener("click", () => {
      regularLessonFormState.selectedTeachers =
        regularLessonFormState.selectedTeachers.filter(
          (item) => String(item.id) !== String(teacher.id),
        );

      renderRegularLessonSelectedTeachers();
    });

    container.appendChild(tag);
  });
}

// =========================
// SAVE
// =========================

async function saveRegularLessonForm() {
  const weekday = document.getElementById("regularLessonWeekday")?.value;
  const timeStart = document.getElementById("regularLessonTimeStart")?.value;
  const timeEnd = document.getElementById("regularLessonTimeEnd")?.value;
  const cabinetId = document.getElementById("regularLessonCabinet")?.value;
  const dateFrom = document.getElementById("regularLessonDateFrom")?.value;
  const dateTo = document.getElementById("regularLessonDateTo")?.value;
  const subjectId = document.getElementById("regularLessonSubjectId")?.value;
  const subjectName = document
    .getElementById("regularLessonSubjectSearch")
    ?.value.trim();
  const lessonType = document.getElementById("regularLessonType")?.value;

  if (!subjectId) {
    alert("Выберите предмет");
    return;
  }

  if (!lessonType) {
    alert("Выберите тип урока");
    return;
  }

  if (
    !weekday ||
    !timeStart ||
    !timeEnd ||
    !cabinetId ||
    !dateFrom ||
    !dateTo
  ) {
    alert("Заполните обязательные поля");
    return;
  }

  if (!regularLessonFormState.selectedTeachers.length) {
    alert("Выберите хотя бы одного педагога");
    return;
  }

  if (timeStart >= timeEnd) {
    alert("Время окончания должно быть больше времени начала");
    return;
  }

  if (dateFrom > dateTo) {
    alert("Дата начала периода не может быть больше даты окончания");
    return;
  }

  try {
    const payload = {
      branch: getBranch(),
      weekday: Number(weekday),
      lessonType,
      timeStart,
      timeEnd,
      cabinetId: Number(cabinetId),
      subjectId: Number(subjectId),
      subjectName: subjectName,
      teachers: regularLessonFormState.selectedTeachers.map((teacher) => ({
        id: Number(teacher.id),
        label: teacher.label,
      })),
      dateFrom,
      dateTo,
    };

    if (regularLessonFormState.editId) {
      payload.id = Number(regularLessonFormState.editId);
    }

    const response = await fetch(`${API_URL}/regular-lessons-save.php`, {
      method: "POST",
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    const result = await response.json();

    if (!result.success) {
      alert(result.message || "Ошибка сохранения");
      return;
    }

    closeRegularLessonForm();
    await loadRegularLessonsPageData();
    renderRegularLessonsTable();
  } catch (err) {
    console.error(err);
    alert("Ошибка сохранения регулярного урока");
  }
}
