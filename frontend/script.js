
/* =========================================
   AYUSH EMR - PREMIUM FRONTEND JAVASCRIPT
   Demo Mode: Enabled
========================================= */

const API_BASE_URL = "http://127.0.0.1:5000";
const USE_DEMO_DATA = true;

// =========================================
// 1. LOCAL STORAGE AND INITIAL DATA
// =========================================

function loadStorage(key, fallback) {
    try {
        const data = localStorage.getItem(key);
        return data ? JSON.parse(data) : fallback;
    } catch (error) {
        console.error("Storage loading error:", error);
        return fallback;
    }
}

let patients = loadStorage("ayush_patients", null) || [
    {
        id: "P001",
        name: "Rahul Kumar",
        age: 25,
        gender: "male",
        phone: "9876543210"
    },
    {
        id: "P002",
        name: "Aman Singh",
        age: 30,
        gender: "male",
        phone: "9876543211"
    },
    {
        id: "P003",
        name: "Priya Sharma",
        age: 22,
        gender: "female",
        phone: "9876543212"
    }
];

let diagnoses = loadStorage("ayush_diagnoses", []);
let fhirCount = loadStorage("ayush_fhir_count", 0);
let currentFHIR = null;
let editingPatientId = null;

// =========================================
// 2. COMMON ELEMENTS
// =========================================

const patientForm = document.getElementById("patient-form");
const patientFormPanel = document.getElementById("patient-form-panel");
const patientDOB = document.getElementById("patient-dob");
const patientAge = document.getElementById("patient-age");

function saveData() {
    localStorage.setItem("ayush_patients", JSON.stringify(patients));
    localStorage.setItem("ayush_diagnoses", JSON.stringify(diagnoses));
    localStorage.setItem("ayush_fhir_count", JSON.stringify(fhirCount));
}

function escapeHTML(value) {
    return String(value ?? "").replace(/[&<>"']/g, char => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;"
    })[char]);
}

function showToast(message) {
    const toast = document.getElementById("toast");

    if (!toast) return;

    toast.textContent = message;
    toast.classList.add("show");

    setTimeout(() => {
        toast.classList.remove("show");
    }, 2500);
}

// =========================================
// 3. DATE AND AGE CALCULATION
// =========================================

function getTodayLocalDate() {
    const today = new Date();

    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, "0");
    const day = String(today.getDate()).padStart(2, "0");

    return `${year}-${month}-${day}`;
}

function isValidBirthDate(value) {
    if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
        return false;
    }

    const [year, month, day] = value.split("-").map(Number);
    const date = new Date(year, month - 1, day);

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const validDate =
        date.getFullYear() === year &&
        date.getMonth() === month - 1 &&
        date.getDate() === day;

    return validDate && date <= today;
}

function calculateAge(birthDate) {
    if (!isValidBirthDate(birthDate)) return null;

    const [year, month, day] = birthDate.split("-").map(Number);
    const today = new Date();

    let age = today.getFullYear() - year;

    const birthdayNotReached =
        today.getMonth() + 1 < month ||
        (today.getMonth() + 1 === month && today.getDate() < day);

    if (birthdayNotReached) age--;

    return age;
}

if (patientDOB) {
    patientDOB.max = getTodayLocalDate();
}

if (patientDOB && patientAge) {
    patientDOB.addEventListener("input", () => {
        const age = calculateAge(patientDOB.value);
        patientAge.value = age === null ? "" : age;
    });

    patientDOB.addEventListener("change", () => {
        if (patientDOB.value && !isValidBirthDate(patientDOB.value)) {
            patientAge.value = "";
            showToast("Please select a valid date of birth.");
        }
    });
}

// =========================================
// 4. PAGE NAVIGATION
// =========================================

function showPage(pageName) {
    document.querySelectorAll(".page").forEach(page => {
        page.classList.remove("active");
    });

    document.querySelectorAll(".nav-link").forEach(link => {
        link.classList.remove("active");
    });

    const selectedPage = document.getElementById(pageName);

    if (!selectedPage) return;

    selectedPage.classList.add("active");

    const activeLink = document.querySelector(
        `.nav-link[data-page="${pageName}"]`
    );

    if (activeLink) {
        activeLink.classList.add("active");
    }

    if (pageName === "dashboard") {
        updateDashboard();
    }

    if (pageName === "patients") {
        renderPatients();
    }

    if (pageName === "diagnosis") {
        renderDiagnoses();
    }

    if (pageName === "fhir") {
        updateFHIRPatientList();
    }
}

