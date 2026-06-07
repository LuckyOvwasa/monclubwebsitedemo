const STORAGE_KEY = 'cfm_complaints';
const SESSION_KEY = 'cfm_session';
const ACCESS_CODE = 'cfm2026';

document.addEventListener('DOMContentLoaded', () => {
  initSampleData();
  checkSession();
  setupEventListeners();
});

function setupEventListeners() {
  document.getElementById('complaintForm').addEventListener('submit', handleComplaintSubmit);
  document.getElementById('loginForm').addEventListener('submit', handleLogin);
  document.getElementById('hamburger').addEventListener('click', toggleMobileMenu);
  document.addEventListener('click', (e) => {
    if (!e.target.closest('.dropdown-trigger')) {
      document.querySelectorAll('.dropdown.show').forEach(d => d.classList.remove('show'));
    }
  });
}

function toggleMobileMenu() {
  document.getElementById('navMenu').classList.toggle('active');
}

function toggleDropdown(e, id) {
  e.preventDefault();
  e.stopPropagation();
  const dropdown = document.getElementById(id);
  document.querySelectorAll('.dropdown.show').forEach(d => {
    if (d.id !== id) d.classList.remove('show');
  });
  dropdown.classList.toggle('show');
}

function showPage(page) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.getElementById(`${page}-page`).classList.add('active');
  document.getElementById('navMenu').classList.remove('active');
  document.querySelectorAll('.dropdown.show').forEach(d => d.classList.remove('show'));
  window.scrollTo(0, 0);
}

function handleComplaintSubmit(e) {
  e.preventDefault();
  const form = e.target;
  const name = form.name.value.trim() || 'Anonymous';
  const phone = form.phone.value.trim();
  const location = form.location.value.trim();
  const type = form.type.value;
  const description = form.description.value.trim();
  const priority = form.priority.value;

  const complaint = {
    id: generateTicket(),
    name,
    phone,
    location,
    type,
    description,
    priority,
    status: 'Pending',
    date: new Date().toISOString(),
    feedback: []
  };

  const complaints = getComplaints();
  complaints.unshift(complaint);
  saveComplaints(complaints);

  const msg = document.getElementById('formMessage');
  msg.className = 'form-message success';
  msg.textContent = `Complaint submitted successfully! Your ticket number is: ${complaint.id}. Please keep this for reference.`;
  form.reset();

  setTimeout(() => {
    msg.className = 'form-message';
    msg.textContent = '';
  }, 8000);
}

function handleLogin(e) {
  e.preventDefault();
  const dept = document.getElementById('department').value;
  const password = document.getElementById('password').value;
  const msg = document.getElementById('loginMessage');

  if (password !== ACCESS_CODE) {
    msg.className = 'form-message error';
    msg.textContent = 'Invalid access code. Please try again.';
    return;
  }

  sessionStorage.setItem(SESSION_KEY, dept);
  msg.className = 'form-message';
  loadDashboard(dept);
}

function checkSession() {
  const dept = sessionStorage.getItem(SESSION_KEY);
  if (dept) {
    loadDashboard(dept);
  }
}

function showLogin(dept) {
  showPage('login');
  if (dept) {
    document.getElementById('department').value = dept;
  }
}

function logout() {
  sessionStorage.removeItem(SESSION_KEY);
  showPage('home');
}

function loadDashboard(dept) {
  document.getElementById('currentDept').textContent = dept;
  showPage('dashboard');
  renderComplaints();
}

function renderComplaints() {
  const complaints = getComplaints();
  const statusFilter = document.getElementById('filterStatus').value;
  const typeFilter = document.getElementById('filterType').value;
  const searchTerm = document.getElementById('searchInput').value.toLowerCase();

  let filtered = complaints.filter(c => {
    const matchStatus = statusFilter === 'all' || c.status === statusFilter;
    const matchType = typeFilter === 'all' || c.type === typeFilter;
    const matchSearch = searchTerm === '' ||
      c.id.toLowerCase().includes(searchTerm) ||
      c.name.toLowerCase().includes(searchTerm) ||
      c.location.toLowerCase().includes(searchTerm) ||
      c.description.toLowerCase().includes(searchTerm);
    return matchStatus && matchType && matchSearch;
  });

  updateStats(complaints);
  const container = document.getElementById('complaintsList');

  if (filtered.length === 0) {
    container.innerHTML = '<div class="no-complaints"><p>No complaints found matching your criteria.</p></div>';
    return;
  }

  container.innerHTML = filtered.map(c => `
    <div class="complaint-card" data-id="${c.id}">
      <div class="complaint-header" onclick="toggleComplaint('${c.id}')">
        <div class="ticket-info">
          <h4>${c.id}</h4>
          <div class="ticket-meta">
            <span>${c.location}</span>
            <span>${formatDate(c.date)}</span>
          </div>
        </div>
        <div>
          <span class="badge ${getPriorityBadge(c.priority)}">${c.priority}</span>
          <span class="badge ${getStatusBadge(c.status)}">${c.status}</span>
        </div>
      </div>
      <div class="complaint-body" id="body-${c.id}">
        <div class="complaint-details">
          <p><strong>Name:</strong> ${escapeHtml(c.name)}</p>
          <p><strong>Phone:</strong> ${escapeHtml(c.phone)}</p>
          <p><strong>Category:</strong> ${c.type}</p>
          <p><strong>Priority:</strong> ${c.priority}</p>
          <p><strong>Description:</strong> ${escapeHtml(c.description)}</p>
        </div>
        <div class="feedback-section">
          <h4>Feedback & Responses (${c.feedback.length})</h4>
          <div class="existing-feedback">
            ${c.feedback.map(f => `
              <div class="feedback-item">
                <div class="feedback-meta">
                  <strong>${f.dept}</strong> - ${formatDate(f.date)} | Status: ${f.status}
                </div>
                <p>${escapeHtml(f.message)}</p>
              </div>
            `).join('')}
          </div>
          <div class="feedback-form">
            <select id="status-${c.id}">
              <option value="Pending">Pending</option>
              <option value="In Progress">In Progress</option>
              <option value="Resolved">Resolved</option>
            </select>
            <textarea id="feedback-${c.id}" placeholder="Add your feedback or response..." rows="2"></textarea>
            <button onclick="addFeedback('${c.id}')">Submit</button>
          </div>
        </div>
      </div>
    </div>
  `).join('');
}

