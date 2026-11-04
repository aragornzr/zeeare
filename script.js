const menuToggle = document.querySelector('.menu-toggle');
const navigation = document.querySelector('#navigation');
const dialog = document.querySelector('#coming-dialog');

function closeMenu() {
  closeJourneyMenu();
  navigation.classList.remove('open');
  menuToggle.setAttribute('aria-expanded', 'false');
  menuToggle.setAttribute('aria-label', 'Open navigation');
}

menuToggle.addEventListener('click', () => {
  const isOpen = navigation.classList.toggle('open');
  menuToggle.setAttribute('aria-expanded', String(isOpen));
  menuToggle.setAttribute('aria-label', isOpen ? 'Close navigation' : 'Open navigation');
});

document.querySelectorAll('[data-coming]').forEach(button => {
  button.addEventListener('click', () => {
    closeMenu();
    document.querySelector('#dialog-description').textContent = `${button.dataset.coming} is coming soon. We’re preparing the next part of your journey. Check back for new places and stories.`;
    dialog.showModal();
  });
});
document.querySelectorAll('.nav-link[href]').forEach(link => link.addEventListener('click', closeMenu));
document.querySelector('.dialog-close').addEventListener('click', () => dialog.close());
document.querySelector('.dialog-return').addEventListener('click', () => dialog.close());
dialog.addEventListener('click', event => {
  if (event.target === dialog) {
    const rect = dialog.getBoundingClientRect();
    if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) dialog.close();
  }
});
document.addEventListener('keydown', event => {
  if (event.key === 'Escape') closeMenu();
});

const journeyToggle = document.querySelector('#journey-toggle');
const journeyDropdown = document.querySelector('#journey-dropdown');
function closeJourneyMenu() {
  journeyDropdown.hidden = true;
  journeyToggle.setAttribute('aria-expanded', 'false');
}
journeyToggle.addEventListener('click', () => {
  journeyDropdown.hidden = !journeyDropdown.hidden;
  journeyToggle.setAttribute('aria-expanded', String(!journeyDropdown.hidden));
});
document.addEventListener('click', event => {
  if (!event.target.closest('.journey-menu')) closeJourneyMenu();
});
document.addEventListener('keydown', event => {
  if (event.key === 'Escape' && !journeyDropdown.hidden) {
    closeJourneyMenu();
    journeyToggle.focus();
  }
});

// Preserve older Explore bookmarks while keeping the homepage free of the map.
if (location.hash === '#explore') location.replace('explore.html');