document.querySelectorAll(".nav-link").forEach(link => {
    link.addEventListener("click", event => {
        event.preventDefault();
        showPage(link.dataset.page);
    });
});

document.querySelectorAll("[data-go]").forEach(button => {
    button.addEventListener("click", () => {
        showPage(button.dataset.go);
    });
});

// =========================================
// 5. PATIENT FORM CONTROLS
// =========================================

const openPatientForm = document.getElementById("open-patient-form");
const cancelPatient = document.getElementById("cancel-patient");

const patientSubmitButton = patientForm
    ? patientForm.querySelector(
        'button[type="submit"], button:not([type]), input[type="submit"]'
    )
    : null;

const originalSubmitLabel = patientSubmitButton
    ? patientSubmitButton.textContent.trim() || patientSubmitButton.value
    : "Register Patient";

function setPatientButtonLabel(label) {
    if (!patientSubmitButton) return;

    if (patientSubmitButton.tagName === "INPUT") {
        patientSubmitButton.value = label;
    } else {
        patientSubmitButton.textContent = label;
    }
}

function resetPatientForm() {
    if (patientForm) {
        patientForm.reset();
    }

    if (patientAge) {
        patientAge.value = "";
    }

    editingPatientId = null;

    setPatientButtonLabel(originalSubmitLabel);

    if (patientFormPanel) {
        patientFormPanel.classList.add("hidden");
    }
}

if (openPatientForm) {
    openPatientForm.addEventListener("click", () => {
        if (!editingPatientId) {
            resetPatientForm();

            if (patientFormPanel) {
                patientFormPanel.classList.remove("hidden");
            }
        }

        const nameInput = document.getElementById("patient-name");

        if (nameInput) nameInput.focus();
    });
}

if (cancelPatient) {
    cancelPatient.addEventListener("click", () => {
        resetPatientForm();
        showToast("Patient form cancelled.");
    });
}

// =========================================
// 6. PATIENT REGISTRATION AND UPDATE
// =========================================

if (patientForm) {
    patientForm.addEventListener("submit", event => {
        event.preventDefault();

        const nameInput = document.getElementById("patient-name");
        const genderInput = document.getElementById("patient-gender");
        const phoneInput = document.getElementById("patient-phone");

        if (!nameInput || !genderInput || !phoneInput) return;

        const name = nameInput.value.trim();
        const dob = patientDOB ? patientDOB.value : "";
        const gender = genderInput.value;
        const phone = phoneInput.value.trim();

        const age = dob ? calculateAge(dob) : null;

        if (!name || !gender) {
            showToast("Please enter patient name and gender.");
            return;
        }

        if (dob && !isValidBirthDate(dob)) {
            showToast("Please enter a valid date of birth.");
            return;
        }

        try {
            if (!USE_DEMO_DATA) {
                throw new Error("Backend API is not configured yet.");
            }

            // UPDATE EXISTING PATIENT
            if (editingPatientId) {
                const patientIndex = patients.findIndex(
                    patient => patient.id === editingPatientId
                );

                if (patientIndex === -1) {
                    showToast("Patient not found.");
                    return;
                }

                const oldPatient = patients[patientIndex];

                patients[patientIndex] = {
                    ...oldPatient,
                    name,
                    age: age === null ? oldPatient.age : age,
                    gender,
                    phone,
                    birthDate: dob || oldPatient.birthDate || null,
                    updatedAt: new Date().toISOString()
                };

                saveData();
                resetPatientForm();
                updateDashboard();
                updateFHIRPatientList();

                showToast("Patient updated successfully!");
                return;
            }

            // REGISTER NEW PATIENT
            const patient = {
                id: "P" + Date.now().toString().slice(-8),
                name,
                age: age === null ? "" : age,
                gender,
                phone,
                birthDate: dob || null,
                registeredAt: new Date().toISOString()
            };

            patients.push(patient);

            saveData();
            resetPatientForm();
            updateDashboard();
            updateFHIRPatientList();

            showToast("Patient registered successfully!");

        } catch (error) {
            console.error("Patient registration error:", error);
            showToast("Unable to save patient.");
        }
    });
}

// =========================================
// 7. PATIENT TABLE AND SEARCH
// =========================================

