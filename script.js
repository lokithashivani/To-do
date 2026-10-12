const taskForm = document.getElementById("taskForm");
const taskInput = document.getElementById("taskInput");
const submitBtn = document.getElementById("submitBtn");
const taskList = document.getElementById("taskList");
const taskCount = document.getElementById("taskCount");
const completedCount = document.getElementById("completedCount");
const emptyMessage = document.getElementById("emptyMessage");
const clearCompletedBtn = document.getElementById("clearCompleted");
const filterButtons = document.querySelectorAll(".filter-btn");

const STORAGE_KEY = "myTodoTasks";

// Load saved tasks safely when the app opens.
function loadTasks() {
  try {
    const savedTasks = localStorage.getItem(STORAGE_KEY);
    const parsedTasks = savedTasks ? JSON.parse(savedTasks) : [];

    if (!Array.isArray(parsedTasks)) {
      return [];
    }

    return parsedTasks.filter(
      (task) =>
        task &&
        typeof task.id === "string" &&
        typeof task.title === "string" &&
        typeof task.completed === "boolean",
    );
  } catch (error) {
    console.error("Could not load tasks:", error);
    return [];
  }
}

let tasks = loadTasks();
let currentFilter = "all";
let editingId = null;

// Save the current tasks to browser storage.
function saveTasks() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
    return true;
  } catch (error) {
    console.error("Could not save tasks:", error);
    alert("Tasks could not be saved. Browser storage may be unavailable.");
    return false;
  }
}

// Add a new task or update an existing task.
taskForm.addEventListener("submit", function (event) {
  event.preventDefault();

  const title = taskInput.value.trim();

  if (title === "") {
    taskInput.focus();
    return;
  }

  if (editingId !== null) {
    const task = tasks.find((task) => task.id === editingId);

    if (task) {
      const oldTitle = task.title;
      task.title = title;

      if (!saveTasks()) {
        task.title = oldTitle;
        return;
      }
    }

    editingId = null;
    submitBtn.textContent = "+ Add";
  } else {
    const newTask = {
      id: crypto.randomUUID(),
      title: title,
      completed: false,
    };

    tasks.push(newTask);

    if (!saveTasks()) {
      tasks.pop();
      return;
    }
  }

  taskInput.value = "";
  renderTasks();
  taskInput.focus();
});

// Display tasks according to the selected filter.
function renderTasks() {
  taskList.replaceChildren();

  const visibleTasks = tasks.filter(function (task) {
    if (currentFilter === "active") {
      return !task.completed;
    }

    if (currentFilter === "completed") {
      return task.completed;
    }

    return true;
  });

  visibleTasks.forEach(function (task) {
    const li = document.createElement("li");
    li.className = "task-item";

    if (task.completed) {
      li.classList.add("completed");
    }

    // Checkbox
    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.className = "task-checkbox";
    checkbox.checked = task.completed;
    checkbox.setAttribute("aria-label", "Complete " + task.title);
    checkbox.dataset.action = "toggle";
    checkbox.dataset.id = task.id;

    // Task title
    const title = document.createElement("span");
    title.className = "task-title";
    title.textContent = task.title;

    // Action buttons
    const actions = document.createElement("div");
    actions.className = "task-actions";

    const editBtn = document.createElement("button");
    editBtn.type = "button";
    editBtn.className = "action-btn";
    editBtn.textContent = "Edit";
    editBtn.dataset.action = "edit";
    editBtn.dataset.id = task.id;
    editBtn.setAttribute("aria-label", "Edit " + task.title);

    const deleteBtn = document.createElement("button");
    deleteBtn.type = "button";
    deleteBtn.className = "action-btn delete-btn";
    deleteBtn.textContent = "Delete";
    deleteBtn.dataset.action = "delete";
    deleteBtn.dataset.id = task.id;
    deleteBtn.setAttribute("aria-label", "Delete " + task.title);

    actions.append(editBtn, deleteBtn);
    li.append(checkbox, title, actions);
    taskList.appendChild(li);
  });

  // Update task counts.
  const remaining = tasks.filter((task) => !task.completed).length;
  const completed = tasks.filter((task) => task.completed).length;

  taskCount.textContent =
    remaining + (remaining === 1 ? " task left" : " tasks left");

  completedCount.textContent = completed + " completed";

  // Show an empty message when the filtered list is empty.
  emptyMessage.hidden = visibleTasks.length > 0;

  emptyMessage.textContent =
    tasks.length === 0
      ? "No tasks here yet. Add your first task!"
      : currentFilter === "active"
        ? "No active tasks. You're all caught up!"
        : currentFilter === "completed"
          ? "No completed tasks yet."
          : "No tasks to display.";

  // Keep filter button appearance and accessibility state in sync.
  filterButtons.forEach(function (button) {
    const isActive = button.dataset.filter === currentFilter;

    button.classList.toggle("active", isActive);
    button.setAttribute("aria-pressed", String(isActive));
  });
}

// Event delegation: handle clicks on task controls in one place.
taskList.addEventListener("click", function (event) {
  const button = event.target.closest("button[data-action]");

  if (!button || !taskList.contains(button)) {
    return;
  }

  const id = button.dataset.id;
  const action = button.dataset.action;

  if (action === "edit") {
    const task = tasks.find((task) => task.id === id);

    if (task) {
      editingId = id;
      taskInput.value = task.title;
      submitBtn.textContent = "Save";
      taskInput.focus();
    }
  }

  if (action === "delete") {
    const previousTasks = tasks;
    tasks = tasks.filter((task) => task.id !== id);

    if (!saveTasks()) {
      tasks = previousTasks;
      return;
    }

    if (editingId === id) {
      editingId = null;
      taskInput.value = "";
      submitBtn.textContent = "+ Add";
    }

    renderTasks();
  }
});

// Event delegation for task completion checkboxes.
taskList.addEventListener("change", function (event) {
  const checkbox = event.target;

  if (!checkbox.matches('input[data-action="toggle"]')) {
    return;
  }

  const task = tasks.find((task) => task.id === checkbox.dataset.id);

  if (task) {
    const previousStatus = task.completed;
    task.completed = checkbox.checked;

    if (!saveTasks()) {
      task.completed = previousStatus;
    }

    renderTasks();
  }
});

// Filter: All, Active, or Completed.
filterButtons.forEach(function (button) {
  button.addEventListener("click", function () {
    currentFilter = button.dataset.filter;
    renderTasks();
  });
});

// Delete every completed task.
clearCompletedBtn.addEventListener("click", function () {
  const previousTasks = tasks;
  tasks = tasks.filter((task) => !task.completed);

  if (!saveTasks()) {
    tasks = previousTasks;
    return;
  }

  if (editingId !== null && !tasks.some((task) => task.id === editingId)) {
    editingId = null;
    taskInput.value = "";
    submitBtn.textContent = "+ Add";
  }

  renderTasks();
});

// Display saved tasks when the page first loads.
renderTasks();
