import { API_URL } from "../constants";
import { debounce } from "./main-content";

let currentPage = 1;
const itemsPerPage = 5;
let totalItems = 0;
let currentSearch = ""; // текущий поисковый запрос

// Обработчик ввода в поиск
const handleSearchInput = debounce((event) => {
  const query = event.target.value.trim();
  currentSearch = query;
  currentPage = 1; // сбрасываем на первую страницу при новом поиске
  loadSubjects(currentPage, query);
}, 500);

//Функция рендера предметов
function renderSubjects(subjects) {
  const container = document.getElementById("subjectsList");
  container.innerHTML = "";

  const branch = localStorage.getItem("selectedCity") || "Бобруйск";

  subjects.forEach((s) => {
    let isActive = true;
    if (branch === "Минск") isActive = s.subject_active_minsk === "true";
    else if (branch === "Бобруйск") isActive = s.subject_active_bobr === "true";
    else if (branch === "Брест") isActive = s.subject_active_brest === "true";

    // Форматируем типы и разряды
    const types = s.subject_type
      ? s.subject_type.split(",").map((t) => t.trim())
      : [];
    const grades = s.subject_grade
      ? s.subject_grade.split(",").map((g) => g.trim())
      : [];

    const typesStr = types.length ? `(${types.join(", ")})` : "";
    const gradesStr = grades.length ? `(${grades.join(", ")}p.)` : "";

    const item = document.createElement("div");
    item.className = "settings-part__subjects__item";
    item.innerHTML = `
      <div class="settings-part__subjects__title-text">
        ${s.subject} ${gradesStr} ${typesStr}
        <span class="settings-part__subjects__item-id">[ID ${s.id}]</span>
      </div>
      <div class="settings-part__subjects__actions">
        <label class="toggle-switch">
          <input class="is-active" type="checkbox" ${isActive ? "checked" : ""} data-id="${s.id}">
          <span class="toggle-slider"></span>
        </label>
        <button class="settings-part__subjects__action-btn settings-part__subjects__action-btn--edit" data-id="${s.id}">
          <i class="fa-solid fa-pencil"></i>
        </button>
        <button class="settings-part__subjects__action-btn settings-part__subjects__action-btn--delete" data-id="${s.id}">
          <i class="fa-solid fa-trash-can"></i>
        </button>
      </div>
    `;

    container.appendChild(item);
  });
}
//Загрузка предметов
async function loadSubjects(page = 1, search = "") {
  currentPage = page;
  currentSearch = search;

  try {
    let url = `${API_URL}/subjects.php?&page=${page}&limit=${itemsPerPage}`;

    if (search) {
      url += `&search=${encodeURIComponent(search)}`;
    }

    const response = await fetch(url);
    const result = await response.json();

    if (result.success) {
      renderSubjects(result.data); // рендерим только эту страницу
      totalItems = result.total || result.data.length; // общее количество
      renderPagination(); // обновляем пагинацию
    } else {
      alert("Ошибка загрузки: " + result.message);
    }
  } catch (err) {
    console.error(err);
    alert("Нет связи с сервером");
  }
}

function renderPagination() {
  const totalPages = Math.ceil(totalItems / itemsPerPage);
  const pagination = document.getElementById("pagination");

  if (!pagination) return;

  pagination.innerHTML = "";

  // Назад
  const prevBtn = document.createElement("button");
  prevBtn.textContent = "Назад";
  prevBtn.disabled = currentPage === 1;
  prevBtn.addEventListener("click", () =>
    loadSubjects(currentPage - 1, currentSearch),
  );
  pagination.appendChild(prevBtn);

  // Фиксированное количество видимых страниц (например, 5)
  const visiblePages = 5;
  let startPage = Math.max(1, currentPage - Math.floor(visiblePages / 2));
  let endPage = Math.min(totalPages, startPage + visiblePages - 1);

  // Корректировка, если диапазон упирается в край
  if (endPage - startPage + 1 < visiblePages) {
    startPage = Math.max(1, endPage - visiblePages + 1);
  }

  for (let i = startPage; i <= endPage; i++) {
    const btn = document.createElement("button");
    btn.textContent = i;
    btn.className = i === currentPage ? "active" : "";
    btn.addEventListener("click", () => loadSubjects(i, currentSearch));
    pagination.appendChild(btn);
  }

  // Вперёд
  const nextBtn = document.createElement("button");
  nextBtn.textContent = "Вперёд";
  nextBtn.disabled = currentPage === totalPages;
  nextBtn.addEventListener("click", () =>
    loadSubjects(currentPage + 1, currentSearch),
  );
  pagination.appendChild(nextBtn);
}

