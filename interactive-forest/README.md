# Interactive Forest Project

## Overview
The Interactive Forest project is a 3D simulation of a dynamic ecosystem created using Three.js. The application allows users to explore a virtual forest environment, interact with various elements, and experience different weather conditions.

## Features
- **Dynamic Terrain and Vegetation**: The forest is populated with a variety of trees and plants, each with unique textures and sizes.
- **Realistic Lighting**: The scene includes dynamic lighting to simulate the sun's movement throughout the day.
- **Variable Weather Conditions**: Users can experience different climates, including rain and snow, enhancing the immersive experience.
- **First-Person Exploration**: Users can navigate through the forest using keyboard and mouse controls, providing a free exploration experience.
- **Wildlife Interaction**: The environment includes various animals, adding realism and interactivity to the ecosystem.

## Project Structure
```
interactive-forest
├── src
│   ├── index.html          # Main HTML entry point
│   ├── main.js             # Initializes the Three.js scene and handles user input
│   ├── scenes
│   │   └── forestScene.js  # Defines the forest scene and environmental effects
│   ├── assets
│   │   ├── textures        # Texture files for terrain and vegetation
│   │   ├── models          # 3D models for trees and animals
│   │   └── shaders         # Custom shaders for visual effects
│   ├── controls
│   │   └── firstPersonControls.js # Implements first-person camera controls
│   ├── utils
│   │   └── helpers.js      # Utility functions for common operations
│   └── styles
│       └── styles.css      # CSS styles for the application
├── package.json            # npm configuration file with dependencies
├── webpack.config.js       # Webpack configuration for bundling and development
└── README.md               # Project documentation
```

## Setup Instructions
1. Clone the repository:
   ```
   git clone <repository-url>
   ```
2. Navigate to the project directory:
   ```
   cd interactive-forest
   ```
3. Install the dependencies:
   ```
   npm install
   ```
4. Start the development server:
   ```
   npm start
   ```
5. Open your browser and go to `http://localhost:3000` to view the application.

## Usage
- **Move**: `W`, `A`, `S`, `D`
- **Look around**: mouse
- **Interact**: `E` (pick up carrots/berries, feed animals)
- **Help menu**: `H`
- **Change weather**: `R` or "Toggle Weather" button
- **Adjust chunks**: buttons in the menu or UI
- **Music**: starts when closing the initial menu (button or H key)
- **Feeding animals**:
  - Pigs and rabbits: only with carrots
  - Foxes: only with berries (they spin when fed)
- **Sound effects**: each animal plays a unique sound when fed