import { API_URL } from "../constants";
import { userRole } from "../rolePermissions";

const clientsTable = document.getElementById("tableClients");
let selectedClientId = null;

function clientsTableAdd(item) {
  const tableTr = document.createElement("tr");
  tableTr.classList.add("table-tr");

  tableTr.addEventListener("click", () => {
    if (!tableTr || !tableTr.querySelector('input[type="checkbox"]')) return;

    const checkbox = tableTr.querySelector('input[type="checkbox"]');

    // Снимаем выделение со всех строк
    document.querySelectorAll("tbody tr").forEach((r) => {
      r.classList.remove("selected-row");
    });
    document.querySelectorAll('input[type="checkbox"]').forEach((cb) => {
      if (cb !== checkbox) cb.checked = false;
    });

    // Включаем/выключаем текущую
    checkbox.checked = !checkbox.checked;

    if (checkbox.checked) {
      selectedClientId = delClientBtn ? delClientBtn.dataset.id : null;
      document.getElementById("editClient").disabled = false;
    } else {
      selectedClientId = null;
      document.getElementById("editClient").disabled = true;
    }
  });

  // Чекбокс
  const tableTdCheck = document.createElement("td");
  const clientCheck = document.createElement("input");
  clientCheck.type = "checkbox";
  tableTdCheck.appendChild(clientCheck);
  tableTr.appendChild(tableTdCheck);

  // Поля
  const fields = [
    item.client_ID,
    item.client_name,
    item.client_status || "—",
    "", // Пустая ячейка для контактов
    item.client_comment || "—",
  ];

  fields.forEach((value, index) => {
    const tableTd = document.createElement("td");

    if (index === 3) {
      const contactsStr = item.client_contacts || "";

      if (contactsStr.trim() === "") {
        tableTd.textContent = "—";
      } else {
        const contactsLines = contactsStr.split("\n"); // разделяем по переносу строки

        contactsLines.forEach((line) => {
          if (line.trim() === "") return;

          const p = document.createElement("p");
          p.style.margin = "4px 0"; // отступ между строками
          p.textContent = line.trim();
          tableTd.appendChild(p);
        });
      }
    } else {
      tableTd.textContent = value;
    }

    tableTr.appendChild(tableTd);
  });

  const delClientBtn = document.createElement("td");
  delClientBtn.innerHTML = '<i class="fa-solid fa-trash-can"></i>';
  delClientBtn.classList.add("delete-teacher");
  delClientBtn.dataset.id = item.client_ID;
  // Кнопка удаления
  if (userRole === "admin" || userRole === "superadmin") {
    tableTr.appendChild(delClientBtn);

    delClientBtn.addEventListener("click", (e) => {
      e.stopPropagation(); // чтобы не срабатывал клик по строке
      deleteClient(delClientBtn);
    });
  }
  clientsTable.appendChild(tableTr);
}

//GET
export async function loadClients() {
  try {
    // Получаем выбранный город из localStorage
    const branch = localStorage.getItem("selectedCity") || "Бобруйск";

    // Формируем URL с параметром branch
    const url = `${API_URL}/clients.php?branch=${encodeURIComponent(branch)}`;
    // На продакшене будет:
    // const url = `/back-part/api/teachers.php?branch=${encodeURIComponent(branch)}`;

    const response = await fetch(url);
    const result = await response.json();

    // Очищаем таблицу (удаляем все строки tbody)
    document.querySelectorAll("#tableClients tr").forEach((row) => {
      if (!row.closest("thead")) {
        row.remove();
      }
    });

    if (result.success) {
      result.data.forEach((item) => {
        clientsTableAdd(item);
      });
    } else {
      console.error("Ошибка:", result.message || result.error);
    }
  } catch (err) {
    console.error("Ошибка загрузки учителей:", err);
  }
}

