import { useState, useEffect } from "react";

/**
 * Custom hook to manage light and dark themes.
 * Persists the theme in local storage and provides a toggle function.
 */
export const useTheme = () => {
  const [theme, setTheme] = useState<"light" | "dark">(() => {
    // Retrieve the stored theme from local storage or default to 'light'
    const storedTheme = localStorage.getItem("theme") as "light" | "dark";
    return storedTheme || "light";
  });

  useEffect(() => {
    // Apply the theme to the document body class
    document.body.classList.remove("light", "dark");
    document.body.classList.add(theme);

    // Store the theme in local storage
    localStorage.setItem("theme", theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme((prevTheme) => (prevTheme === "light" ? "dark" : "light"));
  };

  return { theme, toggleTheme };
};
