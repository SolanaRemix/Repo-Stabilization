(function () {
  const getStoredRole = () => {
    try {
      return window.localStorage.getItem('repoBrainRole') || 'guest';
    } catch (e) {
      return 'guest';
    }
  };

  const role = getStoredRole();
  const roleSlot = document.getElementById('current-role');
  if (roleSlot) roleSlot.textContent = role;

  const buttons = document.querySelectorAll('[data-role]');
  buttons.forEach((btn) => {
    btn.addEventListener('click', () => {
      const next = btn.getAttribute('data-role');
      try {
        window.localStorage.setItem('repoBrainRole', next);
      } catch (e) {
        // Ignore storage failures so role selection still navigates.
      }
      window.location.href = next === 'admin' ? '/admin/' : next === 'dev' ? '/dev/' : '/user/';
    });
  });
})();