//DELETE
export async function deleteClient(btn) {
  {
    const id = btn.dataset.id;

    if (!confirm(`Удалить клиента с ID ${id}? Это действие нельзя отменить!`)) {
      return;
    }

    // Добавляем индикатор загрузки
    btn.innerHTML = "...";
    btn.disabled = true;

    try {
      const response = await fetch(
        `${API_URL}/clients.php?action=delete&id=${id}`,
        {
          method: "DELETE",
          headers: {
            "Content-Type": "application/json;charset=utf-8",
          },
        },
      );

      const result = await response.json();

      if (result.success) {
        // Удаляем строку из таблицы плавно
        btn.closest("tr").style.transition = "all 0.4s";
        btn.closest("tr").style.opacity = "0";
        btn.closest("tr").style.height = "0";
        btn.closest("tr").style.padding = "0";
        setTimeout(() => btn.closest("tr").remove(), 400);

        alert("Клиент удалён");
      } else {
        btn.innerHTML = "";
      }
    } catch (err) {
      btn.innerHTML = "";
    } finally {
      btn.disabled = false;
    }
  }
}

const clientForm = `<div class="lesson-modal-overlay" id="clientsForm">
        <div class="clients-form">
          <div class="teachers-form__header">
            Добавить клиента
            <div class="teachers-form__close" id="clientsFormClose">
              &times;
            </div>
          </div>
          <form class="teachers-form__body">
            <div class="teachers-form__field">
              <label class="teachers-form__label">ФИО <span>*</span></label>
              <input
                type="text"
                class="clients-form__input"
                placeholder="Например, Иванова Мария Ивановна"
                required
              />
            </div>

            <div class="teachers-form__field">
                <label class="teachers-form__label">Тип заказчика <span>*</span></label>
                
                <div class="clients-form__client-type">
                  <select id="clientFormType" class="clients-form__select">
                  <option value="Физ.лицо">Физ.лицо</option>
                  <option value="Юр.лицо">Юр.лицо</option>
                  </select>

                  <input type="text" id="clientFormTypeValue" class="clients-form__input__type"
                      placeholder="Заказчик">
                </div>
            </div>

            <div class="teachers-form__field">
                <label class="teachers-form__label">Статус обучения</label>
                
                <div class="clients-form__client-type">
                  <select id="clientFormStatus" class="clients-form__select__status">
                  <option value="Активен">Активен</option>
                  <option value="Завершил">Завершил</option>
                  <option value="Бросил">Бросил</option>
                  </select>
                </div>
            </div>

            <div class="teachers-form__field">
              <label class="teachers-form__label">Контакты</label>
              <div class="teachers-form__contacts" id="clientContactsList"></div>
              <button
                type="button"
                id="clientAddContact"
                style="
                  border-radius: 10px;
                  padding: 5px;
                  font-size: 14px;
                  border: 0;
                  cursor: pointer;
                "
              >
                + ещё
              </button>
            </div>

            <div class="teachers-form__field">
              <label class="clients-form__label">Примечание</label>
              <textarea
                class="clients-form__textarea"
                rows="1"
                placeholder="Любое текстовое примечание"
              ></textarea>
            </div>

            <div class="teachers-form__field teachers-form__field__alt">
              <label class="teachers-form__label">Филиалы</label>
              <div class="clients-form__checkboxes">
                <label><input type="checkbox" /> Минск</label>
                <label><input type="checkbox" checked /> Бобруйск</label>
                <label><input type="checkbox" /> Брест</label>
              </div>
            </div>

            <div class="teachers-form__footer">
              <button
                id="clientsFormCloseBtn"
                class="teachers-form__btn teachers-form__btn--cancel"
              >
                Отмена
              </button>
              <button
                type="button"
                id="saveClient"
                class="teachers-form__btn teachers-form__btn--save"
              >
                Сохранить
              </button>
            </div>
          </form>
        </div>
        </div>`;

