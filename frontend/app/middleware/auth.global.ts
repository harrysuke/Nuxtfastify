export default defineNuxtRouteMiddleware(async (to) => {
  if (to.path === '/login') return;

  const {user, ready, fetchUser} = useAuth();
  if (!ready.value) await fetchUser();
  if (!user.value) return navigateTo('/login');
});
