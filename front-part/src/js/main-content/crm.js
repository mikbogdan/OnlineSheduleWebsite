import { API_URL } from "../constants";
import { debounce } from "./main-content";

let currentPage = 1;
const itemsPerPage = 50;
let totalUsers = 0;
let currentSearch = "";

const handleUserSearch = debounce((event) => {
  const query = event.target.value.trim();
  currentSearch = query;
  currentPage = 1;
  loadAdminUsers(1, query);
}, 500);

export async function loadAdminUsers(page = 1, search = "") {
  const searchInput = document.getElementById("userSearchInput");
  if (searchInput) {
    searchInput.addEventListener("input", handleUserSearch);
  }

  currentPage = page;
  currentSearch = search;

  const section = document.getElementById("adminUsersSection");
  const tbody = document.getElementById("adminUsersTableBody");

  if (!section || !tbody) {
    console.error(
      "Не найдены элементы #adminUsersSection или #adminUsersTableBody",
    );
    return;
  }

  section.style.display = "block";
  tbody.innerHTML = `<tr class="table-row--loading"><td colspan="4" class="table-cell table-cell--center">Загрузка...</td></tr>`;

  try {
    let url = `${API_URL}/users.php?page=${page}&limit=${itemsPerPage}`;

    if (search.trim()) {
      url += `&search=${encodeURIComponent(search.trim())}`;
    }

    const res = await fetch(url, { credentials: "include" });

    const result = await res.json();

    if (!result.success) {
      tbody.innerHTML = `<tr><td colspan="4" style="color: red;">${result.message || "Ошибка"}</td></tr>`;
      console.error("Ошибка от сервера:", result);
      return;
    }

    const users = result.data;
    totalUsers = result.total || users.length; // если total не пришёл — считаем по данным

    if (users.length === 0) {
      tbody.innerHTML = `<tr><td colspan="4">Нет пользователей</td></tr>`;
    } else {
      tbody.innerHTML = users
        .map(
          (user) => `
        <tr data-user-id="${user.user_id}" class="table-row">
          <td class="table-cell">${user.login || "—"}</td>
          <td class="table-cell">
            <select class="role-select">
              <option value="student" ${user.role === "student" ? "selected" : ""}>Студент</option>
              <option value="teacher" ${user.role === "teacher" ? "selected" : ""}>Педагог</option>
              <option value="admin" ${user.role === "admin" ? "selected" : ""}>Менеджер</option>
              <option value="superadmin" ${user.role === "superadmin" ? "selected" : ""}>Администратор</option>
            </select>

            <div class="teacher-field" style="display: ${user.role === "teacher" ? "block" : "none"}; margin-top: 12px;">
              <input type="hidden" class="teacher-id-hidden" value="${user.t_id || ""}">
              <input type="text" class="teacher-search-input" style="padding: 5px; border: 1px solid #ccc; border-radius: 5px; min-width: 180px" placeholder="Поиск преподавателя..." value="${user.full_name || ""}">
              <div class="teacher-suggestions" style="display: none; position: absolute; background: white; border: 1px solid #ccc; max-height: 200px; overflow-y: auto; z-index: 10;"></div>
            </div>
          </td>
          <td class="table-cell branches-cell">
            <div class="custom-multiselect" data-selected="${user.branches || ""}">
              <div class="multiselect-trigger">
                <span class="multiselect-placeholder">Выберите филиалы</span>
                <span class="multiselect-arrow">▼</span>
              </div>
              <div class="multiselect-options">
                <label><input type="checkbox" value="Бобруйск" ${user.branches?.includes("Бобруйск") ? "checked" : ""}> Бобруйск</label>
                <label><input type="checkbox" value="Минск" ${user.branches?.includes("Минск") ? "checked" : ""}> Минск</label>
                <label><input type="checkbox" value="Брест" ${user.branches?.includes("Брест") ? "checked" : ""}> Брест</label>
              </div>
            </div>
          </td>
          <td class="table-cell">
            <button class="save-user-btn">Сохранить</button>
          </td>
        </tr>
      `,
        )
        .join("");

      // Инициализация мультиселектов (твой код, не меняем)
      document.querySelectorAll(".custom-multiselect").forEach(initMultiselect);

      tbody.querySelectorAll(".role-select").forEach((select) => {
        select.addEventListener("change", (e) => {
          const row = e.target.closest("tr");
          const teacherField = row.querySelector(".teacher-field");

          if (e.target.value === "teacher") {
            teacherField.style.display = "block";
          } else {
            teacherField.style.display = "none";
            // Очищаем выбор преподавателя, если роль изменилась
            row.querySelector(".teacher-id-hidden").value = "";
            row.querySelector(".teacher-search-input").value = "";
          }
        });
      });

      tbody.querySelectorAll(".teacher-search-input").forEach((input) => {
        const suggestions = input.nextElementSibling; // .teacher-suggestions

        const searchTeacher = debounce(async (query) => {
          if (query.length < 2) {
            suggestions.innerHTML = "";
            suggestions.style.display = "none";
            return;
          }

          try {
            const res = await fetch(
              `${API_URL}/teachers.php?search=${encodeURIComponent(query)}&limit=10`,
              {
                credentials: "include",
              },
            );
            const result = await res.json();

            if (result.success && result.data.length > 0) {
              suggestions.innerHTML = result.data
                .map(
                  (t) => `
            <div class="teacher-suggestion" data-id="${t.id}" style="padding: 8px; cursor: pointer; border-bottom: 1px solid #eee;">
              ${t.full_name}
            </div>
          `,
                )
                .join("");

              suggestions.style.display = "block";

              // Клик по варианту
              suggestions
                .querySelectorAll(".teacher-suggestion")
                .forEach((item) => {
                  item.addEventListener("click", () => {
                    input.value = item.textContent.trim();
                    input.previousElementSibling.value = item.dataset.id; // hidden input
                    suggestions.innerHTML = "";
                    suggestions.style.display = "none";
                  });
                });
            } else {
              suggestions.innerHTML =
                "<div style='padding: 8px; color: #999;'>Преподаватели не найдены</div>";
              suggestions.style.display = "block";
            }
          } catch (err) {
            console.error(err);
            suggestions.innerHTML =
              "<div style='padding: 8px; color: red;'>Ошибка поиска</div>";
            suggestions.style.display = "block";
          }
        }, 400);

        input.addEventListener("input", (e) =>
          searchTeacher(e.target.value.trim()),
        );
        input.addEventListener("focus", () => {
          if (input.value.trim().length >= 2) searchTeacher(input.value.trim());
        });

        // Закрытие при клике вне
        document.addEventListener("click", (e) => {
          if (!input.contains(e.target) && !suggestions.contains(e.target)) {
            suggestions.style.display = "none";
          }
        });
      });

      // Обработчик сохранения
      tbody.querySelectorAll(".save-user-btn").forEach((btn) => {
        btn.addEventListener("click", async () => {
          const row = btn.closest("tr");
          const userId = row.dataset.userId;
          const role = row.querySelector(".role-select").value;

          const multiselect = row.querySelector(".custom-multiselect");
          const branchesStr = multiselect.dataset.selected || "";

          let teacherId = null;
          if (role === "teacher") {
            const teacherIdInput = row.querySelector(".teacher-id-hidden");
            if (teacherIdInput) {
              teacherId = teacherIdInput.value.trim();
              if (!teacherId) {
                alert("Выберите преподавателя!");
                return;
              }
            } else {
              alert("Поле преподавателя не найдено — обновите страницу");
              return;
            }
          }

          // Формируем тело запроса
          const bodyData = {
            user_id: userId,
            role: role,
            branches: branchesStr,
          };

          // Добавляем t_id ТОЛЬКО если роль teacher и значение есть
          if (teacherId) {
            bodyData.t_id = teacherId;
          }

          try {
            const res = await fetch(`${API_URL}/update-user.php`, {
              method: "POST",
              credentials: "include",
              headers: { "Content-Type": "application/x-www-form-urlencoded" },
              body: new URLSearchParams(bodyData),
            });

            const data = await res.json();

            if (data.success) {
              alert("Изменения сохранены");
              // Перезагружаем таблицу после успешного сохранения
              loadAdminUsers(currentPage, currentSearch);
            } else {
              alert(data.message || "Ошибка сохранения");
            }
          } catch (err) {
            console.error("Ошибка при сохранении:", err);
            alert("Ошибка сети");
          }
        });
      });
    }
    // Обновляем пагинацию
    renderPagination();
  } catch (err) {
    console.error("Ошибка загрузки пользователей:", err);
    tbody.innerHTML = `<tr><td colspan="4" style="color: red;">Нет связи с сервером</td></tr>`;
  }
}

