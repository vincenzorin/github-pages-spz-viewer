import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { SparkRenderer, SplatMesh } from '@sparkjsdev/spark';
import './style.css';

// Change this to match the filename you place in public/models/.
const SPLAT_URL = `${import.meta.env.BASE_URL}models/scene.spz`;

// Camera framing is a sensible starting point, but splats vary in scale and origin.
// Adjust CAMERA_START / LOOK_AT after your first local preview if needed.
const CAMERA_START = new THREE.Vector3(0, 0, 0);
const LOOK_AT = new THREE.Vector3(0, 0, -3);

const viewer = document.querySelector('#viewer');
const loading = document.querySelector('#loading');
const loadingText = document.querySelector('#loading-text');
const progress = document.querySelector('#progress');
const errorPanel = document.querySelector('#error');
const errorMessage = document.querySelector('#error-message');
const status = document.querySelector('#status');
const statusText = document.querySelector('#status-text');
const motionButton = document.querySelector('#motion');
const motionLabel = document.querySelector('#motion-label');
const resetButton = document.querySelector('#reset');

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(
  55, window.innerWidth / window.innerHeight, 0.01, 2000
);
camera.position.copy(CAMERA_START);
camera.lookAt(LOOK_AT);

const renderer = new THREE.WebGLRenderer({
  antialias: false,
  alpha: true,
  powerPreference: 'high-performance'
});
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.75));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.outputColorSpace = THREE.SRGBColorSpace;
viewer.appendChild(renderer.domElement);

const spark = new SparkRenderer({ renderer });
scene.add(spark);

// The splat is parented to a group so sensor parallax can be applied independently
// from the user's camera orbit/pan.
const splatGroup = new THREE.Group();
scene.add(splatGroup);

const controls = new OrbitControls(camera, renderer.domElement);
controls.target.copy(LOOK_AT);
controls.enableDamping = true;
controls.dampingFactor = 0.075;
controls.enableZoom = false;
controls.enableRotate = true;
controls.enablePan = true;
controls.screenSpacePanning = true;
controls.minDistance = 0.05;
controls.maxDistance = 2000;
controls.mouseButtons.LEFT = THREE.MOUSE.ROTATE;
controls.mouseButtons.MIDDLE = THREE.MOUSE.PAN;
controls.mouseButtons.RIGHT = THREE.MOUSE.PAN;
controls.touches.ONE = THREE.TOUCH.ROTATE;
controls.touches.TWO = THREE.TOUCH.PAN;
renderer.domElement.style.touchAction = 'none';

let splat = null;
let loaded = false;

// Motion is continuously listened for where the browser permits it.
// On iOS, permission must be requested from a user gesture; the button below
// is that gesture. Once granted, motion remains enabled until the page closes.
const needsMotionPermission =
  'DeviceOrientationEvent' in window &&
  typeof DeviceOrientationEvent.requestPermission === 'function';
let motionEnabled = !needsMotionPermission;
let sensorCalibrated = false;
let baselineBeta = 0;
let baselineGamma = 0;
let targetPitch = 0;
let targetRoll = 0;
let smoothPitch = 0;
let smoothRoll = 0;
let screenAngle = 0;

function setStatus(message, ready = false) {
  statusText.textContent = message;
  status.classList.toggle('ready', ready);
}

function getScreenAngle() {
  return (screen.orientation?.angle ?? window.orientation ?? 0) * Math.PI / 180;
}

function handleOrientation(event) {
  if (!motionEnabled || event.beta == null || event.gamma == null) return;

  if (!sensorCalibrated) {
    baselineBeta = event.beta;
    baselineGamma = event.gamma;
    screenAngle = getScreenAngle();
    sensorCalibrated = true;
  }

  // Rotate the sensor axes to account for portrait/landscape screen orientation.
  const betaDelta = THREE.MathUtils.degToRad(event.beta - baselineBeta);
  const gammaDelta = THREE.MathUtils.degToRad(event.gamma - baselineGamma);
  const c = Math.cos(screenAngle);
  const s = Math.sin(screenAngle);
  const screenX = gammaDelta * c - betaDelta * s;
  const screenY = gammaDelta * s + betaDelta * c;

  // Subtle wallpaper-like parallax, capped at about 6 degrees.
  targetPitch = THREE.MathUtils.clamp(screenY * 0.22, -0.105, 0.105);
  targetRoll = THREE.MathUtils.clamp(screenX * 0.22, -0.105, 0.105);
}

