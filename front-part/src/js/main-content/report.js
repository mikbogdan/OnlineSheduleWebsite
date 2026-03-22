import { API_URL } from "../constants";

const modalReport = `<div class="filter-modal-overlay" id="filterModal">
    <div class="filter-modal">
      <div class="filter-modal-header">
        <h2>Расписание уроков</h2>
        <span class="filter-modal-close" id="filterCloseIcon">×</span>
      </div>

      <div class="filter-modal-body">
        <div class="filter-group">
          <label>Педагог</label>
          <select id="filterTeacher" class="filter-select">
            <option value="">Все педагоги</option>
          </select>
        </div>

        <div class="filter-group">
          <label>Начало периода</label>
          <div class="date-input-wrapper">
            <button class="date-btn date-btn-minus" id="startDateMinus">M-</button>
            <input type="text" id="filterStartDate" class="filter-date-input">
            <button class="date-btn date-btn-plus" id="startDatePlus">M+</button>
          </div>
        </div>

        <div class="filter-group">
          <label>Конец периода</label>
          <div class="date-input-wrapper">
            <button class="date-btn date-btn-minus" id="endDateMinus">M-</button>
            <input type="text" id="filterEndDate" class="filter-date-input">
            <button class="date-btn date-btn-plus" id="endDatePlus">M+</button>
          </div>
        </div>

      <div class="filter-group checkboxes">
        <label>Типы</label>
        <div class="checkbox-list">
          <label><input type="checkbox" value="group"> Групповой</label>
          <label><input type="checkbox" value="individual"> Индивидуальный</label>
          <label><input type="checkbox" value="trial"> Пробный</label>
        </div>
      </div>

    <div class="filter-modal-footer">
      <button id="filterCancel" class="filter-btn filter-btn-cancel">Отмена</button>
      <button id="filterApply" class="filter-btn filter-btn-apply">Сформировать</button>
    </div>
  </div>
</div>`;

const today = new Date(); // March 20, 2026 (месяцы в JS с 0)

let currentDate = new Date(today);
let range = getMonthRange(currentDate);

// Функция для получения первого и последнего дня месяца
function getMonthRange(date) {
  const firstDay = new Date(date.getFullYear(), date.getMonth(), 1);
  const lastDay = new Date(date.getFullYear(), date.getMonth() + 1, 0);

  const formatDate = (d) => {
    const day = String(d.getDate()).padStart(2, "0");
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const year = d.getFullYear();
    return `${day}.${month}.${year}`;
  };

  return {
    start: formatDate(firstDay),
    end: formatDate(lastDay),
    rawStart: firstDay,
    rawEnd: lastDay,
  };
}

const reportSheduleBtn = document.getElementById("sheduleReport");

