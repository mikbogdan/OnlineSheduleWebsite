import {
  collectTeacherData,
  clearTeacherForm,
  tableAdd,
} from "../main-content/main-content";
import { API_URL } from "../constants";
//GET
export async function loadTeachers() {
  try {
    // Получаем выбранный город из localStorage
    const branch = localStorage.getItem("selectedCity") || "Бобруйск";

    // Формируем URL с параметром branch
    const url = `${API_URL}/teachers.php?branch=${encodeURIComponent(branch)}`;
    // На продакшене будет:
    // const url = `/back-part/api/teachers.php?branch=${encodeURIComponent(branch)}`;

    const response = await fetch(url);
    const result = await response.json();

    // Очищаем таблицу (удаляем все строки tbody)
    document.querySelectorAll("#tableDB tr").forEach((row) => {
      if (!row.closest("thead")) {
        row.remove();
      }
    });

    if (result.success) {
      result.data.forEach((item) => {
        tableAdd(item);
      });
    } else {
      console.error("Ошибка:", result.message || result.error);
    }
  } catch (err) {
    console.error("Ошибка загрузки учителей:", err);
    // Можно добавить уведомление пользователю
    // alert("Не удалось загрузить данные учителей");
  }
}

//DELETE
export async function deleteDB(btn) {
  {
    const id = btn.dataset.id;

    if (
      !confirm(`Удалить педагога с ID ${id}? Это действие нельзя отменить!`)
    ) {
      return;
    }

    // Добавляем индикатор загрузки
    btn.innerHTML = "...";
    btn.disabled = true;

    try {
      const response = await fetch(
        `${API_URL}/teachers.php?action=delete&id=${id}`,
        {
          method: "DELETE",
          headers: {
            "Content-Type": "application/json;charset=utf-8",
          },
        }
      );

      const result = await response.json();

      if (result.success) {
        // Удаляем строку из таблицы плавно
        btn.closest("tr").style.transition = "all 0.4s";
        btn.closest("tr").style.opacity = "0";
        btn.closest("tr").style.height = "0";
        btn.closest("tr").style.padding = "0";
        setTimeout(() => btn.closest("tr").remove(), 400);

        alert("Педагог удалён");
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

const teachersForm = document.getElementById("teachersForm");

//POST&PUT
export async function saveDBTeacher() {
  const data = collectTeacherData(); // твоя функция сбора данных (как раньше)

  const isEdit = !!window.editingTeacherId; // ← только если мы в режиме редактирования

  // Если редактируем — добавляем ID в объект
  if (isEdit) {
    data.id = window.editingTeacherId;
  }
  try {
    const response = await fetch(
      `${API_URL}/teachers.php` +
        (isEdit ? `?action=update&id=${editingTeacherId}` : ""),
      {
        method: isEdit ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      }
    );

    const result = await response.json();

    if (result.success) {
      alert(isEdit ? "Изменения сохранены!" : "Педагог добавлен!");
      teachersForm.classList.remove("teachers-form__active");
      window.editingTeacherId = null;
      clearTeacherForm();
      loadTeachers();
      document.getElementById("editTeacher").disabled = true;
    } else {
      alert("Ошибка: " + result.message);
    }
  } catch (err) {
    alert("Ошибка сети");
  }
}
