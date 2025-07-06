import { updateAuthUI } from './authService.js';
document.addEventListener('DOMContentLoaded', async () => {
  try {
    await updateAuthUI();
  } catch (e) {
    console.error('Auth initialization failed:', e);
  }
});
