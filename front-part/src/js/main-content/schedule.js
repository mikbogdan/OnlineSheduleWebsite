import { API_URL } from "../constants";
import { debounce } from "./main-content";

// import { userRoleCheck } from "../rolePermissions";

// === ДИНАМИЧЕСКИЕ ДАТЫ ===
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

let currentDate = new Date();
let currentMonday = new Date(); // текущая дата
currentMonday.setHours(0, 0, 0, 0);

// Находим ближайший понедельник
const day = currentMonday.getDay();
currentMonday.setDate(currentMonday.getDate() - (day === 0 ? 6 : day - 1)); // понедельник

let currentView = "week";

document.querySelectorAll(".view-btn").forEach((button) => {
  button.addEventListener("click", () => {
    document
      .querySelectorAll(".view-btn")
      .forEach((btn) => btn.classList.remove("view-btn--active"));
    button.classList.add("view-btn--active");

    currentView = button.dataset.view;

    if (currentView === "week") {
      renderWeekGrid();
      loadSchedule();
    } else {
      renderDayGrid();
      loadSchedule();
    }
  });
});

// === ОБНОВЛЕНИЕ ЗАГОЛОВКА ===
function updateHeader() {
  const periodEl = document.getElementById("schedulePeriod");
  const rangeEl = document.getElementById("dateRange");

  if (!periodEl || !rangeEl) {
    console.error("Элементы #schedulePeriod или #dateRange не найдены");
    return;
  }

  if (currentView === "week") {
    const start = new Date(currentMonday);
    const end = new Date(currentMonday);
    end.setDate(end.getDate() + 6);

    const startStr = `${start.getDate()} ${
      months[start.getMonth()]
    } ${start.getFullYear()} г.`;
    const endStr = `${end.getDate()} ${
      months[end.getMonth()]
    } ${end.getFullYear()} г.`;

    periodEl.textContent = "Неделя"; // или "Неделя" всегда
    rangeEl.textContent = `${startStr} – ${endStr}`;

    // Заголовки дней недели
    document.querySelectorAll(".day-cell").forEach((cell, i) => {
      const date = new Date(currentMonday);
      date.setDate(date.getDate() + i);
      const dayName = daysOfWeek[date.getDay()];
      const dayNum = date.getDate();
      cell.textContent = `${dayNum}.${date.getMonth() + 1}, ${dayName
        .slice(0, 3)
        .toLowerCase()}`;
    });
  } else {
    // День
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const selectedDateStr = `${currentDate.getDate()} ${
      months[currentDate.getMonth()]
    } ${currentDate.getFullYear()} г.`;

    // Если сегодня — "Сегодня", иначе — пусто
    if (currentDate.getTime() === today.getTime()) {
      periodEl.textContent = "Сегодня";
    } else {
      periodEl.textContent = ""; // или "День" — как хочешь
    }

    rangeEl.textContent = selectedDateStr;

    // Заголовок дня
    document.querySelectorAll(".day-cell").forEach((cell) => {
      const dayName = daysOfWeek[currentDate.getDay()];
      const dayNum = currentDate.getDate();
      cell.textContent = `${dayNum}.${currentDate.getMonth() + 1}, ${dayName
        .slice(0, 3)
        .toLowerCase()}`;
    });
  }
}

// === РЕНДЕР СЕТКИ (8:00 – 20:00) ===
function renderWeekGrid() {
  const grid = document.getElementById("scheduleGrid");
  grid.innerHTML = "";

  grid.innerHTML += `<div class="time-cell"></div>`; // пустая
  for (let i = 0; i < 7; i++) {
    grid.innerHTML += `<div class="day-cell"></div>`;
  }

  for (let hour = 8; hour <= 20; hour++) {
    const timeStr = `${hour.toString().padStart(2, "0")}:00`;
    grid.innerHTML += `<div class="time-cell">${timeStr}</div>`;
    for (let d = 0; d < 7; d++) {
      grid.innerHTML += `<div class="lesson-cell" data-day="${d}" data-hour="${hour}"></div>`;
    }
  }

  toggleDayMode();
  updateHeader();
}

// === РЕНДЕР СЕТКИ НА ДЕНЬ ===
function toggleDayMode() {
  const grid = document.getElementById("scheduleGrid");
  if (currentView === "day") {
    grid.classList.add("day-mode");
  } else {
    grid.classList.remove("day-mode");
  }
}

