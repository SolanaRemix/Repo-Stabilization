(function () {
  const role = localStorage.getItem('repoBrainRole') || 'guest';
  const roleSlot = document.getElementById('current-role');
  if (roleSlot) roleSlot.textContent = role;

  const buttons = document.querySelectorAll('[data-role]');
  buttons.forEach((btn) => {
    btn.addEventListener('click', () => {
      const next = btn.getAttribute('data-role');
      try {
        localStorage.setItem('repoBrainRole', next);
      } catch (e) {
        // Ignore storage failures so role selection still navigates.
      }
      window.location.href = next === 'admin' ? '/admin/' : next === 'dev' ? '/dev/' : '/user/';
    });
  });
})();
