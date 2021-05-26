import * as THREE from 'three';
import * as CANNON from 'cannon-es'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';


var world: CANNON.World, mass, body: any, shape, timeStep=1/60,
camera: THREE.Camera, scene: THREE.Scene, renderer: any , geometry, material, mesh: THREE.Mesh;
var controls: OrbitControls;

initThree();
initCannon();
animate();

function initCannon() {

 world = new CANNON.World();
 world.gravity.set(0,-9.81,0);
 world.broadphase = new CANNON.NaiveBroadphase();
 
  // Create a plane
  var groundShape = new CANNON.Plane();
  var groundBody = new CANNON.Body({ mass: 0 });
  groundBody.addShape(groundShape);
  groundBody.quaternion.setFromAxisAngle(new CANNON.Vec3(1,0,0),-Math.PI/2);
  world.addBody(groundBody);

 shape = new CANNON.Box(new CANNON.Vec3(1,1,1));
 mass = 1;
 body = new CANNON.Body({
   mass: 1,position: new CANNON.Vec3(0,9,0)
 });
 body.addShape(shape);
 body.angularVelocity.set(-1,10,-5);
 body.angularDamping = 0.5;
 world.addBody(body);

}

function initThree() {

 scene = new THREE.Scene();

 camera = new THREE.PerspectiveCamera( 75, window.innerWidth / window.innerHeight, 0.1, 100 );

 scene.add( camera );
 camera.position.z = 30;
 camera.position.y = 9;

 // Lights

 const pointLight = new THREE.PointLight(0xffffff);
 pointLight.position.set(5, 5, 5);
 
 const ambientLight = new THREE.AmbientLight(0xffffff);
 scene.add(pointLight, ambientLight);
  
 // Helper
 const gridHelper = new THREE.GridHelper(200, 50);
 scene.add(gridHelper);
 

//box
 geometry = new THREE.BoxGeometry( 2, 2, 2 );
 material = new THREE.MeshStandardMaterial({ color: 0xff6347 });
 
 mesh = new THREE.Mesh( geometry, material );
 scene.add( mesh );
 


 renderer = new THREE.WebGLRenderer({
    canvas: <HTMLCanvasElement>document.querySelector('#bg'),
  });
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setSize(window.innerWidth, window.innerHeight);
 
  
  renderer.setClearColor("black");
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.shadowMap.enabled = true;
 document.body.appendChild( renderer.domElement );
 //controls

controls = new OrbitControls(camera, renderer.domElement);
controls.minDistance = 0.1;
controls.maxDistance = 90;

}

function animate() {

 requestAnimationFrame( animate );
 updatePhysics();
 render();

}

function updatePhysics() {

 // Step the physics world
 world.step(timeStep);

 // Copy coordinates from Cannon.js to Three.js
 mesh.position.copy(body.position);
 mesh.quaternion.copy(body.quaternion);

}

function render() {
 controls.update();
 renderer.render( scene, camera );

}