function renderPatients(filter = "") {
    const tableBody = document.getElementById("patient-table-body");

    if (!tableBody) return;

    const search = String(filter).toLowerCase().trim();

    const filteredPatients = patients.filter(patient => {
        return (
            String(patient.id).toLowerCase().includes(search) ||
            String(patient.name).toLowerCase().includes(search) ||
            String(patient.phone || "").toLowerCase().includes(search)
        );
    });

    if (filteredPatients.length === 0) {
        tableBody.innerHTML = `
            <tr>
                <td colspan="6" class="empty-row">No patients found.</td>
            </tr>
        `;
        return;
    }

    tableBody.innerHTML = filteredPatients.map(patient => `
        <tr>
            <td>${escapeHTML(patient.id)}</td>
            <td>${escapeHTML(patient.name)}</td>
            <td>
                ${patient.age === "" || patient.age == null
                    ? "-"
                    : escapeHTML(patient.age)}
            </td>
            <td>${escapeHTML(patient.gender)}</td>
            <td>${escapeHTML(patient.phone || "-")}</td>
            <td>
                <div class="patient-action-buttons">

                    <button class="primary-btn view-patient-btn"
                        data-id="${escapeHTML(patient.id)}">
                        View
                    </button>

                    <button class="secondary-btn view-fhir-btn"
                        data-id="${escapeHTML(patient.id)}">
                        View FHIR
                    </button>

                    <button class="secondary-btn edit-patient-btn"
                        data-id="${escapeHTML(patient.id)}">
                        Edit
                    </button>

                    <button class="delete-patient-btn"
                        data-id="${escapeHTML(patient.id)}">
                        Delete
                    </button>

                </div>
            </td>
        </tr>
    `).join("");
}

// =========================================
// 7A. PATIENT DETAILS POPUP
// =========================================

function formatPatientDate(value) {
    if (!value) return "Not available";

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
        return "Not available";
    }

    return date.toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric"
    });
}

function formatPatientDateTime(value) {
    if (!value) return "Not available";

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
        return "Not available";
    }

    return date.toLocaleString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit"
    });
}

