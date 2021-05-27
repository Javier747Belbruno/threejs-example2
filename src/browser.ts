import * as THREE from 'three';
import * as CANNON from 'cannon-es'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';




var container = <HTMLBodyElement> document.querySelector('body'),
    w = container.clientWidth,
    h = container.clientHeight,
    scene = new THREE.Scene(),
    camera = new THREE.PerspectiveCamera(75, w/h, 0.001, 100),
    renderConfig = {antialias: true, alpha: true},
    renderer = new THREE.WebGLRenderer(renderConfig);
//camera.position.set(0, 1, -10);
//camera.lookAt(0,0,0);
renderer.setPixelRatio(window.devicePixelRatio);
renderer.setSize(w, h);
container.appendChild(renderer.domElement);

window.addEventListener('resize', function() {
  w = container.clientWidth;
  h = container.clientHeight;
  camera.aspect = w/h;
  camera.updateProjectionMatrix();
  renderer.setSize(w, h);
})

var geometry = new THREE.PlaneGeometry(10, 10, 10);
var material = new THREE.MeshBasicMaterial({color: 0xff0000, side: THREE.DoubleSide});
var plane = new THREE.Mesh(geometry, material);
plane.rotation.x = Math.PI/2;
scene.add(plane);

var sunlight = new THREE.DirectionalLight(0xffffff, 1.0);
sunlight.position.set(-10, 10, 0);
scene.add(sunlight)

const controls = new OrbitControls(camera, renderer.domElement);

/**
* Physics
**/

var world = new CANNON.World();
world.broadphase = new CANNON.SAPBroadphase(world);
world.gravity.set(0, -10, 0);
world.defaultContactMaterial.friction = 0;

var groundMaterial = new CANNON.Material('groundMaterial');
var wheelMaterial = new CANNON.Material('wheelMaterial');
var wheelGroundContactMaterial = new CANNON.ContactMaterial(wheelMaterial, groundMaterial, {
    friction: 0.3,
    restitution: 0,
    contactEquationStiffness: 1000,
});

world.addContactMaterial(wheelGroundContactMaterial);

// car physics body
var chassisShape = new CANNON.Box(new CANNON.Vec3(1, 0.3, 2));
var chassisBody = new CANNON.Body({mass: 150});
chassisBody.addShape(chassisShape);
chassisBody.position.set(0, 0.2, 0);
chassisBody.angularVelocity.set(0, 0, 0); // initial velocity


//Grid Helper
const gridHelper = new THREE.GridHelper(200, 50);
scene.add(gridHelper)

// car visual body
var geometry1 = new THREE.BoxGeometry(2, 0.6, 4); // double chasis shape
//var materia1l = new THREE.MeshBasicMaterial({color: 0xffff00, side: THREE.DoubleSide});
var materia1l = new THREE.MeshStandardMaterial({  });
var box = new THREE.Mesh(geometry1, materia1l);
scene.add(box);

// parent vehicle object
var vehicle = new CANNON.RaycastVehicle({
  chassisBody: chassisBody,
  indexRightAxis: 0, // x
  indexUpAxis: 1, // y
  indexForwardAxis: 2, // z
});

// wheel options
var options = {
  radius: 0.3,
  directionLocal: new CANNON.Vec3(0, -1, 0),
  suspensionStiffness: 45,
  suspensionRestLength: 0.4,
  frictionSlip: 5,
  dampingRelaxation: 2.3,
  dampingCompression: 4.5,
  maxSuspensionForce: 200000,
  rollInfluence:  0.01,
  axleLocal: new CANNON.Vec3(-1, 0, 0),
  chassisConnectionPointLocal: new CANNON.Vec3(1, 1, 0),
  maxSuspensionTravel: 0.25,
  customSlidingRotationalSpeed: -30,
  useCustomSlidingRotationalSpeed: true,
};

var axlewidth = 0.7;
options.chassisConnectionPointLocal.set(axlewidth, 0, -1);
vehicle.addWheel(options);

options.chassisConnectionPointLocal.set(-axlewidth, 0, -1);
vehicle.addWheel(options);

options.chassisConnectionPointLocal.set(axlewidth, 0, 1);
vehicle.addWheel(options);

options.chassisConnectionPointLocal.set(-axlewidth, 0, 1);
vehicle.addWheel(options);

vehicle.addToWorld(world);

// car wheels
var wheelBodies:any = [],
    wheelVisuals:any = [];