// const modalSubjectAdd = `
//     <div class="settings-part__subjects-modal" id="dynamicAddModal">
//       <div class="settings-part__subjects-modal-content">
//         <h2 class="settings-part__subjects-modal-title">Добавить предмет</h2>
//         <input type="text" id="subjectName" class="settings-part__subjects-modal-input" placeholder="Введите название предмета" autofocus>
//         <div class="settings-part__subjects-modal-actions">
//           <button id="btnSaveNewSubject" class="settings-part__subjects-modal-btn settings-part__subjects-modal-btn--save">
//             Сохранить
//           </button>
//           <button id="btnCancelAdd" class="settings-part__subjects-modal-btn settings-part__subjects-modal-btn--cancel">
//             Отмена
//           </button>
//         </div>
//       </div>
//     </div>
//   `;

const modalSubjectAdd = `
  <div class="settings-part__subjects-modal" id="dynamicAddModal">
    <div class="settings-part__subjects-modal-content">
      <h2 class="settings-part__subjects-modal-title">Добавить предмет</h2>

      <input type="text" id="subjectName" class="settings-part__subjects-modal-input" placeholder="Название предмета" autofocus>

      <div class="form-group">
        <label>Тип предмета (ввод вручную, через запятую):</label>
        <input type="text" id="subjectType" class="settings-part__subjects-modal-input" placeholder="Например: переподготовка, повышение квалификации">
      </div>

      <div class="form-group">
        <label>Разряды/классы:</label>
        <div class="checkbox-group grade-group">
          ${[1, 2, 3, 4, 5, 6, 7, 8]
            .map(
              (n) => `
            <label><input type="checkbox" name="subject_grade" value="${n}"> ${n}</label>
          `,
            )
            .join("")}
        </div>
      </div>

      <div class="settings-part__subjects-modal-actions">
        <button id="btnSaveNewSubject" class="settings-part__subjects-modal-btn settings-part__subjects-modal-btn--save">
          Сохранить
        </button>
        <button id="btnCancelAdd" class="settings-part__subjects-modal-btn settings-part__subjects-modal-btn--cancel">
          Отмена
        </button>
      </div>
    </div>
  </div>
`;
//Добавление предметов
document
  .querySelector(".settings-part__subjects__btn")
  .addEventListener("click", () => {
    // addBtn(modalSubjectAdd, "subjects.php");
    addSubject();
  });