function createPatientModal() {
    if (document.getElementById("patient-details-modal")) return;

    const style = document.createElement("style");

    style.id = "patient-details-modal-style";

    style.textContent = `
        .patient-modal-overlay {
            position: fixed;
            inset: 0;
            z-index: 9999;
            background: rgba(15, 23, 42, 0.65);
            backdrop-filter: blur(5px);
            display: flex;
            justify-content: center;
            align-items: center;
            padding: 20px;
        }

        .patient-modal-overlay.hidden {
            display: none;
        }

        .patient-modal-card {
            width: 100%;
            max-width: 650px;
            max-height: 90vh;
            overflow-y: auto;
            background: #ffffff;
            border-radius: 18px;
            box-shadow: 0 25px 70px rgba(0,0,0,0.25);
            animation: patientModalOpen 0.25s ease;
        }

        @keyframes patientModalOpen {
            from {
                opacity: 0;
                transform: translateY(15px) scale(0.98);
            }
            to {
                opacity: 1;
                transform: translateY(0) scale(1);
            }
        }

        .patient-modal-header {
            padding: 22px 25px;
            background: linear-gradient(135deg, #0f766e, #2563eb);
            color: white;
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 15px;
            border-radius: 18px 18px 0 0;
        }

        .patient-modal-brand {
            font-size: 19px;
            font-weight: 700;
        }

        .patient-modal-subtitle {
            font-size: 12px;
            margin-top: 5px;
            opacity: 0.85;
        }

        .patient-modal-close {
            border: none;
            background: rgba(255,255,255,0.2);
            color: white;
            width: 36px;
            height: 36px;
            border-radius: 50%;
            font-size: 23px;
            cursor: pointer;
        }

        .patient-modal-close:hover {
            background: rgba(255,255,255,0.35);
        }

        .patient-modal-body {
            padding: 25px;
        }

        .patient-profile {
            display: flex;
            align-items: center;
            gap: 16px;
            padding-bottom: 22px;
            border-bottom: 1px solid #e2e8f0;
            margin-bottom: 22px;
        }

        .patient-profile-avatar {
            width: 65px;
            height: 65px;
            border-radius: 18px;
            background: #ccfbf1;
            color: #0f766e;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 26px;
            font-weight: 700;
            flex-shrink: 0;
        }

        .patient-profile h3 {
            margin: 0 0 6px;
            color: #0f172a;
            font-size: 21px;
        }

        .patient-profile p {
            margin: 0;
            color: #64748b;
            font-size: 13px;
        }

        .patient-details-grid {
            display: grid;
            grid-template-columns: repeat(2, minmax(0, 1fr));
            gap: 14px;
        }

        .patient-detail-item {
            padding: 15px;
            background: #f8fafc;
            border: 1px solid #e2e8f0;
            border-radius: 12px;
            min-width: 0;
        }

        .patient-detail-label {
            display: block;
            color: #64748b;
            font-size: 12px;
            margin-bottom: 7px;
        }

        .patient-detail-value {
            display: block;
            color: #0f172a;
            font-size: 14px;
            font-weight: 600;
            overflow-wrap: anywhere;
        }

        .patient-modal-footer {
            padding: 18px 25px;
            border-top: 1px solid #e2e8f0;
            display: flex;
            justify-content: flex-end;
        }

        .patient-modal-done {
            border: none;
            background: #0f766e;
            color: white;
            padding: 11px 25px;
            border-radius: 9px;
            cursor: pointer;
            font-weight: 600;
        }

        .patient-modal-done:hover {
            background: #115e59;
        }

        @media (max-width: 520px) {
            .patient-details-grid {
                grid-template-columns: 1fr;
            }

            .patient-modal-body {
                padding: 18px;
            }

            .patient-modal-header {
                padding: 18px;
            }

            .patient-profile h3 {
                font-size: 18px;
            }
        }
    `;

    document.head.appendChild(style);

    const modal = document.createElement("div");

    modal.id = "patient-details-modal";
    modal.className = "patient-modal-overlay hidden";

    modal.innerHTML = `
        <div class="patient-modal-card" role="dialog"
            aria-modal="true" aria-labelledby="patient-modal-name">

            <div class="patient-modal-header">
                <div>
                    <div class="patient-modal-brand">🏥 AYUSH EMR</div>
                    <div class="patient-modal-subtitle">
                        Electronic Medical Records
                    </div>
                </div>

                <button type="button"
                    class="patient-modal-close"
                    id="close-patient-modal"
                    aria-label="Close">
                    &times;
                </button>
            </div>

            <div class="patient-modal-body">

                <div class="patient-profile">
                    <div class="patient-profile-avatar" id="patient-modal-avatar">
                        P
                    </div>

                    <div>
                        <h3 id="patient-modal-name">Patient Name</h3>
                        <p id="patient-modal-id">Patient ID</p>
                    </div>
                </div>

                <div class="patient-details-grid">

                    <div class="patient-detail-item">
                        <span class="patient-detail-label">Age</span>
                        <span class="patient-detail-value" id="modal-patient-age">-</span>
                    </div>

                    <div class="patient-detail-item">
                        <span class="patient-detail-label">Gender</span>
                        <span class="patient-detail-value" id="modal-patient-gender">-</span>
                    </div>

                    <div class="patient-detail-item">
                        <span class="patient-detail-label">Date of Birth</span>
                        <span class="patient-detail-value" id="modal-patient-dob">-</span>
                    </div>

                    <div class="patient-detail-item">
                        <span class="patient-detail-label">Phone Number</span>
                        <span class="patient-detail-value" id="modal-patient-phone">-</span>
                    </div>

                    <div class="patient-detail-item">
                        <span class="patient-detail-label">Registration Date</span>
                        <span class="patient-detail-value" id="modal-patient-registered">-</span>
                    </div>

                    <div class="patient-detail-item">
                        <span class="patient-detail-label">Last Updated</span>
                        <span class="patient-detail-value" id="modal-patient-updated">-</span>
                    </div>

                </div>
            </div>

            <div class="patient-modal-footer">
                <button type="button"
                    class="patient-modal-done"
                    id="patient-modal-done">
                    Close Details
                </button>
            </div>

        </div>
    `;

    document.body.appendChild(modal);

    const closeButton = document.getElementById("close-patient-modal");
    const doneButton = document.getElementById("patient-modal-done");

    function closeModal() {
        modal.classList.add("hidden");
    }

    closeButton.addEventListener("click", closeModal);
    doneButton.addEventListener("click", closeModal);

    modal.addEventListener("click", event => {
        if (event.target === modal) {
            closeModal();
        }
    });

    document.addEventListener("keydown", event => {
        if (event.key === "Escape" && !modal.classList.contains("hidden")) {
            closeModal();
        }
    });
}