function renderPagination() {
  const totalPages = Math.ceil(totalUsers / itemsPerPage);
  const pagination = document.getElementById("paginationCRM");

  pagination.innerHTML = "";

  // Назад
  const prevBtn = document.createElement("button");
  prevBtn.textContent = "Назад";
  prevBtn.disabled = currentPage === 1;
  prevBtn.addEventListener("click", () =>
    loadAdminUsers(currentPage - 1, currentSearch),
  );
  pagination.appendChild(prevBtn);

  // Фиксированное количество видимых страниц (например, 5)
  const visiblePages = 5;
  let startPage = Math.max(1, currentPage - Math.floor(visiblePages / 2));
  let endPage = Math.min(totalPages, startPage + visiblePages - 1);

  if (endPage - startPage + 1 < visiblePages) {
    startPage = Math.max(1, endPage - visiblePages + 1);
  }

  for (let i = startPage; i <= endPage; i++) {
    const btn = document.createElement("button");
    btn.textContent = i;
    btn.className = i === currentPage ? "active" : "";
    btn.addEventListener("click", () => loadAdminUsers(i, currentSearch));
    pagination.appendChild(btn);
  }

  // Вперёд
  const nextBtn = document.createElement("button");
  nextBtn.textContent = "Вперёд";
  nextBtn.disabled = currentPage === totalPages;
  nextBtn.addEventListener("click", () =>
    loadAdminUsers(currentPage + 1, currentSearch),
  );
  pagination.appendChild(nextBtn);
}

