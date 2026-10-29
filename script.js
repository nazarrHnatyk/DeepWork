
const STORAGE_KEY = "deepwork-tasks-v2";

const taskForm = document.getElementById("taskForm");
const taskNameInput = document.getElementById("taskName");
const startTimeInput = document.getElementById("startTime");
const endTimeInput = document.getElementById("endTime");
const priorityInput = document.getElementById("priority");
const taskList = document.getElementById("taskList");
const scheduleList = document.getElementById("scheduleList");
const message = document.getElementById("message");

let tasks = loadTasks();
let messageTimer;

function loadTasks() {
    try {
        const savedTasks = localStorage.getItem(STORAGE_KEY);

        if (!savedTasks) {
            return [];
        }

        const parsedTasks = JSON.parse(savedTasks);

        if (!Array.isArray(parsedTasks)) {
            return [];
        }

        return parsedTasks.filter((task) =>
            task &&
            typeof task.id === "string" &&
            typeof task.name === "string" &&
            typeof task.startTime === "string" &&
            typeof task.endTime === "string" &&
            ["high", "medium", "low"].includes(task.priority) &&
            typeof task.completed === "boolean"
        );
    } catch (error) {
        console.error("Could not load saved tasks:", error);
        return [];
    }
}

function saveTasks() {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
    } catch (error) {
        console.error("Could not save tasks:", error);
        showMessage(
            "Your changes could not be saved in this browser.",
            "error"
        );
    }
}

function showMessage(text, type = "error") {
    clearTimeout(messageTimer);

    message.textContent = text;
    message.className = `message ${type}`;

    messageTimer = setTimeout(() => {
        message.textContent = "";
        message.className = "message";
    }, 3500);
}

function timeToMinutes(time) {
    const [hours, minutes] = time.split(":").map(Number);
    return hours * 60 + minutes;
}

function formatTime(time) {
    const [hours, minutes] = time.split(":").map(Number);
    const period = hours >= 12 ? "PM" : "AM";
    const displayHours = hours % 12 || 12;

    return `${displayHours}:${String(minutes).padStart(2, "0")} ${period}`;
}

function getDuration(startTime, endTime) {
    const difference =
        timeToMinutes(endTime) - timeToMinutes(startTime);

    const hours = Math.floor(difference / 60);
    const minutes = difference % 60;

    if (hours === 0) {
        return `${minutes} min`;
    }

    if (minutes === 0) {
        return `${hours} hr`;
    }

    return `${hours} hr ${minutes} min`;
}

function getPriorityLabel(priority) {
    const labels = {
        high: "High",
        medium: "Medium",
        low: "Low"
    };

    return labels[priority] || "Medium";
}

function sortTasks(taskArray) {
    return [...taskArray].sort((a, b) =>
        a.startTime.localeCompare(b.startTime)
    );
}

function hasTimeConflict(startTime, endTime) {
    const newStart = timeToMinutes(startTime);
    const newEnd = timeToMinutes(endTime);

    return tasks.some((task) => {
        if (task.completed) {
            return false;
        }

        const existingStart = timeToMinutes(task.startTime);
        const existingEnd = timeToMinutes(task.endTime);

        return newStart < existingEnd && newEnd > existingStart;
    });
}

function updateStats() {
    const total = tasks.length;
    const completed = tasks.filter((task) => task.completed).length;
    const progress = total === 0
        ? 0
        : Math.round((completed / total) * 100);

    document.getElementById("total").textContent = total;
    document.getElementById("completed").textContent = completed;
    document.getElementById("progress").textContent = progress;
    document.getElementById("progressBar").style.width = `${progress}%`;

    document.getElementById("taskCount").textContent =
        `${total} ${total === 1 ? "task" : "tasks"}`;
}