function viewPatientDetails(patientId) {
    const patient = patients.find(item => item.id === patientId);

    if (!patient) {
        showToast("Patient not found.");
        return;
    }

    createPatientModal();

    const modal = document.getElementById("patient-details-modal");

    const birthDate = patient.birthDate || patient.dob || null;

    const ageText =
        patient.age === "" || patient.age == null
            ? "Not available"
            : `${patient.age} years`;

    const genderText = patient.gender
        ? patient.gender.charAt(0).toUpperCase() + patient.gender.slice(1)
        : "Not available";

    document.getElementById("patient-modal-avatar").textContent =
        patient.name ? patient.name.charAt(0).toUpperCase() : "P";

    document.getElementById("patient-modal-name").textContent =
        patient.name || "Unknown Patient";

    document.getElementById("patient-modal-id").textContent =
        `Patient ID: ${patient.id}`;

    document.getElementById("modal-patient-age").textContent = ageText;

    document.getElementById("modal-patient-gender").textContent =
        genderText;

    document.getElementById("modal-patient-dob").textContent =
        formatPatientDate(birthDate);

    document.getElementById("modal-patient-phone").textContent =
        patient.phone || "Not available";

    document.getElementById("modal-patient-registered").textContent =
        formatPatientDateTime(patient.registeredAt);

    document.getElementById("modal-patient-updated").textContent =
        formatPatientDateTime(patient.updatedAt);

    modal.classList.remove("hidden");
}

// PATIENT SEARCH

const patientFilter = document.getElementById("patient-filter");

if (patientFilter) {
    patientFilter.addEventListener("input", () => {
        renderPatients(patientFilter.value);
    });
}

// =========================================
// 8. EDIT PATIENT
// =========================================

function editPatient(patientId) {
    const patient = patients.find(item => item.id === patientId);

    if (!patient) {
        showToast("Patient not found.");
        return;
    }

    if (!patientForm) {
        showToast("Patient form is unavailable.");
        return;
    }

    editingPatientId = patient.id;

    const nameInput = document.getElementById("patient-name");
    const genderInput = document.getElementById("patient-gender");
    const phoneInput = document.getElementById("patient-phone");

    if (nameInput) nameInput.value = patient.name || "";
    if (genderInput) genderInput.value = patient.gender || "";
    if (phoneInput) phoneInput.value = patient.phone || "";

    if (patientDOB) {
        patientDOB.value = patient.birthDate || patient.dob || "";
    }

    if (patientAge) {
        patientAge.value = patient.age ?? "";
    }

    setPatientButtonLabel("Update Patient");

    if (patientFormPanel) {
        patientFormPanel.classList.remove("hidden");
    }

    showPage("patients");

    if (patientFormPanel) {
        patientFormPanel.scrollIntoView({
            behavior: "smooth",
            block: "start"
        });
    }

    if (nameInput) nameInput.focus();

    showToast("Edit patient details and click Update Patient.");
}

// =========================================
// 9. DELETE PATIENT
// =========================================

function deletePatient(patientId) {
    const patient = patients.find(item => item.id === patientId);

    if (!patient) {
        showToast("Patient not found.");
        return;
    }

    const confirmed = confirm(
        `Are you sure you want to delete ${patient.name} (${patient.id})?\n\nRelated demo diagnosis records will also be deleted.`
    );

    if (!confirmed) return;

    patients = patients.filter(item => item.id !== patientId);

    diagnoses = diagnoses.filter(
        item => item.patientId !== patientId
    );

    if (currentFHIR && currentFHIR.id === patientId) {
        currentFHIR = null;

        const output = document.getElementById("fhir-output");
        const select = document.getElementById("fhir-patient");

        if (output) {
            output.textContent = "Select a patient to generate FHIR JSON.";
        }

        if (select) {
            select.value = "";
        }
    }

    if (editingPatientId === patientId) {
        resetPatientForm();
    }

    saveData();
    updateDashboard();
    updateFHIRPatientList();

    showToast("Patient deleted successfully.");
}

// =========================================
// 10. PATIENT TABLE BUTTON EVENTS
// =========================================

const patientTableBody = document.getElementById("patient-table-body");

if (patientTableBody) {
    patientTableBody.addEventListener("click", event => {

        const button = event.target.closest("button");

        if (!button) return;

        const patientId = button.dataset.id;

        if (button.classList.contains("view-patient-btn")) {
            viewPatientDetails(patientId);
        }

        if (button.classList.contains("view-fhir-btn")) {
            showPage("fhir");

            const fhirSelect = document.getElementById("fhir-patient");

            if (fhirSelect) {
                fhirSelect.value = patientId;
                generateFHIRResource();
            }
        }

        if (button.classList.contains("edit-patient-btn")) {
            editPatient(patientId);
        }

        if (button.classList.contains("delete-patient-btn")) {
            deletePatient(patientId);
        }
    });
}

