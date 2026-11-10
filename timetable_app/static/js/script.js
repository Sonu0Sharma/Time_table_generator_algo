document.addEventListener('DOMContentLoaded', () => {
    // This file contains the client-side JavaScript for the entire application.

    // --- Globals ---
    // A global variable to store the generated timetable data.
    // This allows the export functions to access the data of the currently viewed option.
    let timetableDataStore = {};

    // --- Element References ---
    // Caching all necessary DOM elements for faster access.
    const authContainer = document.getElementById('auth-container');
    const mainApp = document.getElementById('main-app');
    const timetableForm = document.getElementById('timetable-form');
    const optionSelectionView = document.getElementById('option-selection-view');
    const detailedTimetableView = document.getElementById('detailed-timetable-view');
    const loginForm = document.getElementById('login-form');
    const signupForm = document.getElementById('signup-form');
    const showSignupLink = document.getElementById('show-signup');
    const showLoginLink = document.getElementById('show-login');
    const authMessage = document.getElementById('auth-message');
    const loginButton = document.getElementById('login-button');
    const signupButton = document.getElementById('signup-button');
    const logoutButton = document.getElementById('logout-button');
    const adminNameSpan = document.getElementById('admin-name');

    // --- Auth & State Management ---
    /**
     * Checks localStorage to see if a user is already logged in.
     * Toggles the visibility of the auth screen vs. the main application.
     */
    function checkLoginState() {
        const isLoggedIn = localStorage.getItem('isLoggedIn');
        const adminName = localStorage.getItem('adminName');
        if (isLoggedIn === 'true' && adminName) {
            authContainer.classList.add('hidden');
            mainApp.classList.remove('hidden');
            adminNameSpan.textContent = `Welcome, ${adminName}!`;
        } else {
            authContainer.classList.remove('hidden');
            mainApp.classList.add('hidden');
        }
    }

    /**
     * A universal function to communicate with the backend API.
     * @param {string} endpoint - The API endpoint to call (e.g., '/api/login').
     * @param {object} body - The data to send.
     * @param {boolean} isFormData - Set to true if uploading files.
     * @returns {Promise<object>} - An object containing the success status and data.
     */
    async function apiCall(endpoint, body, isFormData = false) {
        try {
            const options = { method: 'POST', body: isFormData ? body : JSON.stringify(body) };
            if (!isFormData) { options.headers = { 'Content-Type': 'application/json' }; }
            const response = await fetch(endpoint, options);
            // Handle file downloads differently from JSON responses
            if (response.headers.get("content-type")?.includes('application/pdf') || response.headers.get("content-type")?.includes('sheet')) {
                return { ok: response.ok, data: null, response: response };
            }
            return { ok: response.ok, data: await response.json(), response: response };
        } catch (error) {
            return { ok: false, data: { message: 'Network error.' } };
        }
    }
    
    // Event listeners to toggle between the login and signup forms.
    showSignupLink.addEventListener('click', e => { e.preventDefault(); loginForm.classList.add('hidden'); signupForm.classList.remove('hidden'); });
    showLoginLink.addEventListener('click', e => { e.preventDefault(); signupForm.classList.add('hidden'); loginForm.classList.remove('hidden'); });

    // Event listener for the signup button.
    signupButton.addEventListener('click', async () => {
        const name = document.getElementById('signup-name').value;
        const email = document.getElementById('signup-email').value;
        const password = document.getElementById('signup-password').value;
        const result = await apiCall('/api/signup', { name, email, password });
        authMessage.textContent = result.data.message;
        authMessage.className = result.ok ? 'message success' : 'message error';
    });

    // Event listener for the login button.
    loginButton.addEventListener('click', async () => {
        const email = document.getElementById('login-email').value;
        const password = document.getElementById('login-password').value;
        const result = await apiCall('/api/login', { email, password });
        if (result.ok) {
            localStorage.setItem('isLoggedIn', 'true');
            localStorage.setItem('adminName', result.data.name);
            checkLoginState();
        } else {
            authMessage.textContent = result.data.message;
            authMessage.className = 'message error';
        }
    });

    // Event listener for the logout button.
    logoutButton.addEventListener('click', () => {
        localStorage.removeItem('isLoggedIn');
        localStorage.removeItem('adminName');
        window.location.reload();
    });

    // --- Timetable Generation ---
    // Event listener for the main form submission.
    timetableForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        optionSelectionView.innerHTML = '<p><strong>Processing files and generating timetables...</strong></p>';
        detailedTimetableView.classList.add('hidden');
        optionSelectionView.classList.remove('hidden');

        const formData = new FormData();
        formData.append('courses_file', document.getElementById('courses-file').files[0]);
        formData.append('faculty_file', document.getElementById('faculty-file').files[0]);
        formData.append('rooms_file', document.getElementById('rooms-file').files[0]);

        const result = await apiCall('/api/generate', formData, true);
        if (result.ok) {
            timetableDataStore = result.data;
            displayOptionCards(result.data);
        } else {
            optionSelectionView.innerHTML = `<p class="error">Error: ${result.data.message}</p>`;
        }
    });

    /**
     * Displays the three clickable option cards after generation is complete.
     * @param {object} data - The complete timetable data object from the server.
     */
    function displayOptionCards(data) {
        optionSelectionView.innerHTML = '';
        detailedTimetableView.classList.add('hidden');
        optionSelectionView.classList.remove('hidden');

        for (const optionKey in data) {
            const optionCard = document.createElement('div');
            optionCard.className = 'option-card';
            optionCard.textContent = `Option ${optionKey.replace('option', '')}`;
            optionCard.addEventListener('click', () => {
                showDetailedTimetableView(optionKey, data);
            });
            optionSelectionView.appendChild(optionCard);
        }
    }

    /**
     * Renders the full timetable table for a selected option.
     * @param {string} optionKey - The key for the selected option (e.g., 'option1').
     * @param {object} data - The complete timetable data object.
     */
    function showDetailedTimetableView(optionKey, data) {
        optionSelectionView.classList.add('hidden');
        detailedTimetableView.classList.remove('hidden');
        detailedTimetableView.innerHTML = '';

        const header = document.createElement('div');
        header.className = 'detailed-view-header';
        header.innerHTML = `
            <button class="back-btn">← Back to Options</button>
            <div class="export-buttons">
                <button class="export-pdf-btn">Export as PDF</button>
                <button class="export-excel-btn">Export as Excel</button>
            </div>
        `;
        detailedTimetableView.appendChild(header);

        const optionData = data[optionKey];
        const days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];
        const timeSlots = ["09:00 - 10:00", "10:00 - 11:00", "11:00 - 12:00", "12:00 - 13:00", "13:00 - 14:00", "14:00 - 15:00", "15:00 - 16:00", "16:00 - 17:00"];

        for (const branch in optionData) {
            const grid = optionData[branch];
            let branchHTML = `<h4>Branch: ${branch}</h4>`;
            let tableHTML = `<div class="timetable-table-wrapper"><table class="timetable-table"><thead><tr><th>Time</th>`;
            days.forEach(day => tableHTML += `<th>${day}</th>`);
            tableHTML += `</tr></thead><tbody>`;

            timeSlots.forEach(slot => {
                tableHTML += `<tr><td>${slot}</td>`;
                days.forEach(day => {
                    const cellData = grid[day][slot];
                    if (cellData) {
                        if (cellData.subject === 'LUNCH BREAK') {
                            tableHTML += `<td class="lunch">LUNCH</td>`;
                        } else {
                            tableHTML += `<td>
                                <div class="subject">${cellData.subject || ''}</div>
                                <div class="faculty">${cellData.faculty || ''}</div>
                                <div class="room">${cellData.room || ''}</div>
                            </td>`;
                        }
                    } else {
                        tableHTML += `<td></td>`;
                    }
                });
                tableHTML += `</tr>`;
            });
            tableHTML += `</tbody></table></div>`;
            
            const branchContainer = document.createElement('div');
            branchContainer.innerHTML = branchHTML + tableHTML;
            detailedTimetableView.appendChild(branchContainer);
        }
        
        header.querySelector('.back-btn').addEventListener('click', () => displayOptionCards(data));
        header.querySelector('.export-pdf-btn').addEventListener('click', () => exportTimetable(optionKey, 'pdf'));
        header.querySelector('.export-excel-btn').addEventListener('click', () => exportTimetable(optionKey, 'excel'));
    }

    /**
     * Handles the API call to export and triggers the file download.
     * @param {string} optionKey - The key of the timetable to export.
     * @param {string} format - The desired format ('pdf' or 'excel').
     */
    async function exportTimetable(optionKey, format) {
        const timetableToExport = timetableDataStore[optionKey];
        const result = await apiCall('/api/export', { format: format, timetable: timetableToExport });

        if (result.ok && result.response) {
            // This part handles the successful file download
            const blob = await result.response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.style.display = 'none';
            a.href = url;
            a.download = `timetable_${optionKey}.${format === 'excel' ? 'xlsx' : 'pdf'}`;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            a.remove();
        } else {
            // --- IMPROVEMENT: Show specific error from server if available ---
            let errorMessage = 'An unknown error occurred during export.';
            if (result.data && result.data.message) {
                errorMessage = `Export failed: ${result.data.message}`;
            }
            alert(errorMessage);
        }
    }

    /**
     * Sets up listeners for file inputs to show a checkmark on upload.
     * NOTE: This relies on the HTML structure you provided, which differs from my previous suggestion.
     * It looks for a `.input-group` and a `.upload-status` span.
     */
    function setupSimpleUploadStatus() {
        document.querySelectorAll('#timetable-form input[type="file"]').forEach(input => {
            input.addEventListener('change', (event) => {
                const parentGroup = event.target.closest('.input-group');
                if (parentGroup) {
                    const statusSpan = parentGroup.querySelector('.upload-status');
                    if (statusSpan) {
                        if (event.target.files.length > 0) {
                            statusSpan.textContent = '✅';
                        } else {
                            statusSpan.textContent = '';
                        }
                    }
                }
            });
        });
    }

    // --- Initial Load ---
    // Functions called when the page first loads.
    checkLoginState();
    setupSimpleUploadStatus();
});