function toggleComplaint(id) {
  const body = document.getElementById(`body-${id}`);
  body.classList.toggle('open');
}

function addFeedback(id) {
  const dept = sessionStorage.getItem(SESSION_KEY);
  const status = document.getElementById(`status-${id}`).value;
  const message = document.getElementById(`feedback-${id}`).value.trim();

  if (!message) {
    alert('Please enter feedback text.');
    return;
  }

  const complaints = getComplaints();
  const complaint = complaints.find(c => c.id === id);
  if (!complaint) return;

  complaint.status = status;
  complaint.feedback.push({
    dept,
    message,
    date: new Date().toISOString()
  });

  saveComplaints(complaints);
  renderComplaints();

  const body = document.getElementById(`body-${id}`);
  if (body) body.classList.add('open');
}

function filterComplaints() {
  renderComplaints();
}

function updateStats(complaints) {
  document.getElementById('totalComplaints').textContent = complaints.length;
  document.getElementById('pendingComplaints').textContent = complaints.filter(c => c.status === 'Pending').length;
  document.getElementById('resolvedComplaints').textContent = complaints.filter(c => c.status === 'Resolved').length;
  document.getElementById('urgentComplaints').textContent = complaints.filter(c => c.priority === 'Urgent').length;
}

function getComplaints() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
  } catch {
    return [];
  }
}

function saveComplaints(complaints) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(complaints));
}

function generateTicket() {
  const prefix = 'MCI';
  const date = new Date();
  const timestamp = date.getFullYear().toString().slice(-2) +
    String(date.getMonth() + 1).padStart(2, '0') +
    String(date.getDate()).padStart(2, '0');
  const random = String(Math.floor(Math.random() * 9999)).padStart(4, '0');
  return `${prefix}-${timestamp}-${random}`;
}

function formatDate(iso) {
  const d = new Date(iso);
  return d.toLocaleDateString('en-NG', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

function getStatusBadge(status) {
  const map = {
    'Pending': 'badge-pending',
    'In Progress': 'badge-progress',
    'Resolved': 'badge-resolved'
  };
  return map[status] || 'badge-pending';
}

function getPriorityBadge(priority) {
  const map = {
    'Low': 'badge-low',
    'Medium': 'badge-medium',
    'High': 'badge-high',
    'Urgent': 'badge-urgent'
  };
  return map[priority] || 'badge-medium';
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

function initSampleData() {
  if (getComplaints().length > 0) return;

  const sampleComplaints = [
    {
      id: 'MCI-250601-0001',
      name: 'Amina Ibrahim',
      phone: '08012345678',
      location: 'Bama Camp A',
      type: 'Distribution',
      description: 'I was not included in the last food distribution exercise despite being registered. My family of 5 did not receive any items while others in my block did.',
      priority: 'High',
      status: 'Pending',
      date: '2025-06-01T10:30:00.000Z',
      feedback: []
    },
    {
      id: 'MCI-250602-0002',
      name: 'Anonymous',
      phone: '08098765432',
      location: 'Damasak',
      type: 'Staff Behavior',
      description: 'One of the distribution staff was rude and disrespectful when I asked about the quantity of items I was supposed to receive.',
      priority: 'Medium',
      status: 'In Progress',
      date: '2025-06-02T14:15:00.000Z',
      feedback: [
        {
          dept: 'Protection',
          message: 'We have documented this complaint and will follow up with the distribution team. Thank you for reporting.',
          date: '2025-06-03T09:00:00.000Z'
        }
      ]
    },
    {
      id: 'MCI-250603-0003',
      name: 'Musa Ali',
      phone: '07055551234',
      location: 'Rann Settlement',
      type: 'Quality',
      description: 'The blankets distributed last week are torn and not suitable for the cold weather. We need replacements.',
      priority: 'Low',
      status: 'Resolved',
      date: '2025-06-03T08:00:00.000Z',
      feedback: [
        {
          dept: 'Logistics',
          message: 'Replacement blankets have been dispatched and will arrive within 3 days.',
          date: '2025-06-04T11:00:00.000Z'
        },
        {
          dept: 'Programs',
          message: 'Complaint resolved. New stock has been distributed to affected families.',
          date: '2025-06-07T16:30:00.000Z'
        }
      ]
    },
    {
      id: 'MCI-250605-0004',
      name: 'Fatima Yusuf',
      phone: '09011112222',
      location: 'New Marte',
      type: 'Exclusion',
      description: 'Our entire community was left out of the recent WASH kit distribution. Over 50 households affected. We were told we are not on the list.',
      priority: 'Urgent',
      status: 'Pending',
      date: '2025-06-05T16:45:00.000Z',
      feedback: []
    },
    {
      id: 'MCI-250606-0005',
      name: 'Anonymous',
      phone: '08033334444',
      location: 'Seye',
      type: 'Other',
      description: 'The latrines at the camp are not being cleaned regularly. This is causing bad smell and we are worried about cholera.',
      priority: 'High',
      status: 'Pending',
      date: '2025-06-06T07:20:00.000Z',
      feedback: []
    }
  ];

  saveComplaints(sampleComplaints);
}