reportSheduleBtn.addEventListener("click", async () => {
  // Вставляем модалку
  document.body.insertAdjacentHTML("beforeend", modalReport);

  const startInput = document.getElementById("filterStartDate");
  const endInput = document.getElementById("filterEndDate");

  startInput.value = range.start;
  endInput.value = range.end;

  const modalOverlay = document.getElementById("filterModal");
  const closeIcon = document.getElementById("filterCloseIcon");
  const cancelBtn = document.getElementById("filterCancel");

  // Функция закрытия
  const closeModal = () => {
    if (modalOverlay) {
      modalOverlay.remove();
    }
  };

  // Обработчики закрытия
  closeIcon.addEventListener("click", closeModal);
  cancelBtn.addEventListener("click", closeModal);
  modalOverlay.addEventListener("click", (e) => {
    if (e.target === modalOverlay) {
      closeModal();
    }
  });

  // === ЗАГРУЗКА ПРЕПОДАВАТЕЛЕЙ В SELECT ===
  const teacherSelect = document.getElementById("filterTeacher");

  try {
    const branch = localStorage.getItem("selectedCity") || "Бобруйск";
    const response = await fetch(
      `${API_URL}/teachers.php?branch=${encodeURIComponent(branch)}`,
    );
    const result = await response.json();

    if (result.success && Array.isArray(result.data)) {
      // Очищаем (кроме "Все педагоги")
      teacherSelect.innerHTML = '<option value="">Все педагоги</option>';

      result.data.forEach((teacher) => {
        const option = document.createElement("option");
        option.value = teacher.full_name;
        option.textContent = teacher.full_name;
        teacherSelect.appendChild(option);
      });
    } else {
      console.warn("Не удалось загрузить преподавателей");
      teacherSelect.innerHTML += '<option value="">Ошибка загрузки</option>';
    }
  } catch (err) {
    console.error("Ошибка загрузки преподавателей:", err);
    teacherSelect.innerHTML += '<option value="">Нет связи</option>';
  }

  // === ОБРАБОТКА КНОПОК ДАТЫ ===
  const startDateInput = document.getElementById("filterStartDate");
  const endDateInput = document.getElementById("filterEndDate");

  // Функция парсинга даты из строки "22.12.2025"
  const parseDate = (str) => {
    const [day, month, year] = str.split(".").map(Number);
    return new Date(year, month - 1, day); // месяц в JS с 0
  };

  // Функция форматирования даты в "DD.MM.YYYY"
  const formatDate = (date) => {
    const d = date.getDate().toString().padStart(2, "0");
    const m = (date.getMonth() + 1).toString().padStart(2, "0");
    const y = date.getFullYear();
    return `${d}.${m}.${y}`;
  };

  document.getElementById("startDateMinus").addEventListener("click", () => {
    currentDate.setMonth(currentDate.getMonth() - 1);
    range = getMonthRange(currentDate);
    startInput.value = range.start;
  });

  document.getElementById("startDatePlus").addEventListener("click", () => {
    currentDate.setMonth(currentDate.getMonth() + 1);
    range = getMonthRange(currentDate);
    startInput.value = range.start;
  });

  // То же самое для кнопок конца периода (они синхронизированы)
  document.getElementById("endDateMinus").addEventListener("click", () => {
    currentDate.setMonth(currentDate.getMonth() - 1);
    range = getMonthRange(currentDate);
    endInput.value = range.end;
  });

  document.getElementById("endDatePlus").addEventListener("click", () => {
    currentDate.setMonth(currentDate.getMonth() + 1);
    range = getMonthRange(currentDate);
    endInput.value = range.end;
  });

  // Опционально: при изменении начала — конец не меньше начала
  startDateInput.addEventListener("change", () => {
    const start = parseDate(startDateInput.value);
    const end = parseDate(endDateInput.value);
    if (start > end) {
      endDateInput.value = startDateInput.value;
    }
  });

  document.getElementById("filterApply").addEventListener("click", async () => {
    const shedulePart = document.getElementById("lessons-part");
    shedulePart.classList.remove("main-content__active");

    const teacherId = document.getElementById("filterTeacher").value.trim(); // ID или ""
    const startDate = document.getElementById("filterStartDate").value; // "22.12.2025"
    const endDate = document.getElementById("filterEndDate").value; // "28.12.2025"

    // Преобразуем даты в YYYY-MM-DD для сервера
    const formatForServer = (str) => {
      const [d, m, y] = str.split(".");
      return `${y}-${m}-${d}`;
    };

    const typeCheckboxes = document.querySelectorAll(
      ".checkbox-list input[type='checkbox']",
    );
    const selectedTypes = Array.from(typeCheckboxes)
      .filter((cb) => cb.checked)
      .map((cb) => cb.value.toLowerCase())
      .join(",");

    const branch = localStorage.getItem("selectedCity") || "Бобруйск";

    const params = new URLSearchParams({
      start: formatForServer(startDate),
      end: formatForServer(endDate),
      branch: branch, // ← добавляем филиал
    });

    if (teacherId) {
      params.append("teacher", teacherId);
    }

    if (selectedTypes) {
      params.append("type", selectedTypes); // "trial,group"
    }

    try {
      const response = await fetch(
        `${API_URL}/lessons.php?${params.toString()}`,
      );
      const result = await response.json();

      if (!result.success) {
        alert(
          "Ошибка загрузки расписания: " +
            (result.message || "Неизвестная ошибка"),
        );
        return;
      }

      const lessons = result.data;

      // Закрываем модалку
      closeModal();

      // Рендерим таблицу отчёта
      renderScheduleReport(lessons, startDate, endDate);
    } catch (err) {
      console.error(err);
      alert("Ошибка сети при формировании отчёта");
    }
  });
});