const modalSubjectEdit = `
  <div class="settings-part__subjects-modal" id="dynamicEditModal">
    <div class="settings-part__subjects-modal-content">
      <h2 class="settings-part__subjects-modal-title">Редактировать предмет</h2>

      <input type="hidden" id="subjectId" value="">

      <div class="form-group">
        <label>Название предмета:</label>
        <input type="text" id="subjectName" class="settings-part__subjects-modal-input" placeholder="Название предмета" autofocus>
      </div>

      <div class="form-group">
        <label>Тип предмета (через запятую):</label>
        <input type="text" id="subjectType" class="settings-part__subjects-modal-input" placeholder="Например: переподготовка, повышение квалификации">
      </div>

      <div class="form-group">
        <label>Разряды/классы:</label>
        <div class="checkbox-group grade-group" id="gradeCheckboxes">
          ${[1, 2, 3, 4, 5, 6, 7, 8]
            .map(
              (n) => `
            <label>
              <input type="checkbox" name="subject_grade" value="${n}">
              ${n}
            </label>
          `,
            )
            .join("")}
        </div>
      </div>

      <div class="settings-part__subjects-modal-actions">
        <button id="btnSaveEditSubject" class="settings-part__subjects-modal-btn settings-part__subjects-modal-btn--save">
          Сохранить
        </button>
        <button id="btnCancelEdit" class="settings-part__subjects-modal-btn settings-part__subjects-modal-btn--cancel">
          Отмена
        </button>
      </div>
    </div>
  </div>
`;

//Редактировие, Удаление, Переключатель предметов
document.getElementById("subjectsList").addEventListener("click", async (e) => {
  restBtns(e, modalSubjectEdit, "subjects.php");
});

const searchInput = document.getElementById("subjectSearch");

function addSubject() {
  searchInput.value = "";
  searchInput.dispatchEvent(new Event("input"));

  document.body.insertAdjacentHTML("beforeend", modalSubjectAdd);

  const modal = document.getElementById("dynamicAddModal");
  const inputName = document.getElementById("subjectName");
  const inputType = document.getElementById("subjectType");

  inputName.focus();

  // Закрытие
  function closeModal() {
    modal?.remove();
  }

  document.getElementById("btnCancelAdd").addEventListener("click", closeModal);
  modal.addEventListener("click", (e) => {
    if (e.target === modal) closeModal();
  });

  // Сохранение
  document
    .getElementById("btnSaveNewSubject")
    .addEventListener("click", async () => {
      const name = inputName.value.trim();
      const type = inputType.value.trim();

      // Разряды — собираем отмеченные чекбоксы
      const grades = Array.from(
        modal.querySelectorAll('input[name="subject_grade"]:checked'),
      )
        .map((cb) => cb.value)
        .join(",");

      if (!name) {
        alert("Введите название предмета!");
        return;
      }

      const body = new URLSearchParams({
        action: "add",
        subject: name,
        subject_type: type,
        subject_grade: grades,
      });

      try {
        const response = await fetch(`${API_URL}/subjects.php`, {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: body,
        });

        const result = await response.json();

        if (result.success) {
          closeModal();
          loadSubjects(); // перезагружаем список с пагинацией
          alert("Предмет успешно добавлен!");
        } else {
          alert("Ошибка: " + result.message);
        }
      } catch (err) {
        console.error(err);
        alert("Нет связи с сервером");
      }
    });

  // Enter / Esc
  inputName.addEventListener("keyup", (e) => {
    if (e.key === "Enter") document.getElementById("btnSaveNewSubject").click();
    if (e.key === "Escape") closeModal();
  });
}