// document.getElementById("crm").addEventListener("DOMContentLoaded", () => {
//   // Первичная загрузка
//   loadAdminUsers(1);
// });

// Функция инициализации одного мультиселекта
function initMultiselect(multiselect) {
  const trigger = multiselect.querySelector(".multiselect-trigger");
  const options = multiselect.querySelector(".multiselect-options");
  const arrow = multiselect.querySelector(".multiselect-arrow");
  const placeholder = multiselect.querySelector(".multiselect-placeholder");

  function updateSelected() {
    const checked = multiselect.querySelectorAll(
      "input[type='checkbox']:checked",
    );
    const values = Array.from(checked).map((cb) => cb.value);

    if (values.length === 0) {
      trigger.innerHTML = `
        <span class="multiselect-placeholder">Выберите филиалы</span>
        <span class="multiselect-arrow">▼</span>
      `;
    } else {
      trigger.innerHTML = `
        <div class="multiselect-selected">
          ${values
            .map((v) => `<span class="multiselect-tag">${v}</span>`)
            .join("")}
        </div>
        <span class="multiselect-arrow">▼</span>
      `;
    }

    multiselect.dataset.selected = values.join(",");
  }

  trigger.addEventListener("click", (e) => {
    e.stopPropagation();
    const isOpen = options.classList.contains("open");

    // Закрываем все другие
    document
      .querySelectorAll(".multiselect-options.open")
      .forEach((o) => o.classList.remove("open"));
    document
      .querySelectorAll(".multiselect-arrow.open")
      .forEach((a) => a.classList.remove("open"));

    if (!isOpen) {
      options.classList.add("open");
      arrow.classList.add("open");
    }
  });

  // Чекбоксы
  options.querySelectorAll("input[type='checkbox']").forEach((cb) => {
    cb.addEventListener("change", updateSelected);
  });

  // Закрытие по клику вне
  document.addEventListener("click", () => {
    options.classList.remove("open");
    arrow.classList.remove("open");
  });

  updateSelected();
}