// Добавление контакта
export function addContact() {
  const container = document.getElementById("clientContactsList");
  const row = document.createElement("div");
  row.className = "clients-form__contact-row";

  row.innerHTML = `
    <select class="teachers-form__select">
      <option value="tel"   data-type="tel"   data-mask="phone">Мобильный</option>
      <option value="num"   data-type="text"   data-mask="none">Телефон</option>
      <option value="email" data-type="email" data-mask="none">E-mail</option>
      <option value="text"  data-type="text"  data-mask="none">Skype</option>
      <option value="url"   data-type="url"   data-mask="none">Ссылка</option>
      <option value="text"  data-type="text"  data-mask="none">Адрес</option>
      <option value="text"  data-type="text"  data-mask="none">Ст. метро</option>
    </select>

    <input type="tel" class="clients-form__input clients-form__contact-value" 
           placeholder="+375 (29) 123-45-67">

    <input type="text" class="clients-form__input" placeholder="Примечание">

    <button type="button" class="teachers-form__contact-remove">−</button>
  `;

  const select = row.querySelector(".teachers-form__select");
  const valueInput = row.querySelector(".clients-form__contact-value");
  const removeBtn = row.querySelector(".teachers-form__contact-remove");

  removeBtn.onclick = () => row.remove();

  // Плейсхолдеры
  const placeholders = {
    Мобильный: "+375 (29) 123-45-67",
    Телефон: "78-25-91",
    "E-mail": "example@mail.ru",
    Skype: "your_skype",
    Ссылка: "https://",
    Адрес: "г. Минск, ул. Ленина, д. 10",
    "Ст. метро": "Немига",
  };

  // === МАСКА +375 (XX) XXX-XX-XX ===
  function applyBelarusPhoneMask(e) {
    let v = valueInput.value.replace(/\D/g, ""); // только цифры

    // Убираем старый код, если ввели 375 или 8
    if (v.startsWith("375")) v = v.slice(3);
    if (v.startsWith("8")) v = v.slice(1);

    // Ограничиваем до 9 цифр после кода
    if (v.length > 9) v = v.slice(0, 9);

    // Формируем: +375 (XX) XXX-XX-XX
    let formatted = "+375 ";
    if (v.length > 0) formatted += "(" + v.slice(0, 2);
    if (v.length >= 2) formatted += ") " + v.slice(2, 5);
    if (v.length >= 5) formatted += "-" + v.slice(5, 7);
    if (v.length >= 7) formatted += "-" + v.slice(7, 9);

    valueInput.value = formatted;

    // Курсор в конец
    setTimeout(() => {
      const pos = formatted.length;
      valueInput.setSelectionRange(pos, pos);
    }, 0);
  }

  // Смена типа контакта
  select.addEventListener("change", () => {
    const option = select.options[select.selectedIndex];
    const type = option.dataset.type;
    const mask = option.dataset.mask;
    const text = option.textContent;

    valueInput.type = type;
    valueInput.placeholder = placeholders[text];
    valueInput.value = "";

    // Убираем старую маску
    valueInput.removeEventListener("input", applyBelarusPhoneMask);

    // Включаем маску только для телефона
    if (mask === "phone") {
      valueInput.addEventListener("input", applyBelarusPhoneMask);
      valueInput.focus();
    }
  });

  // Инициализация: если первый тип — телефон
  const initialOption = select.options[select.selectedIndex];
  if (initialOption.dataset.mask === "phone") {
    valueInput.addEventListener("input", applyBelarusPhoneMask);
  }

  container.appendChild(row);
}