function addBtn(modalTemplate, request, extraFields = {}) {
  searchInput.value = "";
  searchInput.dispatchEvent(new Event("input"));

  searchInputCabinets.value = "";
  searchInputCabinets.dispatchEvent(new Event("input"));

  document.body.insertAdjacentHTML("beforeend", modalTemplate);

  const modal = document.getElementById("dynamicAddModal");
  const inputName = document.getElementById("subjectName");

  inputName.focus();

  // Функция закрытия
  function closeModal() {
    if (modal && modal.parentNode) {
      modal.parentNode.removeChild(modal);
    }
  }

  // Закрытие по "Отмена"
  document.getElementById("btnCancelAdd").addEventListener("click", closeModal);

  // Закрытие по клику вне модалки
  modal.addEventListener("click", (e) => {
    if (e.target === modal) closeModal();
  });

  // Сохранение — твой оригинальный ID
  document
    .getElementById("btnSaveNewSubject")
    .addEventListener("click", async () => {
      const name = inputName.value.trim();

      if (!name) {
        alert("Введите название предмета!");
        return;
      }

      let body = `action=add&subject=${encodeURIComponent(name)}`;

      // Добавляем дополнительные поля (например, цвет для аудитории)
      if (extraFields.color) {
        const color = document.getElementById("cabinetColor").value;
        body += `&color=${encodeURIComponent(color)}`;
        body += `&branch=${encodeURIComponent(extraFields.branch)}`;
      }

      try {
        const response = await fetch(`${API_URL}/${request}`, {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: body,
        });

        const result = await response.json();

        if (result.success) {
          closeModal();
          if (request === "subjects.php") loadSubjects();
          if (request === "cabinets.php") loadCabinets();
          alert("Запись успешно добавлена!");
        } else {
          alert("Ошибка: " + result.message);
        }
      } catch (err) {
        console.error(err);
        alert("Нет связи с сервером");
      }
    });

  // Enter и Escape
  inputName.addEventListener("keyup", (e) => {
    if (e.key === "Enter") document.getElementById("btnSaveNewSubject").click();
    if (e.key === "Escape") closeModal();
  });
}

