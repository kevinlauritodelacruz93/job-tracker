// Load jobs from the backend
async function loadJobs() {
  const res = await fetch('/jobs', { credentials: 'include' });
  let jobs = await res.json();

  // If backend returned an error (not logged in), show login form again
  if (jobs.error === "Not logged in") {
    document.getElementById('loginForm').style.display = 'block';
    document.getElementById('jobForm').style.display = 'none';
    document.getElementById('jobList').innerHTML = "";
    return;
  }

  // Sort jobs: Offer first, then Interview, then Applied, then Rejected
  jobs.sort((a, b) => {
    const order = { "Offer": 1, "Interview": 2, "Applied": 3, "Rejected": 4 };
    return order[a.status] - order[b.status];
  });

  document.getElementById('jobList').innerHTML = jobs.map(job => {
    const isRejected = job.status === 'Rejected';
    const isOffer = job.status === 'Offer';
    const isInterview = job.status === 'Interview';

    let statusClass = "";
    if (isRejected) statusClass = "rejected";
    if (isOffer) statusClass = "offer";
    if (isInterview) statusClass = "interview";

    return `
      <li class="list-group-item d-flex justify-content-between align-items-center">
        <span class="${statusClass}">
          ${job.company} - ${job.role} [${job.status}]
        </span>
        <div>
          ${isRejected 
            ? `<button class="btn btn-sm btn-danger" disabled>Rejected</button>` 
            : isOffer 
              ? `<button class="btn btn-sm btn-success" disabled>Offer</button>` 
              : `
                <button class="btn btn-sm btn-info" onclick="updateStatus(${job.id}, 'Interview')">Interview</button>
                <button class="btn btn-sm btn-success" onclick="updateStatus(${job.id}, 'Offer')">Offer</button>
                <button class="btn btn-sm btn-danger" onclick="updateStatus(${job.id}, 'Rejected')">Rejected</button>
              `}
          <button class="btn btn-sm btn-outline-danger" onclick="deleteJob(${job.id})">Remove</button>
        </div>
      </li>`;
  }).join('');
}

// Handle login
document.getElementById('loginForm').addEventListener('submit', async e => {
  e.preventDefault();
  const email = document.getElementById('email').value;

  const res = await fetch('/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' }, // important
    body: JSON.stringify({ email }),                // send JSON
    credentials: 'include'
  });

  const data = await res.json();
  if (data.success) {
    document.getElementById('jobForm').style.display = 'block';
    document.getElementById('loginForm').style.display = 'none';
    loadJobs();
  }
});


// Handle form submission
document.getElementById('jobForm').addEventListener('submit', async e => {
  e.preventDefault();
  const company = document.getElementById('company').value;
  const role = document.getElementById('role').value;
  const status = document.getElementById('status').value;

  await fetch('/jobs', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ company, role, status }),
    credentials: 'include'
  });

  document.getElementById('jobForm').reset(); // Clear form
  loadJobs();
});

// Update job status
async function updateStatus(id, status) {
  await fetch(`/jobs/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ status }),
    credentials: 'include'
  });
  loadJobs();
}

async function deleteJob(id) {
  if (!confirm("Are you sure you want to delete this job?")) return;

  try {
    const res = await fetch(`/jobs/${id}`, {
      method: 'DELETE',
      credentials: 'include'
    });

    const data = await res.json();
    if (data.deleted > 0) {
      console.log(`Job ${id} deleted`);
      // Wait a moment before reloading jobs to avoid overlap
      setTimeout(() => loadJobs(), 200);
    } else {
      console.error(`Failed to delete job ${id}`, data);
    }
  } catch (err) {
    console.error("Delete error:", err);
  }
}
