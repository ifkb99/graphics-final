# Graphics Final Project Proposal

By: Ian Baker, Ronald Kim, and Brandon Patton

## Computer-ception

For our project, we plan to render a keyboard and monitor on a desk. When the user presses keys on their keyboard, or clicks them with the mouse, they will be pressed on screen and display the respective characters on the monitor.

### Project Requirements

- We will write our own vertex and fragment shaders in GLSL compiled for WebGL.
- The keyboard case, keycaps, and monitor will be separate meshes. If possible we will combine the keycaps and keyboard case, but to get them to move we will probably need to leave them separate.
- The program will be rendered in 3D
- Keyboard presses or mouse clicks trigger the keys on the keyboard and input on the monitor, fulfilling the user interaction requirement.
- The program has many moving parts, and cannot be a static frame
- The program will have a fixed window ratio that will resize to fit the window given
- All of the previously mentioned meshes will have textures on them, possibly save for the monitor if time becomes an issue. Specifically, each keycap will have its own texture in order to put the character onto the cap.
- There will be a light source that will reflect off of the keyboard and monitor. Currently the Phong model seems promising but we will explore other models as well. Time permitting, we will make a lamp model that the light will come out of.
- For the advanced aspect of this project, there are two paths we can take, depending on the difficulty:
  - Use bump mapping to show the keys on the board being pressed
  - Reflect the keyboard/other models in the monitor

#### Inspiration

One of the project members was showing off their new keyboard, another suggested the idea, and everyone liked it.