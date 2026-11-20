// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  devtools: { enabled: true },
  css: ['~/assets/css/main.css'],
  runtimeConfig: {
    apiBase: process.env.API_BASE ?? 'http://localhost:3001',
  },
  app: {
    head: {
      title: 'Taskflow — Tasks & Notes',
      meta: [
        { name: 'viewport', content: 'width=device-width, initial-scale=1' },
        {
          name: 'description',
          content: 'A simple, focused place to manage your tasks and notes.',
        },
        { name: 'theme-color', content: '#4f46e5' },
      ],
    },
  },
})
