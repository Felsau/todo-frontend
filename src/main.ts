import { createApp } from 'vue'
import App from './App.vue'
import { router } from './router'
// Bai Jamjuree served from this site, not from Google Fonts: no extra domains to reach before the
// first paint (QA round 3, SEO 11). Each file lists its subsets with unicode-range, so a browser
// only downloads the Thai and Latin files the page actually uses.
import '@fontsource/bai-jamjuree/400.css'
import '@fontsource/bai-jamjuree/500.css'
import '@fontsource/bai-jamjuree/600.css'
import '@fontsource/bai-jamjuree/700.css'
import './style.css'

createApp(App).use(router).mount('#app')