function renderDayGrid() {
  const grid = document.getElementById("scheduleGrid");
  grid.innerHTML = "";

  // Ячейки времени + уроки
  for (let hour = 8; hour <= 20; hour++) {
    const timeStr = `${hour.toString().padStart(2, "0")}:00`;
    grid.innerHTML += `<div class="time-cell">${timeStr}</div>`;
    grid.innerHTML += `<div class="lesson-cell" data-day="0" data-hour="${hour}"></div>`;
  }

  toggleDayMode();
  updateHeader();
}

// Стрелки (переключение дня/недели)
document.querySelector(".nav-arrow--left").addEventListener("click", () => {
  if (currentView === "week") {
    currentMonday.setDate(currentMonday.getDate() - 7);
  } else {
    currentDate.setDate(currentDate.getDate() - 1);
  }
  renderGrid();
  loadSchedule();
});

document.querySelector(".nav-arrow--right").addEventListener("click", () => {
  if (currentView === "week") {
    currentMonday.setDate(currentMonday.getDate() + 7);
  } else {
    currentDate.setDate(currentDate.getDate() + 1);
  }
  renderGrid();
  loadSchedule();
});

function waitForAuth() {
  return new Promise((resolve) => {
    const check = () => {
      if (window.t_id !== undefined) {
        // или проверяй window.t_id
        resolve();
      } else {
        setTimeout(check, 100); // проверяем каждые 100 мс
      }
    };
    check();
  });
}

