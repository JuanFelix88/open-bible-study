/**
 * This is the Tailwind CSS configuration file.
 * You can customize your Tailwind setup here.
 */

module.exports = {
  theme: {
    extend: {
      // Add your custom variants here
      variants: {
        // Example: Add a new variant for hover
        backgroundColor: ["responsive", "hover", "focus"],
        textColor: ["responsive", "hover", "focus"],
      },
    },
  },
  plugins: [],
};
