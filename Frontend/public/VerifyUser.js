document.getElementById('login-form').addEventListener('submit', async function(e) {
  e.preventDefault();

  const username = document.getElementById('user-username').value;
  const password = document.getElementById('user-password').value;

  const response = await fetch('/api/login', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ username, password })
  });

  const result = await response.json();
  if (response.ok) {
    alert('Login successful');
    // Redirect or update UI
  } else {
    alert(result.message);
  }
});