// =========================================
// 11. RECENT PATIENTS
// =========================================

function renderRecentPatients() {
    const recentBody = document.getElementById("recent-patients");

    if (!recentBody) return;

    const recent = [...patients].slice(-5).reverse();

    if (recent.length === 0) {
        recentBody.innerHTML = `
            <tr>
                <td colspan="4" class="empty-row">
                    No patients registered.
                </td>
            </tr>
        `;
        return;
    }

    recentBody.innerHTML = recent.map(patient => `
        <tr>
            <td>${escapeHTML(patient.id)}</td>
            <td>${escapeHTML(patient.name)}</td>
            <td>
                ${patient.age === "" || patient.age == null
                    ? "-"
                    : escapeHTML(patient.age)}
            </td>
            <td>${escapeHTML(patient.gender)}</td>
        </tr>
    `).join("");
}

// =========================================
// 12. PATIENT STATISTICS CHART
// =========================================

function renderPatientChart() {
    const canvas = document.getElementById("patient-chart");

    if (!canvas) return;

    const context = canvas.getContext("2d");
    if (!context) return;

    const width = Math.max(canvas.clientWidth, 250);
    const height = 260;

    const pixelRatio = window.devicePixelRatio || 1;

    canvas.width = width * pixelRatio;
    canvas.height = height * pixelRatio;

    context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
    context.clearRect(0, 0, width, height);

    const categories = [
        { label: "Male", color: "#3b82f6" },
        { label: "Female", color: "#a855f7" },
        { label: "Other", color: "#10b981" },
        { label: "Unknown", color: "#f59e0b" }
    ];

    const counts = categories.map(category =>
        patients.filter(patient =>
            String(patient.gender || "").toLowerCase() ===
            category.label.toLowerCase()
        ).length
    );

    const maxValue = Math.max(...counts, 1);

    const left = 85;
    const right = 20;
    const top = 20;
    const barHeight = 23;
    const gap = 34;

    context.font = "13px Segoe UI";
    context.textBaseline = "middle";

    categories.forEach((category, index) => {
        const y = top + index * (barHeight + gap);
        const availableWidth = width - left - right;
        const barWidth = (counts[index] / maxValue) * availableWidth;

        context.fillStyle = "#475569";
        context.textAlign = "left";
        context.fillText(category.label, 5, y + barHeight / 2);

        context.fillStyle = "#e2e8f0";
        context.fillRect(left, y, availableWidth, barHeight);

        context.fillStyle = category.color;
        context.fillRect(left, y, barWidth, barHeight);

        context.fillStyle = "#1e293b";
        context.textAlign = "left";
        context.fillText(
            String(counts[index]),
            Math.min(left + barWidth + 8, width - 15),
            y + barHeight / 2
        );
    });
}

// =========================================
// 13. RECENT ACTIVITY
// =========================================

function renderRecentActivity() {
    const activityBox = document.getElementById("recent-activity");

    if (!activityBox) return;

    const activities = [];

    patients.forEach(patient => {
        activities.push({
            type: "patient",
            title: "Patient registered",
            description: `${patient.name} (${patient.id})`,
            date: patient.updatedAt || patient.registeredAt || null,
            fallbackDate: patient.birthDate || null
        });
    });

    diagnoses.forEach(diagnosis => {
        activities.push({
            type: "diagnosis",
            title: "Diagnosis recorded",
            description: `${diagnosis.diagnosis} - ${diagnosis.patientId}`,
            date: diagnosis.createdAt || null,
            fallbackDate: diagnosis.date || null
        });
    });

    activities.sort((a, b) => {
        const dateA = a.date ? new Date(a.date).getTime() : 0;
        const dateB = b.date ? new Date(b.date).getTime() : 0;
        return dateB - dateA;
    });

    const recentActivities = activities.slice(0, 6);

    if (recentActivities.length === 0) {
        activityBox.innerHTML = `
            <p class="activity-empty">No recent activity available.</p>
        `;
        return;
    }

    activityBox.innerHTML = recentActivities.map(activity => {
        const icon = activity.type === "patient" ? "👤" : "🩺";

        let dateText = "Previously recorded";

        if (activity.date) {
            dateText = new Date(activity.date).toLocaleString("en-IN", {
                day: "2-digit",
                month: "short",
                year: "numeric",
                hour: "2-digit",
                minute: "2-digit"
            });
        } else if (activity.fallbackDate) {
            dateText = activity.fallbackDate;
        }

        return `
            <div class="activity-item">
                <div class="activity-icon">${icon}</div>

                <div class="activity-details">
                    <h4>${escapeHTML(activity.title)}</h4>
                    <p>${escapeHTML(activity.description)}</p>
                    <small>${escapeHTML(dateText)}</small>
                </div>
            </div>
        `;
    }).join("");
}

