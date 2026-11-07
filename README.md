# Full-screen SPZ Gaussian Splat Viewer

A static, mobile-friendly Gaussian Splat viewer built with Vite, Three.js and SparkJS. It is designed for GitHub Pages.

## Features

- Loads a self-hosted `.spz` file from `public/models/scene.spz`
- Full-screen immersive layout
- Drag to rotate; right-drag (desktop) or two-finger drag (touch) to pan
- Zoom disabled
- Subtle device-orientation parallax
- Reset view button
- Responsive layout and loading/error states
- GitHub Actions deployment to GitHub Pages

## 1. Add your SPZ

Copy your file to:

```text
public/models/scene.spz
```

The filename is case-sensitive. If you want another name, edit `SPLAT_URL` in `src/main.js`.

## 2. Run locally

Install Node.js 22 or newer, then:

```bash
npm install
npm run dev
```

Open the local URL Vite prints. To test the production build:

```bash
npm run build
npm run preview
```

## 3. Publish on GitHub Pages

1. Create a GitHub repository (for example `my-splat-viewer`).
2. Copy this project into the repository, including your SPZ file.
3. Commit and push to the `main` branch.
4. In the repository, open **Settings → Pages**.
5. Under **Build and deployment → Source**, select **GitHub Actions**.
6. The included workflow builds and deploys the site on every push to `main`.
7. When the workflow finishes, GitHub shows the published URL in **Settings → Pages**.

The Vite configuration automatically sets the correct base path for a project site or a `username.github.io` site.

## Phone motion permissions

- On Android and browsers that allow it, the viewer listens for device orientation as soon as the page is open.
- On iOS Safari, Apple requires a permission request triggered by a user gesture. Tap **Enable motion** once. Motion then remains active for the current page session.
- Motion is deliberately subtle and capped at roughly six degrees.
- The **Reset view** button resets the camera and the motion offset.

A static website cannot bypass the browser's sensor permission prompt. The motion button is therefore required on iOS even though motion is intended to stay enabled once granted.

## Controls

| Input | Action |
| --- | --- |
| Mouse left-drag | Rotate |
| Mouse right-drag | Pan / translate |
| Touch one-finger drag | Rotate |
| Touch two-finger drag | Pan / translate |
| Mouse wheel / pinch zoom | Disabled |
| Reset view | Restore initial camera and sensor offset |

## Camera framing

The default camera assumes the capture is centred near its origin and places the initial view three world units from the target. If your splat is unusually large, small, or oriented differently, edit `CAMERA_START`, `LOOK_AT`, and `splatGroup.position` near the top / in `loadSplat()` in `src/main.js`.

## Notes

- The SPZ is downloaded by each visitor from your GitHub Pages site. Large files can take time and count toward repository size and bandwidth limits.
- Keep the repository public if you want anyone to view the page without authentication.
- Spark uses WebGL2. Performance depends on the visitor's device and the size of the splat.