function renderScheduleReport(lessons, startDate, endDate) {
  // Удаляем предыдущий отчёт
  const oldReport = document.getElementById("scheduleReportTable");
  if (oldReport) oldReport.remove();

  const mainSection = document.querySelector(".main-part");
  if (!mainSection) {
    console.error("Секция .main-part не найдена");
    return;
  }

  // Группируем по датам
  const lessonsByDate = {};
  lessons.forEach((lesson) => {
    const dateStr = lesson.LESSON_DATA;
    if (!lessonsByDate[dateStr]) lessonsByDate[dateStr] = [];
    lessonsByDate[dateStr].push(lesson);
  });

  const sortedDates = Object.keys(lessonsByDate).sort();

  const formatDayHeader = (dateStr) => {
    const date = new Date(dateStr);
    const dayName = date.toLocaleDateString("ru-RU", { weekday: "long" });
    const day = date.getDate().toString().padStart(2, "0");
    const month = (date.getMonth() + 1).toString().padStart(2, "0");
    const year = date.getFullYear();
    return `${
      dayName.charAt(0).toUpperCase() + dayName.slice(1)
    }, ${day}.${month}.${year}`;
  };

  const formatTime = (time) => (time ? time.slice(0, 5) : "—");

  // Создаём контейнер
  const reportContainer = document.createElement("div");
  reportContainer.id = "scheduleReportTable";
  reportContainer.style.margin = "40px 0";
  reportContainer.style.padding = "24px";
  reportContainer.style.background = "#fff";

  // Кнопки управления
  reportContainer.innerHTML = `
    <div class="report__btns" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px;">
      <button id="reportBackBtn" style="
        padding: 7px 20px;
        background: #6c757d;
        color: white;
        border: none;
        cursor: pointer;
        font-size: 14px;
      ">← Назад</button>

      <div class="report__btns" style="display: flex; gap: 12px;">
        <button id="reportExcelBtn" style="
          padding: 7px 20px;
          background: #207f36ff;
          color: white;
          border: none;
          cursor: pointer;
          font-size: 14px;
        ">📄 Скачать в Excel</button>

        <button id="reportPrintBtn" style="
          padding: 7px 20px;
          background: #0264cdff;
          color: white;
          border: none;
          cursor: pointer;
          font-size: 14px;
        ">🖨 Распечатать</button>
      </div>
    </div>

    <h2 style="text-align: center; margin: 0 0 32px 0; color: #333;">
      Расписание уроков<br>
      <span style="font-size: 18px; color: #666;">За период с ${startDate} по ${endDate}</span>
    </h2>

    <table id="reportTable" style="width: 100%; border-collapse: collapse; font-size: 15px;">
      <!-- Таблица будет заполнена ниже -->
    </table>
  `;

  const table = reportContainer.querySelector("#reportTable");

  if (sortedDates.length === 0) {
    table.innerHTML = `
      <tr>
        <td style="text-align: center; padding: 60px; color: #999; font-style: italic;">
          Нет уроков за выбранный период
        </td>
      </tr>
    `;
  } else {
    sortedDates.forEach((dateStr) => {
      const dayLessons = lessonsByDate[dateStr];

      // Заголовок дня
      table.innerHTML += `
        <tr class="day-header">
          <td colspan="5" style="padding: 20px 16px 12px; font-size: 18px; font-weight: 600; color: #333; border-bottom: 2px solid #e0e0e0; background: #f8f9fa;">
            ${formatDayHeader(dateStr)}
          </td>
        </tr>
      `;

      // Уроки
      dayLessons.forEach((lesson) => {
        table.innerHTML += `
          <tr class="lesson-row">
            <td style="padding: 14px 16px; white-space: nowrap;">
              ${formatTime(lesson.LESSON_START)} – ${formatTime(
                lesson.LESSON_END,
              )}
            </td>
            <td style="padding: 14px 16px;">
              ${lesson.cabinet_name || "—"}
              ${
                lesson.lesson_class
                  ? `<br><small style="color: #666;">(Класс ${lesson.lesson_class})</small>`
                  : ""
              }
            </td>
            <td style="padding: 14px 16px;">
              <strong>${lesson.LESSON_TEACHER || "—"}</strong>
            </td>
            <td style="padding: 14px 16px;">
              ${lesson.LESSON_NAME || "—"}
            </td>
            <td style="padding: 14px 16px; color: #555;">
              ${lesson.LESSON_COMMENT || "—"}
            </td>
          </tr>
        `;
      });
    });
  }

  // === КНОПКИ ===
  // Назад
  reportContainer
    .querySelector("#reportBackBtn")
    .addEventListener("click", () => {
      reportContainer.remove();
      const shedulePart = document.getElementById("lessons-part");
      shedulePart.classList.add("main-content__active");
    });

  // Распечатать
  reportContainer
    .querySelector("#reportPrintBtn")
    .addEventListener("click", () => {
      window.print();
    });

  // Скачать в Excel
  reportContainer
    .querySelector("#reportExcelBtn")
    .addEventListener("click", () => {
      const wb = XLSX.utils.book_new();

      // Создаём массив данных для Excel
      const excelData = [
        ["Расписание уроков"],
        [`За период с ${startDate} по ${endDate}`],
        [], // пустая строка
        [
          "Дата и время",
          "Класс / Аудитория",
          "Педагог",
          "Предмет",
          "Комментарий",
        ],
      ];

      sortedDates.forEach((dateStr) => {
        const dayHeader = formatDayHeader(dateStr);
        excelData.push([dayHeader]);

        lessonsByDate[dateStr].forEach((lesson) => {
          excelData.push([
            `${formatTime(lesson.LESSON_START)} – ${formatTime(
              lesson.LESSON_END,
            )}`,
            `${lesson.cabinet_name || ""} ${
              lesson.lesson_class ? `(Класс ${lesson.lesson_class})` : ""
            }`,
            lesson.LESSON_TEACHER || "",
            lesson.LESSON_NAME || "",
            lesson.LESSON_COMMENT || "",
          ]);
        });

        excelData.push([]); // разделитель между днями
      });

      const ws = XLSX.utils.aoa_to_sheet(excelData);
      XLSX.utils.book_append_sheet(wb, ws, "Расписание");

      // Скачивание
      XLSX.writeFile(
        wb,
        `Расписание_${startDate.replace(/\./g, "-")}_${endDate.replace(
          /\./g,
          "-",
        )}.xlsx`,
      );
    });

  mainSection.appendChild(reportContainer);
}

//Доделать скачивание в Excel  и кнопку назад. Отредактировать печать в pdf