async function loadSchedule() {
  let lessons = [];
  let cabinets = [];

  await waitForAuth();

  try {
    const branch = localStorage.getItem("selectedCity") || "Бобруйск";

    let url = `${API_URL}/lessons.php?branch=${encodeURIComponent(branch)}`;

    // Добавляем фильтр по преподавателю, если роль teacher и есть t_id
    if (window.t_id) {
      url += `&teacher_id=${window.t_id}`;
    }

    if (currentView === "day") {
      const selectedDate = currentDate.toISOString().split("T")[0];
      url += `&date=${selectedDate}`;
    } else {
      const start = currentMonday.toISOString().split("T")[0];
      const end = new Date(currentMonday);
      end.setDate(end.getDate() + 6);
      const endStr = end.toISOString().split("T")[0];
      url += `&start=${start}&end=${endStr}`;
    }

    const lessonsResponse = await fetch(url, { credentials: "include" });
    const lessonsResult = await lessonsResponse.json();

    if (!lessonsResult.success) {
      alert(
        "Ошибка загрузки уроков: " +
          (lessonsResult.message || "Неизвестная ошибка"),
      );
      return;
    }

    lessons = lessonsResult.data;

    const cabinetsResponse = await fetch(
      `${API_URL}/cabinets.php?branch=${encodeURIComponent(branch)}`,
    );
    const cabinetsResult = await cabinetsResponse.json();

    if (cabinetsResult.success) {
      cabinets = cabinetsResult.data.filter(
        (cab) => cab.cabinet_active === "true",
      );
    } else {
      alert(
        "Ошибка загрузки кабинетов: " +
          (cabinetsResult.message || "Неизвестная ошибка"),
      );
    }
  } catch (err) {
    console.error("Ошибка загрузки данных:", err);
    alert("Нет связи с сервером");
    return;
  }

  // Очищаем ячейки
  document.querySelectorAll(".lesson-cell").forEach((cell) => {
    cell.innerHTML = "";
  });

  // Рендер сетки и заголовков
  const grid = document.getElementById("scheduleGrid");
  grid.innerHTML = "";

  if (currentView === "week") {
    // Рендер для недели (как раньше)
    grid.innerHTML = ""; // повторное очищение на всякий случай

    // Первая строка: пустая + 7 заголовков дней
    grid.innerHTML += `<div class="time-cell"></div>`;
    for (let i = 0; i < 7; i++) {
      grid.innerHTML += `<div class="day-cell"></div>`;
    }

    // Ячейки времени + уроков
    for (let hour = 8; hour <= 20; hour++) {
      const timeStr = `${hour.toString().padStart(2, "0")}:00`;
      grid.innerHTML += `<div class="time-cell">${timeStr}</div>`;
      for (let d = 0; d < 7; d++) {
        grid.innerHTML += `<div class="lesson-cell" data-day="${d}" data-hour="${hour}"></div>`;
      }
    }

    // Заполняем заголовки дней (вызываем updateHeader)
    updateHeader();
  } else {
    // Рендер для дня — колонки по кабинетам
    grid.innerHTML += `<div class="time-cell"></div>`;
    cabinets.forEach((cab, index) => {
      grid.innerHTML += `<div class="day-cell">${cab.cabinet}</div>`;
    });

    for (let hour = 8; hour <= 20; hour++) {
      const timeStr = `${hour.toString().padStart(2, "0")}:00`;
      grid.innerHTML += `<div class="time-cell">${timeStr}</div>`;
      cabinets.forEach((cab, index) => {
        grid.innerHTML += `<div class="lesson-cell" data-day="${index}" data-hour="${hour}"></div>`;
      });
    }
  }

  // Группировка уроков
  const daysGroups = {};

  lessons.forEach((lesson) => {
    const lessonDate = new Date(lesson.LESSON_DATA);
    let dayIndex;

    if (currentView === "day") {
      // Для дня — индекс кабинета
      dayIndex = cabinets.findIndex((c) => c.id == lesson.LESSON_CABINET);
    } else {
      dayIndex = lessonDate.getDay() === 0 ? 6 : lessonDate.getDay() - 1;
    }

    if (dayIndex === -1) return; // урок без кабинета — пропускаем

    if (!daysGroups[dayIndex]) daysGroups[dayIndex] = [];
    daysGroups[dayIndex].push(lesson);
  });

  // Рендер уроков
  Object.keys(daysGroups).forEach((day) => {
    const dayLessons = daysGroups[day];

    // Сортировка по времени начала
    dayLessons.sort((a, b) => {
      const startA = parseInt(a.LESSON_START.replace(":", ""));
      const startB = parseInt(b.LESSON_START.replace(":", ""));
      return startA - startB;
    });

    // Для недели — группировка пересекающихся
    if (currentView === "week") {
      // 1. Подготовка и сортировка
      const sortedLessons = dayLessons
        .map((lesson) => ({
          lesson,
          start: parseInt(lesson.LESSON_START.replace(":", "")),
          end: parseInt(lesson.LESSON_END.replace(":", "")),
        }))
        .sort((a, b) => a.start - b.start);

      // 2. Группировка пересечений
      const groups = [];
      let currentGroup = [];

      sortedLessons.forEach((item) => {
        if (currentGroup.length === 0) {
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

      // 3. Обработка каждой группы отдельно
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

        // 4. Рендер
        columns.forEach((col, colIdx) => {
          col.forEach(({ lesson, start, end }) => {
            const startParts = lesson.LESSON_START.split(":");
            const endParts = lesson.LESSON_END.split(":");

            const startHour = parseInt(startParts[0]);
            const startMin = parseInt(startParts[1]);
            const endHour = parseInt(endParts[0]);
            const endMin = parseInt(endParts[1]);

            const minutesInHour = 60;
            const top = (startMin / minutesInHour) * 100 + "%";
            const durationMinutes =
              (endHour - startHour) * 60 + (endMin - startMin);
            const height = (durationMinutes / minutesInHour) * 100 + "%";

            const cell = document.querySelector(
              `.lesson-cell[data-day="${day}"][data-hour="${startHour}"]`,
            );
            if (!cell) return;

            const cabinet = cabinets.find((c) => c.id == lesson.LESSON_CABINET);
            const color = cabinet ? cabinet.cabinet_color : "#95a5a6";

            const block = document.createElement("div");
            block.className = "event";

            block.style.top = top;
            block.style.height = height;
            block.style.backgroundColor = "#fff";
            block.style.border = `1px solid ${color}`;
            block.style.borderBottom = `10px solid ${color}`;

            // ✅ ширина теперь зависит только от пересечений в группе
            block.style.width = `calc(100% / ${maxCols} - 8px)`;
            block.style.left = `calc(${colIdx} * (100% / ${maxCols}) + 4px)`;
            block.style.marginLeft = colIdx > 0 ? "8px" : "4px";

            block.dataset.id = lesson.LESSON_ID;

            const typeText =
              lesson.LESSON_TYPE === "group"
                ? "Групповой"
                : lesson.LESSON_TYPE === "individual"
                  ? "Индивидуальный"
                  : "Пробный";

            block.innerHTML = `
          <div class="time">${lesson.LESSON_START.slice(0, 5)} – ${lesson.LESSON_END.slice(0, 5)}</div>
          <div class="name">${lesson.LESSON_NAME || "Урок"}</div>
          <div class="info">
            ${typeText}
            <strong>Преподаватель:</strong> ${lesson.LESSON_TEACHER}
            ${
              lesson.LESSON_COMMENT
                ? "Комментарий: " + lesson.LESSON_COMMENT
                : ""
            }
          </div>
        `;

            block.addEventListener("click", () => {
              openLessonModal(lesson.LESSON_ID);
            });

            cell.appendChild(block);
          });
        });
      });
    } else {
      // Рендер для дня — без группировки, просто по порядку времени
      dayLessons.forEach((lesson) => {
        const startParts = lesson.LESSON_START.split(":");
        const endParts = lesson.LESSON_END.split(":");

        const startHour = parseInt(startParts[0]);
        const startMin = parseInt(startParts[1]);
        const endHour = parseInt(endParts[0]);
        const endMin = parseInt(endParts[1]);

        const minutesInHour = 60;
        const top = (startMin / minutesInHour) * 100 + "%";
        const durationMinutes =
          (endHour - startHour) * 60 + (endMin - startMin);
        const height = (durationMinutes / minutesInHour) * 100 + "%";

        const cell = document.querySelector(
          `.lesson-cell[data-day="${day}"][data-hour="${startHour}"]`,
        );
        if (!cell) return;

        const cabinet = cabinets.find((c) => c.id == lesson.LESSON_CABINET);
        const color = cabinet ? cabinet.cabinet_color : "#95a5a6";

        const block = document.createElement("div");
        block.className = "event";
        block.style.top = top;
        block.style.height = height;
        block.style.backgroundColor = "#fff";
        block.style.border = `1px solid ${color}`;
        block.style.borderBottom = `10px solid ${color}`;
        block.style.width = "100%";
        block.style.left = "0";
        block.style.margin = "0 4px";
        block.dataset.id = lesson.LESSON_ID;

        const typeText =
          lesson.LESSON_TYPE === "group"
            ? "Групповой"
            : lesson.LESSON_TYPE === "individual"
              ? "Индивидуальный"
              : "Пробный";

        block.innerHTML = `
          <div class="time">${lesson.LESSON_START.slice(
            0,
            5,
          )} – ${lesson.LESSON_END.slice(0, 5)}</div>
          <div class="name">${lesson.LESSON_NAME || "Урок"}</div>
          <div class="info">
            ${typeText}<br>
            <strong>Преподаватель:</strong> ${lesson.LESSON_TEACHER}
            ${
              lesson.LESSON_COMMENT
                ? "Комментарий: " + lesson.LESSON_COMMENT
                : ""
            }
          </div>
        `;

        block.addEventListener("click", () => {
          openLessonModal(lesson.LESSON_ID);
        });

        cell.appendChild(block);
      });
    }
  });
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
        <div class="form-group">
          <label>Дата урока</label>
          <div class="view-field">${lesson.LESSON_DATA || "—"}</div>
        </div>

        <div class="form-group">
          <label>Тип урока</label>
          <div class="view-field">${lessonTypeText}</div>
        </div>

        <div class="form-group">
          <label>Наименование урока</label>
          <div class="view-field">${lesson.LESSON_NAME || "—"}</div>
        </div>

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

        <div class="form-group">
          <label>Преподаватели</label>
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
          closeModal();
          loadSchedule();
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

          <div class="form-group">
            <label>Наименование урока</label>
            <div class="autocomplete-wrapper">
              <input type="text" id="lessonName" class="lesson-input" placeholder="Начните вводить..." autocomplete="off" required>
              <div id="autocompleteList" class="autocomplete-items"></div>
            </div>
          </div>

          <div id="subjectDetails" style="display: none; margin-top: 16px;">
            <div class="form-group">
              <label>Тип предмета</label>
              <select id="subjectTypeSelect" class="lesson-input"></select>
            </div>

            <div class="form-group">
              <label>Разряд предмета</label>
              <select id="subjectGradeSelect" class="lesson-input"></select>
            </div>
          </div>

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
              ${cabinets
                .map(
                  (cab) => `<option value="${cab.id}">${cab.cabinet}</option>`,
                )
                .join("")}
            </select>
          </div>

          <div class="form-group">
            <label>Преподаватель</label>
            <div id="teachersContainer">
            </div>
              <button type="button" id="addTeacherField" class="btn-add-field">
                + Добавить преподавателя
              </button>
          </div>

          <div class="form-group">
            <label>Клиенты</label>
            <div id="clientsContainer">
            </div>
            <button type="button" id="addClientField" class="btn-add-field">
              + Добавить клиента
            </button>
          </div>

          <div class="form-group">
            <label>Номер договора</label>
            <input 
              type="text" 
              id="lessonContractNumber" 
              class="lesson-input" 
              placeholder="Например: Д-2025/001"
            >
          </div>

          <div class="form-group">
            <label>Комментарии</label>
            <textarea id="lessonComment" class="lesson-input" rows="3"></textarea>
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
  const inputDate = document.getElementById("lessonDate");
  const inputName = document.getElementById("lessonName");
  const autocompleteList = document.getElementById("autocompleteList");
  inputDate.valueAsDate = new Date();

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
              const details = document.getElementById("subjectDetails");

              const hasType = s.subject_type && s.subject_type.trim() !== "";
              const hasGrade = s.subject_grade && s.subject_grade.trim() !== "";

              if (hasType || hasGrade) {
                details.style.display = "block";
                // Типы
                const typeSelect = document.getElementById("subjectTypeSelect");
                typeSelect.innerHTML = '<option value="">Выберите тип</option>';
                if (s.subject_type) {
                  const types = s.subject_type.split(",").map((t) => t.trim());
                  types.forEach((type) => {
                    const opt = document.createElement("option");
                    opt.value = type;
                    opt.textContent = type;
                    typeSelect.appendChild(opt);
                  });
                }

                // Разряды
                const gradeSelect =
                  document.getElementById("subjectGradeSelect");
                gradeSelect.innerHTML =
                  '<option value="">Выберите разряд</option>';
                if (s.subject_grade) {
                  const grades = s.subject_grade
                    .split(",")
                    .map((g) => g.trim());
                  grades.forEach((grade) => {
                    const opt = document.createElement("option");
                    opt.value = grade;
                    opt.textContent = `${grade}p.`;
                    gradeSelect.appendChild(opt);
                  });
                }
              } else {
                details.style.display = "none";
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
          loadSchedule(); // обновляем расписание
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

          <div class="form-group">
            <label>Наименование урока</label>
            <div class="autocomplete-wrapper">
              <input type="text" id="lessonName" class="lesson-input" placeholder="Начните вводить..." autocomplete="off" required value="">
              <div id="autocompleteList" class="autocomplete-items"></div>
            </div>
          </div>

          <!-- Блок типа и разряда -->
          <div id="subjectDetails" style="display: none; margin-top: 16px;">
            <div class="form-group">
              <label>Тип предмета</label>
              <select id="subjectTypeSelect" class="lesson-input"></select>
            </div>
            <div class="form-group">
              <label>Разряд предмета</label>
              <select id="subjectGradeSelect" class="lesson-input"></select>
            </div>
          </div>

          <!-- Остальные поля остаются без изменений -->
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

          <div class="form-group">
            <label>Преподаватели</label>
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
            <textarea id="lessonComment" class="lesson-input" rows="3">${lesson.LESSON_COMMENT || ""}</textarea>
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
    if (!subjectName) {
      detailsBlock.style.display = "none";
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

        if (hasType || hasGrade) {
          detailsBlock.style.display = "block";

          // Типы — все!
          typeSelect.innerHTML = '<option value="">Выберите тип</option>';
          if (hasType) {
            const types = s.subject_type.split(",").map((t) => t.trim());
            types.forEach((type) => {
              const opt = document.createElement("option");
              opt.value = type;
              opt.textContent = type;
              // Если совпадает с текущим из названия — выбираем
              if (type === initialType) opt.selected = true;
              typeSelect.appendChild(opt);
            });
          }

          // Разряды — все!
          gradeSelect.innerHTML = '<option value="">Выберите разряд</option>';
          if (hasGrade) {
            const grades = s.subject_grade.split(",").map((g) => g.trim());
            grades.forEach((grade) => {
              const opt = document.createElement("option");
              opt.value = grade;
              opt.textContent = `${grade}p.`;
              if (grade === initialGrade) opt.selected = true;
              gradeSelect.appendChild(opt);
            });
          }
        } else {
          detailsBlock.style.display = "none";
        }
      } else {
        detailsBlock.style.display = "none";
      }
    } catch (err) {
      console.error("Ошибка загрузки деталей предмета:", err);
      detailsBlock.style.display = "none";
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
          loadSchedule();
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

function renderGrid() {
  if (currentView === "week") {
    renderWeekGrid();
  } else {
    renderDayGrid();
  }
}
// Запуск

export function loadLessons() {
  renderGrid();
  loadSchedule();
}

// document.addEventListener("DOMContentLoaded", () => {});