// =========================================
// 14. DIAGNOSIS SEARCH - DEMO MODE
// =========================================

const demoDiagnoses = [
    {
        name: "Diabetes",
        description: "Demo search suggestion for diabetes-related terminology."
    },
    {
        name: "Fever",
        description: "Demo search suggestion for fever-related terminology."
    },
    {
        name: "Headache",
        description: "Demo search suggestion for headache-related terminology."
    },
    {
        name: "Cough",
        description: "Demo search suggestion for cough-related terminology."
    },
    {
        name: "Joint Pain",
        description: "Demo search suggestion for joint-pain-related terminology."
    },
    {
        name: "Hypertension",
        description: "Demo search suggestion for blood-pressure-related terminology."
    }
];

const diagnosisForm = document.getElementById("diagnosis-form");

if (diagnosisForm) {
    diagnosisForm.addEventListener("submit", event => {
        event.preventDefault();

        const query = document.getElementById("diagnosis-query")
            .value.trim().toLowerCase();

        const system = document.getElementById("coding-system").value;

        searchDiagnosis(query, system);
    });
}

function searchDiagnosis(query, system) {
    const resultsBox = document.getElementById("diagnosis-results");
    const message = document.getElementById("diagnosis-message");

    if (!resultsBox || !message) return;

    resultsBox.innerHTML = "";

    if (!query) {
        message.textContent = "Please enter a diagnosis name.";
        return;
    }

    const matches = demoDiagnoses.filter(item =>
        item.name.toLowerCase().includes(query) ||
        item.description.toLowerCase().includes(query)
    );

    message.textContent =
        "Demo mode: These suggestions are illustrative, not official terminology results.";

    const results = matches.length > 0
        ? matches
        : [{
            name: query.charAt(0).toUpperCase() + query.slice(1),
            description: "Illustrative demo result. Verify terminology using the official terminology service."
        }];

    resultsBox.innerHTML = results.map(item => `
        <div class="result-card">
            <h4>${escapeHTML(item.name)}</h4>
            <p>${escapeHTML(item.description)}</p>
            <p><strong>System:</strong> ${escapeHTML(system.toUpperCase())}</p>
            <p><strong>Code:</strong> Not assigned in demo mode</p>

            <button class="primary-btn save-diagnosis-btn"
                data-name="${escapeHTML(item.name)}"
                data-system="${escapeHTML(system)}">
                Record Diagnosis
            </button>
        </div>
    `).join("");
}

// =========================================
// 15. RECORD DIAGNOSIS
// =========================================

const diagnosisResults = document.getElementById("diagnosis-results");

if (diagnosisResults) {
    diagnosisResults.addEventListener("click", event => {
        const button = event.target.closest(".save-diagnosis-btn");

        if (!button) return;

        if (patients.length === 0) {
            showToast("Register a patient first.");
            return;
        }

        const patientList = patients
            .map(patient => `${patient.id} - ${patient.name}`)
            .join("\n");

        const patientId = prompt(
            "Enter Patient ID for this diagnosis:\n\n" + patientList
        );

        if (patientId === null) return;

        const patient = patients.find(item =>
            item.id.toLowerCase() === patientId.trim().toLowerCase()
        );

        if (!patient) {
            showToast("Patient ID not found.");
            return;
        }

        diagnoses.push({
            id: "D" + Date.now(),
            patientId: patient.id,
            diagnosis: button.dataset.name,
            code: "Not assigned",
            system: button.dataset.system.toUpperCase(),
            date: getTodayLocalDate(),
            createdAt: new Date().toISOString()
        });

        saveData();
        renderDiagnoses();
        updateDashboard();

        showToast("Demo diagnosis recorded successfully.");
    });
}

// =========================================
// 16. DIAGNOSIS TABLE
// =========================================

function renderDiagnoses() {
    const tableBody = document.getElementById("diagnosis-table-body");

    if (!tableBody) return;

    if (diagnoses.length === 0) {
        tableBody.innerHTML = `
            <tr>
                <td colspan="4" class="empty-row">
                    No diagnosis records found.
                </td>
            </tr>
        `;
        return;
    }

    tableBody.innerHTML = [...diagnoses].reverse().map(item => `
        <tr>
            <td>${escapeHTML(item.patientId)}</td>
            <td>${escapeHTML(item.diagnosis)}</td>
            <td>${escapeHTML(item.code || "Not assigned")}</td>
            <td>${escapeHTML(item.system)}</td>
        </tr>
    `).join("");
}

