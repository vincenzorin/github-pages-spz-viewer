import { defineConfig } from 'vite';

export default defineConfig({
  // GitHub Pages project sites live at /REPOSITORY-NAME/.
  // User/organisation sites (username.github.io) live at /.
  base: process.env.GITHUB_REPOSITORY
    ? (process.env.GITHUB_REPOSITORY.split('/')[1].endsWith('.github.io')
        ? '/'
        : `/${process.env.GITHUB_REPOSITORY.split('/')[1]}/`)
    : '/'
});