async function restBtns(e, modalTemplate, request) {
  //Редактирование
  const editBtn = e.target.closest(
    ".settings-part__subjects__action-btn--edit",
  );
  if (editBtn) {
    e.preventDefault(); // если кнопка внутри формы

    const id = editBtn.dataset.id;

    // Запрос данных предмета по ID
    try {
      const res = await fetch(`${API_URL}/${request}?id=${id}`, {
        credentials: "include",
      });

      const result = await res.json();

      if (!result.success || !result.data) {
        alert("Не удалось загрузить данные предмета");
        return;
      }
      if (request === "subject.php") {
        const subject = result.data;

        // Открываем модалку
        document.body.insertAdjacentHTML("beforeend", modalTemplate);

        const modal = document.getElementById("dynamicEditModal");
        const inputId = document.getElementById("subjectId");
        const inputName = document.getElementById("subjectName");
        const inputType = document.getElementById("subjectType");
        const gradeCheckboxes = modal.querySelectorAll(
          'input[name="subject_grade"]',
        );

        // Заполняем поля
        inputId.value = subject.id;
        inputName.value = subject.subject || "";
        inputType.value = subject.subject_type || "";

        // Чекбоксы разрядов
        if (subject.subject_grade) {
          const gradesArr = subject.subject_grade
            .split(",")
            .map((g) => g.trim());
          gradeCheckboxes.forEach((cb) => {
            cb.checked = gradesArr.includes(cb.value);
          });
        }

        inputName.focus();

        // Закрытие
        function closeModal() {
          modal?.remove();
        }

        document
          .getElementById("btnCancelEdit")
          .addEventListener("click", closeModal);
        modal.addEventListener("click", (e) => {
          if (e.target === modal) closeModal();
        });

        // Сохранение
        document
          .getElementById("btnSaveEditSubject")
          .addEventListener("click", async () => {
            const newName = inputName.value.trim();
            const newType = inputType.value.trim();

            const newGrades = Array.from(gradeCheckboxes)
              .filter((cb) => cb.checked)
              .map((cb) => cb.value)
              .join(",");

            if (!newName) {
              alert("Введите название предмета!");
              return;
            }

            const body = new URLSearchParams({
              action: "update",
              id: id,
              subject: newName,
              subject_type: newType,
              subject_grade: newGrades,
            });

            try {
              const response = await fetch(`${API_URL}/${request}`, {
                method: "POST",
                headers: {
                  "Content-Type": "application/x-www-form-urlencoded",
                },
                body: body,
              });

              const result = await response.json();

              if (result.success) {
                closeModal();
                loadSubjects(currentPage, currentSearch); // перезагружаем текущую страницу
                alert("Предмет успешно обновлён!");
              } else {
                alert("Ошибка: " + result.message);
              }
            } catch (err) {
              console.error(err);
              alert("Нет связи с сервером");
            }
          });

        // Enter / Esc
        inputName.addEventListener("keyup", (e) => {
          if (e.key === "Enter")
            document.getElementById("btnSaveEditSubject").click();
          if (e.key === "Escape") closeModal();
        });
      } else if (request === "cabinets.php") {
        const cabinet = result.data;

        // Открываем модалку
        document.body.insertAdjacentHTML("beforeend", modalCabinetEdit);

        const modal = document.getElementById("dynamicAddModal");
        const inputId = document.getElementById("cabinetId"); // добавим hidden id
        const inputName = document.getElementById("subjectName"); // переименован в cabinetName
        const inputColor = document.getElementById("cabinetColor");

        // Заполняем поля
        if (inputId) inputId.value = cabinet.id || "";
        inputName.value = cabinet.cabinet || "";
        inputColor.value = cabinet.cabinet_color || "#ffffff"; // цвет по умолчанию

        inputName.focus();

        // Закрытие
        function closeModal() {
          modal?.remove();
        }

        document
          .getElementById("btnCancelAdd")
          .addEventListener("click", closeModal);
        modal.addEventListener("click", (e) => {
          if (e.target === modal) closeModal();
        });

        // Сохранение
        document
          .getElementById("btnSaveNewSubject")
          .addEventListener("click", async () => {
            const newName = inputName.value.trim();
            const newColor = inputColor.value;

            if (!newName) {
              alert("Введите название аудитории!");
              return;
            }

            const body = new URLSearchParams({
              action: "update",
              id: id,
              cabinet: newName,
              cabinet_color: newColor,
              branch: localStorage.getItem("selectedCity") || "Бобруйск", // если нужно
            });

            try {
              const response = await fetch(`${API_URL}/${request}`, {
                method: "POST",
                headers: {
                  "Content-Type": "application/x-www-form-urlencoded",
                },
                body: body,
              });

              const result = await response.json();

              if (result.success) {
                closeModal();
                loadCabinets(currentPage, currentSearch); // перезагружаем список кабинетов
                alert("Аудитория успешно обновлена!");
              } else {
                alert("Ошибка: " + result.message);
              }
            } catch (err) {
              console.error(err);
              alert("Нет связи с сервером");
            }
          });

        // Enter / Esc
        inputName.addEventListener("keyup", (e) => {
          if (e.key === "Enter")
            document.getElementById("btnSaveNewSubject").click();
          if (e.key === "Escape") closeModal();
        });
      }
    } catch (err) {
      console.error("Ошибка загрузки предмета:", err);
      alert("Не удалось загрузить данные для редактирования");
    }
  }
  //Удаление
  const deleteBtn = e.target.closest(
    ".settings-part__subjects__action-btn--delete",
  );
  if (deleteBtn) {
    const id = deleteBtn.dataset.id;
    if (!confirm("Удалить запись?")) return;
    try {
      const response = await fetch(`${API_URL}/${request}?id=${id}`, {
        method: "DELETE",
      });

      const result = await response.json();

      if (result.success) {
        // Удаляем элемент из списка
        deleteBtn.closest(".settings-part__subjects__item").remove();
        alert("Запись удалена успешно!");
      } else {
        alert("Ошибка: " + result.message);
      }
    } catch (err) {
      console.error(err);
      alert("Нет связи с сервером");
    }
    return;
  }

  //Переключатель статуса
  const toggle = e.target.closest(".toggle-switch");
  if (toggle) {
    const branch = localStorage.getItem("selectedCity") || "Бобруйск";
    const toggleInput = toggle.querySelector("input.is-active");
    const id = toggleInput.dataset.id;
    const isActive = !toggleInput.checked;
    toggleInput.checked = !toggleInput.checked;

    try {
      const response = await fetch(`${API_URL}/${request}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: `action=toggle&id=${id}&active=${
          isActive ? "true" : ""
        }&branch=${branch}`,
      });

      const result = await response.json();

      if (!result.success) {
        // Если ошибка — возвращаем старое состояние
        toggle.checked = !isActive;
        alert("Ошибка сохранения статуса");
      }
    } catch (err) {
      console.error(err);
      toggle.checked = !isActive;
      alert("Нет связи с сервером");
    }

    return;
  }
}

//Функция рендера кабинетов
function renderCabinets(cabinets) {
  const container = document.getElementById("cabinetsList");
  container.innerHTML = ""; // очищаем

  cabinets.forEach((s) => {
    const isActive = s.cabinet_active == "true";

    const item = document.createElement("div");
    item.className = "settings-part__subjects__item";
    item.innerHTML = `
      <div class="settings-part__subjects__title-text">
        ${s.cabinet}
        <input type="color" class="settings-part__subjects__color" id="cabinetColorValue" value="${
          s.cabinet_color
        }">
      </div>
      <div class="settings-part__subjects__actions">
        <label class="toggle-switch">
          <input class="is-active" type="checkbox" ${
            isActive ? "checked" : ""
          } data-id="${s.id}">
          <span class="toggle-slider"></span>
        </label>
        <button class="settings-part__subjects__action-btn settings-part__subjects__action-btn--edit" data-id="${
          s.id
        }">
          <i class="fa-solid fa-pencil"></i>
        </button>
        <button class="settings-part__subjects__action-btn settings-part__subjects__action-btn--delete" data-id="${
          s.id
        }">
          <i class="fa-solid fa-trash-can"></i>
        </button>
      </div>
    `;

    container.appendChild(item);
  });
}

//Загрузка кабинетов
async function loadCabinets() {
  try {
    const branch = localStorage.getItem("selectedCity") || "Бобруйск";
    const url = `${API_URL}/cabinets.php?branch=${encodeURIComponent(branch)}`;

    const response = await fetch(url);
    const result = await response.json();

    if (result.success) {
      renderCabinets(result.data);
    } else {
      alert("Ошибка загрузки: " + result.message);
    }
  } catch (err) {
    console.error(err);
    alert("Нет связи с сервером");
  }
}

const modalCabinet = `
    <div class="settings-part__subjects-modal" id="dynamicAddModal">
      <div class="settings-part__subjects-modal-content">
        <h2 class="settings-part__subjects-modal-title">Добавить аудиторию</h2>
        <input type="text" id="subjectName" class="settings-part__subjects-modal-input" placeholder="Введите название аудитории" autofocus>
        <span class="settings-part__subjects-modal-color">Цвет аудитории: </span><input class="settings-part__subjects-modal-input__color" type="color" id="cabinetColor" value="#10709f">
        <div class="settings-part__subjects-modal-actions">
          <button id="btnSaveNewSubject" class="settings-part__subjects-modal-btn settings-part__subjects-modal-btn--save">
            Сохранить
          </button>
          <button id="btnCancelAdd" class="settings-part__subjects-modal-btn settings-part__subjects-modal-btn--cancel">
            Отмена
          </button>
        </div>
      </div>
    </div>
  `;

//Добавление кабинета
document.getElementById("addCabinet").addEventListener("click", () => {
  const branch = localStorage.getItem("selectedCity") || "Бобруйск";
  addBtn(modalCabinet, "cabinets.php", { color: true, branch: branch });
});

const modalCabinetEdit = `
  <div class="settings-part__subjects-modal" id="dynamicAddModal">
    <div class="settings-part__subjects-modal-content">
      <h2 class="settings-part__subjects-modal-title">Редактировать аудиторию</h2>
      
      <input type="hidden" id="cabinetId" value="">
      
      <input type="text" id="subjectName" class="settings-part__subjects-modal-input" placeholder="Название аудитории" autofocus>
      
      <div class="settings-part__subjects-modal-color-wrapper">
        <span class="settings-part__subjects-modal-color">Цвет аудитории: </span>
        <input class="settings-part__subjects-modal-input__color" type="color" id="cabinetColor">
      </div>
      
      <div class="settings-part__subjects-modal-actions">
        <button id="btnSaveNewSubject" class="settings-part__subjects-modal-btn settings-part__subjects-modal-btn--save">
          Сохранить
        </button>
        <button id="btnCancelAdd" class="settings-part__subjects-modal-btn settings-part__subjects-modal-btn--cancel">
          Отмена
        </button>
      </div>
    </div>
  </div>
`;

document.getElementById("cabinetsList").addEventListener("click", async (e) => {
  restBtns(e, modalCabinetEdit, "cabinets.php");
});

//Поиск по названию
const searchInputCabinets = document.getElementById("cabinetSearch");
const cabinetsList = document.getElementById("cabinetsList");

searchInputCabinets.addEventListener("input", () => {
  const filterValue = searchInputCabinets.value.trim().toLowerCase();

  const items = cabinetsList.querySelectorAll(".settings-part__subjects__item");

  items.forEach((item) => {
    const titleText = item
      .querySelector(".settings-part__subjects__title-text")
      .textContent.toLowerCase();

    if (titleText.includes(filterValue)) {
      item.style.display = "";
    } else {
      item.style.display = "none";
    }
  });
});

//Навигация
const contentContainer = document.querySelector(".settings-part__content");
const STORAGE_KEY = "activeSettingsTab";

// Функция активации блока
function activateTab(target) {
  // Снимаем active со всех
  contentContainer
    .querySelectorAll(".settings-part__content__subjects")
    .forEach((el) => {
      el.classList.remove("settings-part__content__subjects__active");
    });

  // Активируем нужный
  const activeBlock = contentContainer.querySelector(
    `.settings-part__content__subjects[data-target="${target}"]`,
  );
  if (activeBlock) {
    activeBlock.classList.add("settings-part__content__subjects__active");
  }
  // Запуск нужной функции
  if (target === "subjects") {
    const searchInput = document.getElementById("subjectSearch");
    if (searchInput) {
      searchInput.addEventListener("input", handleSearchInput);
    }
    loadSubjects(1);
  } else if (target === "cabinets") {
    const branch = localStorage.getItem("selectedCity") || "Бобруйск";
    document.getElementById("cabinetTitle").textContent = `Аудитории ${branch}`;

    loadCabinets();
  } else if (target === "") {
    return;
  }

  // Сохраняем в localStorage
  localStorage.setItem(STORAGE_KEY, target);
}

// Обработчик клика на навигацию
document.querySelector(".settings-part__nav").addEventListener("click", (e) => {
  const li = e.target.closest("li");
  if (!li) return;

  const text = li.textContent.trim();
  let target = null;

  if (text === "Предметы") target = "subjects";
  if (text === "Аудитории") target = "cabinets";

  if (!target) return;

  activateTab(target);

  // Подсветка активного пункта
  document.querySelectorAll(".settings__elements li").forEach((item) => {
    item.classList.remove("active");
  });
  li.classList.add("active");
});

// === Восстановление при загрузке страницы ===
document.addEventListener("DOMContentLoaded", () => {
  const savedTab = localStorage.getItem(STORAGE_KEY) || ""; // дефолт — предметы

  // Активируем сохранённый таб
  activateTab(savedTab);

  // Подсвечиваем пункт в меню
  const activeLi = Array.from(
    document.querySelectorAll(".settings__elements li"),
  ).find((li) => {
    const text = li.textContent.trim();
    if (savedTab === "subjects") return text === "Предметы";
    if (savedTab === "cabinets") return text === "Аудитории";
    return false;
  });

  if (activeLi) {
    document.querySelectorAll(".settings__elements li").forEach((item) => {
      item.classList.remove("active");
    });
    activeLi.classList.add("active");
  }
});
