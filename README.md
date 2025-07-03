# Keyframe Click

A web app that lets you **place and edit bezier curves on a timeline** to represent **CSS property animations**. The tool visualizes the motion path of CSS properties and generates the corresponding `@keyframes` syntax for easy copy-paste into your stylesheets.

Perfect for developers and designers who want experiment visually with CSS animations.

## 🚀 Features

- Interactive **HTML canvas** editor with draggable Bezier handles
- Timeline-based layout for property value changes
- Real-time CSS animation preview
- Auto-generated CSS `@keyframes` or JavaScript output

## 🧰 Tech Stack

- React
- Tailwind
- Vite for development and bundling
- Custom HTML5 `<canvas>` timeline
- Bold, custom UI components

## 🧪 Live Demo

Try it at [https://keyframe-click.vercel.app](https://keyframe-click.vercel.app//)

## 📋 Future enhancements

- [x] Mobile version
  - Works on small touch screens now. Still more improvements needed for switching labels.
- [x] More preview images
  - Added text preview. More choices still needed.
- [ ] Additional properties
  - This handles the most common GPU accelerated properties, but there are uses for other ones.