vehicle.wheelInfos.forEach(function(wheel) {
  var shape = new CANNON.Cylinder(wheel.radius, wheel.radius, wheel.radius / 2, 20);
  var body = new CANNON.Body({mass: 1, material: wheelMaterial});
  var q = new CANNON.Quaternion();
  q.setFromAxisAngle(new CANNON.Vec3(1, 0, 0), Math.PI / 2);
  body.addShape(shape, new CANNON.Vec3(), q);
  wheelBodies.push(body);
  // wheel visual body
  var geometry = new THREE.CylinderGeometry( wheel.radius, wheel.radius, 0.4, 32 );
  var material = new THREE.MeshPhongMaterial({
    color: 0xd0901d,
    emissive: 0xaa0000,
    side: THREE.DoubleSide,
    flatShading: true,
  });
  //var material = new THREE.MeshBasicMaterial({ color: 0xffffff  });
  var cylinder = new THREE.Mesh(geometry, material);
  cylinder.geometry.rotateZ(Math.PI/2);
  wheelVisuals.push(cylinder);
  scene.add(cylinder);
});

// update the wheels to match the physics
world.addEventListener('postStep', function() {
  for (var i=0; i<vehicle.wheelInfos.length; i++) {
    vehicle.updateWheelTransform(i);
    var t = vehicle.wheelInfos[i].worldTransform;
    // update wheel physics
    wheelBodies[i].position.copy(t.position);
    wheelBodies[i].quaternion.copy(t.quaternion);
    // update wheel visuals
    wheelVisuals[i].position.copy(t.position);
    wheelVisuals[i].quaternion.copy(t.quaternion);
  }
});

var q = plane.quaternion;
var planeBody = new CANNON.Body({
  mass: 0, // mass = 0 makes the body static
  material: groundMaterial,
  shape: new CANNON.Plane(),
  quaternion: new CANNON.Quaternion(-q.x, q.y, q.z, q.w)
});
world.addBody(planeBody);

/**
* Main
**/

function updatePhysics() {
  world.step(1/60);
  // update the chassis position
  box.position.copy(new THREE.Vector3( chassisBody.position.x,chassisBody.position.y,chassisBody.position.z));
  box.quaternion.copy(new THREE.Quaternion(chassisBody.quaternion.x,chassisBody.quaternion.y,chassisBody.quaternion.z,chassisBody.quaternion.w));
}
function updateChaseCamera(){
  var cameraOffset : THREE.Vector3;
  var relativeCameraOffset : THREE.Vector3;
  relativeCameraOffset = new THREE.Vector3(0,5,-5);
	cameraOffset = relativeCameraOffset.applyMatrix4(box.matrixWorld);
  camera.position.x = cameraOffset.x  ;
  camera.position.y = cameraOffset.y ;
  camera.position.z = cameraOffset.z ;
  camera.lookAt(new THREE.Vector3(vehicle.chassisBody.position.x,vehicle.chassisBody.position.y,vehicle.chassisBody.position.z));

}
var numcam = 1;
function render() {
  requestAnimationFrame(render);
  
  if(numcam==2){
    controls.update();
    camera.lookAt(new THREE.Vector3(vehicle.chassisBody.position.x,vehicle.chassisBody.position.y,vehicle.chassisBody.position.z));
  }else{
    updateChaseCamera();
  }
  renderer.render(scene, camera);
  updatePhysics();
  
}

function navigate(e:  any ) {
  if (e.type != 'keydown' && e.type != 'keyup') return;
  var keyup = e.type == 'keyup';
  vehicle.setBrake(0, 0);
  vehicle.setBrake(0, 1);
  vehicle.setBrake(0, 2);
  vehicle.setBrake(0, 3);

  var engineForce = 800,
      maxSteerVal = 0.3;
  switch(e.keyCode) {

    case 49: // chase camera
    numcam = 1;
    break;

    case 50: // orbit camera
    numcam = 2;
    break;

    case 38: // forward
      vehicle.applyEngineForce(keyup ? 0 : -engineForce, 2);
      vehicle.applyEngineForce(keyup ? 0 : -engineForce, 3);
      break;

    case 40: // backward
      vehicle.applyEngineForce(keyup ? 0 : engineForce, 2);
      vehicle.applyEngineForce(keyup ? 0 : engineForce, 3);
      break;

    case 39: // right
      vehicle.setSteeringValue(keyup ? 0 : -maxSteerVal, 2);
      vehicle.setSteeringValue(keyup ? 0 : -maxSteerVal, 3);
      break;

    case 37: // left
      vehicle.setSteeringValue(keyup ? 0 : maxSteerVal, 2);
      vehicle.setSteeringValue(keyup ? 0 : maxSteerVal, 3);
      break;
  }
}

window.addEventListener('keydown', navigate)
window.addEventListener('keyup', navigate)

render();