const addClient = document.getElementById("addClient");
//Кнопка "Добавление клиента"
addClient.addEventListener("click", () => {
  document.body.insertAdjacentHTML("beforeend", clientForm);
  addContact();

  const clientAddContact = document.getElementById("clientAddContact");

  clientAddContact.addEventListener("click", () => {
    addContact();
  });

  const clientFormModal = document.getElementById("clientsForm");
  const closeModal = () => clientFormModal.remove();

  clientFormModal
    .querySelector("#clientsFormClose")
    .addEventListener("click", closeModal);
  document
    .getElementById("clientsFormCloseBtn")
    .addEventListener("click", closeModal);
  clientFormModal.addEventListener("click", (e) => {
    if (e.target === clientFormModal) closeModal();
  });

  document.getElementById("saveClient").addEventListener("click", async () => {
    const data = collectClientsData();

    try {
      const response = await fetch(`${API_URL}/clients.php`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      const result = await response.json();

      if (result.success) {
        alert("Клиент добавлен!");
        closeModal();
        loadClients();
      } else {
        alert("Ошибка: " + result.message);
      }
    } catch (err) {
      alert("Ошибка сети");
    }
  });
});

function collectClientsData() {
  const fullName = document
    .querySelector('.clients-form__input[placeholder*="Например"]')
    ?.value.trim();
  if (!fullName) {
    alert("Введите ФИО клиента!");
    return;
  }

  //Тип клиента
  const clientTypeSelect = document.getElementById("clientFormType");
  const clientTypeInput = document.getElementById("clientFormTypeValue");

  const type = clientTypeSelect.value.trim();
  const typeName = clientTypeInput.value.trim();

  const clientType = type && typeName ? `(${type})${typeName}` : "";

  //Статус
  const clientStatus = document.getElementById("clientFormStatus").value;

  // Филиалы — строка через запятую
  const branchesArr = Array.from(
    document.querySelectorAll(
      '.clients-form__checkboxes input[type="checkbox"]:checked',
    ),
  ).map((cb) => cb.parentElement.textContent.trim().replace(/\s+/g, " "));

  const branches = branchesArr.length ? branchesArr.join(", ") : null;

  // Контакты — собираем в одну строку
  const contactLines = [];

  document.querySelectorAll(".clients-form__contact-row").forEach((row) => {
    const valueInput = row.querySelector(".clients-form__contact-value");
    const noteInput =
      row.querySelectorAll(".clients-form__input")[2] ||
      row.querySelector(
        'input[placeholder*="Примечание"], input[placeholder*="примечание"]',
      );

    const value = valueInput?.value.trim();
    const note = noteInput?.value.trim();

    if (value) {
      let line = value;
      if (note) {
        line += ` (${note})`;
      }
      contactLines.push(line);
    }
  });

  // Сохраняем через \n — чисто и удобно читать
  const contacts = contactLines.length > 0 ? contactLines.join("\n") : null;

  // Примечание
  const comment =
    document.querySelector(".clients-form__textarea")?.value.trim() || null;

  // Итоговый объект — 100% соответствует твоей БД
  const data = {
    client_name: fullName,
    client_type: clientType,
    client_status: clientStatus,
    client_contacts: contacts,
    client_comment: comment,
    client_branch: branches,
  };
  return data;
}

const editClient = document.getElementById("editClient");

editClient.addEventListener("click", async () => {
  try {
    const response = await fetch(
      `${API_URL}/clients.php?id=${selectedClientId}`,
    );

    const result = await response.json();

    if (result.success) {
      const clientEditForm = `<div class="lesson-modal-overlay" id="clientsForm">
  <div class="clients-form">
    <div class="teachers-form__header">
      Редактировать клиента
      <div class="teachers-form__close" id="clientsFormClose">
        &times;
      </div>
    </div>
    <form class="teachers-form__body">
      <div class="teachers-form__field">
        <label class="teachers-form__label">ФИО <span>*</span></label>
        <input
          type="text"
          class="clients-form__input"
          value="${result.data[0].client_name || ""}"
          placeholder="Например, Иванова Мария Ивановна"
          required
        />
      </div>

      <div class="teachers-form__field">
        <label class="teachers-form__label">Тип заказчика <span>*</span></label>
        <div class="clients-form__client-type">
          <select id="clientFormType" class="clients-form__select">
            <option value="Физ.лицо">Физ.лицо</option>
            <option value="Юр.лицо">Юр.лицо</option>
          </select>

          <input 
            type="text" 
            id="clientFormTypeValue" 
            class="clients-form__input__type"
            placeholder="Заказчик"
            value="">
        </div>
      </div>

      <div class="teachers-form__field">
        <label class="teachers-form__label">Статус обучения</label>
        <div class="clients-form__client-type">
          <select id="clientFormStatus" class="clients-form__select__status">
            <option value="Активен">Активен</option>
            <option value="Завершил">Завершил</option>
            <option value="Бросил">Бросил</option>
          </select>
        </div>
      </div>

      <div class="teachers-form__field">
        <label class="teachers-form__label">Контакты</label>
        <div class="teachers-form__contacts" id="clientContactsList"></div>
        <button
          type="button"
          id="clientAddContact"
          style="border-radius: 10px; padding: 5px; font-size: 14px; border: 0; cursor: pointer;"
        >
          + ещё
        </button>
      </div>

      <div class="teachers-form__field">
        <label class="clients-form__label">Примечание</label>
        <textarea
          class="clients-form__textarea"
          rows="1"
          placeholder="Любое текстовое примечание"
        >${result.data[0].client_comment || ""}</textarea>
      </div>

      <div class="teachers-form__field teachers-form__field__alt">
        <label class="teachers-form__label">Филиалы</label>
        <div class="clients-form__checkboxes">
          <label><input type="checkbox" ${
            result.data[0].client_branch.includes("Минск") ? "checked" : ""
          } /> Минск</label>
          <label><input type="checkbox" ${
            result.data[0].client_branch.includes("Бобруйск") ? "checked" : ""
          } /> Бобруйск</label>
          <label><input type="checkbox" ${
            result.data[0].client_branch.includes("Брест") ? "checked" : ""
          } /> Брест</label>
        </div>
      </div>

      <div class="teachers-form__footer">
        <button id="clientsFormCloseBtn" class="teachers-form__btn teachers-form__btn--cancel">
          Отмена
        </button>
        <button type="button" id="saveClient" class="teachers-form__btn teachers-form__btn--save">
          Сохранить
        </button>
      </div>
    </form>
  </div>
        </div>`;
      document.body.insertAdjacentHTML("beforeend", clientEditForm);

      const clientFormModal = document.getElementById("clientsForm");

      const clientType = result.data[0].client_type || "";

      let typeValue = "";
      let typeName = "";

      if (clientType.startsWith("(") && clientType.includes(")")) {
        const match = clientType.match(/\(([^)]+)\)(.*)/);
        if (match) {
          typeValue = match[1].trim();
          typeName = match[2].trim();
        }
      }

      const typeSelect = clientFormModal.querySelector("#clientFormType");
      const typeInput = clientFormModal.querySelector("#clientFormTypeValue");

      if (typeSelect) {
        typeSelect.value = typeValue || "Физ.лицо";
      }
      if (typeInput) {
        typeInput.value = typeName;
      }

      if (result.data[0].client_contacts) {
        const lines = result.data[0].client_contacts
          .split("\n")
          .map((l) => l.trim())
          .filter(Boolean);

        lines.forEach((line, index) => {
          if (index >= 0) addContact();

          const row = document.querySelectorAll(".clients-form__contact-row")[
            index
          ];
          if (!row) return;

          const match = line.match(/^(.+?)(?:\s+\(([^()]+)\))?\s*$/);

          let value = line.trim();
          let note = "";

          if (match) {
            value = match[1].trim();
            note = match[2] || "";
          }

          const valueInput = row.querySelector(".clients-form__contact-value");
          const noteInput =
            row.querySelectorAll(".clients-form__input")[2] ||
            row.querySelector('input[placeholder*="Примечание"]');

          if (valueInput) valueInput.value = value;
          if (noteInput) noteInput.value = note;
        });
      }
      const clientAddContact = document.getElementById("clientAddContact");

      clientAddContact.addEventListener("click", () => {
        addContact();
      });

      const closeModal = () => clientFormModal.remove();

      clientFormModal
        .querySelector("#clientsFormClose")
        .addEventListener("click", closeModal);
      document
        .getElementById("clientsFormCloseBtn")
        .addEventListener("click", closeModal);
      clientFormModal.addEventListener("click", (e) => {
        if (e.target === clientFormModal) closeModal();
      });

      document
        .getElementById("saveClient")
        .addEventListener("click", async () => {
          const data = collectClientsData();
          data.client_ID = result.data[0].client_ID;
          try {
            const response = await fetch(`${API_URL}/clients.php`, {
              method: "PUT",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(data),
            });

            const result = await response.json();

            if (result.success) {
              alert("Клиент изменён!");
              closeModal();
              loadClients();
            } else {
              alert("Ошибка: " + result.message);
            }
          } catch (err) {
            alert("Ошибка сети");
          }
        });
    }
  } catch (err) {
    alert("Ошибка сети");
  }
});