function renderTasks() {
    taskList.innerHTML = "";

    if (tasks.length === 0) {
        taskList.innerHTML = `
            <div class="empty-state">
                <span class="empty-icon">✧</span>
                <p>No tasks yet</p>
                <span>Add your first task to get started.</span>
            </div>
        `;

        updateStats();
        return;
    }

    sortTasks(tasks).forEach((task) => {
        const row = document.createElement("div");
        row.className = `task-row${task.completed ? " done" : ""}`;

        const checkbox = document.createElement("input");
        checkbox.type = "checkbox";
        checkbox.className = "task-checkbox";
        checkbox.checked = task.completed;
        checkbox.setAttribute(
            "aria-label",
            `Mark ${task.name} as ${task.completed ? "not completed" : "completed"}`
        );

        checkbox.addEventListener("change", () => {
            toggleTask(task.id);
        });

        const info = document.createElement("div");
        info.className = "task-info";

        const name = document.createElement("p");
        name.className = "task-name";
        name.textContent = task.name;

        const meta = document.createElement("div");
        meta.className = "task-meta";

        const time = document.createElement("span");
        time.textContent =
            `${formatTime(task.startTime)} – ${formatTime(task.endTime)}`;

        const priority = document.createElement("span");
        priority.className = `priority-tag priority-${task.priority}`;
        priority.textContent = getPriorityLabel(task.priority);

        meta.append(time, priority);
        info.append(name, meta);

        const actions = document.createElement("div");
        actions.className = "task-actions";

        const deleteButton = document.createElement("button");
        deleteButton.type = "button";
        deleteButton.className = "icon-button";
        deleteButton.textContent = "×";
        deleteButton.title = "Delete task";
        deleteButton.setAttribute("aria-label", `Delete ${task.name}`);

        deleteButton.addEventListener("click", () => {
            deleteTask(task.id);
        });

        actions.append(deleteButton);
        row.append(checkbox, info, actions);
        taskList.append(row);
    });

    updateStats();
}

function createSchedule() {
    scheduleList.innerHTML = "";

    const upcomingTasks = sortTasks(
        tasks.filter((task) => !task.completed)
    );

    if (upcomingTasks.length === 0) {
        scheduleList.innerHTML = `
            <div class="empty-state">
                <span class="empty-icon">◷</span>
                <p>Your schedule is empty</p>
                <span>Add a task to plan your day.</span>
            </div>
        `;
        return;
    }

    upcomingTasks.forEach((task) => {
        const item = document.createElement("div");
        item.className = "schedule-item";

        const time = document.createElement("div");
        time.className = "schedule-time";

        const start = document.createElement("div");
        start.textContent = formatTime(task.startTime);

        const end = document.createElement("span");
        end.textContent = `Until ${formatTime(task.endTime)}`;

        time.append(start, end);

        const timeline = document.createElement("div");
        timeline.className = "timeline";

        const dot = document.createElement("span");
        dot.className = "timeline-dot";
        timeline.append(dot);

        const card = document.createElement("div");
        card.className = "schedule-card";

        const name = document.createElement("p");
        name.className = "schedule-name";
        name.textContent = task.name;

        const duration = document.createElement("p");
        duration.className = "schedule-duration";
        duration.textContent = getDuration(task.startTime, task.endTime);

        card.append(name, duration);
        item.append(time, timeline, card);
        scheduleList.append(item);
    });
}

function render() {
    renderTasks();
    createSchedule();
}

function addTask(event) {
    event.preventDefault();

    const name = taskNameInput.value.trim();
    const startTime = startTimeInput.value;
    const endTime = endTimeInput.value;
    const priority = priorityInput.value;

    if (!name) {
        showMessage("Please enter a task name.");
        taskNameInput.focus();
        return;
    }

    if (!startTime || !endTime) {
        showMessage("Please select both a start and end time.");
        return;
    }

    if (timeToMinutes(startTime) >= timeToMinutes(endTime)) {
        showMessage("The end time must be later than the start time.");
        endTimeInput.focus();
        return;
    }

    if (hasTimeConflict(startTime, endTime)) {
        showMessage(
            "This time overlaps with another unfinished task."
        );
        startTimeInput.focus();
        return;
    }

    const task = {
        id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
        name,
        startTime,
        endTime,
        priority,
        completed: false
    };

    tasks.push(task);
    saveTasks();
    render();

    taskForm.reset();
    startTimeInput.value = "09:00";
    endTimeInput.value = "10:00";
    priorityInput.value = "medium";
    taskNameInput.focus();

    showMessage("Task added successfully!", "success");
}

function toggleTask(id) {
    const task = tasks.find((item) => item.id === id);

    if (!task) {
        return;
    }

    task.completed = !task.completed;

    saveTasks();
    render();

    showMessage(
        task.completed
            ? "Great job! Task completed."
            : "Task marked as incomplete.",
        "success"
    );
}

function deleteTask(id) {
    const task = tasks.find((item) => item.id === id);

    if (!task) {
        return;
    }

    tasks = tasks.filter((item) => item.id !== id);

    saveTasks();
    render();

    showMessage("Task deleted.", "success");
}

function displayToday() {
    const today = new Date();

    document.getElementById("today").textContent =
        today.toLocaleDateString("en-US", {
            weekday: "short",
            month: "short",
            day: "numeric",
            year: "numeric"
        });
}

taskForm.addEventListener("submit", addTask);

document.getElementById("refreshSchedule").addEventListener("click", () => {
    createSchedule();
});

displayToday();
render();
