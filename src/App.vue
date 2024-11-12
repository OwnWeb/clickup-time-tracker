<template>
  <n-config-provider :theme="currentTheme" :theme-overrides="currentThemeOverrides">
    <n-notification-provider>
      <online-status-provider>
        <splash-screen />
        <router-view />
      </online-status-provider>
    </n-notification-provider>
  </n-config-provider>
</template>

<script>
import { NConfigProvider, NNotificationProvider, darkTheme, useOsTheme } from "naive-ui";
import OnlineStatusProvider from "@/components/OnlineStatusProvider";
import SplashScreen from "@/components/SplashScreen";
import "@/assets/tailwind.css";
import {computed, ref} from "vue";

/**
 * Theme Overrides for both light and dark themes
 * @type import('naive-ui').GlobalThemeOverrides
 */
const lightThemeOverrides = {
  common: {
    primaryColor: "#0284C7",
    primaryColorHover: "#1A9DDE",
    primaryColorPressed: "#0076B1",
    textColor: "#333",
    backgroundColor: "white",
  },
};

const darkThemeOverrides = {
  common: {
    primaryColor: "#0284C7",
    primaryColorHover: "#1A9DDE",
    primaryColorPressed: "#0076B1",
    textColor: "#ddd",
    backgroundColor: "#121212",
  },
};

export default {
  name: "App",
  components: {
    NConfigProvider,
    NNotificationProvider,
    OnlineStatusProvider,
    SplashScreen,
  },
  setup() {
    // Detect system theme
    const osTheme = useOsTheme();
    console.log("OS Theme: ", osTheme);
    const isDark = ref(osTheme.value === "dark");

    // Reactive theme handling
    const currentTheme = computed(() => (isDark.value ? darkTheme : null));
    const currentThemeOverrides = computed(() =>
        isDark.value ? darkThemeOverrides : lightThemeOverrides
    );

    // Watch system theme changes
    const updateTheme = (theme) => {
      isDark.value = theme === "dark";
    };
    window
        .matchMedia("(prefers-color-scheme: dark)")
        .addEventListener("change", (e) => {
          updateTheme(e.matches ? "dark" : "light");
        });

    return {
      currentTheme,
      currentThemeOverrides,
      isDark,
    };
  },
};
</script>

<style>
#app {
  font-family: Avenir, Helvetica, Arial, sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  background: var(--n-background-color);
  color: var(--n-text-color);
}

.n-notification__avatar {
  display: flex;
  align-items: center;
  margin-top: -2px;
}

.n-notification-main__header {
  font-weight: normal !important;
  font-size: 1.1em !important;
  opacity: 0.9;
}

.n-notification-container .n-notification.n-notification--closable .n-notification__close {
  z-index: 1;
}

.n-button {
  background-color: var(--n-color);
}

@media (prefers-color-scheme: dark) {
  body {
    background: rgb(17, 24, 39);
    color: var(--n-text-color);
    min-height: 100vh;
  }
}

</style>