// =========================================
// 17. FHIR PATIENT LIST
// =========================================

function updateFHIRPatientList() {
    const select = document.getElementById("fhir-patient");

    if (!select) return;

    const selectedValue = select.value;

    select.innerHTML = `
        <option value="">Select Patient</option>
        ${patients.map(patient => `
            <option value="${escapeHTML(patient.id)}">
                ${escapeHTML(patient.name)} (${escapeHTML(patient.id)})
            </option>
        `).join("")}
    `;

    if (patients.some(patient => patient.id === selectedValue)) {
        select.value = selectedValue;
    }
}

// =========================================
// 18. GENERATE FHIR PATIENT RESOURCE
// =========================================

function generateFHIRResource() {
    const select = document.getElementById("fhir-patient");
    const output = document.getElementById("fhir-output");

    if (!select || !output) return;

    const patient = patients.find(item => item.id === select.value);

    if (!patient) {
        currentFHIR = null;
        output.textContent = "Please select a valid patient.";
        showToast("Please select a patient.");
        return;
    }

    const birthDate = patient.birthDate || patient.dob || null;

    currentFHIR = {
        resourceType: "Patient",
        id: patient.id,

        identifier: [
            {
                system: "https://example.org/patient-id",
                value: patient.id
            }
        ],

        name: [
            {
                text: patient.name
            }
        ],

        gender: patient.gender,

        telecom: patient.phone
            ? [{
                system: "phone",
                value: patient.phone
            }]
            : []
    };

    if (isValidBirthDate(birthDate)) {
        currentFHIR.birthDate = birthDate;
    }

    output.textContent = JSON.stringify(currentFHIR, null, 4);

    fhirCount++;
    saveData();
    updateDashboard();

    showToast("FHIR Patient JSON generated.");
}

const generateFHIRButton = document.getElementById("generate-fhir");

if (generateFHIRButton) {
    generateFHIRButton.addEventListener("click", generateFHIRResource);
}

// =========================================
// 19. DOWNLOAD FHIR JSON
// =========================================

const downloadFHIRButton = document.getElementById("download-fhir");

if (downloadFHIRButton) {
    downloadFHIRButton.addEventListener("click", () => {
        if (!currentFHIR) {
            showToast("Generate FHIR JSON first.");
            return;
        }

        const jsonData = JSON.stringify(currentFHIR, null, 4);

        const blob = new Blob([jsonData], {
            type: "application/json"
        });

        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");

        link.href = url;
        link.download = `FHIR-${currentFHIR.id}.json`;

        document.body.appendChild(link);
        link.click();
        link.remove();

        URL.revokeObjectURL(url);

        showToast("FHIR JSON downloaded.");
    });
}

// =========================================
// 20. DASHBOARD UPDATE
// =========================================

function updateDashboard() {
    const totalPatients = document.getElementById("total-patients");
    const totalDiagnoses = document.getElementById("total-diagnoses");
    const totalFHIR = document.getElementById("total-fhir");

    if (totalPatients) {
        totalPatients.textContent = patients.length;
    }

    if (totalDiagnoses) {
        totalDiagnoses.textContent = diagnoses.length;
    }

    if (totalFHIR) {
        totalFHIR.textContent = fhirCount;
    }

    renderRecentPatients();
    renderPatientChart();
    renderRecentActivity();
    renderPatients();
    renderDiagnoses();
    updateFHIRPatientList();
}

// =========================================
// 21. CURRENT DATE
// =========================================

function displayCurrentDate() {
    const dateElement = document.getElementById("current-date");

    if (!dateElement) return;

    dateElement.textContent = new Date().toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric"
    });
}

// =========================================
// 22. CHART RESPONSIVE UPDATE
// =========================================

window.addEventListener("resize", () => {
    const dashboard = document.getElementById("dashboard");

    if (dashboard && dashboard.classList.contains("active")) {
        renderPatientChart();
    }
});

// =========================================
// 23. INITIALIZE APPLICATION
// =========================================

document.addEventListener("DOMContentLoaded", () => {
    displayCurrentDate();

    updateDashboard();
    showPage("dashboard");

    console.log("AYUSH EMR initialized successfully.");
    console.log("Demo mode:", USE_DEMO_DATA);
});