window.addEventListener('deviceorientation', handleOrientation, true);
if (motionEnabled) {
  motionButton.setAttribute('aria-pressed', 'true');
  motionLabel.textContent = 'Motion on';
}
window.addEventListener('orientationchange', () => {
  sensorCalibrated = false;
  screenAngle = getScreenAngle();
});

async function enableMotion() {
  if (!('DeviceOrientationEvent' in window)) {
    motionLabel.textContent = 'Motion unavailable';
    setStatus('No motion sensor available');
    return;
  }

  try {
    // iOS 13+ requires explicit permission from a user gesture.
    if (typeof DeviceOrientationEvent.requestPermission === 'function') {
      const permission = await DeviceOrientationEvent.requestPermission();
      if (permission !== 'granted') {
        setStatus('Motion permission not granted');
        return;
      }
    }

    motionEnabled = true;
    sensorCalibrated = false;
    targetPitch = targetRoll = smoothPitch = smoothRoll = 0;
    motionButton.setAttribute('aria-pressed', 'true');
    motionLabel.textContent = 'Motion on';
    setStatus('Motion enabled', loaded);
  } catch (error) {
    console.warn('Device orientation permission failed:', error);
    setStatus('Could not enable motion');
  }
}

motionButton.addEventListener('click', enableMotion);

function resetView() {
  camera.position.copy(CAMERA_START);
  controls.target.copy(LOOK_AT);
  controls.update();

  targetPitch = targetRoll = smoothPitch = smoothRoll = 0;
  sensorCalibrated = false;
  splatGroup.rotation.set(0, 0, 0);
}
resetButton.addEventListener('click', resetView);

async function loadSplat() {
  try {
    loadingText.textContent = 'Loading your scene…';
    const response = await fetch(SPLAT_URL, { method: 'HEAD' });
    if (!response.ok) {
      throw new Error(`SPZ file not found (${response.status}). Expected: public/models/scene.spz`);
    }

    splat = new SplatMesh({
      url: SPLAT_URL,
      onProgress: (event) => {
        if (event.lengthComputable && event.total > 0) {
          const percent = Math.round((event.loaded / event.total) * 100);
          progress.style.width = `${percent}%`;
          loadingText.textContent = `Loading your scene… ${percent}%`;
        } else {
          loadingText.textContent = 'Downloading and preparing scene…';
        }
      },
      onLoad: () => {
        loaded = true;
        loading.classList.add('done');
        setStatus(motionEnabled ? 'Scene ready · motion on' : 'Scene ready', true);
      }
    });

    splatGroup.add(splat);
    // The default camera looks down -Z. This places the splat at the
    // initial look target; change if your capture uses a different origin.
    splatGroup.position.set(0, 0, -3);
  } catch (error) {
    console.error(error);
    loading.classList.add('done');
    errorPanel.hidden = false;
    errorMessage.textContent = `${error.message}. Add your file as public/models/scene.spz, then reload.`;
    setStatus('Scene failed to load');
  }
}

function animate() {
  controls.update();

  // Ease toward the phone orientation instead of snapping.
  smoothPitch += (targetPitch - smoothPitch) * 0.055;
  smoothRoll += (targetRoll - smoothRoll) * 0.055;
  splatGroup.rotation.x = smoothPitch;
  splatGroup.rotation.y = smoothRoll;

  renderer.render(scene, camera);
}
renderer.setAnimationLoop(animate);

function resize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.75));
}
window.addEventListener('resize', resize);

loadSplat();
